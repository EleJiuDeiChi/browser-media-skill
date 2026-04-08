#!/usr/bin/env python3

import argparse
import json
import math
import os
from pathlib import Path

import cv2
from PIL import Image, ImageColor, ImageDraw, ImageFont, ImageSequence


def load_annotations(path):
    with open(path, "r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise ValueError("Annotations JSON must be an array")
    return data


def color(value, fallback="#ff3b30"):
    return value or fallback


def font(size):
    for candidate in [
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/SFNS.ttf",
    ]:
        if os.path.exists(candidate):
            return ImageFont.truetype(candidate, size=size)
    return ImageFont.load_default()


def draw_arrow(draw, start, end, fill, width):
    x1, y1 = start
    x2, y2 = end
    draw.line((x1, y1, x2, y2), fill=fill, width=width)
    angle = math.atan2(y2 - y1, x2 - x1)
    head_len = max(12, width * 3)
    left = (
        x2 - head_len * math.cos(angle - math.pi / 6),
        y2 - head_len * math.sin(angle - math.pi / 6),
    )
    right = (
        x2 - head_len * math.cos(angle + math.pi / 6),
        y2 - head_len * math.sin(angle + math.pi / 6),
    )
    draw.polygon([(x2, y2), left, right], fill=fill)


def annotate_image_frame(image, annotations, allow_arrow):
    draw = ImageDraw.Draw(image)

    for item in annotations:
        kind = item["type"]
        fill = color(item.get("color"))
        width = int(item.get("widthPx", 4))
        if kind == "box":
            x = item["x"]
            y = item["y"]
            w = item["width"]
            h = item["height"]
            draw.rectangle((x, y, x + w, y + h), outline=fill, width=width)
        elif kind == "arrow":
            if not allow_arrow:
                raise ValueError("Video/GIF annotation only supports box and text")
            draw_arrow(draw, tuple(item["from"]), tuple(item["to"]), fill, width)
        elif kind == "text":
            draw.text((item["x"], item["y"]), item["text"], fill=fill, font=font(int(item.get("fontSize", 28))))
        else:
            raise ValueError(f"Unsupported annotation type: {kind}")


def annotate_image(input_path, output_path, annotations):
    image = Image.open(input_path).convert("RGBA")
    annotate_image_frame(image, annotations, allow_arrow=True)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    image.save(output_path)
    print(output_path)


def annotate_video_frame(frame_bgr, annotations):
    for item in annotations:
        kind = item["type"]
        fill = color(item.get("color"), "red")
        rgb = ImageColor.getrgb(fill)
        bgr = (rgb[2], rgb[1], rgb[0])
        thickness = int(item.get("widthPx", 4))
        if kind == "box":
            x = int(item["x"])
            y = int(item["y"])
            w = int(item["width"])
            h = int(item["height"])
            cv2.rectangle(frame_bgr, (x, y), (x + w, y + h), bgr, thickness)
        elif kind == "text":
            cv2.putText(
                frame_bgr,
                str(item["text"]),
                (int(item["x"]), int(item["y"])),
                cv2.FONT_HERSHEY_SIMPLEX,
                max(float(item.get("fontSize", 28)) / 28.0, 0.5),
                bgr,
                2,
                cv2.LINE_AA,
            )
        else:
            raise ValueError("Video/GIF annotation only supports box and text")
    return frame_bgr


def annotate_video(input_path, output_path, annotations):
    capture = cv2.VideoCapture(input_path)
    if not capture.isOpened():
        raise ValueError(f"Unable to read video: {input_path}")

    fps = capture.get(cv2.CAP_PROP_FPS) or 12.0
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    if not writer.isOpened():
        capture.release()
        raise ValueError(f"Unable to write video: {output_path}")

    while True:
        ok, frame = capture.read()
        if not ok:
            break
        writer.write(annotate_video_frame(frame, annotations))

    capture.release()
    writer.release()
    print(output_path)


def annotate_gif(input_path, output_path, annotations):
    source = Image.open(input_path)
    frames = []
    for frame in ImageSequence.Iterator(source):
        image = frame.convert("RGBA")
        annotate_image_frame(image, annotations, allow_arrow=False)
        frames.append(image)

    if not frames:
        raise ValueError("GIF contained no frames")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        loop=0,
        duration=source.info.get("duration", 100),
        disposal=2,
    )
    print(output_path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--in", dest="input_path", required=True)
    parser.add_argument("--out", dest="output_path", required=True)
    parser.add_argument("--annotations", required=True)
    args = parser.parse_args()

    input_path = os.path.abspath(args.input_path)
    output_path = os.path.abspath(args.output_path)
    annotations = load_annotations(args.annotations)
    suffix = Path(input_path).suffix.lower()

    if suffix in {".png", ".jpg", ".jpeg", ".webp"}:
        annotate_image(input_path, output_path, annotations)
        return
    if suffix in {".mp4", ".mov"}:
        annotate_video(input_path, output_path, annotations)
        return
    if suffix == ".gif":
        annotate_gif(input_path, output_path, annotations)
        return
    raise ValueError(f"Unsupported input type: {suffix}")


if __name__ == "__main__":
    main()
