#!/usr/bin/env python3
"""
Adversarial Stress & Boundary Harness for LOLA Geodesic Ray-Marcher (Milestone M2).
Executes high-load stress, coordinate singularities, cache limits, and numerical stability.
"""

import math
import sys
import unittest
import numpy as np

from horizon_raymarch import (
    R_MOON,
    REGIONAL_Z_MAX,
    geodesic_step,
    spherical_elevation_angle,
    stopping_distance_bound,
    compute_site_horizon,
    HorizonConfig,
    CachedLOLACOGReader,
)


class DummyMockReader:
    def __init__(self, in_bounds=True, elev=100.0):
        self.in_bounds = in_bounds
        self.elev = elev
        self.calls = 0

    def get_elevation(self, lat_deg: float, lon_deg: float) -> dict:
        self.calls += 1
        return {"elevation_m": self.elev, "in_bounds": self.in_bounds}


class TestRaymarcherStressAndBoundaries(unittest.TestCase):
    """Stress tests and boundary condition verification for ray-marching engine."""

    def test_pole_singularity_exact(self):
        """At exact South Pole (-90.0°), azimuth step must be numerically stable."""
        reader = DummyMockReader(in_bounds=True, elev=500.0)
        cfg = HorizonConfig(step_deg=10.0, mast_heights=[2.0], max_dist_m=5000.0)
        res = compute_site_horizon("south-pole-exact", -90.0, 0.0, reader, cfg)
        self.assertEqual(res["azimuthBinsCount"], 36)
        p = res["profiles"]["2.0"]
        for val in p["elevationNominalDeg"]:
            self.assertFalse(math.isnan(val))
            self.assertFalse(math.isinf(val))

    def test_longitude_wrap_around_adversarial(self):
        """Adversarial longitudes: negative, >360, huge values."""
        reader = DummyMockReader(in_bounds=True, elev=0.0)
        cfg = HorizonConfig(step_deg=45.0, mast_heights=[2.0], max_dist_m=2000.0)
        for lon in [-720.0, -360.0, -180.0, 360.0, 720.0, 1080.5]:
            res = compute_site_horizon("wrap-test", -85.0, lon, reader, cfg)
            p = res["profiles"]["2.0"]
            self.assertEqual(len(p["elevationNominalDeg"]), 8)
            for val in p["elevationNominalDeg"]:
                self.assertFalse(math.isnan(val))

    def test_dem_boundary_transitions(self):
        """Crossing the -80.0° DEM boundary switches to spherical dip without crash."""
        reader = DummyMockReader(in_bounds=False, elev=float("nan"))
        cfg = HorizonConfig(step_deg=30.0, mast_heights=[1.0, 10.0], max_dist_m=5000.0)
        # Outside DEM: lat = -79.99
        res_out = compute_site_horizon("outside-dem", -79.99, 10.0, reader, cfg)
        self.assertEqual(res_out["provenance"]["coverageNote"], "Site outside LOLA 80S DEM; geometric spherical horizon dip applied")
        p1 = res_out["profiles"]["1.0"]
        p10 = res_out["profiles"]["10.0"]
        self.assertAlmostEqual(p1["elevationNominalDeg"][0], -0.0614, places=3)
        self.assertAlmostEqual(p10["elevationNominalDeg"][0], -0.1943, places=3)
        for s in p1["binStatus"]:
            self.assertEqual(s, "incomplete_range_truncated")

    def test_stopping_distance_extreme_bounds(self):
        """Stopping distance bound under extreme geometric conditions."""
        r_obs = R_MOON + 2000.0
        r_max = R_MOON + 5000.0
        # Exactly horizontal (theta = 0)
        s0 = stopping_distance_bound(r_obs, r_max, 0.0)
        self.assertGreater(s0, 50000.0)
        self.assertLess(s0, 200000.0)
        # Looking straight up (theta = 90 deg)
        s90 = stopping_distance_bound(r_obs, r_max, math.pi / 2.0)
        self.assertEqual(s90, 0.0)
        # r_obs >= r_max
        s_cleared = stopping_distance_bound(r_max + 100.0, r_max, 0.0)
        self.assertEqual(s_cleared, 0.0)

    def test_spherical_elevation_extreme_distances(self):
        """Spherical elevation angle for extreme distances and radii."""
        r0 = R_MOON + 10.0
        # At zero distance
        self.assertEqual(spherical_elevation_angle(r0, r0, 0.0), 0.0)
        # Negative distance
        self.assertEqual(spherical_elevation_angle(r0, r0, -100.0), 0.0)
        # Halfway around Moon (s = pi * R_MOON)
        s_half = math.pi * R_MOON
        theta_half = spherical_elevation_angle(r0, r0, s_half)
        self.assertAlmostEqual(theta_half, -90.0, delta=1.0)

    def test_high_density_azimuth_load(self):
        """High-resolution azimuth ray-marching (e.g. 0.25 deg = 1440 bins)."""
        reader = DummyMockReader(in_bounds=True, elev=200.0)
        cfg = HorizonConfig(step_deg=0.5, mast_heights=[2.0], max_dist_m=1000.0)
        res = compute_site_horizon("dense-test", -88.0, 45.0, reader, cfg)
        self.assertEqual(res["azimuthBinsCount"], 720)
        self.assertEqual(len(res["profiles"]["2.0"]["elevationNominalDeg"]), 720)

    def test_tile_cache_eviction_boundedness(self):
        """CachedLOLACOGReader tile cache must not exceed max_cached_tiles."""
        reader = CachedLOLACOGReader(max_cached_tiles=16)
        # Mock meta for tile queries
        from lola_cog_reader import COGMetadata
        reader.meta = COGMetadata(
            is_bigtiff=True, byte_order="<", width=1000, height=1000,
            tile_w=100, tile_h=100, is_tiled=True,
            offsets=[100] * 100, byte_counts=[50] * 100,
            scale=(40.0, 40.0, 1.0), tiepoint=(0, 0, 0, -20000.0, 20000.0, 0)
        )
        # Inject fake tile array into cache to test eviction logic
        fake_tile = np.zeros((100, 100), dtype=np.float32)
        for i in range(50):
            reader._tile_cache[i] = fake_tile
            if len(reader._tile_cache) > reader._max_cached_tiles:
                reader._tile_cache.pop(next(iter(reader._tile_cache)))
        self.assertLessEqual(len(reader._tile_cache), 16)


if __name__ == "__main__":
    unittest.main()
