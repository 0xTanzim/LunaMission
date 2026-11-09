import React from 'react';
import { AlertTriangle, ShieldCheck, Sun, Radio, Mountain, Clock } from 'lucide-react';

export const GuideStandardsTab: React.FC = () => {
  return (
    <div className="space-y-3.5">
      <div className="p-3 rounded-[var(--lm-radius-sm)] bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] flex items-start gap-2.5">
        <ShieldCheck size={18} className="text-[var(--lm-color-selected-site)] shrink-0 mt-0.5" />
        <div className="text-xs text-[var(--lm-color-text-secondary)] leading-relaxed">
          <strong className="text-[var(--lm-color-text-primary)] block mb-0.5">
            NASA Scientific Integrity & Aerospace Epistemic Contract
          </strong>
          LunaMission adheres to strict epistemic honesty standards. All calculations derive from real NASA PDS/Horizons datasets. We explicitly separate geometric line-of-sight from operational mission performance.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Rule 1: Sunlight vs Power */}
        <div className="p-3 rounded-[var(--lm-radius-sm)] bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)] space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--lm-color-sun)]">
            <Sun size={14} />
            <h4>Geometric Sunlight ≠ Electrical Power Generation (Watts)</h4>
          </div>
          <p className="text-[11px] text-[var(--lm-color-text-secondary)] leading-relaxed">
            Ray-tracing indicates when the solar disk is unobstructed by LOLA topography, but does not guarantee electrical power generation, which depends on solar incidence angle (<code className="font-mono text-[var(--lm-color-text-primary)]">cos θ</code> loss), solar array orientation, panel dust degradation, and battery storage capacity.
          </p>
        </div>

        {/* Rule 2: LoS vs RF Comms */}
        <div className="p-3 rounded-[var(--lm-radius-sm)] bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)] space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--lm-color-earth)]">
            <Radio size={14} />
            <h4>Line-of-Sight ≠ Closed RF Telecommunications</h4>
          </div>
          <p className="text-[11px] text-[var(--lm-color-text-secondary)] leading-relaxed">
            Direct geometric view of Earth is a required baseline, but does not guarantee closed radio communications, which require transmitter link margin, high-gain antenna steering, Deep Space Network (DSN) ground station scheduling, and multipath scattering mitigation.
          </p>
        </div>

        {/* Rule 3: Terrain-Aware vs Geometry-Only */}
        <div className="p-3 rounded-[var(--lm-radius-sm)] bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)] space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--lm-color-selected-site)]">
            <Mountain size={14} />
            <h4>LOLA Terrain-Aware vs Geometry-Only Reference</h4>
          </div>
          <p className="text-[11px] text-[var(--lm-color-text-secondary)] leading-relaxed">
            <strong>Geometry-Only:</strong> Evaluates clearance against a 1,737.4 km mean lunar sphere.<br />
            <strong>Terrain-Aware:</strong> Integrates LRO LOLA DEM 128ppd elevation, accounting for horizon dip angles (e.g. -4.0° on the Shackleton rim at +4.2 km) and distant shielding massifs.
          </p>
        </div>

        {/* Rule 4: Ephemeris & Time */}
        <div className="p-3 rounded-[var(--lm-radius-sm)] bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)] space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--lm-color-info)]">
            <Clock size={14} />
            <h4>NASA JPL Horizons & Synchronized UTC</h4>
          </div>
          <p className="text-[11px] text-[var(--lm-color-text-secondary)] leading-relaxed">
            Celestial vectors are queried dynamically from the NASA JPL Horizons REST API (<code className="font-mono text-[var(--lm-color-text-primary)]">coord@301</code>) and DE421 ephemeris in the IAU MOON_ME reference frame. All computations synchronize to UTC without local browser timezone distortion.
          </p>
        </div>
      </div>

      <div className="p-2.5 rounded-[var(--lm-radius-sm)] bg-[var(--lm-color-warning)]/10 border border-[var(--lm-color-warning)]/30 flex items-center gap-2 text-[11px] text-[var(--lm-color-warning)]">
        <AlertTriangle size={14} className="shrink-0" />
        <span>
          <strong>Finite Solar Disk:</strong> The Sun spans ~0.53° of equatorial diameter. LunaMission accurately computes penumbral grazing boundaries where the limb rises before the solar center.
        </span>
      </div>
    </div>
  );
};
