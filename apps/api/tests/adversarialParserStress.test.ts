import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDsnXml } from '../src/services/dsnXmlParser';
import { dsnTelemetryResponseSchema } from '../src/schemas/telemetrySchemas';
import { dsnIngestionService } from '../src/services/dsnIngestionService';

// Base authentic DSN XML fixture for fuzzing
const AUTHENTIC_DSN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<dsn>
  <station name="gdscc" friendlyName="Goldstone" timeUTC="1793155449000" timeZoneOffset="-25200000.0"/>
  <dish name="DSS24" azimuthAngle="0.0" elevationAngle="90.0" windSpeed="" isMSPA="false" isArray="false" isDDOR="false" activity="Spacecraft Telemetry, Tracking, and Command">
    <downSignal active="false" signalType="none" dataRate="0" frequency="0" band="X" power="-180" spacecraft="VGR1" spacecraftID="-31"/>
    <target name="VGR1" id="31" uplegRange="25800000000" downlegRange="25800000000" rtlt="-1"/>
  </dish>
  <station name="mdscc" friendlyName="Madrid" timeUTC="1793155449000" timeZoneOffset="3600000.0"/>
  <dish name="DSS53" azimuthAngle="225.5" elevationAngle="70.1" windSpeed="4.2" isMSPA="false" isArray="false" isDDOR="false" activity="Spacecraft Telemetry, Tracking, and Command">
    <upSignal active="true" signalType="data" dataRate="0" frequency="2110000000" band="S" power="0.2" spacecraft="KPLO" spacecraftID="-155"/>
    <downSignal active="true" signalType="data" dataRate="8192" frequency="2290000000" band="S" power="-120" spacecraft="KPLO" spacecraftID="-155"/>
    <target name="KPLO" id="155" uplegRange="358000" downlegRange="358000" rtlt="2.4"/>
  </dish>
  <timestamp>1793155449000</timestamp>
