export interface RenderLoopControls {
  start: () => void;
  stop: () => void;
}

/**
 * Visibility gate for the globe render loop. The globe stays mounted while the workspace
 * shows the 2D map, so its loop must suspend without losing scene state — and must never
 * double-schedule a frame loop when pause/resume races with WebGL context-loss recovery,
 * which calls start/stop on the same animator directly.
 */
export function createRenderLoopGate(controls: RenderLoopControls) {
  let suppressed = false;
  return {
    start: () => {
      if (!suppressed) controls.start();
    },
    stop: () => controls.stop(),
    pause: () => {
      suppressed = true;
      controls.stop();
    },
    resume: () => {
      if (!suppressed) return;
      suppressed = false;
      controls.start();
    },
    get isSuppressed() {
      return suppressed;
    },
  };
}

export type RenderLoopGate = ReturnType<typeof createRenderLoopGate>;
