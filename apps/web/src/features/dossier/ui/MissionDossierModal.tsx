/**
 * Mission Dossier Modal
 *
 * Publication-ready aerospace briefing viewer, copy-to-clipboard, file exporter,
 * and print/PDF generation dialog with WCAG 2.2 AA accessibility and print formatting.
 */

import React, { useState, useEffect } from 'react';
import { requestMissionDossier, type DossierApiResponse } from '../services/dossierApiClient';
import { ApiStateView } from '@/shared/ui/ApiStateView';
import { downloadFile } from '../utils/downloadFile';
import { DossierModalHeader } from './DossierModalHeader';
import { DossierTabControls } from './DossierTabControls';
import { DossierModalFooter } from './DossierModalFooter';
import { useDrawerFocusTrap } from '@/app/hooks/useDrawerFocusTrap';

export interface MissionDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetName: string;
  catalogId?: string;
  latitudeDeg: number;
  longitudeDeg: number;
  elevationKm?: number;
  epochMs: number;
  siteId?: string;
  calculationId?: string;
  startUtc?: string;
  stopUtc?: string;
  observerMastHeightM?: number;
  launchSlipOffsetDays?: number;
  sunVisibilityCriterion?: 'upperLimb' | 'fullDisk';
  earthVisibilityCriterion?: 'center' | 'fullDisk' | 'anyLimb';
}

export const MissionDossierModal: React.FC<MissionDossierModalProps> = (props) => {
  const { isOpen, onClose, targetName, catalogId, latitudeDeg, longitudeDeg, elevationKm, epochMs, ...scenario } = props;
  const [activeTab, setActiveTab] = useState<'markdown' | 'json'>('markdown');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<DossierApiResponse | null>(null);
  const { containerRef: modalCardRef } = useDrawerFocusTrap<HTMLDivElement>({
    isOpen,
    onClose,
  });

  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;
    setLoading(true);
    setError(null);
    requestMissionDossier({ targetName, catalogId, latitudeDeg, longitudeDeg, elevationKm, epochMs, ...scenario })
      .then((res) => { if (!isCancelled) { setData(res); setLoading(false); } })
      .catch((err) => { if (!isCancelled) { setData(null); setError(err instanceof Error ? err.message : String(err)); setLoading(false); } });
    return () => { isCancelled = true; };
  }, [isOpen, targetName, catalogId, latitudeDeg, longitudeDeg, elevationKm, epochMs, JSON.stringify(scenario)]);

  if (!isOpen) return null;
  const currentContent = activeTab === 'markdown' ? data?.markdown ?? '' : data?.jsonTelemetry ?? '';

  const handleCopy = async () => {
    if (!currentContent || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(currentContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore clipboard error in headless */ }
  };

  const handleDownload = () => {
    if (!data) return;
    const cleanName = targetName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const isMd = activeTab === 'markdown';
    downloadFile(
      `lunamission-${cleanName}-${isMd ? 'briefing.md' : 'telemetry.json'}`,
      isMd ? data.markdown : data.jsonTelemetry,
      isMd ? 'text/markdown;charset=utf-8' : 'application/json;charset=utf-8'
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dossier-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--lm-color-canvas)]/85 backdrop-blur-md print:bg-transparent print:p-0 print:m-0 print:static print:overflow-visible"
    >
      <div
        ref={modalCardRef}
        tabIndex={-1}
        className="relative w-full max-w-4xl max-h-[90vh] bg-[var(--lm-color-surface)] border border-[var(--lm-color-border)]/80 rounded-xl shadow-2xl flex flex-col overflow-hidden text-[var(--lm-color-text-primary)] outline-none print:border-none print:shadow-none print:max-h-none print:w-full print:bg-white print:text-black print:overflow-visible print:m-0"
      >
        <DossierModalHeader targetName={targetName} latitudeDeg={latitudeDeg} longitudeDeg={longitudeDeg} onClose={onClose} />
        <DossierTabControls activeTab={activeTab} onTabChange={setActiveTab} epochMs={epochMs} />
        <div
          id="panel-dossier"
          role="tabpanel"
          aria-labelledby={activeTab === 'markdown' ? 'tab-markdown' : 'tab-json'}
          className="flex-1 overflow-y-auto p-6 bg-[var(--lm-color-canvas)] font-mono text-xs text-[var(--lm-color-text-secondary)] select-text print:bg-white print:text-black print:p-0 print:overflow-visible"
        >
          {loading ? (
            <ApiStateView status="loading" message="Synthesizing multi-domain mission dossier from backend API..." className="my-10" />
          ) : error ? (
            <ApiStateView status="failed" title="Dossier Generation Offline" message={error} className="my-10" />
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-xs leading-5 break-words print:whitespace-pre-wrap print:text-black print:text-xs">
              {currentContent}
            </pre>
          )}
        </div>
        <DossierModalFooter
          loading={loading}
          hasContent={Boolean(currentContent)}
          copied={copied}
          activeTab={activeTab}
          onCopy={handleCopy}
          onDownload={handleDownload}
          onPrint={() => window.print()}
          onClose={onClose}
        />
      </div>
    </div>
  );
};
