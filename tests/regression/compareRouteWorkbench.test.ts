import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import App from '@/app/App';
import { ScenarioProvider } from '@/app/scenario/ScenarioProvider';

describe('DEF-04: Compare Route Candidate Site Decision Workbench Integration (compareRouteWorkbench.test.ts)', () => {
  const appPath = path.resolve(process.cwd(), 'apps/web/src/app/App.tsx');
  let originalWindow: any;

  beforeEach(() => {
    originalWindow = globalThis.window;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  test('App.tsx strictly complies with Fortune 100 UI component line ceiling (<= 200 lines)', () => {
    const source = fs.readFileSync(appPath, 'utf8');
    const lineCount = source.split('\n').length;
    expect(lineCount).toBeLessThanOrEqual(200);
  });

  test('App mounts MissionWorkspaceShell in compare projection on /compare per Decision D-07', () => {
    // Simulate browser navigation to /compare
    globalThis.window = {
      location: {
        pathname: '/compare',
        search: '',
        hash: '',
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    } as any;

    const html = renderToString(
      React.createElement(
        ScenarioProvider,
        null,
        React.createElement(App)
      )
    );

    // Cockpit workspace shell
    expect(html).toContain('data-testid="mission-workspace-shell"');
    // Compare projection viewport
    expect(html).toContain('data-testid="projection-compare"');
    // Three-Tiered Multi-Site Filtering Pipeline indicator
    expect(html).toContain('Evaluating Multi-Site Three-Tiered Filtering Pipeline');
  });
});

