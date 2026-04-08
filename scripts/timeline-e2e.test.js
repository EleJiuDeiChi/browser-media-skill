#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');
const assert = require('node:assert/strict');

const { renderProject } = require('./timeline-render');
const { probeVideo } = require('./timeline-ffmpeg');
const { compileTimelineFromEvents } = require('./timeline-from-events');

function makeFixtureVideo(outputPath) {
  execFileSync('ffmpeg', [
    '-y',
    '-f',
    'lavfi',
    '-i',
    'testsrc=size=640x360:rate=25',
    '-t',
    '3',
    '-pix_fmt',
    'yuv420p',
    outputPath,
  ], { stdio: 'ignore' });
}

test('timeline demo project renders a valid mp4', { timeout: 30000 }, async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-timeline-e2e-'));
  const inputPath = path.join(tempDir, 'input.mp4');
  const outputPath = path.join(tempDir, 'output.mp4');

  makeFixtureVideo(inputPath);

  await renderProject({
    version: 1,
    input: {
      video: inputPath,
    },
    output: {
      path: outputPath,
      format: 'mp4',
    },
    theme: {
      accentColor: '#ff3b30',
      textColor: '#ffffff',
    },
    timeline: [
      {
        id: 'box-1',
        type: 'box',
        startMs: 100,
        endMs: 1200,
        x: 40,
        y: 40,
        width: 180,
        height: 100,
      },
      {
        id: 'text-1',
        type: 'text',
        startMs: 200,
        endMs: 1500,
        x: 250,
        y: 50,
        text: 'Demo step',
        fontSize: 24,
      },
      {
        id: 'mask-1',
        type: 'mask',
        startMs: 1200,
        endMs: 1800,
        x: 380,
        y: 180,
        width: 180,
        height: 80,
        opacity: 0.65,
      },
      {
        id: 'spot-1',
        type: 'spotlight',
        startMs: 1700,
        endMs: 2300,
        shape: 'rect',
        x: 180,
        y: 120,
        width: 180,
        height: 120,
      },
      {
        id: 'blur-1',
        type: 'blur',
        startMs: 2300,
        endMs: 2700,
        x: 60,
        y: 220,
        width: 120,
        height: 80,
        strength: 8,
      },
      {
        id: 'arrow-1',
        type: 'arrow',
        startMs: 500,
        endMs: 1300,
        from: [300, 180],
        to: [180, 90],
      },
    ],
  }, { overwrite: true });

  const info = probeVideo(outputPath);
  assert.equal(info.width, 640);
  assert.equal(info.height, 360);
  assert.equal(info.codec, 'h264');
  assert.ok(info.duration > 2.5);
});

test('event-generated timeline project renders a valid mp4', { timeout: 30000 }, async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-timeline-events-e2e-'));
  const inputPath = path.join(tempDir, 'input.mp4');
  const outputPath = path.join(tempDir, 'generated.json');

  makeFixtureVideo(inputPath);

  const project = compileTimelineFromEvents({
    version: 1,
    viewport: { width: 640, height: 360 },
    events: [
      {
        type: 'click',
        atMs: 800,
        selector: 'text=Save changes',
        label: 'Save changes',
        rect: { x: 140, y: 90, width: 100, height: 32 },
        url: 'https://example.com/settings',
      },
      {
        type: 'click',
        atMs: 1700,
        selector: 'text=Open profile',
        label: 'Open profile',
        rect: { x: 300, y: 150, width: 120, height: 36 },
        url: 'https://example.com/profile',
      },
    ],
  }, {
    videoPath: inputPath,
    projectPath: outputPath,
  });

  await renderProject(project, { overwrite: true });

  const info = probeVideo(project.output.path);
  assert.equal(info.width, 640);
  assert.equal(info.height, 360);
  assert.equal(info.codec, 'h264');
  assert.ok(info.duration > 2.5);
});
