export interface OnboardingTourStep {
  id: string;
  targetSelector: string;
  projection?: 'explore' | 'analyze' | 'compare';
  title: string;
  description: string;
  badge: string;
  placement: 'bottom' | 'top' | 'left' | 'right';
}

export const ONBOARDING_TOUR_STEPS: OnboardingTourStep[] = [
  {
    id: 'scenario-bar',
    targetSelector: '[data-testid="scenario-config-bar"]',
    projection: 'explore',
    title: '1. Mission Scenario Configuration',
    description:
      'Define your operational conditions: select from 17 Artemis polar candidate regions, configure UTC mission epoch dates, choose observation mast height (1m–10m or 2m EVA astronaut eye-level), and evaluate launch slip margins.',
    badge: 'MISSION INPUTS',
    placement: 'bottom',
  },
  {
    id: 'site-map',
    targetSelector: '[data-testid="nav-link-explore"]',
    projection: 'explore',
    title: '2. Polar Spatial Workspace',
    description:
      'Inspect the native 83°S–90°S polar stereographic projection. Toggle crater rims, graticule grid, and Permanently Shadowed Regions (PSR), and open the Geodesic Point Passport to evaluate terrain slopes.',
    badge: 'SPATIAL MAPPING',
    placement: 'bottom',
  },
  {
    id: 'analyze-horizon',
    targetSelector: '[data-testid="analyze-visual-helper"]',
    projection: 'analyze',
    title: '3. 360° Sky-Ribbon Horizon',
    description:
      'Examine topocentric line-of-sight across 360° azimuth. Read real LOLA topographic ridge silhouettes, grazing solar disk transitions, and Earth optical libration curves with the canonical playhead scrubber.',
    badge: 'HORIZON OCCLUSION',
    placement: 'bottom',
  },
  {
    id: 'compare-funnel',
    targetSelector: '[data-testid="compare-visual-helper"]',
    projection: 'compare',
    title: '4. Multi-Site Decision Funnel',
    description:
      'Filter candidates through the 3-Tier Funnel: eliminate sites violating vehicle shadow/slope limits, rank by continuous sunlight hours, and inspect multi-attribute spider radar trade-offs.',
    badge: 'TRADE STUDIES',
    placement: 'bottom',
  },
  {
    id: 'spatial-instruments',
    targetSelector: '[data-testid="nav-link-lab"]',
    title: '5. 3D Planetary Theater & Cesium',
    description:
      'Access interactive 3D simulations: inspect real-time solar terminator shadows on the 3D Moon sphere and photorealistic 3D crater terrain in the Cesium Ion environment.',
    badge: '3D INSTRUMENTS',
    placement: 'bottom',
  },
  {
    id: 'export-dossier',
    targetSelector: '[data-testid="scenario-export-dossier"]',
    title: '6. Official Mission Dossier Export',
    description:
      'Generate a formal, publication-ready mission planning dossier with complete data provenance, solar visibility statistics, and Earth line-of-sight certificates in 1 click.',
    badge: 'FLIGHT REPORT',
    placement: 'left',
  },
];
