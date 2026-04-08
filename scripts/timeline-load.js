#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const { normalizeProject } = require('./timeline-schema');

function loadProjectFile(projectPath) {
  const resolvedPath = path.resolve(projectPath);
  const raw = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  const project = normalizeProject(raw);
  project.__projectPath = resolvedPath;
  return project;
}

module.exports = {
  loadProjectFile,
};
