import React, { useEffect, useState } from 'react';
import { Activity, Pause, Play } from 'lucide-react';
import { useScenarioCommands } from '@/app/scenario/context/scenarioContext';

export interface LiveRealTimeToggleProps {
  className?: string;
}

/**
 * 1Hz Live Real-Time Ticking Toggle
 *
 * When active, continuously synchronizes the scenario epoch with the
 * real-time system UTC clock every 1,000 milliseconds.
 */
export function LiveRealTimeToggle({ className = '' }: LiveRealTimeToggleProps) {
  const [isLiveActive, setIsLiveActive] = useState(false);
  const { setEpoch } = useScenarioCommands();

  useEffect(() => {
    if (!isLiveActive) return;

    // Immediately jump to current system time
    setEpoch(Date.now());

    // Advance 1 second every 1,000ms
    const timerId = setInterval(() => {
      setEpoch(Date.now());
    }, 1000);

    return () => clearInterval(timerId);
  }, [isLiveActive, setEpoch]);

  return (
    <button
      type="button"
      onClick={() => setIsLiveActive(!isLiveActive)}
      title={
        isLiveActive
          ? 'Live real-time 1Hz ticking active. Click to pause simulation.'
          : 'Activate live real-time UTC clock (1Hz ticking ephemeris)'
      }
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-[var(--lm-radius-sm)] border transition-all cursor-pointer select-none ${
        isLiveActive
          ? 'bg-[var(--lm-color-success-surface-strong)] border-[var(--lm-color-success)]/60 text-[var(--lm-color-success)] shadow-[0_0_12px_rgba(16,185,129,0.3)]'
          : 'bg-[var(--lm-color-surface-elevated)] border-[var(--lm-color-border-subtle)] text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)] hover:border-[var(--lm-color-border)]'
      } ${className}`}
    >
      <span className="relative flex h-2 w-2">
        {isLiveActive && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--lm-color-success)] opacity-75" />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            isLiveActive ? 'bg-[var(--lm-color-success)]' : 'bg-[var(--lm-color-border-strong)]'
          }`}
        />
      </span>

      <span className="tracking-wide">
        {isLiveActive ? 'LIVE 1Hz' : 'LIVE'}
      </span>

      {isLiveActive ? (
        <Pause className="w-3 h-3 text-[var(--lm-color-success)]" />
      ) : (
        <Play className="w-3 h-3 opacity-60" />
      )}
    </button>
  );
}
