import test from 'node:test';
import assert from 'node:assert/strict';
import { createRenderLoopGate } from '../scene/globeRenderLoopGate';

/**
 * The globe stays mounted while the workspace shows the 2D map, so the render loop must
 * be suspendable without losing scene state — and must never double-schedule a frame loop
 * when pause/resume races with WebGL context-loss recovery (which calls start/stop itself).
 */
test('render loop gate: pause stops the loop and resume restarts it exactly once', () => {
  let started = 0;
  let stopped = 0;
  const gate = createRenderLoopGate({ start: () => { started += 1; }, stop: () => { stopped += 1; } });

  gate.start();
  assert.equal(started, 1);
  gate.pause();
  assert.equal(stopped, 1);
  gate.resume();
  assert.equal(started, 2);
  // Double resume (e.g. visibility effect re-firing) must not schedule a second loop.
  gate.resume();
  assert.equal(started, 2, 'resume must be idempotent while running');
});

test('render loop gate: start while suppressed is ignored until resume', () => {
  let started = 0;
  let stopped = 0;
  const gate = createRenderLoopGate({ start: () => { started += 1; }, stop: () => { stopped += 1; } });

  gate.pause();
  // Mirrors the WebGL context-loss handler firing start() while the globe is hidden.
  gate.start();
  assert.equal(started, 0, 'a suppressed globe must not restart its loop');
  gate.resume();
  assert.equal(started, 1);
  gate.stop();
  assert.equal(stopped, 2);
});

test('render loop gate: pause before any start never starts the loop', () => {
  let started = 0;
  const gate = createRenderLoopGate({ start: () => { started += 1; }, stop: () => {} });
  gate.pause();
  gate.resume();
  assert.equal(started, 1, 'resume from a pre-start pause starts the loop once (reveal before first paint)');
});
