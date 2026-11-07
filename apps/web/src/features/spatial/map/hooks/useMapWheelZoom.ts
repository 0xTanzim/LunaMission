import { Dispatch, RefObject, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { clampPan, resolveWheelGesture, wheelZoom, zoomAroundScreenPoint, type MapViewport } from '@/features/spatial/map/model/mapViewportMath';
import { hasDismissedZoomHint, storeZoomHintDismissed } from '@/features/spatial/map/model/zoomHintStorage';

interface UseMapWheelZoomParams {
  svgRef: RefObject<SVGSVGElement | null>;
  viewport: MapViewport;
  setViewport: Dispatch<SetStateAction<MapViewport>>;
  setActivePreset: (preset: 'custom') => void;
  svgSize: number;
  mapCenter: number;
}

/**
 * Zoom lives on a native non-passive wheel listener: React attaches its root wheel
 * listener passively, so preventDefault — needed to stop Ctrl+wheel from becoming
 * browser page-zoom — silently fails there. Plain wheel (no modifier) falls through
 * so the page scrolls normally over the map, and raises the zoom hint once per session.
 */
export function useMapWheelZoom({ svgRef, viewport, setViewport, setActivePreset, svgSize, mapCenter }: UseMapWheelZoomParams) {
  const viewportZoomRef = useRef(viewport.zoom);
  viewportZoomRef.current = viewport.zoom;
  const zoomGestureRef = useRef({ setViewport, setActivePreset, svgSize, mapCenter });
  zoomGestureRef.current = { setViewport, setActivePreset, svgSize, mapCenter };

  const [zoomHintVisible, setZoomHintVisible] = useState(false);
  const zoomHintDismissedRef = useRef(hasDismissedZoomHint());

  const dismissZoomHint = useCallback(() => {
    zoomHintDismissedRef.current = true;
    setZoomHintVisible(false);
    storeZoomHintDismissed();
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onNativeWheel = (e: WheelEvent) => {
      if (resolveWheelGesture(e) === 'passthrough') {
        if (!zoomHintDismissedRef.current) setZoomHintVisible(true);
        return;
      }
      e.preventDefault();
      const { setViewport: setVp, setActivePreset: setPreset, svgSize: size, mapCenter: center } = zoomGestureRef.current;
      setPreset('custom');
      const rect = svg.getBoundingClientRect();
      const targetZoom = wheelZoom(viewportZoomRef.current, e.deltaY);
      if (rect.width > 0 && rect.height > 0) {
        const extent = Math.min(rect.width, rect.height);
        const left = rect.left + (rect.width > rect.height ? (rect.width - extent) / 2 : 0);
        const top = rect.top + (rect.height > rect.width ? (rect.height - extent) / 2 : 0);
        const focalSvgX = ((e.clientX - left) * size) / extent;
        const focalSvgY = ((e.clientY - top) * size) / extent;
        setVp((curr) => zoomAroundScreenPoint(curr, targetZoom, { x: focalSvgX, y: focalSvgY }, center));
      } else {
        setVp((curr) => ({ ...curr, zoom: targetZoom, pan: clampPan(curr.pan, targetZoom, center) }));
      }
    };
    svg.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onNativeWheel);
  }, [svgRef]);

  return { zoomHintVisible, dismissZoomHint };
}
