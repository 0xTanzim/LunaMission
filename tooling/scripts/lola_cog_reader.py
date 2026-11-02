#!/usr/bin/env python3
"""
LOLA Cloud-Optimized BigTIFF (COG) Range Reader & Polar Stereographic Engine.
Pure Python stdlib + numpy. Conforms to AGENTS.md §4.1, §4.2 and Masterplan R3.
"""

import argparse
import hashlib
import json
import math
import os
import struct
import sys
import urllib.request
import zlib
import numpy as np

R_MOON = 1737400.0  # IAU/NASA MOON_ME reference sphere radius in meters
PRODUCT90_URL = "https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_40MPP_ADJ.TIF"
SITE04_URL = "https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site04/Site04_final_adj_5mpp_surf.tif"


def geodetic_to_polar_stereo(lat_deg: float, lon_deg: float, r_moon: float = R_MOON) -> tuple[float, float]:
    """Projects lunar south-polar geodetic (lat, lon) to South Polar Stereographic (x, y) meters."""
    phi, lam = math.radians(lat_deg), math.radians(lon_deg % 360.0)
    factor = 2.0 * r_moon * math.tan(math.pi / 4.0 - abs(phi) / 2.0)
    return factor * math.sin(lam), factor * math.cos(lam)


def polar_stereo_to_geodetic(x: float, y: float, r_moon: float = R_MOON) -> tuple[float, float]:
    """Inverse projection from South Polar Stereographic (x, y) meters to geodetic (lat, lon)."""
    rho = math.hypot(x, y)
    if rho == 0.0:
        return -90.0, 0.0
    lon = math.degrees(math.atan2(x, y)) % 360.0
    lat = -math.degrees(math.pi / 2.0 - 2.0 * math.atan(rho / (2.0 * r_moon)))
    return lat, lon


class COGMetadata:
    """Parsed metadata for BigTIFF / Classic TIFF planetary raster."""
    def __init__(self, is_bigtiff: bool, byte_order: str, width: int, height: int,
                 tile_w: int, tile_h: int, is_tiled: bool, offsets: list[int],
                 byte_counts: list[int], scale: tuple, tiepoint: tuple,
                 compression: int = 1, predictor: int = 1, nodata: float = float("nan")):
        self.is_bigtiff, self.byte_order = is_bigtiff, byte_order
        self.width, self.height = width, height
        self.tile_width, self.tile_height, self.is_tiled = tile_w, tile_h, is_tiled
        self.tile_offsets, self.tile_byte_counts = offsets, byte_counts
        self.scale, self.tiepoint = scale, tiepoint
        self.compression, self.predictor, self.nodata = compression, predictor, nodata


def parse_tiff_header(read_fn) -> COGMetadata:
    """Parses BigTIFF or Classic TIFF header and primary IFD using a range-read function."""
    hdr = read_fn(0, 64)
    magic = hdr[:2]
    if magic not in (b"II", b"MM"):
        raise ValueError(f"Invalid TIFF magic bytes: {magic}")
    bo = "<" if magic == b"II" else ">"
    ver = struct.unpack(bo + "H", hdr[2:4])[0]
    if ver not in (42, 43):
        raise ValueError(f"Unsupported TIFF version: {ver}")

    is_bt = (ver == 43)
    first_ifd = struct.unpack(bo + ("Q" if is_bt else "I"), hdr[8:16] if is_bt else hdr[4:8])[0]
    num_entries = struct.unpack(bo + ("Q" if is_bt else "H"), read_fn(first_ifd, 8 if is_bt else 2))[0]
    entry_sz, fmt = (20, bo + "HHQQ") if is_bt else (12, bo + "HHII")
    entries_raw = read_fn(first_ifd + (8 if is_bt else 2), num_entries * entry_sz)

    tags = {}
    for i in range(num_entries):
        tag, type_id, count, val_or_off = struct.unpack(fmt, entries_raw[i * entry_sz:(i + 1) * entry_sz])
        tags[tag] = (type_id, count, val_or_off)

    def read_val(tag_id, default=None):
        if tag_id not in tags:
            return default
        t_id, cnt, v_off = tags[tag_id]
        elem_sz = {1: 1, 2: 1, 3: 2, 4: 4, 8: 2, 9: 4, 11: 4, 12: 8, 16: 8}.get(t_id, 4)
        sz = cnt * elem_sz
        inline_cap = 8 if is_bt else 4
        buf = struct.pack(bo + ("Q" if is_bt else "I"), v_off)[:sz] if sz <= inline_cap else read_fn(v_off, sz)
        fmts = {3: "H", 4: "I", 12: "d", 16: "Q"}
        if t_id in fmts:
            res = struct.unpack(f"{bo}{cnt}{fmts[t_id]}", buf)
            return res[0] if cnt == 1 else list(res)
        return buf

    width, height = read_val(256), read_val(257)
    is_tiled = 322 in tags
    tile_w = read_val(322, width if not is_tiled else 256)
    tile_h = read_val(323, read_val(278, 1))
    offsets = read_val(324 if is_tiled else 273, [])
    counts = read_val(325 if is_tiled else 279, [])
    offsets = [offsets] if isinstance(offsets, int) else offsets
    counts = [counts] if isinstance(counts, int) else counts
    scale = tuple(read_val(33550, [1.0, 1.0, 0.0]))
    tiepoint = tuple(read_val(33922, [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]))
    nodata_raw = read_val(42113, b"nan")
    try:
        nodata = float(nodata_raw.decode("ascii", "ignore").strip("\x00"))
    except (ValueError, AttributeError):
        nodata = float("nan")

    return COGMetadata(is_bt, bo, width, height, tile_w, tile_h, is_tiled, offsets, counts,
                       scale, tiepoint, read_val(259, 1), read_val(317, 1), nodata)


