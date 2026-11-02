/**
 * The decision matrix's content model.
 *
 * The matrix used to be one flat table of every measurement the epoch-instant result exposes,
 * which read as a data dump: nothing said which numbers decide the trade, and nothing said what
 * the numbers do not establish. Here the same measurements are grouped into the six questions a
 * mission planner actually asks — where is it, does the Sun reach it, does Earth see it, what
 * skyline is it behind, what do the numbers rest on, and what can I do about it — with two or
 * three deciding rows per group and the rest behind an expander.
 *
 * Every value is formatted from a result the domain already computed (`ComparisonColumn`) or from
 * a catalogue fact. Nothing here recomputes geometry, blends observables or fills a gap: a result
 * that is unavailable renders the shared placeholder with its own reason attached.
 */

import type { BadgeVariant } from '@/shared/ui/Badge';
import type { ResultAvailability } from '@/domain/celestial/availability';
import type { ComparisonColumn } from './comparisonColumns';
import {
  EARTH_VISIBILITY_BADGE_CELLS,
  ILLUMINATION_BADGE_CELLS,
  signedAngleCell,
  unsignedAngleCell,
} from './comparisonCells';
import { UNAVAILABLE_PLACEHOLDER } from '@/shared/formatting/availability';

export const MATRIX_SECTION_IDS = [
  'location',
  'illumination',
  'communications',
  'terrain',
  'uncertainty',
  'operations',
] as const;

export type MatrixSectionId = (typeof MATRIX_SECTION_IDS)[number];

export type MatrixActionId = 'set-primary' | 'inspect' | 'remove';

/** A numeric or textual measurement. `unavailable` cells never carry a unit or a value. */
export interface MatrixValueCell {
  readonly kind: 'value';
  readonly columnId: string;
  readonly text: string;
  /** Unit printed after the value, when the value carries one. */
  readonly unit?: string;
  readonly unavailable: boolean;
  readonly unavailableReason?: string;
  readonly emphasis?: 'primary' | 'sun' | 'earth';
}

/** A categorical state, carried by a badge and by the words inside it. */
export interface MatrixStateCell {
  readonly kind: 'state';
  readonly columnId: string;
  readonly label: string;
  readonly variant: BadgeVariant;
  readonly unavailable?: boolean;
  readonly unavailableReason?: string;
}

/** A route into the decision. Operations is the only group that offers actions. */
export interface MatrixActionCell {
  readonly kind: 'action';
  readonly columnId: string;
  readonly actionId: MatrixActionId;
  readonly label: string;
  /** Set when the action exists but cannot be taken; stated, never silent. */
  readonly disabledReason?: string;
}

export type MatrixCell = MatrixValueCell | MatrixStateCell | MatrixActionCell;

export interface MatrixRow {
  readonly rowId: string;
  readonly label: string;
  /** Measurement caveat printed under the label. */
  readonly note?: string;
  /** A deciding row, shown without expanding the group. */
  readonly core: boolean;
  readonly cells: readonly MatrixCell[];
}

export interface MatrixSection {
  readonly sectionId: MatrixSectionId;
  readonly title: string;
  /** What this group decides, in one sentence. */
  readonly purpose: string;
  /** What the group's numbers do not establish. */
  readonly caveat?: string;
  readonly rows: readonly MatrixRow[];
}

export interface MatrixOptions {
  /** The mission target, so Operations can say whether a column already is it. */
  readonly primarySiteId: string;
  readonly canRemoveSite: boolean;
}

const NINE_GEOMETRY_RESULTS = 9;

function unavailableCell(
  column: ComparisonColumn,
  reason: string,
  emphasis?: MatrixValueCell['emphasis'],
): MatrixValueCell {
  return {
    kind: 'value',
    columnId: column.site.id,
    text: UNAVAILABLE_PLACEHOLDER,
    unavailable: true,
    unavailableReason: reason,
    emphasis,
  };
}

