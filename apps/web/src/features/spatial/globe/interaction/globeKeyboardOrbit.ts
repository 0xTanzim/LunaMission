import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { syncOrbitControlsUpAxis } from './globeCameraTransitioner';

/**
 * Keyboard camera-control alternative (task 3.5, UX ledger L-28): canvas navigation
 * is pointer-only, so the 3D container becomes focusable and answers arrow keys with
 * orbit steps and +/- with dolly steps. Steps are discrete (no easing) so they are
 * compatible with prefers-reduced-motion. Keys are only handled while the container
 * holds focus, so page scrolling and typing elsewhere are unaffected.
 */
export const KEYBOARD_ORBIT_STEP_DEG = 5;
export const KEYBOARD_ZOOM_IN_FACTOR = 0.9;
export const KEYBOARD_ZOOM_OUT_FACTOR = 1.1;

const ORBIT_STEP_RAD = (KEYBOARD_ORBIT_STEP_DEG * Math.PI) / 180;

export interface KeyboardOrbitController {
  dispose: () => void;
}

export function attachKeyboardOrbitControls(
  container: HTMLElement,
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
): KeyboardOrbitController {
  // Make the scene reachable by Tab and announce the keyboard contract.
  container.tabIndex = 0;
  container.setAttribute('role', 'application');
  container.setAttribute(
    'aria-label',
    '3D lunar scene: arrow keys orbit, plus and minus zoom. Tab into other controls to leave.',
  );

  const handleKeyDown = (event: Event) => {
    const e = event as KeyboardEvent;
    const offset = camera.position.clone().sub(controls.target);

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowRight': {
        const sign = e.key === 'ArrowLeft' ? 1 : -1;
        const axis = camera.up.clone().normalize();
        offset.applyAxisAngle(axis, sign * ORBIT_STEP_RAD);
        break;
      }
      case 'ArrowUp':
      case 'ArrowDown': {
        // Pitch around the camera's horizontal right vector, clamped away from the poles.
        const right = camera.up.clone().cross(offset).normalize();
        if (right.lengthSq() < 1e-8) return;
        const sign = e.key === 'ArrowUp' ? 1 : -1;
        const rotated = offset.clone().applyAxisAngle(right, sign * ORBIT_STEP_RAD);
        // Reject steps that flip past the vertical: keep the radial component dominant.
        if (rotated.dot(offset) <= 0) return;
        offset.copy(rotated);
        break;
      }
      case '+':
      case '=':
      case 'PageUp':
        offset.multiplyScalar(KEYBOARD_ZOOM_IN_FACTOR);
        break;
      case '-':
      case '_':
      case 'PageDown':
        offset.multiplyScalar(KEYBOARD_ZOOM_OUT_FACTOR);
        break;
      default:
        return; // Unhandled keys (typing, Tab, …) pass through untouched.
    }

    e.preventDefault();

    const clampedLength = THREE.MathUtils.clamp(
      offset.length(),
      controls.minDistance ?? 0.001,
      controls.maxDistance ?? 100,
    );
    offset.setLength(clampedLength);
    camera.position.copy(controls.target).add(offset);
    camera.lookAt(controls.target);
    camera.updateMatrixWorld();
    syncOrbitControlsUpAxis(controls, camera);
    if (typeof controls.update === 'function') controls.update();
  };

  container.addEventListener('keydown', handleKeyDown);

  return {
    dispose: () => {
      container.removeEventListener('keydown', handleKeyDown);
    },
  };
}
