/**
 * Pure viewport maths for the 2D polar map: pointer-to-selenographic inversion,
 * bounded pan/zoom clamping, aspect-ratio compensation, and camera presets.
 * Kept out of the component so the interaction model is testable without a DOM.
 */

import type { ProjectedPoint, SelenographicCoordinate } from '@/domain/coordinates/projection';
import { projectLatLon, unprojectCoordinates } from '@/domain/coordinates/projection';
import { getAllAvailableSites } from '@/domain/sites/catalog';
import type { CandidateSite } from '@/domain/sites/candidateSite';

export type MapZoomPreset = 'regional' | 'candidates' | 'site' | 'fit-all';

export const ZOOM_MIN = 0.8;
export const ZOOM_MAX = 4.5;
/** Toolbar step, in zoom units per click. */
export const ZOOM_STEP = 0.35;
/** Wheel multipliers: scroll up magnifies, scroll down shrinks. */
export const WHEEL_ZOOM_IN_FACTOR = 1.14;
export const WHEEL_ZOOM_OUT_FACTOR = 0.88;

/** Regional view is the unmapped 1:1 frame; candidates and site are explicit cameras. */
export const REGIONAL_ZOOM = 1.0;
export const CANDIDATES_ZOOM = 1.85;
export const SITE_ZOOM = 2.8;
/** Candidate-cluster pan for CANDIDATES_ZOOM, in screen pixels. */
export const CANDIDATES_PAN_Y_PX = 35;

/** Zoom after a clamp, so an out-of-range request becomes the nearest limit. */
export function clampZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

/** Toolbar step: a plain additive change. */
export function steppedZoom(zoom: number, direction: 1 | -1): number {
  return clampZoom(zoom + direction * ZOOM_STEP);
}

/** Wheel zoom, rounded to 2 dp because the readout reports the value verbatim. */
export function wheelZoom(zoom: number, deltaY: number): number {
  const factor = deltaY < 0 ? WHEEL_ZOOM_IN_FACTOR : WHEEL_ZOOM_OUT_FACTOR;
  return clampZoom(Number((zoom * factor).toFixed(2)));
}

export type WheelGesture = 'zoom' | 'passthrough';

