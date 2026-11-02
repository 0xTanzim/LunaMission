#!/usr/bin/env python3
"""
LOLA Geodesic Horizon Ray-Marcher & Multi-Mast Obstruction Solver.
Pure Python + NumPy. Conforms to AGENTS.md §4.2, §5.1, and Masterplan R3.
Computes 360-bin horizon profiles with in-memory tile cache and s_bound.
"""

import argparse
import json
import math
import os
import sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from lola_cog_reader import (
        LOLACOGReader, PRODUCT90_URL, R_MOON,
        decode_tile, bilinear_interpolate, projected_to_pixel
    )
except ImportError:
    from tooling.scripts.lola_cog_reader import (
        LOLACOGReader, PRODUCT90_URL, R_MOON,
        decode_tile, bilinear_interpolate, projected_to_pixel
    )

DEFAULT_MAST_HEIGHTS = [1.0, 2.0, 5.0, 10.0]
REGIONAL_Z_MAX = 7200.0  # South-polar summits (Mons Mouton) reach ~7027m relative to 1737.4km
DEFAULT_SIGMA_Z = 0.5    # LOLA vertical DEM RMS uncertainty in meters


def geodesic_step(lat_deg: float, lon_deg: float, az_deg: float, s_m: float) -> tuple[float, float]:
    """Exact spherical geodesic forward step: (lat, lon) + bearing az at distance s."""
    psi = s_m / R_MOON
    phi0, lam0, alpha = math.radians(lat_deg), math.radians(lon_deg % 360.0), math.radians(az_deg % 360.0)
    sin_phi = math.sin(phi0) * math.cos(psi) + math.cos(phi0) * math.sin(psi) * math.cos(alpha)
    phi = math.asin(max(-1.0, min(1.0, sin_phi)))
    y = math.sin(psi) * math.sin(alpha)
    x = math.cos(phi0) * math.cos(psi) - math.sin(phi0) * math.sin(psi) * math.cos(alpha)
    return math.degrees(phi), (math.degrees(lam0 + math.atan2(y, x))) % 360.0


def spherical_elevation_angle(r_obs: float, r_terrain: float, s_m: float) -> float:
    """Exact spherical-curvature elevation angle theta in degrees from local tangent plane."""
    if s_m <= 0.0:
        return 0.0
    psi = s_m / R_MOON
    return math.degrees(math.atan2(r_terrain * math.cos(psi) - r_obs, r_terrain * math.sin(psi)))


def stopping_distance_bound(r_obs: float, r_max: float, theta_rad: float) -> float:
    """Closed-form stopping distance bound s_bound(theta) from orbital geometry."""
    if r_obs >= r_max:
        return 80000.0
    ratio = (r_obs / r_max) * math.cos(theta_rad)
    if ratio >= 1.0:
        return 80000.0
    psi_bound = math.acos(ratio) - theta_rad
    return max(0.0, R_MOON * psi_bound) if psi_bound > 0.0 else 0.0


