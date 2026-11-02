import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useSiteIntelDrawer } from '../useSiteIntelDrawer';

test('useSiteIntelDrawer: initializes with default or custom state', () => {
  let capturedState: ReturnType<typeof useSiteIntelDrawer> | null = null;

  const Harness = ({ initialOpen = false }: { initialOpen?: boolean }) => {
    capturedState = useSiteIntelDrawer({ initialOpen });
    return (
      <div>
        <span id="status">{capturedState.isOpen ? 'open' : 'closed'}</span>
        <span id="tab">{capturedState.activeTab}</span>
      </div>
    );
  };

  const html = renderToStaticMarkup(<Harness initialOpen={true} />);
  assert.ok(html.includes('open'));
  assert.ok(html.includes('all'));
  const state = capturedState as ReturnType<typeof useSiteIntelDrawer> | null;
  assert.equal(state?.isOpen, true);
  assert.equal(state?.activeTab, 'all');
});

test('useSiteIntelDrawer: computes widthPx and responds to open/close state', () => {
  let capturedState: ReturnType<typeof useSiteIntelDrawer> | null = null;

  const Harness = ({ initialOpen = false }: { initialOpen?: boolean }) => {
    capturedState = useSiteIntelDrawer({ initialOpen });
    return <div id="width">{capturedState.widthPx}</div>;
  };

  const htmlOpen = renderToStaticMarkup(<Harness initialOpen={true} />);
  assert.ok(htmlOpen.includes('440') || htmlOpen.includes('0'));
  assert.equal(typeof (capturedState as ReturnType<typeof useSiteIntelDrawer> | null)?.widthPx, 'number');
  assert.equal(typeof (capturedState as ReturnType<typeof useSiteIntelDrawer> | null)?.isOverlayMode, 'boolean');

  const htmlClosed = renderToStaticMarkup(<Harness initialOpen={false} />);
  assert.ok(htmlClosed.includes('0'));
  assert.equal((capturedState as ReturnType<typeof useSiteIntelDrawer> | null)?.widthPx, 0);
});

