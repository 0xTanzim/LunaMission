# Product Requirements Document (PRD) — LunaMission
**Project:** LunaMission — Lunar Landing Site Navigator  
**Challenge:** NASA Space Apps Challenge 2026  
**Document Version:** 2.0.0 (Post-R&D Audit Baseline)  
**Status:** Approved Baseline for Implementation

---

## 1. Executive Summary & Problem Statement

### 1.1 The Operational Problem
Missions to the Moon's south polar region (`80°S` to `90°S`) operate in an extreme, coupled geometric environment:
1. **Grazing Solar Illumination:** Because the Moon's spin axis is tilted by only `1.5424°` relative to the ecliptic plane, the Sun never rises high overhead at the poles. Instead, it sweeps horizontally around all `360°` of azimuth once per synodic cycle (`~29.53 Earth days`) at low elevations. Local topographic ridges and crater walls up to `100+ km` away cast long shadows that dictate when solar arrays are illuminated or plunged into cryogenic darkness.
2. **Libration-Modulated Earth Visibility:** While the Moon is tidally locked, orbital eccentricity and inclination cause optical and physical libration (`±6.69°` in latitude over `27.21 days`, `±7.9°` in longitude over `27.55 days`). From a south-polar site, Earth weaves a bounded trajectory near the local horizon, periodically dipping behind local terrain and cutting off Direct-to-Earth (DTE) line-of-sight communication.
3. **Schedule & Location Volatility:** When hardware delays or launch slips shift a mission's landing date by days or weeks, the relative phase between the solar azimuth cycle and Earth's libration cycle changes completely.

### 1.2 The Tooling Gap
Existing authoritative NASA systems solve isolated pieces of this workflow:
- **JPL Horizons** computes high-precision smooth-sphere ephemerides (`R = 1737.4 km`) for a single coordinate at a time, but has zero knowledge of local mountains or crater walls.
- **LROC QuickMap** and **NASA Moon Trek** provide rich GIS layers and pre-rendered illumination visuals, but do not allow rapid, side-by-side multi-scenario comparisons of coupled Sun + Earth operational windows across arbitrary custom dates.

### 1.3 Product Vision
**LunaMission** is a **Terrain-Aware Lunar Scenario & Trade-Off Decision Simulator**. It bridges the gap between raw planetary ephemerides and high-resolution Lunar Orbiter Laser Altimeter (LOLA) topography, enabling mission planners, educators, and students to evaluate and compare landing site and launch-date combinations in seconds—with full scientific provenance and explicit uncertainty reporting.

---

## 2. Target Users & Core Workflows

| User Persona | Primary Goal | Key Decisions Supported | UI Mode |
| :--- | :--- | :--- | :--- |
| **1. Mission Planners & Systems Engineers** | Evaluate how site selection, mast height, and launch delays impact sunlit and DTE line-of-sight windows. | Down-selecting backup coordinates; quantifying "launch-slip" resilience; identifying specific blocking ridges. | **Tactical Planner View** (Full metrics, sensitivity brackets, provenance audit). |
| **2. Educators & University Students** | Understand why polar orbital mechanics and topography differ radically from equatorial (Apollo) missions. | Comparing Apollo 11 vs. Shackleton Connecting Ridge vs. Shackleton Crater Floor (PSR). | **Explorer / Comparison View** (Visual causality between 360° skyline and timeline). |
| **3. General Public & Space Enthusiasts** | Explore where Artemis III and CLPS landers are going and why water-ice craters are next to sunlit peaks. | Replaying historical missions (IM-1 *Odysseus*, IM-2 *Athena*) and exploring Artemis III candidate regions. | **Guided Scenario Presets** (1-click mission replay). |

### 2.1 Concrete User Scenarios
- **Scenario A (Site-to-Site Comparison):** A user selects two candidate points (e.g., *Connecting Ridge CR01* vs. *de Gerlache Rim 2 dGR201*) for the same 30-day November 2026 interval and compares their continuous solar access, Earth DTE line-of-sight windows, and simultaneous overlap (`Sun AND Earth`).
- **Scenario B (Schedule Change / Launch-Slip Triage):** A user locks a candidate site, sets a baseline landing date (`T_0`), and shifts Scenario B to a delayed date (`T_0 + 14 days` or a future year like `2027` or `2029`) to inspect how Earth's libration phase shifts relative to local mountain obstructions.
- **Scenario C (Topographic Obstruction Inspection):** A user clicks a shadowed interval on the timeline where smooth-sphere ephemeris predicts the Sun is above `0°`, and inspects the `360°` Horizon Sky-Ribbon to see the exact azimuth, elevation angle, and radial distance of the blocking lunar ridge.
- **Scenario D (Educational Latitude & PSR Contrast):** A student compares *Apollo 11* (`0.67°N`, overhead Sun, permanent high Earth), *Connecting Ridge* (`89.5°S`, grazing 360° Sun), and *Shackleton Crater Floor* (`89.9°S`, permanently shadowed cold trap).

---

## 3. Geographic & Catalogue Scope

