# Scientific Foundations & Mathematical Derivations (SCIENCE_FEASIBILITY.md)
**Project:** LunaMission — Lunar Landing Site Navigator  
**Document Version:** 2.0.0 (Audited Mathematical Baseline)

---

## 1. Lunar Orbital Mechanics & Polar Illumination Physics

### 1.1 Fundamental Orbital & Rotational Periods
- **Sidereal Month (Orbit & Spin Period relative to inertial space):** `P_sid = 27.3216615 Earth days`.
- **Synodic Month (Solar Phase & Diurnal Azimuth Cycle):** `P_syn = 29.53058886 Earth days` (`708.734 hours`).
- **Draconic Month (Nodal Passage & Latitudinal Libration Cycle):** `P_drac = 27.21222082 Earth days`.
- **Anomalistic Month (Perigee-to-Perigee & Longitudinal Libration Cycle):** `P_anom = 27.55454989 Earth days`.
- **Draconic / Eclipse Year (Polar Solar Seasonal Cycle):** Because the lunar ascending node regresses westward along the ecliptic with a period of `18.61 years` (`6798.38 days`), the Sun returns to the same lunar node every `Y_drac = 346.620075 Earth days`.

### 1.2 Cassini's Laws & Why the South Pole is Unique
1. The Moon's spin axis is inclined by only **`I_ecl = 1.5424°`** relative to the ecliptic normal. Therefore, the selenographic latitude of the sub-solar point `φ_sun(t)` is bounded within `[-1.5424°S, +1.5424°N]`. At a polar site (`85°S–90°S`), the Sun's smooth-sphere elevation never exceeds `+(90° - |φ|) + 1.5424°`, while its azimuth sweeps through `360°` at an average rate of:
   `dAz_sun / dt ≈ 360° / 708.734 h ≈ 0.5079° / hour`
2. The Moon's orbit is inclined by `i_orb = 5.145°` to the ecliptic, and by Cassini's Third Law, the lunar equator and orbital plane precess on opposite sides of the ecliptic normal. Their tilts add (`5.145° + 1.5424° = 6.6874°`), causing **optical libration in latitude** of **`±6.69°`** (period `P_drac = 27.21 d`), while orbital eccentricity (`e ≈ 0.0549`, Moon-Earth distance varying from `~356,400 km` extreme perigee to `~406,700 km` extreme apogee, with mean perigee `~362,600 km` and mean apogee `~405,400 km`) causes **optical libration in longitude** of **`±7.9°`** (period `P_anom = 27.55 d`).

---

## 2. Selenographic Reference Frames & Coordinate Conventions

### 2.1 `MOON_ME` vs. `MOON_PA`
- **`MOON_PA` (Principal Axis Frame):** Dynamical body-fixed frame aligned with the Moon's principal moments of inertia used in JPL numerical ephemeris integrations (`DE421`, `DE440`, `DE441`).
- **`MOON_ME` (Mean Earth / Polar Axis Frame):** Cartographic standard adopted by the IAU, USGS, and NASA LRO LOLA team. The prime meridian (`λ = 0°`) aligns with the mean direction of Earth, and the `Z`-axis aligns with the mean rotational pole.
- **Static Frame Offset:** `MOON_PA` and `MOON_ME` differ by a constant rotation matrix (defined in NAIF `moon_de440_220930.tf` as rotations of `-0.1462"`, `+78.5802"`, `+67.5732"`), corresponding to an offset of `~660 meters` at the equator (`~1 km` if legacy `IAU_MOON` frames are confused with `MOON_ME`).
- **Mandatory Normalization:** All site coordinates, DEM rasters, and ephemeris observer specifications in LunaMission use **`MOON_ME`** on the spherical datum of radius:
  `R_MOON = 1,737,400.0 meters (1737.4 km), flattening f = 0.0`
- **Note on `DE421` vs. `DE441` Frame Tie (Risk SR-4):** LOLA GDR rasters are registered in `MOON_ME (DE421)`, while current JPL Horizons queries evaluate in `DE441`. The difference between `DE421 ME` and `DE441 ME` is sub-arcsecond (`< 5 meters` at the surface), which is below the `20 m/px` regional DEM grid spacing and is documented in the provenance manifest.

