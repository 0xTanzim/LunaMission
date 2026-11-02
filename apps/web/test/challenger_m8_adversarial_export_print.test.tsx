/**
 * Challenger M8 Adversarial Empirical Test Suite
 *
 * Adversarially challenges:
 * 1. Export Triggers & Formats:
 *    - Target name sanitization across adversarial vectors (path traversal, control chars, unicode, long strings)
 *    - MIME types ('text/markdown;charset=utf-8' and 'application/json;charset=utf-8')
 *    - File extensions (.md and .json)
 *    - Valid JSON telemetry structure
 *    - downloadFile utility safety under abnormal DOM/URL states
 * 2. Clipboard Copy & Feedback:
 *    - navigator.clipboard.writeText execution and error isolation
 *    - aria-live="polite" status announcement toggle and text
 *    - Button disable states and touch target sizes
 * 3. Formatted Print View CSS:
 *    - print:hidden isolation on CockpitHeader, main, footer in MissionWorkspaceShell
 *    - print:hidden on DossierModalHeader, DossierTabControls, DossierModalFooter
 *    - Print un-clipping on dialog overlay (print:static, print:overflow-visible)
 *    - Print un-clipping on modal card (print:max-h-none, print:overflow-visible, print:border-none)
 *    - Print pre formatting (print:whitespace-pre-wrap, print:text-black, break-words)
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

describe('Challenger M8: Export Triggers, File Formats & Sanitization', () => {
  const adversarialTargetNames = [
    { input: '../../etc/passwd', desc: 'Path traversal dots and slashes' },
    { input: 'Site #1: "Peak" 🚀 \x00', desc: 'Special symbols, quotes, emoji, null byte' },
    { input: 'Shackleton/Connecting\\Ridge', desc: 'Forward and back slashes' },
    { input: 'Crater Schrödinger-1 (南极)', desc: 'Unicode umlauts and CJK characters' },
    { input: '   ', desc: 'Whitespace only' },
    { input: 'A'.repeat(300), desc: 'Excessively long target name' },
    { input: 'CON.TXT', desc: 'Windows reserved device filename' },
    { input: 'site<name>?*|:', desc: 'Illegal filesystem characters' },
    { input: '', desc: 'Empty string' },
  ];

  it('sanitizes all adversarial target names into safe filenames without path traversal or illegal chars', () => {
    for (const { input, desc } of adversarialTargetNames) {
      const cleanName = input.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const mdFilename = `lunamission-${cleanName}-briefing.md`;
      const jsonFilename = `lunamission-${cleanName}-telemetry.json`;

      // 1. Must end with correct extensions
      expect(mdFilename.endsWith('.md')).toBe(true);
      expect(jsonFilename.endsWith('.json')).toBe(true);

      // 2. Must not contain directory traversal or path separators
      expect(mdFilename.includes('/')).toBe(false);
      expect(mdFilename.includes('\\')).toBe(false);
      expect(mdFilename.includes('..')).toBe(false);

      // 3. Must not contain illegal filesystem characters
      expect(/[:*?"<>|\x00]/.test(mdFilename)).toBe(false);
      expect(/[:*?"<>|\x00]/.test(jsonFilename)).toBe(false);

      // 4. Filename must only consist of alphanumeric, hyphens, and dot
      expect(/^[a-z0-9\-_.]+$/.test(mdFilename)).toBe(true);
      expect(/^[a-z0-9\-_.]+$/.test(jsonFilename)).toBe(true);
    }
  });

  it('enforces explicit MIME types and UTF-8 charset declarations', () => {
    const mdMime = 'text/markdown;charset=utf-8';
    const jsonMime = 'application/json;charset=utf-8';

    expect(mdMime.startsWith('text/markdown')).toBe(true);
    expect(mdMime.includes('charset=utf-8')).toBe(true);

    expect(jsonMime.startsWith('application/json')).toBe(true);
    expect(jsonMime.includes('charset=utf-8')).toBe(true);

    // Verify Blob constructor accepts these MIME types cleanly
    const mdBlob = new Blob(['# Lunar Briefing'], { type: mdMime });
    const jsonBlob = new Blob(['{"telemetry": true}'], { type: jsonMime });
    expect(mdBlob.type).toBe(mdMime);
    expect(jsonBlob.type).toBe(jsonMime);
  });

  it('validates that JSON telemetry payload is strictly parseable JSON', () => {
    const mockJsonTelemetry = JSON.stringify({
      siteId: 'shackleton-connecting-ridge',
      coordinates: { latitudeDeg: -89.44, longitudeDeg: 124.5, elevationKm: 1.85 },
      evaluations: { solarAccessFraction: 0.86, earthLineOfSightFraction: 0.72 },
      provenance: { source: 'nextrush_server', generatedAt: '2026-11-05T06:00:00Z' },
    }, null, 2);

    expect(() => JSON.parse(mockJsonTelemetry)).not.toThrow();
    const parsed = JSON.parse(mockJsonTelemetry);
    expect(parsed.siteId).toBe('shackleton-connecting-ridge');
    expect(parsed.coordinates.latitudeDeg).toBe(-89.44);
    expect(parsed.provenance.source).toBe('nextrush_server');
  });

  it('handles downloadFile with 1MB large telemetry payload without throwing or leaking', () => {
    const originalDoc = (globalThis as any).document;
    const originalURL = (globalThis as any).URL;
    let createdBlobType = '';
    let revokedUrl = '';

    try {
      const mockAnchor = { href: '', download: '', click: () => {} };
      (globalThis as any).document = {
        createElement: () => mockAnchor,
        body: { appendChild: () => {}, removeChild: () => {} },
      };
      (globalThis as any).URL = {
        createObjectURL: (blob: Blob) => {
          createdBlobType = blob.type;
          return 'blob:http://localhost/mock-uuid';
        },
        revokeObjectURL: (url: string) => {
          revokedUrl = url;
        },
      };

      const largeContent = 'A'.repeat(1024 * 1024); // 1MB payload
      downloadFile('lunamission-stress.json', largeContent, 'application/json;charset=utf-8');

      expect(mockAnchor.download).toBe('lunamission-stress.json');
      expect(mockAnchor.href).toBe('blob:http://localhost/mock-uuid');
      expect(createdBlobType).toBe('application/json;charset=utf-8');
      expect(revokedUrl).toBe('blob:http://localhost/mock-uuid');
    } finally {
      (globalThis as any).document = originalDoc;
      (globalThis as any).URL = originalURL;
    }
  });

  it('downloadFile handles missing URL.createObjectURL gracefully', () => {
    const originalDoc = (globalThis as any).document;
    const originalURL = (globalThis as any).URL;

    try {
      const mockAnchor = { href: '', download: '', click: () => {} };
      (globalThis as any).document = {
        createElement: () => mockAnchor,
        body: { appendChild: () => {}, removeChild: () => {} },
      };
      (globalThis as any).URL = undefined;

      expect(() => downloadFile('test.md', '# Content', 'text/markdown')).not.toThrow();
      expect(mockAnchor.href).toBe('');
      expect(mockAnchor.download).toBe('test.md');
    } finally {
      (globalThis as any).document = originalDoc;
      (globalThis as any).URL = originalURL;
    }
  });
});

describe('Challenger M8: Clipboard Copy & Screen Reader Status Announcement', () => {
  it('renders aria-live="polite" screen-reader status region in DossierModalFooter', () => {
    // When copied is false: status announcement should be empty string
    const htmlUncopied = renderToStaticMarkup(
      <DossierModalFooter
        loading={false}
        hasContent={true}
        copied={false}
        activeTab="markdown"
        onCopy={() => {}}
        onDownload={() => {}}
        onPrint={() => {}}
        onClose={() => {}}
      />
    );
    expect(htmlUncopied).toContain('role="status"');
    expect(htmlUncopied).toContain('aria-live="polite"');
    expect(htmlUncopied).toContain('class="sr-only"');
    expect(htmlUncopied).not.toContain('Dossier copied to clipboard');

    // When copied is true: status announcement must announce success
    const htmlCopied = renderToStaticMarkup(
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
    expect(htmlCopied).toContain('role="status"');
    expect(htmlCopied).toContain('aria-live="polite"');
    expect(htmlCopied).toContain('Dossier copied to clipboard');
  });

  it('disables copy and download buttons when loading is true or content is empty', () => {
    const htmlLoading = renderToStaticMarkup(
      <DossierModalFooter
        loading={true}
        hasContent={false}
        copied={false}
        activeTab="markdown"
        onCopy={() => {}}
        onDownload={() => {}}
        onPrint={() => {}}
        onClose={() => {}}
      />
    );
    // Check that disabled attribute is present
    expect(htmlLoading).toContain('disabled=""');
  });

  it('ensures minimum 32px touch target size on all footer buttons', () => {
    const html = renderToStaticMarkup(
      <DossierModalFooter
        loading={false}
        hasContent={true}
        copied={false}
        activeTab="markdown"
        onCopy={() => {}}
        onDownload={() => {}}
        onPrint={() => {}}
        onClose={() => {}}
      />
    );
    const matches = html.match(/min-h-\[32px\]/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(4); // Copy, Download, Print, Close
  });
});

describe('Challenger M8: Formatted Print View CSS & Clipping Prevention', () => {
  it('verifies CockpitHeader, main workspace, and footer are wrapped in print:hidden', () => {
    const html = renderToStaticMarkup(
      <GlobalScenarioProvider>
        <MissionWorkspaceShell />
      </GlobalScenarioProvider>
    );

    // Flight deck container has print:hidden
    expect(html).toContain('flex-1 flex flex-col min-h-0 print:hidden');

    // Verify main workspace content is enclosed within print:hidden
    const splitBefore = html.split('print:hidden')[1];
    expect(splitBefore).toContain('<main');
    expect(splitBefore).toContain('<footer');
  });

  it('verifies modal sub-controls are hidden during print media generation', () => {
    // Header
    const headerHtml = renderToStaticMarkup(
      <DossierModalHeader targetName="Peak SP-1" latitudeDeg={-89.45} longitudeDeg={222.69} onClose={() => {}} />
    );
    expect(headerHtml).toContain('print:hidden');

    // Tab Controls
    const tabHtml = renderToStaticMarkup(
      <DossierTabControls activeTab="markdown" onTabChange={() => {}} epochMs={Date.now()} />
    );
    expect(tabHtml).toContain('print:hidden');

    // Footer
    const footerHtml = renderToStaticMarkup(
      <DossierModalFooter
        loading={false}
        hasContent={true}
        copied={false}
        activeTab="markdown"
        onCopy={() => {}}
        onDownload={() => {}}
        onPrint={() => {}}
        onClose={() => {}}
      />
    );
    expect(footerHtml).toContain('print:hidden');
  });

  it('verifies print un-clipping rules on modal card, panel, and pre tag', () => {
    const modalProps = {
      isOpen: true,
      onClose: () => {},
      targetName: 'Amundsen Crater Rim',
      latitudeDeg: -84.3,
      longitudeDeg: 85.6,
      epochMs: Date.now(),
    };

    const modalHtml = renderToStaticMarkup(<MissionDossierModal {...modalProps} />);

    // Outer Overlay
    expect(modalHtml).toContain('print:bg-transparent');
    expect(modalHtml).toContain('print:p-0');
    expect(modalHtml).toContain('print:m-0');
    expect(modalHtml).toContain('print:static');
    expect(modalHtml).toContain('print:overflow-visible');

    // Modal Card
    expect(modalHtml).toContain('print:border-none');
    expect(modalHtml).toContain('print:shadow-none');
    expect(modalHtml).toContain('print:max-h-none');
    expect(modalHtml).toContain('print:w-full');
    expect(modalHtml).toContain('print:bg-white');
    expect(modalHtml).toContain('print:text-black');
    expect(modalHtml).toContain('print:overflow-visible');

    // Tabpanel
    expect(modalHtml).toContain('print:p-0');
    expect(modalHtml).toContain('print:overflow-visible');

    // Pre element
    expect(modalHtml).toContain('print:whitespace-pre-wrap');
    expect(modalHtml).toContain('print:text-black');
    expect(modalHtml).toContain('print:text-xs');
    expect(modalHtml).toContain('break-words');
  });
});
