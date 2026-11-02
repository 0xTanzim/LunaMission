import { useState, useEffect, useCallback, useRef } from 'react';
import type { CandidateSite, ApiStatus } from '@luna/contracts';
import {
  getFilteredCandidateSites,
  registerDynamicSites,
  type SiteCatalogFilter,
} from '@/domain/sites/catalog';
import {
  siteCatalogClient,
  type SiteCatalogFilterOptions,
} from '@/domain/services/siteCatalogClient';

export type UseSiteCatalogFilter = SiteCatalogFilter | SiteCatalogFilterOptions;

export interface UseSiteCatalogReturn {
  readonly sites: CandidateSite[];
  readonly isLoading: boolean;
  readonly status: ApiStatus | 'valid';
  readonly source: 'nextrush_server';
  readonly error: Error | null;
  refresh: () => Promise<CandidateSite[]>;
  refetch: () => Promise<CandidateSite[]>;
}

function resolveFilterKey(filter?: UseSiteCatalogFilter): SiteCatalogFilter {
  if (!filter) return 'all';
  if (typeof filter === 'string') return filter;
  const raw = filter.category || filter.tier || 'all';
  return (raw === 'artemis-2024' ? 'artemis-iii-2024' : raw) as SiteCatalogFilter;
}

/**
 * Application-level React hook for dynamic candidate site catalog ingestion.
 * Consumes candidate landing sites exclusively from NextRush REST API endpoints (GET /api/sites).
 * Implements 5-state handling: LOADING, EMPTY, INCOMPLETE, UNSUPPORTED, FAILED.
 */
export function useSiteCatalog(filter?: UseSiteCatalogFilter): UseSiteCatalogReturn {
  const normKey = resolveFilterKey(filter);
  const initialCached = getFilteredCandidateSites(normKey);

  const [sites, setSites] = useState<CandidateSite[]>(() => initialCached);
  const [isLoading, setIsLoading] = useState<boolean>(() => initialCached.length === 0);
  const [status, setStatus] = useState<ApiStatus | 'valid'>(() => (initialCached.length > 0 ? 'valid' : 'loading'));
  const [error, setError] = useState<Error | null>(null);

  const mountedRef = useRef(true);
  const latestRef = useRef({
    sites,
    isLoading,
    status,
    source: 'nextrush_server' as const,
    error,
  });
  latestRef.current = { sites, isLoading, status, source: 'nextrush_server', error };

  const loadData = useCallback(async (): Promise<CandidateSite[]> => {
    setIsLoading(true);
    setStatus('loading');
    setError(null);
    try {
      const res = await siteCatalogClient.fetchCandidateSites(filter);

      if (res.status === 'failed' || res.error) {
        const errObj = res.error ?? new Error('Failed to load candidate landing sites');
        latestRef.current.error = errObj;
        latestRef.current.status = 'failed';
        latestRef.current.sites = [];

        if (mountedRef.current) {
          setError(errObj);
          setStatus('failed');
          setSites([]);
        }
        return [];
      }

      if (!res.sites || res.sites.length === 0) {
        latestRef.current.status = 'empty';
        latestRef.current.sites = [];
        if (mountedRef.current) {
          setStatus('empty');
          setSites([]);
        }
        return [];
      }

      registerDynamicSites(res.sites);
      latestRef.current.sites = res.sites;
      latestRef.current.status = 'valid';

      if (mountedRef.current) {
        setSites(res.sites);
        setStatus('valid');
      }
      return res.sites;
    } catch (err) {
      const errObj = err instanceof Error ? err : new Error(String(err));
      latestRef.current.error = errObj;
      latestRef.current.status = 'failed';
      latestRef.current.sites = [];
      if (mountedRef.current) {
        setError(errObj);
        setStatus('failed');
        setSites([]);
      }
      return [];
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [filter]);

  useEffect(() => {
    mountedRef.current = true;
    void loadData();
    return () => {
      mountedRef.current = false;
    };
  }, [loadData]);

  return {
    get sites() {
      return latestRef.current.sites;
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
    refresh: loadData,
    refetch: loadData,
  };
}
