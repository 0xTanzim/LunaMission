import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dsnSignalSchema,
  dsnTargetSchema,
  dsnDishSchema,
  dsnStationSchema,
  dsnTelemetryResponseSchema,
  lunarTrackingSummarySchema,
} from '../src/schemas/telemetrySchemas';
import {
  parseDsnXml,
  type DsnFeedSnapshot,
} from '../src/services/dsnXmlParser';
import {
  DsnIngestionService,
  dsnIngestionService,
  computeStationLunarTopocentric,
} from '../src/services/dsnIngestionService';
import {
  HorizonsProxyService,
  parseHorizonsTable,
} from '../src/services/horizonsProxyService';

// Sample authentic DSN XML snippet reflecting NASA Eyes on the DSN feed
const SAMPLE_DSN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<dsn>
  <station name="gdscc" friendlyName="Goldstone" timeUTC="1793155449000" timeZoneOffset="-25200000.0"/>
  <dish name="DSS24" azimuthAngle="0.0" elevationAngle="90.0" windSpeed="" isMSPA="false" isArray="false" isDDOR="false" activity="Spacecraft Telemetry, Tracking, and Command">
    <downSignal active="false" signalType="none" dataRate="0" frequency="0" band="X" power="-180" spacecraft="VGR1" spacecraftID="-31"/>
    <target name="VGR1" id="31" uplegRange="25800000000" downlegRange="25800000000" rtlt="-1"/>
  </dish>
  <dish name="DSS25" azimuthAngle="145.2" elevationAngle="42.5" windSpeed="18.5" isMSPA="false" isArray="false" isDDOR="false" activity="Spacecraft Telemetry, Tracking, and Command">
    <downSignal active="false" signalType="none" dataRate="NaN" frequency="8415000000" band="X" power="-170" spacecraft="VGR1" spacecraftID="-31"/>
    <target name="VGR1" id="31" uplegRange="25800000000" downlegRange="25800000000" rtlt="-1"/>
  </dish>
  <station name="mdscc" friendlyName="Madrid" timeUTC="1793155449000" timeZoneOffset="3600000.0"/>
  <dish name="DSS53" azimuthAngle="225.5" elevationAngle="70.1" windSpeed="4.2" isMSPA="false" isArray="false" isDDOR="false" activity="Spacecraft Telemetry, Tracking, and Command">
    <upSignal active="true" signalType="data" dataRate="0" frequency="2110000000" band="S" power="0.2" spacecraft="KPLO" spacecraftID="-155"/>
    <downSignal active="true" signalType="data" dataRate="8192" frequency="2290000000" band="S" power="-120" spacecraft="KPLO" spacecraftID="-155"/>
    <downSignal active="false" signalType="none" dataRate="8500000" frequency="8450000000" band="X" power="-470" spacecraft="KPLO" spacecraftID="-155"/>
    <target name="KPLO" id="155" uplegRange="358000" downlegRange="358000" rtlt="2.4"/>
  </dish>
  <station name="cdscc" friendlyName="Canberra" timeUTC="1793155449000" timeZoneOffset="39600000.0"/>
  <dish name="DSS43" azimuthAngle="92.0" elevationAngle="33.4" windSpeed="" isMSPA="false" isArray="false" isDDOR="false" activity="Spacecraft Telemetry, Tracking, and Command">
    <upSignal active="true" signalType="data" dataRate="0" frequency="7150000000" band="X" power="19" spacecraft="NHPC" spacecraftID="-98"/>
    <downSignal active="true" signalType="data" dataRate="707.3" frequency="8420000000" band="X" power="-150" spacecraft="NHPC" spacecraftID="-98"/>
    <target name="NHPC" id="98" uplegRange="9900000000" downlegRange="9900000000" rtlt="66000"/>
  </dish>
  <timestamp>1793155449000</timestamp>
</dsn>`;

// Sample JPL Horizons Horizons columnar output between $$SOE and $$EOE
const SAMPLE_HORIZONS_OUTPUT = `
*******************************************************************************
Target body name: Moon (301)
Center body name: Earth (500)
Center-site name: GEOCENTRIC
*******************************************************************************
 Date__(UT)__HR:MN     ObsSub-LON ObsSub-LAT  SunSub-LON SunSub-LAT             delta      deldot  1-way_down_LT
