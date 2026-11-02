/** Canonical UTC instant handling: validation, ISO serialization and stepping. */

import { MS_PER_MINUTE } from '@/domain/constants/time';

export interface ParsedUtcDate {
  year: number;
  month: number; // 1 - 12
  day: number;   // 1 - 31
  hours: number; // 0 - 23
  minutes: number; // 0 - 59
  seconds: number; // 0 - 59
}


export interface UtcValidationResult {
  isValid: boolean;
  errorMessage?: string;
  normalizedIsoUtc?: string;
  normalizedEpochMs?: number;
}

/**
 * Validates a UTC date string (YYYY-MM-DD) and time string (HH:mm or HH:mm:ss).
 * Returns validation result without silent coercion.
 */
export function validateUtcDateTime(dateStr: string, timeStr: string): UtcValidationResult {
  const trimmedDate = dateStr.trim();
  const trimmedTime = timeStr.trim();

  // Validate Date portion: YYYY-MM-DD
  const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const dateMatch = trimmedDate.match(dateRegex);
  if (!dateMatch) {
    return {
      isValid: false,
      errorMessage: 'Invalid date format. Expected YYYY-MM-DD (e.g., 2026-10-21).',
    };
  }

  const year = parseInt(dateMatch[1], 10);
  const month = parseInt(dateMatch[2], 10);
  const day = parseInt(dateMatch[3], 10);

  if (month < 1 || month > 12) {
    return { isValid: false, errorMessage: `Month must be between 01 and 12 (got ${month}).` };
  }

  // Days in month validation (accounting for leap years)
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInMonths = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const maxDays = daysInMonths[month - 1];

  if (day < 1 || day > maxDays) {
    return {
      isValid: false,
      errorMessage: `Day must be between 01 and ${maxDays} for ${year}-${String(month).padStart(2, '0')}.`,
    };
  }

  // Validate Time portion: HH:mm or HH:mm:ss
  const timeRegex = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;
  const timeMatch = trimmedTime.match(timeRegex);
  if (!timeMatch) {
    return {
      isValid: false,
      errorMessage: 'Invalid time format. Expected HH:mm or HH:mm:ss in 24h format (e.g., 12:00 or 12:00:00).',
    };
  }

  const hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;

  if (hours < 0 || hours > 23) {
    return { isValid: false, errorMessage: 'Hours must be between 00 and 23.' };
  }
  if (minutes < 0 || minutes > 59) {
    return { isValid: false, errorMessage: 'Minutes must be between 00 and 59.' };
  }
  if (seconds < 0 || seconds > 59) {
    return { isValid: false, errorMessage: 'Seconds must be between 00 and 59.' };
  }

  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  const h = String(hours).padStart(2, '0');
  const min = String(minutes).padStart(2, '0');
  const s = String(seconds).padStart(2, '0');

  return {
    isValid: true,
    normalizedIsoUtc: `${y}-${m}-${d}T${h}:${min}:${s}Z`,
    normalizedEpochMs: Date.UTC(year, month - 1, day, hours, minutes, seconds),
  };
}

/**
 * Format a Date object to ISO UTC string (e.g., 2026-10-21T12:00:00Z)
 */
export function formatIsoUtc(date: Date): string {
  const y = String(date.getUTCFullYear()).padStart(4, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const s = String(date.getUTCSeconds()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}:${s}Z`;
}
/**
 * Offset a canonical instant by whole minutes. UTC has no calendar
 * discontinuities, so integer millisecond arithmetic is exact.
 */
export function stepEpochMs(epochMs: number, deltaMinutes: number): number {
  return epochMs + deltaMinutes * MS_PER_MINUTE;
}

/**
 * Add or subtract time (in minutes or hours) from an ISO UTC string.
 */
export function stepUtc(isoString: string, deltaMinutes: number): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return formatIsoUtc(new Date(stepEpochMs(d.getTime(), deltaMinutes)));
}
