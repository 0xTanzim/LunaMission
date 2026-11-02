import { describe, expect, test } from 'bun:test';
import { handleScenario3DLabEscape, Scenario3DLabEscapeState } from '@/features/spatial/lab/Scenario3DLab';
import fs from 'node:fs';
import path from 'node:path';

describe('DEF-11 Regression: Scenario3DLab Escape Key Hierarchy', () => {
  test('Escape key resets horizon camera preset to site', () => {
    let currentPreset = 'horizon';
    let isFullscreen = false;
    let isComparisonOpen = false;

    const state: Scenario3DLabEscapeState = {
      isComparisonOpen,
      setIsComparisonOpen: (v: boolean) => { isComparisonOpen = v; },
      cameraPreset: currentPreset as any,
      setCameraPreset: (p: any) => { currentPreset = p; },
      isFullscreen,
      setIsFullscreen: (v: boolean) => { isFullscreen = v; },
    };

    const handled = handleScenario3DLabEscape(state);
    expect(handled).toBe(true);
    expect(currentPreset).toBe('site');
  });

  test('enforces strict 3-tier Escape hierarchy: Modal -> Camera Preset Reset -> Fullscreen', () => {
    let isComparisonOpen = true;
    let cameraPreset = 'horizon';
    let isFullscreen = true;

    const getState = (): Scenario3DLabEscapeState => ({
      isComparisonOpen,
      setIsComparisonOpen: (v: boolean) => { isComparisonOpen = v; },
      cameraPreset: cameraPreset as any,
      setCameraPreset: (p: any) => { cameraPreset = p; },
      isFullscreen,
      setIsFullscreen: (v: boolean) => { isFullscreen = v; },
    });

    // Step 1: Closes Comparison Modal
    expect(handleScenario3DLabEscape(getState())).toBe(true);
    expect(isComparisonOpen).toBe(false);
    expect(cameraPreset).toBe('horizon');
    expect(isFullscreen).toBe(true);

    // Step 2: Resets Horizon View back to Site View
    expect(handleScenario3DLabEscape(getState())).toBe(true);
    expect(isComparisonOpen).toBe(false);
    expect(cameraPreset).toBe('site');
    expect(isFullscreen).toBe(true);

    // Step 3: Exits Fullscreen
    expect(handleScenario3DLabEscape(getState())).toBe(true);
    expect(isComparisonOpen).toBe(false);
    expect(cameraPreset).toBe('site');
    expect(isFullscreen).toBe(false);

    // Step 4: Unhandled when no transient states active
    expect(handleScenario3DLabEscape(getState())).toBe(false);
  });

  test('Fortune 100 Hard Ceiling: Scenario3DLab.tsx must be strictly <= 200 lines', () => {
    const labPath = path.resolve(process.cwd(), 'apps/web/src/features/spatial/lab/Scenario3DLab.tsx');
    const content = fs.readFileSync(labPath, 'utf-8');
    const lineCount = content.split('\n').length;

    // Hard ceiling for UI components: <= 200 lines
    expect(lineCount).toBeLessThanOrEqual(200);
  });
});