### 3.1 Geographic Scope Tiers
1. **Primary Polar Analytical Domain (`80°S` to `90°S`):** Supported by regional LOLA South Polar stereographic DEMs (`20 m/px` and `60 m/px`), with an **Artemis High-Fidelity Sub-Zone (`84°S` to `90°S`)** where localized `5 m/px` PGDA DEMs and uncertainty products are available.
2. **Global Educational Contrast Presets (Outside `80°S`):** Selected historical reference sites (*Apollo 11* at `0.6741°N`, *Chandrayaan-3* at `-69.3676°S`, *Chang'e-4* at `-45.4446°S` far side) included for comparative education, explicitly badged with their terrain mode and coverage scope.

### 3.2 Five-Layer Site Registry Distinction
LunaMission strictly prohibits collapsing regions, research points, and historical touchdowns into a single undifferentiated list:
1. **`candidate_region`:** NASA's 9 updated Artemis III Candidate Landing Regions (Oct 2024 release). Stored as regional footprints; representative points inside them are explicitly labeled as *Representative Evaluation Points, Not Approved Touchdown Coordinates*.
2. **`research_candidate_point`:** Peer-reviewed study coordinates (e.g., Wueller et al. 2026 130-point Zenodo dataset `CR01`, `dGR201`; Mazarico et al. 2011 Peak `SP-1`).
3. **`historical_touchdown`:** Verified post-landing coordinates from LROC/PDS (*IM-1 Odysseus*, *IM-2 Athena*, *Chandrayaan-3*, *Apollo 11*).
4. **`negative_control`:** Scientific benchmark coordinates (*Shackleton Interior Floor PSR*, *Chang'e-4 Far Side*).
5. **`custom_coordinate`:** User-specified `(lat, lon)` evaluated if and only if valid DEM coverage is verified.

---

## 4. Prioritized Feature Requirements & Acceptance Criteria

| Priority | Feature ID & Name | User Problem Solved | Concrete Acceptance Criterion |
| :--- | :--- | :--- | :--- |
| **P0** | **F1. Typed Multi-Layer Site Registry** | Prevents confusing regions with approved landing points. | API & UI display `entityType`, `coordinateSource`, `coordinateStatus`, `MOON_ME` frame, and `demCoverageStatus` for every location. |
| **P0** | **F2. 360° Terrain-Aware Horizon Sky-Ribbon** | Visualizes how local mountains block the low-angle Sun and Earth. | Plots the `0°–360°` LOLA terrain horizon mask `θ_mask(Az)`, the `0°` smooth-sphere horizon line, the solar trajectory, and Earth's libration trajectory, clearly highlighting intervals where `El > 0°` but `El < θ_mask`. |
| **P0** | **F3. Event-Refined Visibility Timeline (Gantt)** | Shows exact start, end, and duration of operational windows. | Displays synchronized bars for `Solar Access (Full / Partial Disk / Occluded)`, `Earth DTE (Full Disk / Center / Any Limb / Occluded)`, and `Combined Overlap`, with transition times refined via event-splitting root isolation. |
| **P0** | **F4. Scenario A vs. Scenario B Comparator** | Enables rapid trade-offs across sites or delayed launch dates. | Supports side-by-side comparison of two sites or two date intervals with synchronized timelines and explicit delta metrics (`Δ Sunlit Hours`, `Δ Earth DTE Hours`, `Δ Overlap Hours`). |
| **P0** | **F5. Dynamic Past/Present/Future Date Engine** | Supports historical replay (1969, 2024), 2026 baseline, and future planning (2027–2035+). | Reuses versioned static horizon masks and dynamically resolves/caches JPL Horizons topocentric ephemerides (`QUANTITIES='4,5,13,20'`) for any requested UTC interval inside DE440/441 coverage. |
| **P0** | **F6. Provenance, Status & Sensitivity Drawer** | Prevents black-box mistrust and false precision. | Every result displays its 6-state validity status (`valid`, `valid-with-limitations`, `approximate`, `incomplete`, `unsupported`, `failed`), DEM/ephemeris versions, and terrain-perturbation sensitivity brackets `[θ_low, θ_nom, θ_high]`. |
| **P1** | **F7. 2D South Polar Stereographic Selector Map** | Provides spatial context for ridges, craters, and PSRs. | Renders `80°S–90°S` map with Artemis III region footprints, curated points, and coverage boundaries. |
| **P1** | **F8. Observer Mast Height Selector** | Shows impact of lander deck (`2 m`) vs. solar tower (`10 m`). | Changing observer height loads/computes the corresponding height-specific horizon profile and invalidates mismatched height caches. |
| **P1** | **F9. Reproducible Scenario Export (JSON/CSV)** | Allows engineers to audit or share a scenario run. | Exports time-series, transition intervals, and the complete `ProvenanceManifest` (including SHA-256 configuration fingerprint). |
| **P2** | **F10. Parametric Idealized Solar Irradiance Proxy** | Gives first-order intuition on vertical vs. flat panels. | Optional overlay computing idealized incident flux (`W/m²`) only when user explicitly selects panel pose assumptions; never labeled as guaranteed bus power. |

---

## 5. Explicit Non-Goals & Scientific Honesty Boundaries

To maintain scientific integrity, LunaMission **explicitly excludes** the following claims:
1. **No Guaranteed Electrical Power Claims:** Geometric sunlight access does not account for solar cell efficiency, thermal derating, MPPT conversion losses, shadowing from spacecraft appendages, or lunar dust accumulation.
2. **No Guaranteed RF Communication Link Closure:** Geometric Earth line-of-sight does not account for antenna gain patterns, knife-edge regolith diffraction, multipath fading, transmit EIRP, or Deep Space Network (DSN) ground-station scheduling.
3. **No Certified Landing Safety or Hazard Clearance:** A `5 m/px` or `20 m/px` DEM (where up to `90%` of `5 m` pixels are interpolated between LOLA tracks) cannot detect sub-meter boulders or terminal descent slope hazards.
4. **No Universal "Best Site" Ranking Score:** Because science teams and engineering teams weight PSR proximity, sunlight duration, and DTE visibility differently, the tool exposes transparent trade-offs rather than an arbitrary single score.
5. **No Live Spacecraft Telemetry Operations:** The platform is a predictive and forensic geometric planning tool, not a real-time mission control telemetry display.
