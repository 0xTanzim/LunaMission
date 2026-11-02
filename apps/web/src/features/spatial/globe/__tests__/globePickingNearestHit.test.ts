import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createMarkerPickingController } from '../interaction/globePicking';
import { CANDIDATE_SITES } from '@luna/contracts';

const SITE_A = CANDIDATE_SITES[0].id;
const SITE_B = CANDIDATE_SITES[1].id;

/**
 * Headless picking harness: the controller only needs an event-target canvas, a
 * container rect, and a camera. We drive the stored handlers with synthetic pointer
 * events to pin the selection-safety contract (task 2.9).
 */
function makeHarness(hitTargets: THREE.Object3D[]) {
  const listeners = new Map<string, (e: unknown) => void>();
  const dom = {
    addEventListener: (type: string, fn: (e: unknown) => void) => listeners.set(type, fn),
    removeEventListener: (type: string) => listeners.delete(type),
  };
  const container = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 450 }),
  };
  const camera = new THREE.PerspectiveCamera(38, 800 / 450, 0.001, 100);
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  // The raycaster reads world matrices: real hit targets are updated by the render loop.
  hitTargets.forEach((o) => o.updateMatrixWorld(true));

  const picked: string[] = [];
  const hoverSequence: (string | null)[] = [];
  const controller = createMarkerPickingController(
    container as unknown as HTMLDivElement,
    dom as unknown as HTMLCanvasElement,
    camera,
    hitTargets,
    {
      onHoverEnter: (site) => hoverSequence.push(site.id),
      onHoverExit: (siteId) => hoverSequence.push(null),
      onHoverCursorChange: () => {},
      onPick: (site) => picked.push(site.id),
    },
  );
  controller.attach();

  const fire = (type: string, x: number, y: number, button = 0) =>
    listeners.get(type)?.({ button, clientX: x, clientY: y });

  return { fire, picked, hoverSequence, camera };
}

test('picking: a click on an overlapping badge stack picks the NEAREST hit', () => {
  // Two badges sharing a screen point at different depths: 'far' at z=-1, 'near' at z=+1.
  const far = new THREE.Mesh(new THREE.SphereGeometry(0.2), new THREE.MeshBasicMaterial());
  far.position.set(0, 0, -1);
  far.userData.siteId = SITE_B;
  const near = new THREE.Mesh(new THREE.SphereGeometry(0.2), new THREE.MeshBasicMaterial());
  near.position.set(0, 0, 1);
  near.userData.siteId = SITE_A;

  const { fire, picked } = makeHarness([far, near]);
  // Hit the shared screen point (canvas center).
  fire('pointerdown', 400, 225);
  fire('pointerup', 400, 225);

  assert.deepEqual(picked, [SITE_A], 'stack click must resolve to the camera-nearest badge');
});

test('picking: hovering a stack indicates the nearest badge before any click', () => {
  const far = new THREE.Mesh(new THREE.SphereGeometry(0.2), new THREE.MeshBasicMaterial());
  far.position.set(0, 0, -1);
  far.userData.siteId = SITE_B;
  const near = new THREE.Mesh(new THREE.SphereGeometry(0.2), new THREE.MeshBasicMaterial());
  near.position.set(0, 0, 1);
  near.userData.siteId = SITE_A;

  const { fire, hoverSequence } = makeHarness([far, near]);
  fire('pointermove', 400, 225);
  assert.deepEqual(hoverSequence, [SITE_A],
    'hover must indicate the same nearest hit the click would pick');
});

test('picking: a drag (orbit) never reselects', () => {
  const target = new THREE.Mesh(new THREE.SphereGeometry(0.5), new THREE.MeshBasicMaterial());
  target.position.set(0, 0, 0);
  target.userData.siteId = SITE_A;

  const { fire, picked } = makeHarness([target]);
  fire('pointerdown', 400, 225);
  fire('pointerup', 460, 260); // beyond CLICK_MAX_TRAVEL_PX
  assert.deepEqual(picked, [], 'an orbit drag must not count as a pick');
});

test('picking: moving off the badge exits hover', async () => {
  const target = new THREE.Mesh(new THREE.SphereGeometry(0.2), new THREE.MeshBasicMaterial());
  target.position.set(0, 0, 0);
  target.userData.siteId = SITE_A;

  const { fire, hoverSequence } = makeHarness([target]);
  fire('pointermove', 400, 225);
  // The controller throttles hover raycasts to one per 25 ms.
  await new Promise((resolve) => setTimeout(resolve, 30));
  fire('pointermove', 40, 40);
  assert.deepEqual(hoverSequence, [SITE_A, null], 'hover enter then exit must be reported');
});