/** A value cell from an already-computed result plus the formatter for its unit. */
function resultCell(
  column: ComparisonColumn,
  result: ResultAvailability<number>,
  format: (value: number) => { text: string; unit?: string },
  emphasis?: MatrixValueCell['emphasis'],
): MatrixValueCell {
  if (result.kind !== 'available') return unavailableCell(column, result.reason, emphasis);
  const formatted = format(result.value);
  return {
    kind: 'value',
    columnId: column.site.id,
    text: formatted.text,
    unit: formatted.unit,
    unavailable: false,
    emphasis,
  };
}

function signedAngleValue(
  column: ComparisonColumn,
  result: ResultAvailability<number>,
  emphasis?: MatrixValueCell['emphasis'],
): MatrixValueCell {
  return resultCell(
    column,
    result,
    (value) => ({ text: signedAngleCell({ kind: 'available', value, unit: '°' }) }),
    emphasis,
  );
}

function unsignedAngleValue(column: ComparisonColumn, result: ResultAvailability<number>) {
  return resultCell(column, result, (value) => ({
    text: unsignedAngleCell({ kind: 'available', value, unit: '°' }),
  }));
}

function textCell(column: ComparisonColumn, text: string, emphasis?: MatrixValueCell['emphasis']): MatrixValueCell {
  return { kind: 'value', columnId: column.site.id, text, unavailable: false, emphasis };
}

/** A catalogue statement that is either recorded or explicitly absent. */
function statedTextCell(
  column: ComparisonColumn,
  text: string | undefined,
  missingReason: string,
): MatrixValueCell {
  return text === undefined ? unavailableCell(column, missingReason) : textCell(column, text);
}

function optionalNumberCell(
  column: ComparisonColumn,
  value: number | undefined,
  format: (value: number) => { text: string; unit?: string },
  missingReason: string,
): MatrixValueCell {
  if (value === undefined) return unavailableCell(column, missingReason);
  const formatted = format(value);
  return {
    kind: 'value',
    columnId: column.site.id,
    text: formatted.text,
    unit: formatted.unit,
    unavailable: false,
  };
}

/** The nine geometry results this matrix reports, for the coverage statement only. */
function geometryResults(column: ComparisonColumn): ResultAvailability<number>[] {
  const c = column.conditions;
  return [
    c.sunElevationDeg,
    c.sunAzimuthDeg,
    c.solarIlluminationFraction,
    c.earthElevationDeg,
    c.earthAzimuthDeg,
    c.rangeKm,
    c.theoreticalOneWayLightTimeSeconds,
    c.localTerrainElevationAtSunAzimuthDeg,
    c.localTerrainElevationAtEarthAzimuthDeg,
  ];
}

function entityClassification(column: ComparisonColumn): string {
  const entityType = column.site.entityType;
  if (entityType === 'region-centroid') return 'Region centroid';
  if (entityType === 'custom-point') return 'Custom point';
  return 'Candidate point';
}

function locationRows(columns: readonly ComparisonColumn[]): MatrixRow[] {
  return [
    {
      rowId: 'location-position',
      label: 'Selenographic position',
      note: 'IAU/IAG Lunar Mean Earth / Polar Axis',
      core: true,
      cells: columns.map((column) =>
        textCell(
          column,
          `${Math.abs(column.site.coordinates.latitudeDeg).toFixed(2)}°S, ${column.site.coordinates.longitudeDeg.toFixed(2)}°E`,
        ),
      ),
    },
    {
      rowId: 'location-elevation',
      label: 'LOLA DEM elevation',
      core: true,
      cells: columns.map((column) =>
        textCell(column, column.site.coordinates.elevationMeters.toLocaleString(), 'primary'),
      ),
    },
    {
      rowId: 'location-identity',
      label: 'Catalogue identity',
      core: false,
      cells: columns.map((column) =>
        textCell(column, `${column.site.code} · ${column.site.priority}`),
      ),
    },
    {
      rowId: 'location-entity',
      label: 'Spatial entity',
      note: 'A candidate region is not an approved touchdown coordinate',
      core: false,
      cells: columns.map((column) => textCell(column, entityClassification(column))),
    },
    {
      rowId: 'location-coverage',
      label: 'Data coverage',
      core: false,
      cells: columns.map((column) =>
        statedTextCell(
          column,
          column.site.coverageStatus,
          'No coverage statement is registered for this site.',
        ),
      ),
    },
    {
      rowId: 'location-reference',
      label: 'Official reference',
      core: false,
      cells: columns.map((column) =>
        statedTextCell(
          column,
          column.site.officialRegionReference,
          'This entry carries no published region reference.',
        ),
      ),
    },
  ];
}

