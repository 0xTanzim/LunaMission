# Data Taxonomy, Governance & Site Registry Specification (DATA_TAXONOMY.md)
**Project:** LunaMission — Lunar Landing Site Navigator  
**Document Version:** 2.0.0 (Audited Baseline)

---

## 1. Five-Tier Scientific Data Lifecycle Taxonomy

LunaMission enforces strict separation across data categories based on their physical meaning, temporal invariance, and caching rules.

| Tier | Category Name | Concrete Examples | Temporal Behavior | Reuse & Caching Rule |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1** | **Static Physical Surface Data** | NASA PDS / GSFC PGDA LOLA DEM rasters (`LDEM_85S_20M`, `LDEM_80S_60M`, `Site01–Site11 5m`), `LDEC` count maps, RMS vertical error maps (`ERR`), `MOON_ME` reference sphere (`R = 1737.4 km`), PSR polygons. | Physically invariant on mission timescales (erosion `< 1–2 mm / Myr`). | Stored as immutable, versioned binary/GeoTIFF assets (`dataset_id`, `sha256`). Valid across all past, present, and future dates until superseded by a revised survey. |
| **Tier 2** | **Historical Mission & Observation Records** | Verified touchdown coordinates (*IM-1 Odysseus*, *IM-2 Athena*, *Chandrayaan-3*, *Apollo 11*), historical landing dates, LROC NAC localization metadata. | Immutable historical records tied to specific past events. | Stored with explicit `coordinateSource` and `coordinateStatus`. Used for historical mission replay and validation; past illumination schedules are **never** reused as future predictions. |
| **Tier 3** | **Time-Dependent Astronomical Models** | NASA JPL Ephemerides (`DE440` spanning 1550–2650 CE; `DE441` spanning -13,200 to +17,191 CE), lunar orientation models (`MOON_PA` / `MOON_ME`), leap-second tables (`UTC -> TDB`). | Continuous mathematical functions of dynamical time `t_TDB`. | Evaluated dynamically at the exact requested epoch `[t_start, t_end]`. A model released in 2021 (`DE440`) is 100% valid for 2026–2050+ calculations. |
| **Tier 4** | **Derived Spatiotemporal Data** | `360°` terrain horizon profiles `θ_mask(Az)` (`[θ_low, θ_nom, θ_high]`), topocentric time series `(Az, El, dAz/dt, dEl/dt, α, delta)`, visibility intervals `[t_rise, t_set]`, summary metrics. | Deterministic outputs of pure functions `F(Tier 1, Tier 3, ScenarioConfig)`. | **Horizon Profile:** Time-invariant; cached indefinitely by `horizonHash`.<br>**Visibility Series:** Date-specific; cached by full `scenarioFingerprint`. |
| **Tier 5** | **Current Wall-Clock / Live Telemetry** | Wall-clock `now` evaluation vs. real-time spacecraft attitude/bus telemetry and active DSN lock status. | Ephemeral. | Wall-clock `now` is simply evaluating Tier 4 at `t = Date.now()`. Live spacecraft telemetry is out of scope for predictive planning. |

---

## 2. Five-Layer Location & Site Registry Architecture

LunaMission prohibits collapsing regions, research points, and touchdowns into an untyped list. Every entry in `data/sites-registry.json` conforms to one of five entity layers and carries seven mandatory provenance fields.

