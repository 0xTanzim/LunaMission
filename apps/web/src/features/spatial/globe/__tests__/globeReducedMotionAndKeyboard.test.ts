import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { getPrefersReducedMotion } from '@/features/accessibility/ui';
import {
  attachKeyboardOrbitControls,
  KEYBOARD_ORBIT_STEP_DEG,
  KEYBOARD_ZOOM_IN_FACTOR,
} from '../interaction/globeKeyboardOrbit';
import { createCameraTransitionerWithResolver } from '../interaction/globeCameraTransitioner';
import { MOON_SCENE_RADIUS } from '../scene/globeScene';

test('reduced motion: reads the media query and defaults to false without a window', () => {
  // Node test env: no window.matchMedia — the scene must degrade to full motion.
  assert.equal(getPrefersReducedMotion(), false);

  // With a media query reporting reduce, the scene must honor it.
  const origWindow = globalThis.window;
  const listeners: Array<() => void> = [];
  (globalThis as any).window = {
    matchMedia: (query: string) => {
      assert.equal(query, '(prefers-reduced-motion: reduce)');
      return {
        matches: true,
        addEventListener: (_: string, fn: () => void) => listeners.push(fn),
        removeEventListener: () => {},
      };
    },
  };
  try {
    assert.equal(getPrefersReducedMotion(), true);
  } finally {
    (globalThis as any).window = origWindow;
  }
});

function makeFakeControls() {
  return {
    target: new THREE.Vector3(0, -MOON_SCENE_RADIUS, 0),
    minDistance: 0.01,
    maxDistance: 20,
    update: () => {},
  };
}

function makeHarness() {
  const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.001, 100);
  camera.position.set(0, -MOON_SCENE_RADIUS - 0.5, 0);
  // Tilted pole-frame up (as the live scene uses) — a world-up-parallel camera on the
  // pole axis would make yaw orbits degenerate.
  camera.up.set(0, 0.08716, 0.99619).normalize();
  camera.lookAt(0, -MOON_SCENE_RADIUS, 0);
  camera.updateMatrixWorld();
  const controls = makeFakeControls();
  const listeners: Record<string, EventListener> = {};
  const container = {
    tabIndex: -1,
    setAttribute: (k: string, v: string) => { (container as any)[`attr:${k}`] = v; },
    addEventListener: (type: string, fn: EventListener) => { listeners[type] = fn; },
    removeEventListener: (type: string) => { delete listeners[type]; },
  } as unknown as HTMLElement;
  const controller = attachKeyboardOrbitControls(container, camera, controls as never);
  return { camera, controls, container, listeners, controller };
}

function key(type: string, opts: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return { key: type, preventDefault: () => {}, ...opts } as KeyboardEvent;
}

test('keyboard orbit: arrows orbit the camera about the target, +/- zoom, page scrolls are blocked', () => {
  const { camera, controls, listeners, controller } = makeHarness();

  const startCamPos = camera.position.clone();
  let prevented = 0;
  listeners.keydown(key('ArrowLeft', { preventDefault: () => { prevented++; } }));
  const orbitedPos = camera.position.clone();
  assert.ok(!orbitedPos.equals(startCamPos), 'ArrowLeft must orbit the camera');
  assert.ok(controls.target.equals(new THREE.Vector3(0, -MOON_SCENE_RADIUS, 0)), 'orbit keeps the target');
  // Orbit preserves the orbital radius.
  assert.ok(
    Math.abs(orbitedPos.distanceTo(controls.target) - startCamPos.distanceTo(controls.target)) < 1e-6,
    'orbit preserves distance to target',
  );
  assert.equal(prevented, 1, 'handled keys must preventDefault (block page scroll)');

  const zoomStartDist = camera.position.distanceTo(controls.target);
  listeners.keydown(key('+'));
  const zoomedInDist = camera.position.distanceTo(controls.target);
  assert.ok(zoomedInDist < zoomStartDist * 0.999, "'+' must dolly in");
  assert.ok(
    Math.abs(zoomStartDist - zoomedInDist - zoomStartDist * (1 - KEYBOARD_ZOOM_IN_FACTOR)) < 1e-6,
    'zoom step uses the exported factor',
  );

  const orbitDeg = THREE.MathUtils.radToDeg(
    startCamPos.clone().sub(controls.target).angleTo(orbitedPos.clone().sub(controls.target)),
  );
  assert.ok(
    Math.abs(orbitDeg - KEYBOARD_ORBIT_STEP_DEG) < 0.5,
    `orbit step matches the documented degrees (${orbitDeg.toFixed(2)} vs ${KEYBOARD_ORBIT_STEP_DEG})`,
  );

  controller.dispose();
  assert.ok(!listeners.keydown, 'dispose removes the key listener');
});

test('keyboard orbit: unhandled keys are ignored (typing safety)', () => {
  const { camera, listeners, controller } = makeHarness();
  const before = camera.position.clone();
  let prevented = 0;
  listeners.keydown(key('a', { preventDefault: () => { prevented++; } }));
  listeners.keydown(key('Tab', { preventDefault: () => { prevented++; } }));
  assert.ok(camera.position.equals(before), 'non-navigation keys must not move the camera');
  assert.equal(prevented, 0, 'unhandled keys must not be swallowed');
  controller.dispose();
});

test('reduced motion: camera transitions snap to the end pose instead of easing', () => {
  const endPose = {
    camPos: new THREE.Vector3(0.3, -MOON_SCENE_RADIUS - 0.4, 0.5),
    lookTarget: new THREE.Vector3(0, -MOON_SCENE_RADIUS, 0),
    upVector: new THREE.Vector3(0, 0, 1),
  };
  const transitioner = createCameraTransitionerWithResolver(() => endPose, { instant: () => true });
  const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.001, 100);
  camera.position.set(0, -3, 0);
  const controls = makeFakeControls();

  transitioner.moveTo('nadir', {} as never);
  transitioner.step(camera, controls as never);

  assert.ok(camera.position.equals(endPose.camPos), 'camera must be at the end pose after a single step');
  assert.equal(transitioner.isTransitioning(), false, 'no transition lingers under reduced motion');
});
