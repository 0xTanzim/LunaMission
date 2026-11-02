import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Gauge, MapPin, Mountain, Radio, Sun, Target } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CandidateSite } from '@/domain/sites/candidateSite';
import type { ComparisonColumn } from '../model/comparisonColumns';
import {
  buildMatrixSections,
  coreRows,
  detailRowIds,
  detailRows,
  rowVisibilityLabel,
  type MatrixActionId,
  type MatrixSection,
  type MatrixSectionId,
} from '../model/comparisonMatrixSections';
import { MatrixCellContent } from './MatrixCellContent';
import { ComparisonTableHead } from './table/ComparisonTableHead';

const SECTION_ICON: Record<MatrixSectionId, LucideIcon> = {
  location: MapPin,
  illumination: Sun,
  communications: Radio,
  terrain: Mountain,
  uncertainty: Gauge,
  operations: Target,
};

export interface DecisionMatrixProps {
  columns: readonly ComparisonColumn[];
  primarySiteId: string;
  canRemoveSite: boolean;
  onSetPrimary: (siteId: string) => void;
  onInspectSite: (site: CandidateSite) => void;
  onRemoveSite: (siteId: string) => void;
}

function useSectionExpansion() {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set<string>());
  const toggle = (sectionId: string) =>
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  const expandAll = (ids: readonly string[]) => setExpanded(new Set(ids));
  const collapseAll = () => setExpanded(new Set<string>());
  return { expanded, toggle, expandAll, collapseAll };
}

function SectionToggle({
  section,
  expanded,
  onToggle,
  controls,
}: {
  section: MatrixSection;
  expanded: boolean;
  onToggle: () => void;
  controls: string;
}) {
  const detailCount = section.rows.length - coreRows(section).length;
  if (detailCount === 0) return null;
  const Icon = expanded ? ChevronDown : ChevronRight;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls={controls}
      className="inline-flex min-h-[24px] shrink-0 items-center gap-1 rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] px-2 py-0.5 text-[length:var(--lm-text-micro)] font-semibold text-[var(--lm-color-text-secondary)] transition-colors hover:border-[var(--lm-color-info-border)] hover:text-[var(--lm-color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-focus)]"
    >
      <Icon size={11} aria-hidden="true" focusable="false" />
      {expanded ? 'Hide' : 'Show'} {detailCount} more
    </button>
  );
}

