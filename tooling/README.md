# LunaMission — Offline Scientific Preprocessing & Physics Oracle Pipeline

**Location:** `tooling/scripts/`  
**Runtime:** Python 3.11+ / NumPy  
**Purpose:** Deterministic ingestion of NASA LOLA Digital Elevation Models (DEMs), topocentric horizon ray-marching, and independent physics oracle cross-validation against NASA JPL Horizons and NAIF SPICE truth.

---

## 🛰️ Architecture & Pipeline Flow

The live LunaMission application serves pre-indexed, verified horizon masks and ephemeris tables via its NextRush Bun microservice (`apps/api`). The offline Python pipeline is responsible for generating and independently auditing these scientific datasets directly from NASA Planetary Data System (PDS) and USGS Planetary Geodesy & Data Analysis (PGDA) rasters.

```
┌─────────────────────────────────┐
│   NASA PDS / PGDA LOLA DEMs     │
│  (LDEM_85S_20M / LDEM_80S_60M)  │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│      lola_cog_reader.py         │ ─── Ingests Cloud-Optimized GeoTIFFs (COG)
│   (IAU MOON_ME Polar Stereo)    │     Extracts elevation transects along Az
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│      horizon_raymarch.py        │ ─── Spherical curvature elevation angles θ(s)
│  (Closed-Form s_bound Stopping) │     Analytical horizon mask θ_mask(Az)
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│     deep_horizon_audit.py       │ ─── Benchmark validation (Mazarico 2011,
│    physics_oracle_check.py      │     Barker 2021, JPL Horizons DE421/440)
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│    data/curated-horizons.json   │ ─── Output artifact ingested by @luna/api
│   validation/artifacts/*.json   │
└─────────────────────────────────┘
```

---

## 📂 Script Registry

| Script | Responsibility | Primary Inputs & Outputs |
| :--- | :--- | :--- |
| **`lola_cog_reader.py`** | Decodes TIFF/COG directory structures, validates IEEE 32-bit floating-point rasters, and extracts radial elevation profiles across the lunar south pole (`80°S–90°S`). | **In:** NASA LOLA COGs<br>**Out:** Elevation array $z(s)$ |
| **`horizon_raymarch.py`** | Implements the exact spherical-curvature horizon formula $\theta(s, \text{Az}) = \arctan2(r(s)\cos\psi - r_0, r(s)\sin\psi)$ with closed-form stopping distance $s_{\text{bound}}(\theta)$. | **In:** Elevation profile<br>**Out:** Horizon mask array $\theta_{\text{mask}}(\text{Az})$ |
| **`deep_horizon_audit.py`** | Runs statistical residual checks ($P_{05}, P_{50}, P_{95}$) against published landing site coordinates (e.g., Malapert Mountain, Shackleton Rim). | **In:** Candidate site coordinates<br>**Out:** Horizon validation summary |
| **`physics_oracle_check.py`** | Queries NASA JPL Horizons REST API (`coord@301`) to benchmark solar grazing angles and Earth libration vectors against our analytical solvers. | **In:** JPL Horizons quantities `4, 5, 13, 20`<br>**Out:** Convergence residuals |
| **`stress_horizon_raymarch.py`**| Adversarial fuzzer for boundary edge cases (crater bottoms, steep peaks, $0^\circ / 360^\circ$ azimuth wrap). | **In:** Extreme synthetic & real profiles<br>**Out:** Numerical stability proof |

---

## 🚀 Setup & Execution

### 1. Prerequisites
- Python 3.11+
- Virtual environment (recommended)

```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r tooling/requirements.txt
```

### 2. Running Automated Scientific Unit Tests
All algorithms include self-contained unit tests that verify mathematical invariants:

```bash
# Run all Python scientific test suites
python3 -m unittest discover -s tooling/scripts -p "test_*.py"
```

Expected output:
```text
Ran 21 tests in 0.474s
OK
```

### 3. Generating a Horizon Mask
To ray-march a candidate lunar site using the generalized $s_{\text{bound}}$ stopping rule:

```bash
python3 tooling/scripts/horizon_raymarch.py --lat -84.7906 --lon 29.1957 --az-res 0.5 --mast-height 2.0
```

---

## 📜 Scientific Invariants Enforced
1. **Vertical Datum:** All heights $z$ are referenced to the mean lunar sphere $R_{\text{MOON}} = 1,737,400.0\text{ m}$ (zero flattening $f = 0.0$).
2. **Coordinate Frame:** Strictly IAU/NASA `MOON_ME` (Mean Earth / Polar Axis, DE421 / DE440 kernels) with east-positive longitude convention ($0^\circ \le \lambda < 360^\circ$).
3. **No Synthetic Terrain Fallback:** All elevation samples trace directly to verified LOLA data products (`LDEM_85S_20M` / `LDEM_80S_60M`). If a ray exits raster coverage, it is explicitly flagged as `incomplete_range_truncated`.
