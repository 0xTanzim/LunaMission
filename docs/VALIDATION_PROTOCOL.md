# Scientific & Numerical Validation Protocol (VALIDATION_PROTOCOL.md)
**Project:** LunaMission — Lunar Landing Site Navigator  
**Document Version:** 2.0.0 (Final Audited Protocol)  
**Enforcement Policy:** No gate may be marked `PASSED` until the execution script, input hashes, raw outputs, and residual reports are saved in `/validation/artifacts/`.

---

## 1. Validation Philosophy: Convergence vs. Accuracy vs. Sensitivity

LunaMission distinguishes three independent verification pillars:
1. **Numerical Convergence:** Proving that our discretization (radial step `Δs`, azimuthal bin `ΔAz`, ephemeris cadence `Δt`, and root-bracket tolerance `δt_bracket`) is numerically stable relative to finer grids.
2. **Independent Scientific Validation:** Proving that our end-to-end physical model agrees with peer-reviewed studies (Mazarico et al., 2011; Wueller et al., 2026) and NASA JPL Horizons within documented model differences.
3. **Perturbation Sensitivity Analysis:** Quantifying how DEM vertical uncertainty (`σ_z`) and interpolation (`LDEC == 0`) propagate into horizon angle bands `[θ_low, θ_nom, θ_high]` and transition time brackets `Δt_terrain`.

---

## 2. Stage 1: Spatial Terrain & Horizon Model Validation

### Step 1.1 — Raster & Detached Label Metadata Audit
- **Target Products:** `LDEM_85S_20M` (`85°S–90°S` at `20 m/px`) and `LDEM_80S_60M` (`80°S–90°S` at `60 m/px`).
- **Procedure:**
  1. Parse both the detached PDS `.LBL` text label and the GeoTIFF/raster headers (`src.crs`, `src.transform`, `src.scales`, `src.offsets`, `src.nodata`).
  2. Verify that `DN * scaling_factor + offset` reproduces the exact `MINIMUM` and `MAXIMUM` meter values stated in the PDS `.LBL` file.
  3. Record the global maximum elevation `z_max = max(LDEM_80S_60M) + 100.0 m` to parameterize the physical stopping bound `s_bound(θ_curr)`.
- **Artifact:** `/validation/artifacts/step1_1_raster_manifest.json`
- **Current Status:** `NOT_YET_EXECUTED`

### Step 1.2 — Projected Origin, Fractional Pixel & Landmark Control Points
- **Procedure:**
  1. Transform the exact South Pole `(φ = -90.0°, λ = 0.0°)` into raster projected coordinates `(X, Y)` via `pyproj`. Verify `(X, Y) = (0.000 m, 0.000 m)` (`≤ 10^-6 m`).
  2. Apply the inverse affine transform `~src.transform * (0.0, 0.0)` and verify that the fractional pixel position matches `SAMPLE_PROJECTION_OFFSET` and `LINE_PROJECTION_OFFSET` from the `.LBL` file (note: on an even-dimensioned `15200 × 15200` grid, the origin falls at the four-pixel corner intersection `(7599.5, 7599.5)`, not an integer pixel center).
  3. Verify the four cardinal quadrants at `φ = -88.0°S` (`r_polar = 60,652.87 m`) for `λ ∈ {0°E, 90°E, 180°E, 270°E}`.
  4. **Physical Landmark Orientation Check:** Confirm that moving along `+Y` (`λ = 0°E`, toward Mean Earth) to `-86.0°S` samples the **Malapert Massif topographic high (`z > +4,500 m`)**, and that **Shackleton Crater Floor (`-89.9°S, 0.0°E`)** samples a deep depression (`z < -3,500 m`).
  5. Extract and record the bilinearly interpolated surface elevation `z_0` (in meters) and JPL Horizons observer altitude `alt_km = (z_0 + h_obs) / 1000.0` at:
     - Mazarico Peak **`SP-1`** (`φ = -89.4500°S, λ = 222.6900°E`)
     - Wueller Point **`CR01`** (`φ = -89.5270°S, λ = 205.4080°E`; verified geodesic separation from `SP-1` = **`5.21 km`**)
     - Shackleton Interior Test Point **`ctrl-shackleton-psr`** (`φ = -89.9000°S, λ = 0.0000°E`).
- **Artifact:** `/validation/artifacts/step1_2_control_points.json`
- **Current Status:** `NOT_YET_EXECUTED`

