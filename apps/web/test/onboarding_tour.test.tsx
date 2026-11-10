import { describe, it, expect } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FlightDeckOnboardingTour } from '../src/features/onboarding/FlightDeckOnboardingTour';
import { ONBOARDING_TOUR_STEPS } from '../src/features/onboarding/onboardingTourSteps';

describe('FlightDeckOnboardingTour', () => {
  it('does not render overlay when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <FlightDeckOnboardingTour isOpen={false} onClose={() => {}} />,
    );
    expect(html).toBe('');
  });

  it('renders tour dialog and initial step card when isOpen is true', () => {
    const html = renderToStaticMarkup(
      <FlightDeckOnboardingTour isOpen={true} onClose={() => {}} />,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('data-testid="flight-deck-tour-overlay"');
    expect(html).toContain('data-testid="tour-popover-card"');
    expect(html).toContain('1. Mission Scenario Configuration');
    expect(html).toContain('MISSION INPUTS');
    expect(html).toContain('Step 1 of 6');
    expect(html).toContain('data-testid="tour-next-button"');
    expect(html).toContain('data-testid="tour-prev-button"');
    expect(html).toContain('data-testid="tour-skip-button"');
    expect(html).toContain('Exit Tour [Esc]');
  });

  it('contains all 6 aerospace steps in ONBOARDING_TOUR_STEPS', () => {
    expect(ONBOARDING_TOUR_STEPS.length).toBe(6);
    expect(ONBOARDING_TOUR_STEPS[0].id).toBe('scenario-bar');
    expect(ONBOARDING_TOUR_STEPS[1].id).toBe('site-map');
    expect(ONBOARDING_TOUR_STEPS[2].id).toBe('analyze-horizon');
    expect(ONBOARDING_TOUR_STEPS[3].id).toBe('compare-funnel');
    expect(ONBOARDING_TOUR_STEPS[4].id).toBe('spatial-instruments');
    expect(ONBOARDING_TOUR_STEPS[5].id).toBe('export-dossier');
  });
});
