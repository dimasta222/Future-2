#!/usr/bin/env python3
"""Detect red boundary lines in guide mockup images."""
from PIL import Image
import numpy as np
import sys

def detect_red_bounds(path, label):
    img = Image.open(path)
    arr = np.array(img)
    h, w = arr.shape[:2]
    print(f"\n=== {label}: {w}x{h} ===")

    # Find red pixels: R > 180, G < 80, B < 80
    red_mask = (arr[:, :, 0] > 180) & (arr[:, :, 1] < 80) & (arr[:, :, 2] < 80)
    red_rows, red_cols = np.where(red_mask)

    if len(red_rows) == 0:
        # Try broader: R > 150, G < 120, B < 120
        red_mask = (arr[:, :, 0] > 150) & (arr[:, :, 1] < 120) & (arr[:, :, 2] < 120)
        red_rows, red_cols = np.where(red_mask)
        if len(red_rows) == 0:
            print("No red pixels found!")
            return
        print(f"(using broader threshold R>150, G<120, B<120)")

    print(f"Red pixel count: {len(red_rows)}")
    top_px = int(red_rows.min())
    bottom_px = int(red_rows.max())
    left_px = int(red_cols.min())
    right_px = int(red_cols.max())
    print(f"Red bounds (px): left={left_px}, top={top_px}, right={right_px}, bottom={bottom_px}")
    print(f"Red bounds (%):  left={left_px/w*100:.2f}%, top={top_px/h*100:.2f}%, right={right_px/w*100:.2f}%, bottom={bottom_px/h*100:.2f}%")
    
    center_x = (left_px + right_px) / 2
    center_y = (top_px + bottom_px) / 2
    area_w = right_px - left_px
    area_h = bottom_px - top_px
    print(f"Center (%): x={center_x/w*100:.2f}%, y={center_y/h*100:.2f}%")
    print(f"Size (%):   w={area_w/w*100:.2f}%, h={area_h/h*100:.2f}%")
    
    # For constructorConfig: left=centerX%, top=centerY%, width=areaW%, height=areaH%
    print(f"\n  Config values:")
    print(f"  left: {center_x/w*100:.1f},")
    print(f"  top:  {center_y/h*100:.1f},")
    print(f"  width: {area_w/w*100:.1f},")
    print(f"  height: {area_h/h*100:.1f},")

base = "/Users/dmitrylymar/Desktop/future-studio/public/mockups"
detect_red_bounds(f"{base}/oversize-black-front-guide.png", "FRONT")
detect_red_bounds(f"{base}/oversize-black-back-guide.png", "BACK")
