import React from 'react';

export interface DsnStationData {
  stationId: 'goldstone' | 'madrid' | 'canberra' | string;
  dishName: string;
  azimuthDeg: number;
  elevationDeg: number;
  isVisible: boolean;
  horizonMaskDeg?: number;
}

export interface DsnStationBoxProps {
  station: DsnStationData;
  isActive: boolean;
  isLive?: boolean;
}

const STATION_FLAGS: Record<string, string> = {
  goldstone: '🇺🇸',
  gdscc: '🇺🇸',
  madrid: '🇪🇸',
  mdscc: '🇪🇸',
  canberra: '🇦🇺',
  cdscc: '🇦🇺',
};

/**
 * Renders an individual Deep Space Network (DSN) ground complex tracking card.
 *
 * Provides high-contrast telemetry status, country flag, elevation angle,
 * and carrier tracking indicators with zero layout shift (CLS = 0.000).
 */
export function DsnStationBox({ station, isActive, isLive = false }: DsnStationBoxProps) {
  const flag = STATION_FLAGS[station.stationId.toLowerCase()] ?? '🛰️';
  const stationLabel = station.stationId.toUpperCase();
  const dishLabel = station.dishName.split(' ')[0] || station.dishName;
  const elevString = station.elevationDeg > 0 ? `+${station.elevationDeg.toFixed(1)}°` : `${station.elevationDeg.toFixed(1)}°`;

  return (
    <div
      aria-label={`${stationLabel} Deep Space Complex: ${station.isVisible ? 'In View' : 'Below Mask'}, Elevation ${elevString}`}
      className={`p-2 rounded border text-xs font-mono flex items-center justify-between transition-colors ${
        isActive
          ? 'bg-[var(--lm-color-info-surface)] border-[var(--lm-color-info)]/60 text-[var(--lm-color-info)]'
          : station.isVisible
            ? 'bg-[var(--lm-color-canvas)] border-[var(--lm-color-border-subtle)] text-[var(--lm-color-text-muted)]'
            : 'bg-[var(--lm-color-canvas)] border-transparent text-[var(--lm-color-text-muted)] opacity-60'
      }`}
    >
      <div>
        <div className="font-semibold flex items-center gap-1.5">
          <span aria-hidden="true">{flag}</span>
          <span>{stationLabel}</span>
          {isActive && (
            <span
              className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-[var(--lm-color-success)]' : 'bg-[var(--lm-color-info)]'} animate-ping`}
              aria-label="Active Carrier Tracking"
            />
          )}
        </div>
        <div className="text-[11px] text-[var(--lm-color-text-muted)] flex items-center gap-1 mt-0.5">
          <span>{dishLabel}</span>
          {isLive && isActive && (
            <span className="text-[11px] px-1 rounded bg-[var(--lm-color-success-surface-strong)] text-[var(--lm-color-success)] border border-[var(--lm-color-success)]/40">
              LIVE
            </span>
          )}
        </div>
      </div>
      <div className="text-right">
        <div className={`font-mono ${isActive ? 'text-[var(--lm-color-info)] font-bold' : ''}`}>
          {elevString}
        </div>
        <div className="text-[11px] tracking-wide">
          {station.isVisible ? 'IN VIEW' : 'BELOW MASK'}
        </div>
      </div>
    </div>
  );
}
