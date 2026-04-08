#!/usr/bin/env node

const {
  boolFlag,
  browserType,
  ensureParent,
  intFlag,
  parseArgs,
  parseViewport,
  requirePlaywright,
} = require('./playwright-common');

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.url || !args.out) {
    throw new Error('Usage: browser-capture --url <url> --out <file> [--selector <css>] [--full-page] [--wait-ms <ms>] [--wait-for-selector <css>] [--viewport 1440x900]');
  }

  const playwright = requirePlaywright();
  const browserLauncher = browserType(playwright, args.browser);
  const viewport = parseViewport(args.viewport);
  const browser = await browserLauncher.launch({ headless: !boolFlag(args.headed) });

  try {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto(args.url, { waitUntil: args.waitUntil || 'networkidle' });

    if (args['wait-for-selector']) {
      await page.waitForSelector(args['wait-for-selector']);
    }
    await page.waitForTimeout(intFlag(args['wait-ms'], 0));

    ensureParent(args.out);
    if (args.selector) {
      const locator = page.locator(args.selector).first();
      await locator.screenshot({ path: args.out });
    } else {
      await page.screenshot({
        path: args.out,
        fullPage: boolFlag(args['full-page']),
      });
    }
    console.log(args.out);
    await context.close();
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});

