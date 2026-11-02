import React from 'react';
import { BookOpen, Compass, Database, AlertTriangle } from 'lucide-react';
import { MethodologyDatasetsSection } from './MethodologyDatasetsSection';
import { MethodologyBenchmarksSection } from './MethodologyBenchmarksSection';

export function MethodAndDataView() {
  return (
    <div className="flex flex-col gap-6 py-2 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)] rounded-[var(--lm-radius-lg)] p-5">
        <div className="flex items-center gap-2 mb-1.5">
          <BookOpen className="w-5 h-5 text-[var(--lm-color-sun)]" />
          <h1 className="text-xl font-bold text-[var(--lm-color-text-primary)] tracking-tight">
            Scientific Method, Provenance & Data Specifications
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[var(--lm-color-text-secondary)] leading-relaxed">
          Full documentation of the celestial mechanics algorithms, lunar coordinate frames, topography datasets, validation benchmarks, and operational limitations governing LunaMission.
        </p>
      </div>

      {/* Ephemeris & Astronomy Calculations */}
      <section className="bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)] rounded-[var(--lm-radius-lg)] p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--lm-color-text-primary)]">
          <Compass className="w-4 h-4 text-[var(--lm-color-sun)]" />
          <h2>1. Celestial Ephemeris & Frame Conventions</h2>
        </div>

        <div className="text-xs text-[var(--lm-color-text-secondary)] space-y-2.5 leading-relaxed">
          <p>
            Sub-solar and sub-Earth coordinates are computed using analytical ephemeris formulations equivalent to the <strong>NASA JPL DE421 planetary ephemeris</strong> standard, projected into the <strong>IAU/IAG 2015 Lunar Mean Earth / Polar Axis</strong> coordinate frame.
          </p>

          <div className="bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] rounded-[var(--lm-radius-sm)] p-3 font-mono text-[11px] space-y-1">
            <div><strong>Reference Epoch:</strong> J2000.0 (JD 2451545.0, 2000-01-01 12:00:00 UTC)</div>
            <div><strong>Lunar Obliquity:</strong> 1.5424° (relative to ecliptic normal)</div>
            <div><strong>Synodic Month:</strong> 29.530588 days (mean solar day on Moon)</div>
            <div><strong>Optical Libration Bounds:</strong> Longitude ±7.92°, Latitude ±6.68°</div>
            <div><strong>Mean Lunar Radius:</strong> R_moon = 1,737.4 km</div>
          </div>
        </div>
      </section>

      {/* Authoritative NASA & LPI Scientific Datasets */}
      <MethodologyDatasetsSection />

      {/* Terrain & Horizon Profile Methodology */}
      <section className="bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)] rounded-[var(--lm-radius-lg)] p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--lm-color-text-primary)]">
          <Database className="w-4 h-4 text-[var(--lm-color-selected-site)]" />
          <h2>3. Topography & Elevation Data Coverage</h2>
        </div>

        <div className="text-xs text-[var(--lm-color-text-secondary)] space-y-2.5 leading-relaxed">
          <p>
            Lunar south polar topography is derived from the <strong>Lunar Reconnaissance Orbiter (LRO) Lunar Orbiter Laser Altimeter (LOLA) Digital Elevation Model</strong> at 128 pixels per degree (approximately 240 m/pixel at polar latitudes, NASA PDS Geosciences Node).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] p-3 rounded-[var(--lm-radius-sm)]">
              <div className="font-semibold text-xs text-[var(--lm-color-text-primary)] mb-1">
                Terrain-Aware Mode
              </div>
              <p className="text-[11px] text-[var(--lm-color-text-muted)]">
                Accounts for observer elevation dip angle above surrounding craters (e.g. -4.0° dip on Shackleton rim at +4.2 km) and ray-traces azimuth-dependent crests from adjacent massifs.
              </p>
            </div>
            <div className="bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] p-3 rounded-[var(--lm-radius-sm)]">
              <div className="font-semibold text-xs text-[var(--lm-color-text-primary)] mb-1">
                Geometry-Only Mode
              </div>
              <p className="text-[11px] text-[var(--lm-color-text-muted)]">
                Evaluates solar and Earth elevation directly against the spherical mathematical mean lunar radius (1,737.4 km) without topographic masking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benchmark Validation Report */}
      <MethodologyBenchmarksSection />

      {/* Critical Scientific Caveats and Boundaries */}
      <section className="bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)] rounded-[var(--lm-radius-lg)] p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--lm-color-text-primary)]">
          <AlertTriangle className="w-4 h-4 text-[var(--lm-color-warning)]" />
          <h2>5. Critical Scientific Caveats & Engineering Constraints</h2>
        </div>

        <div className="space-y-3 text-xs text-[var(--lm-color-text-secondary)]">
          <div className="p-3 rounded-[var(--lm-radius-sm)] bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)]">
            <strong className="text-[var(--lm-color-text-primary)] block mb-1">
              • Direct-to-Earth (DTE) Line-of-Sight vs RF Link Closure:
            </strong>
            Geometric visibility implies that the mathematical center of Earth is above the local topographic horizon. It does NOT guarantee closed radio communications, which depends on RF frequency, transmitter power, high-gain antenna steering, multipath fading, and ground network dish visibility.
          </div>

          <div className="p-3 rounded-[var(--lm-radius-sm)] bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)]">
            <strong className="text-[var(--lm-color-text-primary)] block mb-1">
              • Theoretical Vacuum Light-Time vs Operational Latency:
            </strong>
            Theoretical one-way light-time is calculated as <code className="font-mono text-[var(--lm-color-text-primary)]">t = distance / c</code> in vacuum (~1.21 to 1.35 seconds). Operational teleoperation ping latency also includes spacecraft demodulation, terrestrial fiber backhaul routing, ground station processing, and protocol stack delays (~2.8 to 4.5 seconds round-trip).
          </div>

          <div className="p-3 rounded-[var(--lm-radius-sm)] bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)]">
            <strong className="text-[var(--lm-color-text-primary)] block mb-1">
              • Sub-Solar Disk Center vs Solar Grazing Limb:
            </strong>
            The Sun has an angular diameter of ~0.53° (±0.267° radius). When the solar center is within ±0.267° of the horizon, partial penumbral grazing illumination occurs where only a portion of the solar disk is visible above the crest.
          </div>
        </div>
      </section>
    </div>
  );
}
