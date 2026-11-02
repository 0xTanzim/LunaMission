import React from 'react';
import { AlertCircle, AlertTriangle, HelpCircle, Inbox, RefreshCw } from 'lucide-react';
import type { ApiStatus, EvaluationStatus } from '@luna/contracts';

export type ApiStateStatus =
  | ApiStatus
  | EvaluationStatus
  | 'loading'
  | 'empty'
  | 'valid'
  | 'valid-with-limitations'
  | 'approximate'
  | 'incomplete'
  | 'unsupported'
  | 'failed';

export interface ApiStateViewProps {
  status: ApiStateStatus;
  title?: string;
  message?: string;
  guidance?: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

/**
 * Unified Aerospace State Presenter (Milestone M4 / Feature 17).
 * Renders high-contrast, WCAG 2.2 compliant feedback for epistemic evaluation states.
 */
export const ApiStateView: React.FC<ApiStateViewProps> = ({
  status,
  title,
  message,
  guidance,
  onRetry,
  className = '',
  compact = false,
}) => {
  const padClass = compact ? 'p-2.5 text-xs' : 'p-4 text-xs';

  if (status === 'loading') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`flex items-center justify-center gap-2.5 rounded-lg border border-[var(--lm-color-info)]/30 bg-[var(--lm-color-surface)]/70 font-mono text-[var(--lm-color-info)] ${padClass} ${className}`}
      >
        <RefreshCw className="w-4 h-4 animate-spin text-[var(--lm-color-info)] shrink-0" aria-hidden="true" />
        <span className="px-1.5 py-0.5 text-label font-bold rounded bg-[var(--lm-color-info)]/20 text-[var(--lm-color-info)] border border-[var(--lm-color-info)]/40 tracking-wider shrink-0">
          [LOADING]
        </span>
        <span>{message || title || 'Retrieving authoritative telemetry from NASA REST API...'}</span>
      </div>
    );
  }

  if (status === 'empty') {
    return (
      <div
        role="region"
        aria-label="Empty State"
        className={`flex flex-col items-center justify-center text-center gap-2 rounded-lg border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-canvas)]/70 font-mono text-[var(--lm-color-text-secondary)] ${padClass} ${className}`}
      >
        <div className="flex items-center gap-2">
          <Inbox className="w-5 h-5 text-[var(--lm-color-text-muted)] shrink-0" aria-hidden="true" />
          <span className="px-1.5 py-0.5 text-label font-bold rounded bg-[var(--lm-color-surface-strong)]/40 text-[var(--lm-color-text-secondary)] border border-[var(--lm-color-border-strong)] tracking-wider shrink-0">
            [EMPTY]
          </span>
          <span className="font-semibold text-[var(--lm-color-text-secondary)]">{title || 'No Records Found'}</span>
        </div>
        <span className="text-body text-[var(--lm-color-text-muted)]">{message || 'No telemetry or candidate data available for this query.'}</span>
        {guidance && (
          <div className="text-body text-[var(--lm-color-text-secondary)] font-mono mt-1">
            <span className="text-[var(--lm-color-text-muted)] font-semibold">Remediation:</span> {guidance}
          </div>
        )}
      </div>
    );
  }

  if (status === 'valid-with-limitations' || status === 'approximate') {
    const isLimitations = status === 'valid-with-limitations';
    const symbol = isLimitations ? '◆' : '▲';
    const badge = isLimitations ? '[VALID W/ LIMITATIONS]' : '[APPROXIMATE]';
    const cardBorder = isLimitations ? 'border-[var(--lm-color-warning)]/40 bg-[var(--lm-color-warning-surface)] text-[var(--lm-color-warning)]' : 'border-[var(--lm-color-warning)]/40 bg-[var(--lm-color-warning-surface)] text-[var(--lm-color-warning)]';
    const badgeBorder = isLimitations ? 'bg-[var(--lm-color-warning)]/20 text-[var(--lm-color-warning)] border-[var(--lm-color-warning)]/40' : 'bg-[var(--lm-color-warning)]/20 text-[var(--lm-color-warning)] border-[var(--lm-color-warning)]/40';
    const symbolColor = isLimitations ? 'text-[var(--lm-color-warning)]' : 'text-[var(--lm-color-warning)]';
    const defTitle = isLimitations ? 'Evaluation Valid With Limitations' : 'Approximate Evaluation';
    const defMsg = isLimitations
      ? 'Computed with documented model assumptions or boundary ray truncation.'
      : 'Analytical ephemeris approximation active; consult high-precision horizons model.';

    return (
      <div role="status" className={`flex flex-col gap-1.5 rounded-lg border font-mono ${cardBorder} ${padClass} ${className}`}>
        <div className="flex items-center gap-2">
          <span className={`${symbolColor} font-bold select-none text-base shrink-0 leading-none`} aria-hidden="true">{symbol}</span>
          <span className={`px-1.5 py-0.5 text-label font-bold rounded border tracking-wider shrink-0 ${badgeBorder}`}>{badge}</span>
          <span className="font-semibold">{title || defTitle}</span>
        </div>
        <span className="text-body pl-6">{message || defMsg}</span>
        {guidance && (
          <div className="text-body pl-6 mt-0.5">
            <span className="font-semibold">Remediation:</span> {guidance}
          </div>
        )}
      </div>
    );
  }

  if (status === 'incomplete' || status === 'unsupported') {
    const isInc = status === 'incomplete';
    const icon = isInc ? <AlertTriangle className="w-4 h-4 text-[var(--lm-color-warning)] shrink-0" aria-hidden="true" /> : <HelpCircle className="w-4 h-4 text-[var(--lm-color-data-demo)] shrink-0" aria-hidden="true" />;
    const badge = isInc ? '[INCOMPLETE]' : '[UNSUPPORTED]';
    const cardBorder = isInc ? 'border-[var(--lm-color-warning)]/30 bg-[var(--lm-color-warning-surface)] text-[var(--lm-color-warning)]' : 'border-[var(--lm-color-data-demo)]/30 bg-[var(--lm-color-data-demo-surface)] text-[var(--lm-color-data-demo)]';
    const badgeBorder = isInc ? 'bg-[var(--lm-color-warning)]/20 text-[var(--lm-color-warning)] border-[var(--lm-color-warning)]/40' : 'bg-[var(--lm-color-data-demo)]/20 text-[var(--lm-color-data-demo)] border-[var(--lm-color-data-demo)]/40';
    const defTitle = isInc ? 'Incomplete Data Warning' : 'Unsupported Query Parameter';
    const defMsg = isInc
      ? 'Received partial telemetry from backend. Some metrics could not be resolved.'
      : 'The requested coordinates or parameters fall outside the supported mission domain.';

    return (
      <div role="alert" className={`flex flex-col gap-1.5 rounded-lg border font-mono ${cardBorder} ${padClass} ${className}`}>
        <div className="flex items-center gap-2">
          {icon}
          <span className={`px-1.5 py-0.5 text-label font-bold rounded border tracking-wider shrink-0 ${badgeBorder}`}>{badge}</span>
          <span className="font-semibold">{title || defTitle}</span>
        </div>
        <span className="text-body pl-6">{message || defMsg}</span>
        {guidance && (
          <div className="text-body pl-6 mt-0.5">
            <span className="font-semibold">Remediation:</span> {guidance}
          </div>
        )}
      </div>
    );
  }

  // FAILED state (default)
  return (
    <div
      role="alert"
      className={`flex flex-col gap-2 rounded-lg border border-[var(--lm-color-danger)]/40 bg-[var(--lm-color-danger-surface)] font-mono text-[var(--lm-color-danger)] ${padClass} ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-[var(--lm-color-danger)] shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex flex-col gap-1 flex-1">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 text-label font-bold rounded bg-[var(--lm-color-danger)]/20 text-[var(--lm-color-danger)] border border-[var(--lm-color-danger)]/40 tracking-wider shrink-0">
              [FAILED]
            </span>
            <span className="font-semibold text-[var(--lm-color-danger)]">{title || 'Telemetry Stream Offline'}</span>
          </div>
          <span className="text-body text-[var(--lm-color-danger)]">
            {message || 'Failed to connect to authoritative LunaMission REST API. Zero synthetic numbers generated.'}
          </span>
          {guidance && (
            <div className="text-body text-[var(--lm-color-danger)]/90 mt-1">
              <span className="text-[var(--lm-color-danger)] font-semibold">Remediation:</span> {guidance}
            </div>
          )}
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="tap-target self-end mt-1 min-h-[32px] px-3.5 py-1.5 rounded bg-[var(--lm-color-danger-surface-strong)] hover:bg-[var(--lm-color-danger-surface-strong)] border border-[var(--lm-color-danger)]/50 text-[var(--lm-color-text-primary)] text-body font-semibold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--lm-color-focus)]"
        >
          Retry Connection
        </button>
      )}
    </div>
  );
};
