#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createRecordedEvent,
  deriveEventsPath,
  normalizeRect,
  writeEventsFile,
} = require('./recording-events');

test('normalizeRect rounds viewport coordinates into integer pixels', () => {
  assert.deepEqual(normalizeRect({
    x: 934.4,
    y: 545.6,
    width: 71.8,
    height: 20.2,
  }), {
    x: 934,
    y: 546,
    width: 72,
    height: 20,
  });
});

test('createRecordedEvent keeps a structured capture error when rect is unavailable', () => {
  assert.deepEqual(createRecordedEvent({
    type: 'click',
    atMs: 1180,
    selector: 'text=试用登录',
    label: '试用登录',
    url: 'https://tool.totru.cn/login',
    viewport: { width: 1440, height: 900 },
    captureError: 'element-not-visible',
  }), {
    type: 'click',
    atMs: 1180,
    selector: 'text=试用登录',
    label: '试用登录',
    url: 'https://tool.totru.cn/login',
    viewport: { width: 1440, height: 900 },
    rect: null,
    captureError: 'element-not-visible',
  });
});

test('deriveEventsPath swaps the video extension for .events.json', () => {
  assert.equal(
    deriveEventsPath('/tmp/demo.mp4'),
    '/tmp/demo.events.json',
  );
});

test('writeEventsFile persists a serializable event payload', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'recording-events-'));
  const eventsPath = path.join(tempDir, 'demo.events.json');
  const payload = {
    video: '/tmp/demo.mp4',
    viewport: { width: 1440, height: 900 },
    events: [
      createRecordedEvent({
        type: 'click',
        atMs: 1180,
        selector: 'text=试用登录',
        label: '试用登录',
        url: 'https://tool.totru.cn/login',
        rect: { x: 934, y: 546, width: 72, height: 20 },
        viewport: { width: 1440, height: 900 },
      }),
    ],
  };

  writeEventsFile(eventsPath, payload);

  assert.deepEqual(JSON.parse(fs.readFileSync(eventsPath, 'utf8')), payload);
});
