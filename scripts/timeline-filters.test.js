#!/usr/bin/env node

const test = require('node:test');
const assert = require('node:assert/strict');

const { compileTimelineObject } = require('./timeline-filters');

test('compileBoxFilter emits drawbox with timeline enable expression', () => {
  const filter = compileTimelineObject({
    id: 'box-1',
    type: 'box',
    startMs: 500,
    endMs: 1000,
    x: 10,
    y: 20,
    width: 30,
    height: 40,
  });
  assert.match(filter, /drawbox/);
  assert.match(filter, /between\(t,0\.5,1\)/);
});

test('compileSpotlightFilter emits a timed dimming expression', () => {
  const filter = compileTimelineObject({
    id: 'spot-1',
    type: 'spotlight',
    startMs: 0,
    endMs: 1000,
    shape: 'rect',
    x: 100,
    y: 100,
    width: 200,
    height: 100,
  });
  assert.match(filter, /drawbox/);
  assert.match(filter, /enable='between\(t,0,1\)'/);
});
