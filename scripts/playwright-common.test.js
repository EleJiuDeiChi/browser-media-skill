#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  finalizeRecordedVideo,
  runSteps,
} = require('./playwright-common');

test('finalizeRecordedVideo transcodes to real mp4 when target uses .mp4', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-media-test-'));
  const sourcePath = path.join(tempDir, 'source.webm');
  const targetPath = path.join(tempDir, 'video.mp4');

  fs.writeFileSync(sourcePath, 'fake-webm');

  const calls = [];
  await finalizeRecordedVideo(sourcePath, targetPath, {
    runCommandFile(command, args) {
      calls.push({ command, args });
      fs.writeFileSync(targetPath, 'real-mp4');
    },
  });

  assert.equal(fs.readFileSync(targetPath, 'utf8'), 'real-mp4');
  assert.equal(fs.existsSync(sourcePath), false);
  assert.equal(calls.length, 1);
  assert.match(calls[0].command, /ffmpeg$/);
  assert.deepEqual(calls[0].args.slice(0, 4), ['-y', '-i', sourcePath, '-c:v']);
});

test('finalizeRecordedVideo keeps native container when target is not mp4', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-media-test-'));
  const sourcePath = path.join(tempDir, 'source.webm');
  const targetPath = path.join(tempDir, 'video.webm');

  fs.writeFileSync(sourcePath, 'native-webm');

  await finalizeRecordedVideo(sourcePath, targetPath, {
    runCommandFile() {
      throw new Error('ffmpeg should not run for non-mp4 output');
    },
  });

  assert.equal(fs.readFileSync(targetPath, 'utf8'), 'native-webm');
  assert.equal(fs.existsSync(sourcePath), false);
});

test('runSteps captures click event metadata before interacting', async () => {
  const calls = [];
  const page = {
    locator(selector) {
      return {
        first() {
          return {
            async boundingBox() {
              return { x: 934.4, y: 545.6, width: 71.8, height: 20.2 };
            },
            async evaluate(fn) {
              return fn({ innerText: '试用登录', textContent: '试用登录' });
            },
          };
        },
      };
    },
    url() {
      return 'https://tool.totru.cn/login';
    },
    async click(selector, options) {
      calls.push(['click', selector, options]);
    },
  };

  const events = await runSteps(page, [
    { type: 'click', selector: 'text=试用登录' },
  ], {
    startedAtMs: 1000,
    nowMs: () => 1180,
    viewport: { width: 1440, height: 900 },
  });

  assert.deepEqual(calls, [['click', 'text=试用登录', {}]]);
  assert.deepEqual(events, [
    {
      type: 'click',
      atMs: 180,
      selector: 'text=试用登录',
      label: '试用登录',
      url: 'https://tool.totru.cn/login',
      viewport: { width: 1440, height: 900 },
      rect: { x: 934, y: 546, width: 72, height: 20 },
      captureError: null,
    },
  ]);
});
