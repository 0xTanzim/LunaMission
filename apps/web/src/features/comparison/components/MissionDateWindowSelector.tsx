import React from 'react';
import { Calendar, Clock, SunMedium, Compass, Sparkles } from 'lucide-react';

export interface MissionDateWindowSelectorProps {
  selectedDate: Date;
  durationDays: number;
  onSelectDate: (date: Date) => void;
  onSelectDuration: (days: number) => void;
  onOpenParetoSolver?: () => void;
  className?: string;
}

const PRESET_WINDOWS = [
  {
    id: 'artemis-3',
    label: 'Artemis III Target',
    dateIso: '2026-10-21T12:00:00Z',
    badge: 'Oct 2026',
    description: 'Primary NASA Artemis III candidate landing season',
  },
  {
    id: 'summer-solstice',
    label: 'South Summer Solstice',
    dateIso: '2026-12-14T00:00:00Z',
    badge: 'Dec 2026',
    description: 'Peak southern continuous illumination & minimum shadow period',
  },
  {
    id: 'winter-minimum',
    label: 'South Winter Minimum',
    dateIso: '2026-06-18T00:00:00Z',
    badge: 'Jun 2026',
    description: 'Extreme polar shadow stress test for rover battery sizing',
  },
];

export function MissionDateWindowSelector({
  selectedDate,
  durationDays,
  onSelectDate,
  onSelectDuration,
  onOpenParetoSolver,
  className = '',
}: MissionDateWindowSelectorProps) {
  const selectedIso = selectedDate.toISOString();
  const dateInputVal = selectedIso.slice(0, 10);

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 p-3 bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)] rounded-[var(--lm-radius-md)] ${className}`}>
      {/* Presets Row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-mono font-semibold text-[var(--lm-color-text-secondary)] uppercase tracking-wider flex items-center gap-1.5 mr-1">
          <Calendar className="w-3.5 h-3.5 text-[var(--lm-color-info)]" />
          Mission Window:
        </span>

        {onOpenParetoSolver && (
          <button
            type="button"
            onClick={onOpenParetoSolver}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-info)]/60 bg-gradient-to-r from-[var(--lm-color-info-surface-strong)] to-[var(--lm-color-series-b-surface-strong)] text-[var(--lm-color-info)] hover:from-[var(--lm-color-info-surface-strong)] hover:to-[var(--lm-color-series-b-surface-strong)] transition-all cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--lm-color-info)]" />
            <span>Pareto Solver (2026-2028)</span>
          </button>
        )}

        {PRESET_WINDOWS.map((preset) => {
          const isActive = selectedIso.startsWith(preset.dateIso.slice(0, 10));
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectDate(new Date(preset.dateIso))}
              title={preset.description}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-[var(--lm-radius-sm)] border transition-all cursor-pointer ${
                isActive
                  ? 'bg-[var(--lm-color-info-surface-strong)] border-[var(--lm-color-info)]/60 text-[var(--lm-color-info)] font-semibold'
                  : 'bg-[var(--lm-color-surface-elevated)] border-[var(--lm-color-border-subtle)] text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)] hover:border-[var(--lm-color-border)]'
              }`}
            >
              <span>{preset.label}</span>
              <span className="px-1 py-0.2 rounded text-[11px] bg-[var(--lm-color-info)]/20 text-[var(--lm-color-info)]">
                {preset.badge}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onSelectDate(new Date())}
          title="Jump to today's real-time date"
          className="px-2.5 py-1 text-xs font-mono rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface-elevated)] text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)] cursor-pointer"
        >
          Today
        </button>
      </div>

      {/* Duration & Date Input */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Custom Date Input */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-[var(--lm-color-text-muted)]">Date:</span>
          <input
            type="date"
            aria-label="Mission comparison reference date"
            value={dateInputVal}
            onChange={(e) => {
              const val = e.target.value;
              if (val) onSelectDate(new Date(`${val}T12:00:00Z`));
            }}
            className="px-2 py-0.5 text-xs font-mono bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)] rounded text-[var(--lm-color-text-primary)] focus:outline-none focus:border-[var(--lm-color-info-border)]"
          />
        </div>

        {/* Duration Buttons */}
        <div className="flex items-center gap-1 bg-[var(--lm-color-canvas)] p-0.5 rounded border border-[var(--lm-color-border-subtle)]">
          {[7, 14, 30].map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => onSelectDuration(days)}
              className={`px-2 py-0.5 text-xs font-mono rounded transition-colors cursor-pointer ${
                durationDays === days
                  ? 'bg-[var(--lm-color-info-fill)] text-[var(--lm-color-text-primary)] font-semibold'
                  : 'text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)]'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
