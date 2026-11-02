import { useCallback } from 'react';
import { useGlobalScenarioContext } from './GlobalScenarioContext';
import type { CalculationMode, GlobalScenarioState } from './scenarioReducer';
import type { CustomLandingTarget } from '@/domain/target/customTargetModel';

export function useScenarioState() {
  const { state, dispatch } = useGlobalScenarioContext();

  const setPrimarySite = useCallback((siteId: string) => {
    dispatch({ type: 'SET_PRIMARY_SITE', siteId });
  }, [dispatch]);

  /** Inspects a site in the map-facing panels without committing it as the mission target. */
  const setMapFocus = useCallback((siteId: string | null) => {
    dispatch({ type: 'SET_MAP_FOCUS', siteId });
  }, [dispatch]);

  const clearMapFocus = useCallback(() => {
    dispatch({ type: 'SET_MAP_FOCUS', siteId: null });
  }, [dispatch]);

  const setComparisonSite = useCallback((siteId: string | null) => {
    dispatch({ type: 'SET_COMPARISON_SITE', siteId });
  }, [dispatch]);

  const setCustomTarget = useCallback((target: CustomLandingTarget | null) => {
    dispatch({ type: 'SET_CUSTOM_TARGET', target });
  }, [dispatch]);

  const setMissionEpoch = useCallback((startUtc: string, stopUtc: string, durationDays: number) => {
    dispatch({ type: 'SET_MISSION_EPOCH', startUtc, stopUtc, durationDays });
  }, [dispatch]);

  const setMastHeight = useCallback((heightM: 1.0 | 2.0 | 5.0 | 10.0) => {
    dispatch({ type: 'SET_MAST_HEIGHT', heightM });
  }, [dispatch]);

  const setSunCriterion = useCallback((criterion: 'upperLimb' | 'fullDisk') => {
    dispatch({ type: 'SET_SUN_CRITERION', criterion });
  }, [dispatch]);

  const setEarthCriterion = useCallback((criterion: 'center' | 'fullDisk' | 'anyLimb') => {
    dispatch({ type: 'SET_EARTH_CRITERION', criterion });
  }, [dispatch]);

  const setLaunchSlip = useCallback((offsetDays: number) => {
    dispatch({ type: 'SET_LAUNCH_SLIP', offsetDays });
  }, [dispatch]);

  const setPlayheadUtc = useCallback((playheadUtc: string) => {
    dispatch({ type: 'SET_PLAYHEAD_UTC', playheadUtc });
  }, [dispatch]);

  const setCalculationMode = useCallback((mode: CalculationMode) => {
    dispatch({ type: 'SET_CALCULATION_MODE', mode });
  }, [dispatch]);

  const setHoveredAzimuth = useCallback((azimuthDeg: number | null) => {
    dispatch({ type: 'SET_HOVERED_AZIMUTH', azimuthDeg });
  }, [dispatch]);

  const setActiveBlocker = useCallback((azimuthDeg: number | null) => {
    dispatch({ type: 'SET_ACTIVE_BLOCKER', azimuthDeg });
  }, [dispatch]);

  const setProjection = useCallback((projection: 'explore' | 'analyze' | 'compare') => {
    dispatch({ type: 'SET_PROJECTION', projection });
  }, [dispatch]);

  const setDimensionMode = useCallback((mode: '2d' | '3d') => {
    dispatch({ type: 'SET_DIMENSION_MODE', mode });
  }, [dispatch]);

  const setActiveDrawer = useCallback((drawer: GlobalScenarioState['activeDrawer']) => {
    dispatch({ type: 'SET_ACTIVE_DRAWER', drawer });
  }, [dispatch]);

  const setCalculationStatus = useCallback((status: GlobalScenarioState['calculationStatus'], id: string | null = null) => {
    dispatch({ type: 'SET_CALCULATION_STATUS', status, id });
  }, [dispatch]);

  return {
    state,
    dispatch,
    setPrimarySite,
    setMapFocus,
    clearMapFocus,
    setComparisonSite,
    setCustomTarget,
    setMissionEpoch,
    setMastHeight,
    setSunCriterion,
    setEarthCriterion,
    setLaunchSlip,
    setPlayheadUtc,
    setCalculationMode,
    setHoveredAzimuth,
    setActiveBlocker,
    setProjection,
    setDimensionMode,
    setActiveDrawer,
    setCalculationStatus,
  };
}
