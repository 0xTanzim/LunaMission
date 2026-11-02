/**
 * Coordinate-frame identity for angles that cross module boundaries.
 *
 * Three frames are used by the application and are never interchangeable:
 * - topocentric: horizon-relative angles at one observer. Elevation is above
 *   (+) or below (-) that observer's horizon; azimuth is measured clockwise
 *   from lunar north. Values depend on the site, so they change when the site
 *   changes even at a fixed epoch.
 * - selenographic: body-fixed Moon coordinates (latitude/longitude on the
 *   IAU/IAG lunar mean Earth/polar axis). Values are observer independent.
 * - screen: radians in the 2D map's pixel space, where +x is east on screen.
 *
 * A plain number only enters a frame through the explicit constructor below,
 * which is where the code claims "this number is in that frame".
 */

declare const frameTag: unique symbol;

export type FrameTag =
  | 'topocentricElevationDeg'
  | 'topocentricAzimuthDeg'
  | 'selenographicLatitudeDeg'
  | 'selenographicLongitudeDeg'
  | 'screenAngleRad';

/** Nominal wrapper: structurally a number, nominally a member of one frame. */
export type FramedAngle<F extends FrameTag> = number & { readonly [frameTag]: F };

export type TopocentricElevationDeg = FramedAngle<'topocentricElevationDeg'>;
export type TopocentricAzimuthDeg = FramedAngle<'topocentricAzimuthDeg'>;
export type SelenographicLatitudeDeg = FramedAngle<'selenographicLatitudeDeg'>;
export type SelenographicLongitudeDeg = FramedAngle<'selenographicLongitudeDeg'>;
export type ScreenAngleRad = FramedAngle<'screenAngleRad'>;

export function asTopocentricElevationDeg(value: number): TopocentricElevationDeg {
  return value as TopocentricElevationDeg;
}

export function asTopocentricAzimuthDeg(value: number): TopocentricAzimuthDeg {
  return value as TopocentricAzimuthDeg;
}

export function asSelenographicLatitudeDeg(value: number): SelenographicLatitudeDeg {
  return value as SelenographicLatitudeDeg;
}

export function asSelenographicLongitudeDeg(value: number): SelenographicLongitudeDeg {
  return value as SelenographicLongitudeDeg;
}

export function asScreenAngleRad(value: number): ScreenAngleRad {
  return value as ScreenAngleRad;
}
