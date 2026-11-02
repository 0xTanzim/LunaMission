import { describe, it, expect } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ApolloSeismicDrawer, APOLLO_SEISMIC_STATIONS } from '../src/features/geology/ApolloSeismicDrawer';

describe('ApolloSeismicDrawer Component (IRIS / ALSEP Seismic Layer)', () => {
  it('returns null when closed', () => {
    const html = renderToStaticMarkup(
      <ApolloSeismicDrawer isOpen={false} onClose={() => {}} />,
    );
    expect(html).toBe('');
  });

  it('renders modal dialog with station records, DOI, and citations when open', () => {
    const html = renderToStaticMarkup(
      <ApolloSeismicDrawer isOpen={true} onClose={() => {}} />,
    );

    // WCAG dialog attributes
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('data-testid="apollo-seismic-drawer"');

    // IRIS ALSEP Network metadata
    expect(html).toContain('10.7914/SN/XA_1969');
    expect(html).toContain('Apollo Passive Seismic Experiment');

    // 5 historical stations
    expect(APOLLO_SEISMIC_STATIONS.length).toBe(5);
    for (const station of APOLLO_SEISMIC_STATIONS) {
      expect(html).toContain(station.stationCode);
      expect(html).toContain(station.mission);
    }

    // Seismic classifications
    expect(html).toContain('Deep Moonquakes');
    expect(html).toContain('Shallow Moonquakes');
    expect(html).toContain('Artificial Impacts');

    // Scientific citations
    expect(html).toContain('Watters et al., 2024');
    expect(html).toContain('Nunn et al., 2022');

    // Epistemic boundary notice
    expect(html).toContain('All historical Apollo seismic stations were situated on the nearside');
  });
});
