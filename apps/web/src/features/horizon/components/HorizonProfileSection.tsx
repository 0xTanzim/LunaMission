import React from 'react';
import { useHorizonProfile } from '../hooks/useHorizonProfile';
import { HorizonRadarBackendPlot } from './HorizonRadarBackendPlot';
import { ApiStateView } from '@/shared/ui/ApiStateView';

/**
 * Task 4.3 integration gate: renders the backend-driven horizon radar for
 * registered sites, the six-state API states while loading/failing, and the
 * legacy fallback plot for sites the curated asset cannot serve (custom
 * targets) until the 4.5 retirement pass.
 */
export interface HorizonProfileSectionProps {
  siteId: string;
  mastHeightMeters: number;
  /** Optional legacy render for states the backend cannot serve. Omitted since 4.5: failures render honest API states. */
  fallback?: React.ReactNode;
}

export function HorizonProfileSection({ siteId, mastHeightMeters, fallback }: HorizonProfileSectionProps) {
  const { profile, status, error } = useHorizonProfile(siteId, mastHeightMeters);

  if (profile) {
    return <HorizonRadarBackendPlot profile={profile} />;
  }

  if (status === 'loading') {
    return (
      <ApiStateView
        status="loading"
        title="Loading Backend Horizon Profile"
        message={`Acquiring the curated LOLA horizon profile for ${siteId} at ${mastHeightMeters} m mast height...`}
      />
    );
  }

  if (status === 'unsupported' || status === 'failed') {
    return (
      <div className="flex flex-col gap-2">
        <div
          role="alert"
          className="text-[11px] font-mono px-3 py-2 rounded-[var(--lm-radius-sm)] bg-[var(--lm-color-danger)]/10 border border-[var(--lm-color-danger)]/40 text-[var(--lm-color-danger)]"
        >
          {status === 'unsupported'
            ? `No curated LOLA horizon profile exists for "${siteId}" — the backend asset covers registered south-polar candidate sites only.`
            : `Backend horizon profile unavailable (${error?.message ?? 'request failed'}).`}
        </div>
        {fallback}
      </div>
    );
  }

  return fallback ?? null;
}
