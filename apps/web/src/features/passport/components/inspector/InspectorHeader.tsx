import React from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { CandidateSite } from '@/domain/sites/candidateSite';
import type { CalculationMode } from '@/domain/celestial/calculationMode';
import type { InspectorViewport } from '@/features/passport/hooks/useInspectorViewport';

const TOOL_BUTTON_CLASS =
  'p-1.5 rounded-[var(--lm-radius-xs)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-raised)]';
const PAN_BUTTON_CLASS =
  'p-1.5 rounded-[var(--lm-radius-xs)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] disabled:opacity-30 disabled:hover:text-[var(--lm-color-text-secondary)]';

interface InspectorHeaderProps {
  site: CandidateSite;
  currentIsoUtc: string;
  calculationMode: CalculationMode;
  viewport: InspectorViewport;
  onClose: () => void;
}

export function InspectorHeader({
  site,
  currentIsoUtc,
  calculationMode,
  viewport,
  onClose,
}: InspectorHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 border-b border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface-raised)] shrink-0">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[var(--lm-color-selected-site)] bg-[var(--lm-color-surface-strong)] px-2 py-0.5 rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-selected-site)]/40 font-semibold">
            {site.code}
          </span>
          <h2 id="modal-local-sky-title" className="text-base sm:text-lg font-bold tracking-tight">
            Local-Sky Horizon Geometry Inspector
          </h2>
        </div>
        <div className="text-xs text-[var(--lm-color-text-muted)] font-mono mt-1 flex flex-wrap items-center gap-2">
          <span>{site.name}</span>
          <span>•</span>
          <span>Epoch: <strong className="text-[var(--lm-color-text-primary)]">{currentIsoUtc}</strong></span>
          <span>•</span>
          <span className="text-[var(--lm-color-selected-site)]">
            {calculationMode === 'terrain-aware' ? 'LRO LOLA DEM 128ppd Horizon Mask' : 'Ideal 0° Spherical Horizon'}
          </span>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-[var(--lm-color-surface)] p-1 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)]">
          <button
            type="button"
            onClick={viewport.zoomIn}
            title="Zoom In"
            aria-label="Zoom In"
            className={TOOL_BUTTON_CLASS}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={viewport.zoomOut}
            title="Zoom Out"
            aria-label="Zoom Out"
            className={TOOL_BUTTON_CLASS}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={viewport.panLeft}
            disabled={!viewport.panEnabled}
            title="Pan Left"
            aria-label="Pan Left"
            className={PAN_BUTTON_CLASS}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={viewport.panRight}
            disabled={!viewport.panEnabled}
            title="Pan Right"
            aria-label="Pan Right"
            className={PAN_BUTTON_CLASS}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={viewport.resetViewport}
            title="Reset Zoom & Pan"
            aria-label="Reset Zoom and Pan"
            className={TOOL_BUTTON_CLASS}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={viewport.toggleFullscreen}
          title={viewport.isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          aria-label={viewport.isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          className="p-2 rounded-[var(--lm-radius-sm)] bg-[var(--lm-color-surface)] border border-[var(--lm-color-border)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] transition-colors"
        >
          {viewport.isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onClose}
          title="Close Inspector (Esc)"
          aria-label="Close Inspector"
          className="p-2 rounded-[var(--lm-radius-sm)] bg-[var(--lm-color-surface)] border border-[var(--lm-color-border)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-danger-surface-strong)] hover:border-[var(--lm-color-danger-border)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
