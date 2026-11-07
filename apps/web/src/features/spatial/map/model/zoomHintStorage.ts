export const ZOOM_HINT_DISMISSED_KEY = 'lm-map-zoom-hint-dismissed';

/** Minimal subset of Storage the hint uses; injectable so tests need no DOM. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function resolveStorage(storage?: StorageLike): StorageLike | undefined {
  if (storage) return storage;
  if (typeof window !== 'undefined') return window.sessionStorage;
  return undefined;
}

/** The zoom hint shows at most once per session; dismissal survives remounts. */
export function hasDismissedZoomHint(storage?: StorageLike): boolean {
  try {
    return resolveStorage(storage)?.getItem(ZOOM_HINT_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function storeZoomHintDismissed(storage?: StorageLike): void {
  try {
    resolveStorage(storage)?.setItem(ZOOM_HINT_DISMISSED_KEY, '1');
  } catch {
    // Storage may be unavailable (privacy mode); the in-memory flag still holds.
  }
}
