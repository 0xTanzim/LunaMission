import React, { useMemo, useState } from 'react';
import { useScenario, useScenarioModel, useScenarioCommands } from '@/app/scenario/context/scenarioContext';
import { getSiteById } from '@/domain/sites/catalog';
import { useSiteCatalog } from '@/app/hooks/useSiteCatalog';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { HorizonProfileSection } from '../components/HorizonProfileSection';
import { HorizonConsoleHeader } from '../components/HorizonConsoleHeader';
import { HorizonClearanceTelemetry, CelestialBodyClearanceStatus } from '../components/HorizonClearanceTelemetry';
import { DsnLinkBudgetCard } from '../components/DsnLinkBudgetCard';
import { HorizonMastControlBar } from '../components/HorizonMastControlBar';
import { ApiStateView } from '@/shared/ui/ApiStateView';
import { availableValue } from '@/shared/formatting/availability';
import { useScenarioState } from '@/app/state/useScenarioState';

export function TopocentricHorizonView() {
  const { selectedSiteId, customTarget } = useScenario();
  const { epochMs, ephemeris, conditions } = useScenarioModel();
  const { selectSite } = useScenarioCommands();
  const { sites: availableSites } = useSiteCatalog('all');
  const { state: globalScenario, setMastHeight } = useScenarioState();

  const [inspectCustom, setInspectCustom] = useState(false);
  const mastHeightMeters = globalScenario?.observerMastHeightM ?? 2.0;
  const handleMastHeightChange = (h: number) => {
    const valid: (1.0 | 2.0 | 5.0 | 10.0)[] = [1.0, 2.0, 5.0, 10.0];
    const closest = valid.reduce((prev, curr) => Math.abs(curr - h) < Math.abs(prev - h) ? curr : prev, 2.0 as 1.0 | 2.0 | 5.0 | 10.0);
    setMastHeight(closest);
  };

  const customSite = useMemo<CandidateSite | null>(() => {
    if (!customTarget) return null;
    return {
      id: customTarget.id, code: 'TARGET', name: customTarget.name,
      description: `Custom target at ${customTarget.latitudeDeg.toFixed(2)}°S, ${customTarget.longitudeDeg.toFixed(2)}°E`,
      coordinates: {
        latitudeDeg: customTarget.latitudeDeg, longitudeDeg: customTarget.longitudeDeg,
        elevationKm: customTarget.elevationKm, elevationMeters: customTarget.elevationKm * 1000,
      },
      category: 'polar-benchmark', priority: 'high', isCustom: true,
    } as unknown as CandidateSite;
  }, [customTarget]);

  const isCustomInspection = Boolean(inspectCustom && customSite);
  const currentSite = useMemo(() => {
    if (isCustomInspection && customSite) return customSite;
    return getSiteById(selectedSiteId) ?? availableSites[0] ?? null;
  }, [isCustomInspection, customSite, selectedSiteId, availableSites]);

  // Task 4.5: all Sun/Earth readouts come from the shared scenario model's
  // conditions and the backend curated horizon profile — this path executes no
  // frontend terrain or ephemeris math (scan-gated).
  const solarFraction = useMemo(() => availableValue(conditions.solarIlluminationFraction) ?? 0, [conditions]);

  const sunStatus = useMemo<CelestialBodyClearanceStatus | null>(() => {
    const elevationDeg = availableValue(conditions.sunElevationDeg);
    const azimuthDeg = availableValue(conditions.sunAzimuthDeg);
    const horizonElevationDeg = availableValue(conditions.localTerrainElevationAtSunAzimuthDeg);
    if (elevationDeg === null || azimuthDeg === null || horizonElevationDeg === null) return null;
    return {
      elevationDeg, azimuthDeg, horizonElevationDeg,
      clearanceDeg: elevationDeg - horizonElevationDeg,
      isObstructed: elevationDeg <= horizonElevationDeg,
    };
  }, [conditions]);

  const earthStatus = useMemo<CelestialBodyClearanceStatus | null>(() => {
    const elevationDeg = availableValue(conditions.earthElevationDeg);
    const azimuthDeg = availableValue(conditions.earthAzimuthDeg);
    const horizonElevationDeg = availableValue(conditions.localTerrainElevationAtEarthAzimuthDeg);
    if (elevationDeg === null || azimuthDeg === null || horizonElevationDeg === null) return null;
    return {
      elevationDeg, azimuthDeg, horizonElevationDeg,
      clearanceDeg: elevationDeg - horizonElevationDeg,
      isObstructed: elevationDeg <= horizonElevationDeg,
    };
  }, [conditions]);

  const earthDistanceKm = ephemeris.earthMoonDistanceKm;

  if (!currentSite) {
    return (
      <div className="p-8">
        <ApiStateView
          status="loading"
          title="Loading Topocentric Horizon"
          message="Acquiring candidate landing site terrain horizon profile..."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 w-full min-w-0">
      {/* Console Header */}
      <HorizonConsoleHeader
        selectedSiteId={selectedSiteId}
        onSelectSite={selectSite}
        customTarget={customTarget ?? null}
        isCustomInspection={isCustomInspection}
        onCustomInspectionChange={setInspectCustom}
        sites={availableSites}
      />

      {isCustomInspection ? (
        /* Custom targets sit outside the curated LOLA horizon asset: state the
           limitation instead of silently re-deriving terrain in the browser. */
        <ApiStateView
          status="unsupported"
          title="Custom Target Not Covered by the Curated Horizon Asset"
          message={`The backend curated LOLA horizon profile serves registered south-polar candidate sites only. "${customSite?.name ?? 'Custom target'}" has no audited 360° terrain silhouette, so no horizon radar, clearance telemetry or link geometry is shown for it here. Select a registered candidate site to restore the full console.`}
        />
      ) : (
        <>
          {/* Observer Mast Height & Solar Penumbra Controls */}
          <HorizonMastControlBar
            mastHeightMeters={mastHeightMeters}
            onMastHeightChange={handleMastHeightChange}
            solarFraction={solarFraction}
          />

          {/* Main Sky Dome Radar Canvas */}
          <div className="flex flex-col bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)] rounded-[var(--lm-radius-lg)] p-4 sm:p-6 gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--lm-color-border-subtle)]">
              <span className="text-xs font-mono font-semibold uppercase text-[var(--lm-color-text-primary)]">
                360° Azimuth vs Elevation Canvas ({currentSite.name})
              </span>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-[var(--lm-color-info)]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--lm-color-info)]" />
                  Earth Libration Loop (27.3d)
                </span>
                <span className="flex items-center gap-1.5 text-[var(--lm-color-text-muted)]">
                  <span className="w-2.5 h-2.5 bg-[var(--lm-color-border-strong)] border border-[var(--lm-color-border-strong)]" />
                  LOLA Horizon Silhouette
                </span>
              </div>
            </div>

            {/* Backend-fed per-bin radar (task 4.3); frontend math retired in 4.5. */}
            <HorizonProfileSection siteId={currentSite.id} mastHeightMeters={mastHeightMeters} />

            {/* Geometric clearance telemetry (Sun disk line-of-sight, Earth line-of-sight) */}
            {sunStatus && earthStatus ? (
              <HorizonClearanceTelemetry currentSun={sunStatus} currentEarth={earthStatus} />
            ) : (
              <ApiStateView
                status="unsupported"
                title="Clearance Telemetry Unavailable"
                message="The scenario model could not produce topocentric Sun/Earth geometry for this site at the current epoch."
              />
            )}
          </div>

          {/* Modelled RF link budget & station handover geometry - distinct from geometric LoS above. */}
          {earthStatus && (
            <DsnLinkBudgetCard
              siteId={currentSite.id}
              epochMs={epochMs}
              earthDistanceKm={earthDistanceKm}
              earthElevationDeg={earthStatus.elevationDeg}
              isObstructed={earthStatus.isObstructed}
            />
          )}
        </>
      )}
    </div>
  );
}
