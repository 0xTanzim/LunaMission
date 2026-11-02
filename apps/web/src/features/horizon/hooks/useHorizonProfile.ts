import { useEffect, useRef, useState } from 'react';
import type { EvaluationStatus, HorizonProfileResponse } from '@luna/contracts';
import {
  fetchHorizonProfile,
  HorizonRequestError,
  HorizonUnsupportedError,
  type HorizonFetchFailureStatus,
} from './horizonProfileClient';

/**
 * useHorizonProfile (task 4.2): typed hook against POST /api/v1/horizons with
 * mast-height switching. States follow the six-state vocabulary — the backend's
 * own status passes through; transport failures map to 'failed' and unknown
 * sites to 'unsupported'. Stale responses (site or mast switched mid-flight)
 * are discarded via request sequencing + abort.
 */

export interface UseHorizonProfileResult {
  readonly profile: HorizonProfileResponse | null;
  readonly status: EvaluationStatus | HorizonFetchFailureStatus | 'loading';
  readonly isLoading: boolean;
  readonly error: Error | null;
}

export function useHorizonProfile(siteId: string, mastHeightMeters: number): UseHorizonProfileResult {
  const [profile, setProfile] = useState<HorizonProfileResponse | null>(null);
  const [status, setStatus] = useState<UseHorizonProfileResult['status']>('loading');
  const [error, setError] = useState<Error | null>(null);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    const seq = ++requestSeqRef.current;
    const controller = new AbortController();

    setStatus('loading');
    setError(null);

    fetchHorizonProfile({ siteId, mastHeightMeters }, controller.signal)
      .then((response) => {
        if (seq !== requestSeqRef.current) return; // stale response — discard
        setProfile(response);
        setStatus(response.status);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || seq !== requestSeqRef.current) return;
        if (err instanceof HorizonUnsupportedError) {
          setProfile(null);
          setStatus('unsupported');
          setError(err);
          return;
        }
        if (err instanceof HorizonRequestError) {
          setProfile(null);
          setStatus(err.httpStatus === 404 ? 'unsupported' : 'failed');
          setError(err);
          return;
        }
        setProfile(null);
        setStatus('failed');
        setError(err instanceof Error ? err : new Error('Horizon profile request failed'));
      });

    return () => controller.abort();
  }, [siteId, mastHeightMeters]);

  return { profile, status, isLoading: status === 'loading', error };
}
