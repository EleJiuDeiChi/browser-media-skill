#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const CHINESE_FONT_CANDIDATES = [
  '/System/Library/Fonts/Supplemental/Hiragino Sans GB.ttc',
  '/System/Library/Fonts/STHeiti Medium.ttc',
  '/System/Library/Fonts/STHeiti Light.ttc',
  '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
  '/System/Library/Fonts/Supplemental/Songti.ttc',
];

const LATIN_FONT_CANDIDATES = [
  '/System/Library/Fonts/Supplemental/Arial.ttf',
  '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
  '/System/Library/Fonts/Supplemental/Hiragino Sans GB.ttc',
];

function containsChinese(text) {
  return /[\u3400-\u9fff]/.test(String(text));
}

function pickFontPath(text, deps = {}) {
  const exists = deps.exists || (candidate => fs.existsSync(candidate));
  const candidates = containsChinese(text) ? CHINESE_FONT_CANDIDATES : LATIN_FONT_CANDIDATES;
  return candidates.find(candidate => exists(candidate)) || null;
}

function buildTextOverlaySpec(workdir, item, theme = {}, videoMeta = {}) {
  const fontPath = pickFontPath(item.text);
  return {
    id: item.id,
    startMs: item.startMs,
    endMs: item.endMs,
    text: item.text,
    x: item.x,
    y: item.y,
    fontSize: item.fontSize || 28,
    color: item.color || theme.accentColor || '#ff3b30',
    fontFamily: item.fontFamily || theme.fontFamily || 'Arial',
    fontPath,
    canvasWidth: videoMeta.width || 1440,
    canvasHeight: videoMeta.height || 900,
    outputPath: path.join(workdir, `${item.id}.png`),
  };
}

function renderTextOverlay(spec) {
  fs.mkdirSync(path.dirname(spec.outputPath), { recursive: true });
  const python = '/Users/a007/.codex/skills/browser-media/.venv/bin/python3';
  const program = `
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

image = Image.new("RGBA", (${spec.canvasWidth}, ${spec.canvasHeight}), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)
font = None
font_path = Path(r"${spec.fontPath || ''}")
if font_path.exists():
    try:
        font = ImageFont.truetype(str(font_path), ${spec.fontSize})
    except Exception:
        font = None
if font is None:
    font = ImageFont.load_default()
draw.text((${spec.x}, ${spec.y}), "${String(spec.text).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}", fill="${spec.color}", font=font)
image.save(r"${spec.outputPath}")
`;
  execFileSync(python, ['-c', program], { stdio: 'inherit' });
  return spec.outputPath;
}

module.exports = {
  buildTextOverlaySpec,
  pickFontPath,
  renderTextOverlay,
};
