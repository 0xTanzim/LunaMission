import test from 'node:test';
import assert from 'node:assert/strict';
import { getScientificSiteInvestigation } from '../siteInvestigationRegistry';

/**
 * Task 5.4: one site must carry one code. The investigation fallback used to
 * synthesize a competing "SITE-CON"-style code while the authoritative catalog
 * code (e.g. "SITE-002") was available at the call site — the UI then showed
 * both. The registry must prefer the authoritative code when given one.
 */

test('site investigation: authoritative catalog code wins over the synthetic fallback code', () => {
  const profile = getScientificSiteInvestigation('connecting-ridge-extension', 'SITE-002');
  assert.equal(profile?.code, 'SITE-002');
});

test('site investigation: without an authoritative code the documented synthetic fallback still applies', () => {
  const profile = getScientificSiteInvestigation('connecting-ridge-extension');
  assert.equal(profile?.code, 'SITE-CON');
});