</dsn>`;

// ============================================================================
// Task 1: XML Parser Adversarial Fuzzing & Resilience
// ============================================================================

test('XML Parser Fuzzing: gracefully handles empty, whitespace, and non-XML strings', () => {
  const edgeInputs = [
    '',
    '    ',
    '\n\t\r\n',
    'Plain text without tags',
    '{"jsonKey": "notXml"}',
    '<',
    '<<>>',
    '<<<<<<>>>>>>',
    'null',
    'undefined',
  ];

  for (const input of edgeInputs) {
    const snapshot = parseDsnXml(input);
    assert.ok(snapshot !== null && typeof snapshot === 'object');
    assert.ok(Array.isArray(snapshot.stations));
    assert.equal(snapshot.stations.length, 0);
    assert.ok(typeof snapshot.timestampMs === 'number');
  }
});

test('XML Parser Fuzzing: handles malformed, truncated, and corrupted tags without throwing', () => {
  const corruptedInputs = [
    '<dsn><station name="gdscc"',
    '<dish name="DSS14"><upSignal active="true"',
    '<station name="gdscc"><dish name="DSS14"></dish>',
    '<dsn><station name="gdscc" friendlyName="Goldstone"/></dish></dsn>',
    '<?xml version="1.0"?><dsn><station name="gdscc"/><dish name="DSS14"><corrupt tag <broken>',
    '<station name="gdscc" ' + 'attr="val" '.repeat(50) + '/>',
    '<!DOCTYPE dsn [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><dsn>&xxe;</dsn>',
    '<station name="gd\0scc" friendlyName="Gold\0stone"/>',
  ];

  for (const input of corruptedInputs) {
    const snapshot = parseDsnXml(input);
    assert.ok(snapshot !== null);
    assert.ok(Array.isArray(snapshot.stations));
  }
});

test('XML Parser Fuzzing: handles missing station tags and orphaned dish elements', () => {
  // Dishes appearing without any station declaration
  const orphanXml = `<dsn>
    <dish name="DSS14" azimuthAngle="45.0" elevationAngle="60.0" windSpeed="12.0">
      <upSignal active="true" dataRate="500" frequency="2100000000" band="S" power="20" spacecraft="ARTEMIS" spacecraftID="-100"/>
    </dish>
  </dsn>`;

  const snapshot = parseDsnXml(orphanXml);
  // Orphan dish has no parent station; parser should not crash and stations should remain empty
  assert.equal(snapshot.stations.length, 0);

  // Dishes appearing before station tag, followed by station
  const invertedXml = `<dsn>
    <dish name="DSS14" azimuthAngle="45.0" elevationAngle="60.0"/>
    <station name="cdscc" friendlyName="Canberra" timeUTC="1793155449000"/>
    <dish name="DSS43" azimuthAngle="90.0" elevationAngle="40.0"/>
  </dsn>`;

  const snapshot2 = parseDsnXml(invertedXml);
  assert.equal(snapshot2.stations.length, 1);
  assert.equal(snapshot2.stations[0].id, 'cdscc');
  assert.equal(snapshot2.stations[0].dishes.length, 1);
  assert.equal(snapshot2.stations[0].dishes[0].dishName, 'DSS43');
});

test('XML Parser Fuzzing: defensively handles negative power, negative IDs, and range indicators', () => {
  const negativeAttrsXml = `<dsn>
    <station name="gdscc" friendlyName="Goldstone" timeUTC="-1000" timeZoneOffset="-25200000.0"/>
    <dish name="DSS24" azimuthAngle="-45.0" elevationAngle="-10.0" windSpeed="-5.0">
      <downSignal active="true" signalType="data" dataRate="1024" frequency="-2200000000" band="X" power="-999.9" spacecraft="VGR1" spacecraftID="-99999"/>
      <target name="VGR1" id="-31" uplegRange="-1" downlegRange="-1000" rtlt="-1"/>
    </dish>
  </dsn>`;

  const snapshot = parseDsnXml(negativeAttrsXml);
  assert.equal(snapshot.stations.length, 1);
  const dish = snapshot.stations[0].dishes[0];
  assert.equal(dish.downSignals[0].powerDbmOrKw, -999.9);
  assert.equal(dish.downSignals[0].spacecraftId, '-99999');
  assert.equal(dish.targets[0].id, '-31');
  assert.equal(dish.targets[0].uplegRangeKm, -1);
  assert.equal(dish.targets[0].roundTripLightTimeSec, -1);
});

test('XML Parser Fuzzing: sanitizes NaN, Infinity, and non-numeric numbers into safe defaults', () => {
  const nanAttrsXml = `<dsn>
    <station name="mdscc" friendlyName="Madrid" timeUTC="NaN" timeZoneOffset="undefined"/>
    <dish name="DSS53" azimuthAngle="NaN" elevationAngle="Infinity" windSpeed="NaN">
      <upSignal active="true" dataRate="NaN" frequency="Infinity" band="S" power="NaN" spacecraft="KPLO" spacecraftID="155"/>
      <downSignal active="false" dataRate="undefined" frequency="-Infinity" band="X" power="null" spacecraft="KPLO" spacecraftID="155"/>
      <target name="KPLO" id="155" uplegRange="NaN" downlegRange="Infinity" rtlt="abc"/>
    </dish>
  </dsn>`;

  const snapshot = parseDsnXml(nanAttrsXml);
  assert.equal(snapshot.stations.length, 1);
  const dish = snapshot.stations[0].dishes[0];

  assert.equal(dish.azimuthDeg, 0); // NaN falls back to 0
  assert.equal(dish.elevationDeg, 0); // Infinity falls back to 0
  assert.equal(dish.windSpeedKmh, null); // NaN falls back to null

  const upSignal = dish.upSignals[0];
  assert.equal(upSignal.dataRateBps, 0);
  assert.equal(upSignal.frequencyHz, 0);
  assert.equal(upSignal.powerDbmOrKw, 0);

  const target = dish.targets[0];
  assert.equal(target.uplegRangeKm, -1);
  assert.equal(target.downlegRangeKm, -1);
  assert.equal(target.roundTripLightTimeSec, -1);
});

test('XML Parser Fuzzing: tolerates deeply nested unexpected tags and XML comments', () => {
  let deeplyNested = '<dsn>';
  for (let i = 0; i < 40; i++) deeplyNested += `<nested${i} attr="val${i}">`;
  deeplyNested += '<!-- embedded XML comment -->';
  deeplyNested += '<![CDATA[ <dish name="FAKE"/> ]]>';
  deeplyNested += '<station name="cdscc" friendlyName="Canberra" timeUTC="1793155449000"/>';
  deeplyNested += '<dish name="DSS43" azimuthAngle="120.0" elevationAngle="45.0"/>';
  for (let i = 39; i >= 0; i--) deeplyNested += `</nested${i}>`;
  deeplyNested += '</dsn>';

  const snapshot = parseDsnXml(deeplyNested);
  assert.equal(snapshot.stations.length, 1);
  assert.equal(snapshot.stations[0].id, 'cdscc');
  assert.equal(snapshot.stations[0].dishes[0].dishName, 'DSS43');
});

test('XML Parser Fuzzing: automated 1,000 randomized mutation fuzz runs with zero crashes', () => {
  let crashes = 0;
  const iterations = 1000;

  for (let i = 0; i < iterations; i++) {
    let fuzzed = AUTHENTIC_DSN_XML;
    const mode = i % 5;

    if (mode === 0) {
      // Random truncation
      fuzzed = AUTHENTIC_DSN_XML.slice(0, Math.floor(Math.random() * AUTHENTIC_DSN_XML.length));
    } else if (mode === 1) {
      // Insertion of random junk
      const pos = Math.floor(Math.random() * AUTHENTIC_DSN_XML.length);
      fuzzed = AUTHENTIC_DSN_XML.slice(0, pos) + '<injected unknown="123">' + AUTHENTIC_DSN_XML.slice(pos);
    } else if (mode === 2) {
      // Attribute corruption
      const corruptor = ['NaN', 'null', 'undefined', '1e50', '-1e50', '""', '"\0"'][i % 7];
      fuzzed = fuzzed.replaceAll('8192', corruptor).replaceAll('1793155449000', corruptor);
    } else if (mode === 3) {
      // Noise injection
      const noise = Array.from({ length: 100 }, () => String.fromCharCode(Math.floor(Math.random() * 256))).join('');
      fuzzed += noise;
    }

    try {
      const result = parseDsnXml(fuzzed);
      if (!result || typeof result.timestampMs !== 'number' || !Array.isArray(result.stations)) {
        crashes++;
      }
    } catch {
      crashes++;
    }
  }

  assert.equal(crashes, 0, `Expected 0 crashes across ${iterations} fuzz runs`);
});

test('XML Parser Fuzzing: high-throughput stress on large payload (2.2 MB, 5,000 dishes)', () => {
  let bigXml = '<dsn><station name="gdscc" friendlyName="Goldstone" timeUTC="1793155449000" timeZoneOffset="-25200000.0"/>';
  for (let i = 0; i < 5000; i++) {
    bigXml += `<dish name="DSS${i}" azimuthAngle="180.0" elevationAngle="45.0" windSpeed="10.0">
      <upSignal active="true" dataRate="1000" frequency="2100000000" band="S" power="20" spacecraft="ARTEMIS" spacecraftID="-100"/>
      <downSignal active="true" dataRate="2000" frequency="2200000000" band="S" power="-110" spacecraft="ARTEMIS" spacecraftID="-100"/>
      <target name="ARTEMIS" id="100" uplegRange="384400" downlegRange="384400" rtlt="2.56"/>
    </dish>`;
  }
  bigXml += '</dsn>';

  const t0 = performance.now();
  const snapshot = parseDsnXml(bigXml);
  const elapsed = performance.now() - t0;

  assert.equal(snapshot.stations.length, 1);
  assert.equal(snapshot.stations[0].dishes.length, 5000);
  assert.ok(elapsed < 250, `Expected parse time < 250ms, took ${elapsed.toFixed(2)}ms`);
});
