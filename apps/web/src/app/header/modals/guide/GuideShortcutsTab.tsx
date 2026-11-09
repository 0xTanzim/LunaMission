import React from 'react';
import { Keyboard, Palette, HelpCircle } from 'lucide-react';

const SHORTCUTS = [
  { key: 'Alt + 1', action: 'Jump to 1. Site Map (Spatial Workspace)' },
  { key: 'Alt + 2', action: 'Jump to 2. Analyze (Horizon Radar & Panorama)' },
  { key: 'Alt + 3', action: 'Jump to 3. Compare (Landing Site Navigator)' },
  { key: 'Alt + 4', action: 'Open 4. 3D Lab (Planetary Theater)' },
  { key: 'Alt + 5', action: 'Open 5. Cesium 3D (Photorealistic Lunar Tileset)' },
  { key: 'Spacebar', action: 'Play / Pause mission playhead timeline animation' },
  { key: 'Escape', action: 'Dismiss active modal or drawer and return focus' },
];

const COLOR_TOKENS = [
  {
    name: 'Solar Gold',
    token: 'var(--lm-color-sun)',
    desc: 'Sun vector azimuth/elevation, penumbral & umbral solar disk visibility',
  },
  {
    name: 'Earth Blue',
    token: 'var(--lm-color-earth)',
    desc: 'Earth direction, direct-to-Earth line-of-sight & optical libration curve',
  },
  {
    name: 'Site Teal',
    token: 'var(--lm-color-selected-site)',
    desc: 'Active landing site target & primary mission candidate',
  },
  {
    name: 'Warning Amber',
    token: 'var(--lm-color-warning)',
    desc: 'Topographic ridge crest obstruction & critical shadow periods',
  },
];

export const GuideShortcutsTab: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Shortcuts and Color Standards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Keyboard Shortcuts */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--lm-color-text-primary)]">
            <Keyboard size={14} className="text-[var(--lm-color-sun)]" />
            <h4>Flight Deck Keyboard Shortcuts</h4>
          </div>
          <div className="bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)] rounded-[var(--lm-radius-sm)] overflow-hidden">
            <table className="w-full text-[11px] font-mono">
              <tbody>
                {SHORTCUTS.map((s, idx) => (
                  <tr
                    key={s.key}
                    className={`border-b border-[var(--lm-color-border-subtle)] last:border-none ${
                      idx % 2 === 0 ? 'bg-[var(--lm-color-surface-raised)]/30' : ''
                    }`}
                  >
                    <td className="p-2 font-bold text-[var(--lm-color-text-primary)] whitespace-nowrap">
                      <kbd className="px-1.5 py-0.5 rounded bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] text-[11px]">
                        {s.key}
                      </kbd>
                    </td>
                    <td className="p-2 text-[var(--lm-color-text-secondary)]">{s.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Color Tokens */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--lm-color-text-primary)]">
            <Palette size={14} className="text-[var(--lm-color-earth)]" />
            <h4>Color Token Semantics (Non-Color Dependent)</h4>
          </div>
          <div className="space-y-2">
            {COLOR_TOKENS.map((c) => (
              <div
                key={c.name}
                className="flex items-start gap-2.5 p-2 rounded-[var(--lm-radius-sm)] bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)]"
              >
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 mt-0.5"
                  style={{ backgroundColor: c.token }}
                  aria-hidden="true"
                />
                <div className="text-[11px] leading-snug">
                  <span className="font-semibold text-[var(--lm-color-text-primary)]">{c.name}: </span>
                  <span className="text-[var(--lm-color-text-secondary)]">{c.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Brief Glossary */}
      <div className="p-3 rounded-[var(--lm-radius-sm)] bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--lm-color-text-primary)]">
          <HelpCircle size={14} className="text-[var(--lm-color-selected-site)]" />
          <h4>Glossary of Polar Mission Terms</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[var(--lm-color-text-secondary)]">
          <div>
            <strong className="text-[var(--lm-color-text-primary)]">LOLA DEM:</strong> Lunar Orbiter Laser Altimeter Digital Elevation Model (128 ppd, ~240m/pixel).
          </div>
          <div>
            <strong className="text-[var(--lm-color-text-primary)]">Optical Libration:</strong> Lunar wobbling (±7.9° lon, ±6.7° lat) causing Earth to oscillate near the horizon.
          </div>
          <div>
            <strong className="text-[var(--lm-color-text-primary)]">Launch Slip:</strong> Planned launch delay sensitivity (±0–7 days) to verify launch window robustness.
          </div>
          <div>
            <strong className="text-[var(--lm-color-text-primary)]">PSR:</strong> Permanently Shadowed Regions inside deep craters hosting prospective water-ice deposits.
          </div>
        </div>
      </div>
    </div>
  );
};
