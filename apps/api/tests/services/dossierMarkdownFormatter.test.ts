import test from 'node:test';
import assert from 'node:assert/strict';
import { synthesizeMissionDossier } from '@server/services/dossier/missionDossierModel';
import { formatDossierAsMarkdown, formatDossierAsJson } from '@server/services/dossier/dossierMarkdownFormatter';

const TEST_EPOCH = Date.parse('2026-10-21T12:00:00Z');

test('formatDossierAsMarkdown formats publication-ready aerospace briefing with all sections', () => {
  const dossier = synthesizeMissionDossier({
    targetName: 'Shackleton Connecting Ridge',
    latitudeDeg: -89.44,
    longitudeDeg: 124.5,
    elevationKm: 1.85,
    epochMs: TEST_EPOCH,
    roverDestination: {
      name: 'Shackleton Crater Floor PSR',
      latitudeDeg: -89.9,
      longitudeDeg: 0.0,
    },
  });

  const md = formatDossierAsMarkdown(dossier);

  // Assertions for critical headers & tables
  assert.ok(md.includes('# 🌔 LUNAMISSION EXECUTIVE BRIEFING'));
  assert.ok(md.includes('SHACKLETON CONNECTING RIDGE'));
  assert.ok(md.includes('## 1. Selenographic Geodesy & Reference Frame'));
  assert.ok(md.includes('## 2. Topocentric Illumination & Solar Power'));
  assert.ok(md.includes('## 3. NASA Deep Space Network (DSN) Telecom'));
  assert.ok(md.includes('## 4. Volatiles & ISRU Water-Ice Assessment'));
  assert.ok(md.includes('## 5. Surface Rover Traversal & EVA Corridor'));
  assert.ok(md.includes('## 6. Comparative Benchmark against Artemis Catalog'));
  assert.ok(md.includes('## 7. Scientific Provenance & Ephemeris Engine'));

  // Assertions for specific telemetry tokens
  assert.ok(md.includes('-89.44'));
  assert.ok(md.includes('MOON_ME_DE421'));
  assert.ok(md.includes('Free-Space Path Loss'));
  assert.ok(md.includes('Link Margin'));
  assert.ok(md.includes('Diviner Cryogenic Temp'));
  assert.ok(md.includes('Feasibility Grade'));
});

test('formatDossierAsJson serializes dossier into valid JSON with schema wrapper', () => {
  const dossier = synthesizeMissionDossier({
    targetName: 'Custom Landing Target',
    latitudeDeg: -88.0,
    longitudeDeg: 210.0,
    epochMs: TEST_EPOCH,
  });

  const jsonStr = formatDossierAsJson(dossier);
  const parsed = JSON.parse(jsonStr);

  assert.equal(parsed.schema, 'https://lunamission.spaceapps.nasa.gov/schemas/dossier-v1.json');
  assert.equal(parsed.dossier.site.name, 'Custom Landing Target');
  assert.ok(typeof parsed.dossier.illumination.sunElevationDeg === 'number');
  assert.ok(typeof parsed.dossier.telecom.linkMarginDb === 'number');
});

test('formatDossierAsMarkdown sanitizes user-supplied strings against script and entity injection (VULN-03)', () => {
  const maliciousName = '<script>alert("XSS")</script> Malicious Ridge';
  const maliciousDest = '<img src=x onerror=alert(1)> | Table Inject';

  const dossier = synthesizeMissionDossier({
    targetName: maliciousName,
    latitudeDeg: -89.44,
    longitudeDeg: 124.5,
    elevationKm: 1.85,
    epochMs: TEST_EPOCH,
  });

  dossier.traversal = {
    destinationName: maliciousDest,
    totalDistanceKm: 4.2,
    averageSlopeDeg: 6.5,
    maxSlopeDeg: 12.0,
    isTraversable: true,
    estimatedBatteryWh: 350,
    hazardLevel: 'safe',
  };

  const md = formatDossierAsMarkdown(dossier);

  // Raw HTML/script tags must NOT be present
  assert.equal(md.includes('<script>'), false, 'Markdown must not contain raw <script> tag');
  assert.equal(md.includes('</script>'), false, 'Markdown must not contain raw </script> tag');
  assert.equal(md.includes('<img'), false, 'Markdown must not contain raw <img> tag');

  // Sanitized entities must be present
  assert.ok(md.includes('&lt;script&gt;'), 'Expected &lt;script&gt; in sanitized output');
  assert.ok(md.includes('&lt;img'), 'Expected &lt;img in sanitized output');
});


