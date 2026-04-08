#!/usr/bin/env node

const path = require('node:path');

class TimelineError extends Error {
  constructor(fieldPath, message) {
    super(fieldPath ? `${fieldPath}: ${message}` : message);
    this.name = 'TimelineError';
    this.fieldPath = fieldPath;
  }
}

function requireArg(args, name, displayName = name) {
  if (!args[name]) {
    throw new TimelineError(displayName, 'is required');
  }
  return args[name];
}

function parseCliArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

function resolveAbsolute(inputPath, fieldPath) {
  if (!path.isAbsolute(inputPath)) {
    throw new TimelineError(fieldPath, 'must be an absolute path');
  }
  return path.resolve(inputPath);
}

module.exports = {
  TimelineError,
  parseCliArgs,
  requireArg,
  resolveAbsolute,
};
