#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { validateProject } = require('./timeline-validate');
const { seconds, timeExpression } = require('./timeline-filters');
const { buildArrowOverlaySpec, renderArrowOverlay } = require('./timeline-overlay-arrow');
const { buildTextOverlaySpec, renderTextOverlay } = require('./timeline-overlay-text');
const { buildShapeOverlaySpec, renderShapeOverlay } = require('./timeline-overlay-shape');
const { probeVideo, runFfmpeg } = require('./timeline-ffmpeg');
const { buildMotionExpressions } = require('./timeline-motion');
const { resolveTextStyle } = require('./timeline-panel');
const {
  loadBatchRenderManifest,
  normalizeExports,
  planBatchRenderManifest,
  sortTimelineItemsByZIndex,
} = require('./timeline-production');

function ensureDirectory(targetPath) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
}

function buildBlurFilter(item, currentLabel, nextLabel, index) {
  const blurLabel = `blur_${index}`;
  const cropLabel = `crop_${index}`;
  const baseLabel = `base_${index}`;
  const enable = timeExpression(item.startMs, item.endMs);
  const strength = item.strength || 12;
  return {
    inputs: [],
    segments: [
      `[${currentLabel}]split[${baseLabel}][${blurLabel}]`,
      `[${blurLabel}]crop=${item.width}:${item.height}:${item.x}:${item.y},boxblur=${strength}:${strength}[${cropLabel}]`,
      `[${baseLabel}][${cropLabel}]overlay=${item.x}:${item.y}:enable='${enable}'[${nextLabel}]`,
    ],
  };
}

function isOverlayItem(item) {
  return ['arrow', 'text', 'box', 'mask', 'panel', 'spotlight'].includes(item.type);
}

function buildOverlaySpec(item, project, videoMeta, workdir) {
  if (item.type === 'arrow') {
    return {
      kind: 'arrow',
      ...buildArrowOverlaySpec(workdir, item, videoMeta),
    };
  }

  if (item.type === 'text') {
    const styleOverrides = item.style ? resolveTextStyle(project.theme, item.style, item) : item;
    return {
      kind: 'text',
      ...buildTextOverlaySpec(workdir, {
        ...item,
        ...styleOverrides,
      }, project.theme, videoMeta),
    };
  }

  return {
    kind: 'shape',
    ...buildShapeOverlaySpec(workdir, item, project.theme, videoMeta),
  };
}

function buildOverlayFilterSegments(item, inputIndex, currentLabel, nextLabel, stageIndex, videoMeta) {
  const loopLabel = `ovloop_${stageIndex}`;
  const preparedLabel = `ovprep_${stageIndex}`;
  const motionLabel = `ovmotion_${stageIndex}`;
  const duration = seconds(Math.ceil((videoMeta.duration || 0) * 1000));
  const motion = buildMotionExpressions({
    ...item,
    x: 0,
    y: 0,
  }, {
    baseX: 0,
    baseY: 0,
  });

  const segments = [
    `[${inputIndex}:v]loop=loop=-1:size=1:start=0,trim=duration=${duration},setpts=N/FRAME_RATE/TB,format=rgba[${loopLabel}]`,
  ];

  const fadeSteps = [];
  if (motion.motion.fadeInMs > 0) {
    fadeSteps.push(`fade=t=in:st=${seconds(item.startMs)}:d=${seconds(motion.motion.fadeInMs)}:alpha=1`);
  }
  if (motion.motion.fadeOutMs > 0) {
    const outStartMs = Math.max(item.startMs, item.endMs - motion.motion.fadeOutMs);
    fadeSteps.push(`fade=t=out:st=${seconds(outStartMs)}:d=${seconds(motion.motion.fadeOutMs)}:alpha=1`);
  }

  if (fadeSteps.length > 0) {
    segments.push(`[${loopLabel}]${fadeSteps.join(',')}[${preparedLabel}]`);
  }

  const overlayInputLabel = fadeSteps.length > 0 ? preparedLabel : loopLabel;
  const xExpression = `round(${motion.x.expression})`;
  const yExpression = `round(${motion.y.expression})`;

  segments.push(`[${currentLabel}][${overlayInputLabel}]overlay=x='${xExpression}':y='${yExpression}':enable='${timeExpression(item.startMs, item.endMs)}'[${nextLabel}]`);
  return segments;
}

function buildPlanFromObjects(project, videoMeta, workdir) {
  const inputs = [{ path: project.input.video }];
  const segments = [];
  let currentLabel = '0:v';
  let nextInputIndex = 1;
  let stageIndex = 0;
  const sortedTimeline = sortTimelineItemsByZIndex(project.timeline);

  for (const item of sortedTimeline) {
    const nextLabel = `v${stageIndex + 1}`;
    if (isOverlayItem(item)) {
      const spec = buildOverlaySpec(item, project, videoMeta, workdir);
      inputs.push({ path: spec.outputPath, spec });
      segments.push(...buildOverlayFilterSegments(item, nextInputIndex, currentLabel, nextLabel, stageIndex, videoMeta));
      currentLabel = nextLabel;
      nextInputIndex += 1;
      stageIndex += 1;
      continue;
    }

    if (item.type === 'blur') {
      const blurPlan = buildBlurFilter(item, currentLabel, nextLabel, stageIndex);
      segments.push(...blurPlan.segments);
      currentLabel = nextLabel;
      stageIndex += 1;
      continue;
    }
  }

  return {
    inputs,
    filterComplex: segments.join(';'),
    finalLabel: currentLabel,
  };
}

