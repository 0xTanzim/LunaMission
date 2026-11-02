import React, { useState, useRef, useCallback } from 'react';
import { useScenarioModel, useScenarioCommands } from '@/app/scenario/context/scenarioContext';
import { useSpatialPreferences } from '@/features/spatial/hooks/useSpatialPreferences';
import { DEFAULT_SITE_ID, getSiteById, getAllAvailableSites } from '@/domain/sites/catalog';
import { CandidateSite } from '@/domain/sites/candidateSite';

export function usePlanetaryTheaterState() {
  const { site: selectedSite, conditions, ephemeris, epochIsoUtc, epochMs } = useScenarioModel();
  const { selectSite, setEpoch } = useScenarioCommands();
  const { preferences, toggleLayer, selectCameraPreset, selectScientificMapMode, toggleDisplayFillLighting } = useSpatialPreferences();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showSitePanel, setShowSitePanel] = useState(true);
  const [showTerrain, setShowTerrain] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  // The navigation dock wraps to three rows below ~700px of height and then covers a fifth of the
  // globe. Start it collapsed there so the terrain is visible on entry; the toggle restores it.
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerHeight < 720,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFlyoverActive, setIsFlyoverActive] = useState(false);
  const [isSplitView, setIsSplitView] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const epochRef = useRef(epochMs);
  epochRef.current = epochMs;

  const stepTimeHours = useCallback(
    (hours: number) => {
      setEpoch(epochRef.current + hours * 3600 * 1000);
    },
    [setEpoch],
  );

  const togglePlayback = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  React.useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setEpoch(epochRef.current + 3600 * 1000);
    }, 400);
    return () => clearInterval(interval);
  }, [isPlaying, setEpoch]);

  const handleSelectSite = useCallback(
    (site: CandidateSite) => {
      selectSite(site.id);
    },
    [selectSite],
  );

  // Camera-only reset (task 2.9): restoring the framing must never silently change the
  // site under analysis — selection reset is a separate, explicit control.
  const handleToggleFillLighting = useCallback(() => {
    toggleDisplayFillLighting();
  }, [toggleDisplayFillLighting]);

  const handleResetCamera = useCallback(() => {
    setIsFlyoverActive(false);
    selectCameraPreset('nadir');
  }, [selectCameraPreset]);

  const handleResetSelection = useCallback(() => {
    const defaultSite = getSiteById(DEFAULT_SITE_ID) ?? getAllAvailableSites()[0];
    if (defaultSite) selectSite(defaultSite.id);
  }, [selectSite]);

  return {
    selectedSite,
    conditions,
    ephemeris,
    epochIsoUtc,
    preferences,
    toggleLayer,
    selectCameraPreset,
    selectScientificMapMode,
    isFullscreen,
    setIsFullscreen,
    showDiagnostics,
    setShowDiagnostics,
    showSitePanel,
    setShowSitePanel,
    showTerrain,
    setShowTerrain,
    showMarkers,
    setShowMarkers,
    showLabels,
    setShowLabels,
    isControlsCollapsed,
    setIsControlsCollapsed,
    isPlaying,
    togglePlayback,
    stepTimeHours,
    isFlyoverActive,
    setIsFlyoverActive,
    isSplitView,
    setIsSplitView,
    isComparisonOpen,
    setIsComparisonOpen,
    containerRef,
    handleSelectSite,
    handleResetCamera,
    handleResetSelection,
    handleToggleFillLighting,
  };
}
