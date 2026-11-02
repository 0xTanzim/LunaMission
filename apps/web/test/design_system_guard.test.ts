/**
 * Design-system guard — Wave 1 of the V2.5 UI modernization.
 *
 * This is a *static source* test, not a rendering test. It exists because the palette and
 * type migration is mechanical and therefore reversible by any future agent who reaches for
 * `text-slate-400` or `text-[9px]` instead of opening `design-tokens.css`. It fails the suite
 * the moment that happens.
 *
 * Three rules, each with its own allow-list:
 *
 *   1. No raw Tailwind palette utility (`slate-400`, `cyan-300`, `border-emerald-800`, …)
 *      outside the data-palette allow-list. Chrome colours come from tokens.
 *   2. No type size below the 11px floor — `text-[8px]`, `text-[9.5px]`, `text-[0.5rem]`,
 *      or an inline `font-size`. Metadata stays compact via colour and weight, not size.
 *   3. No inline hex inside a utility class list (`bg-[#101b2b]`) outside the token file.
 *      Data ramps live in visualization modules, never in a className.
 *
 * `.ts` files are scanned alongside `.tsx`: this codebase keeps shared class strings in
 * `model/*Styles.ts` config modules, and a rule that only policed JSX would not hold.
 */

import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const WEB_ROOT = join(import.meta.dir, '..');
const SRC_ROOT = join(WEB_ROOT, 'src');
const TOKENS_FILE = 'styles/design-tokens.css';

/**
 * Files allowed to contain raw palette classes because those classes *are* data.
 *
 * Every entry is a module whose colours are scientific encoding, not chrome. Widening this
 * list is a design decision, not a convenience: add a reason, and prefer a token.
 */
const DATA_PALETTE_ALLOW_LIST: ReadonlyArray<{ path: string; reason: string }> = [
  {
    path: 'src/features/comparison/components/SiteTradeStudyRadar.tsx',
    reason:
      'Per-candidate SVG series colours. Each entry pairs a `stroke` hex with a `labelClass`; ' +
      'migrating the label class without the hex would desync the legend from the plotted polygon.',
  },
  {
    path: 'src/features/spatial/globe/components/GlobeLegend.tsx',
    reason:
      'Legend swatches that mirror the Three.js scene’s billboard, pin and vector colours owned by ' +
      'globeSiteMarkers.ts / celestialVectorAssets.ts. A token here would stop matching the render.',
  },
  {
    path: 'src/features/spatial/map/components/ScientificMapLegend.tsx',
    reason:
      'Map-legend data encodings: elevation/temperature ramp endpoints, slope-hazard class chips, ' +
      'geology unit swatches. Wave 2a owns hoisting these ramps into a shared ramp module.',
  },
];

const RAW_PALETTE_PATTERN =
  /\b(?:[a-z-]+:)*(?:bg|text|border|border-[lrtbxy]|divide|from|via|to|ring|outline|accent|fill|stroke|shadow)-(?:slate|gray|zinc|cyan|sky|blue|emerald|teal|amber|yellow|orange|red|rose|indigo|purple|lime)-(\d{2,3})\b/;

/** `text-[9px]`, `sm:text-[10.5px]`, `text-[0.625rem]` (10px), inline `font-size: 9px`. */
const SUB_FLOOR_PX_PATTERN = /\btext-\[(\d+(?:\.\d+)?)(px|rem)\]/;
const INLINE_FONT_SIZE_PATTERN = /font-size:\s*(\d+(?:\.\d+)?)(px|rem)/;

/**
 * Text that never passes through a Tailwind class still has to respect the floor:
 * SVG `<text fontSize>`, canvas `ctx.font`, and shared font-size constants. These were
 * 4–10px across the map layers, sky ribbon and horizon charts before Wave 1.
 */
