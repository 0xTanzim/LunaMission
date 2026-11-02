import { describe, expect, it } from 'bun:test';
import type { HorizonBinStatus, HorizonProfile, TopocentricEphemerisPoint } from '@luna/contracts';
import { splitStepEvents } from '../../src/services/celestial/eventSplitter';

const baseMs = Date.UTC(2026, 10, 1, 0, 0, 0);
const stepSec = 600;
const dtHr = stepSec / 3600.0;

function flatHorizon(elevationDeg: number, status: HorizonBinStatus = 'valid'): HorizonProfile {
  return {
    elevationNominalDeg: Array(360).fill(elevationDeg),
    thetaLowDeg: Array(360).fill(elevationDeg),
    thetaHighDeg: Array(360).fill(elevationDeg),
    blockerDistanceKm: Array(360).fill(10.0),
    blockerElevationMeters: Array(360).fill(0.0),
    binStatus: Array(360).fill(status),
  };
}

function point(
  epochMs: number,
  elevationDeg: number,
  elevationRateDegHr: number,
  azimuthDeg = 30.0,
): TopocentricEphemerisPoint {
  return {
    timestampUtc: new Date(epochMs).toISOString(),
    epochMs,
    azimuthDeg,
    elevationDeg,
    azimuthRateDegHr: 0.0,
    elevationRateDegHr,
    angularRadiusDeg: 0.0,
    rangeKm: 150000000,
    rangeRateKmS: 0,
  };
}

describe('Visibility event provenance (skill ref 06 §9)', () => {
  it('a sign-changing crossing carries topology, terrain bin, tolerance and clearance rate', () => {
    const events = splitStepEvents({
      pt0: point(baseMs, -0.5, 6.0),
      pt1: point(baseMs + stepSec * 1000, 0.5, 6.0),
      horizonProfile: flatHorizon(0.0),
      target: 'Sun',
      criterion: 'center',
      bracketTolSec: 0.5,
    });

    expect(events.length).toBe(1);
    const event = events[0]!;

    expect(event.topology).toBe('crossing');
    expect(event.terrainBinIndex).toBe(30);
    expect(event.terrainBinStatus).toBe('valid');
    expect(event.solverToleranceSeconds).toBe(0.5);
    // Elevation sweeps 1° in 10 minutes.
    expect(event.clearanceRateDegPerHour).toBeCloseTo(6.0, 6);
    expect(event.timingSensitivityHoursPerDeg).toBeCloseTo(1.0 / 6.0, 6);
  });

  it('a tangential graze is labelled as tangency and reports undefined time localisation', () => {
    const events = splitStepEvents({
      pt0: point(baseMs, 0.0625, -0.25 / dtHr),
      pt1: point(baseMs + stepSec * 1000, 0.0625, 0.25 / dtHr),
      horizonProfile: flatHorizon(0.0),
      target: 'Sun',
      criterion: 'center',
      tangentialGrazeTolDeg: 1e-7,
    });

    expect(events.length).toBe(1);
    const event = events[0]!;

    expect(event.type).toBe('TANGENTIAL_GRAZE');
    expect(event.topology).toBe('tangency');
    expect(Math.abs(event.clearanceRateDegPerHour)).toBeLessThan(1e-6);
    expect(event.timingSensitivityHoursPerDeg).toBeNull();
  });

  it('propagates a truncated terrain bin instead of pretending the horizon is resolved', () => {
    const events = splitStepEvents({
      pt0: point(baseMs, -0.5, 6.0),
      pt1: point(baseMs + stepSec * 1000, 0.5, 6.0),
      horizonProfile: flatHorizon(0.0, 'incomplete_range_truncated'),
      target: 'Sun',
      criterion: 'center',
    });

    expect(events.length).toBe(1);
    expect(events[0]!.terrainBinStatus).toBe('incomplete_range_truncated');
  });

  it('reports the bin the event azimuth actually falls in', () => {
    const events = splitStepEvents({
      pt0: point(baseMs, -0.5, 6.0, 181.4),
      pt1: point(baseMs + stepSec * 1000, 0.5, 6.0, 181.4),
      horizonProfile: flatHorizon(0.0),
      target: 'Sun',
      criterion: 'center',
    });

    expect(events.length).toBe(1);
    expect(events[0]!.terrainBinIndex).toBe(181);
  });
});
