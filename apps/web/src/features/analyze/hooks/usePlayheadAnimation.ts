import { useEffect, useRef } from 'react';
import { sharedPlayheadController } from '../../../shared/animation/sharedPlayheadRef';
import { usePrefersReducedMotion } from '../../accessibility/usePrefersReducedMotion';

interface PlayheadAnimationCallbacks {
  onFrame?: (buffer: Float64Array) => void;
  fpsIntervalMs?: number;
}

export function usePlayheadAnimation({ onFrame }: PlayheadAnimationCallbacks = {}) {
  const rafIdRef = useRef<number | null>(null);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;
  const lastVersionRef = useRef(sharedPlayheadController.getVersion());
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    // If operator prefers reduced motion, dispatch updates directly on writes without continuous rAF polling
    if (prefersReducedMotion) {
      const unsubscribe = sharedPlayheadController.subscribe((buffer) => {
        if (onFrameRef.current) {
          onFrameRef.current(buffer);
        }
      });
      return unsubscribe;
    }

    let isRunning = true;

    const loop = () => {
      if (!isRunning) return;

      const currentVersion = sharedPlayheadController.getVersion();
      if (currentVersion !== lastVersionRef.current) {
        lastVersionRef.current = currentVersion;
        const buffer = sharedPlayheadController.read();
        if (onFrameRef.current) {
          onFrameRef.current(buffer);
        }
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [prefersReducedMotion]);

  return {
    controller: sharedPlayheadController,
  };
}