### Step 1.3 — Synthetic Analytical Geometry & Stopping-Distance Proofs
- **Procedure:** Run the ray-marcher and generalized stopping inequality
  `s_bound(θ_curr) = R_MOON * [ acos((r_0 / r_max) * cos(θ_curr)) - θ_curr ]`
  against four synthetic test cases:
  1. **Flat Sphere (`z(x,y) = 0 m, h_obs = 2.0 m`):** Must return `θ_dip = -acos(1737400 / 1737402) = -0.08701°` (`±0.005°`).
  2. **Uniform Ring Wall (`Δz = +1000 m` at `s = 10,000 m`, `h_obs = 2.0 m`):** Must return `θ_wall = atan2((1738400 * cos(10/1737.4)) - 1737402, 1738400 * sin(10/1737.4)) = +5.5498°` (`±0.005°`).
  3. **Nodata Wedge (`30°` sector of `MISSING_CONSTANT` pixels):** Must flag azimuth bins `[0°, 30°]` as `binStatus = "incomplete"` and overall status as `"incomplete"`, never substituting `0.0°`.
  4. **Boundary Handoff Test (`θ_curr = -1.0°` where `s_bound(-1.0°) = 158.8 km` exceeds `LDEM_85S_20M` edge at `137.7 km`):** Must either seamlessly hand off the ray to the co-registered `LDEM_80S_60M` raster (extending to `303 km`) or flag `binStatus = "incomplete_range_truncated"`.
- **Artifact:** `/validation/artifacts/step1_3_synthetic_horizon_test.json`
- **Current Status:** `NOT_YET_EXECUTED`

### Step 1.4 — Seam Continuity, Grid Convergence & Terrain Sensitivity Envelope
- **Procedure:**
  1. Measure vertical difference `|z_20m - z_60m|` across a `1 km` overlap collar at the `152 km` boundary of `LDEM_85S_20M` and `LDEM_80S_60M`, verifying angular seam step `Δθ_seam ≤ 0.02°`.
  2. Compute horizon masks for `SP-1` and `CR01` at `ΔAz ∈ {1.0°, 0.5°, 0.25°, 0.1°}` and `Δs ∈ {20 m, 10 m}`. Select the operational `(ΔAz, Δs)` that satisfies `RMS(θ_op - θ_fine) ≤ 0.03°` and downstream sunlit duration difference `≤ 0.2 hours`.
  3. Compute the deterministic perturbation sensitivity envelope `[θ_low(Az), θ_nom(Az), θ_high(Az)]` and record the fraction of horizon-defining pixels with `LDEC == 0` (interpolated) vs. `LDEC > 0` (directly measured), citing Barker et al. (2021, *Planet. Space Sci.* 203, 105119).
- **Artifact:** `/validation/artifacts/step1_4_horizon_convergence.json`
- **Current Status:** `NOT_YET_EXECUTED`

---

## 3. Stage 2: Ephemeris, Hermite Spline & Complete Event-Solver Validation

### Step 2.1 — JPL Horizons `QUANTITIES='4,5,13,20'` Acquisition & Parser Audit
- **Procedure:**
  1. Using the exact `alt_km` extracted in Step 1.2, query JPL Horizons (`CENTER='coord@301'`, `COORD_TYPE='GEODETIC'`, `QUANTITIES='4,5,13,20'`, `RANGE_UNITS='KM'`, `APPARENT='AIRLESS'`, `CSV_FORMAT='YES'`) for Sun (`10`) and Earth (`399`).
  2. Parse columns dynamically by header name (`Date__(UT)__HR:MN`, `Azi_(a-app)`, `Elev_(a-app)`, `d(AZ)*cosE`, `d(EL)/dt`, `Ang-diam`, `delta`).
  3. Verify unit conversions:
     - `el_rate_deg_hr = d_EL_dt / 60.0`
     - `az_rate_deg_hr = d_AZ_cosE / (60.0 * cos(El_rad))`
     - `alpha_deg = Ang_diam / 7200.0`
  4. Verify against derived selenographic kinematic bounds at `CR01` (`El_sun ∈ [-2.018°, +2.013°]`, `Az_earth ≈ 154.59° ± 8.0°`, `D_earth ∈ [356400, 406700] km`).
- **Artifact:** `/validation/artifacts/step2_1_horizons_raw_and_parsed.json`
- **Current Status:** `NOT_YET_EXECUTED`

