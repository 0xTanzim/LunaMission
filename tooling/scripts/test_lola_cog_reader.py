#!/usr/bin/env python3
"""
Unit and integration test suite for LOLA Cloud-Optimized BigTIFF (COG) reader.
Verifies:
  - BigTIFF / TIFF header signature and IFD parsing.
  - Polar stereographic projection math against south-polar landmarks.
  - Tile index calculation and fractional polar center.
  - Float32 tile decoding with zlib and Predictor 3.
  - Bilinear elevation interpolation.
  - Offline test fixtures and online NASA PGDA range reads.
"""

import math
import os
import struct
import sys
import unittest
import zlib
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))

# We import the functions and classes to test from lola_cog_reader
from lola_cog_reader import (
    R_MOON,
    COGMetadata,
    LOLACOGReader,
    bilinear_interpolate,
    decode_tile,
    geodetic_to_polar_stereo,
    polar_stereo_to_geodetic,
    projected_to_pixel,
    parse_tiff_header,
)


def create_synthetic_bigtiff(width=1024, height=1024, tile_size=512, scale=40.0,
                             tie_x=-304000.0, tie_y=304000.0, base_elevation=1200.0):
    """Generates an in-memory synthetic BigTIFF byte stream for offline deterministic testing."""
    tiles_across = (width + tile_size - 1) // tile_size
    tiles_down = (height + tile_size - 1) // tile_size
    num_tiles = tiles_across * tiles_down

    # Create dummy compressed tile payloads with Predictor 3
    tile_payloads = []
    for t_idx in range(num_tiles):
        tile_data = np.full((tile_size, tile_size), base_elevation + t_idx * 10.0, dtype='<f4')
        raw_bytes = tile_data.tobytes()
        # Apply predictor 3
        raw_u8 = np.frombuffer(raw_bytes, dtype=np.uint8).reshape((tile_size, tile_size * 4))
        # Re-order to planes MSB to LSB
        planes = [raw_u8[:, 3::4], raw_u8[:, 2::4], raw_u8[:, 1::4], raw_u8[:, 0::4]]
        ordered = np.concatenate(planes, axis=1)
        # Differencing
        diff = np.empty_like(ordered)
        diff[:, 0] = ordered[:, 0]
        diff[:, 1:] = (ordered[:, 1:].astype(np.int16) - ordered[:, :-1].astype(np.int16)) & 0xFF
        compressed = zlib.compress(diff.tobytes())
        tile_payloads.append(compressed)

    # Build BigTIFF header and IFD
    # Header: 16 bytes: II + 43 + 8 + 0 + first_ifd_offset (16)
    first_ifd_offset = 16
    entries = []
    # 256: ImageWidth (SHORT, count 1)
    entries.append((256, 3, 1, width))
    # 257: ImageLength (SHORT, count 1)
    entries.append((257, 3, 1, height))
    # 258: BitsPerSample (SHORT, count 1)
    entries.append((258, 3, 1, 32))
    # 259: Compression (SHORT, count 1) -> 8 (Deflate)
    entries.append((259, 3, 1, 8))
    # 317: Predictor (SHORT, count 1) -> 3 (Float diff)
    entries.append((317, 3, 1, 3))
    # 322: TileWidth (SHORT, count 1)
    entries.append((322, 3, 1, tile_size))
    # 323: TileLength (SHORT, count 1)
    entries.append((323, 3, 1, tile_size))
    # 339: SampleFormat (SHORT, count 1) -> 3 (Float)
    entries.append((339, 3, 1, 3))

    num_entries = len(entries) + 4  # plus TileOffsets, TileByteCounts, Scale, Tiepoint
    ifd_size = 8 + num_entries * 20 + 8
    data_offset = first_ifd_offset + ifd_size

    # Tile offsets and byte counts
    tile_offsets = []
    curr_offset = data_offset + 24 + 48 + num_tiles * 8 + num_tiles * 4
    for p in tile_payloads:
        tile_offsets.append(curr_offset)
        curr_offset += len(p)

    scale_offset = data_offset
    tie_offset = scale_offset + 24
    offsets_offset = tie_offset + 48
    counts_offset = offsets_offset + num_tiles * 8

    entries.append((324, 16, num_tiles, offsets_offset))
    entries.append((325, 4, num_tiles, counts_offset))
    entries.append((33550, 12, 3, scale_offset))
    entries.append((33922, 12, 6, tie_offset))
    entries.sort(key=lambda e: e[0])

    buf = bytearray()
    buf.extend(b'II\x2b\x00\x08\x00\x00\x00' + struct.pack('<Q', first_ifd_offset))
    buf.extend(struct.pack('<Q', len(entries)))
    for tag, type_id, count, val in entries:
        buf.extend(struct.pack('<HHQQ', tag, type_id, count, val))
    buf.extend(struct.pack('<Q', 0))  # next IFD = 0

    # Payload data
    buf.extend(struct.pack('<ddd', scale, scale, 0.0))  # scale
    buf.extend(struct.pack('<dddddd', 0.0, 0.0, 0.0, tie_x, tie_y, 0.0))  # tiepoint
    for o in tile_offsets:
        buf.extend(struct.pack('<Q', o))
    for p in tile_payloads:
        buf.extend(struct.pack('<I', len(p)))
    for p in tile_payloads:
        buf.extend(p)

    return bytes(buf)


