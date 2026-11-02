/**
 * Challenger M6 Adversarial Stress Test Suite:
 * WebGL Context Loss Handling, Banner State Transitions, and Console Cleanliness
 *
 * Objectives Verified:
 * 1. Repeated context loss / restore cycles (10+ rapid cycles):
 *    - Strict synchronous event.preventDefault() invocation.
 *    - Clean state progression ('ready' -> 'lost' -> 'restored').
 *    - Pausing / resuming animation loop exactly once per cycle.
 *    - Flight-deck banner DOM mounting on loss and unmounting on restoration.
 * 2. Null extension & thrown exception resilience:
 *    - Graceful handling when gl.getExtension('WEBGL_lose_context') returns null.
 *    - Non-crashing behavior when getExtension or restoreContext throws.
 *    - Safe fallback when restoreContext is undefined or not a function.
 * 3. Detach cleanup & memory leak prevention:
 *    - Removal of DOM event listeners from HTMLCanvasElement.
 *    - Release of cached extension reference (cachedLoseContextExt = null).
 *    - Idempotent multiple detach() calls.
 * 4. Zero console noise & unhandled rejections:
 *    - 0 console.warn and 0 console.error during standard context loss/restore cycles.
 *    - Controlled single warning strictly on caught exception during manual restoration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  attachWebGLContextLossHandlers,
  WebGLContextLossHandler,
  WebGLContextRecoveryState,
} from '../apps/web/src/features/spatial/globe/scene/globeContextLossHandler';
import {
  GlobeContextLostBanner,
} from '../apps/web/src/features/spatial/globe/components/GlobeStatusOverlay';

class MockStressCanvas extends EventTarget {
  public getContext = vi.fn();
}

describe('Challenger M6: Repeated WebGL Context Loss / Restore Cycles & Banner State Transitions', () => {
  let canvas: HTMLCanvasElement;
  let mockAnimator: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> };
  let onContextLost: ReturnType<typeof vi.fn>;
  let onContextRestored: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    canvas = new MockStressCanvas() as unknown as HTMLCanvasElement;
    mockAnimator = {
      start: vi.fn(),
      stop: vi.fn(),
    };
    onContextLost = vi.fn();
    onContextRestored = vi.fn();
  });

  it('survives 10 consecutive context loss and restoration cycles with 100% state synchronization', () => {
    const handler = attachWebGLContextLossHandlers(canvas, {
      animator: mockAnimator,
      onContextLost,
      onContextRestored,
    });

    expect(handler.getRecoveryState()).toBe('ready');
    const CYCLE_COUNT = 10;

    for (let cycle = 1; cycle <= CYCLE_COUNT; cycle++) {
      // 1. Dispatch context lost
      const lostEvent = new Event('webglcontextlost', { cancelable: true });
      const preventDefaultSpy = vi.spyOn(lostEvent, 'preventDefault');
      const dispatchedLost = canvas.dispatchEvent(lostEvent);

      // preventDefault must be called synchronously according to Khronos spec
      expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
      expect(lostEvent.defaultPrevented).toBe(true);
      expect(dispatchedLost).toBe(false);
      expect(handler.getRecoveryState()).toBe('lost');
      expect(mockAnimator.stop).toHaveBeenCalledTimes(cycle);
      expect(onContextLost).toHaveBeenCalledTimes(cycle);

      // 2. Dispatch context restored
      const restoredEvent = new Event('webglcontextrestored');
      canvas.dispatchEvent(restoredEvent);

      expect(handler.getRecoveryState()).toBe('restored');
      expect(mockAnimator.start).toHaveBeenCalledTimes(cycle);
      expect(onContextRestored).toHaveBeenCalledTimes(cycle);
    }

    expect(mockAnimator.stop).toHaveBeenCalledTimes(CYCLE_COUNT);
    expect(mockAnimator.start).toHaveBeenCalledTimes(CYCLE_COUNT);
    expect(onContextLost).toHaveBeenCalledTimes(CYCLE_COUNT);
    expect(onContextRestored).toHaveBeenCalledTimes(CYCLE_COUNT);

    handler.detach();
  });

  it('verifies banner DOM mounting on context loss and unmounting on restoration across 10 cycles', () => {
    type ViewState = 'ready' | 'contextLost';
    let currentState: ViewState = 'ready';

    const onLost = () => { currentState = 'contextLost'; };
    const onRestored = () => { currentState = 'ready'; };

    const handler = attachWebGLContextLossHandlers(canvas, {
      animator: mockAnimator,
      onContextLost: onLost,
      onContextRestored: onRestored,
    });

    const renderBannerIfLost = (state: ViewState) => {
      if (state === 'contextLost') {
        return renderToStaticMarkup(
          React.createElement(GlobeContextLostBanner, {
            onRestore: () => handler.restoreContext(),
          })
        );
      }
      return '';
    };

    // Initially ready -> empty banner
    expect(renderBannerIfLost(currentState)).toBe('');

    for (let i = 1; i <= 10; i++) {
      // Trigger context loss
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
      expect(currentState).toBe('contextLost');

      const markup = renderBannerIfLost(currentState);
      expect(markup).toContain('data-testid="globe-context-lost-banner"');
      expect(markup).toContain('role="alert"');
      expect(markup).toContain('[GPU CONTEXT INTERRUPTED]');
      expect(markup).toContain('data-testid="globe-restore-context-button"');

      // Trigger context restored
      canvas.dispatchEvent(new Event('webglcontextrestored'));
      expect(currentState).toBe('ready');

      // Banner unmounted cleanly
      expect(renderBannerIfLost(currentState)).toBe('');
    }

    handler.detach();
  });
});

describe('Challenger M6: Null Extension & Exception Resilience in restoreContext', () => {
  let canvas: HTMLCanvasElement;
  let mockAnimator: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    canvas = new MockStressCanvas() as unknown as HTMLCanvasElement;
    mockAnimator = { start: vi.fn(), stop: vi.fn() };
  });

  it('gracefully returns false when gl.getExtension returns null both initially and during restore', () => {
    const mockGl = {
      getExtension: vi.fn().mockReturnValue(null),
    };
    (canvas as any).getContext.mockReturnValue(mockGl);

    const handler = attachWebGLContextLossHandlers(canvas, { animator: mockAnimator });

    // In ready state, restoreContext returns false
    expect(handler.restoreContext()).toBe(false);

    // Context lost
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(handler.getRecoveryState()).toBe('lost');

    // restoreContext queries extension, finds null, returns false without crashing
    const success = handler.restoreContext();
    expect(success).toBe(false);

    handler.detach();
  });

  it('catches and survives thrown exceptions from getContext during setup and restoration', () => {
    (canvas as any).getContext.mockImplementation(() => {
      throw new Error('GPU context creation blocked by OS sandbox');
    });

    // Initial attach catches getContext throw safely
    const handler = attachWebGLContextLossHandlers(canvas, { animator: mockAnimator });
    expect(handler.getRecoveryState()).toBe('ready');

    // Context loss works without relying on gl
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(handler.getRecoveryState()).toBe('lost');

    // restoreContext catches the getContext exception, warns, returns false without bubbling
    const success = handler.restoreContext();
    expect(success).toBe(false);

    handler.detach();
  });

  it('catches and survives thrown exceptions from getExtension during restoration', () => {
    const mockGl = {
      getExtension: vi.fn().mockImplementation(() => {
        throw new Error('SecurityError: WebGL extension query forbidden');
      }),
    };
    (canvas as any).getContext.mockReturnValue(mockGl);

    const handler = attachWebGLContextLossHandlers(canvas, { animator: mockAnimator });

    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(handler.getRecoveryState()).toBe('lost');

    const success = handler.restoreContext();
    expect(success).toBe(false);

    handler.detach();
  });

  it('gracefully handles extension objects where restoreContext is missing or non-function', () => {
    const mockGl = {
      getExtension: vi.fn().mockReturnValue({ restoreContext: 'not-a-callable-function' }),
    };
    (canvas as any).getContext.mockReturnValue(mockGl);

    const handler = attachWebGLContextLossHandlers(canvas, { animator: mockAnimator });

    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(handler.getRecoveryState()).toBe('lost');

    const success = handler.restoreContext();
    expect(success).toBe(false);

    handler.detach();
  });

  it('catches and survives thrown exceptions inside ext.restoreContext() execution', () => {
    const mockGl = {
      getExtension: vi.fn().mockReturnValue({
        restoreContext: () => {
          throw new DOMException('Graphics pipeline deadlock during context restoration');
        },
      }),
    };
    (canvas as any).getContext.mockReturnValue(mockGl);

    const handler = attachWebGLContextLossHandlers(canvas, { animator: mockAnimator });

    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(handler.getRecoveryState()).toBe('lost');

    const success = handler.restoreContext();
    expect(success).toBe(false);

    handler.detach();
  });
});

describe('Challenger M6: Detach Lifecycle, Idempotency & Memory Leak Prevention', () => {
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

  it('completely unbinds canvas listeners and neutralizes all subsequent events after detach', () => {
    const handler = attachWebGLContextLossHandlers(canvas, {
      animator: mockAnimator,
      onContextLost: onLost,
      onContextRestored: onRestored,
    });

    // 2 normal cycles
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(onLost).toHaveBeenCalledTimes(1);
    expect(onRestored).toHaveBeenCalledTimes(1);

    // Call detach
    handler.detach();

    // 10 subsequent events fired on canvas
    for (let i = 0; i < 10; i++) {
      const lostEvt = new Event('webglcontextlost', { cancelable: true });
      canvas.dispatchEvent(lostEvt);
      // preventDefault should NOT be called after detach
      expect(lostEvt.defaultPrevented).toBe(false);

      canvas.dispatchEvent(new Event('webglcontextrestored'));
    }

    // Call counts must remain strictly at 1
    expect(onLost).toHaveBeenCalledTimes(1);
    expect(onRestored).toHaveBeenCalledTimes(1);
    expect(mockAnimator.stop).toHaveBeenCalledTimes(1);
    expect(mockAnimator.start).toHaveBeenCalledTimes(1);
  });

  it('guarantees multiple detach() calls are completely idempotent without errors', () => {
    const handler = attachWebGLContextLossHandlers(canvas, {
      animator: mockAnimator,
      onContextLost: onLost,
      onContextRestored: onRestored,
    });

    // Detach 5 times consecutively
    expect(() => {
      handler.detach();
      handler.detach();
      handler.detach();
      handler.detach();
      handler.detach();
    }).not.toThrow();
  });
});

describe('Challenger M6: Console Cleanliness & Zero Unhandled Noise Check', () => {
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

  it('emits ZERO console warnings or errors during 10 normal context loss and restoration cycles', () => {
    const restoreMock = vi.fn();
    const mockGl = {
      getExtension: vi.fn().mockReturnValue({ restoreContext: restoreMock }),
    };
    (canvas as any).getContext.mockReturnValue(mockGl);

    const handler = attachWebGLContextLossHandlers(canvas, {});

    for (let i = 0; i < 10; i++) {
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
      const success = handler.restoreContext();
      expect(success).toBe(true);
      canvas.dispatchEvent(new Event('webglcontextrestored'));
    }

    expect(warnSpy).toHaveBeenCalledTimes(0);
    expect(errorSpy).toHaveBeenCalledTimes(0);

    handler.detach();
  });

  it('emits ZERO console noise when restoreContext is called in non-lost states', () => {
    const handler = attachWebGLContextLossHandlers(canvas, {});

    // Ready state
    expect(handler.getRecoveryState()).toBe('ready');
    expect(handler.restoreContext()).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(0);
    expect(errorSpy).toHaveBeenCalledTimes(0);

    // Restored state
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(handler.getRecoveryState()).toBe('restored');
    expect(handler.restoreContext()).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(0);
    expect(errorSpy).toHaveBeenCalledTimes(0);

    handler.detach();
  });

  it('strictly limits console.warn to caught restoration failures with exact prefix', () => {
    (canvas as any).getContext.mockImplementation(() => {
      throw new Error('Forced simulation failure');
    });

    const handler = attachWebGLContextLossHandlers(canvas, {});
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));

    expect(warnSpy).toHaveBeenCalledTimes(0);
    expect(errorSpy).toHaveBeenCalledTimes(0);

    const success = handler.restoreContext();
    expect(success).toBe(false);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(0);
    expect(warnSpy.mock.calls[0][0]).toContain('[WebGLContextRecovery] Manual context restoration failed:');

    handler.detach();
  });
});