### 2.1 Mandatory Schema for Site Registry Entries
```json
{
  "siteId": "res-cr01",
  "displayName": "Connecting Ridge (Wueller CR01 Point)",
  "entityType": "research_candidate_point",
  "coordinate": {
    "latitudeDeg": -89.5270,
    "longitudeEastDeg": 205.4080,
    "signedLongitudeDeg": -154.5920,
    "coordinateFrame": "MOON_ME",
    "longitudeConvention": "east_positive_0_360",
    "referenceSphereRadiusKm": 1737.4,
    "surfaceElevationMeters": null,
    "observerHeightMeters": 2.0
  },
  "provenance": {
    "coordinateSource": "Wueller et al. (2026), JGR: Planets, DOI: 10.1029/2025JE009434, Table A1; Zenodo DOI: 10.5281/zenodo.17084058",
    "coordinateStatus": "verified_research_point",
    "regionMembership": "Connecting Ridge (2022 13-region set; verify intersection with Oct 2024 9-region update)",
    "regionMembershipSource": "Wueller et al. (2026) Table A1",
    "demCoverageStatus": "covered_by_LDEM_85S_20M_and_PGDA_5M",
    "validationStatus": "not_yet_executed"
  }
}
```

### 2.2 Master Audited Site Registry Table

All coordinates are normalized to `MOON_ME` (`R = 1737.4 km`), East-positive longitude `[0°, 360°)` (with signed `[-180°, +180°]` in parentheses).

