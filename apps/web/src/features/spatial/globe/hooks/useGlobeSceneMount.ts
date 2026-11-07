import { RefObject, useEffect, useRef, useState } from 'react';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { GlobeStatus } from '@/features/spatial/globe/scene/globeStatus';
import {
  GlobeSceneHandle,
  buildGlobeScene,
} from '@/features/spatial/globe/scene/globeSceneBuilder';

/** Color mosaic and DEM relief both settle before the loading overlay lifts. */
const SURFACE_TEXTURE_COUNT = 2;

export interface UseGlobeSceneMountProps {
  containerRef: RefObject<HTMLDivElement | null>;
  selectedSiteIdRef: { current: string };
  pickSiteRef: { current: (site: CandidateSite) => void };
  onFlyoverChangeRef: { current?: (active: boolean) => void };
  /** False suspends the render loop while the scene stays mounted (hidden in 2D view). */
  isVisible: boolean;
}

export function useGlobeSceneMount({
  containerRef,
  selectedSiteIdRef,
  pickSiteRef,
  onFlyoverChangeRef,
  isVisible,
}: UseGlobeSceneMountProps) {
  const handleRef = useRef<GlobeSceneHandle | null>(null);
  const [status, setStatus] = useState<GlobeStatus>({ kind: 'loading' });
  const [hoveredSite, setHoveredSite] = useState<CandidateSite | null>(null);

  // Mount-only by design: rebuilding WebGL on a parent re-render is the cost this hook exists to avoid.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let settledTextures = 0;
    const handle = buildGlobeScene({
      container,
      initialSelectedSiteId: selectedSiteIdRef.current,
      onSurfaceSettled: () => {
        settledTextures += 1;
        if (settledTextures >= SURFACE_TEXTURE_COUNT) setStatus({ kind: 'ready' });
      },
      onSurfaceUnavailable: (message) => setStatus({ kind: 'textureError', message }),
      onHoverChange: setHoveredSite,
      isSiteSelected: (siteId) => siteId === selectedSiteIdRef.current,
      onPick: (site) => pickSiteRef.current(site),
      onFlyoverInterrupted: () => onFlyoverChangeRef.current?.(false),
      onContextLost: () => setStatus({ kind: 'contextLost' }),
      onContextRestored: () => setStatus({ kind: 'ready' }),
    });
    if (!handle) {
      setStatus({ kind: 'unsupported' });
      return;
    }

    handleRef.current = handle;
    if (typeof window !== 'undefined') {
      (window as any).__globeHandle = handle;
    }
    return () => {
      handleRef.current = null;
      if (typeof window !== 'undefined') {
        delete (window as any).__globeHandle;
      }
      handle.dispose();
    };
  }, []);

  // The scene stays mounted across view-mode switches; only its loop pauses. On reveal,
  // resume() also forces the first frame so a hidden stretch never leaves a stale canvas.
  useEffect(() => {
    if (isVisible) handleRef.current?.setRenderLoopActive?.(true);
    else handleRef.current?.setRenderLoopActive?.(false);
  }, [isVisible]);

  const restoreContext = () => handleRef.current?.restoreContext?.() ?? false;

  return { handleRef, status, setStatus, hoveredSite, setHoveredSite, restoreContext };
}
