import { describe, expect, test } from 'bun:test';
import {
  validateSouthPolarCoordinates,
  executeWithOfflineFallback,
  POLAR_LATITUDE_BOUNDS,
  type BoundaryValidationResult,
} from './boundaryGuards';

describe('Polar Boundary Protection & Deterministic Error Recovery (Task 3.1)', () => {
  test('confirms valid lunar south polar coordinates between -80.0°S and -90.0°S', () => {
    expect(POLAR_LATITUDE_BOUNDS.minLatitude).toBe(-90.0);
    expect(POLAR_LATITUDE_BOUNDS.maxLatitude).toBe(-80.0);

    const validCase = validateSouthPolarCoordinates(-85.4, 30.5);
    expect(validCase.isValid).toBe(true);
    expect(validCase.disclosureNotice).toBeUndefined();
  });

  test('intercepts non-polar coordinates and returns explicit boundary disclosure notice', () => {
    // Equatorial coordinate (0.0°)
    const equatorialCase: BoundaryValidationResult = validateSouthPolarCoordinates(0.0, 15.0);
    expect(equatorialCase.isValid).toBe(false);
    expect(equatorialCase.disclosureNotice).toContain('-80.0°S to -90.0°S');
    expect(equatorialCase.disclosureNotice).toContain('validated exclusively for the lunar south pole');

    // Mid-latitude coordinate (-75.0°)
    const midLatCase: BoundaryValidationResult = validateSouthPolarCoordinates(-75.0, 0.0);
    expect(midLatCase.isValid).toBe(false);
    expect(midLatCase.disclosureNotice).toContain('out of validated bounds');
  });

  test('normalizes longitude cleanly to [0, 360) degrees', () => {
    const wrappedNeg = validateSouthPolarCoordinates(-88.0, -45.0);
    expect(wrappedNeg.isValid).toBe(true);
    expect(wrappedNeg.normalizedLongitude).toBe(315.0);

    const wrappedOver360 = validateSouthPolarCoordinates(-88.0, 400.0);
    expect(wrappedOver360.isValid).toBe(true);
    expect(wrappedOver360.normalizedLongitude).toBe(40.0);
  });

  test('executes operation with deterministic local fallback when primary service fails', async () => {
    // Simulated remote service failure
    const failingServiceCall = async () => {
      throw new Error('Connection refused: microservice on port 3001 unavailable');
    };

    const localFallbackCalculation = () => ({
      illuminationPct: 84.5,
      dteLineOfSightPct: 92.0,
      provenance: 'LOCAL_DETERMINISTIC_ANALYTICAL' as const,
    });

    const result = await executeWithOfflineFallback(
      failingServiceCall,
      localFallbackCalculation
    );

    expect(result.data.illuminationPct).toBe(84.5);
    expect(result.data.provenance).toBe('LOCAL_DETERMINISTIC_ANALYTICAL');
    expect(result.usedFallback).toBe(true);
    expect(result.fallbackReason).toContain('Connection refused');
  });
});
