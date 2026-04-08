#!/usr/bin/env node

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildProbeCommand } = require('./timeline-ffmpeg');

test('buildProbeCommand returns ffprobe json arguments', () => {
  const command = buildProbeCommand('/tmp/in.mp4');
  assert.equal(command.bin, 'ffprobe');
  assert.deepEqual(command.args.slice(0, 4), ['-v', 'error', '-print_format', 'json']);
  assert.equal(command.args.at(-1), '/tmp/in.mp4');
});
