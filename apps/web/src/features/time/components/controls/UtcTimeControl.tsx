import React, { useState } from 'react';
import { Clock, ChevronLeft, ChevronRight, Calendar, RotateCcw, AlertCircle } from 'lucide-react';
import { validateUtcDateTime, stepEpochMs } from '@/domain/time/utcEpoch';
import { MS_PER_SECOND } from '@/domain/constants/time';
import { epochParts } from '@/features/time/model/utcDisplay';
import { useScenarioCommands, useScenarioModel } from '@/app/scenario/context/scenarioContext';

interface EpochDraft {
  /** The canonical instant these draft strings were seeded from. */
  committedEpochMs: number;
  dateStr: string;
  timeStr: string;
}

/**
 * Global UTC epoch control. The canonical instant lives in scenario state; the
 * text fields hold a draft so a half-typed date never reaches the reducer.
 */
export function UtcTimeControl() {
  const { epochMs } = useScenarioModel();
  const { setEpoch } = useScenarioCommands();

  const [draft, setDraft] = useState<EpochDraft>(() => ({ ...epochParts(epochMs), committedEpochMs: epochMs }));
  const [validationError, setValidationError] = useState<string | null>(null);

  // Any external epoch change (presets, stepping, playback) reseeds the draft during render.
  if (draft.committedEpochMs !== epochMs) {
    setDraft({ ...epochParts(epochMs), committedEpochMs: epochMs });
    setValidationError(null);
  }

  function commit(dateStr: string, timeStr: string) {
    const result = validateUtcDateTime(dateStr, timeStr);
    if (result.isValid && result.normalizedEpochMs !== undefined) {
      setValidationError(null);
      setEpoch(result.normalizedEpochMs);
      return;
    }
    setValidationError(result.errorMessage || 'Invalid UTC date or time');
  }

  function handleDateChange(val: string) {
    setDraft({ ...draft, dateStr: val });
    commit(val, draft.timeStr);
  }

  function handleTimeChange(val: string) {
    setDraft({ ...draft, timeStr: val });
    commit(draft.dateStr, val);
  }

  function handleStep(deltaMinutes: number) {
    setEpoch(stepEpochMs(epochMs, deltaMinutes));
  }

  function handleSetNow() {
    setEpoch(Math.floor(Date.now() / MS_PER_SECOND) * MS_PER_SECOND);
  }

  function handlePresetSelect(isoString: string) {
    const presetMs = new Date(isoString).getTime();
    if (Number.isFinite(presetMs)) setEpoch(presetMs);
  }

  const dateInput = draft.dateStr;
  const timeInput = draft.timeStr;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {/* Date Input */}
        <div className="flex items-center gap-1.5 bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] px-2.5 py-1 rounded-[var(--lm-radius-sm)] focus-within:border-[var(--lm-color-focus)]">
          <label htmlFor="utc-date-input" className="text-xs text-[var(--lm-color-text-muted)] font-medium flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-[var(--lm-color-text-muted)]" />
            <span className="sr-only sm:not-sr-only">Date:</span>
          </label>
          <input
            id="utc-date-input"
            type="text"
            value={dateInput}
            onChange={(e) => handleDateChange(e.target.value)}
            placeholder="YYYY-MM-DD"
            className="w-24 sm:w-28 text-xs font-mono-num bg-transparent text-[var(--lm-color-text-primary)] focus:outline-none"
            aria-label="Selected UTC Date (YYYY-MM-DD)"
          />
        </div>

        {/* Time Input */}
        <div className="flex items-center gap-1.5 bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] px-2.5 py-1 rounded-[var(--lm-radius-sm)] focus-within:border-[var(--lm-color-focus)]">
          <label htmlFor="utc-time-input" className="text-xs text-[var(--lm-color-text-muted)] font-medium flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[var(--lm-color-text-muted)]" />
            <span className="sr-only sm:not-sr-only">Time:</span>
          </label>
          <input
            id="utc-time-input"
            type="text"
            value={timeInput}
            onChange={(e) => handleTimeChange(e.target.value)}
            placeholder="HH:mm:ss"
            className="w-20 text-xs font-mono-num bg-transparent text-[var(--lm-color-text-primary)] focus:outline-none"
            aria-label="Selected UTC Time (HH:mm:ss)"
          />
          <span className="text-[11px] font-semibold text-[var(--lm-color-sun)] bg-[var(--lm-color-surface)] px-1.5 py-0.5 rounded-[var(--lm-radius-xs)] font-mono">
            UTC
          </span>
        </div>

        {/* Step Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleStep(-60)}
            title="Step back 1 hour"
            aria-label="Step back 1 hour (UTC)"
            className="px-2 py-1 text-xs font-mono-num rounded-[var(--lm-radius-xs)] bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-strong)] transition-colors"
          >
            -1h
          </button>
          <button
            type="button"
            onClick={() => handleStep(-10)}
            title="Step back 10 minutes"
            aria-label="Step back 10 minutes (UTC)"
            className="hidden sm:inline-block px-1.5 py-1 text-xs font-mono-num rounded-[var(--lm-radius-xs)] bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-strong)] transition-colors"
          >
            -10m
          </button>
          <button
            type="button"
            onClick={() => handleStep(10)}
            title="Step forward 10 minutes"
            aria-label="Step forward 10 minutes (UTC)"
            className="hidden sm:inline-block px-1.5 py-1 text-xs font-mono-num rounded-[var(--lm-radius-xs)] bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-strong)] transition-colors"
          >
            +10m
          </button>
          <button
            type="button"
            onClick={() => handleStep(60)}
            title="Step forward 1 hour"
            aria-label="Step forward 1 hour (UTC)"
            className="px-2 py-1 text-xs font-mono-num rounded-[var(--lm-radius-xs)] bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-strong)] transition-colors"
          >
            +1h
          </button>
        </div>

        {/* Presets dropdown (hidden on mobile to preserve vertical budget) */}
        <div className="hidden sm:flex items-center gap-1.5">
          <label htmlFor="mission-presets-select" className="sr-only">Mission Preset Epochs</label>
          <select
            id="mission-presets-select"
            aria-label="Mission preset epochs"
            onChange={(e) => {
              if (e.target.value) {
                handlePresetSelect(e.target.value);
              }
            }}
            value=""
            className="text-xs bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] text-[var(--lm-color-text-secondary)] rounded-[var(--lm-radius-sm)] px-2 py-1 focus:outline-none focus:border-[var(--lm-color-focus)] cursor-pointer"
          >
            <option value="" disabled>
              Mission Presets...
            </option>
            <option value="2026-10-21T12:00:00Z">Artemis III Target (2026-10-21 12:00 UTC)</option>
            <option value="2026-12-14T00:00:00Z">South Summer Solstice (2026-12-14 00:00 UTC)</option>
            <option value="2026-06-18T00:00:00Z">South Winter Minimum (2026-06-18 00:00 UTC)</option>
            <option value="2026-11-05T06:00:00Z">VIPER Candidate Phase (2026-11-05 06:00 UTC)</option>
          </select>

          <button
            type="button"
            onClick={handleSetNow}
            title="Set to Current Real-world UTC Time"
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-[var(--lm-radius-sm)] bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)] hover:border-[var(--lm-color-border-subtle)] transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Now</span>
          </button>
        </div>
      </div>

      {validationError && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--lm-color-warning)] bg-[var(--lm-color-surface-raised)] px-2.5 py-1 rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-warning)]/30">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{validationError} — retaining previous valid epoch.</span>
        </div>
      )}
    </div>
  );
}