### Step 2.2 — Analytical Event-Splitting Solver Proofs (6 Edge Cases)
- **Procedure:** Verify that the solver (continuous azimuth unwrapping + `dAz/dt = 0` turnaround split + `Az_k` bin vertex split + Rolle's Theorem `dg_B/dt = 0` extrema split + Brent root-finding) recovers exact analytical intervals (`δt_bracket ≤ 1.0 s`) across six synthetic cases:
  1. **Initial Open Window at `t_0`:** Sun starts visible at `t_0` and sets inside Step 0 (`[0, 3] min` -> duration `= 3.00 min`).
  2. **Vertex Double Crossing:** Narrow mountain spire at bin vertex `Az_k` causes brief eclipse `[4, 6] min` inside a `10 min` step.
  3. **Intra-Bin Same-Sign Double Crossing:** Trajectory stays inside a single azimuth bin `[Az_k, Az_{k+1}]` with `g(t_a) > 0` and `g(t_b) > 0`, but dips below a sloping ridge (`g(τ_ext) < 0`) on `[3, 7] min`. Isolated via quadratic root of `dg_B/dτ = 0`.
  4. **Intra-Bin Tangential Graze:** `g(τ_ext) = 0` and `dg_B/dτ(τ_ext) = 0`; logged as `TANGENTIAL_GRAZE` without corrupting state parity.
  5. **Earth Libration Azimuth Turnaround:** `dAz_earth/dt = 0` occurs at `τ_rev = 0.45` inside step, reversing sweep direction across horizon bins.
  6. **Partial Sun–Earth Overlap:** Sun visible on `[2, 10] min`, Earth visible on `[0, 4] min` -> exact intersection `[2, 4] min` (`2.00 min`).
- **Artifact:** `/validation/artifacts/step2_2_solver_unit_proofs.json`
- **Current Status:** `NOT_YET_EXECUTED`

### Step 2.3 — Empirical Ephemeris Interpolation Residual (`10m` Hermite vs. `1m` Raw)
- **Procedure:** Over a 72-hour window at `CR01`, evaluate the two-point cubic Hermite spline (built from `10m` Horizons Quantity `4` positions and Quantity `5` rates) at 1-minute intervals and compare against a raw `1m` Horizons query. Measure and record empirical max position residual `ε_emp = max |y_Hermite_10m - y_1m|` and empirical root timing shift `δt_ephem`.
- **Artifact:** `/validation/artifacts/step2_3_cadence_convergence.json`
- **Current Status:** `NOT_YET_EXECUTED`

---

## 4. Stage 3: Independent External Scientific Benchmarks

### Step 3.1 — Benchmark 3A: Mazarico et al. (2011) at Peak `SP-1`
- **Target:** Mazarico Table 1 Peak `SP-1` (`φ = -89.4500°S, λ = 222.6900°E`) at `h_obs ∈ {0 m, 2 m, 10 m}`.
- **Matched Metric & Epoch:** Evaluate the **mean visible solar disk fraction** `f_sun_bar` (not binary upper-limb hours) across the published Best Southern Summer lunation (and 18.6-year nodal cycle at 6h steps). Record the empirical residual against Mazarico Table 1 alongside our `[θ_low, θ_high]` sensitivity envelope.
- **Artifact:** `/validation/artifacts/step3_1_mazarico_benchmark.json`
- **Current Status:** `NOT_YET_EXECUTED`

### Step 3.2 — Benchmark 3B: Wueller et al. (2026) at `CR01` and `dGR201`
- **Target:** Wueller Table A1 points `CR01` (`-89.5270°S, 205.4080°E`) and `dGR201` (`-88.3890°S, 291.1350°E`).
- **Matched Metric & Epoch:** Read the exact midsummer UTC date intervals and threshold definitions from the companion Zenodo dataset (`10.5281/zenodo.17084058`). Compute the maximum consecutive days of favorable illumination and combined Sun + Earth visibility, reporting the exact residual and attributing differences to DEM resolution (`5 m` vs. `20 m`) and limb criteria.
- **Artifact:** `/validation/artifacts/step3_2_wueller_benchmark.json`
- **Current Status:** `NOT_YET_EXECUTED`

### Step 3.3 — Shackleton Interior Physical Control Hypothesis Test
- **Target:** `ctrl-shackleton-psr` (`φ = -89.9000°S, λ = 0.0000°E, h_obs = 2.0 m`).
- **Procedure:** Extract `min_Az θ_nom(Az)` from `LDEM_85S_20M` and run a 365-day visibility evaluation. Record the actual extracted minimum crater wall elevation angle and resulting sunlit/DTE hours without hardcoding the output.
- **Artifact:** `/validation/artifacts/step3_3_shackleton_control.json`
- **Current Status:** `NOT_YET_EXECUTED`

---

## 5. Unresolved Scientific Risks Register

1. **SR-1 (2D Sloping Horizon Across Finite Celestial Disks):** A 1D vertical chord at the center azimuth approximates the horizon as flat across the `0.53°` solar disk or `1.9°` Earth disk. In Step 2.2, we quantify the difference between the 1D chord formula and an 11-slice 2D azimuthal integration across `[Az_B - α_B, Az_B + α_B]`.
2. **SR-2 (Spatial Correlation of LOLA Interpolation Errors):** Up to `90%` of `5 m/px` polar pixels are spline-interpolated (`LDEC == 0`; Barker et al., 2021). Therefore, `[θ_low, θ_nom, θ_high]` is strictly reported as a deterministic perturbation sensitivity envelope, not a Gaussian confidence interval.
3. **SR-3 (Multi-Hour Physical Transition Sensitivity at Polar Grazing Angles):** Because `|dg_B/dt|` can be as slow as `0.01°–0.05°/h` near the pole, a `±0.10°` vertical terrain sensitivity creates a multi-hour physical bracket `Δt_terrain` on transition timestamps, even when numerical root isolation `δt_bracket` is `≤ 1.0 s`.
4. **SR-4 (`DE421` DEM Frame vs. `DE441` Horizons Ephemeris Frame):** LOLA GDRs use `MOON_ME (DE421)` while JPL Horizons uses `DE441`. The `< 5 m` frame offset is documented in every result's provenance manifest.
