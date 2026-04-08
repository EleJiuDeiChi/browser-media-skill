#!/usr/bin/env node

const SUPPORTED_OBJECT_TYPES = new Set([
  'box',
  'text',
  'arrow',
  'spotlight',
  'blur',
  'mask',
  'panel',
]);

const DEFAULT_THEME = {
  fontFamily: 'Arial',
  textColor: '#ffffff',
  accentColor: '#ff3b30',
  dimColor: '#000000b3',
  textStyles: {},
};

const DEFAULT_RENDER = {
  videoCodec: 'libx264',
  pixelFormat: 'yuv420p',
  crf: 23,
  preset: 'medium',
};

function normalizeProject(rawProject) {
  const project = rawProject || {};
  return {
    version: project.version,
    input: {
      ...(project.input || {}),
    },
    output: {
      format: 'mp4',
      ...(project.output || {}),
    },
    exports: Array.isArray(project.exports) ? project.exports : [],
    segments: Array.isArray(project.segments) ? project.segments : [],
    theme: {
      ...DEFAULT_THEME,
      ...(project.theme || {}),
      textStyles: {
        ...(DEFAULT_THEME.textStyles || {}),
        ...((project.theme && project.theme.textStyles) || {}),
      },
    },
    timeline: Array.isArray(project.timeline) ? project.timeline : [],
    render: {
      ...DEFAULT_RENDER,
      ...(project.render || {}),
    },
  };
}

module.exports = {
  DEFAULT_RENDER,
  DEFAULT_THEME,
  SUPPORTED_OBJECT_TYPES,
  normalizeProject,
};
