import { describe, expect, it } from 'bun:test';
import { SharedPlayheadController } from '../sharedPlayheadRef';

describe('SharedPlayheadController: Zero-GC 60 FPS Telemetry Buffer', () => {
  it('initializes buffer with zeros and clean dirty flag', () => {
    const ctrl = new SharedPlayheadController();
    const buf = ctrl.read();
    expect(buf.length).toBe(8);
    expect(buf[0]).toBe(0);
    expect(buf[7]).toBe(0); // clean
  });

  it('atomically updates telemetry slots and sets dirty flag', () => {
    const ctrl = new SharedPlayheadController();
    ctrl.write({
      epochMs: 1793491200000,
      sunAzimuthDeg: 120.5,
      sunElevationDeg: 1.45,
      earthAzimuthDeg: 45.2,
      earthElevationDeg: 8.9,
      blockerAzimuthDeg: 119.8,
      blockerDistanceKm: 42.6,
    });

    const buf = ctrl.read();
    expect(buf[0]).toBe(1793491200000);
    expect(buf[1]).toBeCloseTo(120.5, 2);
    expect(buf[2]).toBeCloseTo(1.45, 2);
    expect(buf[3]).toBeCloseTo(45.2, 2);
    expect(buf[4]).toBeCloseTo(8.9, 2);
    expect(buf[5]).toBeCloseTo(119.8, 2);
    expect(buf[6]).toBeCloseTo(42.6, 2);
    expect(buf[7]).toBe(1.0); // dirty

    ctrl.clearDirty();
    expect(ctrl.read()[7]).toBe(0.0);
  });

  it('supports partial writes without corrupting existing slots', () => {
    const ctrl = new SharedPlayheadController();
    ctrl.write({ epochMs: 1000, sunAzimuthDeg: 50.0 });
    ctrl.write({ sunAzimuthDeg: 55.0 });

    const buf = ctrl.read();
    expect(buf[0]).toBe(1000);
    expect(buf[1]).toBe(55.0);
  });
});
