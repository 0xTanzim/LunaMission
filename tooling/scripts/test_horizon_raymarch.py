#!/usr/bin/env python3
"""
Unit and integration tests for Geodesic Ray-Marcher (Milestone M2).
Conforms to AGENTS.md §4.2, §5.1, and Masterplan R3.
Tests run 100% offline via mock datasets with zero network dependencies.
"""

import math
import unittest
import numpy as np

# Import will be tested once horizon_raymarch is created
try:
    from tooling.scripts.horizon_raymarch import (
        R_MOON,
        geodesic_step,
        spherical_elevation_angle,
        stopping_distance_bound,
        compute_site_horizon,
        HorizonConfig,
    )
except ImportError:
    # Fallback to test imports if run directly from tooling/scripts
    from horizon_raymarch import (
        R_MOON,
        geodesic_step,
        spherical_elevation_angle,
        stopping_distance_bound,
        compute_site_horizon,
        HorizonConfig,
    )


class MockElevationReader:
    """In-memory mock reader returning controlled synthetic terrain for tests."""
    def __init__(self, base_elev: float = 0.0, features: list | None = None):
        self.base_elev = base_elev
        self.features = features or []

    def get_elevation(self, lat_deg: float, lon_deg: float) -> dict:
        elev = self.base_elev
        for feat in self.features:
            f_lat, f_lon, f_rad_deg, f_h = feat["lat"], feat["lon"], feat["radius_deg"], feat["height"]
            d = math.hypot(lat_deg - f_lat, (lon_deg - f_lon) * math.cos(math.radians(f_lat)))
            if d <= f_rad_deg:
                elev += f_h * (1.0 - d / f_rad_deg)
        return {"elevation_m": elev, "in_bounds": True}


class TestGeodesicMath(unittest.TestCase):
    """Validates analytical spherical curvature, geodesic stepping, and stopping distance."""

    def test_geodesic_step_from_pole(self):
        """At South Pole (-90°), stepping along any azimuth alpha maps to longitude alpha."""
        s = 50000.0  # 50 km
        for az in [0.0, 45.0, 90.0, 180.0, 270.0]:
            lat, lon = geodesic_step(-90.0, 0.0, az, s)
            expected_dlat = math.degrees(s / R_MOON)
            self.assertAlmostEqual(lat, -90.0 + expected_dlat, places=4)
            self.assertAlmostEqual(lon % 360.0, az % 360.0, places=4)

    def test_geodesic_step_northward(self):
        """Stepping North (az=0°) from -85° increases latitude keeping longitude constant."""
        s = 100000.0  # 100 km
        lat, lon = geodesic_step(-85.0, 40.0, 0.0, s)
        expected_lat = -85.0 + math.degrees(s / R_MOON)
        self.assertAlmostEqual(lat, expected_lat, places=4)
        self.assertAlmostEqual(lon, 40.0, places=4)

    def test_spherical_elevation_flat_dip(self):
        """For equal terrain and observer radii, elevation drops by psi / 2."""
        r0 = R_MOON + 2.0  # 2m mast on zero elevation
        r_terrain = R_MOON
        s = 10000.0  # 10 km
        psi = s / R_MOON
        theta_deg = spherical_elevation_angle(r0, r_terrain, s)
        self.assertLess(theta_deg, 0.0)
        # Expected dip angle in radians ≈ -s / (2 * R_MOON) - h_obs / s
        expected_approx_deg = math.degrees(-psi / 2.0 - 2.0 / s)
        self.assertAlmostEqual(theta_deg, expected_approx_deg, delta=0.01)

    def test_spherical_elevation_high_peak(self):
        """A high peak at distance s creates a positive elevation angle."""
        r0 = R_MOON + 2.0
        r_terrain = R_MOON + 3000.0  # 3000m peak
        s = 15000.0  # 15 km
        theta_deg = spherical_elevation_angle(r0, r_terrain, s)
        self.assertGreater(theta_deg, 5.0)
        psi = s / R_MOON
        expected_deg = math.degrees(math.atan2(r_terrain * math.cos(psi) - r0, r_terrain * math.sin(psi)))
        self.assertAlmostEqual(theta_deg, expected_deg, places=5)

    def test_stopping_distance_bound_monotonicity(self):
        """Higher running horizon angle theta must strictly reduce stopping distance bound."""
        r0 = R_MOON + 2000.0
        r_max = R_MOON + 5000.0
        s_0 = stopping_distance_bound(r0, r_max, math.radians(0.0))
        s_1 = stopping_distance_bound(r0, r_max, math.radians(1.0))
        s_3 = stopping_distance_bound(r0, r_max, math.radians(3.0))
        self.assertGreater(s_0, s_1)
        self.assertGreater(s_1, s_3)
        self.assertGreater(s_3, 0.0)

    def test_stopping_distance_cleared_sky(self):
        """When theta is so high that line of sight clears r_max, bound returns 0."""
        r0 = R_MOON + 4000.0
        r_max = R_MOON + 5000.0
        # If theta is +45 degrees, the ray shoots straight up and exits r_max in a few kilometers
        s_45 = stopping_distance_bound(r0, r_max, math.radians(45.0))
        self.assertLess(s_45, 5000.0)


