#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  boolFlag,
  browserType,
  ensureParent,
  finalizeRecordedVideo,
  intFlag,
  parseArgs,
  parseViewport,
  requirePlaywright,
  runSteps,
} = require('./playwright-common');
const { deriveEventsPath, writeEventsFile } = require('./recording-events');

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.url || !args.out) {
    throw new Error('Usage: browser-record --url <url> --out <file> [--steps <json>] [--wait-ms <ms>] [--viewport 1440x900]');
  }

  const steps = args.steps ? JSON.parse(fs.readFileSync(args.steps, 'utf8')) : [];
  if (!Array.isArray(steps)) {
    throw new Error('--steps must point to a JSON array');
  }

  const playwright = requirePlaywright();
  const browserLauncher = browserType(playwright, args.browser);
  const viewport = parseViewport(args.viewport);
  const videoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-media-video-'));
  const browser = await browserLauncher.launch({ headless: !boolFlag(args.headed) });
  const startedAtMs = Date.now();

  try {
    const context = await browser.newContext({
      viewport,
      recordVideo: {
        dir: videoDir,
        size: viewport,
      },
    });
    const page = await context.newPage();
    await page.goto(args.url, { waitUntil: args.waitUntil || 'networkidle' });
    const events = await runSteps(page, steps, {
      startedAtMs,
      viewport,
    });
    await page.waitForTimeout(intFlag(args['wait-ms'], 500));

    const video = page.video();
    await context.close();

    if (!video) {
      throw new Error('No Playwright video artifact was produced');
    }

    const sourcePath = await video.path();
    const outputPath = await finalizeRecordedVideo(sourcePath, path.resolve(args.out));
    const shouldWriteEvents = Boolean(args['events-out'] || boolFlag(args['record-events']));
    if (shouldWriteEvents) {
      const eventsPath = path.resolve(args['events-out'] || deriveEventsPath(outputPath));
      ensureParent(eventsPath);
      writeEventsFile(eventsPath, {
        version: 1,
        video: outputPath,
        viewport,
        events,
      });
    }
    console.log(outputPath);
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
