/** Presentation-only UTC string helpers for the epoch controls. Never used by scientific computation. */

/** The `YYYY-MM-DD` and `HH:mm:ss` halves of a canonical instant, read in UTC. */
export function epochParts(epochMs: number): { dateStr: string; timeStr: string } {
  const d = new Date(epochMs);
  if (!Number.isFinite(d.getTime())) {
    return { dateStr: '', timeStr: '' };
  }
  const y = String(d.getUTCFullYear()).padStart(4, '0');
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  const s = String(d.getUTCSeconds()).padStart(2, '0');
  return { dateStr: `${y}-${m}-${day}`, timeStr: `${h}:${min}:${s}` };
}
