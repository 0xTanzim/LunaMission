import React, { useMemo } from 'react';
import { getSiteById } from '@/domain/sites/catalog';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { deriveScenarioModel } from '@/app/scenario/model/scenarioModel';
import { deriveScenarioState, type ScenarioState } from '@/app/scenario/state/scenarioState';
import {
  ScenarioCommandsContext,
  ScenarioModelContext,
  ScenarioStateContext,
  type ScenarioCommands,
} from '@/app/scenario/context/scenarioContext';
import { GlobalScenarioProvider, useOptionalGlobalScenarioContext } from '@/app/state/GlobalScenarioContext';
import { useScenarioState } from '@/app/state/useScenarioState';

interface ScenarioProviderProps {
  children: React.ReactNode;
}

/**
 * Projects the authoritative scenario store into the derived model the scientific
 * views render, and adapts their commands onto that store.
 *
 * This provider owns no state: it renders through `GlobalScenarioProvider` when no
 * store is mounted above it, so a tree always has exactly one scenario store.
 */
export function ScenarioProvider({ children }: ScenarioProviderProps) {
  const store = useOptionalGlobalScenarioContext();
  if (store) return <ScenarioBridge>{children}</ScenarioBridge>;
  return (
    <GlobalScenarioProvider>
      <ScenarioBridge>{children}</ScenarioBridge>
    </GlobalScenarioProvider>
  );
}

function ScenarioBridge({ children }: ScenarioProviderProps) {
  const { state, setPrimarySite, setMapFocus, setCustomTarget, setPlayheadUtc, setCalculationMode } =
    useScenarioState();

  const scenarioState = useMemo<ScenarioState>(() => deriveScenarioState(state), [state]);

  const site = useMemo<CandidateSite>(() => {
    const found = getSiteById(scenarioState.selectedSiteId);
    if (!found) {
      throw new Error(`Scenario state holds an unknown site id: ${scenarioState.selectedSiteId}`);
    }
    return found;
  }, [scenarioState.selectedSiteId]);

  const model = useMemo(
    () => deriveScenarioModel(site, scenarioState.epochMs, scenarioState.calculationMode),
    [site, scenarioState.epochMs, scenarioState.calculationMode],
  );

  const commands = useMemo<ScenarioCommands>(
    () => ({
      selectSite: setPrimarySite,
      focusMapSite: setMapFocus,
      setCustomTarget,
      setEpoch: (epochMs) => {
        if (!Number.isFinite(epochMs)) return;
        setPlayheadUtc(new Date(epochMs).toISOString());
      },
      setCalculationMode,
    }),
    [setPrimarySite, setMapFocus, setCustomTarget, setPlayheadUtc, setCalculationMode],
  );

  return (
    <ScenarioStateContext.Provider value={scenarioState}>
      <ScenarioModelContext.Provider value={model}>
        <ScenarioCommandsContext.Provider value={commands}>
          {children}
        </ScenarioCommandsContext.Provider>
      </ScenarioModelContext.Provider>
    </ScenarioStateContext.Provider>
  );
}
