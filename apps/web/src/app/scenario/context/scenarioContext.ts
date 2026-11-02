import { createContext, useContext } from 'react';
import { CalculationMode } from '@/domain/celestial/calculationMode';
import { ScenarioState } from '@/app/scenario/state/scenarioState';
import { ScenarioModel } from '@/app/scenario/model/scenarioModel';
import { CustomLandingTarget } from '@/domain/target/customTargetModel';

/**
 * Command surface exposed to consumers so no component builds an action literal.
 *
 * `selectSite` commits the mission analysis target. `focusMapSite` only moves the
 * inspection focus, which is what map pin clicks and ribbon chips mean.
 */
export interface ScenarioCommands {
  selectSite: (siteId: string) => void;
  focusMapSite: (siteId: string) => void;
  setCustomTarget: (target: CustomLandingTarget | null) => void;
  setEpoch: (epochMs: number) => void;
  setCalculationMode: (mode: CalculationMode) => void;
}

/** Split contexts: writers can depend on the stable command object without re-rendering on state. */
export const ScenarioStateContext = createContext<ScenarioState | null>(null);
export const ScenarioModelContext = createContext<ScenarioModel | null>(null);
export const ScenarioCommandsContext = createContext<ScenarioCommands | null>(null);

function requireContext<T>(value: T | null, hookName: string): T {
  if (value === null) {
    throw new Error(`${hookName} must be used inside <ScenarioProvider>`);
  }
  return value;
}

/**
 * The inspected scenario: mission target unless a map inspection is in progress.
 * The mission target itself lives in the authoritative store (`primarySiteId`).
 */
export function useScenario(): ScenarioState {
  return requireContext(useContext(ScenarioStateContext), 'useScenario');
}

export function useScenarioModel(): ScenarioModel {
  return requireContext(useContext(ScenarioModelContext), 'useScenarioModel');
}

export function useScenarioCommands(): ScenarioCommands {
  return requireContext(useContext(ScenarioCommandsContext), 'useScenarioCommands');
}

export function useSelectSite(): (siteId: string) => void {
  return useScenarioCommands().selectSite;
}

export function useSetCustomTarget(): (target: CustomLandingTarget | null) => void {
  return useScenarioCommands().setCustomTarget;
}

export function useSetEpoch(): (epochMs: number) => void {
  return useScenarioCommands().setEpoch;
}

export function useSetCalculationMode(): (mode: CalculationMode) => void {
  return useScenarioCommands().setCalculationMode;
}
