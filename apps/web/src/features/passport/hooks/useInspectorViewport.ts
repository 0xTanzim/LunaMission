import { useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';

/**
 * Zoom / pan / native-fullscreen state for the expanded horizon inspector. The
 * transform lives here so the chart only consumes `stageStyle`, and Escape routing
 * (dismiss the popover before closing the dialog) is supplied by the shell.
 */

const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;
const PAN_STEP_PX = 50;
const VIEWPORT_TRANSITION = 'transform 0.15s ease-out';

export interface InspectorViewport {
  /** Element that the browser Fullscreen API is requested on. */
  stageRef: RefObject<HTMLDivElement | null>;
  zoom: number;
  panX: number;
  isFullscreen: boolean;
  /** Pan controls are meaningless until the stage is magnified. */
  panEnabled: boolean;
  zoomIn(): void;
  zoomOut(): void;
  panLeft(): void;
  panRight(): void;
  resetViewport(): void;
  toggleFullscreen(): void;
  stageStyle: CSSProperties;
}

export function useInspectorViewport(
  isOpen: boolean,
  onEscape: () => void,
): InspectorViewport {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(ZOOM_MIN);
  const [panX, setPanX] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onEscape();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onEscape]);

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP));
  }, []);

  const panLeft = useCallback(() => {
    setPanX((p) => p + PAN_STEP_PX);
  }, []);

  const panRight = useCallback(() => {
    setPanX((p) => p - PAN_STEP_PX);
  }, []);

  const resetViewport = useCallback(() => {
    setZoom(ZOOM_MIN);
    setPanX(0);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const elem = stageRef.current;
    if (!elem) return;
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // A rejected exit leaves the stage fullscreened; the toolbar still reflects it.
      }
    } else {
      try {
        await elem.requestFullscreen();
      } catch (err) {
        console.warn('Native Fullscreen request denied:', err);
      }
    }
  }, []);

  return {
    stageRef,
    zoom,
    panX,
    isFullscreen,
    panEnabled: zoom > ZOOM_MIN,
    zoomIn,
    zoomOut,
    panLeft,
    panRight,
    resetViewport,
    toggleFullscreen,
    stageStyle: {
      transform: `translateX(${panX}px) scale(${zoom})`,
      transformOrigin: '50% 50%',
      transition: VIEWPORT_TRANSITION,
    },
  };
}
