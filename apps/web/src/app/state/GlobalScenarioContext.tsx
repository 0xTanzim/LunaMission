import React, { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import {
  createInitialGlobalScenarioState,
  scenarioReducer,
  type GlobalScenarioState,
  type ScenarioAction,
} from './scenarioReducer';

interface ScenarioContextValue {
  state: GlobalScenarioState;
  dispatch: React.Dispatch<ScenarioAction>;
}

/**
 * `null` means "no store has been created in this tree yet", which lets both the
 * provider and the compatibility bridge ask whether they are the outermost owner.
 * Consumers keep the lenient pre-existing behaviour through `useGlobalScenarioContext`.
 */
const ScenarioContext = createContext<ScenarioContextValue | null>(null);

const defaultScenarioContextValue: ScenarioContextValue = {
  state: createInitialGlobalScenarioState(),
  dispatch: () => undefined,
};

export interface GlobalScenarioProviderProps {
  children: ReactNode;
  initialOverride?: Partial<GlobalScenarioState>;
}

/**
 * Owns the single authoritative scenario store.
 *
 * Only the outermost provider creates state; a nested occurrence renders its
 * children through so that composition layers can never fork a second store.
 */
export const GlobalScenarioProvider: React.FC<GlobalScenarioProviderProps> = ({
  children,
  initialOverride,
}) => {
  const existing = useContext(ScenarioContext);
  if (existing) return <>{children}</>;

  return <ScenarioStoreOwner initialOverride={initialOverride}>{children}</ScenarioStoreOwner>;
};

const ScenarioStoreOwner: React.FC<GlobalScenarioProviderProps> = ({ children, initialOverride }) => {
  const [state, dispatch] = useReducer(
    scenarioReducer,
    initialOverride,
    (override) => {
      const base = createInitialGlobalScenarioState(
        typeof window !== 'undefined' && window.location ? window.location.search : undefined,
      );
      return override ? { ...base, ...override } : base;
    },
  );

  const value = useMemo<ScenarioContextValue>(() => ({ state, dispatch }), [state, dispatch]);

  return <ScenarioContext.Provider value={value}>{children}</ScenarioContext.Provider>;
};

/** Lenient accessor: without a provider it yields the documented initial scenario. */
export function useGlobalScenarioContext(): ScenarioContextValue {
  return useContext(ScenarioContext) ?? defaultScenarioContextValue;
}

/** Strict accessor for callers that must know whether a real store is mounted. */
export function useOptionalGlobalScenarioContext(): ScenarioContextValue | null {
  return useContext(ScenarioContext);
}
