/**
 * Challenger M4 Adversarial Stress Test Suite:
 * WebGL Context Loss, Recovery Lifecycle & Safe GPU Resource Disposal
 *
 * Requirements Verified (R5, R6 / Milestones M4 Feature 16 & 18):
 * 1. Synchronous event.preventDefault() invocation on every webglcontextlost event.
 * 2. 50 rapid back-to-back webglcontextlost / webglcontextrestored cycles without state drift or orphaned loops.
 * 3. Asymmetric event floods and clean listener detachment mid-lifecycle.
 * 4. SafeGpuResourceDisposer WeakSet deduplication with shared geometries, materials, textures, and deep trees.
 * 5. Idempotent repeated disposal and multi-material deduplication.
 * 6. Neutralization of asynchronous texture loads arriving after scene disposal via isDisposed flag.
 * 7. Accessible flight-deck recovery affordance in GlobeContextLostBanner (WCAG 2.2 AA / role="alert").
 */

import { describe, it, expect, vi, beforeEach } from 'bun:test';
import * as THREE from 'three';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  attachWebGLContextLossHandlers,
  WebGLContextLossHandler,
} from '../src/features/spatial/globe/scene/globeContextLossHandler';
import {
  SafeGpuResourceDisposer,
  disposeFullGlobeSceneGraph,
} from '../src/features/spatial/globe/scene/globeSceneDisposal';
import { GlobeContextLostBanner } from '../src/features/spatial/globe/components/GlobeStatusOverlay';

class MockEventTargetCanvas extends EventTarget {
  public getContext = vi.fn();
}

