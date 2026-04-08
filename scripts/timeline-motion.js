#!/usr/bin/env node

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp01(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

function seconds(ms) {
  return Number((ms / 1000).toFixed(3)).toString().replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

function normalizeEasing(easing) {
  return easing === 'easeOut' ? 'easeOut' : 'linear';
}

function normalizeMotion(item = {}, overrides = {}) {
  const motion = item.motion || {};
  return {
    startMs: toNumber(overrides.startMs ?? item.startMs ?? motion.startMs, 0),
    endMs: toNumber(overrides.endMs ?? item.endMs ?? motion.endMs, 0),
    fadeInMs: Math.max(0, toNumber(overrides.fadeInMs ?? item.fadeInMs ?? motion.fadeInMs, 0)),
    fadeOutMs: Math.max(0, toNumber(overrides.fadeOutMs ?? item.fadeOutMs ?? motion.fadeOutMs, 0)),
    slideInMs: Math.max(0, toNumber(overrides.slideInMs ?? item.slideInMs ?? motion.slideInMs, 0)),
    slideFromX: toNumber(overrides.slideFromX ?? item.slideFromX ?? motion.slideFromX, 0),
    slideFromY: toNumber(overrides.slideFromY ?? item.slideFromY ?? motion.slideFromY, 0),
    easing: normalizeEasing(overrides.easing ?? item.easing ?? motion.easing),
  };
}

function resolveSlideDurationMs(motion) {
  if (motion.slideInMs > 0) {
    return motion.slideInMs;
  }
  if (motion.fadeInMs > 0) {
    return motion.fadeInMs;
  }
  return Math.max(0, motion.endMs - motion.startMs);
}

function applyEasing(progress, easing = 'linear') {
  const normalized = clamp01(progress);
  if (easing === 'easeOut') {
    const additiveBump = normalized * (1 - normalized) * 0.25;
    return clamp01(normalized + additiveBump);
  }
  return normalized;
}

function applyEasingExpression(progressExpression, easing = 'linear') {
  const clamped = `min(1,max(0,(${progressExpression})))`;
  if (easing === 'easeOut') {
    return `min(1,max(0,(${clamped}) + ((${clamped})*(1-(${clamped}))*0.25)))`;
  }
  return clamped;
}

function rampUpValue(elapsedMs, fadeInMs, easing) {
  if (fadeInMs <= 0) {
    return 1;
  }
  return applyEasing(clamp01(elapsedMs / fadeInMs), easing);
}

function rampDownValue(remainingMs, fadeOutMs, easing) {
  if (fadeOutMs <= 0) {
    return 1;
  }
  return applyEasing(clamp01(remainingMs / fadeOutMs), easing);
}

function opacityAtMs(ms, item = {}, overrides = {}) {
  const motion = normalizeMotion(item, overrides);
  const durationMs = motion.endMs - motion.startMs;
  if (durationMs <= 0) {
    return 1;
  }
  if (ms < motion.startMs || ms > motion.endMs) {
    return 0;
  }

  const elapsedMs = ms - motion.startMs;
  const remainingMs = motion.endMs - ms;
  return Math.min(
    rampUpValue(elapsedMs, motion.fadeInMs, motion.easing),
    rampDownValue(remainingMs, motion.fadeOutMs, motion.easing)
  );
}

function buildOpacityExpression(item = {}, overrides = {}) {
  const motion = normalizeMotion(item, overrides);
  const start = seconds(motion.startMs);
  const end = seconds(motion.endMs);
  const durationMs = motion.endMs - motion.startMs;
  if (durationMs <= 0) {
    return '1';
  }
  if (motion.fadeInMs <= 0 && motion.fadeOutMs <= 0) {
    return `between(t,${start},${end})`;
  }

  const fadeInExpr = motion.fadeInMs > 0
    ? applyEasingExpression(`(t-${start})/${seconds(motion.fadeInMs)}`, motion.easing)
    : '1';
  const fadeOutExpr = motion.fadeOutMs > 0
    ? applyEasingExpression(`(${end}-t)/${seconds(motion.fadeOutMs)}`, motion.easing)
    : '1';

  return `if(lt(t,${start}),0,if(gt(t,${end}),0,min(${fadeInExpr},${fadeOutExpr})))`;
}

function slideAtMs(ms, baseValue, slideFromValue, item = {}, overrides = {}) {
  const motion = normalizeMotion(item, overrides);
  const durationMs = resolveSlideDurationMs(motion);
  if (durationMs <= 0) {
    return baseValue;
  }

  const progress = clamp01((ms - motion.startMs) / durationMs);
  const eased = applyEasing(progress, motion.easing);
  return baseValue + (slideFromValue * (1 - eased));
}

function buildSlideExpression(baseValue, slideFromValue, item = {}, overrides = {}) {
  const motion = normalizeMotion(item, overrides);
  const durationMs = resolveSlideDurationMs(motion);
  if (durationMs <= 0 || slideFromValue === 0) {
    return String(baseValue);
  }

  const progressExpression = `(${seconds(0)} + (t-${seconds(motion.startMs)})/${seconds(durationMs)})`;
  const easedProgress = applyEasingExpression(progressExpression, motion.easing);
  return `(${baseValue}) + (${slideFromValue}) * (1 - ${easedProgress})`;
}

function buildMotionExpressions(item = {}, overrides = {}) {
  const motion = normalizeMotion(item, overrides);
  const baseX = toNumber(overrides.baseX ?? item.x ?? 0, 0);
  const baseY = toNumber(overrides.baseY ?? item.y ?? 0, 0);

  return {
    motion,
    opacity: {
      numericAtMs: ms => opacityAtMs(ms, item, overrides),
      expression: buildOpacityExpression(item, overrides),
    },
    x: {
      numericAtMs: ms => slideAtMs(ms, baseX, motion.slideFromX, item, overrides),
      expression: buildSlideExpression(baseX, motion.slideFromX, item, overrides),
    },
    y: {
      numericAtMs: ms => slideAtMs(ms, baseY, motion.slideFromY, item, overrides),
      expression: buildSlideExpression(baseY, motion.slideFromY, item, overrides),
    },
  };
}

module.exports = {
  applyEasing,
  applyEasingExpression,
  buildMotionExpressions,
  buildOpacityExpression,
  buildSlideExpression,
  clamp01,
  normalizeMotion,
  opacityAtMs,
  resolveSlideDurationMs,
  seconds,
  slideAtMs,
};
