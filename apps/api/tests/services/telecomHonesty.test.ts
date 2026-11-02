import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateGeometricDteAccess,
  DTE_GEOMETRIC_CAVEATS,
} from '@server/services/telecom/dteGeometricAccess';
import {
  evaluateOrbitalRelayVisibility,
  ORBITAL_RELAY_CATALOGUE,
  RELAY_VISIBILITY_CAVEATS,
} from '@server/services/telecom/orbitalRelayVisibility';

const T0 = Date.UTC(2026, 10, 1, 0, 0, 0);
const HOUR_MS = 3_600_000;

test('DTE access: geometric line-of-sight is labelled as geometry, not a link budget', () => {
  const result = evaluateGeometricDteAccess([
    {
      startEpochMs: T0,
      endEpochMs: T0 + 4 * HOUR_MS,
      earth: { status: 'visible', meanElevationDeg: 7.5, clearanceDeg: 3.25 },
    },
  ]);

  assert.equal(result.observable, 'geometric_earth_line_of_sight');
  assert.equal(result.rfLinkClosureAssessed, false);
  assert.equal(result.rfLinkBudgetIncluded, false);
  assert.ok(result.label.toLowerCase().includes('line-of-sight'));
  assert.ok(result.label.toLowerCase().includes('not an rf link budget'));
  assert.equal(result.status, 'valid');
});

test('DTE access: windows merge contiguous visible intervals and exclude blocked ones', () => {
  const result = evaluateGeometricDteAccess([
    {
      startEpochMs: T0,
      endEpochMs: T0 + HOUR_MS,
      earth: { status: 'visible', meanElevationDeg: 6, clearanceDeg: 2 },
    },
    {
      startEpochMs: T0 + HOUR_MS,
      endEpochMs: T0 + 2 * HOUR_MS,
      earth: { status: 'visible', meanElevationDeg: 4, clearanceDeg: 1 },
    },
    {
      startEpochMs: T0 + 2 * HOUR_MS,
      endEpochMs: T0 + 3 * HOUR_MS,
      earth: { status: 'terrain_blocked', meanElevationDeg: 1.2, clearanceDeg: -0.8 },
    },
    {
      startEpochMs: T0 + 3 * HOUR_MS,
      endEpochMs: T0 + 4 * HOUR_MS,
      earth: { status: 'sub_horizon', meanElevationDeg: -2, clearanceDeg: -5 },
    },
  ]);

  assert.equal(result.windows.length, 1);
  assert.equal(result.windows[0]!.durationHours, 2);
  assert.equal(result.totalAccessHours, 2);
  assert.equal(result.accessAvailabilityPercent, 50);
  assert.equal(result.windows[0]!.minimumEarthElevationDeg, 4);
  assert.equal(result.coverageComplete, true);
});

test('DTE access: a visible status with negative clearance is not counted as access', () => {
  const result = evaluateGeometricDteAccess([
    {
      startEpochMs: T0,
      endEpochMs: T0 + HOUR_MS,
      earth: { status: 'visible', meanElevationDeg: 0.4, clearanceDeg: -0.1 },
    },
  ]);
  assert.equal(result.windows.length, 0);
  assert.equal(result.totalAccessHours, 0);
});

test('DTE access: coverage gaps and empty input are reported, never assumed clear', () => {
  const gapped = evaluateGeometricDteAccess([
    {
      startEpochMs: T0,
      endEpochMs: T0 + HOUR_MS,
      earth: { status: 'visible', meanElevationDeg: 5, clearanceDeg: 1 },
    },
    {
      startEpochMs: T0 + 5 * HOUR_MS,
      endEpochMs: T0 + 6 * HOUR_MS,
      earth: { status: 'visible', meanElevationDeg: 5, clearanceDeg: 1 },
    },
  ]);
  assert.equal(gapped.coverageComplete, false);
  assert.equal(gapped.status, 'incomplete');
  assert.ok(gapped.caveats.some((caveat) => caveat.includes('do not tile')));

  const empty = evaluateGeometricDteAccess([]);
  assert.equal(empty.windows.length, 0);
  assert.ok(empty.caveats.some((caveat) => caveat.includes('absence of input')));
});