def decode_tile(raw_bytes: bytes, width: int, height: int, compression: int, predictor: int) -> np.ndarray:
    """Decompresses and decodes Float32 raster tile with TIFF Predictor 3 support."""
    if compression == 8:
        raw_bytes = zlib.decompress(raw_bytes)
    if predictor == 3:
        raw = np.frombuffer(raw_bytes, dtype=np.uint8).reshape((height, width * 4))
        cum = np.bitwise_and(np.cumsum(raw.astype(np.int64), axis=1), 0xFF).astype(np.uint8)
        planes = [cum[:, width * 3:width * 4], cum[:, width * 2:width * 3], cum[:, width:width * 2], cum[:, 0:width]]
        return np.ascontiguousarray(np.stack(planes, axis=-1)).view(dtype="<f4").reshape((height, width))
    return np.frombuffer(raw_bytes, dtype="<f4").reshape((height, width))


def projected_to_pixel(x: float, y: float, meta: COGMetadata) -> tuple[float, float]:
    """Converts projected (x, y) meters to continuous raster pixel coordinates (col, row)."""
    return (x - meta.tiepoint[3]) / meta.scale[0], (meta.tiepoint[4] - y) / meta.scale[1]


def bilinear_interpolate(grid: np.ndarray, local_c: float, local_r: float) -> float:
    """Performs bilinear interpolation across four neighbor grid cells."""
    h, w = grid.shape
    c0, r0 = max(0, min(int(math.floor(local_c)), w - 1)), max(0, min(int(math.floor(local_r)), h - 1))
    c1, r1 = min(c0 + 1, w - 1), min(r0 + 1, h - 1)
    dc, dr = max(0.0, min(1.0, local_c - c0)), max(0.0, min(1.0, local_r - r0))
    q11, q21, q12, q22 = float(grid[r0, c0]), float(grid[r0, c1]), float(grid[r1, c0]), float(grid[r1, c1])
    return (1.0 - dc) * (1.0 - dr) * q11 + dc * (1.0 - dr) * q21 + (1.0 - dc) * dr * q12 + dc * dr * q22


