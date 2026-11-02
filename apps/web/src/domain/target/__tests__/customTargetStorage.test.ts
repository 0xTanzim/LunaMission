import test from 'node:test';
import assert from 'node:assert/strict';
import { CustomLandingTarget } from '../customTargetModel';
import {
  clearCustomLandingTargets,
  deleteCustomLandingTarget,
  loadCustomLandingTargets,
  saveCustomLandingTarget,
} from '../customTargetStorage';

class MemoryStorage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

const SAMPLE_TARGET_1: CustomLandingTarget = {
  id: 'custom-1',
  name: 'Target One',
  latitudeDeg: -88.5,
  longitudeDeg: 120.0,
  elevationKm: -1.2,
  createdAt: 1000,
};

const SAMPLE_TARGET_2: CustomLandingTarget = {
  id: 'custom-2',
  name: 'Target Two',
  latitudeDeg: -85.2,
  longitudeDeg: 34.0,
  elevationKm: 0.5,
  createdAt: 2000,
};

test('Custom Landing Target Storage returns empty array when storage is uninitialized', () => {
  const fakeStorage = new MemoryStorage();
  const targets = loadCustomLandingTargets(fakeStorage);
  assert.deepEqual(targets, []);
});

test('Custom Landing Target Storage saves and reloads custom landing targets', () => {
  const fakeStorage = new MemoryStorage();
  saveCustomLandingTarget(SAMPLE_TARGET_1, fakeStorage);
  saveCustomLandingTarget(SAMPLE_TARGET_2, fakeStorage);

  const loaded = loadCustomLandingTargets(fakeStorage);
  assert.equal(loaded.length, 2);
  assert.equal(loaded[0].id, 'custom-1');
  assert.equal(loaded[1].id, 'custom-2');
});

test('Custom Landing Target Storage updates existing target when saving with same id', () => {
  const fakeStorage = new MemoryStorage();
  saveCustomLandingTarget(SAMPLE_TARGET_1, fakeStorage);
  const updated = { ...SAMPLE_TARGET_1, name: 'Renamed Target' };
  saveCustomLandingTarget(updated, fakeStorage);

  const loaded = loadCustomLandingTargets(fakeStorage);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].name, 'Renamed Target');
});

test('Custom Landing Target Storage deletes custom target by id', () => {
  const fakeStorage = new MemoryStorage();
  saveCustomLandingTarget(SAMPLE_TARGET_1, fakeStorage);
  saveCustomLandingTarget(SAMPLE_TARGET_2, fakeStorage);

  const remaining = deleteCustomLandingTarget('custom-1', fakeStorage);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, 'custom-2');

  const loaded = loadCustomLandingTargets(fakeStorage);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].id, 'custom-2');
});

test('Custom Landing Target Storage clears all custom targets', () => {
  const fakeStorage = new MemoryStorage();
  saveCustomLandingTarget(SAMPLE_TARGET_1, fakeStorage);
  clearCustomLandingTargets(fakeStorage);

  const loaded = loadCustomLandingTargets(fakeStorage);
  assert.deepEqual(loaded, []);
});

test('Custom Landing Target Storage defensively recovers from corrupt or non-array JSON', () => {
  const fakeStorage = new MemoryStorage();
  fakeStorage.setItem('lunamission_custom_targets', 'INVALID_JSON_CORRUPT');
  assert.deepEqual(loadCustomLandingTargets(fakeStorage), []);

  fakeStorage.setItem('lunamission_custom_targets', JSON.stringify({ notAnArray: true }));
  assert.deepEqual(loadCustomLandingTargets(fakeStorage), []);

  fakeStorage.setItem(
    'lunamission_custom_targets',
    JSON.stringify([
      SAMPLE_TARGET_1,
      { invalid: 'record', missingId: true },
      { id: 'custom-3', name: 'No coordinates' },
    ]),
  );

  const filtered = loadCustomLandingTargets(fakeStorage);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'custom-1');
});
