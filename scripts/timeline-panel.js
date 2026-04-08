#!/usr/bin/env node

function getDefaultTextStyles() {
  return {
    step: { fontSize: 22, color: '#ffd166' },
    title: { fontSize: 30, color: '#ff8c69' },
    body: { fontSize: 26, color: '#ffffff' },
    caption: { fontSize: 20, color: '#d9e2f2' },
  };
}

function resolveTextStyle(theme = {}, styleName, explicit = {}) {
  const styles = {
    ...getDefaultTextStyles(),
    ...(theme.textStyles || {}),
  };
  return {
    ...(styles[styleName] || {}),
    ...explicit,
  };
}

function normalizePanel(item) {
  return {
    ...item,
    panelRadius: item.panelRadius ?? 18,
    panelPadding: item.panelPadding ?? 18,
    panelOpacity: item.panelOpacity ?? 0.58,
    fillColor: item.fillColor || '#0b1620',
  };
}

function panelToMaskObject(item) {
  const panel = normalizePanel(item);
  return {
    ...panel,
    type: 'mask',
    color: panel.fillColor,
    opacity: panel.panelOpacity,
  };
}

module.exports = {
  getDefaultTextStyles,
  normalizePanel,
  panelToMaskObject,
  resolveTextStyle,
};
