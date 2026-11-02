/**
 * Defensive Scientific Number & Coordinate Formatters
 * 
 * Strict formatting policy:
 * - Checks types and numerical validity (Number.isFinite) before any formatting call.
 * - Distinguishes legitimate 0 from missing/undefined values.
 * - Never returns NaN, Infinity, undefined, or [object Object].
 * - Preserves declared units and precision.
 * - Emits a consistent fallback ('—') when data is absent or invalid.
 */

export interface FormatNumberOptions {
  decimals?: number;
  sign?: boolean;
  fallback?: string;
  useGrouping?: boolean;
}

/**
 * Safely format any numeric value with controlled precision and locale grouping.
 */
export function formatNumber(
  value: unknown,
  options: FormatNumberOptions = {}
): string {
  const { decimals = 2, sign = false, fallback = '—', useGrouping = true } = options;

  if (value === null || value === undefined || typeof value === 'boolean') {
    return fallback;
  }

  const num = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(num) || Number.isNaN(num)) {
    return fallback;
  }

  try {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping,
    }).format(Math.abs(num));

    if (num > 0 && sign) {
      return `+${formatted}`;
    }
    if (num < 0) {
      return `-${formatted}`;
    }
    return formatted;
  } catch {
    return fallback;
  }
}

/**
 * Formats elevation relative to the lunar mean sphere (1737.4 km radius).
 * Example: +4,250 m or -1,820 m
 */
export function formatElevation(meters: unknown, fallback = '—'): string {
  if (meters === null || meters === undefined) return fallback;
  const num = typeof meters === 'number' ? meters : Number(meters);
  if (!Number.isFinite(num)) return fallback;

  const rounded = Math.round(num);
  const formatted = Math.abs(rounded).toLocaleString('en-US');
  if (rounded > 0) return `+${formatted} m`;
  if (rounded < 0) return `-${formatted} m`;
  return `0 m`;
}

/**
 * Formats celestial and topocentric angles (elevation, azimuth, obstruction) in degrees.
 * Example: +0.45° or 196.5°
 */
export function formatAngle(
  degrees: unknown,
  options: { decimals?: number; sign?: boolean; fallback?: string } = {}
): string {
  const { decimals = 2, sign = false, fallback = '—' } = options;
  if (degrees === null || degrees === undefined) return fallback;
  const num = typeof degrees === 'number' ? degrees : Number(degrees);
  if (!Number.isFinite(num)) return fallback;

  const formatted = formatNumber(num, { decimals, sign, fallback });
  return formatted === fallback ? fallback : `${formatted}°`;
}

/**
 * Formats distances in kilometers with thousands grouping.
 * Example: 390,853 km
 */
export function formatDistance(km: unknown, decimals = 0, fallback = '—'): string {
  if (km === null || km === undefined) return fallback;
  const num = typeof km === 'number' ? km : Number(km);
  if (!Number.isFinite(num)) return fallback;

  const formatted = formatNumber(num, { decimals, fallback, useGrouping: true });
  return formatted === fallback ? fallback : `${formatted} km`;
}

/**
 * Formats light-travel time or duration in seconds.
 * Example: 1.3002 s
 */
export function formatDuration(seconds: unknown, decimals = 4, fallback = '—'): string {
  if (seconds === null || seconds === undefined) return fallback;
  const num = typeof seconds === 'number' ? seconds : Number(seconds);
  if (!Number.isFinite(num)) return fallback;

  const formatted = formatNumber(num, { decimals, fallback });
  return formatted === fallback ? fallback : `${formatted} s`;
}

/**
 * Formats selenographic coordinates according to IAU South Pole convention.
 * Latitude: 89.900°S (negative is South, positive is North)
 * Longitude: 271.400°E (0° to 360° or -180° to +180°)
 */
export function formatCoordinate(
  value: unknown,
  type: 'latitude' | 'longitude',
  decimals = 3,
  fallback = '—'
): string {
  if (value === null || value === undefined) return fallback;
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;

  const absVal = Math.abs(num);
  const formatted = formatNumber(absVal, { decimals, fallback });
  if (formatted === fallback) return fallback;

  if (type === 'latitude') {
    return num < 0 ? `${formatted}°S` : `${formatted}°N`;
  } else {
    return `${formatted}°E`;
  }
}

/**
 * Formats scientific metric results that follow the discriminated union pattern:
 * { kind: 'available', value: number } | { kind: 'unavailable', reason?: string }
 */
export function formatScientificMetric(
  result: { kind: string; value?: number; reason?: string } | null | undefined,
  unit = '',
  decimals = 2,
  options: { sign?: boolean; fallback?: string } = {}
): {
  displayValue: string;
  unitText: string;
  isAvailable: boolean;
  statusNote?: string;
} {
  const fallback = options.fallback || '—';

  if (!result || result.kind !== 'available' || result.value === undefined) {
    return {
      displayValue: fallback,
      unitText: unit,
      isAvailable: false,
      statusNote: result?.reason || 'Data unavailable for this epoch/geometry',
    };
  }

  const formatted = formatNumber(result.value, {
    decimals,
    sign: options.sign,
    fallback,
  });

  return {
    displayValue: formatted,
    unitText: unit,
    isAvailable: true,
  };
}