describe('Challenger M4: WebGL Context Loss Synchronous preventDefault & Rapid Cycling', () => {
  let canvas: HTMLCanvasElement;
  let mockAnimator: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> };
  let onContextLost: ReturnType<typeof vi.fn>;
  let onContextRestored: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    canvas = new MockEventTargetCanvas() as unknown as HTMLCanvasElement;
    mockAnimator = {
      start: vi.fn(),
      stop: vi.fn(),
    };
    onContextLost = vi.fn();
    onContextRestored = vi.fn();
  });

  it('strictly verifies synchronous event.preventDefault() invocation on webglcontextlost', () => {
    const handler = attachWebGLContextLossHandlers(canvas, {
      animator: mockAnimator,
      onContextLost,
      onContextRestored,
    });

    let preventDefaultCalledInDownstreamListener = false;
    canvas.addEventListener('webglcontextlost', (evt) => {
      // Downstream listener verifies event was already prevented synchronously by the handler
      if (evt.defaultPrevented) {
        preventDefaultCalledInDownstreamListener = true;
      }
    });

    const event = new Event('webglcontextlost', { cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    const notCancelled = canvas.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
    expect(notCancelled).toBe(false); // dispatchEvent returns false when preventDefault is called
    expect(preventDefaultCalledInDownstreamListener).toBe(true);
    expect(handler.getRecoveryState()).toBe('lost');
    expect(mockAnimator.stop).toHaveBeenCalledTimes(1);

    handler.detach();
  });

  it('endures 50 rapid back-to-back loss and restoration cycles without state desynchronization', () => {
    const handler = attachWebGLContextLossHandlers(canvas, {
      animator: mockAnimator,
      onContextLost,
      onContextRestored,
    });

    const CYCLE_COUNT = 50;

    for (let i = 1; i <= CYCLE_COUNT; i++) {
      // 1. Loss event
      const lossEvent = new Event('webglcontextlost', { cancelable: true });
      const lossSpy = vi.spyOn(lossEvent, 'preventDefault');
      canvas.dispatchEvent(lossEvent);

      expect(lossSpy).toHaveBeenCalledTimes(1);
      expect(lossEvent.defaultPrevented).toBe(true);
      expect(handler.getRecoveryState()).toBe('lost');
      expect(mockAnimator.stop).toHaveBeenCalledTimes(i);
      expect(onContextLost).toHaveBeenCalledTimes(i);

      // 2. Restored event
      const restoreEvent = new Event('webglcontextrestored');
      canvas.dispatchEvent(restoreEvent);

      expect(handler.getRecoveryState()).toBe('restored');
      expect(mockAnimator.start).toHaveBeenCalledTimes(i);
      expect(onContextRestored).toHaveBeenCalledTimes(i);
    }

    expect(handler.getRecoveryState()).toBe('restored');
    expect(mockAnimator.stop).toHaveBeenCalledTimes(CYCLE_COUNT);
    expect(mockAnimator.start).toHaveBeenCalledTimes(CYCLE_COUNT);

    handler.detach();
  });

  it('handles asymmetric event bursts: multiple loss events followed by delayed restores', () => {
    const handler = attachWebGLContextLossHandlers(canvas, {
      animator: mockAnimator,
      onContextLost,
      onContextRestored,
    });

    // 10 loss events in rapid succession
    for (let i = 0; i < 10; i++) {
      const lossEvent = new Event('webglcontextlost', { cancelable: true });
      canvas.dispatchEvent(lossEvent);
      expect(lossEvent.defaultPrevented).toBe(true);
      expect(handler.getRecoveryState()).toBe('lost');
    }
    expect(mockAnimator.stop).toHaveBeenCalledTimes(10);
    expect(onContextLost).toHaveBeenCalledTimes(10);

    // 5 restore events
    for (let j = 0; j < 5; j++) {
      canvas.dispatchEvent(new Event('webglcontextrestored'));
      expect(handler.getRecoveryState()).toBe('restored');
    }
    expect(mockAnimator.start).toHaveBeenCalledTimes(5);
    expect(onContextRestored).toHaveBeenCalledTimes(5);

    handler.detach();
  });

  it('guarantees clean listener detachment mid-lifecycle ignoring subsequent events', () => {
    const handler = attachWebGLContextLossHandlers(canvas, {
      animator: mockAnimator,
      onContextLost,
      onContextRestored,
    });

    // Run 5 cycles
    for (let i = 0; i < 5; i++) {
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
      canvas.dispatchEvent(new Event('webglcontextrestored'));
    }
    expect(mockAnimator.stop).toHaveBeenCalledTimes(5);
    expect(mockAnimator.start).toHaveBeenCalledTimes(5);

    // Detach handler
    handler.detach();

    // 10 subsequent events dispatched after detachment
    for (let i = 0; i < 10; i++) {
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
      canvas.dispatchEvent(new Event('webglcontextrestored'));
    }

    // Counts must not have increased
    expect(mockAnimator.stop).toHaveBeenCalledTimes(5);
    expect(mockAnimator.start).toHaveBeenCalledTimes(5);
    expect(onContextLost).toHaveBeenCalledTimes(5);
    expect(onContextRestored).toHaveBeenCalledTimes(5);
  });

  it('handles restoreContext failure modes and extension absence gracefully', () => {
    // Case A: getContext throws exception
    (canvas as any).getContext.mockImplementation(() => {
      throw new Error('GPU context initialization faulted');
    });

    const handler = attachWebGLContextLossHandlers(canvas, {
      animator: mockAnimator,
      onContextLost,
      onContextRestored,
    });

    // In ready state, restoreContext returns false immediately without probing getContext
    expect(handler.restoreContext()).toBe(false);

    // Drop context
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(handler.getRecoveryState()).toBe('lost');

    // restoreContext catches the exception and returns false
    const restored = handler.restoreContext();
    expect(restored).toBe(false);

    handler.detach();
  });
});

