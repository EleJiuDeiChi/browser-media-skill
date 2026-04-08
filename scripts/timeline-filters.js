#!/usr/bin/env node

function seconds(ms) {
  return Number((ms / 1000).toFixed(3)).toString().replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

function timeExpression(startMs, endMs) {
  return `between(t,${seconds(startMs)},${seconds(endMs)})`;
}

function escapeText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/,/g, '\\,');
}

function normalizeColor(color, fallback) {
  return color || fallback;
}

function compileBoxFilter(item) {
  return `drawbox=x=${item.x}:y=${item.y}:w=${item.width}:h=${item.height}:color=${normalizeColor(item.strokeColor, '#ff3b30')}:t=${item.strokeWidth || 4}:enable='${timeExpression(item.startMs, item.endMs)}'`;
}

function compileTextFilter(item, theme = {}) {
  const fontFamily = item.fontFamily || theme.fontFamily || 'Arial';
  const fontSize = item.fontSize || 28;
  const color = normalizeColor(item.color, theme.accentColor || '#ff3b30');
  return `drawtext=text='${escapeText(item.text)}':x=${item.x}:y=${item.y}:fontsize=${fontSize}:fontcolor=${color}:font='${escapeText(fontFamily)}':enable='${timeExpression(item.startMs, item.endMs)}'`;
}

function compileMaskFilter(item) {
  const color = normalizeColor(item.color, '#000000');
  const opacity = item.opacity ?? 0.72;
  return `drawbox=x=${item.x}:y=${item.y}:w=${item.width}:h=${item.height}:color=${color}@${opacity}:t=fill:enable='${timeExpression(item.startMs, item.endMs)}'`;
}

function compileSpotlightFilter(item, videoMeta = {}) {
  const frameWidth = videoMeta.width || 1440;
  const frameHeight = videoMeta.height || 900;
  const dimming = item.dimming ?? 0.72;
  const enable = timeExpression(item.startMs, item.endMs);
  const color = `black@${dimming}`;

  const left = item.x;
  const rightX = item.x + item.width;
  const top = item.y;
  const bottomY = item.y + item.height;
  const filters = [];

  if (left > 0) {
    filters.push(`drawbox=x=0:y=0:w=${left}:h=${frameHeight}:color=${color}:t=fill:enable='${enable}'`);
  }
  if (top > 0) {
    filters.push(`drawbox=x=${item.x}:y=0:w=${item.width}:h=${top}:color=${color}:t=fill:enable='${enable}'`);
  }
  if (rightX < frameWidth) {
    filters.push(`drawbox=x=${rightX}:y=0:w=${frameWidth - rightX}:h=${frameHeight}:color=${color}:t=fill:enable='${enable}'`);
  }
  if (bottomY < frameHeight) {
    filters.push(`drawbox=x=${item.x}:y=${bottomY}:w=${item.width}:h=${frameHeight - bottomY}:color=${color}:t=fill:enable='${enable}'`);
  }

  return filters.join(',');
}

function compileTimelineObject(item, options = {}) {
  switch (item.type) {
    case 'box':
      return compileBoxFilter(item);
    case 'text':
      return compileTextFilter(item, options.theme);
    case 'mask':
      return compileMaskFilter(item);
    case 'spotlight':
      return compileSpotlightFilter(item, options.videoMeta);
    default:
      throw new Error(`compileTimelineObject does not support ${item.type}`);
  }
}

module.exports = {
  compileTimelineObject,
  compileSpotlightFilter,
  seconds,
  timeExpression,
};
