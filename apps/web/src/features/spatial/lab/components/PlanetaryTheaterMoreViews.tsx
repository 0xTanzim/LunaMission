import React, { useEffect, useId, useRef } from 'react';
import { ChevronUp, MoreHorizontal } from 'lucide-react';
import { CameraPreset } from '@/features/spatial/model/spatialPreferences';
import { CategorizedPreset, CATEGORIZED_PRESETS } from '@/features/spatial/config/cameraPresetCategories';

export interface PlanetaryTheaterMoreViewsProps {
  currentPreset: CameraPreset;
  onSelectCameraPreset: (preset: CameraPreset) => void;
  /** Controlled open state — the toolbar owns it so Escape/outside-close is coherent. */
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}

/**
 * "More views" popover (task 3.2): the tactical camera modes live behind one trigger so
 * the Camera group stays atomic at desktop widths. Mirrors the 2D WorkspaceOverflowMenu
 * a11y pattern: haspopup/expanded trigger, role="menu" panel, Escape closes.
 */
export function PlanetaryTheaterMoreViews({
  currentPreset,
  onSelectCameraPreset,
  open,
  onToggle,
  onClose,
}: PlanetaryTheaterMoreViewsProps) {
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  const tacticalPresets = CATEGORIZED_PRESETS.filter((p) => p.category === 'tactical');
  const active = tacticalPresets.find((p) => p.preset === currentPreset);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [open, onClose]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        data-testid="moreviews-trigger"
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={
          active
            ? `More views — active: ${active.label}`
            : 'More views: tactical camera modes (site, inspection, overhead, horizon, EVA, Earth align)'
        }
        title="More views: tactical camera modes"
        className={`flex items-center gap-1 px-2 py-1 text-xs rounded-[var(--lm-radius-xs)] font-medium transition-colors shrink-0 min-h-[28px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lm-color-info)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
          active
            ? 'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-selected-site)] border border-[var(--lm-color-selected-site)]/60 font-semibold'
            : 'text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)]'
        }`}
      >
        {active ? <active.Icon className="w-3 h-3" /> : <MoreHorizontal className="w-3.5 h-3.5" aria-hidden="true" />}
        <span className="hidden md:inline">{active ? active.label : 'More views'}</span>
        <ChevronUp className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      <div
        id={panelId}
        role="menu"
        aria-label="More views: tactical camera modes"
        hidden={!open}
        className="absolute right-0 bottom-[calc(100%+0.375rem)] z-50 flex w-60 flex-col gap-0.5 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface)] p-1 shadow-[var(--lm-shadow-popover)]"
      >
        {tacticalPresets.map((def: CategorizedPreset) => {
          const isActive = currentPreset === def.preset;
          const Icon = def.Icon;
          return (
            <button
              key={def.id}
              type="button"
              role="menuitem"
              data-testid={`moreviews-${def.id}`}
              aria-pressed={isActive}
              onClick={() => {
                onSelectCameraPreset(def.preset);
                onClose();
              }}
              className={`flex items-center gap-2 px-2 py-1.5 text-xs rounded-[var(--lm-radius-xs)] text-left transition-colors min-h-[28px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lm-color-info)] ${
                isActive
                  ? 'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-selected-site)] font-semibold'
                  : 'text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-raised)]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${def.iconClassName}`} aria-hidden="true" />
              <span>{def.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