### 2.2 Local East-North-Up (`ENU`) Topocentric Basis
For an observer at selenographic latitude `φ ∈ [-90°, +90°]` and East-positive longitude `λ ∈ [0°, 360°)`:
- Local East unit vector: `e_hat = [-sin(λ), cos(λ), 0]^T`
- Local North unit vector: `n_hat = [-sin(φ)cos(λ), -sin(φ)sin(λ), cos(φ)]^T`
- Local Up unit vector: `u_hat = [cos(φ)cos(λ), cos(φ)sin(λ), sin(φ)]^T`

For any topocentric unit vector `ρ_hat` pointing from the observer to a celestial body or terrain point:
- `E = ρ_hat · e_hat`, `N = ρ_hat · n_hat`, `U = ρ_hat · u_hat`
- `Elevation (deg) = asin(clamp(U, -1, 1)) * (180 / π)`
- `Azimuth (deg) = (atan2(E, N) * (180 / π) + 360) mod 360` (Clockwise from local True North `0°`).

*Crucial Polar Azimuth Property:* At a point near the South Pole (e.g., `CR01` at `φ = -89.5270°S, λ = 205.4080°E`), local North (`Az = 0°`) points radially away from the South Pole along the `205.4080°E` meridian. Therefore, looking across the South Pole toward Mean Earth (`λ_earth = l'(t) ≈ 0°E`) corresponds to looking at local azimuth:
`Az_earth(t) ≈ (l'(t) - λ + 360°) mod 360° ≈ 154.592° + l'(t)`

---

## 3. Topographic Horizon Ray-Marching & Stopping Bound Mathematics

### 3.1 Exact Spherical-Moon Horizon Elevation Angle
Let the observer sit at surface elevation `z_0` (from the LOLA DEM relative to `R_MOON = 1,737,400.0 m`) plus lander mast height `h_obs`, giving radial distance `r_0 = R_MOON + z_0 + h_obs`.
Along azimuth bearing `Az`, a terrain sample at surface great-circle arc distance `s` has central angle `ψ = s / R_MOON` (in radians) and surface elevation `z(s)`, giving radial distance `r(s) = R_MOON + z(s)`.

By exact trigonometry in the radial-vertical plane containing the Moon's center, the observer, and the terrain point, the topographic elevation angle `θ(s, Az)` relative to the observer's local horizontal plane (`0°`) is:
`θ(s, Az) = atan2( r(s) * cos(ψ) - r_0,  r(s) * sin(ψ) ) * (180 / π)`

For an unobstructed smooth sphere (`z(s) = z_0 = 0`) with `h_obs > 0`, the ideal geometric horizon dips below `0°` by:
`θ_dip = -acos( R_MOON / (R_MOON + h_obs) )` (`≈ -0.08701°` for `h_obs = 2.0 m`).

### 3.2 Generalized Physical Stopping-Distance Bound `s_bound(θ_curr)`
Let `z_max` be the verified maximum surface elevation anywhere in the regional DEM (`r_max = R_MOON + z_max > r_0`). For any central angle `ψ ∈ (0, π/2)`, the maximum possible elevation angle that any terrain of height `≤ z_max` can subtend is:
`tan(θ_max(ψ)) = (r_max * cos(ψ) - r_0) / (r_max * sin(ψ)) = cot(ψ) - (r_0 / r_max) * csc(ψ)`

Since `d/dψ [tan(θ_max(ψ))] = csc²(ψ) * ((r_0 / r_max) * cos(ψ) - 1) < 0`, `θ_max(ψ)` is strictly decreasing with distance `s = R_MOON * ψ`.
Given a running maximum obstruction angle `θ_curr ∈ (-π/2, +π/2)` (in radians) already found along the ray at closer distances, no terrain at any distance `s > s_bound(θ_curr)` can exceed `θ_curr` once `tan(θ_max(ψ)) ≤ tan(θ_curr)`:
`cos(ψ) * cos(θ_curr) - sin(ψ) * sin(θ_curr) ≤ (r_0 / r_max) * cos(θ_curr)`
`cos(ψ + θ_curr) ≤ (r_0 / r_max) * cos(θ_curr)`

Since `0 < (r_0 / r_max) * cos(θ_curr) < 1` for all `r_0 < r_max` and `θ_curr ∈ (-π/2, +π/2)`, solving for `s_bound(θ_curr)` yields the **exact closed-form stopping rule**:
`s_bound(θ_curr) = R_MOON * [ acos( (r_0 / r_max) * cos(θ_curr) ) - θ_curr ]`

