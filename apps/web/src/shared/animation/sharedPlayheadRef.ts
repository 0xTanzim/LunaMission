/**
 * Decoupled High-Frequency Shared Playhead Buffer
 * Governed by docs/phase-3/FRONTEND_ARCHITECTURE.md § 4.1.
 * Writes high-frequency pointer dragging directly to Float64Array to bypass React reconciliation.
 */

export interface PlayheadBufferLayout {
  epochMs: number;           // Slot 0: Current playhead epoch in milliseconds
  sunAzimuthDeg: number;     // Slot 1: Sun topocentric azimuth [0, 360)
  sunElevationDeg: number;   // Slot 2: Sun topocentric elevation [-90, +90]
  earthAzimuthDeg: number;   // Slot 3: Earth topocentric azimuth [0, 360)
  earthElevationDeg: number; // Slot 4: Earth topocentric elevation [-90, +90]
  blockerAzimuthDeg: number; // Slot 5: Bearing of blocking mountain peak (-1 if unblocked)
  blockerDistanceKm: number; // Slot 6: Geodesic distance to blocking peak
  dirtyFlag: number;         // Slot 7: 1.0 = new telemetry written, 0.0 = clean
}

export class SharedPlayheadController {
  private buffer = new Float64Array(8);
  private version = 0;
  private listeners: Set<(buffer: Float64Array) => void> = new Set();

  public write(telemetry: Partial<PlayheadBufferLayout>): void {
    if (telemetry.epochMs !== undefined) this.buffer[0] = telemetry.epochMs;
    if (telemetry.sunAzimuthDeg !== undefined) this.buffer[1] = telemetry.sunAzimuthDeg;
    if (telemetry.sunElevationDeg !== undefined) this.buffer[2] = telemetry.sunElevationDeg;
    if (telemetry.earthAzimuthDeg !== undefined) this.buffer[3] = telemetry.earthAzimuthDeg;
    if (telemetry.earthElevationDeg !== undefined) this.buffer[4] = telemetry.earthElevationDeg;
    if (telemetry.blockerAzimuthDeg !== undefined) this.buffer[5] = telemetry.blockerAzimuthDeg;
    if (telemetry.blockerDistanceKm !== undefined) this.buffer[6] = telemetry.blockerDistanceKm;
    this.buffer[7] = 1.0; // Mark dirty
    this.version++;
    for (const listener of this.listeners) {
      listener(this.buffer);
    }
  }

  public read(): Float64Array {
    return this.buffer;
  }

  public getVersion(): number {
    return this.version;
  }

  public subscribe(listener: (buffer: Float64Array) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public clearDirty(): void {
    this.buffer[7] = 0.0;
  }

  public isDirty(): boolean {
    return this.buffer[7] === 1.0;
  }
}

export const sharedPlayheadController = new SharedPlayheadController();