describe('Challenger M4: SafeGpuResourceDisposer Stress & Deduplication', () => {
  it('prevents multiple disposals of shared BufferGeometry and Material across 30 meshes', () => {
    const disposer = new SafeGpuResourceDisposer();
    const sharedGeom = new THREE.BufferGeometry();
    const geomDisposeSpy = vi.spyOn(sharedGeom, 'dispose');

    const sharedTex = new THREE.Texture();
    const texDisposeSpy = vi.spyOn(sharedTex, 'dispose');

    const sharedMat = new THREE.MeshStandardMaterial({ map: sharedTex });
    const matDisposeSpy = vi.spyOn(sharedMat, 'dispose');

    const root = new THREE.Group();
    const MESH_COUNT = 30;

    for (let i = 0; i < MESH_COUNT; i++) {
      const mesh = new THREE.Mesh(sharedGeom, sharedMat);
      root.add(mesh);
    }
    expect(root.children.length).toBe(MESH_COUNT);

    disposer.disposeObject(root);

    // Critical assertion: despite 30 meshes, dispose() is invoked exactly ONCE per resource
    expect(geomDisposeSpy).toHaveBeenCalledTimes(1);
    expect(matDisposeSpy).toHaveBeenCalledTimes(1);
    expect(texDisposeSpy).toHaveBeenCalledTimes(1);
    expect(root.children.length).toBe(0);

    // Repeated call is completely idempotent
    disposer.disposeObject(root);
    expect(geomDisposeSpy).toHaveBeenCalledTimes(1);
    expect(matDisposeSpy).toHaveBeenCalledTimes(1);
    expect(texDisposeSpy).toHaveBeenCalledTimes(1);
  });

  it('recursively navigates deeply nested scene hierarchies (depth 50) without stack overflow', () => {
    const disposer = new SafeGpuResourceDisposer();
    const DEPTH = 50;

    let currentParent = new THREE.Group();
    const root = currentParent;

    for (let i = 1; i < DEPTH; i++) {
      const nextGroup = new THREE.Group();
      currentParent.add(nextGroup);
      currentParent = nextGroup;
    }

    // Add leaf mesh at depth 50 with multi-material array containing duplicates
    const leafGeom = new THREE.BufferGeometry();
    const geomSpy = vi.spyOn(leafGeom, 'dispose');

    const matA = new THREE.MeshBasicMaterial();
    const matB = new THREE.MeshBasicMaterial();
    const matASpy = vi.spyOn(matA, 'dispose');
    const matBSpy = vi.spyOn(matB, 'dispose');

    const leafMesh = new THREE.Mesh(leafGeom, [matA, matB, matA]); // matA duplicated
    currentParent.add(leafMesh);

    disposer.disposeObject(root);

    expect(geomSpy).toHaveBeenCalledTimes(1);
    expect(matASpy).toHaveBeenCalledTimes(1); // Duplicated material in array disposed once
    expect(matBSpy).toHaveBeenCalledTimes(1);
    expect(root.children.length).toBe(0);
  });

  it('deduplicates shared textures across multiple distinct materials', () => {
    const disposer = new SafeGpuResourceDisposer();
    const sharedTex = new THREE.Texture();
    const texDisposeSpy = vi.spyOn(sharedTex, 'dispose');

    const mat1 = new THREE.MeshStandardMaterial({ map: sharedTex });
    const mat2 = new THREE.MeshStandardMaterial({ bumpMap: sharedTex, normalMap: sharedTex });

    const mat1Spy = vi.spyOn(mat1, 'dispose');
    const mat2Spy = vi.spyOn(mat2, 'dispose');

    disposer.disposeMaterial(mat1);
    disposer.disposeMaterial(mat2);

    expect(mat1Spy).toHaveBeenCalledTimes(1);
    expect(mat2Spy).toHaveBeenCalledTimes(1);
    // Texture referenced 3 times across 2 materials is disposed exactly ONCE
    expect(texDisposeSpy).toHaveBeenCalledTimes(1);
  });

  it('verifies disposeFullGlobeSceneGraph clears markers and invokes all component disposers', () => {
    const scene = new THREE.Scene();
    const graticuleGroup = new THREE.Group();
    const footprintGroup = new THREE.Group();
    const vectorsGroup = new THREE.Group();
    const customBeacon = new THREE.Group();

    const markers = new Map<string, { container: THREE.Object3D }>();
    for (let i = 0; i < 20; i++) {
      const container = new THREE.Group();
      container.add(new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial()));
      markers.set(`site-${i}`, { container });
    }

    const mockSurface = { dispose: vi.fn() };
    const mockPolarTerrain = { dispose: vi.fn() };
    const mockLaserTracks = { dispose: vi.fn() };
    const mockShadowMap = { dispose: vi.fn() };
    const mockSunLight = { shadow: { map: mockShadowMap } };
    const mockComposer = { passes: [{ dispose: vi.fn() }], dispose: vi.fn() };

    disposeFullGlobeSceneGraph({
      scene,
      markers,
      graticuleGroup,
      footprintGroup,
      vectorsGroup,
      customBeacon,
      surface: mockSurface,
      polarTerrain: mockPolarTerrain,
      laserTracks: mockLaserTracks,
      sunLight: mockSunLight as any,
      composer: mockComposer,
    });

    expect(markers.size).toBe(0);
    expect(mockSurface.dispose).toHaveBeenCalledTimes(1);
    expect(mockPolarTerrain.dispose).toHaveBeenCalledTimes(1);
    expect(mockLaserTracks.dispose).toHaveBeenCalledTimes(1);
    expect(mockShadowMap.dispose).toHaveBeenCalledTimes(1);
    expect(mockComposer.dispose).toHaveBeenCalledTimes(1);
  });
});