const NON_CLASS_FONT_PATTERNS: ReadonlyArray<RegExp> = [
  /fontSize="(\d+(?:\.\d+)?)"/,
  /fontSize=\{\s*'(\d+(?:\.\d+)?)'/,
  /ctx\.font\s*=\s*[^;]*?'(?:bold\s*)?(\d+(?:\.\d+)?)px/,
  /\b[A-Z][A-Z0-9_]*FONT_SIZE[A-Z0-9_]*\s*=\s*(\d+(?:\.\d+)?);/,
];

const INLINE_HEX_CLASS_PATTERN =
  /\b(?:bg|text|border|from|via|to|ring|outline|fill|stroke|divide|shadow)-\[#[0-9a-fA-F]{3,8}\]/;

const FLOOR_PX = 11;
const FLOOR_REM = 0.6875; // 11px at a 16px root

function toPx(value: number, unit: string): number {
  return unit === 'rem' ? value * 16 : value;
}

function sourceFiles(): string[] {
  const glob = new Bun.Glob('**/*.{ts,tsx}');
  return [...glob.scanSync({ cwd: SRC_ROOT, absolute: true })]
    .filter((file) => !file.endsWith('.d.ts'))
    .map((file) => relative(WEB_ROOT, file))
    .sort();
}

const FILES = sourceFiles();
const ALLOWED = new Set(DATA_PALETTE_ALLOW_LIST.map((entry) => entry.path));
const SCANNED = FILES.filter((file) => !ALLOWED.has(file));

/** Reports `file:line` for every line matching `pattern`, so failures are actionable. */
function violations(files: string[], pattern: RegExp): string[] {
  const hits: string[] = [];
  for (const file of files) {
    const lines = readFileSync(join(WEB_ROOT, file), 'utf8').split('\n');
    lines.forEach((line, index) => {
      const match = line.match(pattern);
      if (match) hits.push(`${file}:${index + 1}  ${match[0]}`);
    });
  }
  return hits;
}

describe('Design system guard', () => {
  it('scans the application source', () => {
    // A silently empty scan would make every other assertion in this file vacuous.
    expect(FILES.length).toBeGreaterThan(150);
  });

  it('allow-list entries all exist (a renamed module must not keep its exemption)', () => {
    for (const entry of DATA_PALETTE_ALLOW_LIST) {
      expect({ path: entry.path, exists: existsSync(join(WEB_ROOT, entry.path)) }).toEqual({
        path: entry.path,
        exists: true,
      });
    }
  });

  it('has no raw palette utility outside the data-palette allow-list', () => {
    const hits = violations(SCANNED, RAW_PALETTE_PATTERN);
    expect(hits.join('\n')).toBe('');
  });

  it('has no text below the 11px floor', () => {
    const hits = [...violations(SCANNED, SUB_FLOOR_PX_PATTERN), ...violations(SCANNED, INLINE_FONT_SIZE_PATTERN)]
      .filter((hit) => {
        const match = hit.match(/(\d+(?:\.\d+)?)(px|rem)/);
        if (!match) return false;
        return toPx(Number(match[1]), match[2]!) < FLOOR_PX;
      })
      .filter((hit) => !hit.includes('design-tokens.css'));
    expect(hits.join('\n')).toBe('');
  });

  it('has no SVG, canvas or constant font size below the 11px floor', () => {
    const hits = NON_CLASS_FONT_PATTERNS.flatMap((pattern) =>
      violations(SCANNED, pattern).filter((hit) => {
        const match = hit.match(/(\d+(?:\.\d+)?)/);
        return match ? Number(match[1]) < FLOOR_PX : false;
      }),
    );
    expect(hits.join('\n')).toBe('');
  });

  it('keeps the floor honest: rem and px spellings are compared in real pixels', () => {
    // Self-check of the assertion above — 0.6875rem is the floor, 0.625rem is a violation.
    expect(toPx(0.6875, 'rem')).toBe(FLOOR_PX);
    expect(toPx(FLOOR_REM, 'rem')).toBeLessThanOrEqual(FLOOR_PX);
    expect(toPx(0.625, 'rem')).toBeLessThan(FLOOR_PX);
    expect(SUB_FLOOR_PX_PATTERN.test('text-[0.625rem]')).toBe(true);
    expect(SUB_FLOOR_PX_PATTERN.test('sm:text-[10px]')).toBe(true);
  });

  it('has no inline hex inside a utility class list', () => {
    const hits = violations(SCANNED, INLINE_HEX_CLASS_PATTERN);
    expect(hits.join('\n')).toBe('');
  });

  it('keeps every colour literal inside the token file', () => {
    // The token file is the only place a hex value may be declared. Scientific data palettes
    // live in allow-listed visualization modules and are exempt by design.
    const withHex = SCANNED.filter((file) => file.endsWith('.css')).filter((file) => file !== TOKENS_FILE);
    expect(withHex).toEqual([]);
  });

  it('declares the full type scale, with micro at the documented floor', () => {
    const tokens = readFileSync(join(SRC_ROOT, TOKENS_FILE), 'utf8');
    const expected: Record<string, string> = {
      '--lm-text-display': '1.75rem',
      '--lm-text-metric': '1.5rem',
      '--lm-text-h2': '1.25rem',
      '--lm-text-h3': '1rem',
      '--lm-text-body': '0.8125rem',
      '--lm-text-label': '0.75rem',
      '--lm-text-micro': '0.6875rem',
    };
    for (const [name, value] of Object.entries(expected)) {
      expect({ name, declared: tokens.includes(`${name}: ${value};`) }).toEqual({ name, declared: true });
    }
  });
});
