#!/usr/bin/env python3
"""
Deep Adversarial Audit for data/curated-horizons.json
Executes empirical audits across all 20 sites x 4 mast heights x 360 bins (28,800 points).
"""

import json
import math
import os
import sys
import numpy as np

HORIZONS_PATH = "data/curated-horizons.json"
REGISTRY_PATH = "data/sites-registry.json"
R_MOON = 1737400.0

NON_POLAR_SITES = {"firefly-blue-ghost", "apollo-11", "apollo-17", "change-6"}
MAST_HEIGHTS = ["1.0", "2.0", "5.0", "10.0"]
EXTREME_AZIMUTHS = [0, 89, 90, 180, 270, 359]


def audit():
    print(f"Loading {HORIZONS_PATH}...")
    if not os.path.exists(HORIZONS_PATH):
        print(f"FAIL: {HORIZONS_PATH} does not exist!")
        sys.exit(1)

    with open(HORIZONS_PATH, "r") as f:
        horizons = json.load(f)

    with open(REGISTRY_PATH, "r") as f:
        registry = json.load(f)

    reg_sites = {s["id"]: s for s in registry.get("sites", [])}
    print(f"Registry sites count: {len(reg_sites)}")
    print(f"Horizons sites count: {len(horizons)}")

    findings = []
    stats = {
        "total_sites": len(horizons),
        "total_points": 0,
        "nan_null_inf_count": 0,
        "negative_blocker_dist_count": 0,
        "envelope_inversion_count": 0,
        "monotonicity_violations_10_1": 0,
        "monotonicity_violations_all_pairs": 0,
        "polar_sites_count": 0,
        "non_polar_sites_count": 0,
        "status_distribution": {},
        "min_elevation": float("inf"),
        "max_elevation": float("-inf"),
        "min_blocker_dist": float("inf"),
        "max_blocker_dist": float("-inf"),
        "min_blocker_elev": float("inf"),
        "max_blocker_elev": float("-inf"),
    }

    # 1. Site completeness
    missing_in_horizons = set(reg_sites.keys()) - set(horizons.keys())
    extra_in_horizons = set(horizons.keys()) - set(reg_sites.keys())
    if missing_in_horizons:
        findings.append(f"CRITICAL: Missing sites in curated-horizons.json: {missing_in_horizons}")
    if extra_in_horizons:
        findings.append(f"WARNING: Extra sites in curated-horizons.json: {extra_in_horizons}")

    # 2. Iterate each site
    for site_id, asset in horizons.items():
        is_non_polar = site_id in NON_POLAR_SITES
        if is_non_polar:
            stats["non_polar_sites_count"] += 1
        else:
            stats["polar_sites_count"] += 1

        reg_info = reg_sites.get(site_id, {})
        reg_lat = reg_info.get("coordinates", {}).get("latitudeDeg", 0.0)
        reg_lon = reg_info.get("coordinates", {}).get("longitudeDeg", 0.0)

        # Asset schema checks
        if asset.get("siteId") != site_id:
            findings.append(f"Site ID mismatch in asset: {asset.get('siteId')} != {site_id}")
        if asset.get("azimuthBinsCount") != 360:
            findings.append(f"Site {site_id} azimuthBinsCount is {asset.get('azimuthBinsCount')} (expected 360)")
        if asset.get("stepDeg") != 1.0:
            findings.append(f"Site {site_id} stepDeg is {asset.get('stepDeg')} (expected 1.0)")
        if asset.get("mastHeightsMeters") != [1.0, 2.0, 5.0, 10.0]:
            findings.append(f"Site {site_id} mastHeightsMeters is {asset.get('mastHeightsMeters')}")

        prov = asset.get("provenance", {})
        if not prov:
            findings.append(f"Site {site_id} missing provenance block")
        if prov.get("dataset") != "NASA_LOLA_PGDA":
            findings.append(f"Site {site_id} invalid provenance dataset: {prov.get('dataset')}")

        profiles = asset.get("profiles", {})
        if set(profiles.keys()) != set(MAST_HEIGHTS):
            findings.append(f"Site {site_id} has profile keys {list(profiles.keys())} != {MAST_HEIGHTS}")

        # Check profiles
        for mh in MAST_HEIGHTS:
            p = profiles.get(mh)
            if not p:
                continue

            for field in ["elevationNominalDeg", "thetaLowDeg", "thetaHighDeg", "blockerDistanceKm", "blockerElevationMeters", "binStatus"]:
                arr = p.get(field)
                if not isinstance(arr, list):
                    findings.append(f"Site {site_id} mh {mh} field {field} is not a list")
                elif len(arr) != 360:
                    findings.append(f"Site {site_id} mh {mh} field {field} length {len(arr)} != 360")

            nom_arr = p.get("elevationNominalDeg", [])
            low_arr = p.get("thetaLowDeg", [])
            high_arr = p.get("thetaHighDeg", [])
            dist_arr = p.get("blockerDistanceKm", [])
            elev_arr = p.get("blockerElevationMeters", [])
            stat_arr = p.get("binStatus", [])

            for az in range(len(nom_arr)):
                stats["total_points"] += 1
                nom, low, high = nom_arr[az], low_arr[az], high_arr[az]
                dist, elev, status = dist_arr[az], elev_arr[az], stat_arr[az]

                # Check NaN, Null, Inf
                for val, name in [(nom, "nom"), (low, "low"), (high, "high"), (dist, "dist"), (elev, "elev")]:
                    if val is None or not isinstance(val, (int, float)) or math.isnan(val) or math.isinf(val):
                        stats["nan_null_inf_count"] += 1
                        findings.append(f"Site {site_id} mh {mh} az {az} has invalid numeric {name}={val}")

                # Status check
                stats["status_distribution"][status] = stats["status_distribution"].get(status, 0) + 1
                if status not in ["valid", "incomplete_range_truncated", "nodata"]:
                    findings.append(f"Site {site_id} mh {mh} az {az} has unknown status {status}")

                if is_non_polar and status != "incomplete_range_truncated":
                    findings.append(f"Non-polar site {site_id} mh {mh} az {az} status {status} != incomplete_range_truncated")

                # Blocker distance check
                if isinstance(dist, (int, float)):
                    if dist < 0.0:
                        stats["negative_blocker_dist_count"] += 1
                        findings.append(f"Site {site_id} mh {mh} az {az} negative blocker dist {dist}")
                    stats["min_blocker_dist"] = min(stats["min_blocker_dist"], dist)
                    stats["max_blocker_dist"] = max(stats["max_blocker_dist"], dist)

                # Elevation check
                if isinstance(nom, (int, float)):
                    stats["min_elevation"] = min(stats["min_elevation"], nom)
                    stats["max_elevation"] = max(stats["max_elevation"], nom)

                if isinstance(elev, (int, float)):
                    stats["min_blocker_elev"] = min(stats["min_blocker_elev"], elev)
                    stats["max_blocker_elev"] = max(stats["max_blocker_elev"], elev)

                # Perturbation envelope check: low <= nom <= high
                eps = 1e-4
                if isinstance(low, (int, float)) and isinstance(nom, (int, float)) and isinstance(high, (int, float)):
                    if low > nom + eps or nom > high + eps:
                        stats["envelope_inversion_count"] += 1
                        findings.append(f"Site {site_id} mh {mh} az {az} envelope inversion: low={low}, nom={nom}, high={high}")

                # Non-polar analytical dip check
                if is_non_polar:
                    mh_val = float(mh)
                    expected_dip = -math.degrees(math.acos(R_MOON / (R_MOON + mh_val)))
                    expected_dist = round(math.sqrt(2.0 * R_MOON * mh_val) / 1000.0, 3)
                    if abs(nom - expected_dip) > 0.01:
                        findings.append(f"Non-polar site {site_id} mh {mh} az {az} nom={nom} does not match expected spherical dip {expected_dip:.4f}")
                    if abs(dist - expected_dist) > 0.01:
                        findings.append(f"Non-polar site {site_id} mh {mh} az {az} dist={dist} does not match expected spherical dist {expected_dist:.3f}")

        # Monotonicity check across mast heights for this site
        # 10m <= 5m <= 2m <= 1m
        p1 = profiles.get("1.0", {}).get("elevationNominalDeg", [])
        p2 = profiles.get("2.0", {}).get("elevationNominalDeg", [])
        p5 = profiles.get("5.0", {}).get("elevationNominalDeg", [])
        p10 = profiles.get("10.0", {}).get("elevationNominalDeg", [])

        eps = 1e-4
        for az in range(360):
            # 10m vs 1m
            if p10[az] > p1[az] + eps:
                stats["monotonicity_violations_10_1"] += 1
                findings.append(f"Site {site_id} az {az}: monotonicity 10m > 1m ({p10[az]} > {p1[az]})")

            # Consecutive pairs
            if p2[az] > p1[az] + eps:
                stats["monotonicity_violations_all_pairs"] += 1
                findings.append(f"Site {site_id} az {az}: monotonicity 2m > 1m ({p2[az]} > {p1[az]})")
            if p5[az] > p2[az] + eps:
                stats["monotonicity_violations_all_pairs"] += 1
                findings.append(f"Site {site_id} az {az}: monotonicity 5m > 2m ({p5[az]} > {p2[az]})")
            if p10[az] > p5[az] + eps:
                stats["monotonicity_violations_all_pairs"] += 1
                findings.append(f"Site {site_id} az {az}: monotonicity 10m > 5m ({p10[az]} > {p5[az]})")

    print("\n--- AUDIT SUMMARY STATISTICS ---")
    print(f"Total sites: {stats['total_sites']} (Polar: {stats['polar_sites_count']}, Non-polar: {stats['non_polar_sites_count']})")
    print(f"Total points audited: {stats['total_points']}")
    print(f"NaN/Null/Inf occurrences: {stats['nan_null_inf_count']}")
    print(f"Negative blocker distances: {stats['negative_blocker_dist_count']}")
    print(f"Envelope inversions (thetaLow > nom or nom > thetaHigh): {stats['envelope_inversion_count']}")
    print(f"Monotonicity violations (10m > 1m): {stats['monotonicity_violations_10_1']}")
    print(f"Monotonicity violations (all consecutive pairs): {stats['monotonicity_violations_all_pairs']}")
    print(f"Status distribution: {stats['status_distribution']}")
    print(f"Horizon Elevation Range: [{stats['min_elevation']:.4f}°, {stats['max_elevation']:.4f}°]")
    print(f"Blocker Distance Range: [{stats['min_blocker_dist']:.3f} km, {stats['max_blocker_dist']:.3f} km]")
    print(f"Blocker Elevation Range: [{stats['min_blocker_elev']:.2f} m, {stats['max_blocker_elev']:.2f} m]")

    print(f"\nTotal findings/anomalies logged: {len(findings)}")
    if findings:
        print("First 20 findings:")
        for f in findings[:20]:
            print("  -", f)

    return findings, stats


if __name__ == "__main__":
    findings, stats = audit()
    if findings:
        print(f"\nAUDIT FINISHED WITH {len(findings)} ISSUES.")
        sys.exit(1)
    else:
        print("\nAUDIT FINISHED: 100% CLEAN. ZERO DEFECTS FOUND ACROSS ALL 28,800 POINTS.")
        sys.exit(0)
