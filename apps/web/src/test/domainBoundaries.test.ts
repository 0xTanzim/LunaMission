import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

describe('Fortune 100 Architectural Quality Ceilings & Domain Boundaries (Task 3.3)', () => {
  const srcRoot = path.resolve(process.cwd(), 'src');
  const serverRoot = path.resolve(process.cwd(), 'server/src');

  function scanFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') return [];
        return scanFiles(full);
      }
      return [full];
    });
  }

  function countLines(filePath: string): number {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  }

  test('UI components stay strictly at or below 200 lines (hard cap)', () => {
    const allFiles = scanFiles(srcRoot);
    const uiComponents = allFiles.filter(
      (f) =>
        f.endsWith('.tsx') &&
        !f.includes('__tests__') &&
        !f.endsWith('.test.tsx')
    );

    const violations = uiComponents
      .map((f) => ({ file: path.relative(process.cwd(), f), lines: countLines(f) }))
      .filter((v) => v.lines > 200);

    expect(violations).toEqual([]);
  });

  test('React hooks stay strictly at or below 150 lines (hard cap)', () => {
    const allFiles = scanFiles(srcRoot);
    const hooks = allFiles.filter(
      (f) =>
        (f.includes('/hooks/') || path.basename(f).startsWith('use')) &&
        (f.endsWith('.ts') || f.endsWith('.tsx')) &&
        !f.includes('__tests__') &&
        !f.endsWith('.test.ts') &&
        !f.endsWith('.test.tsx')
    );

    const violations = hooks
      .map((f) => ({ file: path.relative(process.cwd(), f), lines: countLines(f) }))
      .filter((v) => v.lines > 150);

    expect(violations).toEqual([]);
  });

  test('Domain modules stay strictly at or below 300 lines (hard cap)', () => {
    const domainFiles = scanFiles(path.join(srcRoot, 'domain')).filter(
      (f) =>
        f.endsWith('.ts') &&
        !f.includes('__tests__') &&
        !f.endsWith('.test.ts')
    );

    const violations = domainFiles
      .map((f) => ({ file: path.relative(process.cwd(), f), lines: countLines(f) }))
      .filter((v) => v.lines > 300);

    expect(violations).toEqual([]);
  });

  test('Server route handlers stay strictly at or below 120 lines (hard cap)', () => {
    const routeFiles = scanFiles(path.join(serverRoot, 'routes')).filter(
      (f) =>
        f.endsWith('.ts') &&
        !f.includes('__tests__') &&
        !f.endsWith('.test.ts')
    );

    const violations = routeFiles
      .map((f) => ({ file: path.relative(process.cwd(), f), lines: countLines(f) }))
      .filter((v) => v.lines > 120);

    expect(violations).toEqual([]);
  });

  test('Cross-feature imports strictly use public ui/ directory exports', () => {
    const featuresDir = path.join(srcRoot, 'features');
    if (!fs.existsSync(featuresDir)) return;

    const featureDirs = fs.readdirSync(featuresDir, { withFileTypes: true }).filter((d) => d.isDirectory());
    const violations: string[] = [];

    for (const feat of featureDirs) {
      const featFiles = scanFiles(path.join(featuresDir, feat.name)).filter(
        (f) => (f.endsWith('.ts') || f.endsWith('.tsx')) && !f.includes('__tests__')
      );

      for (const file of featFiles) {
        const text = fs.readFileSync(file, 'utf8');
        const imports = [...text.matchAll(/(?:from\s+|import\s+)['"]([^'"]+)['"]/g)].map((m) => m[1]);
        for (const spec of imports) {
          const match = /^@\/features\/([^/]+)\/(.+)$/.exec(spec);
          if (match && match[1] !== feat.name && !match[2].startsWith('ui/')) {
            violations.push(`${path.relative(process.cwd(), file)} imports ${spec}`);
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
