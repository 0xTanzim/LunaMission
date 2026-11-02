import * as THREE from 'three';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { CameraPreset } from '@/features/spatial/model/spatialPreferences';
import { MOON_SCENE_RADIUS, latLonToVector3 } from '@/features/spatial/globe/scene/globeScene';

export const INSPECTION_CAMERA_ALTITUDE = 0.085;
export const INSPECTION_CAMERA_TILT = 0.035;

/**
 * EVA point-of-view contract (task 3.4, UX ledger F-15/L-53): the simulated camera
 * rides the top of the mission mast at mast height + crew eye height. True scale
 * (≈3.7 m ≈ 3.1e-6 scene units) sits three orders of magnitude below the camera
 * near plane (0.001 units ≈ 1.2 km), so the display uses the nearest renderable
 * altitude and every UI surface labels the mode "simulated" — no helmet-HUD or
 * telemetry claims are made.
 */
export const EVA_MAST_HEIGHT_METERS = 2;
export const EVA_CREW_EYE_HEIGHT_METERS = 1.7;
export const EVA_EYE_HEIGHT_METERS = EVA_MAST_HEIGHT_METERS + EVA_CREW_EYE_HEIGHT_METERS;
/** Renderable display floor: at/below this the lunar surface clips through the near plane. */
export const EVA_DISPLAY_EYE_ALTITUDE_UNITS = 0.003;

export function evaDisplayEyeAltitudeUnits(eyeHeightMeters: number = EVA_EYE_HEIGHT_METERS): number {
  const trueEyeUnits = (eyeHeightMeters / 1_737_400) * MOON_SCENE_RADIUS;
  return Math.max(EVA_DISPLAY_EYE_ALTITUDE_UNITS, trueEyeUnits);
}

export interface CameraPose {
  camPos: THREE.Vector3;
  lookTarget: THREE.Vector3;
  upVector: THREE.Vector3;
}

export interface TopocentricBasis {
  surfacePos: THREE.Vector3;
  normal: THREE.Vector3;
  north: THREE.Vector3;
  east: THREE.Vector3;
}

/**
 * Computes an orthonormal topocentric East-North-Up (ENU) frame at any lunar selenographic coordinate.
 * Resolves the polar singularity gracefully when latitude is near -90° by referencing the prime meridian (+Z).
 */
export function getTopocentricBasis(latDeg: number, lonDeg: number, radius = MOON_SCENE_RADIUS): TopocentricBasis {
  const surfacePos = latLonToVector3(latDeg, lonDeg, radius);
  const normal = surfacePos.clone().normalize();

  // Lunar rotational axis is +Y
  const poleAxis = new THREE.Vector3(0, 1, 0);
  let north = poleAxis.clone().sub(normal.clone().multiplyScalar(poleAxis.dot(normal)));

  // If directly at the exact pole, use Earth-facing prime meridian (+Z) as reference North
  if (north.lengthSq() < 1e-6) {
    const primeMeridian = new THREE.Vector3(0, 0, 1);
    north = primeMeridian.clone().sub(normal.clone().multiplyScalar(primeMeridian.dot(normal)));
  }
  north.normalize();

  const east = new THREE.Vector3().crossVectors(north, normal).normalize();

  return { surfacePos, normal, north, east };
}

/** Backend epoch sub-points (MOON_ME selenographic coordinates, JPL Horizons derived). */
export interface EpochSubPoints {
  subSolarLatDeg: number;
  subSolarLonDeg: number;
  subEarthLatDeg: number;
  subEarthLonDeg: number;
}

export interface SiteCelestialTangents {
  /** Unit direction across the site tangent plane toward the epoch sub-solar point. */
  sunTangent: THREE.Vector3;
  /** Unit direction across the site tangent plane toward the epoch sub-Earth point. */
  earthTangent: THREE.Vector3;
}

/**
 * Projects the epoch sub-solar / sub-Earth points onto the site's tangent plane
 * (display geometry from declared backend inputs — the epoch vectors themselves are
 * computed by the backend, never here). Falls back to the ENU east/north axes when a
 * sub-point is too close to the site zenith to project.
 */
export function computeSiteCelestialTangents(
  site: CandidateSite,
  epoch: EpochSubPoints,
): SiteCelestialTangents {
  const basis = getTopocentricBasis(site.coordinates.latitudeDeg, site.coordinates.longitudeDeg, MOON_SCENE_RADIUS);

  const projectToward = (latDeg: number, lonDeg: number, fallback: THREE.Vector3): THREE.Vector3 => {
    const subPoint = latLonToVector3(latDeg, lonDeg, MOON_SCENE_RADIUS);
    const dir = subPoint.sub(basis.surfacePos);
    const tangential = dir.sub(basis.normal.clone().multiplyScalar(dir.dot(basis.normal)));
    return tangential.lengthSq() < 1e-6 ? fallback.clone() : tangential.normalize();
  };

  return {
    sunTangent: projectToward(epoch.subSolarLatDeg, epoch.subSolarLonDeg, basis.east),
    earthTangent: projectToward(epoch.subEarthLatDeg, epoch.subEarthLonDeg, basis.north),
  };
}

