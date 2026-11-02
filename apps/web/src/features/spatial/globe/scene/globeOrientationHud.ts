import * as THREE from 'three';
import { MOON_SCENE_RADIUS } from '@/features/spatial/globe/scene/globeScene';

/**
 * Orientation aids for the polar observatory (SP-3 compass, SP-9 scale bar).
 *
 * All math lives here in the scene layer; the DOM is written imperatively from the
 * animator's frame loop so no React state participates in per-frame updates. The
 * compass heading is the screen angle of the local-north tangent at the viewed surface
 * point, measured clockwise from screen-up — so with the prime-meridian north held up
 * (the nadir preset) the rose reads 0° and a user orbit drag turns it live.
 */

export const METERS_PER_SCENE_UNIT = 1_737_400 / MOON_SCENE_RADIUS;

const POLE_SINGULARITY_SIN_LAT = 0.99996; // within ~0.5° of the pole
const POLE_NUDGE_RAD = (0.5 * Math.PI) / 180;
const NORTH_PROBE_UNITS = 0.1;

/**
 * Compass heading in degrees clockwise from screen-up ([0, 360)), from the projected
 * local-north tangent at the viewed surface point. Near the exact pole the tangent
 * degenerates, so the point is nudged toward the camera's horizontal offset first.
 * Screen-space angles are aspect-corrected: NDC x spans the full width.
 */
export function computeCompassHeadingDeg(
  camera: THREE.Camera,
  surfaceTarget: THREE.Vector3,
): number {
  if (surfaceTarget.lengthSq() < 1e-12) return 0;

  const point = surfaceTarget.clone().normalize().multiplyScalar(MOON_SCENE_RADIUS);
  const sinLat = point.y / MOON_SCENE_RADIUS;
  if (Math.abs(sinLat) > POLE_SINGULARITY_SIN_LAT) {
    const away = camera.position.clone().sub(point);
    away.y = 0;
    if (away.lengthSq() < 1e-12) away.set(0, 0, 1);
    away.normalize();
    const nudged = point
      .clone()
      .normalize()
      .multiplyScalar(Math.cos(POLE_NUDGE_RAD))
      .addScaledVector(away, Math.sin(POLE_NUDGE_RAD));
    point.copy(nudged.multiplyScalar(MOON_SCENE_RADIUS));
  }

  const normal = point.clone().normalize();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const north = worldUp.clone().addScaledVector(normal, -worldUp.dot(normal));
  if (north.lengthSq() < 1e-12) return 0;
  north.normalize();

  const base = projectToNdc(point, camera);
  const tip = projectToNdc(point.clone().addScaledVector(north, NORTH_PROBE_UNITS), camera);
  const aspect = (camera as THREE.PerspectiveCamera).aspect ?? 1;
  const dx = (tip.x - base.x) * aspect; // pixel-space direction, y up
  const dyUp = tip.y - base.y;
  if (Math.abs(dx) < 1e-9 && Math.abs(dyUp) < 1e-9) return 0;

  const heading = (Math.atan2(dx, dyUp) * 180) / Math.PI;
  return heading < 0 ? heading + 360 : heading;
}

