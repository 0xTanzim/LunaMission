import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LabelDeclutterManager,
  type LabelRectInput,
} from '../scene/globeLabelDeclutter';

function label(
  id: string,
  priority: number,
  screenX: number,
  screenY: number,
  halfWidth = 40,
  halfHeight = 10,
): LabelRectInput {
  return { id, priority, screenX, screenY, halfWidth, halfHeight };
}

test('declutter: non-overlapping labels all stay visible at their anchors', () => {
  const manager = new LabelDeclutterManager();
  const placements = manager.resolve([
    label('a', 1, 100, 100),
    label('b', 1, 400, 100),
    label('c', 1, 700, 500),
  ]);
  assert.deepEqual(
    placements.map((p) => [p.id, p.visible, p.offsetX, p.offsetY]),
    [
      ['a', true, 0, 0],
      ['b', true, 0, 0],
      ['c', true, 0, 0],
    ],
  );
});

test('declutter: higher priority wins the contested slot and the loser escapes or hides', () => {
  const manager = new LabelDeclutterManager();
  const placements = manager.resolve([
    label('selected', 10, 200, 200),
    label('crater', 1, 210, 205),
  ]);

  const byId = new Map(placements.map((p) => [p.id, p]));
  assert.equal(byId.get('selected')!.visible, true);
  assert.equal(byId.get('selected')!.offsetX, 0);
  // The lower-priority label must not overlap the winner on screen: either it escaped to an
  // offset anchor or it is hidden — in both cases its rendered box clears the winner.
  const loser = byId.get('crater')!;
  if (loser.visible) {
    const winnerBox = { x: 160, y: 190, w: 80, h: 20 };
    const loserBox = {
      x: 210 + loser.offsetX - 40,
      y: 205 + loser.offsetY - 10,
      w: 80,
      h: 20,
    };
    const separated =
      loserBox.x + loserBox.w < winnerBox.x ||
      loserBox.x > winnerBox.x + winnerBox.w ||
      loserBox.y + loserBox.h < winnerBox.y ||
      loserBox.y > winnerBox.y + winnerBox.h;
    assert.ok(separated, 'escaped label must not overlap the winner');
  }
});

test('declutter: equal priorities resolve deterministically by id', () => {
  const a = new LabelDeclutterManager().resolve([label('b', 1, 200, 200), label('a', 1, 205, 205)]);
  const b = new LabelDeclutterManager().resolve([label('a', 1, 205, 205), label('b', 1, 200, 200)]);
  const byIdA = new Map(a.map((p) => [p.id, p.visible]));
  const byIdB = new Map(b.map((p) => [p.id, p.visible]));
  assert.deepEqual(byIdA, byIdB, 'placement must not depend on input order');
});

test('declutter: maxVisible caps simultaneously visible labels by priority', () => {
  const manager = new LabelDeclutterManager({ maxVisible: 2 });
  // Separated positions: without the cap all three would fit, so visibility is decided
  // purely by the priority cap.
  const placements = manager.resolve([
    label('low', 1, 100, 100),
    label('mid', 5, 400, 100),
    label('high', 9, 700, 100),
  ]);
  const byId = new Map(placements.map((p) => [p.id, p.visible]));
  assert.equal(byId.get('high'), true);
  assert.equal(byId.get('mid'), true);
  assert.equal(byId.get('low'), false);
});

test('declutter: hysteresis — a hidden label needs extra clearance to reappear, a visible one keeps its slot', () => {
  // Frame 1: two labels stacked; 'keeper' wins, 'newcomer' hides.
  const manager = new LabelDeclutterManager();
  const frame1 = manager.resolve([label('keeper', 5, 200, 200), label('newcomer', 3, 200, 200)]);
  const byId1 = new Map(frame1.map((p) => [p.id, p.visible]));
  assert.equal(byId1.get('keeper'), true);
  assert.equal(byId1.get('newcomer'), false);

  // Frame 2: the newcomer moves just barely clear of the winner (within the reappear
  // hysteresis band): it must stay hidden to avoid flicker.
  const barelyClear = manager.resolve([label('keeper', 5, 200, 200), label('newcomer', 3, 200, 216)]);
  assert.equal(new Map(barelyClear.map((p) => [p.id, p.visible])).get('newcomer'), false);

  // Frame 3: the newcomer is fully clear: it becomes visible.
  const fullyClear = manager.resolve([label('keeper', 5, 200, 200), label('newcomer', 3, 200, 240)]);
  assert.equal(new Map(fullyClear.map((p) => [p.id, p.visible])).get('newcomer'), true);
});

test('declutter: result array preserves the caller input order', () => {
  const manager = new LabelDeclutterManager();
  const placements = manager.resolve([label('z', 1, 100, 100), label('a', 9, 500, 500)]);
  assert.deepEqual(placements.map((p) => p.id), ['z', 'a']);
});
