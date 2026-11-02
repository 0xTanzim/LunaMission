/**
 * RFC 7807 Problem Details Error Definitions
 * Governed by docs/phase-3/API_CONTRACT.md § 6.
 */

export type ScenarioErrorCode =
  | 'E_VALIDATION_ERROR'
  | 'E_SITE_NOT_FOUND'
  | 'E_INVALID_DATE_RANGE'
  | 'E_WINDOW_EXCEEDS_MAX'
  | 'E_UNSUPPORTED_MAST_HEIGHT'
  | 'E_TERRAIN_TRUNCATED'
  | 'E_EPHEMERIS_UNAVAILABLE'
  | 'E_INSUFFICIENT_SITES'
  | 'E_TOO_MANY_SITES'
  | 'E_RATE_LIMIT_EXCEEDED';

export interface InvalidParamDetail {
  name: string;
  reason: string;
}

export interface ProblemDetailsPayload {
  type: string;
  title: string;
  status: number;
  code: ScenarioErrorCode;
  detail: string;
  instance: string;
  invalidParams?: InvalidParamDetail[];
  remediation: string;
  timestampUtc: string;
}

export class ScenarioError extends Error {
  public readonly code: ScenarioErrorCode;
  public readonly title: string;
  public readonly status: number;
  public readonly remediation: string;
  public readonly invalidParams?: InvalidParamDetail[];

  constructor(options: {
    code: ScenarioErrorCode;
    title: string;
    status: number;
    detail: string;
    remediation: string;
    invalidParams?: InvalidParamDetail[];
  }) {
    super(options.detail);
    this.name = 'ScenarioError';
    this.code = options.code;
    this.title = options.title;
    this.status = options.status;
    this.remediation = options.remediation;
    this.invalidParams = options.invalidParams;
  }
}

export function createProblemDetails(
  err: ScenarioError | Error,
  instance: string,
): ProblemDetailsPayload {
  if (err instanceof ScenarioError) {
    return {
      type: `https://lunamission.nasa.gov/errors/${err.code}`,
      title: err.title || err.message || err.code,
      status: err.status,
      code: err.code,
      detail: err.message,
      instance,
      invalidParams: err.invalidParams,
      remediation: err.remediation,
      timestampUtc: new Date().toISOString(),
    };
  }

  return {
    type: 'https://lunamission.nasa.gov/errors/E_EPHEMERIS_UNAVAILABLE',
    title: 'Calculation Engine Error',
    status: 500,
    code: 'E_EPHEMERIS_UNAVAILABLE',
    detail: err.message || 'An internal error occurred during scenario execution',
    instance,
    remediation: 'Inspect upstream ephemeris and terrain logs or retry with valid scenario inputs.',
    timestampUtc: new Date().toISOString(),
  };
}
