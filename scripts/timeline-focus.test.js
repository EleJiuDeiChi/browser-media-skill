#!/usr/bin/env node

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_FOCUS_DIMMING,
  buildFocusFilterPlan,
  buildFocusPlan,
  normalizeFocusTarget,
} = require('./timeline-focus');

test('normalizeFocusTarget preserves roundRect metadata and adds a legacy hint', () => {
  const focus = normalizeFocusTarget({
    id: 'focus-1',
    type: 'spotlight',
    startMs: 250,
    endMs: 1500,
    x: 10,
    y: 20,
    width: 30,
    height: 40,
    shape: 'roundRect',
    cornerRadius: 12,
    dimming: 0.5,
    feather: 6,
    softness: 9,
  });

  assert.deepStrictEqual(focus.shape, 'roundRect');
  assert.deepStrictEqual(focus.cornerRadius, 12);
  assert.deepStrictEqual(focus.dimming, 0.5);
  assert.deepStrictEqual(focus.feather, 6);
  assert.deepStrictEqual(focus.softness, 9);
  assert.deepStrictEqual(focus.compatibility.legacyShape, 'rect');
  assert.deepStrictEqual(focus.compatibility.shouldFlattenForLegacyRenderer, true);
});

test('normalizeFocusTarget applies deterministic defaults for dimming, feather, and softness', () => {
  const focus = normalizeFocusTarget({
    id: 'focus-2',
    startMs: 0,
    endMs: 1000,
    x: 100,
    y: 50,
    width: 80,
    height: 40,
  });

  assert.deepStrictEqual(focus.shape, 'rect');
  assert.deepStrictEqual(focus.cornerRadius, undefined);
  assert.deepStrictEqual(focus.dimming, DEFAULT_FOCUS_DIMMING);
  assert.deepStrictEqual(focus.feather, 0);
  assert.deepStrictEqual(focus.softness, 0);
});

test('buildFocusPlan keeps source metadata and derives frame bounds', () => {
  const plan = buildFocusPlan({
    id: 'focus-3',
    startMs: 1000,
    endMs: 2500,
    x: 20,
    y: 30,
    width: 50,
    height: 60,
    shape: 'roundRect',
    cornerRadius: 8,
  }, {
    width: 200,
    height: 100,
  });

  assert.deepStrictEqual(plan.focus.shape, 'roundRect');
  assert.deepStrictEqual(plan.focus.cornerRadius, 8);
  assert.deepStrictEqual(plan.frame, { width: 200, height: 100 });
  assert.deepStrictEqual(plan.bounds, {
    left: 20,
    top: 30,
    right: 70,
    bottom: 90,
  });
  assert.deepStrictEqual(plan.enable, "between(t,1,2.5)");
});

test('buildFocusFilterPlan emits deterministic dim segments in edge order', () => {
  const plan = buildFocusFilterPlan({
    id: 'focus-4',
    startMs: 0,
    endMs: 1000,
    x: 100,
    y: 40,
    width: 80,
    height: 20,
    dimming: 0.8,
    shape: 'roundRect',
    cornerRadius: 16,
  }, {
    width: 240,
    height: 120,
  });

  assert.deepStrictEqual(plan.focus.shape, 'roundRect');
  assert.deepStrictEqual(plan.focus.cornerRadius, 16);
  assert.deepStrictEqual(plan.filters, [
    {
      kind: 'dim-box',
      edge: 'left',
      x: 0,
      y: 0,
      width: 100,
      height: 120,
      color: 'black@0.8',
      enable: 'between(t,0,1)',
    },
    {
      kind: 'dim-box',
      edge: 'top',
      x: 100,
      y: 0,
      width: 80,
      height: 40,
      color: 'black@0.8',
      enable: 'between(t,0,1)',
    },
    {
      kind: 'dim-box',
      edge: 'right',
      x: 180,
      y: 0,
      width: 60,
      height: 120,
      color: 'black@0.8',
      enable: 'between(t,0,1)',
    },
    {
      kind: 'dim-box',
      edge: 'bottom',
      x: 100,
      y: 60,
      width: 80,
      height: 60,
      color: 'black@0.8',
      enable: 'between(t,0,1)',
    },
  ]);
});
