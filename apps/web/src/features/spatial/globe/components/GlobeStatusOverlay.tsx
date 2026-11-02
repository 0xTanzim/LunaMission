import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { GlobeStatus } from '@/features/spatial/globe/scene/globeStatus';

export function GlobeUnavailablePanel() {
  return (
    <div className="w-full h-full min-h-[460px] flex flex-col items-center justify-center p-6 bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border)] rounded-[var(--lm-radius-lg)] text-center">
      <AlertCircle className="w-8 h-8 text-[var(--lm-color-warning)] mb-3" />
      <h3 className="text-base font-semibold text-[var(--lm-color-text-primary)]">
        WebGL Acceleration Unavailable
      </h3>
      <p className="text-xs text-[var(--lm-color-text-secondary)] max-w-sm mt-1 mb-4 leading-relaxed">
        The 3D lunar globe requires WebGL. Please use the high-precision 2D South-Pole Map or candidate
        selection ribbon below.
      </p>
    </div>
  );
}

export function GlobeLoadingOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[var(--lm-color-canvas)]/85 backdrop-blur-xs text-center p-4">
      <Loader2 className="w-8 h-8 text-[var(--lm-color-selected-site)] animate-spin mb-2.5" />
      <div className="text-xs font-semibold text-[var(--lm-color-text-primary)]">
        Loading NASA LRO Scientific Surface Model...
      </div>
      <div className="text-[11px] text-[var(--lm-color-text-muted)] font-mono mt-1">
        Applying LROC photometric albedo & LOLA DEM topographic relief
      </div>
    </div>
  );
}

export function GlobeTextureErrorBanner({ message }: { message: string }) {
  return (
    <div className="absolute top-14 left-3 right-3 z-20 flex items-center gap-2 p-2 rounded-[var(--lm-radius-sm)] bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-warning)]/40 text-xs text-[var(--lm-color-warning)]">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function GlobeContextLostBanner({ onRestore }: { onRestore?: () => void }) {
  return (
    <div
      role="alert"
      aria-labelledby="globe-context-lost-title"
      aria-describedby="globe-context-lost-desc"
      data-testid="globe-context-lost-banner"
      className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-[var(--lm-color-canvas)]/95 backdrop-blur-md border border-[var(--lm-color-warning)]/60 rounded-[var(--lm-radius-lg)] text-center font-mono"
    >
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-8 h-8 text-[var(--lm-color-warning)] animate-pulse" aria-hidden="true" />
        <span className="px-2.5 py-1 text-[11px] font-bold rounded bg-[var(--lm-color-warning)]/20 text-[var(--lm-color-warning)] border border-[var(--lm-color-warning)]/50 tracking-wider">
          [GPU CONTEXT INTERRUPTED]
        </span>
      </div>
      <h3 id="globe-context-lost-title" className="text-sm font-bold text-[var(--lm-color-warning)] uppercase tracking-wider">
        WebGL Device Context Reset
      </h3>
      <p id="globe-context-lost-desc" className="text-xs text-[var(--lm-color-text-secondary)] max-w-md mt-2 mb-5 leading-relaxed">
        The hardware graphics context was reset by the operating system or GPU driver. Render loop paused to preserve memory.
      </p>
      {onRestore && (
        <button
          type="button"
          onClick={onRestore}
          data-testid="globe-restore-context-button"
          className="min-h-[40px] px-5 py-2.5 text-xs font-bold rounded-md bg-[var(--lm-color-warning)] text-[var(--lm-color-canvas)] hover:bg-[var(--lm-color-warning)] transition-colors shadow-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lm-color-warning)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          Restore 3D Viewport
        </button>
      )}
    </div>
  );
}
