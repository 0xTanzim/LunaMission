# Architecture Reference Document (ARD) — LunaMission
**Project:** LunaMission — Lunar Landing Site Navigator  
**Document Version:** 2.0.0  
**Architecture Style:** Decoupled Spatial-Temporal Scientific Platform (Offline Python Prep + Hono.js Scientific Backend + Pure Presentation React Client)

---

## 1. Architectural Principles & Core Insights

### 1.1 The Spatial-Temporal Decoupling Principle
The architecture of LunaMission is built on a foundational physical separation:
- **Spatial Invariant (Topographic Horizon Mask `θ_mask(Az)`):** Because the airless lunar surface does not erode on human timescales, the `360°` terrain horizon silhouette from a fixed coordinate `(φ, λ)` and observer height `h_obs` in the `MOON_ME` frame is **independent of time**. It depends only on the DEM dataset version and ray-marching parameters, and can be precomputed, versioned, and reused across all past and future mission dates.
- **Temporal Variant (Topocentric Sky Geometry `Az(t), El(t), α(t)`):** The positions, angular velocities, distances, and apparent disk radii of the Sun and Earth change continuously with time and must be evaluated specifically for the requested epoch `[t_start, t_end]`.

### 1.2 Why All Business & Scientific Logic Lives in the Backend + Offline Pipeline
- **React Client (`client/`):** Strictly a presentation and interaction workspace. It contains zero astronomical libraries, zero coordinate transformations, and zero horizon calculations.
- **Hono.js Backend (`server/`):** Owns scenario validation, dataset/site catalog resolution, JPL Horizons API querying and header-driven parsing, full-configuration SHA-256 caching, continuous azimuth unwrapping, Hermite interpolation, and the exact event-splitting visibility solver.
- **Offline Scientific Pipeline (`scripts/`):** Written in Python (`rasterio`, `pyproj`, `numpy`). Ingests authoritative NASA PDS / PGDA LOLA GeoTIFF and `.IMG/.LBL` products, verifies CRS and landmark control points, executes the generalized spherical-curvature ray-marcher, computes perturbation sensitivity envelopes `[θ_low, θ_nom, θ_high]`, and emits immutable, checksummed horizon artifacts (`data/curated-horizons.json`).

---

## 2. System Context & Component Architecture

```
+===================================================================================================+
|                     EXTERNAL AUTHORITATIVE NASA DATA SOURCES                                      |
|  [NASA PDS / GSFC PGDA LOLA DEM Archives]   [NASA JPL Horizons REST API]   [NASA Moon Trek WMTS]  |
|  (LDEM_85S_20M, LDEM_80S_60M, PGDA 5m+ERR)  (ssd.jpl.nasa.gov/api)         (Basemap Tiles)        |
+=====================+====================================+=========================+==============+
                      | (Offline Ingestion & Validation)   | (On-Demand HTTPS REST)  | (Map Tiles)
                      v                                    |                         |
+=====================================================+    |                         |
| TIER 1: OFFLINE PYTHON SCIENTIFIC CLI (`scripts/`)  |    |                         |
| - `inspect_raster_manifest.py` (CRS, scale, nodata) |    |                         |
| - `verify_control_points.py` (Pole, Malapert, etc.) |    |                         |
| - `extract_horizon_profiles.py` (Generalized s_bound|    |                         |
|   ray-marcher + [θ_low, θ_nom, θ_high] envelopes)   |    |                         |
+=====================+===============================+    |                         |
                      | Writes Verified Versioned JSON     |                         |
                      v                                    v                         |
+================================================================================+   |
| TIER 2: HONO.JS SCIENTIFIC BACKEND SERVICE (`server/`)                         |   |
|                                                                                |   |
|  +---------------------------+    +-----------------------------------------+  |   |
|  | Site & Dataset Registry   |    | JPL Horizons Adapter & Header Parser    |  |   |
|  | (`sites-registry.json`,   |    | - Queries `coord@301`, `QUANTITIES=     |  |   |
|  |  `datasets-manifest.json`)|    |   4,5,13,20`, `RANGE_UNITS=KM`, AIRLESS |  |   |
|  +-------------+-------------+    +--------------------+--------------------+  |   |
|                |                                       |                       |   |
|                v                                       v                       |   |
|  +--------------------------------------------------------------------------+  |   |
|  | Content-Addressable Ephemeris & Scenario Cache (`cache/`)                |  |   |
|  | - Keyed by SHA-256 of full scientific configuration                      |  |   |
|  +-------------------------------------+------------------------------------+  |   |
|                                        |                                       |   |
|                                        v                                       |   |
|  +--------------------------------------------------------------------------+  |   |
|  | Visibility & Event-Splitting Window Solver (`visibilitySolver.ts`)       |  |   |
|  | - Unwraps azimuths; splits at dAz/dt=0, bin vertices Az_k, and dg/dt=0   |  |   |
|  | - Refines roots via Brent's method on Hermite spline (pos + vel rates)   |  |   |
|  | - Outputs intervals, metrics, sensitivity brackets & ProvenanceManifest  |  |   |
|  +-------------------------------------+------------------------------------+  |   |
+========================================|=======================================+   |
                                         | Typed REST JSON API                       |
                                         v                                           v
+===================================================================================================+
| TIER 3: REACT + TYPESCRIPT PRESENTATION CLIENT (`client/`)                                        |
|  - `HorizonSkyRibbon360` (Canvas/SVG 360° terrain skyline + Sun/Earth tracks + terrain shadow)    |
|  - `OperationalWindowGantt` (Synchronized multi-track timeline + Scenario A/B delta view)         |
|  - `PolarTacticalMap2D` (80°S-90°S map with region footprints & site pins)                        |
|  - `ProvenanceAndSensitivityDrawer` (Displays manifest, status badge, LDEC & uncertainty bands)   |
+===================================================================================================+
```

