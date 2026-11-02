/**
 * Typed REST client for POST /api/v1/horizons (tasks 4.1/4.2).
 *
 * The frontend horizon path consumes backend-computed blocker metadata — zero
 * terrain ray-marching or ephemeris math in the browser (AGENTS.md §1.1).
 */

import type { EvaluationStatus, HorizonProfileResponse } from '@luna/contracts';

export interface HorizonProfileQuery {
  siteId: string;
  mastHeightMeters?: number;
}

/** Site exists but carries no curated horizon profile (e.g. a custom target). */
export class HorizonUnsupportedError extends Error {
  constructor(siteId: string) {
    super(`No curated horizon profile exists for site "${siteId}".`);
    this.name = 'HorizonUnsupportedError';
  }
}

/** Transport or server failure while fetching the profile. */
export class HorizonRequestError extends Error {
  readonly httpStatus: number | null;
  constructor(message: string, httpStatus: number | null = null) {
    super(message);
    this.name = 'HorizonRequestError';
    this.httpStatus = httpStatus;
  }
}

export type HorizonFetchFailureStatus = Extract<EvaluationStatus, 'unsupported' | 'failed'>;

export function mapHttpFailureToStatus(httpStatus: number): HorizonFetchFailureStatus {
  return httpStatus === 404 ? 'unsupported' : 'failed';
}

const API_BASE = '/api';

export async function fetchHorizonProfile(query: HorizonProfileQuery, signal?: AbortSignal): Promise<HorizonProfileResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/v1/horizons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId: query.siteId, mastHeightMeters: query.mastHeightMeters ?? 2 }),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new HorizonRequestError(error instanceof Error ? error.message : 'Horizon profile request failed');
  }

  if (!response.ok) {
    if (response.status === 404) throw new HorizonUnsupportedError(query.siteId);
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (body?.error) detail = String(body.error);
    } catch { /* non-JSON error body — keep the HTTP status detail */ }
    throw new HorizonRequestError(detail, response.status);
  }

  return (await response.json()) as HorizonProfileResponse;
}
