import React, { useState, useEffect } from 'react';
import { CANDIDATE_SITES } from '@luna/contracts';
import { useScenarioState } from '../../app/state/useScenarioState';
import { useScenarioUrlSync } from '../../app/state/useScenarioUrlSync';
import { CockpitHeader } from '../../app/layout/CockpitHeader';
import { ScenarioConfigBar } from './ScenarioConfigBar';
import { AnalyzeWorkspaceView } from '../analyze/AnalyzeWorkspaceView';
import { ComparisonWorkspace } from '../comparison/ComparisonWorkspace';
import { SpatialWorkspace } from '../spatial/ui/SpatialWorkspace';
import { MapInspectionScope } from './MapInspectionScope';
import { AccessibleHatchingPatterns } from '../accessibility/AccessibleHatchingPatterns';
import { MissionDossierModal } from '../dossier/ui/MissionDossierModal';
import { PassportDrawer } from '../spatial/components/panels/PassportDrawer';
import { ProvenanceStatusModal } from '../../app/header/modals/ProvenanceStatusModal';
import { ApolloSeismicDrawer } from '../geology/ApolloSeismicDrawer';

interface MissionWorkspaceShellProps {
  initialProjection?: 'explore' | 'analyze' | 'compare';
  className?: string;
  onOpenMethodDetails?: () => void;
}

