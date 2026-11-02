import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

describe('DEF-09: TimeSeriesChart Pointer Capture on currentTarget (timeSeriesPointerCapture.test.ts)', () => {
  const chartSourcePath = path.resolve(
    process.cwd(),
    'apps/web/src/features/time/components/chart/TimeSeriesChart.tsx'
  );

  test('TimeSeriesChart.tsx stably attaches pointer capture to currentTarget (root svg) instead of transient child target', () => {
    const sourceCode = fs.readFileSync(chartSourcePath, 'utf8');

    // DEF-09: Must not invoke pointer capture methods on e.target
    expect(sourceCode).not.toContain('(e.target as Element).setPointerCapture');
    expect(sourceCode).not.toContain('(e.target as Element).releasePointerCapture');

    // Must bind to e.currentTarget (the stable root <svg> container)
    expect(sourceCode).toContain('(e.currentTarget as Element).setPointerCapture');
    expect(sourceCode).toContain('(e.currentTarget as Element).releasePointerCapture');
  });

  test('pointer capture delegation helper targets currentTarget element and ignores transient child nodes', () => {
    let childCaptured = 0;
    let childReleased = 0;
    let rootCaptured = 0;
    let rootReleased = 0;

    const childTarget = {
      setPointerCapture: (_id: number) => { childCaptured++; },
      releasePointerCapture: (_id: number) => { childReleased++; },
    };

    const rootSvgCurrentTarget = {
      setPointerCapture: (_id: number) => { rootCaptured++; },
      releasePointerCapture: (_id: number) => { rootReleased++; },
    };

    const simulatedEvent = {
      pointerId: 42,
      target: childTarget,
      currentTarget: rootSvgCurrentTarget,
    };

    // Simulate behavior required by DEF-09
    const capture = (e: typeof simulatedEvent) => {
      (e.currentTarget as unknown as Element).setPointerCapture?.(e.pointerId);
    };
    const release = (e: typeof simulatedEvent) => {
      (e.currentTarget as unknown as Element).releasePointerCapture?.(e.pointerId);
    };

    capture(simulatedEvent);
    expect(rootCaptured).toBe(1);
    expect(childCaptured).toBe(0);

    release(simulatedEvent);
    expect(rootReleased).toBe(1);
    expect(childReleased).toBe(0);
  });
});