test('DTE access: unknown Earth statuses and malformed intervals are rejected', () => {
  assert.throws(() =>
    evaluateGeometricDteAccess([
      {
        startEpochMs: T0,
        endEpochMs: T0 + HOUR_MS,
        earth: { status: 'probably_fine', meanElevationDeg: 5, clearanceDeg: 1 },
      },
    ]),
  );

  assert.throws(() =>
    evaluateGeometricDteAccess([
      {
        startEpochMs: T0 + HOUR_MS,
        endEpochMs: T0,
        earth: { status: 'visible', meanElevationDeg: 5, clearanceDeg: 1 },
      },
    ]),
  );
});

test('DTE access: caveats always separate geometry from RF link closure', () => {
  const result = evaluateGeometricDteAccess([]);
  assert.equal(result.caveats.length >= DTE_GEOMETRIC_CAVEATS.length, true);
  const joined = result.caveats.join(' ').toLowerCase();
  assert.ok(joined.includes('link closure'));
  assert.ok(joined.includes('relay'));
  for (const forbidden of ['guaranteed', 'assured']) {
    assert.ok(!joined.includes(forbidden), `caveats must not claim "${forbidden}"`);
  }
});

test('Relay visibility: registered relays return an explicit unsupported result', () => {
  for (const entry of ORBITAL_RELAY_CATALOGUE) {
    const result = evaluateOrbitalRelayVisibility({
      siteId: 'shackleton-rim',
      relayId: entry.relayId,
      startEpochMs: T0,
      endEpochMs: T0 + 24 * HOUR_MS,
    });

    assert.equal(result.status, 'unsupported');
    assert.equal(result.observable, 'orbital_relay_physical_visibility');
    assert.equal(result.reasonCode, 'missing_relay_state_ephemeris');
    assert.equal(result.missingProduct.productId, entry.missingProduct.productId);
    assert.ok(result.reason.includes(entry.missingProduct.productId));
    assert.ok(result.missingProduct.requiredInputs.length >= 3);
  }
});

test('Relay visibility: no pass windows, counts or next-pass epochs are ever emitted', () => {
  const result = evaluateOrbitalRelayVisibility({
    siteId: 'shackleton-rim',
    relayId: 'lro',
    startEpochMs: T0,
    endEpochMs: T0 + 24 * HOUR_MS,
  });

  assert.equal(result.passWindows, null);
  assert.equal(result.passWindowCount, null);
  assert.equal(result.nextPassEpochMs, null);
  assert.ok(result.label.toLowerCase().includes('unsupported'));
});

test('Relay visibility: an unregistered relay is refused by name, not approximated', () => {
  const result = evaluateOrbitalRelayVisibility({
    siteId: 'shackleton-rim',
    relayId: 'Queqiao-2',
    startEpochMs: T0,
    endEpochMs: T0 + 24 * HOUR_MS,
  });

  assert.equal(result.status, 'unsupported');
  assert.equal(result.reasonCode, 'unknown_relay_id');
  assert.ok(result.reason.includes('Queqiao-2'));
  assert.equal(result.passWindows, null);
});

test('Relay visibility: relay ids are matched case-insensitively and reported verbatim', () => {
  const result = evaluateOrbitalRelayVisibility({
    siteId: 'shackleton-rim',
    relayId: ' LRO ',
    startEpochMs: T0,
    endEpochMs: T0 + HOUR_MS,
  });
  assert.equal(result.reasonCode, 'missing_relay_state_ephemeris');
  assert.equal(result.relayId, ' LRO ');
});

test('Relay visibility: malformed requests are rejected instead of answered', () => {
  assert.throws(() =>
    evaluateOrbitalRelayVisibility({
      siteId: '',
      relayId: 'lro',
      startEpochMs: T0,
      endEpochMs: T0 + HOUR_MS,
    }),
  );
  assert.throws(() =>
    evaluateOrbitalRelayVisibility({
      siteId: 'shackleton-rim',
      relayId: 'lro',
      startEpochMs: T0 + HOUR_MS,
      endEpochMs: T0,
    }),
  );
});

test('Relay visibility: caveats forbid placeholder passes and conflating observables', () => {
  const joined = RELAY_VISIBILITY_CAVEATS.join(' ').toLowerCase();
  assert.ok(joined.includes('no pass windows'));
  assert.ok(joined.includes('link closure'));
  for (const forbidden of ['guaranteed', 'assured']) {
    assert.ok(!joined.includes(forbidden), `caveats must not claim "${forbidden}"`);
  }
});
