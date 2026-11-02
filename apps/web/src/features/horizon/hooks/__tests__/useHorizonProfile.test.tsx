import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useHorizonProfile } from '../useHorizonProfile';

test('useHorizonProfile: mounts in the loading state before the first effect-driven fetch resolves', () => {
  let capturedState!: ReturnType<typeof useHorizonProfile>;

  const Harness = () => {
    capturedState = useHorizonProfile('shackleton-rim', 2);
    return (
      <div data-testid="horizon-profile-harness">
        <span id="status">{capturedState.status}</span>
        <span id="loading">{capturedState.isLoading ? 'loading' : 'settled'}</span>
        <span id="has-profile">{capturedState.profile ? 'yes' : 'no'}</span>
      </div>
    );
  };

  const html = renderToStaticMarkup(<Harness />);
  assert.ok(html.includes('loading'), 'initial render must declare the loading state');
  assert.equal(capturedState.status, 'loading');
  assert.equal(capturedState.isLoading, true);
  assert.equal(capturedState.profile, null);
  assert.equal(capturedState.error, null);
});
