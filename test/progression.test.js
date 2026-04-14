import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  UPGRADE_DEFS,
  awardDiamonds,
  createDefaultProfile,
  getUpgradeCost,
  loadProfile,
  purchaseUpgrade,
  resetProfile,
  saveProfile,
} from '../src/progression.js';

const createLocalStorageMock = () => {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    dump() {
      return Object.fromEntries(store.entries());
    },
  };
};

beforeEach(() => {
  globalThis.localStorage = createLocalStorageMock();
});

afterEach(() => {
  delete globalThis.localStorage;
});

test('creates a default profile', () => {
  const profile = createDefaultProfile();
  assert.equal(profile.diamonds, 0);
  assert.deepEqual(profile.upgrades, { prod: 0, damage: 0, range: 0, gather: 0, hp: 0 });
});

test('loads a missing profile as default', () => {
  assert.deepEqual(loadProfile(), createDefaultProfile());
});

test('sanitizes stored profile values', () => {
  localStorage.setItem('space-rts-profile-v1', JSON.stringify({
    diamonds: 12.8,
    upgrades: { prod: 99, damage: -3, range: 2, gather: '4', hp: 'nope' },
  }));

  assert.deepEqual(loadProfile(), {
    diamonds: 12,
    upgrades: { prod: 4, damage: 0, range: 2, gather: 4, hp: 0 },
  });
});

test('falls back to default profile on invalid json', () => {
  localStorage.setItem('space-rts-profile-v1', '{broken json');
  assert.deepEqual(loadProfile(), createDefaultProfile());
});

test('saves and awards diamonds', () => {
  saveProfile(createDefaultProfile());
  const profile = awardDiamonds(3.9);
  assert.equal(profile.diamonds, 3);
  assert.equal(loadProfile().diamonds, 3);
});

test('does not award negative diamonds', () => {
  saveProfile(createDefaultProfile());
  const profile = awardDiamonds(-8);
  assert.equal(profile.diamonds, 0);
});

test('purchases an upgrade when enough diamonds exist', () => {
  saveProfile({ diamonds: 3, upgrades: { prod: 0, damage: 0, range: 0, gather: 0, hp: 0 } });
  const profile = purchaseUpgrade('prod');

  assert.equal(profile.diamonds, 2);
  assert.equal(profile.upgrades.prod, 1);
});

test('blocks upgrade purchases when diamonds are missing', () => {
  saveProfile({ diamonds: 0, upgrades: { prod: 0, damage: 0, range: 0, gather: 0, hp: 0 } });
  const profile = purchaseUpgrade('prod');

  assert.equal(profile.diamonds, 0);
  assert.equal(profile.upgrades.prod, 0);
});

test('does not buy beyond max level', () => {
  saveProfile({ diamonds: 10, upgrades: { prod: 4, damage: 0, range: 0, gather: 0, hp: 0 } });
  const profile = purchaseUpgrade('prod');

  assert.equal(profile.diamonds, 10);
  assert.equal(profile.upgrades.prod, 4);
});

test('resets the profile', () => {
  saveProfile({ diamonds: 7, upgrades: { prod: 2, damage: 1, range: 3, gather: 1, hp: 4 } });
  const profile = resetProfile();

  assert.deepEqual(profile, createDefaultProfile());
});

test('uses four upgrade levels', () => {
  assert.equal(UPGRADE_DEFS.prod.maxLevel, 4);
  assert.equal(getUpgradeCost('prod', 0), 1);
  assert.equal(getUpgradeCost('prod', 1), 1);
  assert.equal(getUpgradeCost('prod', 2), 2);
  assert.equal(getUpgradeCost('prod', 3), 3);
  assert.equal(getUpgradeCost('prod', 4), null);
});