async function buildRenderPlan(rawProject, deps = {}) {
  const probe = deps.probeVideo || probeVideo;
  const project = validateProject(rawProject);
  const videoMeta = await probe(project.input.video);
  const workdir = deps.workdir || fs.mkdtempSync(path.join(os.tmpdir(), 'browser-timeline-'));
  const compiled = buildPlanFromObjects(project, videoMeta, workdir);

  return {
    project,
    videoMeta,
    workdir,
    inputs: compiled.inputs,
    filterComplex: compiled.filterComplex,
    finalLabel: compiled.finalLabel,
  };
}

function renderArrowInputs(plan) {
  for (const input of plan.inputs.slice(1)) {
    if (input.spec.kind === 'text') {
      renderTextOverlay(input.spec);
      continue;
    }
    if (input.spec.kind === 'shape') {
      renderShapeOverlay(input.spec);
      continue;
    }
    renderArrowOverlay(input.spec);
  }
}

function buildFfmpegArgs(plan, outputTarget, overwrite = false) {
  const outputPath = typeof outputTarget === 'string' ? outputTarget : outputTarget.path;
  const outputFormat = typeof outputTarget === 'string' ? path.extname(outputPath).replace(/^\./, '').toLowerCase() : outputTarget.format;
  const args = [];
  if (overwrite) {
    args.push('-y');
  } else {
    args.push('-n');
  }

  for (const input of plan.inputs) {
    args.push('-i', input.path);
  }

  if (plan.filterComplex) {
    args.push('-filter_complex', plan.filterComplex, '-map', `[${plan.finalLabel}]`);
  } else {
    args.push('-map', '0:v');
  }

  args.push(
    '-c:v',
    outputFormat === 'webm' ? 'libvpx-vp9' : plan.project.render.videoCodec
  );
  if (outputFormat === 'webm') {
    args.push('-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', String(plan.project.render.crf));
  } else {
    args.push(
      '-pix_fmt',
      plan.project.render.pixelFormat,
      '-crf',
      String(plan.project.render.crf),
      '-preset',
      plan.project.render.preset,
      '-movflags',
      '+faststart'
    );
  }
  args.push(outputPath);
  return args;
}

async function renderProjectExports(rawProject, options = {}, deps = {}) {
  const plan = await buildRenderPlan(rawProject, deps);
  const exportsList = normalizeExports(plan.project.exports, options.out ? {
    ...plan.project.output,
    path: options.out,
  } : plan.project.output, {
    baseDir: path.dirname(plan.project.__projectPath || plan.project.output.path),
  });

  renderArrowInputs(plan);
  const run = deps.runFfmpeg || runFfmpeg;
  const verifyProbe = deps.probeVideo || probeVideo;
  const outputs = [];

  for (const exportTarget of exportsList) {
    if (fs.existsSync(exportTarget.path) && !(options.overwrite || exportTarget.overwrite)) {
      throw new Error(`Output already exists: ${exportTarget.path}`);
    }
    ensureDirectory(exportTarget.path);
    const args = buildFfmpegArgs(plan, exportTarget, Boolean(options.overwrite || exportTarget.overwrite));
    run(args, deps);
    const rendered = await verifyProbe(exportTarget.path);
    if (!rendered.width || !rendered.height) {
      throw new Error(`Rendered output is invalid: ${exportTarget.path}`);
    }
    outputs.push(exportTarget.path);
  }

  return outputs;
}

async function renderProject(rawProject, options = {}, deps = {}) {
  const outputs = await renderProjectExports(rawProject, options, deps);
  return outputs[0];
}

async function renderBatchManifest(manifestPath, options = {}, deps = {}) {
  const manifest = loadBatchRenderManifest(manifestPath);
  const plan = planBatchRenderManifest(manifest);
  const outputs = [];

  for (const job of plan.jobs) {
    const rawProject = JSON.parse(fs.readFileSync(job.projectPath, 'utf8'));
    rawProject.output = job.exports[0];
    rawProject.exports = job.exports;
    rawProject.__projectPath = job.projectPath;
    const rendered = await renderProjectExports(rawProject, options, deps);
    outputs.push({
      name: job.name,
      projectPath: job.projectPath,
      outputs: rendered,
    });
  }

  return outputs;
}

module.exports = {
  buildBlurFilter,
  buildFfmpegArgs,
  buildRenderPlan,
  renderBatchManifest,
  renderProject,
  renderProjectExports,
};