function illuminationRows(columns: readonly ComparisonColumn[]): MatrixRow[] {
  return [
    {
      rowId: 'illumination-elevation',
      label: 'Sun elevation',
      core: true,
      cells: columns.map((column) => signedAngleValue(column, column.conditions.sunElevationDeg, 'sun')),
    },
    {
      rowId: 'illumination-state',
      label: 'Illumination condition',
      core: true,
      cells: columns.map((column) => {
        const badge = ILLUMINATION_BADGE_CELLS[column.conditions.solarIllumination];
        return {
          kind: 'state' as const,
          columnId: column.site.id,
          label: badge.label,
          variant: badge.variant,
        };
      }),
    },
    {
      rowId: 'illumination-azimuth',
      label: 'Sun azimuth from north',
      core: false,
      cells: columns.map((column) => unsignedAngleValue(column, column.conditions.sunAzimuthDeg)),
    },
    {
      rowId: 'illumination-disk',
      label: 'Visible solar disk',
      note: 'Geometric visible fraction — not an irradiance-weighted fraction and not generated power',
      core: false,
      cells: columns.map((column) =>
        resultCell(column, column.conditions.solarIlluminationFraction, (value) => ({
          text: (value * 100).toFixed(0),
          unit: '%',
        })),
      ),
    },
    {
      rowId: 'illumination-terrain',
      label: 'Terrain horizon at Sun azimuth',
      core: false,
      cells: columns.map((column) =>
        signedAngleValue(column, column.conditions.localTerrainElevationAtSunAzimuthDeg),
      ),
    },
  ];
}

function communicationsRows(columns: readonly ComparisonColumn[]): MatrixRow[] {
  return [
    {
      rowId: 'communications-elevation',
      label: 'Earth centre elevation',
      core: true,
      cells: columns.map((column) => signedAngleValue(column, column.conditions.earthElevationDeg, 'earth')),
    },
    {
      rowId: 'communications-los',
      label: 'Geometric line-of-sight',
      core: true,
      cells: columns.map((column) => {
        const visibility = column.conditions.earthVisibility;
        if (visibility === 'unavailable') {
          return {
            kind: 'state' as const,
            columnId: column.site.id,
            label: 'Not computed',
            variant: 'warning' as const,
            unavailable: true,
            unavailableReason:
              'No Earth line-of-sight result exists for this site at this epoch; it is not a sub-horizon result.',
          };
        }
        const badge = EARTH_VISIBILITY_BADGE_CELLS[visibility];
        return {
          kind: 'state' as const,
          columnId: column.site.id,
          label: badge.label,
          variant: badge.variant,
        };
      }),
    },
    {
      rowId: 'communications-azimuth',
      label: 'Earth azimuth from north',
      core: false,
      cells: columns.map((column) => unsignedAngleValue(column, column.conditions.earthAzimuthDeg)),
    },
    {
      rowId: 'communications-range',
      label: 'Earth–Moon range',
      note: 'Centre-to-centre distance',
      core: false,
      cells: columns.map((column) =>
        resultCell(column, column.conditions.rangeKm, (value) => ({
          text: value.toLocaleString(),
          unit: 'km',
        })),
      ),
    },
    {
      rowId: 'communications-light-time',
      label: 'One-way light time',
      note: 'Vacuum light-travel time, d / c — not a command latency budget',
      core: false,
      cells: columns.map((column) =>
        resultCell(column, column.conditions.theoreticalOneWayLightTimeSeconds, (value) => ({
          text: String(value),
          unit: 's',
        })),
      ),
    },
    {
      rowId: 'communications-terrain',
      label: 'Terrain horizon at Earth azimuth',
      core: false,
      cells: columns.map((column) =>
        signedAngleValue(column, column.conditions.localTerrainElevationAtEarthAzimuthDeg),
      ),
    },
  ];
}

