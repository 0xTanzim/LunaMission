import { describe, expect, test } from 'bun:test';
import {
  ARTEMIS_2024_CONFIRMED_REGIONS,
  ARTEMIS_2022_LEGACY_REGIONS,
  CLPS_BENCHMARK_SITES,
  WUELLER_2026_CANDIDATE_LANDING_SITES,
  getAllUnifiedCatalogSites,
  findUnifiedCatalogSite,
} from '@/domain/sites/artemisCatalog2026';

describe('Dual-Epoch Artemis & CLPS Catalog (2026)', () => {
  test('contains exactly the 9 official Artemis III candidate regions confirmed in October 2024', () => {
    expect(ARTEMIS_2024_CONFIRMED_REGIONS.length).toBe(9);
    const names = ARTEMIS_2024_CONFIRMED_REGIONS.map((s) => s.name);
    expect(names).toContain('Peak near Cabeus B');
    expect(names).toContain('Haworth');
    expect(names).toContain('Malapert Massif');
    expect(names).toContain('Mons Mouton Plateau');
    expect(names).toContain('Mons Mouton');
    expect(names).toContain('Nobile Rim 1');
    expect(names).toContain('Nobile Rim 2');
    expect(names).toContain('de Gerlache Rim 2');
    expect(names).toContain('Slater Plain');

    for (const site of ARTEMIS_2024_CONFIRMED_REGIONS) {
      expect(site.epoch).toBe('2024-confirmed');
      expect(site.coordinates.latitudeDeg).toBeLessThanOrEqual(-80.0);
      expect(site.coordinates.latitudeDeg).toBeGreaterThanOrEqual(-90.0);
      expect(site.coordinates.longitudeDeg).toBeGreaterThanOrEqual(0.0);
      expect(site.coordinates.longitudeDeg).toBeLessThan(360.0);
      expect(site.elevationMeters).toBeDefined();
    }
  });

  test('contains the 13 legacy Artemis III regions from the 2022 announcement', () => {
    expect(ARTEMIS_2022_LEGACY_REGIONS.length).toBe(13);
    for (const site of ARTEMIS_2022_LEGACY_REGIONS) {
      expect(site.epoch).toBe('2022-legacy');
      expect(site.coordinates.latitudeDeg).toBeLessThanOrEqual(-80.0);
    }
  });

  test('contains key commercial CLPS polar benchmark landing sites', () => {
    expect(CLPS_BENCHMARK_SITES.length).toBeGreaterThanOrEqual(6);
    const codes = CLPS_BENCHMARK_SITES.map((s) => s.id);
    expect(codes).toContain('clps-im1-odysseus');
    expect(codes).toContain('clps-im2-athena');
    expect(codes).toContain('clps-im4-nova-c');
    expect(codes).toContain('clps-astrobotic-griffin-1');
    expect(codes).toContain('clps-im3-reiner-gamma');
    expect(codes).toContain('clps-blue-moon-mk1');

    const im1 = CLPS_BENCHMARK_SITES.find((s) => s.id === 'clps-im1-odysseus');
    expect(im1?.coordinates.latitudeDeg).toBeCloseTo(-80.13, 2);

    const griffin = CLPS_BENCHMARK_SITES.find((s) => s.id === 'clps-astrobotic-griffin-1');
    expect(griffin?.coordinates.latitudeDeg).toBeCloseTo(-85.20, 2);
    expect(griffin?.name).toContain('Griffin');
  });

  test('eliminates client synthetic Wueller et al. (2026) candidate landing sites loop', () => {
    expect(WUELLER_2026_CANDIDATE_LANDING_SITES.length).toBe(0);
  });

  test('allows unified search and lookup by ID or alias', () => {
    const all = getAllUnifiedCatalogSites();
    expect(all.length).toBeGreaterThanOrEqual(18);

    const site = findUnifiedCatalogSite('malapert-massif');
    expect(site).toBeDefined();
    expect(site?.name).toBe('Malapert Massif');

    const griffin = findUnifiedCatalogSite('clps-astrobotic-griffin-1');
    expect(griffin).toBeDefined();
    expect(griffin?.name).toContain('Griffin');

    const missing = findUnifiedCatalogSite('non-existent-site');
    expect(missing).toBeUndefined();
  });
});
