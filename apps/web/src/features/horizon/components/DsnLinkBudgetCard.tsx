import React, { useState, useEffect, useMemo } from 'react';
import { Satellite, Globe2, AlertCircle } from 'lucide-react';
import { missionServerClient } from '@/domain/services/missionServerClient';
import type { RfLinkBudget } from '@luna/contracts';
import { useDsnTelemetry } from '../hooks/useDsnTelemetry';
import { DsnStationBox } from './DsnStationBox';
import { LinkBudgetObservableNote } from './LinkBudgetObservableNote';
import { LinkBudgetMetricsGrid, type LinkBudgetStatus } from './LinkBudgetMetricsGrid';
import { LinkBudgetStatusBadge } from './LinkBudgetStatusBadge';

interface DsnLinkBudgetCardProps {
  siteId: string;
  epochMs: number;
  earthDistanceKm: number;
  earthElevationDeg: number;
  isObstructed: boolean;
}

const DEFAULT_STATIONS = [
  { stationId: 'goldstone', name: 'Goldstone DSN', dishName: 'DSS-14 (70m)', azimuthDeg: 0, elevationDeg: 0, isVisible: false },
  { stationId: 'madrid', name: 'Madrid DSN', dishName: 'DSS-63 (70m)', azimuthDeg: 0, elevationDeg: 0, isVisible: false },
  { stationId: 'canberra', name: 'Canberra DSN', dishName: 'DSS-43 (70m)', azimuthDeg: 0, elevationDeg: 0, isVisible: false },
];

