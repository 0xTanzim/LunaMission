/**
 * WebGL Context Loss & Recovery Controller (Milestone M4 / Feature 16).
 *
 * Implements Khronos/W3C WebGL specification requirements for handling device reset:
 * 1. Synchronously calls `event.preventDefault()` on `webglcontextlost` to inform the browser
 *    that the application intends to handle recovery rather than permanently drop WebGL.
 * 2. Immediately halts the 60 FPS animation loop to prevent repeated GL error spam.
 * 3. Notifies callers to update application UI with flight-deck recovery affordances.
 * 4. Automatically or manually coordinates context restoration and resumes render loops.
 */

export type WebGLContextRecoveryState = 'ready' | 'lost' | 'restoring' | 'restored';

export interface WebGLContextLossOptions {
  animator?: {
    start: () => void;
    stop: () => void;
  };
  onContextLost?: () => void;
  onContextRestored?: () => void;
}

export interface WebGLContextLossHandler {
  getRecoveryState: () => WebGLContextRecoveryState;
  restoreContext: () => boolean;
  detach: () => void;
}

export function attachWebGLContextLossHandlers(
  canvas: HTMLCanvasElement,
  options: WebGLContextLossOptions,
): WebGLContextLossHandler {
  let recoveryState: WebGLContextRecoveryState = 'ready';

  // W3C/Khronos § 5.14.14: After context loss, gl.getExtension('WEBGL_lose_context')
  // returns null. Cache the extension reference during setup while gl context is active.
  let cachedLoseContextExt: { restoreContext?: () => void } | null = null;
  try {
    const gl = (canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    cachedLoseContextExt = gl?.getExtension('WEBGL_lose_context') as {
      restoreContext?: () => void;
    } | null;
  } catch {
    // In headless or mock environments, getContext may throw or be uninitialized
  }

  const handleContextLost = (event: Event) => {
    // CRITICAL: Must synchronously call preventDefault() according to WebGL spec
    // to permit subsequent webglcontextrestored events from the browser/driver.
    event.preventDefault();
    recoveryState = 'lost';

    options.animator?.stop();
    options.onContextLost?.();
  };

  const handleContextRestored = () => {
    recoveryState = 'restored';

    options.animator?.start();
    options.onContextRestored?.();
  };

  canvas.addEventListener('webglcontextlost', handleContextLost, false);
  canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

  const restoreContext = (): boolean => {
    if (recoveryState !== 'lost') return false;
    recoveryState = 'restoring';

    try {
      // Prioritize pre-cached extension, falling back to query if not yet obtained
      let ext = cachedLoseContextExt;
      if (!ext) {
        const gl = (canvas.getContext('webgl2') ||
          canvas.getContext('webgl') ||
          canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
        ext = gl?.getExtension('WEBGL_lose_context') as {
          restoreContext?: () => void;
        } | null;
        if (ext) {
          cachedLoseContextExt = ext;
        }
      }

      if (ext && typeof ext.restoreContext === 'function') {
        ext.restoreContext();
        return true;
      }
    } catch (err) {
      console.warn('[WebGLContextRecovery] Manual context restoration failed:', err);
    }
    return false;
  };

  const detach = () => {
    canvas.removeEventListener('webglcontextlost', handleContextLost, false);
    canvas.removeEventListener('webglcontextrestored', handleContextRestored, false);
    cachedLoseContextExt = null;
  };

  return {
    getRecoveryState: () => recoveryState,
    restoreContext,
    detach,
  };
}
