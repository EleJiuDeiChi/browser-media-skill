#!/usr/bin/env node

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const cliPath = path.join(__dirname, 'timeline-cli.js');

test('timeline CLI rejects missing --project for validate', () => {
  const result = spawnSync('node', [cliPath, 'validate'], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--project/);
});

test('timeline CLI rejects unknown command', () => {
  const result = spawnSync('node', [cliPath, 'wat'], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unknown command/);
});