---

## 3. REST API Contracts (Hono.js Backend -> React Client)

### 3.1 `GET /api/v1/sites`
Returns the multi-tier site catalogue, including region polygons, research points, historical touchdowns, and negative controls, with explicit support and validation metadata.

### 3.2 `GET /api/v1/datasets`
Returns the ingested dataset manifest (`LDEM_85S_20M`, `LDEM_80S_60M`, PGDA products), including SHA-256 checksums, CRS WKT strings, scale factors, and citation records.

### 3.3 `POST /api/v1/scenarios/evaluate`
Evaluates a single site-date scenario and returns its horizon profile, time series, refined visibility intervals, summary metrics, sensitivity envelope, and provenance manifest.

**Request Payload:**
```json
{
  "siteId": "res-cr01",
  "observerHeightM": 2.0,
  "startUtc": "2026-11-01T00:00:00Z",
  "stopUtc": "2026-12-01T00:00:00Z",
  "stepSize": "10m",
  "earthVisibilityRule": "center"
}
```

**Response Payload Contract:**
```json
{
  "calculationId": "calc_9f8e7d6c5b4a",
  "scenarioFingerprint": "sha256:4a8b9c...",
  "status": "valid-with-limitations",
  "statusReasons": [
    "Horizon derived from 20m/px LOLA GDR; 42% of peak horizon rays terminate on interpolated (LDEC=0) pixels."
  ],
  "provenance": {
    "calculatedAtUtc": "2026-10-30T02:00:00Z",
    "siteId": "res-cr01",
    "coordinateFrame": "MOON_ME",
    "latitudeDeg": -89.527,
    "longitudeEastDeg": 205.408,
    "surfaceElevationKm": 2.0855,
    "observerHeightM": 2.0,
    "horizonsObserverAltKm": 2.0875,
    "demDatasetId": "LRO-L-LOLA-3-GDR-V1.0:LDEM_85S_20M",
    "demScaleFactor": 0.5,
    "ephemerisSource": "NASA_JPL_HORIZONS_DE441",
    "ephemerisStepSize": "10m",
    "azimuthStepDeg": 0.25,
    "solverAlgorithmVersion": "2.1.0-event-split-brent",
    "rootBracketToleranceSeconds": 1.0,
    "servedFromCache": true
  },
  "horizonProfile": {
    "azimuthStepDeg": 0.25,
    "smoothSphereDipDeg": -0.087,
    "nominalDeg": [1.42, 1.44, 1.48],
    "optimisticLowDeg": [1.34, 1.36, 1.40],
    "conservativeHighDeg": [1.50, 1.52, 1.56],
    "obstructionDistKm": [14.2, 14.2, 14.4],
    "peakLdecCount": [2, 1, 0]
  },
  "metrics": {
    "intervalTotalHours": 720.0,
    "sunUpperLimbHours": { "nominal": 618.4, "conservativeLow": 594.1, "optimisticHigh": 635.2 },
    "sunFullDiskHours": { "nominal": 582.1, "conservativeLow": 558.0, "optimisticHigh": 601.4 },
    "meanSolarDiskFraction": { "nominal": 0.842, "conservativeLow": 0.811, "optimisticHigh": 0.868 },
    "hoursBlockedSpecificallyByTerrain": 64.2,
    "longestContinuousSunlightHours": 412.5,
    "longestContinuousDarknessHours": 48.3,
    "earthCenterClearHours": { "nominal": 362.1, "conservativeLow": 349.0, "optimisticHigh": 374.5 },
    "earthFullDiskClearHours": { "nominal": 318.4, "conservativeLow": 304.2, "optimisticHigh": 331.0 },
    " earthAnyLimbClearHours": { "nominal": 405.8, "conservativeLow": 392.1, "optimisticHigh": 418.9 },
    "combinedSunAndEarthHours": { "nominal": 318.6, "conservativeLow": 298.4, "optimisticHigh": 336.1 }
  },
  "intervals": {
    "sunUpperLimb": [
      {
        "startUtc": "2026-11-01T00:00:00Z",
        "endUtc": "2026-11-09T22:18:14Z",
        "durationHours": 214.3,
        "startBoundaryType": "already_visible_at_interval_start",
        "endTerrainSensitivityBracketUtc": ["2026-11-09T20:11:00Z", "2026-11-10T00:42:00Z"]
      }
    ],
    "earthCenter": [],
    "combinedOverlap": []
  },
  "samples": []
}
```

