#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

function compareTimelineItemsByZIndex(left, right) {
  const leftZ = left.zIndex ?? 0;
  const rightZ = right.zIndex ?? 0;
  if (leftZ !== rightZ) {
    return leftZ - rightZ;
  }
  if ((left.startMs ?? 0) !== (right.startMs ?? 0)) {
    return (left.startMs ?? 0) - (right.startMs ?? 0);
  }
  return 0;
}

function sortTimelineItemsByZIndex(timeline = []) {
  return [...timeline].sort(compareTimelineItemsByZIndex);
}

function normalizeSegments(segments = []) {
  return [...segments]
    .map((segment, sourceIndex) => ({
      id: segment.id,
      startMs: segment.startMs,
      endMs: segment.endMs,
      durationMs: (segment.endMs ?? 0) - (segment.startMs ?? 0),
      label: segment.label,
      group: segment.group,
      sourceIndex,
    }))
    .sort((left, right) => {
      if (left.startMs !== right.startMs) {
        return left.startMs - right.startMs;
      }
      return left.sourceIndex - right.sourceIndex;
    });
}

function inferFormatFromPath(targetPath, fallback = 'mp4') {
  const extension = path.extname(targetPath).replace(/^\./, '').toLowerCase();
  return extension || fallback;
}

function inferNameFromPath(targetPath) {
  return path.basename(targetPath, path.extname(targetPath));
}

function normalizeExports(exportsList, output, options = {}) {
  const baseDir = options.baseDir || process.cwd();
  if (!exportsList || exportsList.length === 0) {
    if (!output) {
      return [];
    }
    const outputPath = path.isAbsolute(output.path) ? output.path : path.resolve(baseDir, output.path);
    return [{
      path: outputPath,
      format: output.format || inferFormatFromPath(outputPath),
      name: inferNameFromPath(outputPath),
      source: 'output',
    }];
  }

  return exportsList.map((exportEntry) => {
    const targetPath = path.isAbsolute(exportEntry.path)
      ? exportEntry.path
      : path.resolve(baseDir, exportEntry.path);
    return {
      path: targetPath,
      format: exportEntry.format || inferFormatFromPath(targetPath),
      name: inferNameFromPath(targetPath),
      overwrite: Boolean(exportEntry.overwrite),
      source: 'exports',
    };
  });
}

function loadBatchRenderManifest(manifestPath) {
  const resolvedManifestPath = path.resolve(manifestPath);
  const manifest = JSON.parse(fs.readFileSync(resolvedManifestPath, 'utf8'));
  if (!Array.isArray(manifest.projects)) {
    throw new Error('manifest.projects must be an array');
  }

  const baseDir = path.dirname(resolvedManifestPath);
  const projectDir = manifest.projectDir
    ? path.resolve(baseDir, manifest.projectDir)
    : baseDir;
  const outputDir = manifest.outputDir
    ? path.resolve(baseDir, manifest.outputDir)
    : baseDir;

  return {
    manifestPath: resolvedManifestPath,
    baseDir,
    projectDir,
    outputDir,
    projects: manifest.projects,
  };
}

function planBatchRenderManifest(manifest) {
  return {
    jobs: manifest.projects.map((entry) => {
      const projectPath = path.isAbsolute(entry.projectPath)
        ? entry.projectPath
        : path.resolve(manifest.projectDir, entry.projectPath);
      const output = entry.output
        ? {
          ...entry.output,
          path: path.isAbsolute(entry.output.path)
            ? entry.output.path
            : path.resolve(manifest.outputDir, entry.output.path),
        }
        : null;
      const exportsList = normalizeExports(entry.exports, output, {
        baseDir: manifest.outputDir,
      });

      return {
        name: entry.name || path.basename(projectPath),
        projectPath,
        exports: exportsList,
      };
    }),
  };
}

function loadBatchManifest(manifestPath) {
  return loadBatchRenderManifest(manifestPath).projects;
}

module.exports = {
  compareTimelineItemsByZIndex,
  loadBatchManifest,
  loadBatchRenderManifest,
  normalizeExports,
  normalizeSegments,
  planBatchRenderManifest,
  sortTimelineItemsByZIndex,
  sortTimelineObjects: sortTimelineItemsByZIndex,
};