function terrainRows(columns: readonly ComparisonColumn[]): MatrixRow[] {
  return [
    {
      rowId: 'terrain-mean-horizon',
      label: 'Mean terrain horizon',
      core: true,
      cells: columns.map((column) =>
        optionalNumberCell(
          column,
          column.site.meanTerrainHorizonDeg,
          (value) => ({ text: signedAngleCell({ kind: 'available', value, unit: '°' }) }),
          'No horizon-mask summary is registered for this site.',
        ),
      ),
    },
    {
      rowId: 'terrain-obstruction',
      label: 'Maximum terrain obstruction',
      core: true,
      cells: columns.map((column) =>
        optionalNumberCell(
          column,
          column.site.maxTerrainObstructionDeg,
          (value) => ({ text: signedAngleCell({ kind: 'available', value, unit: '°' }) }),
          'No obstruction maximum is registered for this site.',
        ),
      ),
    },
    {
      rowId: 'terrain-model',
      label: 'Terrain model',
      core: false,
      cells: columns.map((column) => textCell(column, column.conditions.provenance.terrainSource)),
    },
    {
      rowId: 'terrain-resolution',
      label: 'DEM data resolution',
      core: false,
      cells: columns.map((column) =>
        column.site.coverageStatus
          ? textCell(column, column.site.coverageStatus)
          : unavailableCell(column, 'No DEM resolution statement is registered for this site.'),
      ),
    },
  ];
}

function uncertaintyRows(columns: readonly ComparisonColumn[]): MatrixRow[] {
  return [
    {
      rowId: 'uncertainty-coverage',
      label: 'Results reported unavailable',
      note: `Of the ${NINE_GEOMETRY_RESULTS} geometry results this matrix prints`,
      core: true,
      cells: columns.map((column) => {
        const missing = geometryResults(column).filter((result) => result.kind !== 'available');
        return textCell(
          column,
          `${missing.length} of ${NINE_GEOMETRY_RESULTS}`,
          missing.length === 0 ? undefined : 'primary',
        );
      }),
    },
    {
      rowId: 'uncertainty-validation',
      label: 'Validation state',
      core: true,
      cells: columns.map((column) => {
        const state = column.conditions.provenance.validationState;
        const variant: BadgeVariant =
          state === 'passed' ? 'success' : state === 'failed' ? 'danger' : 'warning';
        return {
          kind: 'state' as const,
          columnId: column.site.id,
          label: state === 'not-assessed' ? 'Not assessed' : state.toUpperCase(),
          variant,
        };
      }),
    },
    {
      rowId: 'uncertainty-ephemeris',
      label: 'Ephemeris model',
      core: false,
      cells: columns.map((column) => textCell(column, column.conditions.provenance.ephemerisSource)),
    },
    {
      rowId: 'uncertainty-mode',
      label: 'Calculation path',
      core: false,
      cells: columns.map((column) =>
        textCell(
          column,
          `${column.conditions.provenance.calculationMode} · ${column.conditions.provenance.coordinateSystem}`,
        ),
      ),
    },
    {
      rowId: 'uncertainty-benchmark',
      label: 'Validation benchmark',
      core: false,
      cells: columns.map((column) =>
        column.conditions.provenance.validationBenchmarkNote
          ? textCell(column, column.conditions.provenance.validationBenchmarkNote)
          : unavailableCell(column, 'No benchmark note was recorded for this run.'),
      ),
    },
    {
      rowId: 'uncertainty-demo',
      label: 'Data class',
      note: 'Demonstration values are labelled, never presented as measured',
      core: false,
      cells: columns.map((column) =>
        textCell(column, column.conditions.provenance.isDemoData ? 'Demonstration value' : 'Computed from the model'),
      ),
    },
  ];
}

