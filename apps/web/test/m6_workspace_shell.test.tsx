import { describe, it, expect } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScenarioProvider } from '../src/app/scenario/ScenarioProvider';
import { GlobalScenarioProvider } from '../src/app/state/GlobalScenarioContext';
import { ProjectionSwitcher } from '../src/features/workspace/ProjectionSwitcher';
import { ScenarioConfigBar } from '../src/features/workspace/ScenarioConfigBar';
import { MissionWorkspaceShell } from '../src/features/workspace/MissionWorkspaceShell';

describe('Milestone M6: Workspace Shell & Controls', () => {
  it('renders ProjectionSwitcher with role="tablist" and 3 workspace projections', () => {
    const html = renderToStaticMarkup(
      <GlobalScenarioProvider>
        <ProjectionSwitcher />
      </GlobalScenarioProvider>,
    );

    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-label="Mission Workspace Projections"');
    expect(html).toContain('data-testid="projection-tab-explore"');
    expect(html).toContain('data-testid="projection-tab-analyze"');
    expect(html).toContain('data-testid="projection-tab-compare"');
    expect(html).toContain('1. EXPLORE');
    expect(html).toContain('2. ANALYZE');
    expect(html).toContain('3. COMPARE');
    expect(html).toContain('[⌥1]');
    expect(html).toContain('[⌥2]');
    expect(html).toContain('[⌥3]');
  });

  it('renders ScenarioConfigBar with target site, dates, mast height, and launch slip', () => {
    const html = renderToStaticMarkup(
      <GlobalScenarioProvider>
        <ScenarioConfigBar />
      </GlobalScenarioProvider>,
    );

    expect(html).toContain('role="toolbar"');
    expect(html).toContain('data-testid="scenario-site-select"');
    expect(html).toContain('data-testid="scenario-start-date"');
    expect(html).toContain('data-testid="duration-7d"');
    expect(html).toContain('data-testid="duration-14d"');
    expect(html).toContain('data-testid="duration-21d"');
    expect(html).toContain('data-testid="duration-28d"');
    expect(html).toContain('data-testid="mast-1m"');
    expect(html).toContain('data-testid="mast-2m"');
    expect(html).toContain('data-testid="mast-5m"');
    expect(html).toContain('data-testid="mast-10m"');
    expect(html).toContain('data-testid="scenario-slip-slider"');
  });

  it('enforces touch hit targets >= 32px on interactive slider and mast buttons', () => {
    const html = renderToStaticMarkup(
      <GlobalScenarioProvider>
        <ScenarioConfigBar />
      </GlobalScenarioProvider>,
    );

    // Mast buttons have min-h-[32px]
    expect(html).toContain('min-h-[32px]');
    expect(html).toContain('min-w-[32px]');
  });

  it('renders Export Dossier trigger affordance in ScenarioConfigBar', () => {
    const html = renderToStaticMarkup(
      <GlobalScenarioProvider>
        <ScenarioConfigBar onOpenDossier={() => {}} />
      </GlobalScenarioProvider>,
    );

    expect(html).toContain('data-testid="scenario-export-dossier"');
    expect(html).toContain('Dossier');
  });

  it('renders MissionWorkspaceShell with top bar, config bar, and active projection', () => {
    const html = renderToStaticMarkup(
      <ScenarioProvider>
        <GlobalScenarioProvider>
          <MissionWorkspaceShell />
        </GlobalScenarioProvider>
      </ScenarioProvider>,
    );

    expect(html).toContain('data-testid="mission-workspace-shell"');
    expect(html).toContain('data-testid="projection-analyze"');
    expect(html).toContain('LUNA');
    expect(html).toContain('MISSION');
    expect(html).toContain('LunaMission Flight Deck');
    expect(html).toContain('NASA JPL Horizons');
  });
});
