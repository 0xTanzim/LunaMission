#!/usr/bin/env python3
"""
Adversarial Stress Test & Physics Oracle Verification for curated-horizons.json
"""

import json
import math
import os
import sys
import numpy as np

HORIZONS_PATH = "data/curated-horizons.json"
REGISTRY_PATH = "data/sites-registry.json"
R_MOON = 1737400.0

with open(HORIZONS_PATH, "r") as f:
    horizons = json.load(f)
with open(REGISTRY_PATH, "r") as f:
    registry = json.load(f)

sites_dict = {s["id"]: s for s in registry.get("sites", [])}

print("=== CHECK 1: Blocker Elevation / Distance vs Nominal Angle Geometric Consistency ===")
# For each point, does spherical_elevation_angle(R_MOON + z0 + h, R_MOON + z_blocker, d) match elevationNominalDeg?
recalc_diffs = []
max_diff = 0.0
worst_case = None

for site_id, asset in horizons.items():
    z0 = asset.get("provenance", {}).get("z0_observer_m", 0.0)
    for mh_str, p in asset["profiles"].items():
        mh = float(mh_str)
        r_obs = R_MOON + z0 + mh
        for az in range(360):
            d_km = p["blockerDistanceKm"][az]
            z_b = p["blockerElevationMeters"][az]
            th_nom = p["elevationNominalDeg"][az]
            stat = p["binStatus"][az]

            s_m = d_km * 1000.0
            if s_m <= 0.0:
                calc_th = 0.0
            else:
                psi = s_m / R_MOON
                r_terrain = R_MOON + z_b
                calc_th = math.degrees(math.atan2(r_terrain * math.cos(psi) - r_obs, r_terrain * math.sin(psi)))

            diff = abs(calc_th - th_nom)
            recalc_diffs.append(diff)
            if diff > max_diff:
                max_diff = diff
                worst_case = (site_id, mh, az, th_nom, calc_th, d_km, z_b, z0, stat)

print(f"Total points recalculated: {len(recalc_diffs)}")
print(f"Max difference between stored elevationNominalDeg and recalculated theta: {max_diff:.6f}°")
if worst_case:
    print(f"Worst case: site={worst_case[0]}, mh={worst_case[1]}m, az={worst_case[2]}°")
    print(f"  stored nom: {worst_case[3]}°, recalculated: {worst_case[4]:.4f}°, diff: {worst_case[3]-worst_case[4]:.6f}°")
    print(f"  d_km={worst_case[5]}, z_blocker={worst_case[6]}m, z0={worst_case[7]}m, status={worst_case[8]}")

print("\n=== CHECK 2: Non-Polar Sites Observer Altitude vs Registry ===")
for site_id in ["firefly-blue-ghost", "apollo-11", "apollo-17", "change-6"]:
    asset = horizons[site_id]
    reg = sites_dict[site_id]
    z0_prov = asset.get("provenance", {}).get("z0_observer_m")
    z_reg = reg["coordinates"]["elevationMeters"]
    lat = reg["coordinates"]["latitudeDeg"]
    print(f"Site {site_id} (lat {lat}°): provenance z0={z0_prov}m, registry elevation={z_reg}m")

print("\n=== CHECK 3: Extreme Azimuth Continuity Across Azimuth Seam (359° -> 0°) ===")
seam_jumps = []
for site_id, asset in horizons.items():
    p1 = asset["profiles"]["1.0"]
    nom = p1["elevationNominalDeg"]
    # Seam jump: |nom[359] - nom[0]|
    jump = abs(nom[359] - nom[0])
    seam_jumps.append((jump, site_id, nom[359], nom[0]))

seam_jumps.sort(reverse=True)
print("Top 5 largest 359° -> 0° seam differences (1.0m mast):")
for jump, sid, th359, th0 in seam_jumps[:5]:
    print(f"  {sid}: jump = {jump:.4f}° (az359={th359}°, az0={th0}°)")

print("\n=== CHECK 4: Perturbation Envelope Margins (thetaHigh - thetaLow) ===")
delta_thetas = []
for site_id, asset in horizons.items():
    if site_id in ["firefly-blue-ghost", "apollo-11", "apollo-17", "change-6"]:
        continue
    p1 = asset["profiles"]["1.0"]
    low = p1["thetaLowDeg"]
    high = p1["thetaHighDeg"]
    nom = p1["elevationNominalDeg"]
    for az in range(360):
        delta = high[az] - low[az]
        delta_thetas.append(delta)

print(f"Polar sites perturbation band (thetaHigh - thetaLow):")
print(f"  Min width: {min(delta_thetas):.6f}°")
print(f"  Max width: {max(delta_thetas):.6f}°")
print(f"  Mean width: {np.mean(delta_thetas):.6f}°")

print("\n=== CHECK 5: Mast Monotonicity for thetaLow and thetaHigh ===")
low_mon_violations = 0
high_mon_violations = 0
for site_id, asset in horizons.items():
    p1 = asset["profiles"]["1.0"]
    p10 = asset["profiles"]["10.0"]
    for az in range(360):
        if p10["thetaLowDeg"][az] > p1["thetaLowDeg"][az] + 1e-4:
            low_mon_violations += 1
        if p10["thetaHighDeg"][az] > p1["thetaHighDeg"][az] + 1e-4:
            high_mon_violations += 1

print(f"thetaLowDeg monotonicity violations (10m > 1m): {low_mon_violations}")
print(f"thetaHighDeg monotonicity violations (10m > 1m): {high_mon_violations}")

print("\n=== CHECK 6: Detailed Sampling of Extreme Azimuths (0, 89, 90, 180, 270, 359) ===")
test_sites = ["shackleton-rim", "connecting-ridge", "slater-plain", "apollo-11"]
for sid in test_sites:
    asset = horizons[sid]
    p = asset["profiles"]["1.0"]
    print(f"\nSite: {sid} (Mast 1.0m)")
    for az in [0, 89, 90, 180, 270, 359]:
        print(f"  Az {az:3d}°: nom={p['elevationNominalDeg'][az]:7.4f}°, low={p['thetaLowDeg'][az]:7.4f}°, high={p['thetaHighDeg'][az]:7.4f}°, dist={p['blockerDistanceKm'][az]:6.3f} km, elev={p['blockerElevationMeters'][az]:7.2f}m, status={p['binStatus'][az]}")
