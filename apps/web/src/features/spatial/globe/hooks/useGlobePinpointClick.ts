/**
 * Hook to handle click-to-pin raycasting on the 3D Moon globe.
 */

import { RefObject, useEffect } from 'react';
import { createCustomLandingTarget, CustomLandingTarget } from '@/domain/target/customTargetModel';
import { GlobeSceneHandle } from '@/features/spatial/globe/scene/globeSceneBuilder';

export function useGlobePinpointClick(
  containerRef: RefObject<HTMLDivElement | null>,
  handleRef: RefObject<GlobeSceneHandle | null>,
  isPinpointMode?: boolean,
  onPinpoint?: (target: CustomLandingTarget) => void,
): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isPinpointMode || !onPinpoint) return;

    const handleClick = (event: MouseEvent) => {
      const handle = handleRef.current;
      if (!handle || typeof handle.raycastMoonSurface !== 'function') return;

      const hit = handle.raycastMoonSurface(event.clientX, event.clientY);
      if (hit) {
        const newTarget = createCustomLandingTarget({
          latitudeDeg: hit.latDeg,
          longitudeDeg: hit.lonDeg,
        });
        onPinpoint(newTarget);
      }
    };

    container.addEventListener('click', handleClick);
    return () => {
      container.removeEventListener('click', handleClick);
    };
  }, [containerRef, handleRef, isPinpointMode, onPinpoint]);
}
