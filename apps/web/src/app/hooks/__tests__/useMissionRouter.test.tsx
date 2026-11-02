import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveTabFromPath,
  resolvePathFromTab,
  TAB_ROUTE_MAP,
} from '@/app/hooks/useMissionRouter';
import { NavTab } from '@/app/header/config/navTabs';

test('useMissionRouter: maps canonical paths to corresponding NavTabs', () => {
  assert.equal(resolveTabFromPath('/explore'), 'explore');
  assert.equal(resolveTabFromPath('/scenario/3d-lab'), 'lab');
  assert.equal(resolveTabFromPath('/compare'), 'compare');
  assert.equal(resolveTabFromPath('/horizon'), 'horizon');
  assert.equal(resolveTabFromPath('/methodology'), 'method');
  assert.equal(resolveTabFromPath('/method'), 'method');
});

test('useMissionRouter: maps NavTabs to canonical URL routes', () => {
  const tabs: NavTab[] = ['explore', 'lab', 'compare', 'horizon', 'method'];
  for (const tab of tabs) {
    const route = resolvePathFromTab(tab);
    assert.ok(route.startsWith('/'), `Route for tab ${tab} must start with /`);
    assert.equal(route, TAB_ROUTE_MAP[tab]);
  }
});

test('useMissionRouter: handles trailing slashes and casing robustly', () => {
  assert.equal(resolveTabFromPath('/Compare///'), 'compare');
  assert.equal(resolveTabFromPath('/Horizon/'), 'horizon');
});

test('useMissionRouter: resolves hash fragments and search parameters accurately', () => {
  assert.equal(resolveTabFromPath('/', '#/scenario/3d-lab'), 'lab');
  assert.equal(resolveTabFromPath('/', '', '?tab=compare'), 'compare');
  assert.equal(resolveTabFromPath('/', '', '?scenario=3d-lab'), 'lab');
});

test('useMissionRouter: falls back to explore on unrecognized paths', () => {
  assert.equal(resolveTabFromPath('/unknown-route'), 'explore');
  assert.equal(resolveTabFromPath(''), 'explore');
  assert.equal(resolveTabFromPath('/invalid/nested/deep'), 'explore');
});

test('useMissionRouter: pathname takes strict precedence over query search parameters', () => {
  assert.equal(resolveTabFromPath('/horizon', '', '?scenario=3d-lab'), 'horizon');
  assert.equal(resolveTabFromPath('/scenario/3d-lab', '', '?tab=compare'), 'lab');
  assert.equal(resolveTabFromPath('/explore', '', '?q=compare'), 'explore');
  assert.equal(resolveTabFromPath('/methodology', '', '?q=compare'), 'method');
});

