import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { CameraPreset } from '@/features/spatial/model/spatialPreferences';

const TRANSITION_PROGRESS_STEP = 0.055;

export interface CameraPose {
  camPos: THREE.Vector3;
  lookTarget: THREE.Vector3;
  upVector: THREE.Vector3;
}

export interface CameraTransitioner {
  moveTo: (preset: CameraPreset, site: CandidateSite) => void;
  cancel: () => void;
  isTransitioning: () => boolean;
  /** Advances an in-flight transition; idles at zero cost between preset changes. */
  step: (camera: THREE.PerspectiveCamera, controls: OrbitControls) => void;
}

interface ActiveTransition {
  startCamPos: THREE.Vector3;
  startLookTarget: THREE.Vector3;
  startUp: THREE.Vector3;
  endCamPos: THREE.Vector3;
  endLookTarget: THREE.Vector3;
  endUp: THREE.Vector3;
  progress: number;
}

/**
 * Spherical linear interpolation between two unit vectors.
 */
function slerpUnitVectors(v0: THREE.Vector3, v1: THREE.Vector3, t: number): THREE.Vector3 {
  const dot = Math.max(-1, Math.min(1, v0.dot(v1)));
  if (dot > 0.99999) return v0.clone();
  if (dot < -0.99999) {
    const axis = new THREE.Vector3(0, 1, 0).cross(v0);
    if (axis.lengthSq() < 1e-4) axis.set(1, 0, 0).cross(v0);
    return v0.clone().applyAxisAngle(axis.normalize(), Math.PI * t);
  }
  const omega = Math.acos(dot);
  const sinOmega = Math.sin(omega);
  return v0
    .clone()
    .multiplyScalar(Math.sin((1 - t) * omega) / sinOmega)
    .add(v1.clone().multiplyScalar(Math.sin(t * omega) / sinOmega))
    .normalize();
}

/**
 * Geodesic Great-Circle spherical interpolation with altitude arc:
 * camPos(t) = Slerp(camPos_0, camPos_1, t) * AltitudeArc(t)
 */
function interpolateCameraPosition(p0: THREE.Vector3, p1: THREE.Vector3, t: number): THREE.Vector3 {
  const r0 = p0.length();
  const r1 = p1.length();
  const u0 = p0.clone().divideScalar(r0 || 1);
  const u1 = p1.clone().divideScalar(r1 || 1);
  const u = slerpUnitVectors(u0, u1, t);

  const omega = Math.acos(Math.max(-1, Math.min(1, u0.dot(u1))));
  const isLowAltitude = r0 < 2.5 && r1 < 2.5;
  const arcBoost = isLowAltitude ? Math.min(0.25, 0.35 * omega) * Math.sin(Math.PI * t) : 0;
  return u.multiplyScalar((1 - t) * r0 + t * r1 + arcBoost);
}

/**
 * Spherically interpolates look target on the lunar surface if both endpoints are surface-anchored,
 * preventing target from dipping into the interior (targetLen >= R_MOON).
 */
function interpolateLookTarget(t0: THREE.Vector3, t1: THREE.Vector3, t: number): THREE.Vector3 {
  const len0 = t0.length();
  const len1 = t1.length();
  if (len0 >= 1.0 && len1 >= 1.0) {
    const u0 = t0.clone().divideScalar(len0);
    const u1 = t1.clone().divideScalar(len1);
    const u = slerpUnitVectors(u0, u1, t);
    return u.multiplyScalar((1 - t) * len0 + t * len1);
  }
  return new THREE.Vector3().lerpVectors(t0, t1, t);
}

/**
 * Creates an interruptible camera transitioner between presets.
 */
export function createCameraTransitionerWithResolver(
  poseResolver: (preset: CameraPreset, site: CandidateSite) => CameraPose,
  options?: { /** Reduced motion (task 3.5): snap to the end pose instead of easing. */
    instant?: () => boolean },
): CameraTransitioner {
  let pendingEndPose: CameraPose | null = null;
  let activeTransition: ActiveTransition | null = null;

  return {
    moveTo: (preset, site) => {
      pendingEndPose = poseResolver(preset, site);
      activeTransition = null;
    },
    cancel: () => {
      pendingEndPose = null;
      activeTransition = null;
    },
    isTransitioning: () => pendingEndPose !== null || activeTransition !== null,
    step: (camera, controls) => {
      if (!pendingEndPose && !activeTransition) return;

      if (!activeTransition && pendingEndPose) {
        // Reduced motion: snap straight to the end pose, no eased intermediate frames.
        if (options?.instant?.()) {
          const end = pendingEndPose;
          pendingEndPose = null;
          camera.position.copy(end.camPos);
          controls.target.copy(end.lookTarget);
          camera.up.copy(end.upVector).normalize();
          camera.lookAt(controls.target);
          if (typeof controls.update === 'function') controls.update();
          return;
        }
        activeTransition = {
          startCamPos: camera.position.clone(),
          startLookTarget: controls.target.clone(),
          startUp: camera.up.clone().normalize(),
          endCamPos: pendingEndPose.camPos.clone(),
          endLookTarget: pendingEndPose.lookTarget.clone(),
          endUp: pendingEndPose.upVector.clone().normalize(),
          progress: 0,
        };
        pendingEndPose = null;
      }
      if (!activeTransition) return;

      activeTransition.progress = Math.min(1.0, activeTransition.progress + TRANSITION_PROGRESS_STEP);
      const t = activeTransition.progress;
      // Smoothstep easing: 3t^2 - 2t^3
      const easeT = t * t * (3 - 2 * t);

      const nextCamPos = interpolateCameraPosition(activeTransition.startCamPos, activeTransition.endCamPos, easeT);
      const nextLookTarget = interpolateLookTarget(activeTransition.startLookTarget, activeTransition.endLookTarget, easeT);
      const nextUpVector = slerpUnitVectors(activeTransition.startUp, activeTransition.endUp, easeT);

      camera.position.copy(nextCamPos);
      controls.target.copy(nextLookTarget);
      camera.up.copy(nextUpVector);
      camera.lookAt(controls.target);

      if (t >= 1.0) {
        camera.position.copy(activeTransition.endCamPos);
        controls.target.copy(activeTransition.endLookTarget);
        camera.up.copy(activeTransition.endUp).normalize();
        camera.lookAt(controls.target);
        if (typeof controls.update === 'function') {
          controls.update();
        }
        activeTransition = null;
      }
    },
  };
}
