import { describe, expect, test } from 'bun:test';
import { enrichMissionDossierPhysics, type EnrichedMissionDossier } from '../dossierService';
import type { MissionDossier } from '@luna/contracts';

describe('dossierService: Physics and Geodesy Enrichment', () => {
  const mockBaseDossier: MissionDossier = {
    id: 'test-dossier-001',
    generatedAtEpochMs: 1729944000000,
    targetEpochMs: 1729944000000,
    site: {
      name: 'Site DM2 (Nobile Rim 2)',
      latitudeDeg: -84.20156,
      longitudeDeg: 60.69989,
      elevationKm: 4.0675,
      demSource: 'PGDA_5M',
      iauFrame: 'MOON_ME',
    },
    illumination: {
      sunElevationDeg: 1.45,
      sunAzimuthDeg: 210.0,
      continuousSunlightHours: 240,
      solarIncidenceAngleDeg: 88.55,
      isIlluminated: true,
      solarGrazingWarning: true,
    },
    telecom: {
      earthElevationDeg: 6.2,
      earthAzimuthDeg: 45.0,
      isEarthVisible: true,
      carrierBand: 'X-Band',
      frequencyGhz: 8.4,
      freeSpacePathLossDb: 222.5,
      linkMarginDb: 12.8,
      activeDsnStation: 'Goldstone',
      activeDsnStationCountry: 'USA',
      multipathRisk: false,
    },
    volatiles: {
      lendNeutronSuppressionScore: 88.5,
      hydrogenWeightPct: 0.085,
      divinerTempKelvin: 110.0,
      isPermanentColdTrap: false,
      waterIceYieldKgPerM3: 45.0,
      metricTonsPerHectare: 450.0,
      isruViabilityTier: 'Moderate',
    },
    provenance: {
      softwareVersion: '2.1.0',
      coordinateSystem: 'IAU2015_ME',
      lolaModel: 'LDEM_85S_10M',
      ephemerisEngine: 'Meeus-Horizons',
    },
  };

  test('enriches mission dossier with USGS 6-character ACC code', () => {
    const enriched = enrichMissionDossierPhysics(mockBaseDossier);
    expect(enriched.site.usgsAcc6).toBeDefined();
    expect(typeof enriched.site.usgsAcc6).toBe('string');
    expect(enriched.site.usgsAcc6!.length).toBe(6);
  });

  test('enriches telecom section with ITU-R P.526-16 knife-edge diffraction loss', () => {
    const enriched = enrichMissionDossierPhysics(mockBaseDossier);
    expect(enriched.telecom.diffractionLossDb).toBeDefined();
    expect(typeof enriched.telecom.diffractionLossDb).toBe('number');
    expect(enriched.telecom.diffractionLossDb).toBeGreaterThanOrEqual(0);
  });

  test('enriches decision science section with TOPSIS relative closeness and CASSA gates', () => {
    const enriched = enrichMissionDossierPhysics(mockBaseDossier);
    expect(enriched.decisionScience).toBeDefined();
    expect(enriched.decisionScience.topsisScore).toBeGreaterThan(0);
    expect(enriched.decisionScience.topsisScore).toBeLessThanOrEqual(1);
    expect(enriched.decisionScience.cassaViable).toBe(true);
  });
});
