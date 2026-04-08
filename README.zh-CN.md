# browser-media-skill

这是一个可独立发布的 `browser-media` 技能仓库，用来做浏览器截图、录屏、GIF、标注和时间轴渲染。

## 能力

- 浏览器页面截图
- Playwright 浏览器录屏
- 录屏转标准 H.264 MP4
- MP4 转 GIF
- 图片、GIF、视频标注
- 声明式时间轴渲染
- 录制时采集点击事件并自动生成按钮级高亮时间轴

## 环境要求

- Node.js 20+
- Python 3.10+
- `ffmpeg`

## 安装

### 1. 安装 Node 依赖

```bash
npm install
```

### 2. 安装 Python 依赖

```bash
python3 -m pip install -r requirements.txt
```

### 3. 确认 ffmpeg 可用

```bash
ffmpeg -version
```

## CLI 命令

所有 wrapper 都在 `./bin/` 目录：

- `./bin/browser-capture`
- `./bin/browser-record`
- `./bin/browser-gif`
- `./bin/browser-annotate`
- `./bin/browser-timeline-validate`
- `./bin/browser-timeline-render`
- `./bin/browser-timeline-from-events`

## 快速示例

### 截图

```bash
./bin/browser-capture \
  --url https://example.com \
  --out /tmp/example-home.png \
  --full-page
```

### 录制浏览器流程

```bash
./bin/browser-record \
  --url https://example.com \
  --steps ./templates/basic-click-flow.json \
  --out /tmp/example-flow.mp4
```

### 录制并采集点击事件

```bash
./bin/browser-record \
  --url https://example.com \
  --steps ./templates/basic-click-flow.json \
  --out /tmp/example-flow.mp4 \
  --record-events
```

### 从事件生成时间轴项目

```bash
./bin/browser-timeline-from-events \
  --events /tmp/example-flow.events.json \
  --video /tmp/example-flow.mp4 \
  --out /tmp/example-flow.generated.json
```

### 渲染时间轴项目

```bash
./bin/browser-timeline-render \
  --project /tmp/example-flow.generated.json \
  --overwrite
```

### 转 GIF

```bash
./bin/browser-gif \
  --in /tmp/example-flow.mp4 \
  --out /tmp/example-flow.gif
```

## 时间轴引擎支持

- `box`
- `text`
- `arrow`
- `spotlight`
- `blur`
- `mask`
- `panel`

同时支持一些更偏剪辑风格的参数：

- `fadeInMs`
- `fadeOutMs`
- `slideInMs`
- `slideFromX`
- `slideFromY`
- `panelRadius`
- `panelPadding`
- `panelOpacity`

## 模板

仓库内置模板在 `templates/`：

- `basic-click-flow.json`
- `login-flow.json`
- `image-annotations.json`
- `video-annotations.json`
- `timeline-project-basic.json`
- `timeline-project-demo.json`

## 测试

运行 Node 测试：

```bash
npm test
```

## 说明

- 这个仓库只处理浏览器媒体，不做桌面录屏。
- 录屏质量取决于 Playwright 录制链路和页面视口稳定性。
- 基于事件的按钮级高亮在“按钮点击前已经稳定可见”时效果最好。

## English Documentation

See [`README.md`](./README.md).
