import { describe, expect, it } from 'bun:test';
import { createHandler } from '@nextrush/adapter-bun';
import { createServerApp } from '@server/app';
import {
  REQUIRED_TERRAIN_DATASETS,
  RASTER_SEARCH_ROOTS,
  assessTerrainDataAvailability,
  classifyDataset,
  type DatasetSpec,
} from '../../src/services/terrain/dataAvailability';

const cloneEnsemble: DatasetSpec = REQUIRED_TERRAIN_DATASETS.find(
  (spec) => spec.capability === 'empirical-ensemble-percentiles',
)!;

describe('Terrain data availability guard', () => {
  it('marks every raster-backed capability unsupported with an explicit reason', () => {
    const report = assessTerrainDataAvailability();

    expect(report.status).toBe('unsupported');
    expect(report.capabilitySummaries.length).toBe(REQUIRED_TERRAIN_DATASETS.length);
    expect(report.unsupportedCapabilities.length).toBe(REQUIRED_TERRAIN_DATASETS.length);

    for (const entry of report.capabilitySummaries) {
      expect(entry.status).toBe('unsupported');
      expect(entry.reason.length).toBeGreaterThan(40);
      expect(entry.resolvedPath).toBeUndefined();
    }
  });

  it('names the milestones it blocks and the authoritative products it would need', () => {
    const report = assessTerrainDataAvailability();
    const capabilities = report.unsupportedCapabilities.map((entry) => entry.capability);

    expect(capabilities).toContain('empirical-ensemble-percentiles');
    expect(capabilities).toContain('dem-quality-model');
    expect(capabilities).toContain('optical-relief-and-ruggedness');
    expect(capabilities).toContain('landing-ellipse-p95-slope');

    const ensemble = report.capabilitySummaries.find(
      (entry) => entry.capability === 'empirical-ensemble-percentiles',
    )!;
    expect(ensemble.productReference).toContain('Product 78');
    expect(ensemble.reason).toContain('P05/P50/P95');
  });

  it('carries no numeric uncertainty metric of any kind', () => {
    const report = assessTerrainDataAvailability();
    const serialised = JSON.stringify(report);

    for (const forbidden of ['"p05"', '"p50"', '"p95"', '"median"', '"percentile"', '"slopeDeg"', '"sigma"']) {
      expect(serialised).not.toContain(forbidden);
    }
    expect(report).not.toHaveProperty('metrics');
    expect(report).not.toHaveProperty('percentiles');
  });

  it('documents the searched raster roots so the absence is auditable', () => {
    const report = assessTerrainDataAvailability();
    expect(report.searchedRoots).toEqual([...RASTER_SEARCH_ROOTS]);
    expect(report.searchedRoots).toContain('data');
  });

  it('reports a product as available when the probe really finds its raster', () => {
    const available = classifyDataset(cloneEnsemble, ['data/pgda/P78_clone_042_5m.tif']);
    expect(available.status).toBe('available');
    expect(available.resolvedPath).toBe('data/pgda/P78_clone_042_5m.tif');
    expect(available.reason).toContain('P78_clone_042_5m.tif');
  });

  it('stays unsupported for a product family that the probe did not find', () => {
    const absent = classifyDataset(cloneEnsemble, ['data/pgda/P104_sfs_5m.tif']);
    expect(absent.status).toBe('unsupported');
    expect(absent.reason).toBe(cloneEnsemble.absenceReason);
  });

  it('promotes the report to valid only when every required product is located', () => {
    const present = [
      'data/pgda/P78_clone_042_5m.tif',
      'data/pgda/P78_slope_error_5m.tif',
      'data/pgda/P104_sfs_5m.tif',
      'data/lola/LDEM_85S_20M.tif',
    ];
    const report = assessTerrainDataAvailability({ rasterFiles: present });

    expect(report.status).toBe('valid');
    expect(report.unsupportedCapabilities.length).toBe(0);
    expect(report.capabilitySummaries.every((entry) => entry.status === 'available')).toBe(true);
  });

  it('reports the live repository as unsupported', () => {
    expect(assessTerrainDataAvailability().status).toBe('unsupported');
  });
});

describe('GET /api/terrain/data-availability', () => {
  const dispatch = async (path: string) => {
    const rawHandler = createHandler(createServerApp());
    const res = await (rawHandler as unknown as (req: Request, ctx: unknown) => Promise<Response>)(
      new Request(`http://localhost:3001${path}`, { method: 'GET' }),
      {},
    );
    return { status: res.status, data: (await res.json()) as Record<string, unknown> };
  };

  it('serves the availability report with an unsupported status over HTTP', async () => {
    const { status, data } = await dispatch('/api/terrain/data-availability');

    expect(status).toBe(200);
    expect(data.status).toBe('unsupported');
    expect(Array.isArray(data.unsupportedCapabilities)).toBe(true);
    expect((data.unsupportedCapabilities as unknown[]).length).toBeGreaterThan(0);
    expect(Array.isArray(data.capabilitySummaries)).toBe(true);
  });
});