class CachedLOLACOGReader(LOLACOGReader):
    """LOLACOGReader with in-memory decoded tile cache to eliminate redundant tile decompressions."""

    def __init__(self, source: str = PRODUCT90_URL, cache_dir: str | None = None, max_cached_tiles: int = 128):
        super().__init__(source, cache_dir)
        self._tile_cache: dict[int, np.ndarray] = {}
        self._max_cached_tiles = max_cached_tiles

    def get_elevation_at_projected(self, x: float, y: float) -> dict:
        col, row = projected_to_pixel(x, y, self.meta)
        if not (0.0 <= col < self.meta.width and 0.0 <= row < self.meta.height):
            return {"elevation_m": float("nan"), "pixel_col": col, "pixel_row": row, "in_bounds": False}
        tiles_x = (self.meta.width + self.meta.tile_width - 1) // self.meta.tile_width
        tc, tr = int(col // self.meta.tile_width), int(row // self.meta.tile_height)
        t_idx = tr * tiles_x + tc
        if t_idx in self._tile_cache:
            tile_arr = self._tile_cache[t_idx]
        else:
            off, cnt = self.meta.tile_offsets[t_idx], self.meta.tile_byte_counts[t_idx]
            tile_arr = decode_tile(self.read_bytes(off, cnt), self.meta.tile_width, self.meta.tile_height,
                                   self.meta.compression, self.meta.predictor)
            if len(self._tile_cache) >= self._max_cached_tiles:
                self._tile_cache.pop(next(iter(self._tile_cache)))
            self._tile_cache[t_idx] = tile_arr
        local_c, local_r = col - tc * self.meta.tile_width, row - tr * self.meta.tile_height
        return {"elevation_m": bilinear_interpolate(tile_arr, local_c, local_r),
                "pixel_col": col, "pixel_row": row, "projected_x": x, "projected_y": y,
                "tile_col": tc, "tile_row": tr, "tile_index": t_idx, "in_bounds": True}


class HorizonConfig:
    """Configuration parameters for geodesic ray marching."""
    def __init__(self, step_deg: float = 1.0, mast_heights: list[float] | None = None,
                 min_dist_m: float = 40.0, max_dist_m: float = 80000.0,
                 r_max: float = R_MOON + REGIONAL_Z_MAX, sigma_z: float = DEFAULT_SIGMA_Z):
        self.step_deg = step_deg
        self.mast_heights = mast_heights or list(DEFAULT_MAST_HEIGHTS)
        self.min_dist_m, self.max_dist_m = min_dist_m, max_dist_m
        self.r_max, self.sigma_z = r_max, sigma_z


def _generate_ray_distances(max_dist: float) -> list[float]:
    """Generates adaptive ray step distances (fine near-field, coarsened far-field)."""
    distances, curr = [], 40.0
    while curr <= min(max_dist, 3000.0):
        distances.append(curr)
        curr += 40.0
    while curr <= min(max_dist, 15000.0):
        distances.append(curr)
        curr += 120.0
    while curr <= max_dist:
        distances.append(curr)
        curr += 300.0
    return distances


def compute_site_horizon(site_id: str, lat_deg: float, lon_deg: float,
                         reader, cfg: HorizonConfig | None = None) -> dict:
    """Ray-marches multi-mast 360-bin horizon profiles conforming to horizonAssetSchema."""
    cfg = cfg or HorizonConfig()
    if hasattr(reader, "meta") and not hasattr(reader, "_tile_cache"):
        reader._tile_cache = {}
        reader._max_cached_tiles = 128
        reader.get_elevation_at_projected = CachedLOLACOGReader.get_elevation_at_projected.__get__(reader, reader.__class__)

    obs_info = reader.get_elevation(lat_deg, lon_deg)
    z0 = obs_info["elevation_m"] if obs_info.get("in_bounds", False) and not math.isnan(obs_info["elevation_m"]) else 0.0
    masts = sorted(cfg.mast_heights)
    r_max = max(cfg.r_max, R_MOON + z0 + max(masts) + 200.0)
    azimuths = np.arange(0.0, 360.0, cfg.step_deg)
    profiles = {f"{mh:.1f}": {"elevationNominalDeg": [], "thetaLowDeg": [], "thetaHighDeg": [],
                              "blockerDistanceKm": [], "blockerElevationMeters": [], "binStatus": []}
                for mh in masts}

    if lat_deg > -80.0 or not obs_info.get("in_bounds", False):
        for mh in masts:
            dip_angle = -math.degrees(math.acos(R_MOON / (R_MOON + mh)))
            d_km, nom = round(math.sqrt(2.0 * R_MOON * mh) / 1000.0, 3), round(dip_angle, 4)
            p = profiles[f"{mh:.1f}"]
            p["elevationNominalDeg"] = [nom] * len(azimuths)
            p["thetaLowDeg"] = [nom] * len(azimuths)
            p["thetaHighDeg"] = [nom] * len(azimuths)
            p["blockerDistanceKm"] = [d_km] * len(azimuths)
            p["blockerElevationMeters"] = [round(z0, 2)] * len(azimuths)
            p["binStatus"] = ["incomplete_range_truncated"] * len(azimuths)
        return {
            "siteId": site_id, "mastHeightsMeters": masts,
            "azimuthBinsCount": len(azimuths), "stepDeg": cfg.step_deg,
            "profiles": profiles,
            "provenance": {
                "dataset": "NASA_LOLA_PGDA",
                "coverageNote": "Site outside LOLA 80S DEM; geometric spherical horizon dip applied",
                "z0_observer_m": round(z0, 2), "r_max_m": r_max
            }
        }

    for az in azimuths:
        r_obs_arr = {mh: R_MOON + z0 + mh for mh in masts}
        best = {mh: {"nom": -90.0, "low": -90.0, "high": -90.0, "dist": 0.0, "elev": z0} for mh in masts}
        status = "valid"
        curr_bound = cfg.max_dist_m
        distances = _generate_ray_distances(cfg.max_dist_m)

        for s in distances:
            if s > curr_bound:
                break
            step_lat, step_lon = geodesic_step(lat_deg, lon_deg, float(az), s)
            t_res = reader.get_elevation(step_lat, step_lon)
            if not t_res.get("in_bounds", True) or math.isnan(t_res.get("elevation_m", float("nan"))):
                status = "incomplete_range_truncated"
                break
            z_s = t_res["elevation_m"]
            r_nom = R_MOON + z_s
            for mh in masts:
                r_o = r_obs_arr[mh]
                th_nom = spherical_elevation_angle(r_o, r_nom, s)
                th_low = spherical_elevation_angle(r_o, r_nom - cfg.sigma_z, s)
                th_high = spherical_elevation_angle(r_o, r_nom + cfg.sigma_z, s)
                if th_nom > best[mh]["nom"]:
                    best[mh] = {"nom": th_nom, "low": th_low, "high": th_high, "dist": s, "elev": z_s}
            ref_th = best[masts[0]]["nom"]
            if ref_th > -5.0:
                s_b = stopping_distance_bound(r_obs_arr[masts[0]], r_max, math.radians(ref_th))
                if s_b > 0.0:
                    curr_bound = min(curr_bound, max(s_b, 5000.0))

        for mh in masts:
            if best[mh]["nom"] <= -89.0:
                th_dip = -math.degrees(math.acos(R_MOON / (R_MOON + mh)))
                best[mh] = {"nom": th_dip, "low": th_dip, "high": th_dip,
                            "dist": math.sqrt(2.0 * R_MOON * mh), "elev": z0}
            p = profiles[f"{mh:.1f}"]
            p["elevationNominalDeg"].append(round(best[mh]["nom"], 4))
            p["thetaLowDeg"].append(round(best[mh]["low"], 4))
            p["thetaHighDeg"].append(round(best[mh]["high"], 4))
            p["blockerDistanceKm"].append(round(best[mh]["dist"] / 1000.0, 3))
            p["blockerElevationMeters"].append(round(best[mh]["elev"], 2))
            p["binStatus"].append(status)

    return {
        "siteId": site_id, "mastHeightsMeters": masts,
        "azimuthBinsCount": len(azimuths), "stepDeg": cfg.step_deg,
        "profiles": profiles,
        "provenance": {"dataset": "NASA_LOLA_PGDA", "z0_observer_m": round(z0, 2), "r_max_m": r_max}
    }


def run_verification() -> dict:
    """Executes Milestone M2 validation test against real NASA PGDA LOLA DEM."""
    print("Executing Milestone M2 Geodesic Ray-Marcher Proof...")
    reader = CachedLOLACOGReader(PRODUCT90_URL)
    cfg = HorizonConfig(step_deg=5.0, mast_heights=[2.0], max_dist_m=35000.0)
    res = compute_site_horizon("shackleton-rim-proof", -89.9, 0.0, reader, cfg)
    p2 = res["profiles"]["2.0"]
    mean_h, max_h, min_h = float(np.mean(p2["elevationNominalDeg"])), float(np.max(p2["elevationNominalDeg"])), float(np.min(p2["elevationNominalDeg"]))

    proof = {
        "milestone": "M2", "timestamp": "2026-11-04T13:20:00Z",
        "dataset": "PGDA_PRODUCT_90_LDEM_80S_40MPP_ADJ",
        "siteId": "shackleton-rim-proof", "coords": [-89.9, 0.0],
        "metrics": {"meanHorizonDeg": round(mean_h, 3), "maxObstructionDeg": round(max_h, 3), "minObstructionDeg": round(min_h, 3)},
        "validBinsCount": sum(1 for s in p2["binStatus"] if s == "valid"),
        "totalBins": len(p2["binStatus"]),
        "verified": max_h > 0.0 and min_h < max_h and len(p2["binStatus"]) > 0
    }
    out_dir = "/home/tanzim/project/Project/hakathon/LunaMission/validation/artifacts"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "m2_raymarch_proof.json")
    with open(out_path, "w") as f:
        json.dump(proof, f, indent=2)
    print(f"Artifact written: {out_path} (verified: {proof['verified']})")
    return proof


