#!/usr/bin/env node

const test = require('node:test');
const assert = require('node:assert/strict');

const { validateProject } = require('./timeline-validate');

test('validateProject reports field path for invalid timeline range', () => {
  assert.throws(
    () => validateProject({
      version: 1,
      input: { video: '/tmp/in.mp4' },
      output: { path: '/tmp/out.mp4', format: 'mp4' },
      timeline: [
        {
          id: 'a',
          type: 'box',
          startMs: 10,
          endMs: 5,
          x: 0,
          y: 0,
          width: 10,
          height: 10,
        },
      ],
    }),
    /timeline\[0\]\.endMs/
  );
});

test('validateProject accepts a minimal valid project', () => {
  const project = validateProject({
    version: 1,
    input: { video: '/tmp/in.mp4' },
    output: { path: '/tmp/out.mp4', format: 'mp4' },
    timeline: [],
  });

  assert.equal(project.version, 1);
  assert.equal(project.output.format, 'mp4');
  assert.deepEqual(project.timeline, []);
});

test('validateProject accepts additive v1.1 motion and panel fields', () => {
  const project = validateProject({
    version: 1,
    input: { video: '/tmp/in.mp4' },
    output: { path: '/tmp/out.mp4', format: 'mp4' },
    theme: {
      textStyles: {
        title: { fontSize: 30, color: '#ff3b30' },
      },
    },
    exports: [{ path: '/tmp/out.webm', format: 'webm' }],
    segments: [{ id: 'intro', startMs: 0, endMs: 1000 }],
    timeline: [
      {
        id: 'panel-1',
        type: 'panel',
        startMs: 0,
        endMs: 1000,
        x: 100,
        y: 100,
        width: 300,
        height: 120,
        fadeInMs: 180,
        fadeOutMs: 200,
        slideFromX: 12,
        panelRadius: 16,
        panelPadding: 20,
        panelOpacity: 0.55,
        zIndex: 3,
        group: 'intro',
      },
    ],
  });

  assert.equal(project.timeline[0].type, 'panel');
  assert.equal(project.timeline[0].fadeInMs, 180);
  assert.equal(project.exports[0].format, 'webm');
  assert.equal(project.segments[0].id, 'intro');
  assert.equal(project.theme.textStyles.title.fontSize, 30);
});
