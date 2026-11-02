import test from 'node:test';
import assert from 'node:assert/strict';
import { DEEP_ZOOM_DISTANCE_UNITS } from '../scene/globeScene';
import { NADIR_CAP_CAMERA_DISTANCE, INSPECTION_CAMERA_ALTITUDE } from '../interaction/globeCameraPresets';

/**
 * The "deep zoom" gate hides overview reference geometry (graticule, footprint, PSR
 * overlay, vectors, crater outlines, non-selected markers). After the nadir retarget
 * (cap-centered pose at 0.5 units), the legacy 0.65 threshold wrongly classified the
 * OPENING view as deep zoom and suppressed every reference overlay on load.
 */
test('deep zoom threshold: opening nadir view is NOT deep zoom, inspection view is', () => {
  assert.ok(
    DEEP_ZOOM_DISTANCE_UNITS < NADIR_CAP_CAMERA_DISTANCE,
    `deep-zoom threshold ${DEEP_ZOOM_DISTANCE_UNITS} must sit below the opening cap framing distance ${NADIR_CAP_CAMERA_DISTANCE} — the Regional view must show reference overlays`,
  );
  assert.ok(
    DEEP_ZOOM_DISTANCE_UNITS > INSPECTION_CAMERA_ALTITUDE,
    `deep-zoom threshold ${DEEP_ZOOM_DISTANCE_UNITS} must sit above the local inspection altitude ${INSPECTION_CAMERA_ALTITUDE} — terrain inspection must still yield the overlays`,
  );
});
