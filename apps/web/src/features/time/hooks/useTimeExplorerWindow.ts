import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { generateTimelineSeries } from '@/domain/celestial/timeline';
import { stepEpochMs } from '@/domain/time/utcEpoch';
import { useScenario, useScenarioCommands, useScenarioModel } from '@/app/scenario/context/scenarioContext';

export type TimeWindowHours = 24 | 168 | 720; // 24 hours, 7 days, 30 days

export const TIME_WINDOW_OPTIONS: ReadonlyArray<{ label: string; hours: TimeWindowHours }> = [
  { label: '24 Hours', hours: 24 },
  { label: '7 Days', hours: 168 },
  { label: '30 Days', hours: 720 },
];

/** Coarser stepping as the window widens keeps the sample count readable. */
const STEP_HOURS_BY_WINDOW: Record<TimeWindowHours, number> = { 24: 1, 168: 6, 720: 12 };

/** Fraction of the window placed to the left of the canonical epoch when anchoring. */
const WINDOW_ANCHOR_RATIO = 0.25;
/** Once the epoch passes this fraction of the window, scroll the window forward. */
const WINDOW_LEAD_TRIGGER_RATIO = 0.85;
const WINDOW_SCROLL_RATIO = 0.4;
const MS_PER_HOUR = 3_600_000;

/** One playback tick advances the canonical epoch; the rate is the speed multiplier. */
const PLAYBACK_BASE_TICK_MS = 600;

/**
 * Owns the Time Explorer's view of time: which window is on screen, the samples
 * drawn in it, and the animation that walks the canonical epoch forward. The
 * epoch itself stays in the scenario store — this hook only moves it.
 */
export function useTimeExplorerWindow() {
  const { calculationMode } = useScenario();
  const { setEpoch } = useScenarioCommands();
  const {
    site: selectedSite,
    epochMs: currentEpochMs,
    epochIsoUtc: currentIsoUtc,
    conditions,
  } = useScenarioModel();

  const [windowHours, setWindowHours] = useState<TimeWindowHours>(24);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 5>(1);
  const [showDataTable, setShowDataTable] = useState(false);

  const stepHours = STEP_HOURS_BY_WINDOW[windowHours];

  const anchorStartMs = useCallback(
    (epochMs: number, hours: number, centreRatio = WINDOW_ANCHOR_RATIO) =>
      epochMs - hours * centreRatio * MS_PER_HOUR,
    [],
  );

  const [windowStartMs, setWindowStartMs] = useState<number>(() =>
    anchorStartMs(currentEpochMs, windowHours),
  );
  const windowEndMs = windowStartMs + windowHours * MS_PER_HOUR;

  // Re-anchor when the epoch leaves the window or crowds its right edge.
  useEffect(() => {
    if (currentEpochMs < windowStartMs || currentEpochMs > windowEndMs) {
      setWindowStartMs(anchorStartMs(currentEpochMs, windowHours));
    } else if (currentEpochMs > windowStartMs + windowHours * WINDOW_LEAD_TRIGGER_RATIO * MS_PER_HOUR) {
      setWindowStartMs((prev) => prev + windowHours * WINDOW_SCROLL_RATIO * MS_PER_HOUR);
    }
  }, [anchorStartMs, currentEpochMs, windowEndMs, windowHours, windowStartMs]);

  const handleWindowHoursChange = (hours: TimeWindowHours) => {
    setWindowHours(hours);
    setWindowStartMs(anchorStartMs(currentEpochMs, hours));
  };

  const handleResetToSelectedEpoch = () => {
    setWindowStartMs(anchorStartMs(currentEpochMs, windowHours, 0.5));
  };

  const points = useMemo(
    () =>
      generateTimelineSeries(
        selectedSite,
        new Date(windowStartMs + (windowHours / 2) * MS_PER_HOUR),
        windowHours,
        stepHours,
        calculationMode,
      ),
    [selectedSite, windowStartMs, windowHours, stepHours, calculationMode],
  );

  const currentEpochMsRef = useRef(currentEpochMs);
  currentEpochMsRef.current = currentEpochMs;

  useEffect(() => {
    if (!isPlaying) return;
    const intervalId = setInterval(() => {
      setEpoch(stepEpochMs(currentEpochMsRef.current, stepHours * 60));
    }, Math.round(PLAYBACK_BASE_TICK_MS / playbackSpeed));
    return () => clearInterval(intervalId);
  }, [isPlaying, playbackSpeed, setEpoch, stepHours]);

  const stepByWindow = useCallback(
    (direction: 1 | -1) => setEpoch(stepEpochMs(currentEpochMs, direction * stepHours * 60)),
    [currentEpochMs, setEpoch, stepHours],
  );

  return {
    calculationMode,
    conditions,
    currentEpochMs,
    currentIsoUtc,
    handleResetToSelectedEpoch,
    handleWindowHoursChange,
    isPlaying,
    playbackSpeed,
    points,
    selectedSite,
    setEpoch,
    setPlaying: setIsPlaying,
    setPlaybackSpeed,
    setShowDataTable,
    showDataTable,
    stepBackward: () => stepByWindow(-1),
    stepForward: () => stepByWindow(1),
    stepHours,
    windowEndMs,
    windowHours,
    windowStartMs,
  };
}
