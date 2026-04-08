---
name: browser-media
description: Use when the user wants browser screenshots, Playwright-based browser recordings, MP4 to GIF conversion, or annotated browser media artifacts in any project.
---

# Browser Media

Standalone `browser-media` skill repository.

Use this skill for browser-only media work. It is not for desktop recording.

Chinese alias guide:

- [`中文别名说明.md`](./中文别名说明.md)

## Tools

- `browser-capture`: Playwright screenshot helper
- `browser-record`: Playwright recording helper
- `browser-gif`: MP4 to GIF converter
- `browser-annotate`: Annotation helper for images and simple video/GIF overlays
- `browser-timeline-validate`: Validate declarative timeline render projects
- `browser-timeline-render`: Render declarative timeline projects to MP4
- `browser-timeline-from-events`: Generate a timeline project from recorded interaction events

## Templates

- [`templates/basic-click-flow.json`](./templates/basic-click-flow.json)
- [`templates/login-flow.json`](./templates/login-flow.json)
- [`templates/image-annotations.json`](./templates/image-annotations.json)
- [`templates/video-annotations.json`](./templates/video-annotations.json)
- [`templates/timeline-project-basic.json`](./templates/timeline-project-basic.json)
- [`templates/timeline-project-demo.json`](./templates/timeline-project-demo.json)

## Typical Flows

### Screenshot

```bash
./bin/browser-capture \
  --url http://localhost:3000 \
  --out /abs/output/home.png \
  --full-page
```

### Record To MP4

```bash
./bin/browser-record \
  --url http://localhost:3000 \
  --steps /abs/output/login-steps.json \
  --out /abs/output/login.mp4
```

### Generate Timeline From Recorded Events

```bash
./bin/browser-record \
  --url http://localhost:3000 \
  --steps /abs/output/login-steps.json \
  --out /abs/output/login.mp4 \
  --record-events

./bin/browser-timeline-from-events \
  --events /abs/output/login.events.json \
  --video /abs/output/login.mp4 \
  --out /abs/output/login.generated.json
```

### Render Timeline Project

```bash
./bin/browser-timeline-render \
  --project /abs/output/login.generated.json \
  --overwrite
```

## Constraints

- Browser recording is implemented with Playwright video capture. Keep viewport fixed for clean GIF output.
- Image annotations support `box`, `arrow`, and `text`.
- Video/GIF overlay support is limited to `box` and `text`.
- Timeline engine supports `box`, `text`, `arrow`, `spotlight`, `blur`, `mask`, `panel`, and event-derived button highlighting.
- `browser-record` can emit `*.events.json` when passed `--record-events` or `--events-out`.

## Repository Notes

- Install Node dependencies with `npm install`.
- Install Python dependencies with `python3 -m pip install -r requirements.txt`.
- See [`README.md`](./README.md) and [`README.zh-CN.md`](./README.zh-CN.md) for full setup and usage.
