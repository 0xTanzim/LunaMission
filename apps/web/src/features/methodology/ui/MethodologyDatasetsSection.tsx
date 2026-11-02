import React from 'react';
import { Globe2, ExternalLink } from 'lucide-react';
import { Badge } from '@/shared/ui/Badge';

export function MethodologyDatasetsSection() {
  return (
    <section className="bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)] rounded-[var(--lm-radius-lg)] p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--lm-color-text-primary)]">
          <Globe2 className="w-4 h-4 text-[var(--lm-color-info)]" />
          <h2>2. Authoritative NASA & LPI Datasets (Direct Scientific Provenance)</h2>
        </div>
        <Badge variant="neutral">Open Science / NASA PDS</Badge>
      </div>

      <p className="text-xs text-[var(--lm-color-text-secondary)] leading-relaxed">
        LunaMission is strictly driven by peer-reviewed planetary datasets distributed by NASA Goddard Space Flight Center, the Lunar Reconnaissance Orbiter (LRO) mission team, and the Lunar and Planetary Institute (LPI). No synthetic or decorative topography is substituted.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* NASA Goddard PGDA 90 */}
        <div className="bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] p-3 rounded-[var(--lm-radius-sm)] flex flex-col justify-between gap-2">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--lm-color-text-primary)]">
              <span>NASA Goddard PGDA 90</span>
              <span className="text-[11px] font-mono text-[var(--lm-color-info)]">LDEM_128</span>
            </div>
            <p className="text-[11px] text-[var(--lm-color-text-secondary)] mt-1">
              Global LOLA Elevation Model (118 m/pixel) establishing reference datum, spherical harmonic baseline, and South Pole-Aitken (SPA) structural elevation gradients.
            </p>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-[var(--lm-color-border-subtle)] text-[11px] font-mono">
            <span className="text-[var(--lm-color-text-muted)]">Vertical Precision: ±1.2 m</span>
            <a
              href="https://pgda.gsfc.nasa.gov/products/90"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--lm-color-info)] hover:text-[var(--lm-color-info)] flex items-center gap-0.5 font-medium underline"
            >
              <span>pgda.gsfc.nasa.gov/products/90</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>

        {/* NASA Goddard PGDA 78 */}
        <div className="bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] p-3 rounded-[var(--lm-radius-sm)] flex flex-col justify-between gap-2">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--lm-color-text-primary)]">
              <span>NASA Goddard PGDA 78</span>
              <span className="text-[11px] font-mono text-[var(--lm-color-info)]">LDEM_875S_20M</span>
            </div>
            <p className="text-[11px] text-[var(--lm-color-text-secondary)] mt-1">
              High-Resolution LOLA Polar Stereographic DEMs (20 m & 30 m/pixel) capturing micro-topography across candidate rims (Shackleton, de Gerlache, Malapert, Nobile).
            </p>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-[var(--lm-color-border-subtle)] text-[11px] font-mono">
            <span className="text-[var(--lm-color-text-muted)]">Coverage: 85°S to 90°S</span>
            <a
              href="https://pgda.gsfc.nasa.gov/products/78"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--lm-color-info)] hover:text-[var(--lm-color-info)] flex items-center gap-0.5 font-medium underline"
            >
              <span>pgda.gsfc.nasa.gov/products/78</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>

        {/* LPI Lunar South Pole Atlas */}
        <div className="bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] p-3 rounded-[var(--lm-radius-sm)] flex flex-col justify-between gap-2">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--lm-color-text-primary)]">
              <span>LPI Lunar South Pole Atlas</span>
              <span className="text-[11px] font-mono text-[var(--lm-color-info)]">Geology & PSR</span>
            </div>
            <p className="text-[11px] text-[var(--lm-color-text-secondary)] mt-1">
              Stratigraphic units (Spudis et al., 2008), Diviner thermal measurements (&lt;110 K cryogenic traps), and multi-year solar persistence maps.
            </p>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-[var(--lm-color-border-subtle)] text-[11px] font-mono">
            <span className="text-[var(--lm-color-text-muted)]">Lunar & Planetary Institute</span>
            <a
              href="https://www.lpi.usra.edu/lunar/lunar-south-pole-atlas/"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--lm-color-info)] hover:text-[var(--lm-color-info)] flex items-center gap-0.5 font-medium underline"
            >
              <span>lpi.usra.edu/lunar-south-pole-atlas</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>

        {/* NASA LROC + ShadowCam Mosaic */}
        <div className="bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] p-3 rounded-[var(--lm-radius-sm)] flex flex-col justify-between gap-2">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--lm-color-text-primary)]">
              <span>NASA Shackleton Mosaic</span>
              <span className="text-[11px] font-mono text-[var(--lm-color-info)]">LROC + ShadowCam</span>
            </div>
            <p className="text-[11px] text-[var(--lm-color-text-secondary)] mt-1">
              Dual-sensor optical synthesis combining LROC Narrow Angle Camera sunlit rim imagery with ShadowCam high-sensitivity permanent shadow floor visualization.
            </p>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-[var(--lm-color-border-subtle)] text-[11px] font-mono">
            <span className="text-[var(--lm-color-text-muted)]">NASA Science / KARI ShadowCam</span>
            <a
              href="https://www.nasa.gov/missions/lro/nasa-moon-camera-mosaic-sheds-light-on-lunar-south-pole/"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--lm-color-info)] hover:text-[var(--lm-color-info)] flex items-center gap-0.5 font-medium underline"
            >
              <span>nasa.gov/missions/lro</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
