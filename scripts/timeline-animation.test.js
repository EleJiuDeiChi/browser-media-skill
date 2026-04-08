#!/usr/bin/env node

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyEasing,
  buildMotionExpressions,
  buildOpacityExpression,
  buildSlideExpression,
  normalizeMotion,
  opacityAtMs,
  seconds,
  slideAtMs,
} = require('./timeline-motion');

test('normalizeMotion merges top-level and nested motion settings', () => {
  const motion = normalizeMotion({
    startMs: 100,
    motion: {
      endMs: 900,
      fadeInMs: 120,
      fadeOutMs: 240,
      slideFromX: -32,
      slideFromY: 18,
      easing: 'easeOut',
    },
  });

  assert.deepEqual(motion, {
    startMs: 100,
    endMs: 900,
    fadeInMs: 120,
    fadeOutMs: 240,
    slideInMs: 0,
    slideFromX: -32,
    slideFromY: 18,
    easing: 'easeOut',
  });
});

test('applyEasing keeps linear deterministic and easeOut additive', () => {
  assert.equal(applyEasing(0.5, 'linear'), 0.5);
  assert.equal(applyEasing(0.5, 'easeOut'), 0.5625);
});

test('opacityAtMs ramps in, holds, and ramps out', () => {
  const item = {
    startMs: 1000,
    endMs: 2000,
    fadeInMs: 250,
    fadeOutMs: 250,
    easing: 'linear',
  };

  assert.equal(opacityAtMs(1000, item), 0);
  assert.equal(opacityAtMs(1125, item), 0.5);
  assert.equal(opacityAtMs(1500, item), 1);
  assert.equal(opacityAtMs(1900, item), 0.4);
  assert.equal(opacityAtMs(2100, item), 0);
});

test('slideAtMs interpolates from the configured offset to the base position', () => {
  const item = {
    startMs: 0,
    endMs: 1000,
    slideFromX: -80,
    slideFromY: 24,
    easing: 'linear',
  };

  assert.equal(slideAtMs(0, 400, item.slideFromX, item), 320);
  assert.equal(slideAtMs(500, 400, item.slideFromX, item), 360);
  assert.equal(slideAtMs(1000, 400, item.slideFromX, item), 400);
});

test('slideAtMs finishes movement after fadeInMs and stops drifting', () => {
  const item = {
    startMs: 1000,
    endMs: 3000,
    fadeInMs: 200,
    slideFromX: 12,
    easing: 'linear',
  };

  assert.equal(slideAtMs(1000, 988, item.slideFromX, item), 1000);
  assert.equal(slideAtMs(1100, 988, item.slideFromX, item), 994);
  assert.equal(slideAtMs(1200, 988, item.slideFromX, item), 988);
  assert.equal(slideAtMs(2000, 988, item.slideFromX, item), 988);
});

test('buildOpacityExpression emits an additive easing envelope', () => {
  const expression = buildOpacityExpression({
    startMs: 500,
    endMs: 1500,
    fadeInMs: 250,
    fadeOutMs: 300,
    easing: 'easeOut',
  });

  assert.match(expression, /if\(lt\(t,0\.5\),0,if\(gt\(t,1\.5\),0,min\(/);
  assert.match(expression, /\*0\.25/);
  assert.match(expression, /min\(1,max\(0,/);
});

test('buildSlideExpression returns a deterministic FFmpeg x/y expression', () => {
  const xExpression = buildSlideExpression(640, -120, {
    startMs: 0,
    endMs: 2000,
    easing: 'linear',
  });
  const yExpression = buildSlideExpression(360, 48, {
    startMs: 0,
    endMs: 2000,
    easing: 'easeOut',
  });

  assert.equal(xExpression, '(640) + (-120) * (1 - min(1,max(0,((0 + (t-0)/2)))))');
  assert.match(yExpression, /\(360\) \+ \(48\) \* \(1 - min\(1,max\(0,/);
  assert.match(yExpression, /\*0\.25/);
});

test('buildSlideExpression clamps movement to the slide-in window', () => {
  const xExpression = buildSlideExpression(988, 12, {
    startMs: 1.24 * 1000,
    endMs: 2.36 * 1000,
    fadeInMs: 160,
  });

  assert.match(xExpression, /\/0\.16/);
  assert.doesNotMatch(xExpression, /\/1\.12/);
});

test('buildMotionExpressions packages numeric evaluators and expressions together', () => {
  const motion = buildMotionExpressions({
    x: 200,
    y: 100,
    startMs: 0,
    endMs: 1000,
    fadeInMs: 100,
    fadeOutMs: 200,
    slideFromX: -40,
    slideFromY: 20,
    easing: 'linear',
  });

  assert.equal(motion.opacity.numericAtMs(100), 1);
  assert.equal(motion.x.numericAtMs(0), 160);
  assert.equal(motion.y.numericAtMs(1000), 100);
  assert.match(motion.opacity.expression, /between|if\(/);
  assert.match(motion.x.expression, /\(200\) \+ \(-40\)/);
  assert.match(motion.y.expression, /\(100\) \+ \(20\)/);
});

test('seconds formats millisecond values for ffmpeg expressions', () => {
  assert.equal(seconds(250), '0.25');
  assert.equal(seconds(1000), '1');
});