- When `θ_curr = 0 rad`: reduces to `s_bound(0) = R_MOON * acos(r_0 / r_max)` (`≈ 124.9 km` for `z_0 = +2000 m, z_max = +6500 m`).
- When `θ_curr = +10°` (`+0.1745 rad`, inside a deep crater): reduces the required search distance to `≈ 53.7 km`.
- When `θ_curr = -1.0°` (`-0.01745 rad`, high peak looking down): extends the required search distance to `≈ 158.8 km`.

---

## 4. Ephemeris Unit Conversions, Hermite Splines & Event-Splitting Solver

### 4.1 JPL Horizons Quantities (`4, 5, 13, 20`) & Exact Conversions
When querying `https://ssd.jpl.nasa.gov/api/horizons.api` with `CENTER='coord@301'`, `COORD_TYPE='GEODETIC'`, `APPARENT='AIRLESS'`, `RANGE_UNITS='KM'`, `CSV_FORMAT='YES'`, and `QUANTITIES='4,5,13,20'`:
1. **Apparent Azimuth & Elevation (Quantity `4`):**
   - Columns: `Azi_(a-app)`, `Elev_(a-app)` in **decimal degrees (`deg`)**.
   - Includes light-time and planetary aberration in vacuum; horizontal solar parallax on the Moon is `asin(1737.4 / 149597870.7) ≈ 0.0006654°` (`2.40 arcsec`), and terrestrial horizontal parallax is `asin(1737.4 / D_earth) ≈ 0.246° to 0.280°`.
2. **Angular Rates (Quantity `5`):**
   - Columns: `d(AZ)*cosE` and `d(EL)/dt` in **arcseconds per minute (`arcsec/min`)**.
   - Exact conversion to **degrees per hour (`deg/h`)**:
     `dEl_dt_deg_hr = d_EL_dt_arcsec_min / 60.0`
     `dAz_dt_deg_hr = d_AZ_cosE_arcsec_min / (60.0 * cos(El_deg * π / 180.0))`
3. **Target Angular Diameter (Quantity `13`):**
   - Column: `Ang-diam` in **arcseconds of equatorial diameter (`arcsec`)**.
   - Exact conversion to **angular radius `α` in degrees (`deg`)**:
     `α_deg = Ang_diam_arcsec / 7200.0`
     *(As Moon-Earth distance varies between `~356,400 km` and `~406,700 km`, `α_earth` varies dynamically between `~0.90°` and `~1.01°`; as Moon-Sun distance varies between `147.1M km` and `152.1M km`, `α_sun` varies between `~0.262°` and `~0.271°`).*
4. **Topocentric Range & Range-Rate (Quantity `20`):**
   - Columns: `delta` in **kilometers (`km`)** (enforced by `RANGE_UNITS='KM'`) and `deldot` in **`km/s`**.

### 4.2 Continuous Azimuth Unwrapping & Two-Point Cubic Hermite Interpolation
1. **Unwrapping Azimuth:** Prior to spline construction, unwrap `Az_i ∈ [0°, 360°)` into a continuous sequence `Az_unwrapped_i ∈ R`:
   `Az_unwrapped_i = Az_unwrapped_{i-1} + ((Az_i - Az_{i-1} + 540°) mod 360° - 180°)`
2. **Exact Two-Point Cubic Hermite Spline:** On step `[t_i, t_{i+1}]` of duration `Δt = t_{i+1} - t_i` with dimensionless parameter `τ = (t - t_i) / Δt ∈ [0, 1]`, using the exact value `y_i, y_{i+1}` (Quantity 4) and exact rate `v_i = dy/dt(t_i), v_{i+1} = dy/dt(t_{i+1})` (Quantity 5):
   `h_00(τ) = 2τ³ - 3τ² + 1`, `h_10(τ) = τ³ - 2τ² + τ`
   `h_01(τ) = -2τ³ + 3τ²`, `h_11(τ) = τ³ - τ²`
   `y_Hermite(τ) = h_00(τ)*y_i + h_10(τ)*Δt*v_i + h_01(τ)*y_{i+1} + h_11(τ)*Δt*v_{i+1}`
   With exact endpoint values and exact endpoint first derivatives, the Cauchy remainder bound is:
   `|y(t) - y_Hermite(t)| ≤ (1 / 384) * max |y^(4)(ξ)| * Δt^4`
   *(Validated empirically in Stage 2.3 against a 1-minute reference query).*

