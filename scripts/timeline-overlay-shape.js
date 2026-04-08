#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function resolveShapeColor(item, theme = {}) {
  if (item.type === 'panel') {
    return item.fillColor || '#0b1620';
  }
  if (item.type === 'mask') {
    return item.color || '#000000';
  }
  if (item.type === 'spotlight') {
    return item.color || '#000000';
  }
  return item.strokeColor || item.color || theme.accentColor || '#ff3b30';
}

function resolveShapeOpacity(item) {
  if (item.type === 'panel') {
    return item.panelOpacity ?? 0.58;
  }
  if (item.type === 'mask') {
    return item.opacity ?? 0.72;
  }
  if (item.type === 'spotlight') {
    return item.dimming ?? 0.72;
  }
  return item.opacity ?? 1;
}

function resolveRadius(item) {
  if (item.type === 'panel') {
    return item.panelRadius ?? 18;
  }
  if (item.type === 'spotlight' && item.shape === 'roundRect') {
    return item.cornerRadius ?? 16;
  }
  return item.radius ?? 0;
}

function buildShapeOverlaySpec(workdir, item, theme = {}, videoMeta = {}) {
  return {
    id: item.id,
    type: item.type,
    startMs: item.startMs,
    endMs: item.endMs,
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
    radius: resolveRadius(item),
    shape: item.shape || 'rect',
    color: resolveShapeColor(item, theme),
    opacity: resolveShapeOpacity(item),
    strokeWidth: item.strokeWidth || 4,
    canvasWidth: videoMeta.width || 1440,
    canvasHeight: videoMeta.height || 900,
    outputPath: path.join(workdir, `${item.id}.png`),
  };
}

function escapeForPython(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function renderShapeOverlay(spec) {
  fs.mkdirSync(path.dirname(spec.outputPath), { recursive: true });
  const python = '/Users/a007/.codex/skills/browser-media/.venv/bin/python3';
  const alpha = Math.max(0, Math.min(1, Number(spec.opacity ?? 1)));
  const program = `
from PIL import Image, ImageDraw

def rgba(hex_color, alpha_value):
    color = hex_color.lstrip("#")
    if len(color) == 8:
        return (
            int(color[0:2], 16),
            int(color[2:4], 16),
            int(color[4:6], 16),
            int(color[6:8], 16),
        )
    return (
        int(color[0:2], 16),
        int(color[2:4], 16),
        int(color[4:6], 16),
        int(round(alpha_value * 255)),
    )

image = Image.new("RGBA", (${spec.canvasWidth}, ${spec.canvasHeight}), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)
bounds = [${spec.x}, ${spec.y}, ${spec.x + spec.width}, ${spec.y + spec.height}]
color = rgba("${escapeForPython(spec.color)}", ${alpha})
radius = ${spec.radius}

if "${spec.type}" == "spotlight":
    image.paste(color, [0, 0, ${spec.canvasWidth}, ${spec.canvasHeight}])
    if "${spec.shape}" == "roundRect" and radius > 0:
        draw.rounded_rectangle(bounds, radius=radius, fill=(0, 0, 0, 0))
    else:
        draw.rectangle(bounds, fill=(0, 0, 0, 0))
elif "${spec.type}" in ("mask", "panel"):
    if radius > 0:
        draw.rounded_rectangle(bounds, radius=radius, fill=color)
    else:
        draw.rectangle(bounds, fill=color)
else:
    if radius > 0:
        draw.rounded_rectangle(bounds, radius=radius, outline=color, width=${spec.strokeWidth})
    else:
        draw.rectangle(bounds, outline=color, width=${spec.strokeWidth})

image.save(r"${escapeForPython(spec.outputPath)}")
`;
  execFileSync(python, ['-c', program], { stdio: 'inherit' });
  return spec.outputPath;
}

module.exports = {
  buildShapeOverlaySpec,
  renderShapeOverlay,
};