/**
 * Computes tactical and local camera poses relative to a site's topocentric ENU frame.
 * Tangent-plane projections are enforced for Earth and Sun vectors to ensure look targets
 * and camera positions remain on or above the lunar surface (r >= 1.45 scene units).
 * `celestial` carries the epoch-driven directions (task 3.3); when absent the two
 * celestial-oriented presets fall back to fixed display directions.
 */
export function computeLocalPresetPose(
  preset: CameraPreset,
  _site: CandidateSite,
  basis: TopocentricBasis,
  celestial?: SiteCelestialTangents,
): CameraPose {
  const { surfacePos, normal, north, east } = basis;

  if (preset === 'inspection') {
    return {
      camPos: surfacePos
        .clone()
        .add(normal.clone().multiplyScalar(INSPECTION_CAMERA_ALTITUDE))
        .add(north.clone().multiplyScalar(-INSPECTION_CAMERA_TILT)),
      lookTarget: surfacePos.clone(),
      upVector: normal.clone(),
    };
  }

  if (preset === 'overhead') {
    return {
      camPos: surfacePos
        .clone()
        .add(normal.clone().multiplyScalar(0.135))
        .add(north.clone().multiplyScalar(-0.014)),
      lookTarget: surfacePos.clone(),
      upVector: normal.clone(),
    };
  }

  if (preset === 'horizon') {
    return {
      camPos: surfacePos
        .clone()
        .add(normal.clone().multiplyScalar(0.016))
        .add(north.clone().multiplyScalar(-0.028)),
      lookTarget: surfacePos
        .clone()
        .add(north.clone().multiplyScalar(0.035))
        .add(normal.clone().multiplyScalar(0.008)),
      upVector: normal.clone().normalize(),
    };
  }

  if (preset === 'eva') {
    const eyeAltitude = evaDisplayEyeAltitudeUnits();
    return {
      camPos: surfacePos
        .clone()
        .add(normal.clone().multiplyScalar(eyeAltitude))
        .add(north.clone().multiplyScalar(-0.006)),
      lookTarget: surfacePos
        .clone()
        .add(normal.clone().multiplyScalar(eyeAltitude))
        .add(north.clone().multiplyScalar(0.040)),
      upVector: normal.clone().normalize(),
    };
  }

  if (preset === 'earth_align') {
    let earthVector: THREE.Vector3;
    if (celestial) {
      earthVector = celestial.earthTangent.clone();
    } else {
      // Display fallback when no epoch context was supplied; the live scene always
      // provides the backend epoch vectors via setCelestialDirections.
      const earthDir = new THREE.Vector3(0, 0, 1);
      earthVector = earthDir.sub(normal.clone().multiplyScalar(earthDir.dot(normal)));
      if (earthVector.lengthSq() < 1e-6) earthVector = north.clone();
      else earthVector.normalize();
    }

    return {
      camPos: surfacePos
        .clone()
        .add(normal.clone().multiplyScalar(0.025))
        .sub(earthVector.clone().multiplyScalar(0.04)),
      lookTarget: surfacePos
        .clone()
        .add(earthVector.clone().multiplyScalar(0.08))
        .add(normal.clone().multiplyScalar(0.008)),
      upVector: normal.clone().normalize(),
    };
  }

  if (preset === 'orbit360') {
    return {
      camPos: surfacePos
        .clone()
        .add(normal.clone().multiplyScalar(0.65))
        .add(east.clone().multiplyScalar(0.35))
        .add(north.clone().multiplyScalar(0.25)),
      lookTarget: surfacePos.clone(),
      upVector: normal.clone().normalize(),
    };
  }

  if (preset === 'north_look') {
    return {
      camPos: surfacePos
        .clone()
        .add(normal.clone().multiplyScalar(0.03))
        .sub(north.clone().multiplyScalar(0.05)),
      lookTarget: surfacePos
        .clone()
        .add(north.clone().multiplyScalar(0.06))
        .add(normal.clone().multiplyScalar(0.006)),
      upVector: normal.clone().normalize(),
    };
  }

  if (preset === 'sunward_terminator') {
    let sunVector: THREE.Vector3;
    if (celestial) {
      sunVector = celestial.sunTangent.clone();
    } else {
      const rawSun = new THREE.Vector3(1, 0, 0.4).normalize();
      sunVector = rawSun.sub(normal.clone().multiplyScalar(rawSun.dot(normal)));
      if (sunVector.lengthSq() < 1e-6) sunVector = north.clone();
      else sunVector.normalize();
    }

    return {
      camPos: surfacePos
        .clone()
        .add(normal.clone().multiplyScalar(0.018))
        .sub(sunVector.clone().multiplyScalar(0.045)),
      lookTarget: surfacePos
        .clone()
        .add(sunVector.clone().multiplyScalar(0.075))
        .add(normal.clone().multiplyScalar(0.004)),
      upVector: normal.clone().normalize(),
    };
  }

  // 'site' preset: Candidate Overview framing surrounding crater complexes
  return {
    camPos: surfacePos
      .clone()
      .add(normal.clone().multiplyScalar(1.20))
      .add(north.clone().multiplyScalar(0.40)),
    lookTarget: surfacePos.clone(),
    upVector: normal.clone(),
  };
}