### 4.3 Complete Sub-Interval Event-Splitting & Root Isolation
To integrate visibility durations and overlap windows without missing short double crossings, grazing tangencies, or Earth libration turnarounds:
1. **Step 1 — Azimuth Stationary Splits (`dAz/dt = 0`):**
   Solve the quadratic equation `d/dτ [Az_unwrapped_Hermite(τ)] = 0` on `(0, 1)`. Insert any real roots `τ_rev ∈ (0, 1)` into the partition of `[t_i, t_{i+1}]`. On every resulting sub-segment, `Az(t)` is strictly monotonic.
2. **Step 2 — Horizon Azimuth-Bin Vertex Splits (`Az(t) = Az_k`):**
   On each monotonic azimuth sub-segment, find all discrete horizon mask grid vertices `Az_k` crossed by `Az(t)` and solve `Az_unwrapped_Hermite(τ) = Az_k` to split at each vertex crossing. Within every resulting panel `[t_a, t_b]`, `Az(t)` stays inside a single horizon bin `[Az_k, Az_{k+1}]` where `θ_mask(Az)` has constant slope `m_k = (θ_{k+1} - θ_k) / ΔAz_bin`.
3. **Step 3 — Clearance Stationary Splits (`dg_B/dt = 0` via Rolle's Theorem):**
   Within a single horizon bin `[Az_k, Az_{k+1}]`, the surrogate clearance function
   `g_B(τ) = El_B_Hermite(τ) + c_limb * α_B(τ) - [θ_k + m_k * (Az_unwrapped_Hermite(τ) - Az_k)]`
   is a cubic polynomial in `τ`. Solve the quadratic equation `dg_B/dτ = 0` for all real extrema `τ_ext ∈ (0, 1)` and insert them into the panel partition.
   - If `|g_B(τ_ext)| ≤ ε_tol` (`10^-7 deg`), log a `TANGENTIAL_GRAZE` event.
   - Between adjacent stationary points, `g_B(τ)` is **strictly monotonic**, guaranteeing that any same-sign double crossing inside the bin is split into two opposite-sign brackets `[τ_left, τ_ext]` and `[τ_ext, τ_right]`.
4. **Step 4 — Brent's Method Root Refinement & Exact Overlap Partitioning:**
   On every sub-panel where `g_B(τ_left) * g_B(τ_right) < 0`, refine the root `τ*` via Brent's method to bracket tolerance `δt_bracket ≤ 1.0 second`. Merge and sort all root timestamps across all 5 clearance functions (`Sun Upper Limb`, `Sun Full Disk`, `Sun Smooth Sphere`, `Earth Center`, `Earth Full Disk / Any Limb`) into a single master partition `t_i = T_0 < T_1 < ... < T_m = t_{i+1}`. Because no clearance function changes sign inside `(T_j, T_{j+1})`, evaluating all boolean states at the midpoint `0.5 * (T_j + T_{j+1})` and summing `ΔT_j = T_{j+1} - T_j` integrates all single-body and combined (`Sun AND Earth`) durations without heuristic approximations.

---

## 5. Four-Part Uncertainty & Sensitivity Accounting
LunaMission strictly separates and reports four distinct error/uncertainty sources:
1. **Numerical Root-Bracket Tolerance (`δt_bracket`):** Algorithmic termination width (`≤ 1.0 s`) on the surrogate clearance curve.
2. **Empirical Ephemeris Interpolation Residual (`ε_emp`, `δt_ephem`):** Measured difference between `10m` Hermite-interpolated trajectories and `1m` raw Horizons queries (calibrated in Stage 2.3).
3. **Deterministic Terrain-Perturbation Sensitivity Envelope (`[θ_low, θ_nom, θ_high]`):** Shifts horizon elevations by `±1σ_z` from companion LOLA error rasters (and tracks `LDEC == 0` interpolated pixel counts). Because LOLA interpolation errors are spatially correlated ([Barker et al., 2021, *Planet. Space Sci.* 203, 105119](https://doi.org/10.1016/j.pss.2020.105119)), this band is reported as a **perturbation sensitivity envelope**, not a statistical confidence interval.
4. **Terrain-Induced Transition Time Bracket (`Δt_terrain`):** Because polar vertical grazing rates `|dg/dt|` are small (`~0.01°–0.05°/h`), a `±0.10°` vertical terrain sensitivity induces a multi-hour window shift `[t*(θ_low), t*(θ_high)]` on sunrise/sunset and Earthrise/Earthset times.
