#!/usr/bin/env node

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildRenderPlan } = require('./timeline-render');

test('buildRenderPlan includes source input and compiled filters', async () => {
  const plan = await buildRenderPlan({
    version: 1,
    input: { video: '/tmp/in.mp4' },
    output: { path: '/tmp/out.mp4', format: 'mp4' },
    timeline: [
      {
        id: 'box-1',
        type: 'box',
        startMs: 0,
        endMs: 1000,
        x: 10,
        y: 10,
        width: 100,
        height: 80,
      },
    ],
    render: {
      videoCodec: 'libx264',
      pixelFormat: 'yuv420p',
      crf: 23,
      preset: 'medium',
    },
  }, {
    probeVideo: async () => ({ width: 1440, height: 900, fps: 25, duration: 5 }),
  });

  assert.equal(plan.inputs[0].path, '/tmp/in.mp4');
  assert.ok(plan.filterComplex.length > 0);
});

test('buildRenderPlan rounds overlay positions to whole pixels for stable text rendering', async () => {
  const plan = await buildRenderPlan({
    version: 1,
    input: { video: '/tmp/in.mp4' },
    output: { path: '/tmp/out.mp4', format: 'mp4' },
    timeline: [
      {
        id: 'text-1',
        type: 'text',
        startMs: 0,
        endMs: 1000,
        fadeInMs: 120,
        slideFromX: 12,
        x: 100,
        y: 40,
        text: 'Demo',
      },
    ],
    render: {
      videoCodec: 'libx264',
      pixelFormat: 'yuv420p',
      crf: 23,
      preset: 'medium',
    },
  }, {
    probeVideo: async () => ({ width: 1440, height: 900, fps: 25, duration: 5 }),
  });

  assert.match(plan.filterComplex, /overlay=x='round\(/);
  assert.match(plan.filterComplex, /:y='round\(/);
});