export const MissionWorkspaceShell: React.FC<MissionWorkspaceShellProps> = ({
  initialProjection,
  className = '',
  onOpenMethodDetails,
}) => {
  // Synchronize state bidirectionally with URL query parameters
  useScenarioUrlSync();

  const { state, setProjection, setActiveDrawer } = useScenarioState();
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const initialMountedRef = React.useRef(false);

  useEffect(() => {
    if (!initialMountedRef.current) {
      initialMountedRef.current = true;
      if (initialProjection && state.activeProjection !== initialProjection) {
        setProjection(initialProjection);
      }
    }
  }, [initialProjection, state.activeProjection, setProjection]);

  const activeProjection = initialProjection && !initialMountedRef.current ? initialProjection : state.activeProjection;

  const handleOpenMethod = () => {
    if (onOpenMethodDetails) {
      onOpenMethodDetails();
    } else if (typeof window !== 'undefined') {
      window.location.hash = '#/methodology';
    }
  };

  const activeSite = CANDIDATE_SITES.find((s) => s.id === state.primarySiteId) ?? CANDIDATE_SITES[0];
  const targetEpochMs = new Date(state.activePlayheadUtc || state.missionEpoch.startUtc).getTime();
  const customTarget = state.customTarget;
  const isCustomTarget = Boolean(customTarget);
  const targetName = customTarget ? customTarget.name : activeSite.name;
  const catalogId = isCustomTarget ? undefined : activeSite.id;
  const latitudeDeg = customTarget ? customTarget.latitudeDeg : activeSite.coordinates.latitudeDeg;
  const longitudeDeg = customTarget ? customTarget.longitudeDeg : activeSite.coordinates.longitudeDeg;
  const elevationKm = customTarget ? customTarget.elevationKm : (activeSite.coordinates.elevationMeters ?? 0) / 1000;

  return (
    <div
      data-testid="mission-workspace-shell"
      className={`min-h-screen flex flex-col bg-[var(--lm-color-canvas)] text-[var(--lm-color-text-primary)] relative ${className}`}
    >
      {/* Non-color accessible hatching pattern defs */}
      <AccessibleHatchingPatterns />

      {/* Flight Deck UI - Hidden during modal print */}
      <div className="flex-1 flex flex-col min-h-0 print:hidden">
        {/* 1. Global Flight Deck Cockpit Top Bar */}
        <CockpitHeader />

        {/* 2. Workspace Viewport & Projections */}
        <main className="flex-1 w-full max-w-[1720px] mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4 min-w-0">
          {/* Scenario Parameter Bar */}
          <ScenarioConfigBar onOpenDossier={() => setIsDossierOpen(true)} />

          {/* 3. Active Workspace Projection Router */}
          <div className="w-full flex-1 flex flex-col min-w-0">
            {activeProjection === 'explore' && (
              <div data-testid="projection-explore" className="w-full flex-1">
                <MapInspectionScope>
                  <SpatialWorkspace
                    initialViewMode={state.spatialDimensionMode === '3d' ? 'globe3d' : 'map2d'}
                    onOpenMethodDetails={handleOpenMethod}
                    onNavigateHorizon={() => setProjection('analyze')}
                  />
                </MapInspectionScope>
              </div>
            )}

            {activeProjection === 'analyze' && (
              <div data-testid="projection-analyze" className="w-full flex-1">
                <AnalyzeWorkspaceView />
              </div>
            )}

            {activeProjection === 'compare' && (
              <div data-testid="projection-compare" className="w-full flex-1">
                <ComparisonWorkspace />
              </div>
            )}
          </div>
        </main>

        {/* 4. Global Scientific Footer */}
        <footer className="w-full border-t border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-canvas)] py-2.5 px-4 sm:px-6 mt-auto">
          <div className="max-w-[1720px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-[var(--lm-color-text-muted)]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[var(--lm-color-text-secondary)] font-medium">LunaMission Flight Deck</span>
              <span>•</span>
              <span>NASA JPL Horizons DE421 / DE440</span>
              <span>•</span>
              <span>LRO LOLA DEM LDEM_85S_20M</span>
            </div>
            <div>
              Canonical Epoch: <strong className="text-[var(--lm-color-info)]">{state.activePlayheadUtc || '2026-11-01T00:00:00.000Z'}</strong> • Active Site: <strong className="text-[var(--lm-color-info)]">{state.primarySiteId}</strong> (Mast: {state.observerMastHeightM}m)
              {state.mapFocusSiteId && state.mapFocusSiteId !== state.primarySiteId && (
                <span data-testid="footer-map-focus-note" className="ml-2 text-[var(--lm-color-warning)]">
                  • Inspecting <strong>{state.mapFocusSiteId}</strong> on the map (mission target unchanged)
                </span>
              )}
            </div>
          </div>
        </footer>
      </div>

      {/* 5. Mission Dossier Modal */}
      {isDossierOpen && (
        <MissionDossierModal
          isOpen={isDossierOpen}
          onClose={() => setIsDossierOpen(false)}
          targetName={targetName}
          catalogId={catalogId}
          latitudeDeg={latitudeDeg}
          longitudeDeg={longitudeDeg}
          elevationKm={elevationKm}
          epochMs={targetEpochMs}
          siteId={isCustomTarget ? undefined : state.primarySiteId}
          calculationId={state.calculationId ?? undefined}
          startUtc={state.missionEpoch.startUtc}
          stopUtc={state.missionEpoch.stopUtc}
          observerMastHeightM={state.observerMastHeightM}
          launchSlipOffsetDays={state.launchSlipOffsetDays}
          sunVisibilityCriterion={state.sunVisibilityCriterion}
          earthVisibilityCriterion={state.earthVisibilityCriterion}
        />
      )}

      {/* 6. Geodesic Point Passport Drawer */}
      {state.activeDrawer === 'passport' && (
        <div className="fixed inset-y-0 right-0 z-50 flex pointer-events-auto">
          <PassportDrawer
            onClose={() => setActiveDrawer('none')}
            onOpenMethodDetails={handleOpenMethod}
          />
        </div>
      )}

      {/* 7. Provenance & Epistemic Audit Modal */}
      <ProvenanceStatusModal
        isOpen={state.activeDrawer === 'provenance'}
        onClose={() => setActiveDrawer('none')}
      />

      {/* 8. Apollo Seismic Experiment Geotechnical Drawer */}
      <ApolloSeismicDrawer
        isOpen={state.activeDrawer === 'seismic'}
        onClose={() => setActiveDrawer('none')}
      />
    </div>
  );
};
