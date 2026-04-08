#!/usr/bin/env node

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  compareTimelineItemsByZIndex,
  normalizeExports,
  normalizeSegments,
  loadBatchRenderManifest,
  planBatchRenderManifest,
  sortTimelineItemsByZIndex,
} = require('./timeline-production');

test('sortTimelineItemsByZIndex keeps lower zIndex behind higher zIndex', () => {
  const items = sortTimelineItemsByZIndex([
    { id: 'top', zIndex: 20 },
    { id: 'base' },
    { id: 'middle', zIndex: 10 },
  ]);

  assert.deepEqual(items.map((item) => item.id), ['base', 'middle', 'top']);
});

test('compareTimelineItemsByZIndex preserves input order for equal zIndex values', () => {
  const items = [
    { id: 'first', zIndex: 4 },
    { id: 'second', zIndex: 4 },
  ];

  const sorted = [...items].sort(compareTimelineItemsByZIndex);

  assert.deepEqual(sorted.map((item) => item.id), ['first', 'second']);
});

test('normalizeSegments canonicalizes order and duration metadata', () => {
  const segments = normalizeSegments([
    { id: 'later', startMs: 2400, endMs: 4200, group: 'intro' },
    { id: 'intro', startMs: 0, endMs: 1200, label: 'Intro' },
  ]);

  assert.deepEqual(segments, [
    {
      id: 'intro',
      startMs: 0,
      endMs: 1200,
      durationMs: 1200,
      label: 'Intro',
      group: undefined,
      sourceIndex: 1,
    },
    {
      id: 'later',
      startMs: 2400,
      endMs: 4200,
      durationMs: 1800,
      label: undefined,
      group: 'intro',
      sourceIndex: 0,
    },
  ]);
});

test('normalizeExports falls back to output when exports are missing', () => {
  const exportsList = normalizeExports(undefined, {
    path: 'exports/final.mp4',
    format: 'mp4',
  }, {
    baseDir: '/tmp/project',
  });

  assert.deepEqual(exportsList, [
    {
      path: '/tmp/project/exports/final.mp4',
      format: 'mp4',
      name: 'final',
      source: 'output',
    },
  ]);
});

test('normalizeExports resolves relative export paths and infers format', () => {
  const exportsList = normalizeExports([
    { path: 'exports/demo.webm', overwrite: true },
    { path: '/tmp/project/exports/demo.mp4', format: 'mp4' },
  ], null, {
    baseDir: '/tmp/project',
  });

  assert.deepEqual(exportsList, [
    {
      path: '/tmp/project/exports/demo.webm',
      format: 'webm',
      name: 'demo',
      overwrite: true,
      source: 'exports',
    },
    {
      path: '/tmp/project/exports/demo.mp4',
      format: 'mp4',
      name: 'demo',
      overwrite: false,
      source: 'exports',
    },
  ]);
});

test('loadBatchRenderManifest and planBatchRenderManifest normalize batch jobs', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-timeline-production-'));
  const manifestPath = path.join(tempDir, 'manifest.json');

  fs.writeFileSync(manifestPath, JSON.stringify({
    projectDir: 'projects',
    outputDir: 'renders',
    projects: [
      {
        name: 'demo',
        projectPath: 'demo.json',
        exports: [
          { path: 'demo.webm', format: 'webm' },
        ],
      },
      {
        projectPath: '/abs/projects/alpha.json',
        output: { path: 'alpha.mp4', format: 'mp4' },
      },
    ],
  }), 'utf8');

  const manifest = loadBatchRenderManifest(manifestPath);

  assert.equal(manifest.manifestPath, manifestPath);
  assert.equal(manifest.baseDir, tempDir);
  assert.equal(manifest.projectDir, path.join(tempDir, 'projects'));
  assert.equal(manifest.outputDir, path.join(tempDir, 'renders'));
  assert.equal(manifest.projects.length, 2);

  const plan = planBatchRenderManifest(manifest);

  assert.deepEqual(plan.jobs, [
    {
      name: 'demo',
      projectPath: path.join(tempDir, 'projects', 'demo.json'),
      exports: [
        {
          path: path.join(tempDir, 'renders', 'demo.webm'),
          format: 'webm',
          name: 'demo',
          overwrite: false,
          source: 'exports',
        },
      ],
    },
    {
      name: 'alpha.json',
      projectPath: '/abs/projects/alpha.json',
      exports: [
        {
          path: path.join(tempDir, 'renders', 'alpha.mp4'),
          format: 'mp4',
          name: 'alpha',
          source: 'output',
        },
      ],
    },
  ]);
});