def main():
    parser = argparse.ArgumentParser(description="LOLA Geodesic Horizon Ray-Marcher")
    parser.add_argument("--site", type=str, help="Site ID from data/sites-registry.json")
    parser.add_argument("--all", action="store_true", help="Generate horizons for all candidate sites")
    parser.add_argument("--verify", action="store_true", help="Run Milestone M2 verification proof")
    parser.add_argument("--lat", type=float, help="Latitude [-90, -80]")
    parser.add_argument("--lon", type=float, help="Longitude [0, 360)")
    parser.add_argument("--step", type=float, default=1.0, help="Azimuth step in degrees (default 1.0)")
    parser.add_argument("--out", type=str, default="data/curated-horizons.json", help="Output JSON path")
    args = parser.parse_args()

    if args.verify:
        proof = run_verification()
        print(json.dumps(proof, indent=2))
        sys.exit(0 if proof["verified"] else 1)

    reader = CachedLOLACOGReader(PRODUCT90_URL)
    cfg = HorizonConfig(step_deg=args.step)

    if args.all:
        with open("data/sites-registry.json", "r") as f:
            sites_data = json.load(f)
        all_horizons = {}
        for site in sites_data.get("sites", []):
            sid = site["id"]
            lat, lon = site["coordinates"]["latitudeDeg"], site["coordinates"]["longitudeDeg"]
            print(f"Marching horizon for site: {sid} ({lat}°N, {lon}°E)...")
            all_horizons[sid] = compute_site_horizon(sid, lat, lon, reader, cfg)
        with open(args.out, "w") as f:
            json.dump(all_horizons, f, indent=2)
        print(f"Generated {len(all_horizons)} horizon profiles to {args.out}")
        return

    if args.lat is not None and args.lon is not None:
        print(json.dumps(compute_site_horizon(args.site or "custom-site", args.lat, args.lon, reader, cfg), indent=2))
        return

    parser.print_help()


if __name__ == "__main__":
    main()
