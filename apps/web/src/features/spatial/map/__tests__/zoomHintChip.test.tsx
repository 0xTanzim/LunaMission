import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapZoomHintChip } from '../components/MapZoomHintChip';
import {
  ZOOM_HINT_DISMISSED_KEY,
  hasDismissedZoomHint,
  storeZoomHintDismissed,
} from '../model/zoomHintStorage';

test('zoom hint chip states the modifier and offers a keyboard-reachable dismissal', () => {
  const html = renderToStaticMarkup(<MapZoomHintChip onDismiss={() => {}} />);
  // Platform-neutral phrasing: the hint names both modifiers.
  assert.ok(html.includes('Ctrl'), 'hint must name Ctrl');
  assert.ok(html.includes('Cmd') || html.includes('⌘'), 'hint must name Cmd');
  assert.ok(html.includes('zoom'), 'hint must say what the modifier does');
  // Dismissal is a real button, labelled for screen readers, not color-only.
  assert.ok(/<button/.test(html), 'dismiss must be a button');
  assert.ok(html.includes('aria-label'), 'dismiss button must be labelled');
});

test('zoom hint dismissal persists in session storage and clears with it', () => {
  const backing = new Map<string, string>();
  const storage = {
    getItem: (k: string) => backing.get(k) ?? null,
    setItem: (k: string, v: string) => void backing.set(k, v),
  };
  assert.equal(hasDismissedZoomHint(storage), false);
  storeZoomHintDismissed(storage);
  assert.equal(backing.get(ZOOM_HINT_DISMISSED_KEY), '1');
  assert.equal(hasDismissedZoomHint(storage), true);
});

test('zoom hint storage helpers tolerate missing or throwing storage', () => {
  // No storage available (SSR/privacy mode): reads false, writes are swallowed.
  assert.equal(hasDismissedZoomHint(undefined), false);
  const throwing = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
  };
  assert.equal(hasDismissedZoomHint(throwing), false);
  assert.doesNotThrow(() => storeZoomHintDismissed(throwing));
});
