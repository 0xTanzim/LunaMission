import React, { useEffect, useRef } from 'react';
import { useMissionRouter } from '@/app/hooks/useMissionRouter';
import { GlobalScenarioProvider } from './state/GlobalScenarioContext';
import { ScenarioProvider } from '@/app/scenario/ScenarioProvider';
import { useScenarioState } from './state/useScenarioState';
import { useScenarioBackgroundEvaluator } from './state/useScenarioBackgroundEvaluator';
import { MissionWorkspaceShell } from '@/features/workspace/MissionWorkspaceShell';
import { Scenario3DLab } from '@/features/spatial/lab/Scenario3DLab';
import { CesiumWorkspaceView } from '@/features/spatial/cesium/CesiumWorkspaceView';
import { MethodAndDataView } from '@/features/methodology/ui/MethodAndDataView';

function getSynchronousProjection(tab: string): 'explore' | 'analyze' | 'compare' | undefined {
  if (tab === 'compare') return 'compare';
  if (tab === 'explore') return 'explore';
  if (tab === 'horizon') return 'analyze';
  return undefined;
}

function CockpitAppShell() {
  const { activeTab, navigateToTab } = useMissionRouter();
  const { state, setProjection, clearMapFocus } = useScenarioState();

  // Continuously solve and validate spatiotemporal roots in background
  useScenarioBackgroundEvaluator();

  const prevTabRef = useRef(activeTab);
  const isSyncingFromUrlRef = useRef(false);

  // Map inspection focus is scoped to the spatial workspace; the standalone
  // projections show the committed mission target.
  useEffect(() => {
    if (activeTab !== 'explore' && state.mapFocusSiteId !== null) clearMapFocus();
  }, [activeTab, state.mapFocusSiteId, clearMapFocus]);

  // 1. Sync URL activeTab -> Scenario state activeProjection (e.g. Browser Back/Forward)
  useEffect(() => {
    if (activeTab !== prevTabRef.current) {
      prevTabRef.current = activeTab;
      const targetProj = getSynchronousProjection(activeTab);
      if (targetProj && targetProj !== state.activeProjection) {
        isSyncingFromUrlRef.current = true;
        setProjection(targetProj);
      }
    }
  }, [activeTab, state.activeProjection, setProjection]);

  // 2. Sync Scenario state activeProjection -> URL activeTab (e.g. Tab button clicks or Alt+1/2/3)
  useEffect(() => {
    if (isSyncingFromUrlRef.current) {
      isSyncingFromUrlRef.current = false;
      return;
    }
    if (activeTab === 'cesium' || activeTab === 'lab' || activeTab === 'method') {
      return;
    }
    const currentProjFromTab = getSynchronousProjection(activeTab);
    if (state.activeProjection && state.activeProjection !== currentProjFromTab) {
      prevTabRef.current = state.activeProjection === 'analyze' ? 'horizon' : state.activeProjection;
      if (state.activeProjection === 'explore') navigateToTab('explore');
      else if (state.activeProjection === 'analyze') navigateToTab('horizon');
      else if (state.activeProjection === 'compare') navigateToTab('compare');
    }
  }, [state.activeProjection, activeTab, navigateToTab]);

  if (activeTab === 'lab') {
    return (
      <section
        className="w-full h-[100dvh] min-h-0 relative overflow-hidden"
        aria-label="Scenario 3D Planetary Theater Lab"
      >
        <Scenario3DLab onReturnToObservatory={() => navigateToTab('explore')} />
      </section>
    );
  }

  if (activeTab === 'cesium') {
    return (
      <section
        className="w-full h-[100dvh] min-h-0 relative overflow-hidden"
        aria-label="Cesium Ion 3D Photorealistic Moon Explorer"
      >
        <CesiumWorkspaceView onReturnToObservatory={() => navigateToTab('explore')} />
      </section>
    );
  }

  if (activeTab === 'method') {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--lm-color-canvas)] text-[var(--lm-color-text-primary)] p-6">
        <button
          type="button"
          onClick={() => navigateToTab('explore')}
          className="mb-4 text-xs font-mono text-[var(--lm-color-info)] hover:underline inline-block w-fit cursor-pointer"
        >
          ← Return to Cockpit
        </button>
        <MethodAndDataView />
      </div>
    );
  }

  return (
    <MissionWorkspaceShell
      initialProjection={getSynchronousProjection(activeTab)}
      onOpenMethodDetails={() => navigateToTab('method')}
    />
  );
}

export default function App() {
  const { activeTab } = useMissionRouter();
  const initialProj = getSynchronousProjection(activeTab);

  return (
    <GlobalScenarioProvider initialOverride={initialProj ? { activeProjection: initialProj } : undefined}>
      <ScenarioProvider>
        <CockpitAppShell />
      </ScenarioProvider>
    </GlobalScenarioProvider>
  );
}
