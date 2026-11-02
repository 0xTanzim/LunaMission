import React, { useMemo } from 'react';
import { ScenarioCommandsContext, useScenarioCommands } from '@/app/scenario/context/scenarioContext';
import { useScenarioState } from '@/app/state/useScenarioState';

export interface MapInspectionScopeProps {
  children: React.ReactNode;
}

/**
 * Bounds a subtree whose site selection means *inspection*, not commitment.
 *
 * Inside this scope `selectSite` moves map focus only, so a map pin or ribbon chip
 * updates the Passport and the map inspectors while the mission analysis target
 * (Analyze, Compare, Dossier, URL) keeps the site the operator committed through the
 * Scenario Config Bar. Outside the scope `selectSite` commits, which is what the
 * candidate ribbons, the horizon selector and the 3D lab expect.
 */
export const MapInspectionScope: React.FC<MapInspectionScopeProps> = ({ children }) => {
  const commands = useScenarioCommands();
  const { setMapFocus } = useScenarioState();

  const scoped = useMemo(
    () => ({ ...commands, selectSite: setMapFocus }),
    [commands, setMapFocus],
  );

  return (
    <ScenarioCommandsContext.Provider value={scoped}>
      {children}
    </ScenarioCommandsContext.Provider>
  );
};
