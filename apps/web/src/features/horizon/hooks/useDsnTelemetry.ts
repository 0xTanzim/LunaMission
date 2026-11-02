import { useState, useEffect, useCallback, useRef } from 'react';
import type { DsnTelemetryResponse, ApiStatus } from '@luna/contracts';
import { dsnTelemetryClient } from '@/domain/services/dsnTelemetryClient';

export interface UseDsnTelemetryOptions {
  siteId?: string;
  epochMs?: number;
  pollIntervalMs?: number;
}

export interface UseDsnTelemetryReturn {
  readonly telemetry: DsnTelemetryResponse;
  readonly isLive: boolean;
  readonly isLoading: boolean;
  readonly status: ApiStatus | 'valid';
  readonly source: 'nextrush_server';
  readonly error: Error | null;
  refresh: () => Promise<DsnTelemetryResponse>;
}

/**
 * Custom React hook for live NASA Deep Space Network (DSN) telemetry ingestion.
 * Consumes telemetry exclusively from the authoritative NextRush `/api/telemetry/dsn` REST endpoint.
 * Zero client-side procedural DSN fabrication or local analytical fallbacks.
 */
export function useDsnTelemetry(options?: UseDsnTelemetryOptions): UseDsnTelemetryReturn {
  const epochMs = options?.epochMs;
  const siteId = options?.siteId;

  const [telemetry, setTelemetry] = useState<DsnTelemetryResponse>(() =>
    dsnTelemetryClient.createOfflineResponse(epochMs)
  );
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<ApiStatus | 'valid'>('loading');
  const [error, setError] = useState<Error | null>(null);

  const mountedRef = useRef(true);
  const latestRef = useRef({
    telemetry,
    isLive,
    isLoading,
    status,
    source: 'nextrush_server' as const,
    error,
  });
  latestRef.current = { telemetry, isLive, isLoading, status, source: 'nextrush_server', error };

  const fetchTelemetry = useCallback(async (): Promise<DsnTelemetryResponse> => {
    setIsLoading(true);
    setStatus('loading');
    setError(null);
    try {
      const data = await dsnTelemetryClient.fetchLiveDsnTelemetry(siteId, epochMs);
      const isActuallyLive = data.status === 'live_feed' || data.status === 'cached_valid';

      latestRef.current.telemetry = data;
      latestRef.current.isLive = isActuallyLive;
      latestRef.current.status = isActuallyLive ? 'valid' : data.status === 'offline_fallback' ? 'failed' : 'empty';

      if (mountedRef.current) {
        setTelemetry(data);
        setIsLive(isActuallyLive);
        setStatus(isActuallyLive ? 'valid' : data.status === 'offline_fallback' ? 'failed' : 'empty');
      }
      return data;
    } catch (err) {
      const errObj = err instanceof Error ? err : new Error(String(err));
      const offline = dsnTelemetryClient.createOfflineResponse(epochMs);

      latestRef.current.error = errObj;
      latestRef.current.isLive = false;
      latestRef.current.status = 'failed';
      latestRef.current.telemetry = offline;

      if (mountedRef.current) {
        setError(errObj);
        setIsLive(false);
        setStatus('failed');
        setTelemetry(offline);
      }
      return offline;
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [siteId, epochMs]);

  useEffect(() => {
    mountedRef.current = true;
    void fetchTelemetry();

    let intervalId: ReturnType<typeof setInterval> | undefined;
    if (options?.pollIntervalMs && options.pollIntervalMs > 0) {
      intervalId = setInterval(() => {
        void fetchTelemetry();
      }, options.pollIntervalMs);
    }

    return () => {
      mountedRef.current = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchTelemetry, options?.pollIntervalMs]);

  return {
    get telemetry() {
      return latestRef.current.telemetry;
    },
    get isLive() {
      return latestRef.current.isLive;
    },
    get isLoading() {
      return latestRef.current.isLoading;
    },
    get status() {
      return latestRef.current.status;
    },
    get source() {
      return latestRef.current.source;
    },
    get error() {
      return latestRef.current.error;
    },
    refresh: fetchTelemetry,
  };
}
