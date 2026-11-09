import React from 'react';
import { Compass, Eye, BarChart3, Globe, FileText, CheckCircle2 } from 'lucide-react';

interface StepCardProps {
  step: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  bullets: string[];
}

function StepCard({ step, title, icon, description, bullets }: StepCardProps) {
  return (
    <div className="bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] rounded-[var(--lm-radius-sm)] p-3.5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-[var(--lm-color-sun)] bg-[var(--lm-color-sun)]/10 px-2 py-0.5 rounded border border-[var(--lm-color-sun)]/30">
            {step}
          </span>
          <h4 className="text-xs font-semibold text-[var(--lm-color-text-primary)]">{title}</h4>
        </div>
        <div className="text-[var(--lm-color-text-secondary)]">{icon}</div>
      </div>
      <p className="text-[11px] leading-relaxed text-[var(--lm-color-text-secondary)]">{description}</p>
      <ul className="text-[11px] text-[var(--lm-color-text-secondary)] space-y-1 list-none pl-0">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <CheckCircle2 size={12} className="text-[var(--lm-color-selected-site)] shrink-0 mt-0.5" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const GuideQuickStartTab: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Executive Intro Banner */}
      <div className="p-3.5 rounded-[var(--lm-radius-sm)] bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border-strong)]">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--lm-color-sun)] mb-1">
          LunaMission Operational Sequence
        </h3>
        <p className="text-xs leading-relaxed text-[var(--lm-color-text-secondary)]">
          Follow this 4-step aerospace workflow to evaluate lunar south-polar landing sites (80°S–90°S) for solar illumination continuity, direct-to-Earth line-of-sight, and topographic horizon obstruction.
        </p>
      </div>

      {/* Grid of Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <StepCard
          step="STEP 1"
          title="Mission Scenario Configuration"
          icon={<Compass size={16} />}
          description="Use the top Scenario Parameter Bar to define the operational boundary conditions:"
          bullets={[
            'Target Site: Choose from 17 Artemis candidate regions and historic sites.',
            'Start Epoch & Duration: Set UTC mission calendar (e.g. Nov 2026, 14–28 days).',
            'Mast Height: 1m to 10m mast, or 2m EVA astronaut suit eye-level.',
            'Launch Slip Offset: Simulate mission slips from ±0 to 7 days.',
          ]}
        />

        <StepCard
          step="STEP 2"
          title="1. Site Map (Spatial Workspace)"
          icon={<Eye size={16} />}
          description="Inspect candidate topography and geodesic spatial coordinates in 2D or 3D:"
          bullets={[
            '2D Polar Stereographic: Native 83°S–90°S projection with LOLA elevation.',
            'Overlays: Toggle Crater boundaries, Graticule grid, and PSR regions.',
            'Vectors: Inspect real-time sub-solar and sub-Earth azimuth vectors.',
            'Point Passport: Open geodesic dossier with slope, elevation, and coordinates.',
          ]}
        />

        <StepCard
          step="STEP 3"
          title="2. Analyze (360° Sky-Ribbon)"
          icon={<BarChart3 size={16} />}
          description="Read local topographic horizon occlusion and solar/Earth trajectories:"
          bullets={[
            '360° Panorama: Full azimuth horizon mask with blocking crater ridges.',
            'Solar Disk Access: Grazing penumbral vs umbral illumination states.',
            'Earth Libration: Direct-to-Earth line-of-sight elevation curve.',
            'Playhead Scrubber: Drag time cursor or press Spacebar to animate.',
          ]}
        />

        <StepCard
          step="STEP 4"
          title="3. Compare (Site Navigator)"
          icon={<Globe size={16} />}
          description="Evaluate and rank multiple landing sites side-by-side using multi-attribute metrics:"
          bullets={[
            '3-Tier Funnel: Candidate regions, point sites, and negative controls.',
            'Delta Radar: Compare sunlight hours, Earth visibility, and max shadow gap.',
            'Recommendation Engine: Automatic top-ranked site highlight based on criteria.',
            'Side-by-Side Matrix: Direct delta analysis across all operational parameters.',
          ]}
        />
      </div>

      {/* Supplementary Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="p-3 rounded-[var(--lm-radius-sm)] bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)]">
          <div className="flex items-center gap-1.5 font-semibold text-xs text-[var(--lm-color-text-primary)] mb-1">
            <Globe size={14} className="text-[var(--lm-color-info)]" />
            <span>4. 3D Lab & 5. Cesium 3D</span>
          </div>
          <p className="text-[11px] text-[var(--lm-color-text-secondary)] leading-relaxed">
            Switch to the 3D Planetary Theater to inspect real-time terminator shadows and the Cesium 3D photorealistic lunar tileset with camera flyover presets.
          </p>
        </div>

        <div className="p-3 rounded-[var(--lm-radius-sm)] bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)]">
          <div className="flex items-center gap-1.5 font-semibold text-xs text-[var(--lm-color-text-primary)] mb-1">
            <FileText size={14} className="text-[var(--lm-color-sun)]" />
            <span>Export Mission Dossier</span>
          </div>
          <p className="text-[11px] text-[var(--lm-color-text-secondary)] leading-relaxed">
            Click <strong>Dossier</strong> in the Scenario Config Bar to generate an authoritative, printable PDF flight planning dossier with complete audit metadata.
          </p>
        </div>
      </div>
    </div>
  );
};
