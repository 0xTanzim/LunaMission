#!/usr/bin/env bun
/**
 * Wave 1 design-system codemod — LunaMission UI modernization.
 *
 * Replaces raw Tailwind palette utilities and sub-11px type classes with the semantic
 * tokens declared in `apps/web/src/styles/design-tokens.css`. It is *idempotent*: after a
 * successful run it reports zero changes, so it doubles as the written record of how each
 * legacy class was interpreted. Keep it in the repo — the guard test
 * (`apps/web/test/design_system_guard.test.ts`) enforces that nothing creeps back.
 *
 *   bun run tooling/migrate-design-tokens.ts --dry-run   # report what would change
 *   bun run tooling/migrate-design-tokens.ts             # apply
 *
 * Mapping policy (see docs/ui/DESIGN_SYSTEM.md §3):
 *
 *   neutrals   slate / gray / zinc     → canvas · surface · surface-strong · border ·
 *                                        border-subtle · border-strong · text-primary ·
 *                                        text-secondary · text-muted
 *   info       cyan / sky / blue       → --lm-color-info
 *   success    emerald / teal / lime   → --lm-color-success
 *   warning    amber / yellow / orange → --lm-color-warning
 *   danger     rose / red              → --lm-color-danger
 *   series-b   indigo                  → --lm-color-series-b  (second compared-candidate id;
 *                                        matches #818cf8 already used by map pins and globe
 *                                        markers, so chart↔legend correspondence survives)
 *   demo       purple                  → --lm-color-data-demo
 *
 * Shade bands pick the role variant so a tint stays a tint and a solid fill stays solid:
 *   ≥900 → -surface, 700–800 → -fill, 500–600 → base colour when an opacity modifier is
 *   present else -fill, ≤400 → base colour. Borders use -border for shades ≥500.
 *
 * Two classes are deliberately left alone:
 *   `print:` variants (paper is white with black ink, not the cockpit palette) and the
 *   files in DATA_PALETTE_ALLOW_LIST (palette roles that encode scientific data).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const SOURCE_ROOT = 'apps/web/src';
const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Files whose palette utilities encode *scientific data*, not chrome. Each entry is
 * justified in docs/ui/DESIGN_SYSTEM.md §4 and mirrored by the guard test's allow-list.
 */
const DATA_PALETTE_ALLOW_LIST = [
  // Per-candidate SVG series colours: `stroke` hex and `labelClass` must stay in lockstep.
  'apps/web/src/features/comparison/components/SiteTradeStudyRadar.tsx',
  'apps/web/src/features/comparison/components/spiderChartMetrics.ts',
  // Legend swatches mirroring the 3D scene's billboard/vector colours (globe renderer owns them).
  'apps/web/src/features/spatial/globe/components/GlobeLegend.tsx',
  // Map legend: ramp endpoints, slope-hazard classes, geology unit swatches.
  'apps/web/src/features/spatial/map/components/ScientificMapLegend.tsx',
];

const NEUTRAL_FAMILIES = ['slate', 'gray', 'zinc'];
const SEMANTIC_ROLES: Record<string, string> = {
  cyan: 'info',
  sky: 'info',
  blue: 'info',
  emerald: 'success',
  teal: 'success',
  lime: 'success',
  amber: 'warning',
  yellow: 'warning',
  orange: 'warning',
  rose: 'danger',
  red: 'danger',
  indigo: 'series-b',
  purple: 'data-demo',
};

const UTILITIES = [
  'bg',
  'text',
  'border',
  'border-l',
  'border-r',
  'border-t',
  'border-b',
  'border-x',
  'border-y',
  'divide',
  'fill',
  'stroke',
  'from',
  'via',
  'to',
  'ring',
  'outline',
  'accent',
  'shadow',
];

// Longest-first so `border-l` wins over `border`.
const UTILITY_ALTERNATION = [...UTILITIES].sort((a, b) => b.length - a.length).join('|');
const FAMILY_ALTERNATION = [...NEUTRAL_FAMILIES, ...Object.keys(SEMANTIC_ROLES), 'white', 'black'].join('|');

interface Change {
  rule: string;
  from: string;
  to: string;
  file: string;
  line: number;
}

