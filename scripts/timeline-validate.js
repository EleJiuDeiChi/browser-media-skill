#!/usr/bin/env node

const { SUPPORTED_OBJECT_TYPES, normalizeProject } = require('./timeline-schema');
const { TimelineError, resolveAbsolute } = require('./timeline-common');

function assertNumber(value, fieldPath) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TimelineError(fieldPath, 'must be a finite number');
  }
}

function assertPositive(value, fieldPath) {
  assertNumber(value, fieldPath);
  if (value <= 0) {
    throw new TimelineError(fieldPath, 'must be greater than 0');
  }
}

function assertString(value, fieldPath) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TimelineError(fieldPath, 'must be a non-empty string');
  }
}

function assertNonNegative(value, fieldPath) {
  assertNumber(value, fieldPath);
  if (value < 0) {
    throw new TimelineError(fieldPath, 'must be greater than or equal to 0');
  }
}

function validateMotionFields(item, prefix) {
  for (const field of ['fadeInMs', 'fadeOutMs', 'slideInMs']) {
    if (item[field] !== undefined) {
      assertNonNegative(item[field], `${prefix}.${field}`);
    }
  }
  for (const field of ['slideFromX', 'slideFromY', 'opacity']) {
    if (item[field] !== undefined) {
      assertNumber(item[field], `${prefix}.${field}`);
    }
  }
  if (item.opacity !== undefined && (item.opacity < 0 || item.opacity > 1)) {
    throw new TimelineError(`${prefix}.opacity`, 'must be between 0 and 1');
  }
  if (item.zIndex !== undefined) {
    assertNumber(item.zIndex, `${prefix}.zIndex`);
  }
  if (item.group !== undefined) {
    assertString(item.group, `${prefix}.group`);
  }
}

function validateRectLike(item, prefix) {
  assertNumber(item.x, `${prefix}.x`);
  assertNumber(item.y, `${prefix}.y`);
  assertPositive(item.width, `${prefix}.width`);
  assertPositive(item.height, `${prefix}.height`);
}

function validateTimelineItem(item, index) {
  const prefix = `timeline[${index}]`;
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw new TimelineError(prefix, 'must be an object');
  }
  assertString(item.id, `${prefix}.id`);
  assertString(item.type, `${prefix}.type`);
  if (!SUPPORTED_OBJECT_TYPES.has(item.type)) {
    throw new TimelineError(`${prefix}.type`, `unsupported object type "${item.type}"`);
  }

  assertNumber(item.startMs, `${prefix}.startMs`);
  assertNumber(item.endMs, `${prefix}.endMs`);
  if (item.endMs <= item.startMs) {
    throw new TimelineError(`${prefix}.endMs`, 'must be greater than startMs');
  }
  validateMotionFields(item, prefix);

  switch (item.type) {
    case 'box':
    case 'blur':
    case 'mask':
      validateRectLike(item, prefix);
      break;
    case 'panel':
      validateRectLike(item, prefix);
      if (item.panelRadius !== undefined) {
        assertNonNegative(item.panelRadius, `${prefix}.panelRadius`);
      }
      if (item.panelPadding !== undefined) {
        assertNonNegative(item.panelPadding, `${prefix}.panelPadding`);
      }
      if (item.panelOpacity !== undefined) {
        assertNumber(item.panelOpacity, `${prefix}.panelOpacity`);
        if (item.panelOpacity < 0 || item.panelOpacity > 1) {
          throw new TimelineError(`${prefix}.panelOpacity`, 'must be between 0 and 1');
        }
      }
      break;
    case 'text':
      assertNumber(item.x, `${prefix}.x`);
      assertNumber(item.y, `${prefix}.y`);
      if (item.text !== undefined) {
        assertString(item.text, `${prefix}.text`);
      }
      if (item.text === undefined && item.style === undefined) {
        throw new TimelineError(`${prefix}.text`, 'or style-backed content is required');
      }
      if (item.style !== undefined) {
        assertString(item.style, `${prefix}.style`);
      }
      break;
    case 'spotlight':
      validateRectLike(item, prefix);
      assertString(item.shape, `${prefix}.shape`);
      if (!['rect', 'roundRect'].includes(item.shape)) {
        throw new TimelineError(`${prefix}.shape`, `unsupported spotlight shape "${item.shape}"`);
      }
      if (item.cornerRadius !== undefined) {
        assertNonNegative(item.cornerRadius, `${prefix}.cornerRadius`);
      }
      if (item.feather !== undefined) {
        assertNonNegative(item.feather, `${prefix}.feather`);
      }
      break;
    case 'arrow':
      if (!Array.isArray(item.from) || item.from.length !== 2) {
        throw new TimelineError(`${prefix}.from`, 'must be a 2-item coordinate tuple');
      }
      if (!Array.isArray(item.to) || item.to.length !== 2) {
        throw new TimelineError(`${prefix}.to`, 'must be a 2-item coordinate tuple');
      }
      item.from.forEach((value, coordinateIndex) => assertNumber(value, `${prefix}.from[${coordinateIndex}]`));
      item.to.forEach((value, coordinateIndex) => assertNumber(value, `${prefix}.to[${coordinateIndex}]`));
      break;
    default:
      throw new TimelineError(`${prefix}.type`, `unsupported object type "${item.type}"`);
  }
}

