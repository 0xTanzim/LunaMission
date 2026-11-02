import { Download } from 'lucide-react';
import type { CandidateSite } from '@/domain/sites/candidateSite';

export interface ComparisonHeaderProps {
  /** Rendered epoch, e.g. `2026-10-21 12:00 UTC`. */
  formattedEpoch: string;
  sitesToAdd: readonly CandidateSite[];
  /** False once the comparison is full. */
  canAddSite: boolean;
  onAddSite: (siteId: string) => void;
  onExportCsv: () => void;
}

/**
 * The comparison's own toolbar: what the columns share, how to widen them, and how to take the
 * result away. It stays one line of chrome — the measurements below are the page.
 */
export function ComparisonHeader({
  formattedEpoch,
  sitesToAdd,
  canAddSite,
  onAddSite,
  onExportCsv,
}: ComparisonHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 rounded-[var(--lm-radius-md)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface)] p-3">
      <div className="min-w-0">
        <h2 className="text-[length:var(--lm-text-h3)] font-semibold leading-tight text-[var(--lm-color-text-primary)]">
          Side-by-side comparison
        </h2>
        <p className="mt-0.5 text-[length:var(--lm-text-micro)] leading-snug text-[var(--lm-color-text-muted)]">
          Every column is evaluated at {formattedEpoch}, at one observer mast height and under one
          calculation mode — that is what makes the columns comparable.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        {canAddSite && sitesToAdd.length > 0 ? (
          <div>
            <label
              htmlFor="add-site-select"
              className="block text-[length:var(--lm-text-micro)] font-semibold uppercase tracking-wider text-[var(--lm-color-text-muted)]"
            >
              Add column
            </label>
            <select
              id="add-site-select"
              value=""
              onChange={(event) => {
                if (event.target.value) onAddSite(event.target.value);
              }}
              className="min-h-[28px] cursor-pointer rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] px-2 py-1 font-mono text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--lm-color-focus)]"
            >
              <option value="" disabled>
                Select a candidate…
              </option>
              {sitesToAdd.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.code} · {site.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onExportCsv}
          className="inline-flex min-h-[28px] items-center gap-1.5 rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-info-border)] bg-[var(--lm-color-info-surface)] px-2 py-1 font-mono text-[length:var(--lm-text-micro)] font-semibold text-[var(--lm-color-info)] transition-colors hover:bg-[var(--lm-color-info-surface-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-focus)]"
        >
          <Download size={12} aria-hidden="true" focusable="false" />
          Export CSV matrix
        </button>
      </div>
    </div>
  );
}
