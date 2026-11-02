import { describe, expect, it } from 'bun:test';
import type { HorizonProfile } from '@luna/contracts';
import {
  azElFromDirection,
  compassLabel,
  directionFromAzEl,
  normaliseAzimuthDeg,
} from '../../src/services/celestial/azimuthBasis';
import { integrateVisibleSolarDisk } from '../../src/services/celestial/solarDiskIntegration';

function hardHorizon(elevationDeg: number): HorizonProfile {
  return {
    elevationNominalDeg: Array(360).fill(elevationDeg),
    thetaLowDeg: Array(360).fill(elevationDeg),
    thetaHighDeg: Array(360).fill(elevationDeg),
    blockerDistanceKm: Array(360).fill(10),
    blockerElevationMeters: Array(360).fill(0),
    binStatus: Array(360).fill('valid' as const),
  };
}

describe('Azimuth basis: north 0°, east-positive', () => {
  it('maps the cardinals to the documented local axes (x east, y north, z up)', () => {
    const north = directionFromAzEl(0, 0);
    const east = directionFromAzEl(90, 0);
    const south = directionFromAzEl(180, 0);
    const west = directionFromAzEl(270, 0);

    expect(north.x).toBeCloseTo(0, 12);
    expect(north.y).toBeCloseTo(1, 12);

    expect(east.x).toBeCloseTo(1, 12);
    expect(east.y).toBeCloseTo(0, 12);

    expect(south.x).toBeCloseTo(0, 12);
    expect(south.y).toBeCloseTo(-1, 12);

    expect(west.x).toBeCloseTo(-1, 12);
    expect(west.y).toBeCloseTo(0, 12);

    expect(compassLabel(0)).toBe('N');
    expect(compassLabel(90)).toBe('E');
    expect(compassLabel(180)).toBe('S');
    expect(compassLabel(270)).toBe('W');
  });

  it('places the zenith straight up and round-trips every sampled azimuth', () => {
    const zenith = directionFromAzEl(123, 90);
    expect(zenith.z).toBeCloseTo(1, 12);

    for (let azimuthDeg = 0; azimuthDeg < 360; azimuthDeg += 7.5) {
      for (const elevationDeg of [-15, 0, 0.266, 45, 89]) {
        const roundTrip = azElFromDirection(directionFromAzEl(azimuthDeg, elevationDeg));
        expect(roundTrip.azimuthDeg).toBeCloseTo(normaliseAzimuthDeg(azimuthDeg), 9);
        expect(roundTrip.elevationDeg).toBeCloseTo(elevationDeg, 9);
      }
    }
  });

  it('keeps the disk integral independent of skyline traverse direction', () => {
    // A mirrored skyline cannot change a fully swept circular-disk integral: the
    // integrator samples every azimuth of the disk, so handedness cannot bias it.
    // This is the invariant that makes the basis choice safe inside the integrator;
    // the convention still has to be fixed at every module boundary.
    const ramp = (bin: number) => 5 + 0.6 * (bin - 180);
    const profile: HorizonProfile = {
      ...hardHorizon(0),
      elevationNominalDeg: Array.from({ length: 360 }, (_, bin) => ramp(bin)),
      thetaLowDeg: Array.from({ length: 360 }, (_, bin) => ramp(bin)),
      thetaHighDeg: Array.from({ length: 360 }, (_, bin) => ramp(bin)),
    };
    const mirrored: HorizonProfile = {
      ...profile,
      elevationNominalDeg: profile.elevationNominalDeg.map((_, bin) => ramp((360 - bin) % 360)),
      thetaLowDeg: profile.thetaLowDeg.map((_, bin) => ramp((360 - bin) % 360)),
      thetaHighDeg: profile.thetaHighDeg.map((_, bin) => ramp((360 - bin) % 360)),
      blockerDistanceKm: [...profile.blockerDistanceKm],
      blockerElevationMeters: [...profile.blockerElevationMeters],
      binStatus: [...profile.binStatus],
    };

    const forward = integrateVisibleSolarDisk({
      centerAzimuthDeg: 180,
      centerElevationDeg: 5,
      angularRadiusDeg: 0.266,
      horizonProfile: profile,
    });
    const mirroredResult = integrateVisibleSolarDisk({
      centerAzimuthDeg: 180,
      centerElevationDeg: 5,
      angularRadiusDeg: 0.266,
      horizonProfile: mirrored,
    });

    expect(mirroredResult.geometricFraction).toBeCloseTo(forward.geometricFraction, 9);
  });
});
