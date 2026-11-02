import React, { useState } from 'react';
import { RotateCw, RotateCcw, Crosshair } from 'lucide-react';
import { PlanetaryTheaterMoreViews } from './PlanetaryTheaterMoreViews';
import { CameraPreset } from '@/features/spatial/model/spatialPreferences';
import {
  CATEGORIZED_PRESETS,
  PRESET_CATEGORY_LABELS,
} from '@/features/spatial/config/cameraPresetCategories';

export interface PlanetaryTheaterCameraButtonsProps {
  currentPreset: CameraPreset;
  onSelectCameraPreset: (preset: CameraPreset) => void;
  isFlyoverActive: boolean;
  onToggleFlyover: () => void;
  /** Camera-only reset: restores framing without touching the selected site (task 2.9). */
  onResetCamera: () => void;
  /** Explicit selection reset — rendered only when provided. */
  onResetSelection?: () => void;
}

export function PlanetaryTheaterCameraButtons({
  currentPreset,
  onSelectCameraPreset,
  isFlyoverActive,
  onToggleFlyover,
  onResetCamera,
  onResetSelection,
}: PlanetaryTheaterCameraButtonsProps) {
  // Primary framings stay inline; the tactical modes collapse into "More views" (task 3.2).
  const categories: Array<'global' | 'southPole'> = ['global', 'southPole'];
  const [isMoreViewsOpen, setIsMoreViewsOpen] = useState(false);

  return (
    <div
      data-group="camera-modes"
      data-slot="camera-modes"
      role="region"
      aria-label="Camera Views"
      className="flex items-center gap-1.5 flex-wrap lg:flex-nowrap lg:shrink-0 bg-[var(--lm-color-surface-raised)] p-1 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border-subtle)]"
    >
      <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--lm-color-text-muted)] px-1 hidden xl:inline shrink-0">
        Camera:
      </span>

      {categories.map((catKey) => {
        const presets = CATEGORIZED_PRESETS.filter((p) => p.category === catKey);
        return (
          <div
            key={catKey}
            role="group"
            aria-label={PRESET_CATEGORY_LABELS[catKey]}
            className="flex items-center gap-0.5 shrink-0 pl-1 border-l border-[var(--lm-color-border-subtle)] first:border-l-0 first:pl-0"
          >
            {presets.map((def) => {
              const isActive =
                currentPreset === def.preset || (def.id === 'oblique' && currentPreset === 'oblique');
              const Icon = def.Icon;
              return (
                <button
                  key={def.id}
                  type="button"
                  data-testid={`preset-${def.preset}`}
                  data-preset={def.id}
                  data-preset-id={def.id}
                  onClick={() => onSelectCameraPreset(def.preset)}
                  aria-pressed={isActive}
                  aria-label={def.label}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded-[var(--lm-radius-xs)] font-medium transition-colors shrink-0 min-h-[28px] min-w-[28px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lm-color-info)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                    isActive
                      ? 'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-selected-site)] border border-[var(--lm-color-selected-site)]/60 font-semibold'
                      : 'text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)]'
                  }`}
                  title={def.title}
                >
                  <Icon className={`w-3 h-3 ${def.iconClassName}`} />
                  <span className="hidden md:inline">{def.label}</span>
                  {def.id !== def.preset && (
                    <span
                      data-testid={`preset-${def.id}`}
                      className="sr-only"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        );
      })}

      <PlanetaryTheaterMoreViews
        currentPreset={currentPreset}
        onSelectCameraPreset={onSelectCameraPreset}
        open={isMoreViewsOpen}
        onToggle={() => setIsMoreViewsOpen((prev) => !prev)}
        onClose={() => setIsMoreViewsOpen(false)}
      />

      <button
        type="button"
        data-testid="toggle-flyover"
        onClick={onToggleFlyover}
        aria-pressed={isFlyoverActive}
        aria-label={isFlyoverActive ? 'Pause Flyover' : 'Start Flyover'}
        className={`flex items-center gap-1 px-2 py-1 text-xs rounded-[var(--lm-radius-xs)] font-medium transition-colors shrink-0 min-h-[28px] min-w-[28px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lm-color-info)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
          isFlyoverActive
            ? 'bg-[var(--lm-color-danger)]/20 text-[var(--lm-color-danger)] border border-[var(--lm-color-danger)]/60 font-semibold'
            : 'text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)]'
        }`}
        title={isFlyoverActive ? 'Pause Guided Crater Flyover' : 'Start 360° Guided Flyover Tour'}
      >
        <RotateCw className={`w-3 h-3 ${isFlyoverActive ? 'animate-spin' : ''}`} />
        <span>{isFlyoverActive ? 'Touring' : 'Flyover'}</span>
      </button>

      <button
        type="button"
        data-testid="btn-reset-camera"
        onClick={onResetCamera}
        aria-label="Reset Camera View"
        className="flex items-center gap-1 px-2 py-1 text-xs rounded-[var(--lm-radius-xs)] font-medium text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)] transition-colors border border-transparent hover:border-[var(--lm-color-border-subtle)] shrink-0 min-h-[28px] min-w-[28px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lm-color-info)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        title="Reset Camera View: restores the South Pole cap framing (the selected site is kept)"
      >
        <RotateCcw className="w-3 h-3" />
        <span className="hidden md:inline">Reset</span>
      </button>

      {onResetSelection && (
        <button
          type="button"
          data-testid="btn-reset-selection"
          onClick={onResetSelection}
          aria-label="Reset Selection to the default candidate site"
          className="flex items-center gap-1 px-2 py-1 text-xs rounded-[var(--lm-radius-xs)] font-medium text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)] transition-colors border border-transparent hover:border-[var(--lm-color-border-subtle)] shrink-0 min-h-[28px] min-w-[28px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lm-color-info)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          title="Reset Selection: returns the analysis to the default candidate site"
        >
          <Crosshair className="w-3 h-3" />
          <span className="hidden md:inline">Reset Selection</span>
        </button>
      )}
    </div>
  );
}
