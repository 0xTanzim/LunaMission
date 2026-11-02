/**
 * The map's layer stack: exactly one base layer painted over the polar disc, plus
 * overlays that composite on top of it independently.
 *
 * Before this model the map carried one exclusive enum (`scientificMapMode`), so
 * "topography with the graticule and the Sun vector" and "slope" were the same kind of
 * choice and could not be combined. Here the base answers *which quantity is painted*
 * and the overlays answer *what reference geometry is drawn over it*.
 *
 * Two rules this file exists to enforce:
 *
 * 1. **One base, always present.** A base layer is a measurement of the surface; it is
 *    never replaced by an overlay, and no overlay paints terrain colour.
 * 2. **An incompatible combination is refused out loud.** `composeMapLayers` returns the
 *    overlays it could not paint next to the reason, so the layer panel and the legend
 *    can both say why rather than dropping the toggle silently.
 *
 * The paint order below is the only place layer ordering is decided; the SVG renderer
 * draws the arrays it is given.
 */

/**
 * The quantity painted across the whole sheet. Exactly one is active.
 *
 * Named `ScientificMapLayerMode` because the map raster, the globe surface material and
 * the legend selector all speak that name; the model below is what makes it a *base*
 * layer rather than the only layer.
 */
export type ScientificMapLayerMode =
  | 'none'
  | 'topography'
  | 'hillshade'
  | 'slope'
  | 'geology'
  | 'illumination'
  | 'volatiles'
  | 'temperature';

export type MapBaseLayerId = ScientificMapLayerMode;

/**
 * Reference geometry drawn over the base. `laserTracks` is the LOLA altimeter ground
 * track, which exists in the 3D globe scene only — see `MAP_3D_ONLY_OVERLAYS`.
 */
export type MapOverlayId =
  | 'contours'
  | 'grid'
  | 'craters'
  | 'psr'
  | 'vectors'
  | 'candidatePins'
  | 'laserTracks';

/** CSS `mix-blend-mode` values that mean something for a data layer. */
export type LayerBlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light';

export interface LayerRenderState {
  visible: boolean;
  /** 0–1. Applied as element opacity, so a half-strength layer still reads correctly. */
  opacity: number;
  blendMode: LayerBlendMode;
}

export type OverlayLayerState = Record<MapOverlayId, LayerRenderState>;

/** A base layer cannot be hidden — only toned down, so the disc is never blank. */
export interface BaseLayerState {
  id: MapBaseLayerId;
  opacity: number;
  blendMode: LayerBlendMode;
}

export interface BaseLayerSpec {
  readonly id: MapBaseLayerId;
  readonly label: string;
  /** The quantity the ramp encodes. Never a product name alone. */
  readonly quantity: string;
  readonly unit: string;
  readonly instrument: string;
}

/**
 * Base layers, in menu order: the two relief layers first (they are what an operator
 * reads terrain from), then the hazard and composition products.
 */
export const MAP_BASE_LAYERS: readonly BaseLayerSpec[] = [
  {
    id: 'topography',
    label: 'Topography',
    quantity: 'Surface elevation',
    unit: 'm relative to R = 1737.4 km',
    instrument: 'LRO LOLA 128 ppd DEM',
  },
  {
    id: 'hillshade',
    label: 'Analytical Hillshade',
    quantity: 'Analytical shaded relief (fixed artificial sun)',
    unit: 'unitless relief shading, 0–1',
    instrument: 'Fixed analytical sun: elev 1.5°, azimuth 45° — not lunar illumination',
  },
  {
    id: 'slope',
    label: 'Slope',
    quantity: 'Altimetric slope gradient',
    unit: 'degrees from horizontal',
    instrument: 'LOLA GDR baseline gradient',
  },
  {
    id: 'geology',
    label: 'Geology',
    quantity: 'Stratigraphic unit',
    unit: 'chrono-sequence code',
    instrument: 'LPI Lunar South Pole Atlas',
  },
  {
    id: 'illumination',
    label: 'Illumination (model)',
    quantity: 'Annual illumination — static analytic model, not time-dependent',
    unit: 'percent of the year (modelled)',
    instrument: 'Analytic polar illumination model (static classes); an observed LOLA/WAC climatology would supersede it',
  },
  {
    id: 'volatiles',
    label: 'Volatiles',
    quantity: 'Water-equivalent hydrogen',
    unit: 'weight percent',
    instrument: 'LRO LEND neutron suppression',
  },
  {
    id: 'temperature',
    label: 'Temperature',
    quantity: 'Maximum surface temperature',
    unit: 'kelvin',
    instrument: 'LRO Diviner DLRE',
  },
  {
    id: 'none',
    label: 'Natural (no terrain ramp)',
    quantity: 'Documented regolith ground tone — not a per-sample measurement',
    unit: 'unitless ground tone',
    instrument: 'Procedural regolith substitute (no LROC polar albedo mosaic ingested)',
  },
];

