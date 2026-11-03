# LunaMission — Flight Deck Operations & User Guide

**System:** LunaMission — Lunar Landing Site Navigator (NASA Space Apps Challenge 2026)  
**Applicable Route:** `/` (Interactive Cockpit)  
**Standard:** WCAG 2.1 AA Keyboard Navigable / 60 FPS Scientific Visualizations  

---

## 🎯 Overview & Mission Purpose

LunaMission is a deterministic lunar geometry and landing-site decision-support platform designed to evaluate candidate touchdown sites across the lunar south pole ($80^\circ\text{S} - 90^\circ\text{S}$). 

This guide provides operational workflows for mission planners, flight dynamics engineers, educators, and students navigating the five integrated flight deck workspaces.

---

## 🧭 The 5 Flight Deck Workspaces

Switch between workspaces using the top cockpit navigation bar or standard aerospace keyboard shortcuts (`Alt+1` through `Alt+5`):

```
┌────────────────────────────────────────────────────────────────────────┐
│  [Alt+1: Site Map]  [Alt+2: Analyze]  [Alt+3: Compare]  [Alt+4: 3D Lab] │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Workspace 1: Polar Site Map (`Alt+1` / `/explore`)
**Focus:** South Polar Cartography, Scientific Layers, and Site Inspection.

1. **Interactive Polar Stereographic Map:**
   - Centers on the Lunar South Pole ($90^\circ\text{S}$).
   - Displays all 20 curated NASA candidate landing zones, historical touchdown points (Apollo 11, Chang'e 6), and negative control baselines.
2. **Scientific Map Layers:**
   - **Topography (LOLA):** False-color NASA SVS 3727 elevation ramp ranging from $-9.0\text{ km}$ (deep crater floors) to $+6.5\text{ km}$ (massif peaks).
   - **Volatiles & Neutrons (LEND):** Thermal neutron suppression proxy indicating potential water-ice and hydrogen abundance.
   - **Surface Temperature (Diviner):** Maximum and minimum cryogenic temperatures; highlights Permanently Shadowed Regions (PSRs, $< 40\text{ K}$).
   - **Surface Slope:** Highlights landing hazards where local slope exceeds $15^\circ$.
3. **Point Passport & Inspector Dock:**
   - Click any landing site marker or enter arbitrary coordinates in the **Coordinate Inspector** to inspect topocentric coordinates, elevation datum ($1,737,400\text{ m}$ reference sphere), and local terrain slope.

---

### Workspace 2: Mission Analysis (`Alt+2` / `/analyze`)
**Focus:** Topocentric Horizon Obscuration & Illumination Corridors.

1. **$360^\circ$ Topocentric Horizon Sky-Ribbon:**
   - Displays the local terrain mask $\theta_{\text{mask}}(\text{Az})$ ray-marched from NASA LOLA $20\text{m}$ DEMs.
   - Overlays the apparent path of the Sun (grazing solar trajectory at $\le 1.5424^\circ$ obliquity) and Earth (libration ellipse modulating by $\pm 6.69^\circ$ latitude and $\pm 7.9^\circ$ longitude).
2. **Operational Gantt Timeline:**
   - Identifies continuous sunlight intervals, grazing partial limb events, and cryogenic terrain shadows.
   - Color-coded with distinct hatching patterns for full color-blind accessibility.
3. **Launch-Slip & Date Adjuster:**
   - Shift the mission epoch by $\pm 24\text{ hours}$ or $\pm 7\text{ days}$ to evaluate launch window resilience against lunar diurnal cycles ($29.53\text{ Earth days}$).

---

### Workspace 3: Multi-Site Compare (`Alt+3` / `/compare`)
**Focus:** Multi-Criteria Decision Analysis & Non-Dominated Pareto Ranking.

1. **Trade-Study Formulation:**
   - Select up to 4 candidate sites to compare on identical UTC timelines.
2. **The Three-Tier CASSA Evaluation:**
   - **Tier 1 (Geometric Feasibility):** Solar elevation margin above local terrain and Earth line-of-sight elevation.
   - **Tier 2 (Geotechnical & Hazard Metrics):** $P_{95}$ terrain slopes, crater density, and landing ellipse clearance.
   - **Tier 3 (Scientific Yield & Infrastructure):** DSN communication link budget margins and proximity to verified volatiles/PSRs.
3. **Pareto Frontier:**
   - Highlights non-dominated landing sites where no other site simultaneously offers higher sunlight, lower slope, and better communications.

---

### Workspace 4: Planetary Theater & 3D Lab (`Alt+4` / `/scenario/3d-lab`)
**Focus:** High-Fidelity 3D Surface Environment, Rover Simulation & Visor HUD.

1. **Exploration Rover Simulation:**
   - Drive the lunar exploration rover across the south-polar terrain.
   - **Controls:** `W` (Accelerate), `S` (Brake/Reverse), `A` / `D` (Steer), `Space` (Handbrake).
   - Real-time slope pitch/roll physics and speedometer.
2. **Astronaut xEMU Helmet Visor HUD:**
   - Toggle the EVA Helmet overlay (`H` key) to inspect artificial horizon, pitch/roll ladder, compass bearing, and sun-vector direction.
3. **The 8 Camera Presets:**
   - `1` / `nadir`: Top-down polar cap view.
   - `2` / `site`: Framed descent view of the active target.
   - `3` / `horizon`: Eye-level topocentric skyline view.
   - `4` / `eva`: Astronaut third-person walking camera.
   - `5` / `earth_align`: Camera aimed directly along the Earth line-of-sight vector.
   - `6` / `orbit360`: Cinematic orbital sweep.
   - `7` / `north_look`: Looking north toward the equator.
   - `8` / `sunward_terminator`: Oriented toward the grazing solar vector.

---

### Workspace 5: Photorealistic Cesium Globe (`Alt+5` / `/scenario/cesium-globe`)
**Focus:** Global Planetary Context & Global Lunar Terrain.

- High-resolution lunar basemap streamed via Cesium Ion.
- Whole-Moon context showing the transition from the near-side mare basins to the far-side highlands and South Pole-Aitken (SPA) basin.

---

## ⌨️ Complete Keyboard Shortcuts Reference

| Key Combination | Scope | Action |
| :--- | :--- | :--- |
| `Alt + 1` | Global | Switch to **Site Map** (`/explore`) |
| `Alt + 2` | Global | Switch to **Analyze** (`/analyze`) |
| `Alt + 3` | Global | Switch to **Compare** (`/compare`) |
| `Alt + 4` | Global | Switch to **3D Lab** (`/scenario/3d-lab`) |
| `Alt + 5` | Global | Switch to **Cesium Globe** (`/scenario/cesium-globe`) |
| `Escape` | Global | Close open drawers, modals, or reset focus |
| `Space` | Timeline | Play / Pause mission timeline progression |
| `[` / `]` | Timeline | Step timeline backward / forward by 1 hour |
| `W`, `A`, `S`, `D` | 3D Lab | Drive Exploration Rover |
| `H` | 3D Lab | Toggle Astronaut Helmet Visor HUD |
| `1` – `8` | 3D Lab | Select Camera Presets (`nadir`, `site`, `horizon`, etc.) |
| `R` | 3D Lab | Reset Rover position and orientation |

---

## 🛡️ Understanding Scientific Data Trust Badges

LunaMission rejects binary pass/fail illusions. Every evaluation returns an explicit **Six-State Epistemic Telemetry Flag**:

| Status Badge | Meaning | Operational Consequence |
| :--- | :--- | :--- |
| **`valid`** | Fully verified against LOLA DEMs and JPL Horizons DE421 ephemeris. | Mission planning quality; reliable for quantitative trade studies. |
| **`valid-with-limitations`** | Minor terrain approximations or DEM boundary interpolation used. | Usable for preliminary site down-selection. |
| **`approximate`** | High ray elevation angle or uncalibrated mast height parameter. | Order-of-magnitude estimate; requires dedicated DEM ray-marching. |
| **`incomplete`** | Horizon ray extended beyond DEM raster boundaries ($s > s_{\text{bound}}$). | Incomplete terrain coverage; reported values represent lower bounds. |
| **`unsupported`** | Target coordinates outside south-polar coverage ($< 80^\circ\text{S}$). | Out of scope; platform suggests nearest supported candidate. |
| **`failed`** | Upstream telemetry timeout or malformed parameters. | Non-blocking error banner displayed with retry affordance. |