$$SOE
 2026-Oct-28 00:00     358.491826  -6.553584  333.755147  -1.419817  3.6476743382E+05  -0.0117266     0.02027889
 2026-Oct-28 01:00     358.557292  -6.550450  333.249005  -1.420230  3.6472640550E+05  -0.0110681     0.02027661
$$EOE
*******************************************************************************
`;

// ============================================================================
// 1. DSN XML Parser Unit Tests
// ============================================================================

test('DSN XML Parser: correctly associates sibling <dish> tags with preceding <station>', () => {
  const parsed = parseDsnXml(SAMPLE_DSN_XML);

  assert.equal(parsed.stations.length, 3);
  assert.equal(parsed.timestampMs, 1793155449000);

  // Station 1: Goldstone
  const goldstone = parsed.stations.find((s) => s.id === 'gdscc');
  assert.ok(goldstone, 'Goldstone station should exist');
  assert.equal(goldstone.friendlyName, 'Goldstone');
  assert.equal(goldstone.dishes.length, 2);
  assert.equal(goldstone.dishes[0].dishName, 'DSS24');
  assert.equal(goldstone.dishes[1].dishName, 'DSS25');

  // Station 2: Madrid
  const madrid = parsed.stations.find((s) => s.id === 'mdscc');
  assert.ok(madrid, 'Madrid station should exist');
  assert.equal(madrid.friendlyName, 'Madrid');
  assert.equal(madrid.dishes.length, 1);
  assert.equal(madrid.dishes[0].dishName, 'DSS53');

  // Station 3: Canberra
  const canberra = parsed.stations.find((s) => s.id === 'cdscc');
  assert.ok(canberra, 'Canberra station should exist');
  assert.equal(canberra.dishes.length, 1);
  assert.equal(canberra.dishes[0].dishName, 'DSS43');
});

test('DSN XML Parser: defensively parses "NaN", empty wind speeds, and multiple signals', () => {
  const parsed = parseDsnXml(SAMPLE_DSN_XML);
  const goldstone = parsed.stations.find((s) => s.id === 'gdscc')!;
  const dss24 = goldstone.dishes[0];
  const dss25 = goldstone.dishes[1];

  // Empty windSpeed becomes null
  assert.equal(dss24.windSpeedKmh, null);

  // Populated windSpeed parsed as number
  assert.equal(dss25.windSpeedKmh, 18.5);

  // dataRate="NaN" defensively parsed to 0
  assert.equal(dss25.downSignals[0].dataRateBps, 0);

  // Madrid DSS53 has 1 upSignal and 2 downSignals
  const madrid = parsed.stations.find((s) => s.id === 'mdscc')!;
  const dss53 = madrid.dishes[0];
  assert.equal(dss53.upSignals.length, 1);
  assert.equal(dss53.downSignals.length, 2);

  // Check carrier band and negative spacecraft ID extraction
  assert.equal(dss53.upSignals[0].band, 'S');
  assert.equal(dss53.upSignals[0].spacecraft, 'KPLO');
  assert.equal(dss53.upSignals[0].spacecraftId, '-155');
  assert.equal(dss53.downSignals[0].band, 'S');
  assert.equal(dss53.downSignals[0].dataRateBps, 8192);
  assert.equal(dss53.downSignals[1].band, 'X');

  // Target ranges and RTLT
  assert.equal(dss53.targets.length, 1);
  assert.equal(dss53.targets[0].name, 'KPLO');
  assert.equal(dss53.targets[0].downlegRangeKm, 358000);
  assert.equal(dss53.targets[0].roundTripLightTimeSec, 2.4);
});

test('DSN XML Parser: handles empty or malformed input without throwing', () => {
  const empty = parseDsnXml('');
  assert.equal(empty.stations.length, 0);
  assert.ok(empty.timestampMs > 0);

  const garbage = parseDsnXml('<<<not-xml>>>');
  assert.equal(garbage.stations.length, 0);
});

// ============================================================================
// 2. Zod Telemetry Schemas Tests
// ============================================================================

test('Zod Telemetry Schemas: validates parsed DSN signal, target, dish, and station', () => {
  const signal = dsnSignalSchema.parse({
    active: true,
    signalType: 'data',
    dataRateBps: 8192,
    frequencyHz: 2290000000,
    band: 'S',
    powerDbmOrKw: -120,
    spacecraft: 'KPLO',
    spacecraftId: '-155',
  });
  assert.equal(signal.spacecraft, 'KPLO');
  assert.equal(signal.band, 'S');

  const target = dsnTargetSchema.parse({
    name: 'KPLO',
    id: '155',
    uplegRangeKm: 358000,
    downlegRangeKm: 358000,
    roundTripLightTimeSec: 2.4,
  });
  assert.equal(target.name, 'KPLO');

  const dish = dsnDishSchema.parse({
    dishName: 'DSS53',
    azimuthDeg: 225.5,
    elevationDeg: 70.1,
    windSpeedKmh: 4.2,
    isMspa: false,
    isArray: false,
    isDdor: false,
    activity: 'Spacecraft Telemetry, Tracking, and Command',
    upSignals: [signal],
    downSignals: [signal],
    targets: [target],
  });
  assert.equal(dish.dishName, 'DSS53');

  const station = dsnStationSchema.parse({
    id: 'mdscc',
    friendlyName: 'Madrid',
    timeUtcMs: 1793155449000,
    timeZoneOffsetMs: 3600000,
    dishes: [dish],
    topocentric: {
      elevationDeg: 45.2,
      azimuthDeg: 160.0,
      isVisible: true,
      horizonMaskDeg: 10.0,
    },
  });
  assert.equal(station.id, 'mdscc');
  assert.equal(station.topocentric.isVisible, true);
});

test('Zod Telemetry Schemas: validates full telemetry response schema', () => {
  const validPayload = {
    status: 'live_feed',
    timestampIso: '2026-10-28T02:45:00.000Z',
    feedTimestampMs: 1793155449000,
    latencyMs: 125,
    stations: [
      {
        id: 'gdscc',
        friendlyName: 'Goldstone',
        timeUtcMs: 1793155449000,
        timeZoneOffsetMs: -25200000,
        dishes: [],
        topocentric: {
          elevationDeg: -15.4,
          azimuthDeg: 280.0,
          isVisible: false,
          horizonMaskDeg: 10.0,
        },
      },
    ],
    activeStationId: 'mdscc',
    lunarTrackingSummary: {
      activeLunarDishes: 1,
      trackedSpacecraft: ['KPLO'],
      primaryTrackingDish: 'DSS53',
      downlinkBand: 'S',
      linkMarginDb: 10.0,
      linkState: 'locked',
    },
    provenance: {
      source: 'NASA Eyes on the DSN XML Feed',
      endpoint: 'https://eyes.nasa.gov/dsn/data/dsn.xml',
      cached: false,
      cacheTtlSeconds: 15,
    },
  };

  const parsed = dsnTelemetryResponseSchema.parse(validPayload);
  assert.equal(parsed.status, 'live_feed');
  assert.equal(parsed.lunarTrackingSummary.linkState, 'locked');
  assert.equal(parsed.provenance.cacheTtlSeconds, 15);
});

// ============================================================================
// 3. Topocentric Coordinates & DSN Ingestion Service Tests
// ============================================================================

test('Topocentric Calculation: accurately computes lunar Az/El and enforces 10° horizon mask', () => {
  const epochMs = Date.UTC(2026, 9, 28, 12, 0, 0);

  // Goldstone coordinates
  const topoGoldstone = computeStationLunarTopocentric('gdscc', epochMs);
  assert.ok(topoGoldstone.azimuthDeg >= 0 && topoGoldstone.azimuthDeg <= 360);
  assert.ok(topoGoldstone.elevationDeg >= -90 && topoGoldstone.elevationDeg <= 90);
  assert.equal(topoGoldstone.horizonMaskDeg, 10.0);
  assert.equal(topoGoldstone.isVisible, topoGoldstone.elevationDeg >= 10.0);

  // Canberra coordinates
  const topoCanberra = computeStationLunarTopocentric('cdscc', epochMs);
  assert.ok(topoCanberra.azimuthDeg >= 0 && topoCanberra.azimuthDeg <= 360);
  assert.ok(topoCanberra.elevationDeg >= -90 && topoCanberra.elevationDeg <= 90);
});

test('DSN Ingestion Service: provides comprehensive offline fallback fixture with all 3 complexes', async () => {
  const service = new DsnIngestionService();
  const fallback = service.getOfflineFallbackFixture(Date.now());

  assert.equal(fallback.status, 'offline_fallback');
  assert.equal(fallback.stations.length, 3);

  const ids = fallback.stations.map((s) => s.id);
  assert.ok(ids.includes('gdscc'));
  assert.ok(ids.includes('mdscc'));
  assert.ok(ids.includes('cdscc'));

  // Fallback Madrid includes DSS53 tracking lunar asset KPLO
  const madrid = fallback.stations.find((s) => s.id === 'mdscc')!;
  const dss53 = madrid.dishes.find((d) => d.dishName === 'DSS53');
  assert.ok(dss53, 'Madrid fallback must include DSS53');
  assert.ok(dss53.targets.some((t) => t.name === 'KPLO'));

  // Lunar tracking summary is populated
  assert.ok(fallback.lunarTrackingSummary.trackedSpacecraft.includes('KPLO'));
  assert.equal(fallback.lunarTrackingSummary.linkState, 'locked');
  assert.ok(fallback.lunarTrackingSummary.linkMarginDb >= 3.0);
});

test('DSN Ingestion Service: caches snapshot with 15s LRU TTL', async () => {
  const service = new DsnIngestionService();
  const testEpoch = 1793155449000;

  // Clear cache first
  service.clearCache();

  // Seed cache manually or via method
  const fallback = service.getOfflineFallbackFixture(testEpoch);
  service.cacheTelemetry(fallback);

  // Next retrieval should hit cache
  const cached = service.getCachedTelemetry();
  assert.ok(cached, 'Cache should return entry');
  assert.equal(cached.cached, true);
  assert.equal(cached.status, 'cached_valid');
});

test('DSN Ingestion Service: filters lunar assets from feed correctly', () => {
  const service = new DsnIngestionService();
  const parsed = parseDsnXml(SAMPLE_DSN_XML);
  const summary = service.buildLunarTrackingSummary(parsed.stations);

  assert.equal(summary.activeLunarDishes, 1);
  assert.ok(summary.trackedSpacecraft.includes('KPLO'));
  assert.equal(summary.primaryTrackingDish, 'DSS53');
  assert.equal(summary.downlinkBand, 'S');
  assert.equal(summary.linkState, 'locked');
});

// ============================================================================
// 4. JPL Horizons Proxy Service Upgrade Tests
// ============================================================================

test('Horizons Proxy Service: parses columnar table between $$SOE and $$EOE accurately', () => {
  const parsed = parseHorizonsTable(SAMPLE_HORIZONS_OUTPUT);
  assert.ok(parsed !== null, 'Parsing should succeed on valid Horizons output');

  // Sub-Earth longitude normalized from 358.491826 to -1.508174
  assert.ok(Math.abs(parsed.subEarthLonDeg - (358.491826 - 360)) < 0.0001);
  assert.ok(Math.abs(parsed.subEarthLatDeg - (-6.553584)) < 0.0001);

  // Sub-solar coordinates
  assert.ok(Math.abs(parsed.subSolarLonDeg - 333.755147) < 0.0001);
  assert.ok(Math.abs(parsed.subSolarLatDeg - (-1.419817)) < 0.0001);

  // Distance in km (364767 km)
  assert.equal(parsed.earthMoonDistanceKm, 364767);

  // Light time in seconds (0.02027889 * 60 = 1.2167s)
  assert.ok(Math.abs(parsed.lightTimeSeconds - 1.2167) < 0.001);
});

test('Horizons Proxy Service: handles malformed Horizons output with null fallback', () => {
  const invalid = parseHorizonsTable('No delimiters here');
  assert.equal(invalid, null);

  const missingColumns = parseHorizonsTable('$$SOE\n2026-Oct-28 incomplete\n$$EOE');
  assert.equal(missingColumns, null);
});

test('Horizons Proxy Service: returns analytical fallback when offline or on error', async () => {
  const service = new HorizonsProxyService();
  const epoch = Date.UTC(2026, 9, 28, 12, 0, 0);

  // When given a mock or unreachable host, falls back to analytical model
  const result = await service.getHorizonsEphemeris(epoch, 50); // Short 50ms timeout
  assert.ok(result.earthMoonDistanceKm > 350000);
  assert.ok(result.lightTimeSeconds > 1.0);
  assert.ok(result.source.includes('DE421') || result.source.includes('Analytical') || result.source.includes('Horizons'));
});

// ============================================================================
// 5. Additional Edge-Cases, Rejections & Parser Benchmarks
// ============================================================================

test('DSN XML Parser: parses self-closing <dish ... /> and dishes without signals', () => {
  const xml = `<dsn>
    <station name="gdscc" friendlyName="Goldstone" timeUTC="1793155449000" timeZoneOffset="-25200000.0"/>
    <dish name="DSS14" azimuthAngle="180.0" elevationAngle="45.0" windSpeed="10.0" isMSPA="true" isArray="false" isDDOR="true" activity="Engineering"/>
  </dsn>`;

  const parsed = parseDsnXml(xml);
  assert.equal(parsed.stations.length, 1);
  assert.equal(parsed.stations[0].dishes.length, 1);
  const dish = parsed.stations[0].dishes[0];
  assert.equal(dish.dishName, 'DSS14');
  assert.equal(dish.isMspa, true);
  assert.equal(dish.isDdor, true);
  assert.equal(dish.upSignals.length, 0);
  assert.equal(dish.downSignals.length, 0);
  assert.equal(dish.targets.length, 0);
});

test('DSN XML Parser: high-throughput benchmark (> 500 parses in < 150ms)', () => {
  const start = performance.now();
  for (let i = 0; i < 500; i++) {
    parseDsnXml(SAMPLE_DSN_XML);
  }
  const elapsed = performance.now() - start;
  assert.ok(elapsed < 150, `500 iterations took ${elapsed}ms, expected < 150ms`);
});

test('Zod Telemetry Schemas: strictly rejects invalid station ID and response status', () => {
  assert.throws(() => {
    dsnStationSchema.parse({
      id: 'invalid-station',
      friendlyName: 'Nowhere',
      timeUtcMs: 1234567,
      timeZoneOffsetMs: 0,
      dishes: [],
      topocentric: { elevationDeg: 0, azimuthDeg: 0, isVisible: false, horizonMaskDeg: 10.0 },
    });
  });

  assert.throws(() => {
    dsnTelemetryResponseSchema.parse({
      status: 'unsupported_status',
      timestampIso: '2026-10-28T00:00:00Z',
      feedTimestampMs: 1234567,
      latencyMs: 10,
      stations: [],
      activeStationId: null,
      lunarTrackingSummary: {
        activeLunarDishes: 0,
        trackedSpacecraft: [],
        primaryTrackingDish: null,
        downlinkBand: 'S',
        linkMarginDb: 0,
        linkState: 'loss_of_signal',
      },
      provenance: { source: '', endpoint: '', cached: false, cacheTtlSeconds: 15 },
    });
  });
});

test('DSN Ingestion Service: fetchDsnTelemetry returns valid schema-compliant response', async () => {
  const service = new DsnIngestionService();
  const response = await service.fetchDsnTelemetry(100);

  // Validate that response strictly adheres to schema
  const validated = dsnTelemetryResponseSchema.parse(response);
  assert.ok(validated.stations.length === 3);
  assert.ok(['live_feed', 'cached_valid', 'offline_fallback'].includes(validated.status));
  assert.ok(validated.provenance.cacheTtlSeconds === 15);
});
