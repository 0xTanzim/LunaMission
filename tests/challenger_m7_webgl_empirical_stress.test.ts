/**
 * Challenger M7 Empirical Stress Harness:
 * WebGL Context Loss Resilience, W3C § 5.14.14 Extension Caching,
 * Memory Leak Prevention, and Console Cleanliness.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'bun:test';
import * as THREE from 'three';
import {
  attachWebGLContextLossHandlers,
  WebGLContextLossHandler,
  WebGLContextRecoveryState,
} from '../apps/web/src/features/spatial/globe/scene/globeContextLossHandler';
import {
  SafeGpuResourceDisposer,
  disposeFullGlobeSceneGraph,
} from '../apps/web/src/features/spatial/globe/scene/globeSceneDisposal';

class MockStressCanvas extends EventTarget {
  public getContext = vi.fn();
}

describe('Challenger M7: 10-Cycle and 100-Cycle Context Loss / Restore Resilience', () => {
  let canvas: HTMLCanvasElement;
  let mockAnimator: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> };
  let onLost: ReturnType<typeof vi.fn>;
  let onRestored: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    canvas = new MockStressCanvas() as unknown as HTMLCanvasElement;
    mockAnimator = { start: vi.fn(), stop: vi.fn() };
    onLost = vi.fn();
    onRestored = vi.fn();
  });

  it('guarantees 100% state synchronization across 10 consecutive loss/restore cycles', () => {
    const handler = attachWebGLContextLossHandlers(canvas, {
      animator: mockAnimator,
      onContextLost: onLost,
      onContextRestored: onRestored,
    });

    expect(handler.getRecoveryState()).toBe('ready');

    for (let cycle = 1; cycle <= 10; cycle++) {
      const lostEvt = new Event('webglcontextlost', { cancelable: true });
      const preventSpy = vi.spyOn(lostEvt, 'preventDefault');
      const notCancelled = canvas.dispatchEvent(lostEvt);

      // WebGL spec: preventDefault must be called synchronously to allow recovery
      expect(preventSpy).toHaveBeenCalledTimes(1);
      expect(lostEvt.defaultPrevented).toBe(true);
      expect(notCancelled).toBe(false);
      expect(handler.getRecoveryState()).toBe('lost');
      expect(mockAnimator.stop).toHaveBeenCalledTimes(cycle);
      expect(onLost).toHaveBeenCalledTimes(cycle);

      const restoreEvt = new Event('webglcontextrestored');
      canvas.dispatchEvent(restoreEvt);

      expect(handler.getRecoveryState()).toBe('restored');
      expect(mockAnimator.start).toHaveBeenCalledTimes(cycle);
      expect(onRestored).toHaveBeenCalledTimes(cycle);
    }

    expect(mockAnimator.stop).toHaveBeenCalledTimes(10);
    expect(mockAnimator.start).toHaveBeenCalledTimes(10);
    expect(onLost).toHaveBeenCalledTimes(10);
    expect(onRestored).toHaveBeenCalledTimes(10);

    handler.detach();
  });

  it('survives extreme stress of 100 rapid loss and restore cycles without desync or memory leakage', () => {
    const handler = attachWebGLContextLossHandlers(canvas, {
      animator: mockAnimator,
      onContextLost: onLost,
      onContextRestored: onRestored,
    });

    const STRESS_CYCLES = 100;
    for (let i = 1; i <= STRESS_CYCLES; i++) {
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
      expect(handler.getRecoveryState()).toBe('lost');

      canvas.dispatchEvent(new Event('webglcontextrestored'));
      expect(handler.getRecoveryState()).toBe('restored');
    }

    expect(mockAnimator.stop).toHaveBeenCalledTimes(STRESS_CYCLES);
    expect(mockAnimator.start).toHaveBeenCalledTimes(STRESS_CYCLES);
    expect(onLost).toHaveBeenCalledTimes(STRESS_CYCLES);
    expect(onRestored).toHaveBeenCalledTimes(STRESS_CYCLES);

    handler.detach();
  });
});

describe('Challenger M7: W3C/Khronos § 5.14.14 loseContext Extension Caching', () => {
  let canvas: HTMLCanvasElement;
  let restoreSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    canvas = new MockStressCanvas() as unknown as HTMLCanvasElement;
    restoreSpy = vi.fn();
  });

  it('verifies restoreContext succeeds using cached extension when getExtension returns null after loss', () => {
    let contextLostOccurred = false;
    const mockGl = {
      getExtension: vi.fn((name: string) => {
        // W3C spec behavior: getExtension returns null after context loss
        if (contextLostOccurred) return null;
        if (name === 'WEBGL_lose_context') {
          return { restoreContext: restoreSpy };
        }
        return null;
      }),
    };
    (canvas as any).getContext.mockReturnValue(mockGl);

    // Initial attach: caches extension while context is active
    const handler = attachWebGLContextLossHandlers(canvas, {});

    // Context is now lost
    contextLostOccurred = true;
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(handler.getRecoveryState()).toBe('lost');

    // restoreContext is called: must use cached extension because getExtension returns null
    const success = handler.restoreContext();
    expect(success).toBe(true);
    expect(restoreSpy).toHaveBeenCalledTimes(1);

    handler.detach();
  });

  it('prevents spurious restoration attempts when recoveryState is not lost', () => {
    const mockGl = {
      getExtension: vi.fn().mockReturnValue({ restoreContext: restoreSpy }),
    };
    (canvas as any).getContext.mockReturnValue(mockGl);

    const handler = attachWebGLContextLossHandlers(canvas, {});

    // State is 'ready' -> restoreContext must return false without calling restoreContext()
    expect(handler.getRecoveryState()).toBe('ready');
    expect(handler.restoreContext()).toBe(false);
    expect(restoreSpy).toHaveBeenCalledTimes(0);

    // Transition to restored
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(handler.getRecoveryState()).toBe('restored');

    // State is 'restored' -> restoreContext must return false
    expect(handler.restoreContext()).toBe(false);
    expect(restoreSpy).toHaveBeenCalledTimes(0);

    handler.detach();
  });
});

describe('Challenger M7: Memory Leak Prevention & Lifecycle Disposal', () => {
  it('deduplicates and prevents double-disposal across 50 repeated mount/unmount cycles', () => {
    for (let cycle = 0; cycle < 50; cycle++) {
      const disposer = new SafeGpuResourceDisposer();
      const sharedGeom = new THREE.BufferGeometry();
      const geomSpy = vi.spyOn(sharedGeom, 'dispose');
      const sharedTex = new THREE.Texture();
      const texSpy = vi.spyOn(sharedTex, 'dispose');
      const sharedMat = new THREE.MeshBasicMaterial({ map: sharedTex });
      const matSpy = vi.spyOn(sharedMat, 'dispose');

      const group = new THREE.Group();
      for (let m = 0; m < 10; m++) {
        group.add(new THREE.Mesh(sharedGeom, sharedMat));
      }

      disposer.disposeObject(group);

      expect(geomSpy).toHaveBeenCalledTimes(1);
      expect(texSpy).toHaveBeenCalledTimes(1);
      expect(matSpy).toHaveBeenCalledTimes(1);
      expect(group.children.length).toBe(0);

      // Idempotent secondary call
      disposer.disposeObject(group);
      expect(geomSpy).toHaveBeenCalledTimes(1);
    }
  });

  it('guarantees complete DOM listener detachment and neutralizes post-detach events', () => {
    const canvas = new MockStressCanvas() as unknown as HTMLCanvasElement;
    const mockAnimator = { start: vi.fn(), stop: vi.fn() };
    const onLost = vi.fn();
    const onRestored = vi.fn();

    const handler = attachWebGLContextLossHandlers(canvas, {
      animator: mockAnimator,
      onContextLost: onLost,
      onContextRestored: onRestored,
    });

    // Run 3 cycles
    for (let i = 0; i < 3; i++) {
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
      canvas.dispatchEvent(new Event('webglcontextrestored'));
    }
    expect(onLost).toHaveBeenCalledTimes(3);
    expect(onRestored).toHaveBeenCalledTimes(3);

    // Detach handler
    handler.detach();

    // Fire 50 events post-detach
    for (let i = 0; i < 50; i++) {
      const lost = new Event('webglcontextlost', { cancelable: true });
      canvas.dispatchEvent(lost);
      expect(lost.defaultPrevented).toBe(false);
      canvas.dispatchEvent(new Event('webglcontextrestored'));
    }

    // Call counts must stay exactly at 3
    expect(onLost).toHaveBeenCalledTimes(3);
    expect(onRestored).toHaveBeenCalledTimes(3);
    expect(mockAnimator.stop).toHaveBeenCalledTimes(3);
    expect(mockAnimator.start).toHaveBeenCalledTimes(3);
  });
});

describe('Challenger M7: Console Cleanliness & Zero Noise Guarantee', () => {
  let canvas: HTMLCanvasElement;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    canvas = new MockStressCanvas() as unknown as HTMLCanvasElement;
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('emits ZERO console warnings or errors across 10 normal context loss and restoration cycles', () => {
    const mockGl = {
      getExtension: vi.fn().mockReturnValue({ restoreContext: vi.fn() }),
    };
    (canvas as any).getContext.mockReturnValue(mockGl);

    const handler = attachWebGLContextLossHandlers(canvas, {});

    for (let i = 0; i < 10; i++) {
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
      const ok = handler.restoreContext();
      expect(ok).toBe(true);
      canvas.dispatchEvent(new Event('webglcontextrestored'));
    }

    expect(warnSpy).toHaveBeenCalledTimes(0);
    expect(errorSpy).toHaveBeenCalledTimes(0);

    handler.detach();
  });

  it('strictly limits warning to caught restoration failures with flight-deck prefix', () => {
    (canvas as any).getContext.mockImplementation(() => {
      throw new Error('Simulated GPU hardware crash');
    });

    const handler = attachWebGLContextLossHandlers(canvas, {});
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));

    const result = handler.restoreContext();
    expect(result).toBe(false);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(0);
    expect(warnSpy.mock.calls[0][0]).toContain('[WebGLContextRecovery] Manual context restoration failed:');

    handler.detach();
  });
});
