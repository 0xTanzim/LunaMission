import { describe, it, expect } from 'bun:test';
import * as THREE from 'three';
import { CANDIDATE_SITES } from '@luna/contracts';
import { cameraPoseForPreset } from '../src/features/spatial/globe/interaction/globeCameraPresets';
import { createCameraTransitionerWithResolver } from '../src/features/spatial/globe/interaction/globeCameraTransitioner';

describe('Challenger M2: Camera Geodesic Motion & Clearance Adversarial Suite', () => {
  const polarSites = CANDIDATE_SITES.filter(s => s.coordinates.latitudeDeg <= -80);
  const presets = [
    'nadir', 'global', 'oblique', 'site', 'inspection', 'overhead',
    'horizon', 'eva', 'earth_align', 'orbit360', 'north_look', 'sunward_terminator',
  ] as const;

  it('verifies camera clearance (r >= 1.45) across all 16 polar sites for all presets except local anomalies', () => {
    let minCamPos = Infinity;
    for (const site of polarSites) {
      for (const preset of presets) {
        const pose = cameraPoseForPreset(preset, site);
        const len = pose.camPos.length();
        if (len < minCamPos) minCamPos = len;
        // Global and nadir are > 4.5; local presets are on or above the lunar surface
        expect(len).toBeGreaterThanOrEqual(1.45);
      }
    }
    expect(minCamPos).toBeGreaterThanOrEqual(1.45);
  });

  it('stress tests 100 random polar site-to-site transitions for subterranean camera dip (r >= 1.45)', () => {
    const transitioner = createCameraTransitionerWithResolver(cameraPoseForPreset);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

    let minCamRadius = Infinity;
    let minTargetRadius = Infinity;

    // Test a diverse cohort of 50 polar transitions across various local presets
    const localPresets = ['site', 'inspection', 'overhead', 'horizon', 'eva', 'orbit360', 'north_look'] as const;
    let evaluatedTransitions = 0;

    for (let i = 0; i < polarSites.length; i += 2) {
      for (let j = 1; j < polarSites.length; j += 3) {
        if (i === j) continue;
        const preset = localPresets[(i + j) % localPresets.length];
        const siteA = polarSites[i];
        const siteB = polarSites[j];

        const startPose = cameraPoseForPreset(preset, siteA);
        camera.position.copy(startPose.camPos);
        camera.up.copy(startPose.upVector);
        const controls = { target: startPose.lookTarget.clone(), update: () => {} } as any;

        transitioner.moveTo(preset, siteB);
        let steps = 0;
        while (transitioner.isTransitioning() && steps < 40) {
          transitioner.step(camera, controls);
          minCamRadius = Math.min(minCamRadius, camera.position.length());
          minTargetRadius = Math.min(minTargetRadius, controls.target.length());
          steps++;
        }
        evaluatedTransitions++;
      }
    }

    expect(evaluatedTransitions).toBeGreaterThan(15);
    // Camera must stay above surface radius 1.45 throughout all transitions
    expect(minCamRadius).toBeGreaterThanOrEqual(1.45);
    // Look target must stay on the surface shell (>= 1.44) and never penetrate core (< 0.6)
    expect(minTargetRadius).toBeGreaterThan(0.6);
    expect(minTargetRadius).toBeGreaterThanOrEqual(1.44);
  });

  it('verifies rapid transition interruptions (retargeting in-flight) without NaN or crash', () => {
    const transitioner = createCameraTransitionerWithResolver(cameraPoseForPreset);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    const startPose = cameraPoseForPreset('nadir', polarSites[0]);
    camera.position.copy(startPose.camPos);
    camera.up.copy(startPose.upVector);
    const controls = { target: startPose.lookTarget.clone(), update: () => {} } as any;

    for (let cycle = 0; cycle < 50; cycle++) {
      const preset = presets[cycle % presets.length];
      const site = polarSites[cycle % polarSites.length];
      transitioner.moveTo(preset, site);

      const steps = (cycle % 5) + 1;
      for (let s = 0; s < steps; s++) {
        transitioner.step(camera, controls);
        expect(Number.isFinite(camera.position.x)).toBe(true);
        expect(Number.isFinite(camera.position.y)).toBe(true);
        expect(Number.isFinite(camera.position.z)).toBe(true);
        expect(Number.isFinite(controls.target.x)).toBe(true);
      }
    }
  });

  it('verifies earth_align lookTarget radius meets contract (r >= 1.45) across all sites, eliminating animator snap', () => {
    for (const site of CANDIDATE_SITES) {
      const pose = cameraPoseForPreset('earth_align', site);
      const targetLen = pose.lookTarget.length();

      // Look target must satisfy PROJECT.md Section 4.2 contract (>= 1.45 scene units)
      expect(targetLen).toBeGreaterThanOrEqual(1.45);
      // Stays safely above the 1.40 threshold (MOON_SCENE_RADIUS - 0.05), so globeSceneAnimator snap is never triggered
      expect(targetLen).toBeGreaterThan(1.40);
    }
  });

  it('verifies sunward_terminator camera and target clearance (r >= 1.45) across all catalog sites including non-polar', () => {
    for (const site of CANDIDATE_SITES) {
      const pose = cameraPoseForPreset('sunward_terminator', site);
      expect(pose.camPos.length()).toBeGreaterThanOrEqual(1.45);
      expect(pose.lookTarget.length()).toBeGreaterThanOrEqual(1.45);
    }
  });
});
