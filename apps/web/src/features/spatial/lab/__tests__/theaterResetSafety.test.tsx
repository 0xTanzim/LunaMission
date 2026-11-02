import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlanetaryTheaterCameraButtons } from '../components/PlanetaryTheaterCameraButtons';

function renderButtons(props?: { onResetSelection?: () => void; onResetCamera?: () => void }) {
  return renderToStaticMarkup(
    React.createElement(PlanetaryTheaterCameraButtons, {
      onResetCamera: props?.onResetCamera ?? (() => {}),
      onResetSelection: props?.onResetSelection,
      isFlyoverActive: false,
      onTogglePlayback: () => {},
    } as never),
  );
}

test('theater reset: the Reset button is camera-only and says so', () => {
  const html = renderButtons();
  assert.ok(html.includes('Reset Camera View'), 'aria-label must announce camera reset');
  assert.ok(!html.includes('Selection: Restores nadir view and default candidate'),
    'Reset must no longer advertise a selection reset');
});

test('theater reset: selection reset is a distinct, explicit control', () => {
  const html = renderButtons({ onResetSelection: () => {} });
  assert.ok(html.includes('Reset Selection'), 'an explicit selection-reset control must exist');
  assert.ok(html.includes('btn-reset-selection'), 'selection reset must be individually addressable');
});

test('theater reset: selection-reset control is omitted when no handler is provided', () => {
  assert.equal(renderButtons().includes('Reset Selection'), false);
});
