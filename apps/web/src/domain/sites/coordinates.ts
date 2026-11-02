/** Selenographic position under the IAU/IAG Lunar Mean Earth / Polar Axis frame. */

export interface LunarCoordinates {
  latitudeDeg: number;       // e.g. -89.900 (negative is South)
  longitudeDeg: number;      // 0.000 to 360.000 or -180 to +180 East
  elevationMeters: number;   // Relative to reference lunar sphere of 1737.4 km radius
  convention?: string;        // 'IAU/IAG Lunar Mean Earth/Polar Axis'
}