function validateSegments(project) {
  if (!Array.isArray(project.segments)) {
    throw new TimelineError('segments', 'must be an array');
  }
  project.segments.forEach((segment, index) => {
    const prefix = `segments[${index}]`;
    if (!segment || typeof segment !== 'object' || Array.isArray(segment)) {
      throw new TimelineError(prefix, 'must be an object');
    }
    assertString(segment.id, `${prefix}.id`);
    assertNumber(segment.startMs, `${prefix}.startMs`);
    assertNumber(segment.endMs, `${prefix}.endMs`);
    if (segment.endMs <= segment.startMs) {
      throw new TimelineError(`${prefix}.endMs`, 'must be greater than startMs');
    }
  });
}

function validateExports(project) {
  if (!Array.isArray(project.exports)) {
    throw new TimelineError('exports', 'must be an array');
  }
  project.exports = project.exports.map((exportItem, index) => {
    const prefix = `exports[${index}]`;
    if (!exportItem || typeof exportItem !== 'object' || Array.isArray(exportItem)) {
      throw new TimelineError(prefix, 'must be an object');
    }
    assertString(exportItem.path, `${prefix}.path`);
    assertString(exportItem.format, `${prefix}.format`);
    return {
      ...exportItem,
      path: resolveAbsolute(exportItem.path, `${prefix}.path`),
    };
  });
}

function validateTheme(project) {
  if (project.theme.textStyles === undefined) {
    return;
  }
  if (!project.theme.textStyles || typeof project.theme.textStyles !== 'object' || Array.isArray(project.theme.textStyles)) {
    throw new TimelineError('theme.textStyles', 'must be an object');
  }
  for (const [styleName, styleValue] of Object.entries(project.theme.textStyles)) {
    const prefix = `theme.textStyles.${styleName}`;
    if (!styleValue || typeof styleValue !== 'object' || Array.isArray(styleValue)) {
      throw new TimelineError(prefix, 'must be an object');
    }
    if (styleValue.fontSize !== undefined) {
      assertPositive(styleValue.fontSize, `${prefix}.fontSize`);
    }
    if (styleValue.color !== undefined) {
      assertString(styleValue.color, `${prefix}.color`);
    }
  }
}

function validateProject(rawProject) {
  const project = normalizeProject(rawProject);
  if (project.version !== 1) {
    throw new TimelineError('version', 'must be 1');
  }

  if (!project.input || typeof project.input !== 'object') {
    throw new TimelineError('input', 'is required');
  }
  assertString(project.input.video, 'input.video');
  project.input.video = resolveAbsolute(project.input.video, 'input.video');

  if (project.input.width !== undefined) {
    assertPositive(project.input.width, 'input.width');
  }
  if (project.input.height !== undefined) {
    assertPositive(project.input.height, 'input.height');
  }
  if (project.input.fps !== undefined) {
    assertPositive(project.input.fps, 'input.fps');
  }

  if (!project.output || typeof project.output !== 'object') {
    throw new TimelineError('output', 'is required');
  }
  assertString(project.output.path, 'output.path');
  project.output.path = resolveAbsolute(project.output.path, 'output.path');
  assertString(project.output.format, 'output.format');

  validateTheme(project);
  validateSegments(project);
  validateExports(project);

  if (!Array.isArray(project.timeline)) {
    throw new TimelineError('timeline', 'must be an array');
  }
  project.timeline.forEach(validateTimelineItem);

  return project;
}

module.exports = {
  validateProject,
};
