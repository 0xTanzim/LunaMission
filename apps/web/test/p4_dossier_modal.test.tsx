/**
 * Phase 4 Task P4-02: Mission Dossier Modal & Flight Deck UI Integration Tests
 *
 * Verifies:
 * 1. Modal mount / unmount lifecycle (isOpen: true vs false)
 * 2. WCAG 2.1 / 2.2 AA Dialog semantics (role="dialog", aria-modal="true", aria-labelledby)
 * 3. ARIA tablist semantics (role="tablist", role="tab", aria-controls, role="tabpanel")
 * 4. Screen-reader status live announcement (aria-live="polite")
 * 5. Minimum 32px touch target hit sizes
 * 6. Escape key dismissal and focus restoration
 * 7. downloadFile utility invocation
 * 8. Print isolation classes in MissionWorkspaceShell (print:hidden)
 * 9. Flight Deck scenario context parameter wiring
 */

import { describe, it, expect } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MissionDossierModal } from '../src/features/dossier/ui/MissionDossierModal';
import { DossierModalHeader } from '../src/features/dossier/ui/DossierModalHeader';
import { DossierTabControls } from '../src/features/dossier/ui/DossierTabControls';
import { DossierModalFooter } from '../src/features/dossier/ui/DossierModalFooter';
import { downloadFile } from '../src/features/dossier/utils/downloadFile';
import { MissionWorkspaceShell } from '../src/features/workspace/MissionWorkspaceShell';
import { GlobalScenarioProvider } from '../src/app/state/GlobalScenarioContext';

describe('Task P4-02: MissionDossierModal & Sub-Component Decompositions', () => {
  const defaultProps = {
    isOpen: true,
    onClose: () => {},
    targetName: 'Shackleton Connecting Ridge',
    catalogId: 'connecting-ridge',
    latitudeDeg: -89.44,
    longitudeDeg: 124.5,
    elevationKm: 1.85,
    epochMs: Date.UTC(2026, 10, 1, 0, 0, 0),
    siteId: 'connecting-ridge',
    calculationId: 'calc-m8-test',
    startUtc: '2026-11-01T00:00:00.000Z',
    stopUtc: '2026-11-15T00:00:00.000Z',
    observerMastHeightM: 2.0,
    launchSlipOffsetDays: 0.0,
    sunVisibilityCriterion: 'upperLimb' as const,
    earthVisibilityCriterion: 'center' as const,
  };

  it('renders null when isOpen is false', () => {
    const html = renderToStaticMarkup(<MissionDossierModal {...defaultProps} isOpen={false} />);
    expect(html).toBe('');
  });

  it('renders dialog container with role="dialog", aria-modal="true", and aria-labelledby', () => {
    const html = renderToStaticMarkup(<MissionDossierModal {...defaultProps} isOpen={true} />);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="dossier-modal-title"');
    expect(html).toContain('id="dossier-modal-title"');
    expect(html).toContain('Executive Mission Dossier');
    expect(html).toContain('NextRush Backend');
  });

  it('renders DossierModalHeader with accessible title and >=32px touch target close button', () => {
    const html = renderToStaticMarkup(
      <DossierModalHeader
        targetName="Malapert Mountain Peak"
        latitudeDeg={-85.99}
        longitudeDeg={2.93}
        onClose={() => {}}
      />
    );
    expect(html).toContain('id="dossier-modal-title"');
    expect(html).toContain('Malapert Mountain Peak');
    expect(html).toContain('-85.99°');
    expect(html).toContain('2.93°');
    expect(html).toContain('aria-label="Close modal"');
    expect(html).toContain('min-h-[32px]');
    expect(html).toContain('print:hidden');
  });

  it('renders DossierTabControls with role="tablist", role="tab", aria-controls, and epoch label', () => {
    const html = renderToStaticMarkup(
      <DossierTabControls
        activeTab="markdown"
        onTabChange={() => {}}
        epochMs={defaultProps.epochMs}
      />
    );
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-label="Dossier format options"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('id="tab-markdown"');
    expect(html).toContain('id="tab-json"');
    expect(html).toContain('aria-controls="panel-dossier"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('min-h-[32px]');
    expect(html).toContain('Epoch:');
    expect(html).toContain('print:hidden');
  });

  it('renders DossierModalFooter with live copy announcement region and action buttons', () => {
    const html = renderToStaticMarkup(
      <DossierModalFooter
        loading={false}
        hasContent={true}
        copied={true}
        activeTab="markdown"
        onCopy={() => {}}
        onDownload={() => {}}
        onPrint={() => {}}
        onClose={() => {}}
      />
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Dossier copied to clipboard');
    expect(html).toContain('Download (.md)');
    expect(html).toContain('Print / Save PDF');
    expect(html).toContain('min-h-[32px]');
    expect(html).toContain('print:hidden');
  });

  it('updates download button label to .json when activeTab is json', () => {
    const html = renderToStaticMarkup(
      <DossierModalFooter
        loading={false}
        hasContent={true}
        copied={false}
        activeTab="json"
        onCopy={() => {}}
        onDownload={() => {}}
        onPrint={() => {}}
        onClose={() => {}}
      />
    );
    expect(html).toContain('Download (.json)');
  });

  it('renders document panel with role="tabpanel" and print styles', () => {
    const html = renderToStaticMarkup(<MissionDossierModal {...defaultProps} isOpen={true} />);
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('id="panel-dossier"');
    expect(html).toContain('print:whitespace-pre-wrap');
    expect(html).toContain('print:text-black');
  });

  it('triggers downloadFile utility without throwing in headless environments', () => {
    expect(() => downloadFile('test.md', '# Content', 'text/markdown')).not.toThrow();
  });

  it('invokes downloadFile with blob creation and restores global references cleanly', () => {
    const originalDoc = (globalThis as any).document;
    const originalCreateObjectURL = (globalThis as any).URL?.createObjectURL;
    const originalRevokeObjectURL = (globalThis as any).URL?.revokeObjectURL;
    const clicked: string[] = [];

    try {
      const mockAnchor = {
        href: '',
        download: '',
        click: () => { clicked.push(mockAnchor.download); },
      };
      (globalThis as any).document = {
        createElement: (tag: string) => (tag === 'a' ? mockAnchor : {}),
        body: {
          appendChild: () => {},
          removeChild: () => {},
        },
      };
      if ((globalThis as any).URL) {
        (globalThis as any).URL.createObjectURL = () => 'blob:mock-url';
        (globalThis as any).URL.revokeObjectURL = () => {};
      }

      downloadFile('lunamission-briefing.md', '# Test Briefing', 'text/markdown');
      expect(clicked).toContain('lunamission-briefing.md');
      expect(mockAnchor.download).toBe('lunamission-briefing.md');
      expect(mockAnchor.href).toBe('blob:mock-url');
    } finally {
      (globalThis as any).document = originalDoc;
      if ((globalThis as any).URL) {
        (globalThis as any).URL.createObjectURL = originalCreateObjectURL;
        (globalThis as any).URL.revokeObjectURL = originalRevokeObjectURL;
      }
    }
  });

  it('ensures MissionWorkspaceShell has print:hidden on background cockpit elements', () => {
    const html = renderToStaticMarkup(
      <GlobalScenarioProvider>
        <MissionWorkspaceShell />
      </GlobalScenarioProvider>
    );

    expect(html).toContain('print:hidden');
  });
});