const changes: Change[] = [];
const skipped: Array<{ token: string; file: string; reason: string }> = [];

function token(name: string, kind: string, opacity?: string): string {
  return `${kind}-[var(--lm-color-${name})]${opacity ? `/${opacity}` : ''}`;
}

/** Neutral (slate/gray/zinc) mapping — the surface + text hierarchy. */
function mapNeutral(kind: string, shade: number, opacity?: string): string {
  switch (kind) {
    case 'text':
    case 'fill':
    case 'stroke': {
      if (kind === 'text' && shade >= 900) return token('canvas', kind, opacity);
      if (shade <= 150) return token('text-primary', kind, opacity);
      if (shade <= 350) return token('text-secondary', kind, opacity);
      return token('text-muted', kind, opacity);
    }
    case 'bg':
    case 'from':
    case 'via':
    case 'to': {
      const name =
        shade >= 950 ? 'canvas' : shade >= 900 ? 'surface' : shade >= 700 ? 'surface-strong' : 'border-strong';
      return token(name, kind, name === 'border-strong' ? undefined : opacity);
    }
    case 'border':
    case 'border-l':
    case 'border-r':
    case 'border-t':
    case 'border-b':
    case 'border-x':
    case 'border-y':
    case 'divide': {
      const name = shade >= 800 ? 'border-subtle' : shade >= 700 ? 'border' : 'border-strong';
      return token(name, kind, name === 'border-strong' ? undefined : opacity);
    }
    case 'ring':
    case 'outline':
      return token('focus', kind, opacity);
    case 'accent':
      return token('focus', kind);
    case 'shadow':
      return token('canvas', kind);
    default:
      return token('border', kind);
  }
}

/** Semantic (status/series) mapping — one role per family, five variants per role. */
function mapSemantic(kind: string, role: string, shade: number, opacity?: string, isStateVariant = false): string {
  switch (kind) {
    case 'text':
    case 'fill':
    case 'stroke':
      return token(role, kind, opacity);
    case 'bg':
    case 'from':
    case 'via':
    case 'to': {
      // A hover on a tinted block deepens the tint; it must not leap to a solid fill.
      if (isStateVariant && shade >= 800) return token(`${role}-surface-strong`, kind);
      // Tints keep a two-step intensity scale: a ≥50% legacy alpha was the "denser" tint
      // (e.g. a gold rank badge next to a fainter bronze one), so it maps to -surface-strong.
      if (shade >= 900) return token(opacity && Number(opacity) >= 50 ? `${role}-surface-strong` : `${role}-surface`, kind);
      // A hovered/active solid control moves one step lighter instead of jumping to a
      // bright fill that would strand its light text at ~1.4:1.
      if (isStateVariant && shade >= 500) return token(`${role}-fill-hover`, kind);
      if (shade >= 600) return token(`${role}-fill`, kind);
      if (shade >= 500) return opacity ? token(role, kind, opacity) : token(role, kind);
      return token(role, kind, opacity);
    }
    case 'border':
    case 'border-l':
    case 'border-r':
    case 'border-t':
    case 'border-b':
    case 'border-x':
    case 'border-y':
    case 'divide': {
      if (shade >= 700) return token(`${role}-border`, kind);
      if (shade >= 500) return opacity ? token(role, kind, opacity) : token(`${role}-border`, kind);
      return token(role, kind, opacity);
    }
    case 'ring':
      return token(role, kind, opacity);
    case 'outline':
    case 'accent':
      return token(role, kind);
    case 'shadow':
      return token(`${role}-fill`, kind);
    default:
      return token(role, kind);
  }
}

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i += 1) if (text.charCodeAt(i) === 10) line += 1;
  return line;
}

/** 1. Type floor: any explicit text size below 11px becomes 11px. */
const SUB_FLOOR_PX = /\b((?:[a-z-]+:)*)text-\[(\d+(?:\.\d+)?)px\]/g;

function applyTypeFloor(text: string, file: string): string {
  return text.replace(SUB_FLOOR_PX, (match: string, prefix: string, size: string, offset: number) => {
    if (Number(size) >= 11) return match;
    const replacement = `${prefix}text-[11px]`;
    changes.push({ rule: 'type-floor', from: match, to: replacement, file, line: lineOf(text, offset) });
    return replacement;
  });
}

