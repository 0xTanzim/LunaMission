import type {
  CalculationMode,
  RfLinkBudget,
  FrequencyBandKey,
  ParetoOptimizationResult,
  ParetoWindowRequest,
  LandingSafetyEvaluationInput,
  LandingSafetyEvaluationResult,
  TelecomLinkBudgetResponse,
} from '@luna/contracts';
import type { VolatileProspectingResult } from '@/domain/volatiles/types';

export interface MissionServerClientConfig {
  baseUrl: string;
  timeoutMs: number;
}

const DEFAULT_CONFIG: MissionServerClientConfig = {
  baseUrl: typeof window !== 'undefined' ? '/api' : 'http://localhost:3001/api',
  timeoutMs: 3000,
};

export class MissionServerClient {
  constructor(private readonly config: MissionServerClientConfig = DEFAULT_CONFIG) {}

  withBaseUrl(baseUrl: string): MissionServerClient {
    return new MissionServerClient({ ...this.config, baseUrl });
  }

  async checkHealth(): Promise<{ status: string; uptime?: number; version?: string; timestamp?: string } | null> {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), this.config.timeoutMs);
      const res = await fetch(`${this.config.baseUrl}/health`, { signal: controller.signal });
      clearTimeout(id);
      if (res.ok) return await res.json();
    } catch {
      // Offline
    }
    return null;
  }

  private async postJson<T>(endpoint: string, body: unknown): Promise<T | null> {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), this.config.timeoutMs);
      const res = await fetch(`${this.config.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(id);
      if (res.ok) return (await res.json()) as T;
    } catch {
      // Offline - never fabricate synthetic data
    }
    return null;
  }

  getFallbackLinkBudget(_params?: any): RfLinkBudget {
    return {
      linkState: 'loss_of_signal',
      frequencyGhz: 8.45,
      fsplDb: 0,
      eirpDbw: 0,
      receivedPowerDbm: -999,
      carrierToNoiseDensityDbHz: 0,
      ebN0Db: 0,
      requiredEbN0Db: 4.5,
      linkMarginDb: 0,
      multipathWarning: false,
      dataRateMbps: 0,
    };
  }

  getFallbackParetoWindows(siteId = 'shackleton-rim'): ParetoOptimizationResult {
    return {
      siteId,
      siteName: siteId,
      totalWindowsEvaluated: 0,
      searchRange: { startIso: '', endIso: '' },
      topWindows: [],
      source: 'nextrush_server',
    };
  }

  async getConditions(input: { siteId: string; epochMs: number; calculationMode?: CalculationMode }): Promise<any | null> {
    const data = await this.postJson<any>('/ephemeris/conditions', input);
    if (data) return { ...data, source: 'nextrush_server' as const };
    return null;
  }

  async getLinkBudget(params: {
    siteId?: string;
    epochMs?: number;
    earthDistanceKm?: number;
    earthElevationDeg?: number;
    isTerrainObstructed?: boolean;
    band?: FrequencyBandKey;
    transmitterPowerWatts?: number;
    dataRateMbps?: number;
  }): Promise<(TelecomLinkBudgetResponse & { source: 'nextrush_server' }) | null> {
    const data = await this.postJson<TelecomLinkBudgetResponse>('/telecom/link-budget', params);
    if (data) return { ...data, source: 'nextrush_server' as const };
    return null;
  }

  async getVolatileProspect(coords: {
    latDeg: number;
    lonDeg: number;
  }): Promise<(VolatileProspectingResult & { source: 'nextrush_server' }) | null> {
    const raw = await this.postJson<any>('/volatiles/prospect', coords);
    const data = raw?.data ?? raw;
    if (data && typeof data.divinerTempKelvin === 'number') {
      return { ...data, source: 'nextrush_server' as const };
    }
    return null;
  }

  async prospectVolatiles(coords: {
    latDeg?: number;
    lonDeg?: number;
    latitudeDeg?: number;
    longitudeDeg?: number;
  }): Promise<(VolatileProspectingResult & { source: 'nextrush_server' }) | null> {
    return this.getVolatileProspect({
      latDeg: coords.latDeg ?? coords.latitudeDeg ?? -89.9,
      lonDeg: coords.lonDeg ?? coords.longitudeDeg ?? 0,
    });
  }

  async optimizeLandingWindows(
    input: ParetoWindowRequest,
  ): Promise<(ParetoOptimizationResult & { source: 'nextrush_server' }) | null> {
    const body = await this.postJson<{ data: ParetoOptimizationResult } | ParetoOptimizationResult>('/windows/optimize', input);
    const data = (body as any)?.data ?? body;
    if (data && Array.isArray(data.topWindows)) {
      return { ...data, source: 'nextrush_server' as const };
    }
    return null;
  }

  async solveParetoWindows(
    input: ParetoWindowRequest,
  ): Promise<(ParetoOptimizationResult & { source: 'nextrush_server' }) | null> {
    return this.optimizeLandingWindows(input);
  }

  async evaluateLandingSafety(
    input: LandingSafetyEvaluationInput,
  ): Promise<(LandingSafetyEvaluationResult & { source: 'nextrush_server' }) | null> {
    const data = await this.postJson<LandingSafetyEvaluationResult>('/landing-safety/evaluate', input);
    if (data) return { ...data, source: 'nextrush_server' as const };
    return null;
  }

  async calculateTerrainRoughness(input: {
    latDeg: number;
    lonDeg: number;
    sampleRadiusMeters?: number;
  }): Promise<any | null> {
    const data = await this.postJson<any>('/terrain/slope-roughness', input);
    if (data) return { ...data, source: 'nextrush_server' as const };
    return null;
  }
}

export const missionServerClient = new MissionServerClient();

export const computeFallbackLinkBudget = (params?: any): RfLinkBudget =>
  missionServerClient.getFallbackLinkBudget(params);
