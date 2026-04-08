#!/usr/bin/env node

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  compileTimelineFromEvents,
  loadEventsFile,
} = require('./timeline-from-events');

const cliPath = path.join(__dirname, 'timeline-cli.js');

test('loadEventsFile reads the event log contract from disk', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-timeline-events-'));
  const eventsPath = path.join(tempDir, 'demo.events.json');

  fs.writeFileSync(eventsPath, JSON.stringify({
    version: 1,
    viewport: { width: 1440, height: 900 },
    events: [
      {
        type: 'click',
        atMs: 1000,
        selector: 'text=Save changes',
        rect: { x: 100, y: 200, width: 40, height: 50 },
      },
    ],
  }), 'utf8');

  const eventLog = loadEventsFile(eventsPath);

  assert.equal(eventLog.version, 1);
  assert.equal(eventLog.events.length, 1);
  assert.equal(eventLog.viewport.width, 1440);
});

test('compileTimelineFromEvents emits a padded click box with caption defaults', () => {
  const project = compileTimelineFromEvents({
    version: 1,
    viewport: { width: 1440, height: 900 },
    events: [
      {
        type: 'click',
        atMs: 1000,
        selector: 'text=Save changes',
        url: 'https://example.com/settings',
        rect: { x: 100, y: 200, width: 40, height: 50 },
      },
    ],
  }, {
    videoPath: '/tmp/demo.mp4',
    projectPath: '/tmp/demo.generated.json',
  });

  assert.equal(project.version, 1);
  assert.deepEqual(project.input, {
    video: '/tmp/demo.mp4',
    width: 1440,
    height: 900,
  });
  assert.deepEqual(project.output, {
    path: '/tmp/demo.generated.mp4',
    format: 'mp4',
  });
  assert.equal(project.timeline.length, 1);
  assert.deepEqual(project.timeline[0], {
    id: 'click-1',
    type: 'box',
    startMs: 400,
    endMs: 1120,
    x: 88,
    y: 188,
    width: 64,
    height: 74,
    caption: 'Save changes',
  });
});

test('compileTimelineFromEvents shortens the previous annotation when the next click is on a different route', () => {
  const project = compileTimelineFromEvents({
    events: [
      {
        type: 'click',
        atMs: 1000,
        label: 'Open settings',
        url: 'https://example.com/settings',
        rect: { x: 100, y: 200, width: 40, height: 50 },
      },
      {
        type: 'click',
        atMs: 1060,
        label: 'Open profile',
        url: 'https://example.com/profile',
        rect: { x: 300, y: 200, width: 40, height: 50 },
      },
    ],
  }, {
    videoPath: '/tmp/demo.mp4',
    projectPath: '/tmp/demo.generated.json',
  });

  assert.equal(project.timeline[0].endMs, 940);
  assert.equal(project.timeline[0].fadeOutMs, 120);
  assert.equal(project.timeline[1].startMs, 460);
});

test('timeline CLI from-events writes a generated project file', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-timeline-cli-'));
  const eventsPath = path.join(tempDir, 'demo.events.json');
  const outPath = path.join(tempDir, 'demo.generated.json');

  fs.writeFileSync(eventsPath, JSON.stringify({
    events: [
      {
        type: 'click',
        atMs: 1000,
        selector: 'text=Save changes',
        rect: { x: 100, y: 200, width: 40, height: 50 },
      },
    ],
  }), 'utf8');

  const result = spawnSync('node', [
    cliPath,
    'from-events',
    '--events',
    eventsPath,
    '--video',
    '/tmp/demo.mp4',
    '--out',
    outPath,
  ], {
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), outPath);

  const project = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  assert.equal(project.timeline[0].caption, 'Save changes');
  assert.equal(project.output.path, '/tmp/demo.generated.mp4');
});
