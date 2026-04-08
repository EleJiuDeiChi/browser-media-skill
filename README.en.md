[中文](./README.md)

# browser-media-skill

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933)
![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB)
[![Tests](https://github.com/EleJiuDeiChi/browser-media-skill/actions/workflows/test.yml/badge.svg)](https://github.com/EleJiuDeiChi/browser-media-skill/actions/workflows/test.yml)
![ffmpeg](https://img.shields.io/badge/ffmpeg-required-6A1B9A)

Portable browser media tooling for:

- Playwright-based browser screenshots
- browser flow recording to MP4
- MP4 to GIF conversion
- image and video annotations
- declarative timeline rendering
- event-driven button highlighting for product demos

This repository packages the `browser-media` skill as a standalone public project instead of a machine-local Codex setup.

## Features

- Capture screenshots from a browser page
- Record browser flows with Playwright
- Convert browser recordings to true H.264 MP4
- Generate GIFs from MP4 recordings
- Add annotations to images, GIFs, and videos
- Render timeline projects with panels, text, arrows, spotlights, blur, and masks
- Capture click events during recording and compile them into button-level highlight timelines

## Requirements

- Node.js 20+
- Python 3.10+
- `ffmpeg`

## Install

### 1. Install Node dependencies

```bash
npm install
```

### 2. Install Python dependencies

```bash
python3 -m pip install -r requirements.txt
```

### 3. Ensure ffmpeg is available

```bash
ffmpeg -version
```

## CLI

All wrappers live in `./bin/`.

- `./bin/browser-capture`
- `./bin/browser-record`
- `./bin/browser-gif`
- `./bin/browser-annotate`
- `./bin/browser-timeline-validate`
- `./bin/browser-timeline-render`
- `./bin/browser-timeline-from-events`

## Quick Examples

### Screenshot a page

```bash
./bin/browser-capture \
  --url https://example.com \
  --out /tmp/example-home.png \
  --full-page
```

### Record a browser flow

```bash
./bin/browser-record \
  --url https://example.com \
  --steps ./templates/basic-click-flow.json \
  --out /tmp/example-flow.mp4
```

### Record with interaction events

```bash
./bin/browser-record \
  --url https://example.com \
  --steps ./templates/basic-click-flow.json \
  --out /tmp/example-flow.mp4 \
  --record-events
```

### Generate a timeline project from recorded events

```bash
./bin/browser-timeline-from-events \
  --events /tmp/example-flow.events.json \
  --video /tmp/example-flow.mp4 \
  --out /tmp/example-flow.generated.json
```

### Render a timeline project

```bash
./bin/browser-timeline-render \
  --project /tmp/example-flow.generated.json \
  --overwrite
```

### Convert MP4 to GIF

```bash
./bin/browser-gif \
  --in /tmp/example-flow.mp4 \
  --out /tmp/example-flow.gif
```

## Timeline Engine

The timeline renderer supports:

- `box`
- `text`
- `arrow`
- `spotlight`
- `blur`
- `mask`
- `panel`

It also supports motion and editorial-style presentation attributes such as:

- `fadeInMs`
- `fadeOutMs`
- `slideInMs`
- `slideFromX`
- `slideFromY`
- `panelRadius`
- `panelPadding`
- `panelOpacity`

## Templates

See the `templates/` directory for starter files:

- `basic-click-flow.json`
- `login-flow.json`
- `image-annotations.json`
- `video-annotations.json`
- `timeline-project-basic.json`
- `timeline-project-demo.json`

## Testing

Run the Node test suite:

```bash
npm test
```

## Notes

- This project is for browser media only, not desktop capture.
- Playwright recording quality depends on the browser capture path and viewport stability.
- Event-derived highlight precision is best when click targets are visible and stable before interaction.