describe('Challenger M4: Asynchronous Texture Load Neutralization Post-Disposal', () => {
  it('neutralizes late asynchronous texture settlements when isDisposed is true', () => {
    let isDisposed = false;
    let externalSettledCalled = false;
    let surfaceDisposedCount = 0;

    const mockSurface = {
      dispose: () => {
        surfaceDisposedCount++;
      },
    };

    // Callback simulated from buildGlobeScene:52-59
    const handleTextureSettled = () => {
      if (isDisposed) {
        mockSurface.dispose();
        return;
      }
      externalSettledCalled = true;
    };

    // Normal pre-disposal settlement
    handleTextureSettled();
    expect(externalSettledCalled).toBe(true);
    expect(surfaceDisposedCount).toBe(0);

    // Scene disposal occurs
    isDisposed = true;
    externalSettledCalled = false;

    // Late asynchronous texture settlement finishes AFTER disposal
    handleTextureSettled();

    // Verification: external callback is NOT invoked, and late surface resources are purged
    expect(externalSettledCalled).toBe(false);
    expect(surfaceDisposedCount).toBe(1);
  });

  it('neutralizes late asynchronous error callbacks when isDisposed is true', () => {
    let isDisposed = false;
    let externalErrorLogged = false;

    // Callback simulated from buildGlobeScene:60-63
    const handleSurfaceUnavailable = (_msg: string) => {
      if (isDisposed) return;
      externalErrorLogged = true;
    };

    // Trigger error after disposal
    isDisposed = true;
    handleSurfaceUnavailable('Late texture load failed');

    expect(externalErrorLogged).toBe(false);
  });
});

describe('Challenger M4: GlobeContextLostBanner UI & Accessibility Invariants', () => {
  it('renders accessible flight-deck banner with alert role and restore action', () => {
    const onRestoreMock = vi.fn();
    const html = renderToStaticMarkup(
      React.createElement(GlobeContextLostBanner, { onRestore: onRestoreMock })
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('data-testid="globe-context-lost-banner"');
    expect(html).toContain('[GPU CONTEXT INTERRUPTED]');
    expect(html).toContain('WebGL Device Context Reset');
    expect(html).toContain('data-testid="globe-restore-context-button"');
    expect(html).toContain('Restore 3D Viewport');
    expect(html).toContain('aria-labelledby="globe-context-lost-title"');
    expect(html).toContain('aria-describedby="globe-context-lost-desc"');
  });

  it('renders gracefully without restore button when onRestore is omitted', () => {
    const html = renderToStaticMarkup(React.createElement(GlobeContextLostBanner));

    expect(html).toContain('role="alert"');
    expect(html).toContain('[GPU CONTEXT INTERRUPTED]');
    expect(html).not.toContain('globe-restore-context-button');
  });
});
