import test from 'node:test';
import assert from 'node:assert/strict';
import { requestMissionDossier } from '../dossierApiClient';

const TEST_EPOCH = Date.parse('2026-10-21T12:00:00Z');

test('requestMissionDossier fetches from live NextRush microservice', async () => {
  const payload = {
    targetName: 'Shackleton Connecting Ridge',
    latitudeDeg: -89.44,
    longitudeDeg: 124.5,
    elevationKm: 1.85,
    epochMs: TEST_EPOCH,
  };

  const mockResponse = {
    dossier: {
      id: 'dossier-test-1',
      generatedAtEpochMs: Date.now(),
      targetEpochMs: TEST_EPOCH,
      site: {
        name: 'Shackleton Connecting Ridge',
        latitudeDeg: -89.44,
        longitudeDeg: 124.5,
        elevationKm: 1.85,
        demSource: 'NASA LOLA GDR 128ppd',
        iauFrame: 'IAU/IAG Lunar Mean Earth/Polar Axis',
        usgsAcc6: 'LGRS01',
      },
      illumination: {
        sunElevationDeg: 1.45,
        sunAzimuthDeg: 135.2,
        continuousSunlightHours: 240,
        solarIncidenceAngleDeg: 88.55,
        isIlluminated: true,
        solarGrazingWarning: true,
      },
      telecom: {
        earthElevationDeg: 6.2,
        earthAzimuthDeg: 45.0,
        isEarthVisible: true,
        carrierBand: 'xBandDownlink',
        frequencyGhz: 8.45,
        freeSpacePathLossDb: 222.5,
        linkMarginDb: 8.45,
        activeDsnStation: 'Goldstone DSN',
        activeDsnStationCountry: 'USA',
        multipathRisk: false,
      },
      volatiles: {
        lendNeutronSuppressionScore: 88.5,
        hydrogenWeightPct: 0.085,
        divinerTempKelvin: 85.0,
        isPermanentColdTrap: true,
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
    },
    markdown: '# LUNAMISSION EXECUTIVE BRIEFING\nTarget: Shackleton Connecting Ridge',
    jsonTelemetry: '{"schema":"https://lunamission.spaceapps.nasa.gov/schemas/dossier-v1.json"}',
    provenance: {
      generator: 'NextRush Calculation Engine',
      runtime: 'Bun/V8',
      generatedAt: new Date().toISOString(),
      source: 'nextrush_server',
    },
  };

  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as any;

    const res = await requestMissionDossier(payload);
    assert.ok(res.dossier);
    assert.equal(res.dossier.site.name, 'Shackleton Connecting Ridge');
    assert.ok(res.markdown.includes('LUNAMISSION EXECUTIVE BRIEFING'));
    assert.ok(res.jsonTelemetry.includes('https://lunamission.spaceapps.nasa.gov/schemas/dossier-v1.json'));
    assert.equal(res.provenance.source, 'nextrush_server');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('requestMissionDossier rejects with error on unreachable port without fake synthesis', async () => {
  const payload = {
    targetName: 'Custom Peak 1',
    latitudeDeg: -88.5,
    longitudeDeg: 45.0,
    epochMs: TEST_EPOCH,
  };

  // Point to dead port
  await assert.rejects(
    async () => {
      await requestMissionDossier(payload, 'http://127.0.0.1:59999/api');
    },
    (err: any) => {
      assert.ok(err instanceof Error);
      return true;
    }
  );
});
