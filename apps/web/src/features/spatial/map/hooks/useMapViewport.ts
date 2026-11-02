import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DEFAULT_PROJECTION_CONFIG,
  type ProjectedPoint,
  type SelenographicCoordinate,
} from '@/domain/coordinates/projection';
import type { MapZoomPreset } from '@/features/spatial/map/components/MapToolbar';
import {
  REGIONAL_ZOOM,
  coordinateFromPointer,
  presetViewport,
  steppedZoom,
  zoomAroundWorldPoint,
  type MapViewport,
} from '@/features/spatial/map/model/mapViewportMath';
import { useMapGestures } from './useMapGestures';

const { svgSize: SVG_SIZE, center: MAP_CENTER } = DEFAULT_PROJECTION_CONFIG;

const REGIONAL_VIEWPORT: MapViewport = { zoom: REGIONAL_ZOOM, pan: { x: 0, y: 0 } };

/**
 * Owns the map's camera (zoom, pan, drag, touch) and the live cursor readout.
 */
export function useMapViewport(sitePos: ProjectedPoint) {
  const [viewport, setViewport] = useState<MapViewport>(REGIONAL_VIEWPORT);
  const [activePreset, setActivePreset] = useState<MapZoomPreset | 'custom'>('regional');
  const [isDragging, setIsDragging] = useState(false);
  const [cursorCoord, setCursorCoord] = useState<SelenographicCoordinate | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { zoom, pan } = viewport;

  const coordinateFromEvent = useCallback(
    (event: { clientX: number; clientY: number }): SelenographicCoordinate | null => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return null;
      return coordinateFromPointer({
        clientX: event.clientX,
        clientY: event.clientY,
        rect,
        svgSize: SVG_SIZE,
        center: MAP_CENTER,
        viewport,
      });
    },
    [viewport],
  );

  const applyPreset = useCallback(
    (preset: MapZoomPreset) => {
      setActivePreset(preset);
      setViewport(presetViewport(preset, sitePos, MAP_CENTER));
    },
    [sitePos],
  );

  const resetViewport = useCallback(() => applyPreset('regional'), [applyPreset]);

  const zoomIn = useCallback(() => {
    setActivePreset('custom');
    setViewport((current) => zoomAroundWorldPoint(current, steppedZoom(current.zoom, 1), sitePos, MAP_CENTER));
  }, [sitePos]);

  const zoomOut = useCallback(() => {
    setActivePreset('custom');
    setViewport((current) => zoomAroundWorldPoint(current, steppedZoom(current.zoom, -1), sitePos, MAP_CENTER));
  }, [sitePos]);

  const gestures = useMapGestures({
    svgRef,
    viewport,
    setViewport,
    setActivePreset,
    setIsDragging,
    setCursorCoord,
    coordinateFromEvent,
    svgSize: SVG_SIZE,
    mapCenter: MAP_CENTER,
  });

  const viewportStyle = useMemo(
    () => ({
      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
      transformOrigin: `${MAP_CENTER}px ${MAP_CENTER}px`,
      transition: isDragging ? 'none' : 'transform 0.15s ease-out',
    }),
    [pan, zoom, isDragging],
  );

  return {
    svgRef,
    zoom,
    pan,
    isDragging,
    activePreset,
    cursorCoord,
    viewportStyle,
    coordinateFromEvent,
    applyPreset,
    resetViewport,
    zoomIn,
    zoomOut,
    gestures,
    handleMouseDown: gestures.handleMouseDown,
    handleMouseMove: gestures.handleMouseMove,
    handleMouseUp: gestures.handleMouseUp,
    handleMouseLeave: gestures.handleMouseLeave,
    handleWheel: gestures.handleWheel,
    handleTouchStart: gestures.handleTouchStart,
    handleTouchMove: gestures.handleTouchMove,
    handleTouchEnd: gestures.handleTouchEnd,
    handleTouchCancel: gestures.handleTouchCancel,
  };
}
