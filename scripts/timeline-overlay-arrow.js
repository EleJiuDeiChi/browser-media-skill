#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function buildArrowOverlaySpec(workdir, item, videoMeta = {}) {
  const outputPath = path.join(workdir, `${item.id}.png`);
  return {
    id: item.id,
    startMs: item.startMs,
    endMs: item.endMs,
    from: item.from,
    to: item.to,
    color: item.color || '#ff3b30',
    widthPx: item.widthPx || 6,
    headSize: item.headSize || 18,
    canvasWidth: videoMeta.width || 1440,
    canvasHeight: videoMeta.height || 900,
    outputPath,
  };
}

function renderArrowOverlay(spec) {
  fs.mkdirSync(path.dirname(spec.outputPath), { recursive: true });
  const python = '/Users/a007/.codex/skills/browser-media/.venv/bin/python3';
  const program = `
from PIL import Image, ImageDraw
import math

image = Image.new("RGBA", (${spec.canvasWidth}, ${spec.canvasHeight}), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)
start = (${spec.from[0]}, ${spec.from[1]})
end = (${spec.to[0]}, ${spec.to[1]})
color = "${spec.color}"
width = ${spec.widthPx}
head = ${spec.headSize}

draw.line([start, end], fill=color, width=width)
angle = math.atan2(end[1] - start[1], end[0] - start[0])
left = (
    end[0] - head * math.cos(angle - math.pi / 6),
    end[1] - head * math.sin(angle - math.pi / 6)
)
right = (
    end[0] - head * math.cos(angle + math.pi / 6),
    end[1] - head * math.sin(angle + math.pi / 6)
)
draw.polygon([end, left, right], fill=color)
image.save(r"${spec.outputPath}")
`;
  execFileSync(python, ['-c', program], { stdio: 'inherit' });
  return spec.outputPath;
}

module.exports = {
  buildArrowOverlaySpec,
  renderArrowOverlay,
};
