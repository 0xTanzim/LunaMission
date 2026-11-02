import type {
  CandidateSite,
  ScientificSiteInvestigation,
  ReconnaissanceLinks,
  CoordinateDatum,
  SiteCategory,
} from '@luna/contracts';
import type { SiteCatalogFilter } from '@/domain/sites/catalog';

export type { ReconnaissanceLinks, CoordinateDatum };

export interface SiteCatalogFilterOptions {
  category?: string;
  tier?: string;
}

export interface CandidateSitesResult extends Array<CandidateSite> {
  sites: CandidateSite[];
  source: 'nextrush_server';
  status: 'valid' | 'empty' | 'incomplete' | 'unsupported' | 'failed';
  error?: Error;
  metadata?: {
    catalogName: string;
    catalogVersion: string;
    lineage: string;
    coordinateConvention: string;
    elevationDatum: string;
    totalSites: number;
    filteredCount: number;
    activeFilter?: { category?: string; tier?: string };
  };
}

export interface SiteDetailClientResponse {
  site: CandidateSite | null;
  investigation: ScientificSiteInvestigation | null;
  reconnaissanceLinks?: ReconnaissanceLinks;
  datum?: CoordinateDatum;
  source: 'nextrush_server';
  status: 'valid' | 'empty' | 'incomplete' | 'unsupported' | 'failed';
  error?: Error;
}

const DEFAULT_TIMEOUT_MS = 2500;

export class SiteCatalogClient {
  private readonly baseUrl: string;

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  withBaseUrl(newBaseUrl: string): SiteCatalogClient {
    return new SiteCatalogClient(newBaseUrl);
  }

  async fetchCandidateSites(filter?: SiteCatalogFilterOptions | SiteCatalogFilter): Promise<CandidateSitesResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const params = new URLSearchParams();
      if (typeof filter === 'string') {
        if (filter !== 'all') params.set('category', filter);
      } else if (filter) {
        if (filter.category) params.set('category', filter.category);
        if (filter.tier) params.set('tier', filter.tier);
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const url = `${this.baseUrl}/sites${queryString}`;

      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        return this.createEmptyResult(new Error(`API Error: ${res.status} ${res.statusText}`));
      }

      const json = await res.json();
      const rawSites = Array.isArray(json) ? json : json?.sites;
      if (!Array.isArray(rawSites)) {
        return this.createEmptyResult(new Error('Malformed API payload: expected array of candidate sites'));
      }

      const sites: CandidateSite[] = rawSites;
      const metadata = Array.isArray(json) ? undefined : json?.metadata;

      const result = Object.assign([...sites], {
        sites,
        source: 'nextrush_server' as const,
        status: sites.length > 0 ? ('valid' as const) : ('empty' as const),
        metadata,
      });

      return result as CandidateSitesResult;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      return this.createEmptyResult(errorObj);
    } finally {
      clearTimeout(timeout);
    }
  }

  async fetchSiteDetail(id: string): Promise<SiteDetailClientResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const url = `${this.baseUrl}/sites/${encodeURIComponent(id)}`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        const json = await res.json();
        return {
          site: json.site ?? null,
          investigation: json.investigation ?? null,
          reconnaissanceLinks: json.reconnaissanceLinks,
          datum: json.datum,
          source: 'nextrush_server',
          status: json.site ? 'valid' : 'empty',
        };
      }

      return {
        site: null,
        investigation: null,
        source: 'nextrush_server',
        status: 'failed',
        error: new Error(`Failed to fetch site detail for '${id}': ${res.status}`),
      };
    } catch (err) {
      return {
        site: null,
        investigation: null,
        source: 'nextrush_server',
        status: 'failed',
        error: err instanceof Error ? err : new Error(String(err)),
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private createEmptyResult(error?: Error): CandidateSitesResult {
    return Object.assign([] as CandidateSite[], {
      sites: [] as CandidateSite[],
      source: 'nextrush_server' as const,
      status: 'failed' as const,
      error,
    }) as CandidateSitesResult;
  }
}

export const siteCatalogClient = new SiteCatalogClient();
