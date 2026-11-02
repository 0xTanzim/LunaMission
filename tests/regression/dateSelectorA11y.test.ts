import { describe, expect, test } from 'bun:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MissionDateWindowSelector } from '@/features/comparison/components/MissionDateWindowSelector';

describe('DEF-08: MissionDateWindowSelector Accessibility (dateSelectorA11y.test.ts)', () => {
  test('date input has accessible aria-label="Mission comparison reference date"', () => {
    const html = renderToString(
      React.createElement(MissionDateWindowSelector, {
        selectedDate: new Date('2026-10-21T12:00:00Z'),
        durationDays: 14,
        onSelectDate: () => {},
        onSelectDuration: () => {},
      })
    );

    // Axe-core requires form controls to have accessible name
    expect(html).toContain('type="date"');
    expect(html).toContain('aria-label="Mission comparison reference date"');
  });
});