export interface OverlayLayerSpec {
  readonly id: MapOverlayId;
  readonly label: string;
  /** What the overlay adds, in the operator's terms. */
  readonly purpose: string;
}

export const MAP_OVERLAYS: readonly OverlayLayerSpec[] = [
  {
    id: 'contours',
    label: 'Elevation contours',
    purpose: '1 km isolines with 2 km index lines at the same elevation datum as the base ramp.',
  },
  {
    id: 'grid',
    label: 'Graticule',
    purpose: '84°S–88°S latitude rings and 90° meridian spokes in IAU MOON_ME.',
  },
  {
    id: 'craters',
    label: 'Crater rims',
    purpose: 'Named crater rim footprints with progressive labels.',
  },
  {
    id: 'psr',
    label: 'Shadowed regions (PSR)',
    purpose: 'Hatched permanently shadowed terrain — never a temperature or illumination value.',
  },
  {
    id: 'vectors',
    label: 'Sun / Earth vectors',
    purpose: 'Topocentric Sun and geometric Earth line-of-sight bearings from the active site.',
  },
  {
    id: 'candidatePins',
    label: 'Candidate pins',
    purpose: 'Published candidate sites, with the compared and selected states.',
  },
  {
    id: 'laserTracks',
    label: 'LOLA laser tracks',
    purpose: 'Altimeter ground tracks, drawn in the 3D globe scene.',
  },
];

/**
 * Paint order, bottom → top, for the 2D sheet. Terrain first, then the reference
 * geometry that explains it, then the point markers that must never be occluded by
 * anything (a pin the operator cannot click is worse than a hidden contour).
 */
export const MAP_LAYER_PAINT_ORDER: readonly MapOverlayId[] = [
  'contours',
  'grid',
  'craters',
  'psr',
  'vectors',
  'candidatePins',
];

/** Overlays the 2D sheet does not draw. Listed here so the omission is deliberate. */
export const MAP_3D_ONLY_OVERLAYS: readonly MapOverlayId[] = ['laserTracks'];

const OVERLAY_SPEC_BY_ID = new Map(MAP_OVERLAYS.map((spec) => [spec.id, spec]));

export function overlaySpec(id: MapOverlayId): OverlayLayerSpec {
  const spec = OVERLAY_SPEC_BY_ID.get(id);
  if (spec === undefined) throw new Error(`Unknown map overlay: ${id}`);
  return spec;
}

export function baseLayerSpec(id: MapBaseLayerId): BaseLayerSpec {
  const spec = MAP_BASE_LAYERS.find((layer) => layer.id === id);
  if (spec === undefined) throw new Error(`Unknown base layer: ${id}`);
  return spec;
}

export const DEFAULT_BASE_LAYER: BaseLayerState = {
  // Natural LROC albedo: the Moon opens looking like the Moon. Hypsometric false color
  // is an explicit analytical mode, not the resting state (task 2.8).
  id: 'none',
  opacity: 1,
  blendMode: 'normal',
};

