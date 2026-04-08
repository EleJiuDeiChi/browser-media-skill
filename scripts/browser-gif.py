#!/usr/bin/env python3

import argparse
import os

import cv2
from PIL import Image


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--in", dest="input_path", required=True)
    parser.add_argument("--out", dest="output_path", required=True)
    parser.add_argument("--fps", type=int, default=12)
    parser.add_argument("--width", type=int, default=1200)
    args = parser.parse_args()

    input_path = os.path.abspath(args.input_path)
    output_path = os.path.abspath(args.output_path)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    capture = cv2.VideoCapture(input_path)
    if not capture.isOpened():
        raise RuntimeError(f"Unable to read video: {input_path}")

    source_fps = capture.get(cv2.CAP_PROP_FPS) or args.fps
    stride = max(1, round(source_fps / args.fps))
    frames = []
    index = 0

    while True:
        ok, frame = capture.read()
        if not ok:
            break
        if index % stride != 0:
            index += 1
            continue

        height, width = frame.shape[:2]
        target_width = min(args.width, width)
        target_height = int(height * (target_width / width))
        resized = cv2.resize(frame, (target_width, target_height), interpolation=cv2.INTER_AREA)
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
        frames.append(Image.fromarray(rgb))
        index += 1

    capture.release()
    if not frames:
        raise RuntimeError("No frames were extracted for GIF generation")

    duration = int(1000 / max(args.fps, 1))
    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=duration,
        loop=0,
        optimize=False,
    )
    print(output_path)


if __name__ == "__main__":
    main()
