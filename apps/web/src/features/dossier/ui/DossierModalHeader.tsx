import React from 'react';
import { FileText, Server, X } from 'lucide-react';

export interface DossierModalHeaderProps {
  targetName: string;
  latitudeDeg: number;
  longitudeDeg: number;
  onClose: () => void;
}

export const DossierModalHeader: React.FC<DossierModalHeaderProps> = ({
  targetName,
  latitudeDeg,
  longitudeDeg,
  onClose,
}) => (
  <div className="flex items-center justify-between px-6 py-3.5 border-b border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-canvas)]/70 print:hidden">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-[var(--lm-color-series-b)]/10 border border-[var(--lm-color-series-b)]/30 text-[var(--lm-color-series-b)]">
        <FileText className="w-5 h-5" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h2 id="dossier-modal-title" className="text-sm font-bold tracking-wide text-[var(--lm-color-text-primary)]">
            Executive Mission Dossier
          </h2>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono border bg-[var(--lm-color-success)]/10 text-[var(--lm-color-success)] border-[var(--lm-color-success)]/30">
            <Server className="w-2.5 h-2.5" />
            NextRush Backend
          </span>
        </div>
        <p className="text-[11px] text-[var(--lm-color-text-muted)] font-mono">
          {targetName} ({latitudeDeg.toFixed(2)}°, {longitudeDeg.toFixed(2)}°)
        </p>
      </div>
    </div>
    <button
      type="button"
      onClick={onClose}
      className="min-h-[32px] min-w-[32px] flex items-center justify-center p-1.5 rounded text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-strong)] transition focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)] cursor-pointer"
      aria-label="Close modal"
    >
      <X className="w-5 h-5" />
    </button>
  </div>
);
