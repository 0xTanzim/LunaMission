/**
 * Reading the non-dominated frontier the compare service already computed.
 *
 * The frontier, its domination rule and every rank arrive from the API
 * (`tier2Ranking.paretoFrontier`, `rankedCandidates[].pareto`). This module only formats the
 * declared objectives, resolves each objective's declared `sourceField` against the candidate
 * record the API returned, and marks which candidate holds each objective's cohort extreme.
 * It never re-ranks, never weights, never normalises, and never invents a value for an objective
 * the service reports as unavailable.
 */

import type {
  ParetoAvailability,
  ParetoDirection,
  ParetoFrontier,
  ParetoObjectiveId,
  RankedFeasibleCandidate,
} from '@luna/contracts';

export interface ParetoObjectiveRow {
  readonly objectiveId: ParetoObjectiveId;
  readonly label: string;
  readonly unit: string;
  readonly direction: ParetoDirection;
  readonly availability: ParetoAvailability;
  readonly measurementBasis: string;
  readonly limitationNote?: string;
  /** False when the objective carries no value and takes no part in the comparison. */
  readonly participatesInDomination: boolean;
}

export interface ParetoCell {
  readonly objectiveId: ParetoObjectiveId;
  /** Numeric value in the objective's own unit; `null` when the objective has no value here. */
  readonly value: number | null;
  /** Formatted value with its unit, or the unavailability statement. */
  readonly text: string;
  readonly unavailable: boolean;
  readonly unavailableReason?: string;
  /** True when this candidate holds the cohort's extreme value on the objective. */
  readonly isCohortExtreme: boolean;
}

export interface ParetoCandidateRow {
  readonly siteId: string;
  readonly siteName: string;
  readonly rank: number;
  /** Display names of every candidate that dominates this one (transitive). */
  readonly dominatedBy: readonly string[];
  readonly cells: readonly ParetoCell[];
  /** Objectives on which no other candidate matches this candidate's value. */
  readonly uniquelyBestOn: readonly string[];
}

export interface ParetoModel {
  readonly objectives: readonly ParetoObjectiveRow[];
  readonly frontierCandidates: readonly ParetoCandidateRow[];
  readonly dominatedCandidates: readonly ParetoCandidateRow[];
  readonly rankCount: number;
  readonly dominationRule: string;
  readonly unavailableObjectives: readonly ParetoObjectiveRow[];
}

const SHORT_UNIT: Record<string, string> = {
  hours: 'h',
  degrees: '°',
  meters: 'm',
  kilometres: 'km',
  percent: '%',
};

function shortUnit(unit: string): string {
  return SHORT_UNIT[unit] ?? unit;
}

/** Resolves a dotted backend field path, e.g. `metrics.landingSlopeDeg`. */
function readSourceField(candidate: RankedFeasibleCandidate, path: string): number | null {
  let cursor: unknown = candidate;
  for (const key of path.split('.')) {
    if (cursor === null || typeof cursor !== 'object') return null;
    cursor = (cursor as Record<string, unknown>)[key];
  }
  return typeof cursor === 'number' && Number.isFinite(cursor) ? cursor : null;
}

function formattedValue(value: number, unit: string): string {
  return `${value.toFixed(1)} ${shortUnit(unit)}`;
}

/** `higher is better` / `lower is better` — the direction the API declared, in words. */
export function directionPhrase(direction: ParetoDirection): string {
  return direction === 'maximize' ? 'higher is better' : 'lower is better';
}

function buildObjectiveRows(frontier: ParetoFrontier): ParetoObjectiveRow[] {
  return frontier.objectives.map((objective) => ({
    objectiveId: objective.objectiveId,
    label: objective.label,
    unit: objective.unit,
    direction: objective.direction,
    availability: objective.availability,
    measurementBasis: objective.measurementBasis,
    limitationNote: objective.limitationNote,
    participatesInDomination: objective.participatesInDomination,
  }));
}

