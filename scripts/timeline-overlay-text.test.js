#!/usr/bin/env node

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildTextOverlaySpec, pickFontPath } = require('./timeline-overlay-text');

test('buildTextOverlaySpec creates a deterministic asset path', () => {
  const spec = buildTextOverlaySpec('/tmp/work', {
    id: 'text-1',
    type: 'text',
    startMs: 50,
    endMs: 200,
    x: 100,
    y: 80,
    text: 'Demo',
  });
  assert.match(spec.outputPath, /text-1/);
  assert.equal(spec.text, 'Demo');
});

test('pickFontPath prefers a Chinese-capable font when text contains Chinese', () => {
  const fontPath = pickFontPath('辣子鸡', {
    exists: candidate => candidate.includes('Arial.ttf') || candidate.includes('Hiragino Sans GB.ttc'),
  });
  assert.match(fontPath, /Hiragino Sans GB\.ttc|Arial Unicode\.ttf|STHeiti/);
});
