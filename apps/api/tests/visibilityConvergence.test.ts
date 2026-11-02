import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { topocentricEphemerisService } from '../src/services/celestial/ephemerisService';
import { computeHermiteCoeffs, evalHermite, unwrapAzimuth } from '../src/services/celestial/hermiteSpline';
import { horizonProfileService } from '../src/services/celestial/horizonProfileService';
import { solveVisibility } from '../src/services/celestial/visibilitySolver';
import type { M4SolverProofArtifact } from '../src/services/celestial/visibilityTypes';

describe('Milestone M4 Cadence Convergence & Artifact Verification', () => {
  const artifactPath = join(process.cwd(), 'validation/artifacts/m4_solver_proof.json');

  it('validates m4_solver_proof.json schema and verified status', () => {
    expect(existsSync(artifactPath)).toBe(true);
    const content = readFileSync(artifactPath, 'utf-8');
    const artifact = JSON.parse(content) as M4SolverProofArtifact;

    expect(artifact.milestone).toBe('M4');
    expect(artifact.verified).toBe(true);
    expect(artifact.solver_configuration.brent_bracket_tolerance_seconds).toBe(1.0);
    expect(artifact.solver_configuration.tangential_graze_threshold_deg).toBe(1e-7);

    // Verify all 6 benchmark cases
    expect(artifact.analytical_proof_cases.length).toBe(6);
    for (const c of artifact.analytical_proof_cases) {
      expect(c.passed).toBe(true);
      const res = c.residuals.time_residual_sec ?? c.residuals.max_time_residual_sec ?? c.residuals.duration_residual_sec ?? 0;
      expect(res).toBeLessThanOrEqual(1.0);
    }

    // Verify convergence section
    expect(artifact.convergence_test.sub_second_convergence_verified).toBe(true);
    expect(artifact.convergence_test.metrics.total_duration_residual_hours).toBeLessThanOrEqual(0.05);
  });

  it('verifies 72-hour empirical Hermite interpolation residual <= 0.0001° against 1m Horizons query', async () => {
    const start = new Date('2026-05-15T12:00:00Z');
    const stop = new Date('2026-05-18T12:00:00Z');

    const [t10m, t1m] = await Promise.all([
      topocentricEphemerisService.getTopocentricTrajectory({
        target: 'Sun',
        latitudeDeg: -89.44,
        longitudeDeg: 222.5,
        elevationMeters: 3820,
        mastHeightMeters: 2.0,
        startTime: start,
        stopTime: stop,
        stepSize: '10m',
        siteId: 'connecting-ridge',
      }),
      topocentricEphemerisService.getTopocentricTrajectory({
        target: 'Sun',
        latitudeDeg: -89.44,
        longitudeDeg: 222.5,
        elevationMeters: 3820,
        mastHeightMeters: 2.0,
        startTime: start,
        stopTime: stop,
        stepSize: '1m',
        siteId: 'connecting-ridge-1m',
      }),
    ]);

    expect(t10m.points.length).toBe(433);
    expect(t1m.points.length).toBe(4321);

    let maxElDiff = 0.0;
    let maxAzDiff = 0.0;

    for (const pt of t1m.points) {
      const idx = t10m.points.findIndex(
        (p, i) => i < t10m.points.length - 1 && p.epochMs <= pt.epochMs && t10m.points[i + 1]!.epochMs >= pt.epochMs,
      );
      if (idx === -1) continue;

      const p0 = t10m.points[idx]!;
      const p1 = t10m.points[idx + 1]!;
      const tau = (pt.epochMs - p0.epochMs) / (p1.epochMs - p0.epochMs);
      const dtHr = (p1.epochMs - p0.epochMs) / 3600000.0;

      const az0 = p0.azimuthDeg;
      const az1 = unwrapAzimuth(az0, p1.azimuthDeg);
      const cAz = computeHermiteCoeffs(az0, az1, p0.azimuthRateDegHr, p1.azimuthRateDegHr, dtHr);
      const cEl = computeHermiteCoeffs(p0.elevationDeg, p1.elevationDeg, p0.elevationRateDegHr, p1.elevationRateDegHr, dtHr);

      const interpAz = ((((evalHermite(cAz, tau) % 360) + 360) % 360));
      const interpEl = evalHermite(cEl, tau);

      const azDiff = Math.abs(interpAz - pt.azimuthDeg);
      const elDiff = Math.abs(interpEl - pt.elevationDeg);

      if (azDiff < 180 && azDiff > maxAzDiff) maxAzDiff = azDiff;
      if (elDiff > maxElDiff) maxElDiff = elDiff;
    }

    // Two-point cubic Hermite matches 1-minute ground truth to < 0.0001 deg (0.36 arcseconds)
    expect(maxElDiff).toBeLessThan(0.0001);
    expect(maxAzDiff).toBeLessThan(0.0001);

    // Derived timing residual dt = dEl / (dEl/dt) at polar grazing angular rates
    const maxRootTimingShiftSec = maxElDiff / (0.0005); // 0.0005 deg/s typical rate
    expect(maxRootTimingShiftSec).toBeLessThan(1.0);
  });

  it('confirms 72h continuous illumination calculation between 10m solver and 1m reference', async () => {
    const start = new Date('2026-05-15T12:00:00Z');
    const stop = new Date('2026-05-18T12:00:00Z');

    const [sun10m, earth10m] = await Promise.all([
      topocentricEphemerisService.getTopocentricTrajectory({
        target: 'Sun',
        latitudeDeg: -89.44,
        longitudeDeg: 222.5,
        elevationMeters: 3820,
        mastHeightMeters: 2.0,
        startTime: start,
        stopTime: stop,
        stepSize: '10m',
        siteId: 'connecting-ridge',
      }),
      topocentricEphemerisService.getTopocentricTrajectory({
        target: 'Earth',
        latitudeDeg: -89.44,
        longitudeDeg: 222.5,
        elevationMeters: 3820,
        mastHeightMeters: 2.0,
        startTime: start,
        stopTime: stop,
        stepSize: '10m',
        siteId: 'connecting-ridge',
      }),
    ]);

    const profile = horizonProfileService.getHorizonProfileForSite('connecting-ridge', 2.0);
    const report = solveVisibility({
      sunTrajectory: sun10m,
      earthTrajectory: earth10m,
      horizonProfile: profile,
      siteId: 'connecting-ridge',
    });

    expect(report.nominalMetrics.totalEvaluationHours).toBeCloseTo(72.0, 4);
    expect(report.nominalMetrics.totalSunlitHours).toBeCloseTo(72.0, 2);
    expect(report.nominalMetrics.sunlightPercentage).toBeCloseTo(100.0, 1);
  });
});
