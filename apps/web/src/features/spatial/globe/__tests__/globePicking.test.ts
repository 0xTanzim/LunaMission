import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createMarkerPickingController } from '../interaction/globePicking';
import { CANDIDATE_SITES } from '@luna/contracts';

test('Marker Picking: Distinguishes stationary click from orbit drag gesture', () => {
  // Mock DOM elements
  const listeners: Record<string, Function> = {};
  const mockDom = {
    addEventListener: (type: string, fn: Function) => {
      listeners[type] = fn;
    },
    removeEventListener: (type: string, _fn: Function) => {
      delete listeners[type];
    },
  } as any;

  const mockContainer = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    style: { cursor: 'grab' },
  } as any;

  const camera = new THREE.PerspectiveCamera(38, 800 / 600, 0.1, 100);
  camera.position.set(0, -4.8, 0.0001);
  camera.lookAt(0, 0, 0);

  // Target object representing candidate
  const targetMesh = new THREE.Mesh(new THREE.SphereGeometry(0.1));
  targetMesh.position.set(0, -1.45, 0); // Near South Pole
  targetMesh.userData = { siteId: CANDIDATE_SITES[0].id };

  let pickedSite: any = null;
  const controller = createMarkerPickingController(
    mockContainer,
    mockDom,
    camera,
    [targetMesh],
    {
      onHoverEnter: () => {},
      onHoverExit: () => {},
      onHoverCursorChange: () => {},
      onPick: (site) => {
        pickedSite = site;
      },
    }
  );

  controller.attach();

  // Test 1: Pointer drag >= 8px should NOT pick site
  listeners['pointerdown']({ button: 0, clientX: 400, clientY: 300 });
  listeners['pointerup']({ button: 0, clientX: 420, clientY: 300 }); // Travelled 20px
  assert.equal(pickedSite, null, 'Drag >= 8px must not trigger onPick');

  // Test 2: Secondary button (e.g. right click) down should not be tracked as click
  listeners['pointerdown']({ button: 2, clientX: 400, clientY: 300 });
  listeners['pointerup']({ button: 2, clientX: 400, clientY: 300 });
  assert.equal(pickedSite, null, 'Secondary button must not trigger onPick');

  controller.detach();
  assert.equal(Object.keys(listeners).length, 0, 'Detached controller should remove event listeners');
});