export function computeGroundMetersPerPixel(
  camera: THREE.PerspectiveCamera,
  viewportHeightPx: number,
  distanceToSurfaceUnits: number,
): number {
  const sceneUnitsPerPixel =
    (2 * distanceToSurfaceUnits * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(1, viewportHeightPx);
  return sceneUnitsPerPixel * METERS_PER_SCENE_UNIT;
}

const SCALE_BAR_MIN_PX = 60;
const SCALE_BAR_MAX_PX = 160;

/** Picks a 1-2-5 nice-value bar whose on-screen width lands in the readable band. */
export function pickScaleBarMeters(
  metersPerPixel: number,
): { meters: number; pixels: number } | null {
  if (!(metersPerPixel > 0)) return null;
  for (let decade = -3; decade <= 8; decade++) {
    for (const mantissa of [1, 2, 5]) {
      const meters = mantissa * 10 ** decade;
      const pixels = meters / metersPerPixel;
      if (pixels >= SCALE_BAR_MIN_PX && pixels <= SCALE_BAR_MAX_PX) {
        return { meters, pixels };
      }
    }
  }
  return null;
}

export interface OrientationHudElements {
  compassRose: { style: { transform: string }; setAriaLabel: (label: string) => void };
  scaleBarLine: { style: { width: string } };
  scaleBarLabel: { textContent: string | null };
  scaleBarRegion: { setAriaLabel: (label: string) => void };
}

export function formatScaleBarLabel(meters: number): string {
  if (meters >= 1000) return `${meters / 1000} km`;
  return `${meters} m`;
}

export function updateOrientationHudElements(
  hud: OrientationHudElements,
  values: { headingDeg: number; scaleMeters: number; scalePixels: number },
): void {
  hud.compassRose.style.transform = `rotate(${values.headingDeg}deg)`;
  hud.compassRose.setAriaLabel(
    `Compass rose: lunar north is ${Math.round(values.headingDeg)}° clockwise from screen up`,
  );
  hud.scaleBarLine.style.width = `${Math.round(values.scalePixels)}px`;
  hud.scaleBarLabel.textContent = formatScaleBarLabel(values.scaleMeters);
  hud.scaleBarRegion.setAriaLabel(
    `Scale bar: ${formatScaleBarLabel(values.scaleMeters)} spans ${Math.round(values.scalePixels)} pixels at the current zoom`,
  );
}

export interface OrientationHudController {
  update(camera: THREE.PerspectiveCamera, surfaceTarget: THREE.Vector3, viewportHeightPx: number): void;
  dispose(): void;
}

/**
 * Builds the compass rose + ground-distance scale bar DOM and returns a controller the
 * animator calls once per frame. DOM creation is thin; the update logic is covered by
 * `updateOrientationHudElements` tests against plain objects.
 */
export function attachOrientationHud(container: HTMLElement): OrientationHudController {
  const doc = container.ownerDocument;
  const root = doc.createElement('div');
  // bottom-12 clears the celestial-vector legend row that owns the bottom-left corner.
  root.className =
    'pointer-events-none absolute bottom-12 left-3 z-10 flex items-end gap-4 select-none';

  const compass = doc.createElement('div');
  compass.setAttribute('role', 'img');
  compass.className =
    'relative h-16 w-16 rounded-full border border-[var(--lm-color-border)] bg-[var(--lm-color-surface)]/80 backdrop-blur-xs';
  const rose = doc.createElement('div');
  rose.className = 'absolute inset-0';
  rose.innerHTML =
    '<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">' +
    '<polygon points="32,8 36,32 32,30 28,32" style="fill:var(--lm-color-selected-site)"/>' +
    '<polygon points="32,56 36,32 32,34 28,32" style="fill:var(--lm-color-text-muted)"/>' +
    '<text x="32" y="9" text-anchor="middle" font-size="9" style="fill:var(--lm-color-text-primary)" font-family="monospace">N</text>' +
    '</svg>';
  compass.appendChild(rose);

  const scale = doc.createElement('div');
  scale.setAttribute('role', 'img');
  scale.className = 'flex flex-col items-start gap-1';
  const scaleBarLine = doc.createElement('div');
  scaleBarLine.className =
    'h-1.5 border-x-2 border-b-2 border-[var(--lm-color-text-secondary)] bg-transparent';
  const scaleBarLabel = doc.createElement('span');
  scaleBarLabel.className = 'text-[11px] font-mono text-[var(--lm-color-text-primary)]';
  scale.appendChild(scaleBarLine);
  scale.appendChild(scaleBarLabel);

  root.appendChild(compass);
  root.appendChild(scale);
  container.appendChild(root);

  const hud: OrientationHudElements = {
    compassRose: {
      style: rose.style,
      setAriaLabel: (label) => compass.setAttribute('aria-label', label),
    },
    scaleBarLine: { style: scaleBarLine.style },
    scaleBarLabel: {
      get textContent() {
        return scaleBarLabel.textContent;
      },
      set textContent(value: string | null) {
        scaleBarLabel.textContent = value ?? '';
      },
    },
    scaleBarRegion: {
      setAriaLabel: (label) => scale.setAttribute('aria-label', label),
    },
  };

  return {
    update(camera, surfaceTarget, viewportHeightPx) {
      const headingDeg = computeCompassHeadingDeg(camera, surfaceTarget);
      const distance = camera.position.distanceTo(surfaceTarget);
      const metersPerPixel = computeGroundMetersPerPixel(camera, viewportHeightPx, distance);
      const bar = pickScaleBarMeters(metersPerPixel) ?? { meters: 1000, pixels: 0 };
      updateOrientationHudElements(hud, {
        headingDeg,
        scaleMeters: bar.meters,
        scalePixels: bar.pixels,
      });
    },
    dispose() {
      root.remove();
    },
  };
}

function projectToNdc(worldPoint: THREE.Vector3, camera: THREE.Camera): { x: number; y: number } {
  const projected = worldPoint.clone().project(camera);
  return { x: projected.x, y: projected.y }; // NDC, y up
}
