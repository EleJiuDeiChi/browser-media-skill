#!/usr/bin/env node

const test = require('node:test');
const assert = require('node:assert/strict');

const { getDefaultTextStyles, normalizePanel, panelToMaskObject, resolveTextStyle } = require('./timeline-panel');

test('getDefaultTextStyles provides editorial defaults', () => {
  const styles = getDefaultTextStyles();
  assert.equal(styles.step.fontSize, 22);
  assert.equal(styles.body.color, '#ffffff');
});

test('resolveTextStyle merges theme and explicit values', () => {
  const style = resolveTextStyle({ textStyles: { title: { fontSize: 32 } } }, 'title', { color: '#ff0000' });
  assert.equal(style.fontSize, 32);
  assert.equal(style.color, '#ff0000');
});

test('panelToMaskObject converts panel to renderable mask config', () => {
  const panel = panelToMaskObject({ id: 'p1', x: 0, y: 0, width: 100, height: 80 });
  assert.equal(panel.type, 'mask');
  assert.equal(panel.opacity, 0.58);
});