function visibleLayer(opacity = 1): LayerRenderState {
  return { visible: true, opacity, blendMode: 'normal' };
}

function hiddenLayer(): LayerRenderState {
  return { visible: false, opacity: 1, blendMode: 'normal' };
}

/** Opening stack: every reference overlay on, each at full strength. The laser-track fan
 *  ships disabled — as a converging polar sunburst it must be an explicit analytical mode. */
export const DEFAULT_OVERLAY_LAYERS: OverlayLayerState = {
  contours: visibleLayer(),
  grid: visibleLayer(0.9),
  craters: visibleLayer(),
  psr: visibleLayer(),
  vectors: visibleLayer(),
  candidatePins: visibleLayer(),
  laserTracks: hiddenLayer(),
};

export const LAYER_BLEND_MODES: readonly LayerBlendMode[] = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'soft-light',
];

export interface OverlayCompatibility {
  /** False when the overlay would double-encode the base layer's own quantity. */
  enabled: boolean;
  /** Why the combination is refused. Present only when `enabled` is false. */
  reason?: string;
}

const CONTOUR_BASES: readonly MapBaseLayerId[] = ['topography', 'hillshade', 'slope'];

/**
 * Which overlays are meaningful over which base.
 *
 * The rule is narrow on purpose: an overlay is refused only when it would encode a
 * quantity the base is already encoding, which is how two ramps end up on one pixel and
 * the picture starts lying. Anything the operator can legitimately read together stays
 * available.
 */
export function resolveOverlayCompatibility(
  base: MapBaseLayerId,
  overlay: MapOverlayId,
): OverlayCompatibility {
  if (overlay === 'contours' && !CONTOUR_BASES.includes(base)) {
    return {
      enabled: false,
      reason: `Elevation contours repeat the topography; over the ${baseLayerSpec(base).label.toLowerCase()} base they would draw a second, unrelated quantity on the same pixels.`,
    };
  }

  if (overlay === 'psr' && base === 'illumination') {
    return {
      enabled: false,
      reason:
        'The illumination base already paints the permanently shadowed field; the hatch would double-encode it.',
    };
  }

  if (overlay === 'psr' && base === 'geology') {
    return {
      enabled: false,
      reason:
        'The geology base paints permanently shadowed terrain as its own cold-trap unit; the hatch would conflict with it.',
    };
  }

  return { enabled: true };
}

export interface PaintedLayer {
  readonly id: MapOverlayId;
  readonly label: string;
  readonly state: LayerRenderState;
}

export interface SuppressedLayer {
  readonly id: MapOverlayId;
  readonly label: string;
  readonly reason: string;
}

export interface LayerComposition {
  readonly base: BaseLayerState;
  /** Switched on, compatible, and therefore drawn — bottom → top. */
  readonly painted: readonly PaintedLayer[];
  /** Switched on but refused, with the reason both surfaces must show. */
  readonly suppressed: readonly SuppressedLayer[];
}

/**
 * Resolve what is actually drawn. `painted` is ordered; `suppressed` carries the reason
 * so the legend and the layer panel cannot disagree about it.
 */
export function composeMapLayers(
  base: BaseLayerState,
  overlays: OverlayLayerState,
  order: readonly MapOverlayId[] = MAP_LAYER_PAINT_ORDER,
): LayerComposition {
  const painted: PaintedLayer[] = [];
  const suppressed: SuppressedLayer[] = [];

  for (const id of order) {
    const state = overlays[id];
    if (state === undefined || !state.visible) continue;
    const label = overlaySpec(id).label;
    const compatibility = resolveOverlayCompatibility(base.id, id);
    if (!compatibility.enabled) {
      suppressed.push({ id, label, reason: compatibility.reason ?? 'Not available over this base layer.' });
      continue;
    }
    painted.push({ id, label, state });
  }

  return { base, painted, suppressed };
}

/** The opacity actually applied to a painted layer, clamped to a usable range. */
export function layerOpacity(state: LayerRenderState): number {
  return Math.min(1, Math.max(0, state.opacity));
}
