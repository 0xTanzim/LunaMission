import React from 'react';
import { Sun, Globe as EarthIcon, X } from 'lucide-react';
import { formatAngle, formatDuration } from '@/shared/formatting/formatters';
import { TelemetryRow } from '@/features/passport/components/summary/TelemetryRow';
import { clearanceValueTone } from '@/features/passport/model/localSkyStatusStyles';
import {
  clearanceVerdict,
  type MarkerReadout,
  type SkyMarker,
} from '@/features/passport/model/localSkyReadouts';

/**
 * Telemetry popover shown when the operator clicks a horizon marker. The compact
 * diagram and the inspector surface different field sets, but share the chrome.
 */

function MarkerHeading({ marker, title }: { marker: SkyMarker; title: string }) {
  return (
    <span className="flex items-center gap-1">
      {marker === 'sun' ? (
        <Sun className="w-3.5 h-3.5 text-[var(--lm-color-sun)]" />
      ) : (
        <EarthIcon className="w-3.5 h-3.5 text-[var(--lm-color-earth)]" />
      )}
      <span>{title}</span>
    </span>
  );
}

function elevationTone(marker: SkyMarker): string {
  return marker === 'sun'
    ? 'text-[var(--lm-color-sun)] font-bold'
    : 'text-[var(--lm-color-earth)] font-bold';
}

interface PopoverProps {
  marker: SkyMarker;
  readout: MarkerReadout;
  onClose: () => void;
}

/** Compact in-card popover. */
export function CompactMarkerPopover({ marker, readout, onClose }: PopoverProps) {
  return (
    <div className="absolute top-14 right-4 z-20 w-72 bg-[var(--lm-color-surface-strong)] border border-[var(--lm-color-selected-site)] rounded-[var(--lm-radius-sm)] p-3 shadow-xl text-xs font-mono-num backdrop-blur-sm animate-in fade-in">
      <div className="flex items-center justify-between pb-1.5 border-b border-[var(--lm-color-border-subtle)] mb-2 font-semibold text-[var(--lm-color-selected-site)]">
        <MarkerHeading
          marker={marker}
          title={marker === 'sun' ? 'Sun Marker Details' : 'Earth Marker Details'}
        />
        <button
          type="button"
          onClick={onClose}
          className="text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)] p-0.5"
          aria-label="Close details"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="space-y-1 text-[11px]">
        <TelemetryRow label="Elevation:" className={elevationTone(marker)}>
          {formatAngle(readout.elevationDeg, { decimals: 2, sign: true })}
        </TelemetryRow>
        <TelemetryRow label="Azimuth:" className="text-[var(--lm-color-text-primary)]">
          {formatAngle(readout.azimuthDeg, { decimals: 1 })}
        </TelemetryRow>
        <TelemetryRow label="Terrain Horizon:" className="text-[var(--lm-color-text-secondary)]">
          {formatAngle(readout.terrainDeg, { decimals: 2 })}
        </TelemetryRow>
        <TelemetryRow label="Clearance:" className={`font-semibold ${clearanceValueTone(readout.clearanceDeg)}`} divider>
          {formatAngle(readout.clearanceDeg, { decimals: 2, sign: true })}
        </TelemetryRow>
      </div>
    </div>
  );
}

interface InspectorPopoverProps extends PopoverProps {
  lightTimeSeconds: number | null;
}

/** Expanded inspector popover: adds target identity, clearance verdict and light time. */
export function InspectorMarkerPopover({
  marker,
  readout,
  lightTimeSeconds,
  onClose,
}: InspectorPopoverProps) {
  const verdict = clearanceVerdict(readout.clearanceDeg);
  return (
    <div className="absolute top-12 right-4 z-20 w-80 bg-[var(--lm-color-surface-strong)] border border-[var(--lm-color-selected-site)] rounded-[var(--lm-radius-sm)] p-3.5 shadow-2xl backdrop-blur-md flex flex-col gap-2">
      <div className="flex items-center justify-between pb-1.5 border-b border-[var(--lm-color-border-subtle)]">
        <div className="flex items-center gap-1.5 font-semibold text-xs text-[var(--lm-color-selected-site)]">
          {marker === 'sun' ? (
            <Sun className="w-4 h-4 text-[var(--lm-color-sun)]" />
          ) : (
            <EarthIcon className="w-4 h-4 text-[var(--lm-color-earth)]" />
          )}
          <span>
            {marker === 'sun' ? 'Solar Telemetry Inspection' : 'Earth Geometric LoS Inspection'}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)] p-0.5"
          aria-label="Close Popover"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-1.5 text-xs font-mono-num">
        <TelemetryRow label="Target:" className="font-semibold">
          {marker === 'sun' ? 'Sun Center' : 'Earth Disk Center'}
        </TelemetryRow>
        <TelemetryRow label="Topocentric Elevation:" className={elevationTone(marker)}>
          {formatAngle(readout.elevationDeg, { decimals: 3, sign: true })}
        </TelemetryRow>
        <TelemetryRow label="Azimuth (Clockwise from N):" className="text-[var(--lm-color-text-primary)]">
          {formatAngle(readout.azimuthDeg, { decimals: 2 })}
        </TelemetryRow>
        <TelemetryRow label="Local Horizon Obstruction:" className="text-[var(--lm-color-text-secondary)]">
          {formatAngle(readout.terrainDeg, { decimals: 2 })}
        </TelemetryRow>
        <TelemetryRow
          label="Clearance Margin:"
          className={`font-semibold ${clearanceValueTone(readout.clearanceDeg)}`}
          divider
        >
          {formatAngle(readout.clearanceDeg, { decimals: 3, sign: true })}
          {verdict === 'indeterminate' ? ' (Unknown)' : verdict === 'clear' ? ' (Clear)' : ' (Obscured)'}
        </TelemetryRow>
        {marker === 'earth' && (
          <TelemetryRow label="Light Time:" className="text-[var(--lm-color-text-primary)]">
            {formatDuration(lightTimeSeconds, 4)}
          </TelemetryRow>
        )}
      </div>

      <div className="text-[11px] text-[var(--lm-color-text-muted)] border-t border-[var(--lm-color-border-subtle)] pt-1.5 leading-relaxed">
        Reference: IAU 2015 Lunar Mean Earth / Polar Axis • Topocentric site horizon plane.
      </div>
    </div>
  );
}