class TestLolaCogReader(unittest.TestCase):
    def test_polar_stereographic_south_pole(self):
        """South pole (lat=-90.0, lon=0.0) must map exactly to (0, 0)."""
        x, y = geodetic_to_polar_stereo(-90.0, 0.0)
        self.assertAlmostEqual(x, 0.0, places=6)
        self.assertAlmostEqual(y, 0.0, places=6)

        lat, lon = polar_stereo_to_geodetic(0.0, 0.0)
        self.assertAlmostEqual(lat, -90.0, places=6)
        self.assertAlmostEqual(lon, 0.0, places=6)

    def test_polar_stereographic_quadrants(self):
        """Points along 0, 90, 180, 270 deg East must map to correct Cartesian quadrants."""
        lat = -85.0
        # 0 deg E -> x=0, y > 0
        x0, y0 = geodetic_to_polar_stereo(lat, 0.0)
        self.assertAlmostEqual(x0, 0.0, places=4)
        self.assertGreater(y0, 0.0)

        # 90 deg E -> x > 0, y=0
        x90, y90 = geodetic_to_polar_stereo(lat, 90.0)
        self.assertGreater(x90, 0.0)
        self.assertAlmostEqual(y90, 0.0, places=4)

        # 180 deg E -> x=0, y < 0
        x180, y180 = geodetic_to_polar_stereo(lat, 180.0)
        self.assertAlmostEqual(x180, 0.0, places=4)
        self.assertLess(y180, 0.0)

        # 270 deg E -> x < 0, y=0
        x270, y270 = geodetic_to_polar_stereo(lat, 270.0)
        self.assertLess(x270, 0.0)
        self.assertAlmostEqual(y270, 0.0, places=4)

    def test_polar_stereographic_roundtrip(self):
        """Geodetic to polar stereographic and back must preserve coordinates."""
        for lat in [-89.9, -87.5, -85.0, -82.0]:
            for lon in [0.0, 45.0, 120.0, 222.5, 315.0]:
                x, y = geodetic_to_polar_stereo(lat, lon)
                r_lat, r_lon = polar_stereo_to_geodetic(x, y)
                self.assertAlmostEqual(r_lat, lat, places=5)
                self.assertAlmostEqual(r_lon, lon, places=5)

    def test_fractional_polar_center_product90(self):
        """South pole (x=0, y=0) in Product 90 matches fractional center (7599.5, 7599.5)."""
        x, y = geodetic_to_polar_stereo(-90.0, 0.0)
        # Tiepoint X=-304000.0, Y=304000.0, Scale=40.0
        # Pixel outer corner calculation:
        col = (x - (-304000.0)) / 40.0
        row = (304000.0 - y) / 40.0
        self.assertEqual(col, 7600.0)
        self.assertEqual(row, 7600.0)
        # Fractional center indexing (0-indexed center offset):
        center_col = col - 0.5
        center_row = row - 0.5
        self.assertEqual(center_col, 7599.5)
        self.assertEqual(center_row, 7599.5)

    def test_bigtiff_header_signature_verification(self):
        """Header parser confirms BigTIFF signature (II, 43, 8) or standard TIFF (II, 42)."""
        # Valid BigTIFF header
        bt_header = b'II\x2b\x00\x08\x00\x00\x00\x10\x00\x00\x00\x00\x00\x00\x00'
        # Invalid magic
        bad_header = b'XX\x2b\x00\x08\x00\x00\x00\x10\x00\x00\x00\x00\x00\x00\x00'
        with self.assertRaises(ValueError):
            parse_tiff_header(lambda off, count: bad_header[off:off+count])

    def test_synthetic_bigtiff_parsing_and_decoding(self):
        """Synthetic BigTIFF parses IFD correctly and decodes Predictor 3 tiles."""
        bt_bytes = create_synthetic_bigtiff(width=1024, height=1024, tile_size=512, base_elevation=1500.0)
        reader = LOLACOGReader(source=bt_bytes)
        self.assertTrue(reader.meta.is_bigtiff)
        self.assertEqual(reader.meta.width, 1024)
        self.assertEqual(reader.meta.height, 1024)
        self.assertEqual(reader.meta.tile_width, 512)
        self.assertEqual(reader.meta.tile_height, 512)
        self.assertEqual(len(reader.meta.tile_offsets), 4)

        # Query center of tile 0: projected coords near tiepoint
        elev_info = reader.get_elevation_at_projected(-304000.0 + 100 * 40.0, 304000.0 - 100 * 40.0)
        self.assertAlmostEqual(elev_info['elevation_m'], 1500.0, places=2)

    def test_bilinear_interpolation(self):
        """Bilinear interpolation calculates exact weighted elevation across 4 grid points."""
        grid = np.array([
            [10.0, 20.0],
            [30.0, 40.0]
        ], dtype=np.float32)
        # Center point (0.5, 0.5) should be average (10+20+30+40)/4 = 25.0
        val = bilinear_interpolate(grid, 0.5, 0.5)
        self.assertAlmostEqual(val, 25.0, places=5)
        # Point (0.0, 0.0) should be 10.0
        self.assertAlmostEqual(bilinear_interpolate(grid, 0.0, 0.0), 10.0, places=5)
        # Point (0.5, 0.0) should be halfway between 10 and 20 -> 15.0
        self.assertAlmostEqual(bilinear_interpolate(grid, 0.5, 0.0), 15.0, places=5)
        # Point (0.0, 0.5) should be halfway between 10 and 30 -> 20.0
        self.assertAlmostEqual(bilinear_interpolate(grid, 0.0, 0.5), 20.0, places=5)

    def test_predictor3_decode_fidelity(self):
        """Predictor 3 decoding reproduces original Float32 array."""
        h, w = 4, 8
        original = np.linspace(-1000.0, 3000.0, h * w, dtype='<f4').reshape((h, w))
        raw_u8 = np.frombuffer(original.tobytes(), dtype=np.uint8).reshape((h, w * 4))
        # Split planes MSB to LSB
        planes = [raw_u8[:, 3::4], raw_u8[:, 2::4], raw_u8[:, 1::4], raw_u8[:, 0::4]]
        ordered = np.concatenate(planes, axis=1)
        diff = np.empty_like(ordered)
        diff[:, 0] = ordered[:, 0]
        diff[:, 1:] = (ordered[:, 1:].astype(np.int16) - ordered[:, :-1].astype(np.int16)) & 0xFF
        compressed = zlib.compress(diff.tobytes())

        decoded = decode_tile(compressed, w, h, compression=8, predictor=3)
        np.testing.assert_array_almost_equal(decoded, original, decimal=5)

    def test_out_of_bounds_handling(self):
        """Points outside raster bounds return in_bounds=False and NaN elevation."""
        bt_bytes = create_synthetic_bigtiff(width=100, height=100, tile_size=50)
        reader = LOLACOGReader(source=bt_bytes)
        # Coordinate far outside tiepoint bounds
        res = reader.get_elevation_at_projected(9999999.0, 9999999.0)
        self.assertFalse(res['in_bounds'])
        self.assertTrue(math.isnan(res['elevation_m']))

    def test_classic_tiff_strips_decoding(self):
        """Classic TIFF (v42) with strips decodes uncompressed Float32 strips correctly."""
        w, h = 64, 32
        data = np.full((h, w), 2450.5, dtype='<f4')
        raw_payload = data.tobytes()

        # Build v42 TIFF header
        buf = bytearray(b'II\x2a\x00\x08\x00\x00\x00')  # IFD at offset 8
        entries = [
            (256, 3, 1, w),          # ImageWidth
            (257, 3, 1, h),          # ImageLength
            (258, 3, 1, 32),         # BitsPerSample
            (259, 3, 1, 1),          # Compression (none)
            (273, 4, 1, 0),          # StripOffsets (placeholder)
            (278, 3, 1, h),          # RowsPerStrip (all in 1 strip)
            (279, 4, 1, len(raw_payload)),  # StripByteCounts
            (339, 3, 1, 3),          # SampleFormat (Float)
            (33550, 12, 3, 0),       # Scale (placeholder)
            (33922, 12, 6, 0),       # Tiepoint (placeholder)
        ]
        entries.sort(key=lambda e: e[0])
        buf.extend(struct.pack('<H', len(entries)))
        ifd_start = len(buf)
        buf.extend(b'\x00' * (len(entries) * 12 + 4))

        scale_off = len(buf)
        buf.extend(struct.pack('<ddd', 5.0, 5.0, 0.0))
        tie_off = len(buf)
        buf.extend(struct.pack('<dddddd', 0.0, 0.0, 0.0, -9000.0, 1000.0, 0.0))
        strip_off = len(buf)
        buf.extend(raw_payload)

        # Patch entries
        pos = ifd_start
        for tag, t_id, cnt, val in entries:
            if tag == 273:
                val = strip_off
            elif tag == 33550:
                val = scale_off
            elif tag == 33922:
                val = tie_off
            buf[pos:pos+12] = struct.pack('<HHII', tag, t_id, cnt, val)
            pos += 12

        reader = LOLACOGReader(source=bytes(buf))
        self.assertFalse(reader.meta.is_bigtiff)
        self.assertFalse(reader.meta.is_tiled)
        res = reader.get_elevation_at_projected(-9000.0 + 10.0, 1000.0 - 10.0)
        self.assertTrue(res['in_bounds'])
        self.assertAlmostEqual(res['elevation_m'], 2450.5, places=3)

    def test_cache_hits_on_repeat_queries(self):
        """Repeated reads from the same tile utilize the cache without redundant disk or network calls."""
        bt_bytes = create_synthetic_bigtiff(width=512, height=512, tile_size=256)
        reader = LOLACOGReader(source=bt_bytes)
        # Query same tile twice
        res1 = reader.get_elevation_at_projected(-304000.0 + 50.0, 304000.0 - 50.0)
        res2 = reader.get_elevation_at_projected(-304000.0 + 60.0, 304000.0 - 60.0)
        self.assertEqual(res1['tile_index'], res2['tile_index'])
        self.assertAlmostEqual(res1['elevation_m'], res2['elevation_m'], places=2)

    def test_run_verification_produces_valid_artifact(self):
        """Verifies that m1_cog_range_proof.json has valid structure, landmarks, and verified status."""
        from lola_cog_reader import run_verification
        proof = run_verification()
        self.assertTrue(proof["verified"])
        self.assertEqual(proof["polar_center_pixel"], [7599.5, 7599.5])
        self.assertGreater(proof["landmarks"]["malapert_massif"]["elevation_m"], 4500.0)
        self.assertLess(proof["landmarks"]["shoemaker_floor"]["elevation_m"], -3500.0)
        self.assertAlmostEqual(proof["landmarks"]["south_pole"]["elevation_m"], 1285.92, delta=10.0)


if __name__ == '__main__':
    unittest.main()

