#!/usr/bin/env node

const { parseCliArgs, requireArg, TimelineError } = require('./timeline-common');
const { loadProjectFile } = require('./timeline-load');
const { validateProject } = require('./timeline-validate');
const { renderBatchManifest, renderProject, renderProjectExports } = require('./timeline-render');
const { compileTimelineFromEvents, loadEventsFile, writeGeneratedProject } = require('./timeline-from-events');

function printValidationSummary(project) {
  const summary = {
    version: project.version,
    input: project.input.video,
    output: project.output.path,
    format: project.output.format,
    timelineObjects: project.timeline.length,
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

async function main(argv = process.argv.slice(2)) {
  const args = parseCliArgs(argv);
  const [command] = args._;
  if (!command) {
    throw new TimelineError('', 'Missing command. Use "validate" or "render".');
  }

  if (command === 'validate') {
    const projectPath = requireArg(args, 'project', '--project');
    const project = validateProject(loadProjectFile(projectPath));
    printValidationSummary(project);
    return;
  }

  if (command === 'render') {
    if (args.manifest) {
      const results = await renderBatchManifest(args.manifest, {
        overwrite: Boolean(args.overwrite),
      });
      process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
      return;
    }

    const projectPath = requireArg(args, 'project', '--project');
    const rawProject = loadProjectFile(projectPath);
    const outputPaths = await renderProjectExports(rawProject, {
      out: args.out,
      overwrite: Boolean(args.overwrite),
    });
    process.stdout.write(`${outputPaths.join('\n')}\n`);
    return;
  }

  if (command === 'from-events') {
    const eventsPath = requireArg(args, 'events', '--events');
    const videoPath = requireArg(args, 'video', '--video');
    const outPath = requireArg(args, 'out', '--out');
    const eventLog = loadEventsFile(eventsPath);
    const project = compileTimelineFromEvents(eventLog, {
      videoPath,
      projectPath: outPath,
    });
    writeGeneratedProject(outPath, project);
    process.stdout.write(`${outPath}\n`);
    return;
  }

  throw new TimelineError('', `Unknown command: ${command}`);
}

main().catch(error => {
  process.stderr.write(`${error.message || error}\n`);
  process.exit(1);
});
