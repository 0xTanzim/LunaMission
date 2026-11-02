import React, { useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { useScenario, useScenarioModel } from '@/app/scenario/context/scenarioContext';
import {
  markerReadout,
  readLocalSky,
  type SkyMarker,
} from '@/features/passport/model/localSkyReadouts';
import { LocalSkyHorizonChart } from '@/features/passport/components/horizon/LocalSkyHorizonChart';
import { LocalSkyTelemetryCards } from '@/features/passport/components/local-sky/LocalSkyTelemetryCards';
import { LocalSkySummaryTable } from '@/features/passport/components/local-sky/LocalSkySummaryTable';
import { CompactMarkerPopover } from '@/features/passport/components/local-sky/SkyMarkerPopover';
import { LocalSkyInspectorModal } from '@/features/passport/ui/LocalSkyInspectorModal';

/**
 * Local-sky card in the Point Passport. It reads the canonical scenario model
 * rather than a prop list, so the chart, the telemetry cards, the accessible
 * table and the expanded inspector all describe the same site and epoch.
 */
export function LocalSkyDiagram() {
  const { calculationMode } = useScenario();
  const { site, conditions } = useScenarioModel();
  const readouts = readLocalSky(conditions, site);

  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<SkyMarker | null>(null);

  return (
    <div className="bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] rounded-[var(--lm-radius-sm)] p-3.5 flex flex-col gap-3 relative">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--lm-color-border-subtle)] pb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--lm-color-text-primary)]">
              Local-Sky Horizon Geometry
            </span>
            <span className="text-[11px] font-mono text-[var(--lm-color-text-muted)] bg-[var(--lm-color-surface)] px-1.5 py-0.5 rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border-subtle)]">
              Topocentric Frame
            </span>
          </div>
          <div className="text-[11px] text-[var(--lm-color-text-muted)] mt-0.5">
            LOLA 360° terrain mask vs Sun &amp; Earth topocentric elevation
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-[var(--lm-color-selected-site)] bg-[var(--lm-color-surface-strong)] px-2 py-0.5 rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-selected-site)]/40 hidden sm:inline">
            {calculationMode === 'terrain-aware' ? 'Terrain-Aware DEM' : 'Geometry-Only Spherical'}
          </span>

          <button
            type="button"
            onClick={() => setIsInspectorOpen(true)}
            title="Open Dedicated Fullscreen/Expanded Inspector"
            aria-label="Expand graph into detailed inspector"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-[var(--lm-radius-xs)] bg-[var(--lm-color-surface-strong)] border border-[var(--lm-color-selected-site)]/60 text-[var(--lm-color-selected-site)] hover:bg-[var(--lm-color-selected-site)]/20 transition-colors shadow-xs"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Expand graph</span>
          </button>
        </div>
      </div>

      {/* Popover for clicked Sun or Earth marker */}
      {selectedMarker && (
        <CompactMarkerPopover
          marker={selectedMarker}
          readout={markerReadout(readouts, selectedMarker)}
          onClose={() => setSelectedMarker(null)}
        />
      )}

      {/* SVG Azimuth-Elevation Chart */}
      <LocalSkyHorizonChart
        readouts={readouts}
        calculationMode={calculationMode}
        selectedMarker={selectedMarker}
        onSelectMarker={setSelectedMarker}
      />

      <LocalSkyTelemetryCards readouts={readouts} />

      <LocalSkySummaryTable readouts={readouts} />

      {/* Dedicated Expanded Inspector Modal */}
      <LocalSkyInspectorModal
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
      />
    </div>
  );
}
