#!/usr/bin/env node

const DEFAULT_FOCUS_DIMMING = 0.72;
const DEFAULT_FOCUS_SOFTNESS = 0;
const DEFAULT_FOCUS_FEATHER = 0;

function seconds(ms) {
  return Number((ms / 1000).toFixed(3)).toString().replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

function timeExpression(startMs, endMs) {
  return `between(t,${seconds(startMs)},${seconds(endMs)})`;
}

function resolveShape(shape) {
  return shape === 'roundRect' ? 'roundRect' : 'rect';
}

function resolveNumber(primary, fallback, defaultValue) {
  if (primary !== undefined) {
    return primary;
  }
  if (fallback !== undefined) {
    return fallback;
  }
  return defaultValue;
}

function normalizeFocusTarget(raw = {}, options = {}) {
  const shape = resolveShape(raw.shape ?? options.shape);
  const cornerRadius = shape === 'roundRect'
    ? resolveNumber(raw.cornerRadius, options.cornerRadius, 0)
    : undefined;

  return {
    id: raw.id,
    type: raw.type || 'spotlight',
    startMs: resolveNumber(raw.startMs, options.startMs, 0),
    endMs: resolveNumber(raw.endMs, options.endMs, 0),
    x: resolveNumber(raw.x, options.x, 0),
    y: resolveNumber(raw.y, options.y, 0),
    width: resolveNumber(raw.width, options.width, 0),
    height: resolveNumber(raw.height, options.height, 0),
    shape,
    cornerRadius,
    dimming: resolveNumber(raw.dimming, options.dimming, DEFAULT_FOCUS_DIMMING),
    feather: resolveNumber(raw.feather, options.feather, DEFAULT_FOCUS_FEATHER),
    softness: resolveNumber(raw.softness, options.softness, DEFAULT_FOCUS_SOFTNESS),
    color: raw.color ?? options.color,
    compatibility: {
      legacyShape: 'rect',
      shouldFlattenForLegacyRenderer: shape === 'roundRect',
      usesRoundedCorners: shape === 'roundRect',
    },
  };
}

function buildFocusPlan(rawFocus = {}, videoMeta = {}, options = {}) {
  const focus = normalizeFocusTarget(rawFocus, options);
  const frameWidth = resolveNumber(videoMeta.width, options.width, 1440);
  const frameHeight = resolveNumber(videoMeta.height, options.height, 900);
  return {
    focus,
    frame: {
      width: frameWidth,
      height: frameHeight,
    },
    bounds: {
      left: focus.x,
      top: focus.y,
      right: focus.x + focus.width,
      bottom: focus.y + focus.height,
    },
    enable: timeExpression(focus.startMs, focus.endMs),
  };
}

function buildFocusFilterPlan(rawFocus = {}, videoMeta = {}, options = {}) {
  const plan = buildFocusPlan(rawFocus, videoMeta, options);
  const color = `black@${plan.focus.dimming}`;
  const { left, top, right, bottom } = plan.bounds;
  const filters = [];

  if (left > 0) {
    filters.push({
      kind: 'dim-box',
      edge: 'left',
      x: 0,
      y: 0,
      width: left,
      height: plan.frame.height,
      color,
      enable: plan.enable,
    });
  }

  if (top > 0) {
    filters.push({
      kind: 'dim-box',
      edge: 'top',
      x: plan.focus.x,
      y: 0,
      width: plan.focus.width,
      height: top,
      color,
      enable: plan.enable,
    });
  }

  if (right < plan.frame.width) {
    filters.push({
      kind: 'dim-box',
      edge: 'right',
      x: right,
      y: 0,
      width: plan.frame.width - right,
      height: plan.frame.height,
      color,
      enable: plan.enable,
    });
  }

  if (bottom < plan.frame.height) {
    filters.push({
      kind: 'dim-box',
      edge: 'bottom',
      x: plan.focus.x,
      y: bottom,
      width: plan.focus.width,
      height: plan.frame.height - bottom,
      color,
      enable: plan.enable,
    });
  }

  return {
    ...plan,
    color,
    filters,
  };
}

module.exports = {
  DEFAULT_FOCUS_DIMMING,
  DEFAULT_FOCUS_FEATHER,
  DEFAULT_FOCUS_SOFTNESS,
  buildFocusFilterPlan,
  buildFocusPlan,
  normalizeFocusTarget,
  seconds,
  timeExpression,
};
