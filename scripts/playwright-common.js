#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { createRequire } = require('module');
const { createRecordedEvent, normalizeRect } = require('./recording-events');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function requirePlaywright() {
  try {
    return require('playwright');
  } catch (localError) {
    const npmRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
    const globalRequire = createRequire(path.join(npmRoot, 'package.json'));
    return globalRequire('playwright');
  }
}

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
}

function parseViewport(raw) {
  if (!raw) {
    return { width: 1440, height: 900 };
  }
  const match = /^(\d+)x(\d+)$/.exec(raw);
  if (!match) {
    throw new Error(`Invalid --viewport value: ${raw}`);
  }
  return { width: Number(match[1]), height: Number(match[2]) };
}

function boolFlag(value) {
  if (value === undefined) {
    return false;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return ['1', 'true', 'yes'].includes(String(value).toLowerCase());
}

function intFlag(value, defaultValue) {
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric value: ${value}`);
  }
  return parsed;
}

function browserType(playwright, browserName) {
  const normalized = (browserName || 'chromium').toLowerCase();
  if (normalized === 'chromium' || normalized === 'chrome') {
    return playwright.chromium;
  }
  if (normalized === 'firefox') {
    return playwright.firefox;
  }
  if (normalized === 'webkit') {
    return playwright.webkit;
  }
  throw new Error(`Unsupported browser: ${browserName}`);
}

async function captureStepEvent(page, step, options = {}) {
  if (step.type !== 'click') {
    return null;
  }

  const viewport = options.viewport || null;
  const nowMs = options.nowMs || Date.now;
  const startedAtMs = options.startedAtMs || 0;

  try {
    const locator = page.locator(step.selector).first();
    const rect = normalizeRect(await locator.boundingBox());
    const label = step.label || await locator.evaluate(element => {
      const raw = element.innerText || element.textContent || '';
      return String(raw).trim().replace(/\s+/g, ' ');
    });

    return createRecordedEvent({
      type: 'click',
      atMs: Math.max(0, nowMs() - startedAtMs),
      selector: step.selector,
      label: label || step.selector,
      url: typeof page.url === 'function' ? page.url() : null,
      viewport,
      rect,
    });
  } catch (error) {
    return createRecordedEvent({
      type: 'click',
      atMs: Math.max(0, nowMs() - startedAtMs),
      selector: step.selector,
      label: step.label || step.selector,
      url: typeof page.url === 'function' ? page.url() : null,
      viewport,
      rect: null,
      captureError: error.message || String(error),
    });
  }
}

async function runSteps(page, steps, options = {}) {
  const events = [];
  for (const step of steps) {
    switch (step.type) {
      case 'goto':
        await page.goto(step.url, { waitUntil: step.waitUntil || 'networkidle' });
        break;
      case 'click':
        events.push(await captureStepEvent(page, step, options));
        await page.click(step.selector, step.options || {});
        break;
      case 'fill':
        await page.fill(step.selector, step.value ?? '');
        break;
      case 'press':
        await page.press(step.selector, step.key);
        break;
      case 'wait':
        await page.waitForTimeout(Number(step.ms || 0));
        break;
      case 'waitForSelector':
        await page.waitForSelector(step.selector, step.options || {});
        break;
      case 'hover':
        await page.hover(step.selector, step.options || {});
        break;
      case 'check':
        await page.check(step.selector, step.options || {});
        break;
      case 'uncheck':
        await page.uncheck(step.selector, step.options || {});
        break;
      case 'selectOption':
        await page.selectOption(step.selector, step.value, step.options || {});
        break;
      default:
        throw new Error(`Unsupported step type: ${step.type}`);
    }
  }
  return events.filter(Boolean);
}

async function moveFile(sourcePath, targetPath) {
  await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
  try {
    await fs.promises.rename(sourcePath, targetPath);
  } catch (error) {
    if (error.code !== 'EXDEV') {
      throw error;
    }
    await fs.promises.copyFile(sourcePath, targetPath);
    await fs.promises.unlink(sourcePath);
  }
}

function runCommandFile(command, args) {
  execFileSync(command, args, { stdio: 'inherit' });
}

async function finalizeRecordedVideo(sourcePath, targetPath, options = {}) {
  const resolvedTarget = path.resolve(targetPath);
  const run = options.runCommandFile || runCommandFile;

  if (path.extname(resolvedTarget).toLowerCase() !== '.mp4') {
    await moveFile(sourcePath, resolvedTarget);
    return resolvedTarget;
  }

  await fs.promises.mkdir(path.dirname(resolvedTarget), { recursive: true });
  run('ffmpeg', [
    '-y',
    '-i',
    sourcePath,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    resolvedTarget,
  ]);
  await fs.promises.unlink(sourcePath);
  return resolvedTarget;
}

module.exports = {
  boolFlag,
  browserType,
  ensureParent,
  finalizeRecordedVideo,
  intFlag,
  moveFile,
  parseArgs,
  parseViewport,
  requirePlaywright,
  captureStepEvent,
  runSteps,
};