/** 2. Palette utilities → semantic tokens. */
const PALETTE_CLASS = new RegExp(
  String.raw`\b((?:[a-z-]+:)*)(${UTILITY_ALTERNATION})-(${FAMILY_ALTERNATION})(?:-(\d{2,3}))?(\/\d{1,3})?\b`,
  'g',
);

function applyPalette(text: string, file: string): string {
  return text.replace(
    PALETTE_CLASS,
    (match: string, prefix: string, kind: string, family: string, shade?: string, slashOpacity?: string, offset = 0) => {
      // Print media is paper: black ink on white stock. The dark cockpit palette is wrong there.
      if (prefix.includes('print:')) {
        skipped.push({ token: match, file, reason: 'print media — paper ink/stock, not cockpit palette' });
        return match;
      }

      const opacity = slashOpacity ? slashOpacity.slice(1) : undefined;

      if (family === 'white' || family === 'black') {
        if (shade) return match; // e.g. `bg-white-500` is not a Tailwind class
        const replacement = prefix + token(family === 'white' ? 'text-primary' : 'canvas', kind, opacity);
        changes.push({ rule: 'white-black', from: match, to: replacement, file, line: lineOf(text, offset) });
        return replacement;
      }

      if (!shade) return match;
      const value = Number(shade);
      // `hover:bg-cyan-600` needs a different token from `bg-cyan-600` — a hovered solid
      // control moves one step lighter rather than jumping to a bright accent fill.
      const isStateVariant = /(?:^|:)(?:hover|active|group-hover|focus|focus-within):$/.test(prefix);
      const mapped = NEUTRAL_FAMILIES.includes(family)
        ? mapNeutral(kind, value, opacity)
        : mapSemantic(kind, SEMANTIC_ROLES[family]!, value, opacity, isStateVariant);
      // The variant prefix (`hover:`, `focus-visible:`, `sm:`…) must survive the rewrite.
      const replacement = prefix + mapped;
      changes.push({ rule: 'palette', from: match, to: replacement, file, line: lineOf(text, offset) });
      return replacement;
    },
  );
}

/** 3. Report (never silently rewrite) remaining inline hex inside class lists. */
const INLINE_HEX_CLASS = /\b(?:bg|text|border|from|via|to|fill|stroke)-\[#[0-9a-fA-F]{3,8}\]/g;

const allFiles = execSync(`find ${SOURCE_ROOT} -type f \\( -name '*.tsx' -o -name '*.ts' \\)`, { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter((f) => !f.endsWith('.d.ts'));

let touched = 0;
const hexReport: string[] = [];

for (const file of allFiles) {
  const original = readFileSync(file, 'utf8');
  const before = changes.length;

  // The 11px floor is unconditional: a data-palette module may keep a scientific ramp,
  // but it may not render 9px axis text. Only the *palette* mapping respects the allow-list.
  let next = applyTypeFloor(original, file);
  if (!DATA_PALETTE_ALLOW_LIST.includes(file)) {
    next = applyPalette(next, file);
    for (const hex of original.match(INLINE_HEX_CLASS) ?? []) hexReport.push(`${file}: ${hex}`);
  }

  if (changes.length > before) touched += 1;
  if (next !== original && !DRY_RUN) writeFileSync(file, next);
}

const byRule = new Map<string, number>();
for (const c of changes) byRule.set(c.rule, (byRule.get(c.rule) ?? 0) + 1);

console.log(`\n${DRY_RUN ? '[dry-run] ' : ''}files scanned: ${allFiles.length}`);
console.log(`files changed: ${touched}`);
console.log(`replacements: ${changes.length}`);
for (const [rule, count] of [...byRule].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${rule.padEnd(14)} ${count}`);
}

if (skipped.length) {
  console.log(`\nskipped (intentional) — ${skipped.length}:`);
  for (const s of skipped) console.log(`  ${s.file}: ${s.token}  — ${s.reason}`);
}

if (hexReport.length) {
  console.log(`\ninline hex inside class lists (${hexReport.length}) — triage manually:`);
  for (const h of [...new Set(hexReport)]) console.log(`  ${h}`);
}
