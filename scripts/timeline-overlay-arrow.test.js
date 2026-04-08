#!/usr/bin/env node

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildArrowOverlaySpec } = require('./timeline-overlay-arrow');

test('buildArrowOverlaySpec creates a deterministic asset path', () => {
  const spec = buildArrowOverlaySpec('/tmp/work', {
    id: 'arrow-1',
    type: 'arrow',
    startMs: 100,
    endMs: 500,
    from: [10, 10],
    to: [90, 90],
  });
  assert.match(spec.outputPath, /arrow-1/);
  assert.equal(spec.startMs, 100);
  assert.equal(spec.endMs, 500);
});
