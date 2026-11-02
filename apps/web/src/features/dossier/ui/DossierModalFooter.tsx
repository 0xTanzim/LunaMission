import React from 'react';
import { FileText, Download, Copy, Printer, Check } from 'lucide-react';

export interface DossierModalFooterProps {
  loading: boolean;
  hasContent: boolean;
  copied: boolean;
  activeTab: 'markdown' | 'json';
  onCopy: () => void;
  onDownload: () => void;
  onPrint: () => void;
  onClose: () => void;
}

export const DossierModalFooter: React.FC<DossierModalFooterProps> = ({
  loading,
  hasContent,
  copied,
  activeTab,
  onCopy,
  onDownload,
  onPrint,
  onClose,
}) => (
  <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-canvas)]/80 print:hidden">
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onCopy}
        disabled={loading || !hasContent}
        aria-label="Copy dossier text to clipboard"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--lm-color-surface-strong)] hover:bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-text-secondary)] text-xs font-medium transition min-h-[32px] focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)] disabled:opacity-50 cursor-pointer"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-[var(--lm-color-success)]" /> : <Copy className="w-3.5 h-3.5" />}
        <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? 'Dossier copied to clipboard' : ''}
      </span>
      <button
        type="button"
        onClick={onDownload}
        disabled={loading || !hasContent}
        aria-label={`Download dossier as ${activeTab === 'markdown' ? 'Markdown' : 'JSON'}`}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--lm-color-surface-strong)] hover:bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-text-secondary)] text-xs font-medium transition min-h-[32px] focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)] disabled:opacity-50 cursor-pointer"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Download (.{activeTab === 'markdown' ? 'md' : 'json'})</span>
      </button>
      <button
        type="button"
        onClick={onPrint}
        disabled={loading}
        aria-label="Print or save dossier as PDF"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--lm-color-series-b-fill)] border border-[var(--lm-color-series-b)]/40 text-[var(--lm-color-series-b)] hover:bg-[var(--lm-color-series-b-fill-hover)] text-xs font-medium transition min-h-[32px] focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)] disabled:opacity-50 cursor-pointer"
      >
        <Printer className="w-3.5 h-3.5" />
        <span>Print / Save PDF</span>
      </button>
    </div>
    <button
      type="button"
      onClick={onClose}
      className="px-4 py-1.5 rounded bg-[var(--lm-color-surface-strong)] hover:bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-text-secondary)] text-xs font-medium transition min-h-[32px] focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)] cursor-pointer"
    >
      Close
    </button>
  </div>
);