### 3.4 `POST /api/v1/scenarios/compare`
Accepts `{ scenarioA: ScenarioRequest, scenarioB: ScenarioRequest }`, executes both through the deterministic evaluation pipeline, aligns their timelines, and computes the exact delta comparison block.

---

## 4. Caching, Versioning & Invalidation Architecture

### 4.1 Two-Level Content-Addressable Cache
1. **Level 1 — Horizon Profile Store (`data/curated-horizons.json` + `cache/horizons/`):**
   - **Cache Key (`horizonHash`):**
     `sha256(canonicalJson({ latDeg, lonEastDeg, observerHeightM, demDatasetId, demSha256, demScaleFactor, azimuthStepDeg, raycasterVersion }))`
   - **Retention:** Indefinite until the DEM dataset or ray-marching algorithm version changes.
2. **Level 2 — Ephemeris Time-Series Cache (`cache/ephemeris/`):**
   - **Cache Key (`ephemerisHash`):**
     `sha256(canonicalJson({ latDeg, lonEastDeg, horizonsObserverAltKm, startUtc, stopUtc, stepSize, quantities: "4,5,13,20", apparent: "AIRLESS" }))`
   - **Retention:** Persistent on disk. Pre-warmed for curated demo windows; dynamically populated on-demand whenever a user requests a new date in 2026, 2027, or 2029.
3. **Level 3 — Evaluated Scenario Result Cache (`cache/results/`):**
   - **Cache Key (`scenarioFingerprint`):**
     `sha256(horizonHash + "_" + ephemerisHash + "_" + solverAlgorithmVersion + "_" + earthVisibilityRule)`

---

## 5. Error Handling & Six-State Result Degradation Policy

The backend enforces a strict state machine that prevents silent failures or invented data:
1. **`valid`:** All inputs within verified high-res DEM footprint and ephemeris span; zero missing ray segments; all validation checks pass.
2. **`valid-with-limitations`:** Computation succeeded, but relies on interpolated DEM pixels (`LDEC == 0`) or medium-resolution regional DEM (`20 m/px` or `60 m/px`); limitations are listed in `statusReasons`.
3. **`approximate`:** Location lies outside polar DEM coverage (e.g., equatorial *Apollo 11* educational baseline if local DEM patch is omitted) and is evaluated against the smooth reference sphere (`θ_mask = θ_dip`) with an explicit banner.
4. **`incomplete`:** One or more radial horizon rays encountered `NODATA` segments or exited the DEM boundary prior to `s_bound(θ_curr)` without a fallback DEM loaded.
5. **`unsupported`:** Requested UTC interval falls outside ephemeris coverage or coordinates are invalid.
6. **`failed`:** Upstream JPL Horizons API timeout on an uncached date or checksum failure; returns structured error code and diagnostic ID without rendering fake chart numbers.
