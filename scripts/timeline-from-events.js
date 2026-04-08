#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

function loadEventsFile(eventsPath) {
  return JSON.parse(fs.readFileSync(path.resolve(eventsPath), 'utf8'));
}

function deriveCaption(event) {
  if (event.label) {
    return event.label;
  }
  if (event.selector && event.selector.startsWith('text=')) {
    return event.selector.slice(5);
  }
  return event.selector || event.type;
}

function deriveOutputPath(videoPath) {
  const resolvedPath = path.resolve(videoPath);
  return resolvedPath.replace(/\.[^.]+$/, '.generated.mp4');
}

function compileClickEvent(event, index, nextEvent) {
  const padding = 12;
  const defaultEndMs = event.atMs + 120;
  let endMs = defaultEndMs;
  let fadeOutMs;

  if (nextEvent && nextEvent.type === 'click' && nextEvent.url && event.url && nextEvent.url !== event.url) {
    endMs = Math.min(defaultEndMs, nextEvent.atMs - 120);
    fadeOutMs = 120;
  }

  return {
    id: `click-${index + 1}`,
    type: 'box',
    startMs: Math.max(0, event.atMs - 600),
    endMs,
    x: event.rect.x - padding,
    y: event.rect.y - padding,
    width: event.rect.width + (padding * 2),
    height: event.rect.height + (padding * 2),
    caption: deriveCaption(event),
    ...(fadeOutMs !== undefined ? { fadeOutMs } : {}),
  };
}

function compileTimelineFromEvents(eventLog, options = {}) {
  const projectPath = path.resolve(options.projectPath);
  const clickEvents = (eventLog.events || []).filter(event => event.type === 'click' && event.rect);
  const viewport = eventLog.viewport || {};

  return {
    version: 1,
    input: {
      video: options.videoPath,
      ...(viewport.width ? { width: viewport.width } : {}),
      ...(viewport.height ? { height: viewport.height } : {}),
    },
    output: {
      path: deriveOutputPath(options.videoPath),
      format: 'mp4',
    },
    timeline: clickEvents.map((event, index) => compileClickEvent(event, index, clickEvents[index + 1])),
  };
}

function writeGeneratedProject(projectPath, project) {
  fs.mkdirSync(path.dirname(path.resolve(projectPath)), { recursive: true });
  fs.writeFileSync(projectPath, JSON.stringify(project, null, 2));
}

module.exports = {
  compileTimelineFromEvents,
  deriveCaption,
  loadEventsFile,
  writeGeneratedProject,
};
