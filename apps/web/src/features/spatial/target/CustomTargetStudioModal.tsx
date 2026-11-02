import React, { useState, useEffect } from 'react';
import {
  createCustomLandingTarget,
  CustomLandingTarget,
  validateCustomTargetCoordinates,
} from '@/domain/target/customTargetModel';
import { sampleLolaTerrain } from '@/domain/terrain/lolaSouthPoleDemSampler';

export interface CustomTargetStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTarget: (target: CustomLandingTarget) => void;
  initialTarget?: CustomLandingTarget | null;
}

const PRESET_COORDINATES = [
  { name: 'Shackleton South Ridge', lat: -89.75, lon: 180.0 },
  { name: 'de Gerlache Pass', lat: -88.5, lon: 271.4 },
  { name: 'Malapert Saddle', lat: -86.0, lon: 2.5 },
  { name: 'Amundsen High Rim', lat: -84.5, lon: 82.8 },
];

export function CustomTargetStudioModal({
  isOpen,
  onClose,
  onSaveTarget,
  initialTarget,
}: CustomTargetStudioModalProps) {
  const [name, setName] = useState(initialTarget?.name ?? '');
  const [latInput, setLatInput] = useState(initialTarget?.latitudeDeg.toFixed(3) ?? '-88.500');
  const [lonInput, setLonInput] = useState(initialTarget?.longitudeDeg.toFixed(3) ?? '120.000');
  const [elevationMeters, setElevationMeters] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTarget) {
      setName(initialTarget.name);
      setLatInput(initialTarget.latitudeDeg.toFixed(3));
      setLonInput(initialTarget.longitudeDeg.toFixed(3));
    }
  }, [initialTarget]);

  // Dynamically resolve LOLA terrain elevation on coordinate update
  useEffect(() => {
    const lat = parseFloat(latInput);
    const lon = parseFloat(lonInput);
    const validation = validateCustomTargetCoordinates(lat, lon);
    if (validation.isValid) {
      const terrain = sampleLolaTerrain(validation.normalizedLat, validation.normalizedLon);
      setElevationMeters(terrain.elevationMeters);
      setError(null);
    } else {
      setError(validation.error ?? 'Invalid coordinate bounds');
    }
  }, [latInput, lonInput]);

  if (!isOpen) return null;

  const handleSave = () => {
    const lat = parseFloat(latInput);
    const lon = parseFloat(lonInput);
    const validation = validateCustomTargetCoordinates(lat, lon);
    if (!validation.isValid) {
      setError(validation.error ?? 'Invalid coordinate bounds');
      return;
    }

    const target = createCustomLandingTarget({
      name: name.trim() || undefined,
      latitudeDeg: validation.normalizedLat,
      longitudeDeg: validation.normalizedLon,
      elevationKm: elevationMeters / 1000.0,
    });

    onSaveTarget(target);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--lm-color-canvas)]/75 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)] rounded-xl shadow-2xl p-6 text-[var(--lm-color-text-primary)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-target-title"
      >
        <div className="flex items-center justify-between border-b border-[var(--lm-color-border-subtle)] pb-4 mb-4">
          <div>
            <h2 id="custom-target-title" className="text-lg font-bold flex items-center gap-2">
              <span className="text-[var(--lm-color-warning)]">📍</span> Custom Landing Target Studio
            </h2>
            <p className="text-xs text-[var(--lm-color-text-secondary)] mt-0.5">
              Specify arbitrary South Pole coordinates with NASA LOLA DEM resolution.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)] transition-colors p-1"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--lm-color-text-secondary)] mb-1">Target Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Artemis Sub-Ridge Bravo"
              className="w-full bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--lm-color-warning)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--lm-color-text-secondary)] mb-1">Latitude (°S: -90° to -70°)</label>
              <input
                type="number"
                step="0.001"
                value={latInput}
                onChange={(e) => setLatInput(e.target.value)}
                className="w-full bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[var(--lm-color-warning)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--lm-color-text-secondary)] mb-1">Longitude (°E: 0° to 360°)</label>
              <input
                type="number"
                step="0.001"
                value={lonInput}
                onChange={(e) => setLonInput(e.target.value)}
                className="w-full bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[var(--lm-color-warning)]"
              />
            </div>
          </div>

          <div className="bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)] rounded-lg p-3 text-xs flex items-center justify-between">
            <span className="text-[var(--lm-color-text-muted)]">LOLA Elevation (Datum R=1737.4 km):</span>
            <span className="font-mono font-bold text-[var(--lm-color-warning)]">
              {elevationMeters >= 0 ? `+${elevationMeters.toFixed(0)}` : elevationMeters.toFixed(0)} m ({ (elevationMeters / 1000).toFixed(2) } km)
            </span>
          </div>

          <div>
            <span className="block text-[11px] font-semibold text-[var(--lm-color-text-muted)] mb-1.5">Quick South Pole Presets:</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COORDINATES.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => {
                    setName(p.name);
                    setLatInput(p.lat.toFixed(3));
                    setLonInput(p.lon.toFixed(3));
                  }}
                  className="text-[11px] bg-[var(--lm-color-surface-strong)] hover:bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-text-secondary)] border border-[var(--lm-color-border)] rounded px-2.5 py-1 transition-colors"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-[var(--lm-color-danger-surface-strong)] border border-[var(--lm-color-danger)]/50 rounded-lg p-2.5 text-xs text-[var(--lm-color-danger)]">
              ⚠️ {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-[var(--lm-color-border-subtle)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={Boolean(error)}
            className="px-4 py-2 text-xs font-semibold bg-[var(--lm-color-warning)] hover:bg-[var(--lm-color-warning)] disabled:opacity-50 text-[var(--lm-color-canvas)] font-bold rounded-lg shadow transition-colors"
          >
            Save & Inspect Target
          </button>
        </div>
      </div>
    </div>
  );
}
