import {
  TOGGLE_STATE_ON_CLASS,
  TOOLBAR_BUTTON_IDLE_CLASS,
  TOOLBAR_GROUP_CLASS,
  VIEW_MODES,
} from '@/features/spatial/config/spatialToolbarOptions';
import { SpatialViewMode } from '@/features/spatial/model/spatialViewMode';

interface ViewModeSelectorProps {
  viewMode: SpatialViewMode;
  onViewModeChange: (mode: SpatialViewMode) => void;
  /** True while the 3D scene behind the active mode is still loading; exposes aria-busy. */
  globePending?: boolean;
}

/** Which visualisations are on screen: 2D map, dual, or the 3D globe. */
export function ViewModeSelector({ viewMode, onViewModeChange, globePending = false }: ViewModeSelectorProps) {
  return (
    <div className={TOOLBAR_GROUP_CLASS} role="group" aria-label="Spatial View Projections">
      {VIEW_MODES.map(({ mode, label, title, ariaLabel, Icon }) => {
        const isActive = viewMode === mode;
        // Only globe-bearing modes can be "busy on the globe's behalf": a 2D-only view
        // stays responsive while the hidden globe warms up.
        const isGlobePendingHere = isActive && globePending && mode !== 'map2d';
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onViewModeChange(mode)}
            title={title}
            aria-label={ariaLabel}
            aria-pressed={isActive}
            aria-busy={isGlobePendingHere ? true : undefined}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-[var(--lm-radius-xs)] transition-colors min-h-[28px] whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lm-color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--lm-color-canvas)] ${
              isActive ? TOGGLE_STATE_ON_CLASS : TOOLBAR_BUTTON_IDLE_CLASS
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
