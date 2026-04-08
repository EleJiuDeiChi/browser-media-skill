#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function normalizeRect(rect) {
  if (!rect) {
    return null;
  }

  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

function createRecordedEvent(input) {
  return {
    type: input.type,
    atMs: input.atMs,
    selector: input.selector,
    label: input.label ?? null,
    url: input.url ?? null,
    viewport: input.viewport ?? null,
    rect: normalizeRect(input.rect),
    captureError: input.captureError ?? null,
  };
}

function deriveEventsPath(videoPath) {
  const resolvedPath = path.resolve(videoPath);
  return resolvedPath.replace(/\.[^.]+$/, '.events.json');
}

function writeEventsFile(eventsPath, payload) {
  fs.mkdirSync(path.dirname(path.resolve(eventsPath)), { recursive: true });
  fs.writeFileSync(eventsPath, JSON.stringify(payload, null, 2));
}

module.exports = {
  createRecordedEvent,
  deriveEventsPath,
  normalizeRect,
  writeEventsFile,
};