function operationsRows(columns: readonly ComparisonColumn[], options: MatrixOptions): MatrixRow[] {
  return [
    {
      rowId: 'operations-target',
      label: 'Mission target',
      core: true,
      cells: columns.map((column) =>
        column.site.id === options.primarySiteId
          ? {
              kind: 'state' as const,
              columnId: column.site.id,
              label: 'Primary target',
              variant: 'selected' as const,
            }
          : {
              kind: 'action' as const,
              columnId: column.site.id,
              actionId: 'set-primary' as const,
              label: 'Use as mission target',
            },
      ),
    },
    {
      rowId: 'operations-inspect',
      label: 'Inspect',
      core: true,
      cells: columns.map((column) => ({
        kind: 'action' as const,
        columnId: column.site.id,
        actionId: 'inspect' as const,
        label: 'Open in Explore',
      })),
    },
    {
      rowId: 'operations-slot',
      label: 'Comparison column',
      core: true,
      cells: columns.map((column) => ({
        kind: 'action' as const,
        columnId: column.site.id,
        actionId: 'remove' as const,
        label: 'Remove',
        disabledReason: options.canRemoveSite
          ? undefined
          : 'A comparison keeps at least one column; add another candidate first.',
      })),
    },
    {
      rowId: 'operations-context',
      label: 'Mission context',
      core: false,
      cells: columns.map((column) =>
        column.site.missionContextNote
          ? textCell(column, column.site.missionContextNote)
          : unavailableCell(column, 'This entry carries no mission-context note.'),
      ),
    },
    {
      rowId: 'operations-reference',
      label: 'Catalogue provenance',
      core: false,
      cells: columns.map((column) =>
        column.site.sourceCatalog === undefined
          ? unavailableCell(column, 'No source catalogue is recorded for this entry.')
          : textCell(column, `${column.site.sourceCatalog} · ${column.site.catalogVersion ?? 'version unstated'}`),
      ),
    },
  ];
}

/** The six groups, in reading order, for one epoch and one cohort of columns. */
export function buildMatrixSections(
  columns: readonly ComparisonColumn[],
  options: MatrixOptions,
): MatrixSection[] {
  return [
    {
      sectionId: 'location',
      title: 'Location',
      purpose: 'Where the candidate physically is, and the catalogue record it comes from.',
      rows: locationRows(columns),
    },
    {
      sectionId: 'illumination',
      title: 'Illumination',
      purpose: 'Whether the Sun clears this site’s own horizon at the shared epoch.',
      caveat:
        'Geometric sunlight only: a visible disk is not irradiance-weighted insolation and is not generated electrical power.',
      rows: illuminationRows(columns),
    },
    {
      sectionId: 'communications',
      title: 'Communications',
      purpose: 'Whether Earth clears this site’s own horizon at the shared epoch.',
      caveat:
        'Geometric line-of-sight only: it is not an RF link closure and does not guarantee a data rate or a relay link.',
      rows: communicationsRows(columns),
    },
    {
      sectionId: 'terrain',
      title: 'Terrain',
      purpose: 'The skyline the site sits behind, and the terrain product that resolves it.',
      rows: terrainRows(columns),
    },
    {
      sectionId: 'uncertainty',
      title: 'Uncertainty',
      purpose: 'What these numbers rest on: model, resolution, validation state and data class.',
      caveat:
        'Dispersion and sensitivity brackets are reported per candidate in the trade-study funnel’s decision trace; this epoch-instant matrix carries none.',
      rows: uncertaintyRows(columns),
    },
    {
      sectionId: 'operations',
      title: 'Operations',
      purpose: 'What can be done with each column: promote it, inspect it, or drop it.',
      rows: operationsRows(columns, options),
    },
  ];
}

/** Rows a group shows before its detail is expanded. */
export function coreRows(section: MatrixSection): MatrixRow[] {
  return section.rows.filter((row) => row.core);
}

export function detailRows(section: MatrixSection): MatrixRow[] {
  return section.rows.filter((row) => !row.core);
}

/** `2 of 7 shown` — how much of the group the collapsed state is hiding. */
export function rowVisibilityLabel(section: MatrixSection): string {
  return `${coreRows(section).length} of ${section.rows.length} shown`;
}

/** The id of the row-level detail container a group's toggle controls. */
export function detailRowIds(section: MatrixSection): string[] {
  return detailRows(section).map((row) => `${row.rowId}-row`);
}
