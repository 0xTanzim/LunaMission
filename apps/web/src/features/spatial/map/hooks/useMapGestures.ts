import {
  useCallback,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { clampPan, wheelZoom, zoomAroundScreenPoint, type MapViewport } from '@/features/spatial/map/model/mapViewportMath';
import { calculate2DPanSensitivity } from '@/features/spatial/interaction/zoomAwareInteractionModel';
import type { SelenographicCoordinate } from '@/domain/coordinates/projection';

interface UseMapGesturesParams {
  svgRef: React.RefObject<SVGSVGElement | null>;
  viewport: MapViewport;
  setViewport: React.Dispatch<React.SetStateAction<MapViewport>>;
  setActivePreset: (preset: 'custom') => void;
  setIsDragging: (dragging: boolean) => void;
  setCursorCoord: (coord: SelenographicCoordinate | null) => void;
  coordinateFromEvent: (event: { clientX: number; clientY: number }) => SelenographicCoordinate | null;
  svgSize: number;
  mapCenter: number;
}

export function useMapGestures({
  svgRef, viewport, setViewport, setActivePreset, setIsDragging, setCursorCoord, coordinateFromEvent, svgSize, mapCenter,
}: UseMapGesturesParams) {
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, startPanX: 0, startPanY: 0 });
  const touchRef = useRef({ touchCount: 0, startDist: 0, startZoom: 1, startAngle: 0, midX: 0, midY: 0 });

  const applyPanDelta = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    const extent = rect && rect.width > 0 && rect.height > 0 ? Math.min(rect.width, rect.height) : svgSize;
    setViewport((current) => {
      const { panMultiplier, svgUnitPerScreenPixel } = calculate2DPanSensitivity(current.zoom, extent, svgSize);
      const deltaX = (clientX - dragStartRef.current.startX) * svgUnitPerScreenPixel * panMultiplier;
      const deltaY = (clientY - dragStartRef.current.startY) * svgUnitPerScreenPixel * panMultiplier;
      const bounded = clampPan({ x: dragStartRef.current.startPanX + deltaX, y: dragStartRef.current.startPanY + deltaY }, current.zoom, mapCenter);
      return { ...current, pan: bounded };
    });
  }, [svgRef, setViewport, svgSize, mapCenter]);

  const handleMouseDown = useCallback((e: ReactMouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartRef.current = { startX: e.clientX, startY: e.clientY, startPanX: viewport.pan.x, startPanY: viewport.pan.y };
  }, [viewport.pan, setIsDragging]);

  const handleMouseMove = useCallback((e: ReactMouseEvent) => {
    if (isDraggingRef.current) {
      setActivePreset('custom');
      applyPanDelta(e.clientX, e.clientY);
    }
    setCursorCoord(coordinateFromEvent(e));
  }, [applyPanDelta, coordinateFromEvent, setActivePreset, setCursorCoord]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    setIsDragging(false);
  }, [setIsDragging]);

  const handleWheel = useCallback((e: ReactWheelEvent) => {
    e.preventDefault();
    setActivePreset('custom');
    const rect = svgRef.current?.getBoundingClientRect();
    const targetZoom = wheelZoom(viewport.zoom, e.deltaY);
    if (rect && rect.width > 0 && rect.height > 0) {
      const extent = Math.min(rect.width, rect.height);
      const left = rect.left + (rect.width > rect.height ? (rect.width - extent) / 2 : 0);
      const top = rect.top + (rect.height > rect.width ? (rect.height - extent) / 2 : 0);
      const focalSvgX = ((e.clientX - left) * svgSize) / extent;
      const focalSvgY = ((e.clientY - top) * svgSize) / extent;
      setViewport((curr) => zoomAroundScreenPoint(curr, targetZoom, { x: focalSvgX, y: focalSvgY }, mapCenter));
    } else {
      setViewport((curr) => ({ ...curr, zoom: targetZoom, pan: clampPan(curr.pan, targetZoom, mapCenter) }));
    }
  }, [svgRef, viewport.zoom, setViewport, setActivePreset, svgSize, mapCenter]);

  const handleTouchStart = useCallback((e: ReactTouchEvent) => {
    const touches = e.touches;
    touchRef.current.touchCount = touches.length;
    if (touches.length === 1) {
      isDraggingRef.current = true;
      setIsDragging(true);
      dragStartRef.current = { startX: touches[0].clientX, startY: touches[0].clientY, startPanX: viewport.pan.x, startPanY: viewport.pan.y };
    } else if (touches.length >= 2) {
      const [t1, t2] = [touches[0], touches[1]];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const angle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);
      touchRef.current = { touchCount: touches.length, startDist: Math.max(dist, 1), startZoom: viewport.zoom, startAngle: angle, midX: (t1.clientX + t2.clientX) / 2, midY: (t1.clientY + t2.clientY) / 2 };
      isDraggingRef.current = false;
      setIsDragging(false);
    }
  }, [viewport.pan, viewport.zoom, setIsDragging]);

  const handleTouchMove = useCallback((e: ReactTouchEvent) => {
    if (e.touches.length === 1 && isDraggingRef.current) {
      setActivePreset('custom');
      applyPanDelta(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length >= 2) {
      setActivePreset('custom');
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const ratio = dist / touchRef.current.startDist;
      const nextZoom = Math.min(10.0, Math.max(0.5, touchRef.current.startZoom * ratio));
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0) {
        const extent = Math.min(rect.width, rect.height);
        const focalX = ((touchRef.current.midX - rect.left) * svgSize) / extent;
        const focalY = ((touchRef.current.midY - rect.top) * svgSize) / extent;
        setViewport((curr) => zoomAroundScreenPoint(curr, nextZoom, { x: focalX, y: focalY }, mapCenter));
      }
    }
  }, [applyPanDelta, svgRef, setViewport, setActivePreset, svgSize, mapCenter]);

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
    setIsDragging(false);
    touchRef.current.touchCount = 0;
  }, [setIsDragging]);

  return {
    isDraggingRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave: handleMouseUp,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel: handleTouchEnd,
  };
}
