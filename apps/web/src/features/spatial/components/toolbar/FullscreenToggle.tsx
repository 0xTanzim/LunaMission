import { Maximize2, Minimize2 } from 'lucide-react';

const FULLSCREEN_ACTIVE_CLASS =
  'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-selected-site)] border-[var(--lm-color-selected-site)] font-semibold';
const FULLSCREEN_IDLE_CLASS =
  'bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-text-secondary)] border-[var(--lm-color-border)] hover:text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-strong)]';

interface FullscreenToggleProps {
  isFullscreenActive: boolean;
  onToggleFullscreen: () => void;
}

/** Expands the spatial workspace to the whole viewport; Escape also exits. */
export function FullscreenToggle({ isFullscreenActive, onToggleFullscreen }: FullscreenToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggleFullscreen}
      title={isFullscreenActive ? 'Exit Fullscreen (Esc)' : 'Expand to Fullscreen Spatial Workspace (Mode B)'}
      aria-label={isFullscreenActive ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      aria-pressed={isFullscreenActive}
      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-[var(--lm-radius-sm)] border transition-colors min-h-[28px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lm-color-info)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
        isFullscreenActive ? FULLSCREEN_ACTIVE_CLASS : FULLSCREEN_IDLE_CLASS
      }`}
    >
      {isFullscreenActive ? (
        <>
          <Minimize2 className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Exit Fullscreen</span>
        </>
      ) : (
        <>
          <Maximize2 className="w-3.5 h-3.5 text-[var(--lm-color-selected-site)] shrink-0" />
          <span className="hidden sm:inline">Fullscreen</span>
        </>
      )}
    </button>
  );
}
