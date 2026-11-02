/**
 * Custom Landing Target Storage Engine
 *
 * Provides pure serialization, validation, and persistence routines
 * decoupled from browser globals via KeyValueStorage interface.
 */

import { CustomLandingTarget } from './customTargetModel';

export const CUSTOM_TARGETS_STORAGE_KEY = 'lunamission_custom_targets';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear?(): void;
}

/**
 * Validates whether an unknown object conforms to the CustomLandingTarget shape.
 */
export function isCustomLandingTarget(obj: unknown): obj is CustomLandingTarget {
  if (!obj || typeof obj !== 'object') return false;
  const candidate = obj as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.latitudeDeg === 'number' &&
    Number.isFinite(candidate.latitudeDeg) &&
    typeof candidate.longitudeDeg === 'number' &&
    Number.isFinite(candidate.longitudeDeg) &&
    typeof candidate.elevationKm === 'number' &&
    Number.isFinite(candidate.elevationKm)
  );
}

/**
 * Loads and defensively parses stored custom landing targets.
 */
export function loadCustomLandingTargets(storage?: KeyValueStorage | null): CustomLandingTarget[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(CUSTOM_TARGETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCustomLandingTarget);
  } catch {
    return [];
  }
}

/**
 * Saves or updates a custom landing target and returns the updated collection.
 */
export function saveCustomLandingTarget(
  target: CustomLandingTarget,
  storage?: KeyValueStorage | null,
): CustomLandingTarget[] {
  const current = loadCustomLandingTargets(storage);
  const existingIndex = current.findIndex((item) => item.id === target.id);

  let updated: CustomLandingTarget[];
  if (existingIndex >= 0) {
    updated = [...current];
    updated[existingIndex] = target;
  } else {
    updated = [...current, target];
  }

  if (storage) {
    try {
      storage.setItem(CUSTOM_TARGETS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Gracefully handle storage quota errors
    }
  }

  return updated;
}

/**
 * Deletes a custom landing target by ID and returns the updated collection.
 */
export function deleteCustomLandingTarget(
  targetId: string,
  storage?: KeyValueStorage | null,
): CustomLandingTarget[] {
  const current = loadCustomLandingTargets(storage);
  const updated = current.filter((item) => item.id !== targetId);

  if (storage) {
    try {
      storage.setItem(CUSTOM_TARGETS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Graceful fallback
    }
  }

  return updated;
}

/**
 * Clears all custom landing targets from storage.
 */
export function clearCustomLandingTargets(storage?: KeyValueStorage | null): void {
  if (!storage) return;
  try {
    storage.removeItem(CUSTOM_TARGETS_STORAGE_KEY);
  } catch {
    // Graceful fallback
  }
}
