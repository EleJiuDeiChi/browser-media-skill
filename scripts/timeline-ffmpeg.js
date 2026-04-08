#!/usr/bin/env node

const { execFileSync } = require('node:child_process');

function runCommand(bin, args, options = {}) {
  const output = execFileSync(bin, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
  return output;
}

function buildProbeCommand(inputPath) {
  return {
    bin: 'ffprobe',
    args: [
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_streams',
      '-show_format',
      inputPath,
    ],
  };
}

function probeVideo(inputPath, deps = {}) {
  const runner = deps.runCommand || runCommand;
  const command = buildProbeCommand(inputPath);
  const payload = JSON.parse(runner(command.bin, command.args));
  const videoStream = (payload.streams || []).find(stream => stream.codec_type === 'video');
  if (!videoStream) {
    throw new Error(`No video stream found in ${inputPath}`);
  }

  const frameRate = videoStream.avg_frame_rate || videoStream.r_frame_rate || '0/1';
  const [numerator, denominator] = frameRate.split('/').map(value => Number(value));
  const fps = denominator ? numerator / denominator : 0;

  return {
    width: Number(videoStream.width),
    height: Number(videoStream.height),
    fps,
    duration: Number(videoStream.duration || payload.format?.duration || 0),
    codec: videoStream.codec_name,
  };
}

function runFfmpeg(args, deps = {}) {
  const runner = deps.runCommand || runCommand;
  return runner('ffmpeg', args, { stdio: 'inherit' });
}

module.exports = {
  buildProbeCommand,
  probeVideo,
  runCommand,
  runFfmpeg,
};