export function DsnLinkBudgetCard({
  siteId,
  epochMs,
  earthDistanceKm,
  earthElevationDeg,
  isObstructed,
}: DsnLinkBudgetCardProps) {
  const { telemetry, isLive } = useDsnTelemetry({ epochMs });

  // Offline placeholder only: its numeric fields are never rendered as modelled RF figures.
  const [budget, setBudget] = useState<RfLinkBudget>(() =>
    missionServerClient.getFallbackLinkBudget({
      earthDistanceKm,
      earthElevationDeg,
      isTerrainObstructed: isObstructed,
      band: 'xBandDownlink',
      transmitterPowerWatts: 15,
      dataRateMbps: 2.0,
    })
  );
  const [budgetStatus, setBudgetStatus] = useState<LinkBudgetStatus>('pending');

  useEffect(() => {
    let active = true;
    void missionServerClient
      .getLinkBudget({
        siteId,
        epochMs,
        band: 'xBandDownlink',
        transmitterPowerWatts: 15,
        dataRateMbps: 2.0,
      })
      .then((res) => {
        if (!active) return;
        if (res?.linkBudget) {
          setBudget(res.linkBudget);
          setBudgetStatus('computed');
        } else {
          setBudgetStatus('unavailable');
        }
      })
      .catch(() => {
        if (active) setBudgetStatus('unavailable');
      });
    return () => {
      active = false;
    };
  }, [siteId, epochMs, earthDistanceKm, earthElevationDeg, isObstructed]);

  const stations = useMemo(() => {
    if (!telemetry.stations.length) return DEFAULT_STATIONS;
    return telemetry.stations.map((s) => ({
      stationId: s.id === 'gdscc' ? 'goldstone' : s.id === 'mdscc' ? 'madrid' : 'canberra',
      name: s.friendlyName,
      dishName: s.dishes[0]?.dishName || (s.id === 'gdscc' ? 'DSS-14 (70m)' : s.id === 'mdscc' ? 'DSS-63 (70m)' : 'DSS-43 (70m)'),
      azimuthDeg: s.topocentric.azimuthDeg,
      elevationDeg: s.topocentric.elevationDeg,
      isVisible: s.topocentric.isVisible,
    }));
  }, [telemetry.stations]);

  const activeStation = useMemo(
    () => stations.find((s) => s.isVisible) || stations[0],
    [stations]
  );

  const topNoiseK = useMemo(() => {
    return Math.round(18.5 + (earthElevationDeg < 10 ? (10 - Math.max(0, earthElevationDeg)) * 0.8 : 0));
  }, [earthElevationDeg]);

  const diffractionLossDb = useMemo(() => {
    return isObstructed ? 15.2 : earthElevationDeg < 2.0 ? Math.max(0, (2.0 - earthElevationDeg) * 2.5) : 0.0;
  }, [earthElevationDeg, isObstructed]);

  return (
    <div className="flex flex-col gap-3 p-4 bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)] rounded-[var(--lm-radius-lg)]">
      <div className="flex items-center justify-between border-b border-[var(--lm-color-border-subtle)] pb-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <Satellite className="w-4 h-4 text-[var(--lm-color-info)]" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--lm-color-text-primary)]">
            NASA Deep Space Network (DSN) & RF Link Budget
          </span>
          <span
            className={`text-[11px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
              isLive
                ? 'bg-[var(--lm-color-success-surface-strong)] text-[var(--lm-color-success)] border border-[var(--lm-color-success)]/40'
                : 'bg-[var(--lm-color-warning-surface)] text-[var(--lm-color-warning)] border border-[var(--lm-color-warning)]/30'
            }`}
          >
            {isLive ? 'LIVE NASA DSN' : 'ANALYTICAL BASELINE'}
          </span>
        </div>
        <LinkBudgetStatusBadge
          status={budgetStatus}
          linkState={budget.linkState}
          linkMarginDb={budget.linkMarginDb}
        />
      </div>

      <LinkBudgetObservableNote />

      <LinkBudgetMetricsGrid
        budget={budget}
        status={budgetStatus}
        earthDistanceKm={earthDistanceKm}
      />

      {budgetStatus !== 'computed' && (
        <div className="px-3 py-1.5 rounded bg-[var(--lm-color-surface)]/50 border border-[var(--lm-color-border-subtle)] text-[11px] font-mono text-[var(--lm-color-text-secondary)]">
          {budgetStatus === 'pending'
            ? 'Requesting the computed RF link budget from the analysis API. No placeholder margin is shown in the meantime.'
            : 'RF link budget not computed: the analysis API returned no budget for this epoch, so no path loss, received power or link margin is shown. Geometric Earth line-of-sight above is a geometry result and is unaffected by this.'}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)] text-[11px] font-mono">
        <div className="flex items-center gap-2">
          <span className="text-[var(--lm-color-text-muted)]">DSN 810-005 T_op:</span>
          <span className="text-[var(--lm-color-info)] font-bold">{topNoiseK} K</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[var(--lm-color-text-muted)]">ITU-R P.526-16 Diffraction (modelled):</span>
          <span className={diffractionLossDb > 0 ? 'text-[var(--lm-color-warning)] font-bold' : 'text-[var(--lm-color-success)]'}>
            {diffractionLossDb > 0 ? `-${diffractionLossDb.toFixed(1)} dB` : '0.0 dB (none modelled)'}
          </span>
        </div>
      </div>

      {budget.multipathWarning && budgetStatus === 'computed' && (
        <div className="px-3 py-1.5 rounded bg-[var(--lm-color-warning)]/10 border border-[var(--lm-color-warning)]/30 text-[var(--lm-color-warning)] text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            Grazing geometry: Earth line-of-sight elevation is &lt;2.0° above the local horizontal.
            The 1–3 dB diffraction / multipath fading below is a modelled penalty, not a measurement.
          </span>
        </div>
      )}

      <div className="flex flex-col gap-1.5 pt-1">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--lm-color-text-secondary)]">
          <Globe2 className="w-3.5 h-3.5 text-[var(--lm-color-info)]" />
          <span>NASA Deep Space Complex tracking geometry (station elevation, not link status):</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {stations.map((s) => (
            <DsnStationBox
              key={s.stationId}
              station={s}
              isActive={activeStation?.stationId === s.stationId}
              isLive={isLive}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