class TestHorizonRaymarcher(unittest.TestCase):
    """Validates multi-mast ray marching, obstruction detection, and schema adherence."""

    def test_mast_height_elevation_ordering(self):
        """Higher mast observer must see strictly lower horizon angles for the same obstacle."""
        # Single isolated mountain 2000m high, 10 km away along az=90
        mock_reader = MockElevationReader(base_elev=0.0, features=[{
            "lat": -89.44, "lon": 222.5 + math.degrees(10000.0 / (R_MOON * math.cos(math.radians(-89.44)))),
            "radius_deg": 0.05, "height": 2000.0
        }])
        cfg = HorizonConfig(step_deg=10.0, mast_heights=[1.0, 2.0, 5.0, 10.0], max_dist_m=25000.0)
        res = compute_site_horizon("test-site", -89.44, 222.5, mock_reader, cfg)

        th_1m = res["profiles"]["1.0"]["elevationNominalDeg"]
        th_10m = res["profiles"]["10.0"]["elevationNominalDeg"]
        for i in range(len(th_1m)):
            # Mast at 10m is 9m higher than mast at 1m, so horizon angle must be lower or equal
            self.assertLessEqual(th_10m[i], th_1m[i] + 1e-6)

    def test_single_ridge_obstruction_detection(self):
        """Ray-marcher must correctly identify the peak blocker azimuth, distance, and elevation."""
        site_lat, site_lon = -89.0, 0.0
        # Place mountain at azimuth 0 (North), distance 12 km
        peak_lat, peak_lon = geodesic_step(site_lat, site_lon, 0.0, 12000.0)
        mock_reader = MockElevationReader(base_elev=100.0, features=[{
            "lat": peak_lat, "lon": peak_lon, "radius_deg": 0.02, "height": 3000.0
        }])
        cfg = HorizonConfig(step_deg=5.0, mast_heights=[2.0], max_dist_m=30000.0)
        res = compute_site_horizon("ridge-test", site_lat, site_lon, mock_reader, cfg)

        profile = res["profiles"]["2.0"]
        az0_idx = 0  # Azimuth 0
        self.assertGreater(profile["elevationNominalDeg"][az0_idx], 5.0)
        self.assertAlmostEqual(profile["blockerDistanceKm"][az0_idx], 12.0, delta=0.5)
        self.assertGreater(profile["blockerElevationMeters"][az0_idx], 2500.0)

    def test_horizon_asset_schema_structure(self):
        """Result must contain all keys, types, and array dimensions required by horizonAssetSchema."""
        mock_reader = MockElevationReader(base_elev=500.0)
        cfg = HorizonConfig(step_deg=1.0, mast_heights=[1.0, 2.0, 5.0, 10.0], max_dist_m=5000.0)
        res = compute_site_horizon("contract-test", -89.5, 100.0, mock_reader, cfg)

        self.assertEqual(res["siteId"], "contract-test")
        self.assertEqual(res["azimuthBinsCount"], 360)
        self.assertEqual(res["stepDeg"], 1.0)
        self.assertEqual(res["mastHeightsMeters"], [1.0, 2.0, 5.0, 10.0])
        self.assertIn("profiles", res)

        for mh_str in ["1.0", "2.0", "5.0", "10.0"]:
            self.assertIn(mh_str, res["profiles"])
            p = res["profiles"][mh_str]
            for key in ["elevationNominalDeg", "thetaLowDeg", "thetaHighDeg", "blockerDistanceKm", "blockerElevationMeters", "binStatus"]:
                self.assertIn(key, p)
                self.assertEqual(len(p[key]), 360)
            for status in p["binStatus"]:
                self.assertIn(status, ["valid", "incomplete_range_truncated", "nodata"])


if __name__ == "__main__":
    unittest.main()
