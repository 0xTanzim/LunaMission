/**
 * Terrain & Ensemble Data Availability
 * Masterplan §9 acceptance gates for Milestone D (PGDA Product 78 / 104 ensembles) and the
 * landing-ellipse part of Milestone E require raster products that are not present in this
 * repository. This module states that absence explicitly in the six-state vocabulary rather
 * than leaving the capabilities silently missing or, worse, populated with plausible numbers.
 *
 * The scan is a real filesystem probe over the documented raster roots: nothing here is a
 * hardcoded "false". `classifyDataset` is a pure function so both the present and absent
 * branches are testable without fabricating a raster in the working tree.
 */

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { EvaluationStatus } from '@luna/contracts';

export type DatasetAvailabilityStatus = 'available' | 'unsupported';

/** Search roots for LOLA / PGDA raster products, relative to the workspace root. */
export const RASTER_SEARCH_ROOTS = [
  'data/rasters',
  'data/dem',
  'data/pgda',
  'data/lola',
  'data',
] as const;

export const RASTER_EXTENSIONS = ['.tif', '.tiff', '.img', '.lbl', '.jp2', '.cog', '.vrt'] as const;

const MAX_SCAN_DEPTH = 3;

export interface DatasetSpec {
  readonly datasetId: string;
  readonly productReference: string;
  readonly capability: string;
  /** Repository-relative path fragment that identifies the product family. */
  readonly pathFragment: string;
  /** Why the capability cannot be reported when the product is absent. */
  readonly absenceReason: string;
}

export interface DatasetAvailability {
  readonly datasetId: string;
  readonly productReference: string;
  readonly capability: string;
  readonly status: DatasetAvailabilityStatus;
  readonly reason: string;
  readonly resolvedPath?: string;
}

export interface DataAvailabilityReport {
  readonly status: EvaluationStatus;
  readonly capabilitySummaries: readonly DatasetAvailability[];
  readonly unsupportedCapabilities: readonly { readonly capability: string; readonly reason: string }[];
  readonly searchedRoots: readonly string[];
}

export const REQUIRED_TERRAIN_DATASETS: readonly DatasetSpec[] = [
  {
    datasetId: 'pgda-product-78-clones',
    productReference: 'NASA GSFC PGDA Product 78 — 5 m/px LOLA statistical DEM ensemble (100 clones)',
    capability: 'empirical-ensemble-percentiles',
    pathFragment: 'p78',
    absenceReason:
      'No Product 78 clone rasters are present, so empirical P05/P50/P95 elevation and slope ' +
      'distributions cannot be computed. Reporting them would require synthesising deviations.',
  },
  {
    datasetId: 'pgda-product-78-error-rasters',
    productReference: 'NASA GSFC PGDA Product 78 — elevation and slope error rasters',
    capability: 'dem-quality-model',
    pathFragment: 'p78',
    absenceReason:
      'No Product 78 error rasters are present, so the per-azimuth 1-sigma terrain-uncertainty ' +
      'margin required by masterplan § 6.2 cannot be supplied from measured data.',
  },
  {
    datasetId: 'pgda-product-104-sfs',
    productReference: 'NASA GSFC PGDA Product 104 — LROC NAC shape-from-shading 5 m/px relief',
    capability: 'optical-relief-and-ruggedness',
    pathFragment: 'p104',
    absenceReason:
      'No Product 104 shape-from-shading rasters are present, so optical relief and the Vector ' +
      'Ruggedness Measure cannot be derived.',
  },
  {
    datasetId: 'lola-ldem-85s-20m',
    productReference: 'NASA PDS LOLA LDEM_85S_20M — 20 m/px polar stereographic DEM',
    capability: 'on-demand-horizon-ray-marching',
    pathFragment: 'ldem_85s',
    absenceReason:
      'The source DEM raster is absent. Horizon geometry is served only from the precomputed ' +
      'data/curated-horizons.json product; horizons cannot be recomputed on demand.',
  },
  {
    datasetId: 'landing-ellipse-p95-slope',
    productReference: 'Area-weighted landing-ellipse dispersion sampling over the LOLA DEM',
    capability: 'landing-ellipse-p95-slope',
    pathFragment: 'ldem_',
    absenceReason:
      'The area-weighted P95 slope over a landing dispersion ellipse needs pixel-level DEM access, ' +
      'which is unavailable; only the point-slope query at the target coordinate is supported.',
  },
];

function isRasterFile(name: string): boolean {
  const lower = name.toLowerCase();
  return RASTER_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function collectRasterFiles(root: string, depth: number, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = join(root, entry);
    let isDirectory = false;
    try {
      isDirectory = statSync(full).isDirectory();
    } catch {
      continue;
    }
    if (isDirectory) {
      if (depth < MAX_SCAN_DEPTH) collectRasterFiles(full, depth + 1, out);
    } else if (isRasterFile(entry)) {
      out.push(full);
    }
  }
}

/** Every raster file found under the documented roots, relative to `workspaceRoot`. */
export function scanRasterFiles(workspaceRoot: string): string[] {
  const found: string[] = [];
  for (const root of RASTER_SEARCH_ROOTS) {
    collectRasterFiles(join(workspaceRoot, root), 1, found);
  }
  return found;
}

export function classifyDataset(spec: DatasetSpec, rasterFiles: readonly string[]): DatasetAvailability {
  const base = {
    datasetId: spec.datasetId,
    productReference: spec.productReference,
    capability: spec.capability,
  } as const;

  const match = rasterFiles.find((file) => file.toLowerCase().includes(spec.pathFragment));
  if (!match) {
    return { ...base, status: 'unsupported', reason: spec.absenceReason };
  }

  return {
    ...base,
    status: 'available',
    resolvedPath: match,
    reason: `Product raster located at ${match}.`,
  };
}

export interface DataAvailabilityOptions {
  /** Workspace root the raster probe starts from. Defaults to the process working directory. */
  readonly workspaceRoot?: string;
  /** Pre-scanned raster list; when supplied the filesystem probe is skipped. */
  readonly rasterFiles?: readonly string[];
}

export function assessTerrainDataAvailability(options: DataAvailabilityOptions = {}): DataAvailabilityReport {
  const rasterFiles = options.rasterFiles ?? scanRasterFiles(options.workspaceRoot ?? process.cwd());
  const capabilitySummaries = REQUIRED_TERRAIN_DATASETS.map((spec) => classifyDataset(spec, rasterFiles));
  const unsupportedCapabilities = capabilitySummaries
    .filter((entry) => entry.status === 'unsupported')
    .map((entry) => ({ capability: entry.capability, reason: entry.reason }));

  return {
    status: unsupportedCapabilities.length > 0 ? 'unsupported' : 'valid',
    capabilitySummaries,
    unsupportedCapabilities,
    searchedRoots: RASTER_SEARCH_ROOTS,
  };
}