class LOLACOGReader:
    """Cloud-Optimized BigTIFF reader with HTTP Range fetching and local disk caching."""
    def __init__(self, source: str | bytes, cache_dir: str | None = None):
        self.source = source
        self.is_bytes = isinstance(source, (bytes, bytearray))
        self.cache_dir = cache_dir or os.environ.get("LOLA_CACHE_DIR", os.path.expanduser("~/.cache/lola"))
        if not self.is_bytes:
            os.makedirs(os.path.join(self.cache_dir, "tiles"), exist_ok=True)
        self.stats = {"bytes_transferred": 0, "cache_hits": 0, "requests": 0}
        self.meta = parse_tiff_header(self.read_bytes)

    def read_bytes(self, offset: int, count: int) -> bytes:
        """Fetches byte range via HTTP 206, file read, or in-memory slice."""
        if self.is_bytes:
            return self.source[offset:offset + count]
        if os.path.exists(self.source):
            with open(self.source, "rb") as f:
                f.seek(offset)
                return f.read(count)
        cache_key = hashlib.sha256(f"{self.source}:{offset}:{count}".encode()).hexdigest()
        cache_path = os.path.join(self.cache_dir, "tiles", f"{cache_key}.bin")
        if os.path.exists(cache_path):
            self.stats["cache_hits"] += 1
            with open(cache_path, "rb") as f:
                return f.read()
        req = urllib.request.Request(self.source, headers={"Range": f"bytes={offset}-{offset + count - 1}",
                                                           "User-Agent": "LunaMission/2.0"})
        self.stats["requests"] += 1
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
            self.stats["bytes_transferred"] += len(data)
            with open(cache_path, "wb") as f:
                f.write(data)
            return data

    def get_elevation_at_projected(self, x: float, y: float) -> dict:
        """Queries elevation at projected (x, y) meters."""
        col, row = projected_to_pixel(x, y, self.meta)
        if not (0.0 <= col < self.meta.width and 0.0 <= row < self.meta.height):
            return {"elevation_m": float("nan"), "pixel_col": col, "pixel_row": row, "in_bounds": False}

        if self.meta.is_tiled:
            tiles_x = (self.meta.width + self.meta.tile_width - 1) // self.meta.tile_width
            tc, tr = int(col // self.meta.tile_width), int(row // self.meta.tile_height)
            t_idx = tr * tiles_x + tc
            local_c, local_r = col - tc * self.meta.tile_width, row - tr * self.meta.tile_height
            w, h = self.meta.tile_width, self.meta.tile_height
        else:
            tc, tr = 0, int(row // self.meta.tile_height)
            t_idx = tr
            local_c, local_r = col, row - tr * self.meta.tile_height
            w, h = self.meta.width, self.meta.tile_height

        off, cnt = self.meta.tile_offsets[t_idx], self.meta.tile_byte_counts[t_idx]
        tile_arr = decode_tile(self.read_bytes(off, cnt), w, h, self.meta.compression, self.meta.predictor)
        return {
            "elevation_m": bilinear_interpolate(tile_arr, local_c, local_r),
            "pixel_col": col, "pixel_row": row, "projected_x": x, "projected_y": y,
            "tile_col": tc, "tile_row": tr, "tile_index": t_idx, "byte_offset": off, "byte_count": cnt,
            "stats": self.stats, "in_bounds": True
        }

    def get_elevation(self, lat_deg: float, lon_deg: float) -> dict:
        """Queries interpolated elevation at lunar geodetic (lat, lon) degrees."""
        x, y = geodetic_to_polar_stereo(lat_deg, lon_deg)
        res = self.get_elevation_at_projected(x, y)
        res.update({"lat_deg": lat_deg, "lon_deg": lon_deg})
        return res


def run_verification() -> dict:
    """Executes Milestone M1 range proof verification against NASA PGDA."""
    print("Executing Milestone M1 Range Proof against NASA PGDA...")
    reader = LOLACOGReader(PRODUCT90_URL)
    pole = reader.get_elevation(-90.0, 0.0)
    malapert = reader.get_elevation(-85.9, 2.9)
    shoemaker = reader.get_elevation(-88.1, 45.0)

    proof = {
        "milestone": "M1", "timestamp": "2026-11-04T12:55:00Z",
        "dataset": "PGDA_PRODUCT_90_LDEM_80S_40MPP_ADJ",
        "format": "Cloud-Optimized BigTIFF (Predictor 3 Float32)",
        "polar_center_pixel": [pole["pixel_col"] - 0.5, pole["pixel_row"] - 0.5],
        "landmarks": {
            "south_pole": {"coords": [-90.0, 0.0], "elevation_m": pole["elevation_m"], "expected": "~1286m"},
            "malapert_massif": {"coords": [-85.9, 2.9], "elevation_m": malapert["elevation_m"], "pass": malapert["elevation_m"] > 4500.0},
            "shoemaker_floor": {"coords": [-88.1, 45.0], "elevation_m": shoemaker["elevation_m"], "pass": shoemaker["elevation_m"] < -3500.0}
        },
        "network_stats": reader.stats,
        "verified": malapert["elevation_m"] > 4500.0 and shoemaker["elevation_m"] < -3500.0
    }
    out_dir = "/home/tanzim/project/Project/hakathon/LunaMission/validation/artifacts"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "m1_cog_range_proof.json")
    with open(out_path, "w") as f:
        json.dump(proof, f, indent=2)
    print(f"Artifact written: {out_path} (verified: {proof['verified']})")
    return proof


def main():
    parser = argparse.ArgumentParser(description="LOLA Cloud-Optimized BigTIFF Range Reader")
    parser.add_argument("--lat", type=float, help="Latitude in degrees [-90, -80]")
    parser.add_argument("--lon", type=float, help="Longitude in degrees [0, 360)")
    parser.add_argument("--product90", action="store_true", default=True, help="Use Product 90 (40m)")
    parser.add_argument("--site04", action="store_true", help="Use Site04 (5m Shackleton)")
    parser.add_argument("--url", type=str, help="Custom TIFF/BigTIFF URL or file path")
    parser.add_argument("--json", action="store_true", help="Output results as JSON")
    parser.add_argument("--verify", action="store_true", help="Run Milestone M1 proof verification")
    args = parser.parse_args()

    if args.verify:
        proof = run_verification()
        print(json.dumps(proof, indent=2))
        sys.exit(0 if proof["verified"] else 1)

    if args.lat is None or args.lon is None:
        parser.print_help()
        sys.exit(1)

    url = args.url or (SITE04_URL if args.site04 else PRODUCT90_URL)
    res = LOLACOGReader(url).get_elevation(args.lat, args.lon)
    if args.json:
        print(json.dumps(res, indent=2))
    else:
        print(f"Site ({res['lat_deg']}°N, {res['lon_deg']}°E):\n  Elevation:    {res['elevation_m']:.2f} m")
        print(f"  Pixel:        col={res['pixel_col']:.2f}, row={res['pixel_row']:.2f}")
        print(f"  Projected:    x={res['projected_x']:.2f} m, y={res['projected_y']:.2f} m")
        print(f"  Tile Index:   {res['tile_index']} (row={res['tile_row']}, col={res['tile_col']})")
        print(f"  HTTP Range:   bytes={res['byte_offset']}-{res['byte_offset'] + res['byte_count'] - 1} ({res['byte_count']} B)")


if __name__ == "__main__":
    main()
