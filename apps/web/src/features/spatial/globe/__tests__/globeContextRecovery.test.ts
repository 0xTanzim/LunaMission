import { describe, it, expect, vi, beforeEach } from 'bun:test';
import {
  attachWebGLContextLossHandlers,
  WebGLContextRecoveryState,
} from '../scene/globeContextLossHandler';

class MockCanvas extends EventTarget {
  public getContext = vi.fn();
}

describe('attachWebGLContextLossHandlers', () => {
  let canvas: HTMLCanvasElement;
  let mockAnimator: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> };
  let onContextLost: ReturnType<typeof vi.fn>;
  let onContextRestored: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    canvas = new MockCanvas() as unknown as HTMLCanvasElement;
    mockAnimator = {
      start: vi.fn(),
      stop: vi.fn(),
    };
    onContextLost = vi.fn();
    onContextRestored = vi.fn();
  });

  it('initializes in ready state', () => {
    const handler = attachWebGLContextLossHandlers(canvas, {
      animator: mockAnimator,
      onContextLost,
      onContextRestored,
    });

    expect(handler.getRecoveryState()).toBe('ready');
    handler.detach();
  });

  it('synchronously calls event.preventDefault() and pauses animator on webglcontextlost', () => {
    const handler = attachWebGLContextLossHandlers(canvas, {
      animator: mockAnimator,
      onContextLost,
      onContextRestored,
    });

    const event = new Event('webglcontextlost', { cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    canvas.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(mockAnimator.stop).toHaveBeenCalledTimes(1);
    expect(handler.getRecoveryState()).toBe('lost');
    expect(onContextLost).toHaveBeenCalledTimes(1);

    handler.detach();
  });

  it('resumes animator and notifies callers on webglcontextrestored', () => {
    const handler = attachWebGLContextLossHandlers(canvas, {
      animator: mockAnimator,
      onContextLost,
      onContextRestored,
    });

    // Drop context first
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(handler.getRecoveryState()).toBe('lost');

    // Restore context
    const restoreEvent = new Event('webglcontextrestored');
    canvas.dispatchEvent(restoreEvent);

    expect(mockAnimator.start).toHaveBeenCalledTimes(1);
    expect(handler.getRecoveryState()).toBe('restored');
    expect(onContextRestored).toHaveBeenCalledTimes(1);

    handler.detach();
  });

  it('restoreContext attempts WEBGL_lose_context extension restoration if available', () => {
    const restoreContextMock = vi.fn();
    const mockGl = {
      getExtension: vi.fn().mockReturnValue({
        restoreContext: restoreContextMock,
      }),
    };
    (canvas as any).getContext.mockReturnValue(mockGl);

    const handler = attachWebGLContextLossHandlers(canvas, {
      animator: mockAnimator,
      onContextLost,
      onContextRestored,
    });

    // Mark as lost
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));

    const result = handler.restoreContext();
    expect(result).toBe(true);
    expect(restoreContextMock).toHaveBeenCalledTimes(1);

    handler.detach();
  });

  it('detach cleanly removes event listeners from the canvas', () => {
    const handler = attachWebGLContextLossHandlers(canvas, {
      animator: mockAnimator,
      onContextLost,
      onContextRestored,
    });

    handler.detach();

    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(mockAnimator.stop).not.toHaveBeenCalled();
    expect(onContextLost).not.toHaveBeenCalled();
  });
});
