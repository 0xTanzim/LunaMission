import * as THREE from 'three';

/**
 * Screen-space label declutter for the 3D globe.
 *
 * Scene-space distance checks cannot express what the user actually sees: two labels far
 * apart in 3D can still overlap on screen near the limb. This manager receives per-frame
 * projected screen rectangles plus a priority (selected site > sites > craters) and returns
 * visibility + pixel offsets so no two visible labels overlap (spec:
 * 3d-south-pole-observatory, collision-aware site labels).
 *
 * Deterministic: equal priorities break ties by id, so a given frame always produces the
 * same placement. Hysteresis: a label that was hidden last frame needs extra clearance to
 * reappear, which prevents visible pop-in/pop-out flicker at overlap boundaries.
 */

export interface LabelRectInput {
  /** Stable label id (site id or `crater:<name>`). */
  id: string;
  /** Higher wins the contested slot. */
  priority: number;
  /** Projected screen center, CSS pixels. */
  screenX: number;
  screenY: number;
  /** Half-extents of the label box, CSS pixels. */
  halfWidth: number;
  halfHeight: number;
}

export interface LabelPlacement {
  id: string;
  visible: boolean;
  /** Pixel offset applied to the anchor position when a direct fit lost contention. */
  offsetX: number;
  offsetY: number;
}

interface PlacedRect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Grown clearance a hidden label must clear before reappearing (flicker guard). */
const REAPPEAR_EXTRA_PADDING_PX = 4;
/** Padding kept between visible label boxes. */
const BASE_PADDING_PX = 12;

/** Vertical/horizontal escape offsets tried when the anchor position is contested. */
const ESCAPE_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0, -1],
  [0, 1],
  [1, 0],
  [-1, 0],
];

export interface LabelDeclutterOptions {
  /** Hard cap on simultaneously visible labels (before per-label visibility flags). */
  maxVisible?: number;
}

export class LabelDeclutterManager {
  private readonly previouslyVisible = new Set<string>();
  private readonly options: Required<LabelDeclutterOptions>;

  constructor(options: LabelDeclutterOptions = {}) {
    this.options = { maxVisible: options.maxVisible ?? Number.POSITIVE_INFINITY };
  }

  resolve(
    inputs: LabelRectInput[],
    overrides: { maxVisible?: number } = {},
  ): LabelPlacement[] {
    const maxVisible = overrides.maxVisible ?? this.options.maxVisible;
    const ordered = [...inputs].sort(
      (a, b) => b.priority - a.priority || (a.id < b.id ? -1 : 1),
    );

    const placed: PlacedRect[] = [];
    const placements = new Map<string, LabelPlacement>();
    let visibleCount = 0;

    for (const label of ordered) {
      if (visibleCount >= maxVisible) {
        placements.set(label.id, { id: label.id, visible: false, offsetX: 0, offsetY: 0 });
        continue;
      }

      const needsExtraClearance = !this.previouslyVisible.has(label.id);
      const padding = BASE_PADDING_PX + (needsExtraClearance ? REAPPEAR_EXTRA_PADDING_PX : 0);

      let placement: LabelPlacement | null = null;
      for (const [dx, dy] of ESCAPE_OFFSETS) {
        const offsetX = dx * (label.halfWidth + BASE_PADDING_PX);
        const offsetY = dy * (label.halfHeight + BASE_PADDING_PX);
        const rect: PlacedRect = {
          minX: label.screenX + offsetX - label.halfWidth - padding,
          minY: label.screenY + offsetY - label.halfHeight - padding,
          maxX: label.screenX + offsetX + label.halfWidth + padding,
          maxY: label.screenY + offsetY + label.halfHeight + padding,
        };
        if (!placed.some((p) => rectsOverlap(p, rect))) {
          placed.push(rect);
          visibleCount += 1;
          placement = { id: label.id, visible: true, offsetX, offsetY };
          break;
        }
      }

      placements.set(
        label.id,
        placement ?? { id: label.id, visible: false, offsetX: 0, offsetY: 0 },
      );
    }

    this.previouslyVisible.clear();
    for (const placement of placements.values()) {
      if (placement.visible) this.previouslyVisible.add(placement.id);
    }

    return inputs.map((label) => placements.get(label.id)!);
  }
}

function rectsOverlap(a: PlacedRect, b: PlacedRect): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

/**
 * World-space half-extents of the standard badge sprite (`createSiteBadge` scale
 * 0.18 × 0.045 scene units). Labels reserve their ACTUAL projected footprint — a fixed
 * pixel size would let labels overlap whenever the camera is closer or the viewport
 * smaller than the calibration view.
 */
export const BADGE_HALF_WIDTH_UNITS = 0.09;
export const BADGE_HALF_HEIGHT_UNITS = 0.0225;

export interface LabelWorldSize {
  halfWidthUnits: number;
  halfHeightUnits: number;
}

/**
 * Projects a world-space anchor to a screen-space label rect (CSS pixels, y down).
 * The rect's half-extents are the world-size label scaled by the per-label perspective
 * (viewportHeight / (2·dist·tan(fov/2)) pixels per scene unit at the anchor's depth).
 * Returns off-screen rects with the projected coordinates anyway — the caller decides
 * visibility; the manager only resolves overlaps.
 */
export function projectLabelRect(
  worldPosition: THREE.Vector3,
  camera: THREE.Camera,
  viewportWidth: number,
  viewportHeight: number,
  labelWorldSize: LabelWorldSize = {
    halfWidthUnits: BADGE_HALF_WIDTH_UNITS,
    halfHeightUnits: BADGE_HALF_HEIGHT_UNITS,
  },
): { screenX: number; screenY: number; halfWidth: number; halfHeight: number } {
  const projected = worldPosition.clone().project(camera);
  const screenX = (projected.x * 0.5 + 0.5) * viewportWidth;
  const screenY = (-projected.y * 0.5 + 0.5) * viewportHeight;

  const perspectiveCamera = camera as THREE.PerspectiveCamera;
  const distance = Math.max(1e-6, camera.position.distanceTo(worldPosition));
  const pixelsPerUnit =
    viewportHeight / (2 * distance * Math.tan((perspectiveCamera.fov * Math.PI) / 360));
  return {
    screenX,
    screenY,
    halfWidth: labelWorldSize.halfWidthUnits * pixelsPerUnit,
    halfHeight: labelWorldSize.halfHeightUnits * pixelsPerUnit,
  };
}