function SectionHeading({
  section,
  expanded,
  onToggle,
}: {
  section: MatrixSection;
  expanded: boolean;
  onToggle: () => void;
}) {
  const Icon = SECTION_ICON[section.sectionId];
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="inline-flex items-center gap-1.5 text-[length:var(--lm-text-label)] font-bold uppercase tracking-wider text-[var(--lm-color-text-primary)]">
          <Icon size={13} aria-hidden="true" focusable="false" className="shrink-0" />
          {section.title}
        </span>
        <span className="text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-muted)]">
          {rowVisibilityLabel(section)}
        </span>
        <SectionToggle
          section={section}
          expanded={expanded}
          onToggle={onToggle}
          controls={detailRowIds(section).join(' ')}
        />
      </div>
      <p className="text-[length:var(--lm-text-micro)] leading-snug text-[var(--lm-color-text-secondary)]">
        {section.purpose}
      </p>
      {section.caveat ? (
        <p className="text-[length:var(--lm-text-micro)] leading-snug text-[var(--lm-color-text-muted)]">
          {section.caveat}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The comparison matrix, grouped into the six questions a trade study answers.
 *
 * Desktop keeps the columns side by side because comparing across candidates is the task;
 * below `md` the same groups become a candidate-by-candidate flow with an optional second
 * column, per the responsive contract. Both read one content model, so the two presentations
 * cannot drift apart.
 */
export function DecisionMatrix({
  columns,
  primarySiteId,
  canRemoveSite,
  onSetPrimary,
  onInspectSite,
  onRemoveSite,
}: DecisionMatrixProps) {
  const sections = useMemo(
    () => buildMatrixSections(columns, { primarySiteId, canRemoveSite }),
    [columns, primarySiteId, canRemoveSite],
  );
  const { expanded, toggle, expandAll, collapseAll } = useSectionExpansion();
  const columnCount = columns.length + 1;

  const handleAction = (actionId: MatrixActionId, columnId: string) => {
    if (actionId === 'set-primary') {
      onSetPrimary(columnId);
      return;
    }
    if (actionId === 'remove') {
      onRemoveSite(columnId);
      return;
    }
    const column = columns.find((entry) => entry.site.id === columnId);
    if (column) onInspectSite(column.site);
  };

  const detailSectionIds = sections
    .filter((section) => detailRows(section).length > 0)
    .map((section) => section.sectionId);
  const anyExpanded = detailSectionIds.some((sectionId) => expanded.has(sectionId));

  const cellFor = (section: MatrixSection, rowIndex: number, columnIndex: number) =>
    section.rows[rowIndex]?.cells[columnIndex];

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-muted)]">
          Six groups, the deciding rows first. Every value is computed once for the epoch above and
          read the same way in every column.
        </p>
        {detailSectionIds.length > 0 && (
          <button
            type="button"
            onClick={() => (anyExpanded ? collapseAll() : expandAll(detailSectionIds))}
            className="inline-flex min-h-[24px] items-center rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border-subtle)] px-2 py-0.5 text-[length:var(--lm-text-micro)] font-semibold text-[var(--lm-color-text-secondary)] transition-colors hover:border-[var(--lm-color-info-border)] hover:text-[var(--lm-color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-focus)]"
          >
            {anyExpanded ? 'Collapse all detail' : 'Expand all detail'}
          </button>
        )}
      </div>

      <div
        className="hidden min-w-0 overflow-x-auto rounded-[var(--lm-radius-lg)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface)] md:block"
        data-testid="decision-matrix"
      >
        <table className="w-full min-w-[720px] border-collapse text-left text-[length:var(--lm-text-body)]">
          <caption className="sr-only">
            Candidate comparison for {columns.map((column) => column.site.name).join(', ')} at the
            selected epoch, grouped into location, illumination, communications, terrain,
            uncertainty and operations.
          </caption>
          <ComparisonTableHead
            sites={columns.map((column) => column.site)}
            primarySiteId={primarySiteId}
          />
          {sections.map((section) => {
            const core = coreRows(section);
            const detail = detailRows(section);
            const isExpanded = expanded.has(section.sectionId);
            return (
              <tbody key={section.sectionId} data-section={section.sectionId}>
                <tr className="border-b border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface-raised)]/70">
                  <th
                    scope="rowgroup"
                    colSpan={columnCount}
                    className="px-3 py-2 text-left align-top font-normal"
                  >
                    <SectionHeading
                      section={section}
                      expanded={isExpanded}
                      onToggle={() => toggle(section.sectionId)}
                    />
                  </th>
                </tr>
                {core.map((row) => (
                  <tr key={row.rowId} className="border-b border-[var(--lm-color-border-subtle)]">
                    <th scope="row" className="px-3 py-2 align-top text-left font-normal">
                      <span className="block text-[length:var(--lm-text-micro)] font-medium leading-snug text-[var(--lm-color-text-secondary)]">
                        {row.label}
                      </span>
                      {row.note ? (
                        <span className="mt-0.5 block text-[length:var(--lm-text-micro)] leading-snug text-[var(--lm-color-text-muted)]">
                          {row.note}
                        </span>
                      ) : null}
                    </th>
                    {columns.map((column, columnIndex) => (
                      <td
                        key={column.site.id}
                        className="border-l border-[var(--lm-color-border-subtle)] px-3 py-2 align-top"
                      >
                        <MatrixCellContent
                          cell={cellFor(section, section.rows.indexOf(row), columnIndex)!}
                          onAction={handleAction}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                {detail.map((row) => {
                  const rowIndex = section.rows.indexOf(row);
                  return (
                    <tr
                      key={row.rowId}
                      id={`${row.rowId}-row`}
                      hidden={!isExpanded}
                      className="border-b border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-canvas)]/40"
                    >
                      <th scope="row" className="px-3 py-2 align-top text-left font-normal">
                        <span className="block text-[length:var(--lm-text-micro)] font-medium leading-snug text-[var(--lm-color-text-secondary)]">
                          {row.label}
                        </span>
                        {row.note ? (
                          <span className="mt-0.5 block text-[length:var(--lm-text-micro)] leading-snug text-[var(--lm-color-text-muted)]">
                            {row.note}
                          </span>
                        ) : null}
                      </th>
                      {columns.map((column, columnIndex) => (
                        <td
                          key={column.site.id}
                          className="border-l border-[var(--lm-color-border-subtle)] px-3 py-2 align-top"
                        >
                          <MatrixCellContent
                            cell={cellFor(section, rowIndex, columnIndex)!}
                            onAction={handleAction}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            );
          })}
        </table>
      </div>

      <CandidateFlow
        columns={columns}
        sections={sections}
        expanded={expanded}
        onToggle={toggle}
        onAction={handleAction}
      />
    </div>
  );
}

interface CandidateFlowProps {
  columns: readonly ComparisonColumn[];
  sections: readonly MatrixSection[];
  expanded: ReadonlySet<string>;
  onToggle: (sectionId: string) => void;
  onAction: (actionId: MatrixActionId, columnId: string) => void;
}

/**
 * Below `md` the matrix becomes a candidate-by-candidate flow with an optional second column,
 * because two 13px columns of measurements on a phone is what makes a table unreadable.
 */
function CandidateFlow({ columns, sections, expanded, onToggle, onAction }: CandidateFlowProps) {
  const [primaryId, setPrimaryId] = useState(() => columns[0]?.site.id ?? '');
  const [comparedId, setComparedId] = useState('');
  const activePrimaryId = columns.some((column) => column.site.id === primaryId)
    ? primaryId
    : (columns[0]?.site.id ?? '');
  const activeComparedId =
    comparedId !== activePrimaryId && columns.some((column) => column.site.id === comparedId)
      ? comparedId
      : '';

  const primaryColumn = columns.find((column) => column.site.id === activePrimaryId);
  const comparedColumn = columns.find((column) => column.site.id === activeComparedId);

  return (
    <div className="flex min-w-0 flex-col gap-3 md:hidden" data-testid="decision-matrix-flow">
      <div className="flex flex-col gap-2 rounded-[var(--lm-radius-md)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface)] p-3">
        <label
          htmlFor="matrix-flow-primary"
          className="text-[length:var(--lm-text-micro)] font-semibold uppercase tracking-wider text-[var(--lm-color-text-muted)]"
        >
          Candidate
        </label>
        <select
          id="matrix-flow-primary"
          value={activePrimaryId}
          onChange={(event) => setPrimaryId(event.target.value)}
          className="min-h-[36px] w-full rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] px-2 py-1 font-mono text-[length:var(--lm-text-body)] text-[var(--lm-color-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--lm-color-focus)]"
        >
          {columns.map((column) => (
            <option key={column.site.id} value={column.site.id}>
              {column.site.code} · {column.site.name}
            </option>
          ))}
        </select>

        <label
          htmlFor="matrix-flow-compared"
          className="text-[length:var(--lm-text-micro)] font-semibold uppercase tracking-wider text-[var(--lm-color-text-muted)]"
        >
          Second column (optional)
        </label>
        <select
          id="matrix-flow-compared"
          value={activeComparedId}
          onChange={(event) => setComparedId(event.target.value)}
          className="min-h-[36px] w-full rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] px-2 py-1 font-mono text-[length:var(--lm-text-body)] text-[var(--lm-color-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--lm-color-focus)]"
        >
          <option value="">None — one candidate at a time</option>
          {columns
            .filter((column) => column.site.id !== activePrimaryId)
            .map((column) => (
              <option key={column.site.id} value={column.site.id}>
                {column.site.code} · {column.site.name}
              </option>
            ))}
        </select>
      </div>

      {sections.map((section) => {
        const isExpanded = expanded.has(section.sectionId);
        const rows = [...coreRows(section), ...(isExpanded ? detailRows(section) : [])];
        return (
          <section
            key={section.sectionId}
            aria-labelledby={`flow-${section.sectionId}`}
            className="rounded-[var(--lm-radius-md)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface)] p-3"
          >
            <h3
              id={`flow-${section.sectionId}`}
              className="text-[length:var(--lm-text-label)] font-bold uppercase tracking-wider text-[var(--lm-color-text-primary)]"
            >
              {section.title}
            </h3>
            <p className="mt-1 text-[length:var(--lm-text-micro)] leading-snug text-[var(--lm-color-text-secondary)]">
              {section.purpose}
            </p>
            {section.caveat ? (
              <p className="mt-1 text-[length:var(--lm-text-micro)] leading-snug text-[var(--lm-color-text-muted)]">
                {section.caveat}
              </p>
            ) : null}
            <SectionToggle
              section={section}
              expanded={isExpanded}
              onToggle={() => onToggle(section.sectionId)}
              controls={detailRowIds(section).join(' ')}
            />

            <div className="mt-2 flex items-baseline gap-2 border-b border-[var(--lm-color-border-subtle)] pb-1">
              <span className="min-w-0 flex-[1.4] text-[length:var(--lm-text-micro)] uppercase tracking-wider text-[var(--lm-color-text-muted)]">
                Measurement
              </span>
              <span className="min-w-0 flex-1 font-mono text-[length:var(--lm-text-micro)] text-[var(--lm-color-selected-site)]">
                {primaryColumn?.site.code}
              </span>
              {comparedColumn ? (
                <span className="min-w-0 flex-1 font-mono text-[length:var(--lm-text-micro)] text-[var(--lm-color-series-b)]">
                  {comparedColumn.site.code}
                </span>
              ) : null}
            </div>

            <dl className="flex flex-col">
              {rows.map((row) => {
                const primaryCell = row.cells[columns.indexOf(primaryColumn!)];
                const comparedCell = comparedColumn
                  ? row.cells[columns.indexOf(comparedColumn)]
                  : undefined;
                return (
                  <div
                    key={row.rowId}
                    className="flex items-baseline gap-2 border-b border-[var(--lm-color-border-subtle)] py-1.5 last:border-b-0"
                  >
                    <dt className="min-w-0 flex-[1.4]">
                      <span className="block text-[length:var(--lm-text-micro)] leading-snug text-[var(--lm-color-text-secondary)]">
                        {row.label}
                      </span>
                      {row.note ? (
                        <span className="mt-0.5 block text-[length:var(--lm-text-micro)] leading-snug text-[var(--lm-color-text-muted)]">
                          {row.note}
                        </span>
                      ) : null}
                    </dt>
                    <dd className="min-w-0 flex-1">
                      {primaryCell ? (
                        <MatrixCellContent cell={primaryCell} onAction={onAction} />
                      ) : null}
                    </dd>
                    {comparedCell ? (
                      <dd className="min-w-0 flex-1">
                        <MatrixCellContent cell={comparedCell} onAction={onAction} />
                      </dd>
                    ) : null}
                  </div>
                );
              })}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