export interface WheelGestureModifiers {
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

/**
 * Scroll-versus-zoom policy for the 2D map: the map is not a scroll trap. Plain wheel
 * scrolls the page; only Ctrl (Windows/Linux) or Cmd (macOS) zooms. Trackpad pinch
 * reports ctrlKey, so it zooms through the same path.
 */
export function resolveWheelGesture({ ctrlKey, metaKey }: WheelGestureModifiers): WheelGesture {
  return ctrlKey || metaKey ? 'zoom' : 'passthrough';
}

export interface MapViewport {
  zoom: number;
  pan: { x: number; y: number };
}

/**
 * Bounded pan clamping: prevents dragging the polar disc completely off screen.
 * Allowable pan distance scales with zoom level.
 */
export function clampPan(pan: { x: number; y: number }, zoom: number, center: number): { x: number; y: number } {
  // At zoom 1.0, maximum allowable pan offset is ~160px.
  // At higher zoom, viewport can pan further into terrain detail.
  const maxPan = Math.max(160, center * zoom * 0.75);
  return {
    x: Math.max(-maxPan, Math.min(maxPan, pan.x)),
    y: Math.max(-maxPan, Math.min(maxPan, pan.y)),
  };
}

/**
 * Calculates updated pan and zoom when zooming focused around a specific rendered SVG/screen point (e.g. mouse cursor).
 * Ensures the geographical point under the cursor remains invariant during zooming.
 */
export function zoomAroundScreenPoint(
  currentViewport: MapViewport,
  targetZoom: number,
  screenPoint: { x: number; y: number },
  center: number = 300,
): MapViewport {
  const newZoom = clampZoom(targetZoom);
  if (currentViewport.zoom === newZoom) return currentViewport;

  const ratio = newZoom / currentViewport.zoom;
  const newPanX = (screenPoint.x - center) * (1 - ratio) + currentViewport.pan.x * ratio;
  const newPanY = (screenPoint.y - center) * (1 - ratio) + currentViewport.pan.y * ratio;

  return {
    zoom: newZoom,
    pan: clampPan({ x: newPanX, y: newPanY }, newZoom, center),
  };
}

/**
 * Calculates updated pan and zoom when zooming focused around an untransformed world coordinate (e.g. candidate site).
 * Ensures the candidate site remains invariant on screen during zooming.
 */
export function zoomAroundWorldPoint(
  currentViewport: MapViewport,
  targetZoom: number,
  worldPoint: { x: number; y: number },
  center: number = 300,
): MapViewport {
  const newZoom = clampZoom(targetZoom);
  if (currentViewport.zoom === newZoom) return currentViewport;

  const zoomDelta = currentViewport.zoom - newZoom;
  const newPanX = currentViewport.pan.x + (worldPoint.x - center) * zoomDelta;
  const newPanY = currentViewport.pan.y + (worldPoint.y - center) * zoomDelta;

  return {
    zoom: newZoom,
    pan: clampPan({ x: newPanX, y: newPanY }, newZoom, center),
  };
}

export const zoomAroundFocalPoint = zoomAroundScreenPoint;

/**
 * Computes the optimal viewport to fit all candidate sites with comfortable margin.
 */
export function computeFitAllViewport(center: number, sites?: CandidateSite[]): MapViewport {
  const sourceSites = sites && sites.length > 0 ? sites : getAllAvailableSites();
  const polarSites = sourceSites.filter((site) => site.coordinates.latitudeDeg <= -80.0);
  if (polarSites.length === 0) {
    return { zoom: REGIONAL_ZOOM, pan: { x: 0, y: 0 } };
  }
  const points = polarSites.map((site) =>
    projectLatLon(site.coordinates.latitudeDeg, site.coordinates.longitudeDeg)
  );

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const clusterCenterX = (minX + maxX) / 2;
  const clusterCenterY = (minY + maxY) / 2;

  const spanX = maxX - minX;
  const spanY = maxY - minY;

  // Fit into 440px target area out of 600px canvas (leaving generous margin for labels)
  const fitZoom = Math.min(440 / Math.max(spanX, 100), 440 / Math.max(spanY, 100), 1.6);
  const zoom = clampZoom(Number(fitZoom.toFixed(2)));

  const panX = (center - clusterCenterX) * zoom;
  const panY = (center - clusterCenterY) * zoom;

  return {
    zoom,
    pan: clampPan({ x: panX, y: panY }, zoom, center),
  };
}

/** Camera for a named preset, centred on `sitePos` for the site-level view. */
export function presetViewport(preset: MapZoomPreset, sitePos: ProjectedPoint, center: number): MapViewport {
  switch (preset) {
    case 'candidates':
      return { zoom: CANDIDATES_ZOOM, pan: { x: 0, y: CANDIDATES_PAN_Y_PX } };
    case 'site':
      return {
        zoom: SITE_ZOOM,
        pan: clampPan(
          { x: (center - sitePos.x) * SITE_ZOOM, y: (center - sitePos.y) * SITE_ZOOM },
          SITE_ZOOM,
          center,
        ),
      };
    case 'fit-all':
      return computeFitAllViewport(center);
    case 'regional':
      return { zoom: REGIONAL_ZOOM, pan: { x: 0, y: 0 } };
  }
}

export interface PointerMapping {
  /** Client coordinates of the pointer, as reported by the DOM event. */
  clientX: number;
  clientY: number;
  /** svg.getBoundingClientRect(), cached by the caller. */
  rect: { left: number; top: number; width: number; height: number };
  /** Rendered svg extent, in viewBox units. */
  svgSize: number;
  center: number;
  viewport: MapViewport;
}

/**
 * Inverts the CSS-painted rect and the zoom/pan transform back into
 * untransformed svg space, then into selenographic coordinates.
 * Compensates for preserveAspectRatio="xMidYMid meet" letterboxing on non-square viewports.
 */
export function coordinateFromPointer({
  clientX,
  clientY,
  rect,
  svgSize,
  center,
  viewport,
}: PointerMapping): SelenographicCoordinate | null {
  if (rect.width <= 0 || rect.height <= 0) return null;

  // Compensate for preserveAspectRatio="xMidYMid meet"
  const containerAspect = rect.width / rect.height;
  let renderedLeft = rect.left;
  let renderedTop = rect.top;
  let renderedWidth = rect.width;
  let renderedHeight = rect.height;

  if (containerAspect > 1) {
    // Widescreen container: horizontally letterboxed (black bars left and right)
    renderedWidth = rect.height;
    renderedLeft = rect.left + (rect.width - renderedWidth) / 2;
  } else if (containerAspect < 1) {
    // Tall container: vertically letterboxed (black bars top and bottom)
    renderedHeight = rect.width;
    renderedTop = rect.top + (rect.height - renderedHeight) / 2;
  }

  // Pointer outside the rendered SVG viewBox
  if (
    clientX < renderedLeft ||
    clientX > renderedLeft + renderedWidth ||
    clientY < renderedTop ||
    clientY > renderedTop + renderedHeight
  ) {
    return null;
  }

  const svgX = ((clientX - renderedLeft) * svgSize) / renderedWidth;
  const svgY = ((clientY - renderedTop) * svgSize) / renderedHeight;
  const untransformedX = (svgX - center - viewport.pan.x) / viewport.zoom + center;
  const untransformedY = (svgY - center - viewport.pan.y) / viewport.zoom + center;
  return unprojectCoordinates(untransformedX, untransformedY);
}

/** Drag origin: the pointer offset that keeps the current pan under the cursor. */
export function dragOrigin(viewport: MapViewport, clientX: number, clientY: number): { x: number; y: number } {
  return { x: clientX - viewport.pan.x, y: clientY - viewport.pan.y };
}

/** Pan while dragging, relative to `dragOrigin`. */
export function draggedPan(origin: { x: number; y: number }, clientX: number, clientY: number): { x: number; y: number } {
  return { x: clientX - origin.x, y: clientY - origin.y };
}