| Site ID | Display Name | `entityType` | `MOON_ME` Lat, East Lon | `coordinateSource` | `coordinateStatus` | Operational & Validation Role |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`res-sp1-mazarico`** | **Connecting Ridge (`SP-1` Peak)** | `research_candidate_point` | `-89.4500°S`, `222.6900°E` (`-137.3100°W`) | Mazarico et al. (2011), *Icarus* 211, Table 1 Peak #1 | `verified_research_point` | **Stage 3A External Benchmark:** `5.21 km` geodesic separation from `CR01`. Used to validate mean solar disk fraction against Mazarico Table 1. |
| **`res-cr01`** | **Connecting Ridge (`CR01` Point)** | `research_candidate_point` | `-89.5270°S`, `205.4080°E` (`-154.5920°W`) | Wueller et al. (2026), *JGR: Planets*, Table A1 / Zenodo `17084058` | `verified_research_point` | **Stage 3B External Benchmark:** Used to validate midsummer consecutive favorable illumination days against Wueller et al. (2026). |
| **`res-dgr201`** | **de Gerlache Rim 2 (`dGR201` Point)** | `research_candidate_point` | `-88.3890°S`, `291.1350°E` (`-68.8650°W`) | Wueller et al. (2026), *JGR: Planets*, Table A1 / Zenodo `17084058` | `verified_research_point` | **Stage 3B Secondary Benchmark & A/B Comparator:** Research candidate inside de Gerlache Rim 2 region. |
| **`res-nobile2-dm2`** | **Nobile Rim 2 (`DM2` Point)** | `research_candidate_point` | `-84.2016°S`, `60.6999°E` | Published multi-criteria landing study (`84°12'5.61"S, 60°41'59.61"E`) | `verified_research_point` | Model-dependent research point inside Nobile Rim 2 (not an official NASA target). |
| **`region-malapert`** | **Malapert Massif (Region Rep. Point)** | `candidate_region` | `-85.9799°S`, `359.7442°E` (`-0.2558°W`) | NASA Oct 2024 Artemis III 9-Region List (Bounding centroid) | `representative_point` | Representative evaluation point inside official Artemis III region (requires region polygon display). |
| **`region-haworth`** | **Haworth (Region Rep. Point)** | `candidate_region` | `-86.7530°S`, `336.3282°E` (`-23.6718°W`) | NASA Oct 2024 Artemis III 9-Region List (Bounding centroid) | `representative_point` | Representative point adjacent to Haworth PSR cold trap. |
| **`region-mouton-plat`** | **Mons Mouton Plateau (Rep. Point)** | `candidate_region` | `-85.4258°S`, `31.8273°E` | NASA Oct 2024 Artemis III 9-Region List (Leibnitz β centroid) | `representative_point` | Broad flat-topped polar plateau in the eastern quadrant. |
| **`region-mouton`** | **Mons Mouton (Region Rep. Point)** | `candidate_region` | `-84.6000°S`, `31.0000°E` | NASA Oct 2024 Artemis III 9-Region List | `representative_point` | Representative point near VIPER and IM-2 target area. |
| **`region-nobile-1`** | **Nobile Rim 1 (Region Rep. Point)** | `candidate_region` | `-85.3100°S`, `31.9300°E` | NASA Oct 2024 Artemis III 9-Region List | `representative_point` | Rugged eastern-sector rim region. |
| **`region-cabeus-b`** | **Peak near Cabeus B (Rep. Point)** | `candidate_region` | `-84.9000°S`, `324.5000°E` (`-35.5000°W`) | NASA Oct 2024 Artemis III 9-Region List | `representative_point` | Official Oct 2024 Artemis III candidate region. |
| **`region-slater`** | **Slater Plain (Region Rep. Point)** | `candidate_region` | `-88.0800°S`, `111.4000°E` | NASA Oct 2024 Artemis III 9-Region List | `representative_point` | Flat plain region added in NASA's Oct 2024 update. |
| **`hist-im2-athena`** | **IM-2 *Athena* Touchdown** | `historical_touchdown` | `-84.7906°S`, `29.1957°E` | NASA PDS (`clps_to_prime1_athena`) & LROC NAC localization | `verified` | Verified March 2025 CLPS soft landing in Mons Mouton region. |
| **`hist-im1-odysseus`** | **IM-1 *Odysseus* Touchdown** | `historical_touchdown` | `-80.1300°S`, `1.4400°E` | NASA LROC NAC Localization Release (Post #1361, Feb 2024) | `verified` | Verified Feb 2024 CLPS soft landing near Malapert-A. |
| **`ctrl-shackleton-psr`**| **Shackleton Crater Interior Point** | `negative_control` | `-89.9000°S`, `0.0000°E` | Zuber et al. (2012), *Nature* 486, 378–381; LOLA PSR map | `test_control_point` | Stage 3.3 physical control point inside Shackleton PSR (`~4.2 km` deep bowl). |
| **`ctrl-change4`** | **Chang'e-4 (*Statio Tianhe*)** | `negative_control` | `-45.4446°S`, `177.5991°E` | LROC NAC Localization (Post #1090) | `verified` | Far-side negative control: Earth is permanently below the horizon (`0.0h` DTE). |
| **`hist-chandrayaan3`** | **Chandrayaan-3 (*Shiv Shakti*)** | `historical_touchdown` | `-69.3676°S`, `32.3481°E` | ISRO Official Spec & LROC NAC (Post #1345) | `verified` | Southern high-latitude reference (outside the `80°S–90°S` polar cap). |
| **`hist-apollo11`** | **Apollo 11 (*Tranquility Base*)** | `historical_touchdown` | `+0.6741°N`, `23.4730°E` | Davies & Colvin (2000) / LROC Apollo Coordinates | `verified` | Equatorial educational baseline (`89°` max Sun elevation, permanent `~66°` Earth). |

---

## 3. Dataset Ingestion Manifest Requirements

Every terrain raster or ephemeris dataset ingested into `data/datasets-manifest.json` must record:
1. `datasetId`: Canonical identifier (e.g., `LRO-L-LOLA-3-GDR-V1.0:LDEM_85S_20M`).
2. `provider` & `sourceUrl`: Authoritative NASA PDS or GSFC PGDA URL.
3. `sha256Checksum`: Verified cryptographic hash of the local file.
4. `crsWkt` & `proj4String`: Exact projection parameters extracted from the file header and verified against the detached PDS `.LBL` label.
5. `dimensions`: `{ lines, lineSamples, pixelSpacingMeters }`.
6. `verticalEncoding`: `{ sampleType, scalingFactor, offsetMeters, nodataValue, referenceRadiusKm: 1737.4, maxElevationMeters, minElevationMeters }`.
7. `companionQualityProducts`: `{ ldecCountRasterId, rmsUncertaintyRasterId, interpolatedPixelFraction }`.
8. `licenseAndAttribution`: NASA PDS public domain citation string.
