import React, { useCallback, useState } from 'react';
import { ShieldCheck, Radio, Info } from 'lucide-react';
import { useScenario, useScenarioModel } from '@/app/scenario/context/scenarioContext';
import {
  markerReadout,
  readLocalSky,
  type SkyMarker,
} from '@/features/passport/model/localSkyReadouts';
import { useInspectorViewport } from '@/features/passport/hooks/useInspectorViewport';
import { InspectorHeader } from '@/features/passport/components/inspector/InspectorHeader';
import { InspectorHorizonChart } from '@/features/passport/components/inspector/InspectorHorizonChart';
import { InspectorClearanceTable } from '@/features/passport/components/inspector/InspectorClearanceTable';
import { InspectorMarkerPopover } from '@/features/passport/components/local-sky/SkyMarkerPopover';

export interface LocalSkyInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Expanded horizon inspector. Site, epoch and conditions come from the canonical
 * scenario context, so the dialog cannot disagree with the Passport card that
 * opened it, and no measurement props are threaded through the tree.
 */
export function LocalSkyInspectorModal({ isOpen, onClose }: LocalSkyInspectorModalProps) {
  const { calculationMode } = useScenario();
  const { site, conditions } = useScenarioModel();
  const readouts = readLocalSky(conditions, site);

  const [selectedTarget, setSelectedTarget] = useState<SkyMarker | null>(null);

  // Escape dismisses the marker popover first, then the dialog itself.
  const handleEscape = useCallback(() => {
    if (selectedTarget) {
      setSelectedTarget(null);
      return;
    }
    onClose();
  }, [selectedTarget, onClose]);

  const viewport = useInspectorViewport(isOpen, handleEscape);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-local-sky-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[var(--lm-color-canvas)]/80 backdrop-blur-sm overflow-y-auto"
    >
      <div
        ref={viewport.stageRef}
        className="w-full max-w-5xl bg-[var(--lm-color-surface)] border border-[var(--lm-color-border)] rounded-[var(--lm-radius-lg)] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-[var(--lm-color-text-primary)] animate-in fade-in zoom-in-95 duration-150"
      >
        <InspectorHeader
          site={site}
          currentIsoUtc={conditions.epochUtc}
          calculationMode={calculationMode}
          viewport={viewport}
          onClose={onClose}
        />

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-5">
          {/* Main Expanded Horizon Graph Stage */}
          <div className="relative w-full bg-[var(--lm-color-canvas)] rounded-[var(--lm-radius-md)] border border-[var(--lm-color-border-subtle)] p-2 overflow-hidden shadow-inner flex flex-col">
            {/* Quick helper tip */}
            <div className="absolute top-3 left-4 z-10 pointer-events-none text-[11px] font-mono text-[var(--lm-color-text-muted)] flex items-center gap-1.5 bg-[var(--lm-color-surface)]/80 px-2 py-1 rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border-subtle)]">
              <Info className="w-3.5 h-3.5 text-[var(--lm-color-selected-site)]" />
              <span>Click the Sun or Earth marker for instant topocentric telemetry</span>
            </div>

            <div className="w-full overflow-hidden">
              <InspectorHorizonChart
                readouts={readouts}
                calculationMode={calculationMode}
                selectedTarget={selectedTarget}
                onSelectTarget={setSelectedTarget}
                style={viewport.stageStyle}
              />
            </div>

            {/* Selected Marker Details Popover Overlay */}
            {selectedTarget && (
              <InspectorMarkerPopover
                marker={selectedTarget}
                readout={markerReadout(readouts, selectedTarget)}
                lightTimeSeconds={readouts.lightTimeSeconds}
                onClose={() => setSelectedTarget(null)}
              />
            )}
          </div>

          <InspectorClearanceTable readouts={readouts} />

          {/* Scientific Methodology and Telemetry Constraints Notice */}
          <div className="p-3 bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)] rounded-[var(--lm-radius-sm)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[var(--lm-color-text-muted)]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--lm-color-selected-site)] shrink-0" />
              <span>
                Calculated using <strong>JPL DE421 Ephemeris</strong> &amp; <strong>LRO LOLA DEM 128ppd</strong> topographic relief.
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[var(--lm-color-text-secondary)]">
              <Radio className="w-3.5 h-3.5 text-[var(--lm-color-earth)] shrink-0" />
              <span>Geometric line-of-sight does not guarantee operational RF link closure without DSN margin.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
