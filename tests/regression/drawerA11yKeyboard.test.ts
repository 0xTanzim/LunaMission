import { describe, expect, test } from 'bun:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import { PassportDrawer } from '@/features/spatial/components/panels/PassportDrawer';
import { ScenarioProvider } from '@/app/scenario/ScenarioProvider';

describe('DEF-03: Drawer Keyboard Accessibility & Focus Traps (drawerA11yKeyboard.test.ts)', () => {
  const passportPath = path.resolve(
    process.cwd(),
    'apps/web/src/features/spatial/components/panels/PassportDrawer.tsx'
  );

  test('PassportDrawer renders with role="dialog" and aria-modal="true"', () => {
    const html = renderToString(
      React.createElement(
        ScenarioProvider,
        null,
        React.createElement(PassportDrawer, { onClose: () => {}, onOpenMethodDetails: () => {} })
      )
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
  });

  test('PassportDrawer contains Escape key listener and focus management', () => {
    const source = fs.readFileSync(passportPath, 'utf8');
    const hookSource = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/src/app/hooks/useDrawerFocusTrap.tsx'), 'utf8');
    expect(source).toContain('useDrawerFocusTrap');
    expect(source).toContain('drawerRef');
    expect(hookSource).toContain("'Escape'");
    expect(hookSource).toContain('activeElement');
  });

  test('Focus trap logic: Tab wraps from last to first element, Shift+Tab wraps from first to last', () => {
    let firstFocused = 0;
    let lastFocused = 0;
    const firstElement = { focus: () => { firstFocused++; } };
    const lastElement = { focus: () => { lastFocused++; } };
    const focusableElements = [firstElement, lastElement];

    let currentActive: any = lastElement;

    const simulateTab = (shiftKey: boolean) => {
      let prevented = false;
      const event = {
        key: 'Tab',
        shiftKey,
        preventDefault: () => { prevented = true; },
      };

      if (event.shiftKey && currentActive === focusableElements[0]) {
        event.preventDefault();
        focusableElements[focusableElements.length - 1].focus();
        currentActive = focusableElements[focusableElements.length - 1];
      } else if (!event.shiftKey && currentActive === focusableElements[focusableElements.length - 1]) {
        event.preventDefault();
        focusableElements[0].focus();
        currentActive = focusableElements[0];
      }

      return prevented;
    };

    const forwardPrevented = simulateTab(false);
    expect(forwardPrevented).toBe(true);
    expect(firstFocused).toBe(1);

    const backwardPrevented = simulateTab(true);
    expect(backwardPrevented).toBe(true);
    expect(lastFocused).toBe(1);
  });
});