function sourceFields(frontier: ParetoFrontier): Map<ParetoObjectiveId, string> {
  return new Map(
    frontier.objectives
      .filter((objective) => objective.sourceField !== undefined)
      .map((objective) => [objective.objectiveId, objective.sourceField as string]),
  );
}

function cellFor(
  candidate: RankedFeasibleCandidate,
  objective: ParetoObjectiveRow,
  fields: ReadonlyMap<ParetoObjectiveId, string>,
): ParetoCell {
  if (!objective.participatesInDomination || objective.availability === 'unavailable') {
    return {
      objectiveId: objective.objectiveId,
      value: null,
      text: 'Unavailable',
      unavailable: true,
      unavailableReason:
        objective.limitationNote ??
        'This objective carries no value in the current data model, so it takes no part in the comparison.',
      isCohortExtreme: false,
    };
  }

  const field = fields.get(objective.objectiveId);
  const value = field === undefined ? null : readSourceField(candidate, field);
  if (value === null) {
    return {
      objectiveId: objective.objectiveId,
      value: null,
      text: 'Unavailable',
      unavailable: true,
      unavailableReason: `The response carries no value for ${objective.label} at this site, so this objective cannot be read for it.`,
      isCohortExtreme: false,
    };
  }

  return {
    objectiveId: objective.objectiveId,
    value,
    text: formattedValue(value, objective.unit),
    unavailable: false,
    isCohortExtreme: false,
  };
}

function withExtremes(
  rows: readonly ParetoCandidateRow[],
  objectives: readonly ParetoObjectiveRow[],
): ParetoCandidateRow[] {
  const participating = objectives.filter((objective) => objective.participatesInDomination);
  return rows.map((row) => {
    const uniquelyBestOn: string[] = [];
    const cells = row.cells.map<ParetoCell>((cell) => {
      const objective = participating.find((entry) => entry.objectiveId === cell.objectiveId);
      if (objective === undefined || cell.value === null) return cell;

      const others = rows
        .filter((other) => other.siteId !== row.siteId)
        .map((other) => other.cells.find((entry) => entry.objectiveId === cell.objectiveId)?.value)
        .filter((value): value is number => typeof value === 'number');
      if (others.length === 0) return cell;

      const rival =
        objective.direction === 'maximize' ? Math.max(...others) : Math.min(...others);
      const holdsExtreme = objective.direction === 'maximize' ? cell.value > rival : cell.value < rival;
      if (!holdsExtreme) return cell;
      uniquelyBestOn.push(objective.label);
      return { ...cell, isCohortExtreme: true };
    });
    return { ...row, cells, uniquelyBestOn };
  });
}

export function buildParetoModel(
  frontier: ParetoFrontier | undefined,
  rankedCandidates: readonly RankedFeasibleCandidate[],
): ParetoModel | null {
  if (frontier === undefined || rankedCandidates.length === 0) return null;

  const objectives = buildObjectiveRows(frontier);
  const fields = sourceFields(frontier);
  const namesById = new Map(
    rankedCandidates.map((candidate) => [candidate.siteId, candidate.siteName] as const),
  );

  const rows: ParetoCandidateRow[] = rankedCandidates.map((candidate) => ({
    siteId: candidate.siteId,
    siteName: namesById.get(candidate.siteId) ?? candidate.siteName ?? candidate.siteId,
    rank: candidate.pareto?.rank ?? candidate.rank,
    dominatedBy: (candidate.pareto?.dominatedBy ?? []).map((id) => namesById.get(id) ?? id),
    cells: objectives.map((objective) => cellFor(candidate, objective, fields)),
    uniquelyBestOn: [],
  }));

  const extremeRows = withExtremes(rows, objectives);

  return {
    objectives,
    frontierCandidates: extremeRows.filter((row) => row.rank === 1),
    dominatedCandidates: extremeRows.filter((row) => row.rank !== 1),
    rankCount: frontier.rankCount,
    dominationRule: frontier.dominationRule,
    unavailableObjectives: objectives.filter((objective) => !objective.participatesInDomination),
  };
}
