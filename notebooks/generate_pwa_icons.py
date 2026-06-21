import cv2
import numpy as np
import os

def create_pwa_icon():
    # Define sizes
    sizes = [192, 512]
    public_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../apps/web/public'))
    os.makedirs(public_dir, exist_ok=True)

    for size in sizes:
        # Create a blank square image with a dark slate blue background (Premium)
        img = np.zeros((size, size, 3), dtype=np.uint8)
        
        # Draw a beautiful radial gradient or solid clean background
        # Let's create a modern dark gradient: deep indigo to slate
        for y in range(size):
            for x in range(size):
                # Calculate distance to center
                dy = y - size / 2
                dx = x - size / 2
                dist = np.sqrt(dx*dx + dy*dy) / (size / np.sqrt(2))
                
                # Interpolate colors (BGR format)
                # Center: deep blue (100, 50, 20)
                # Outer: dark slate (24, 15, 10)
                c_b = int(100 * (1 - dist) + 24 * dist)
                c_g = int(50 * (1 - dist) + 15 * dist)
                c_r = int(20 * (1 - dist) + 10 * dist)
                
                img[y, x] = [
                    np.clip(c_b, 0, 255),
                    np.clip(c_g, 0, 255),
                    np.clip(c_r, 0, 255)
                ]

        # Draw a stylized broom/cleaner and PDF icon in the center
        # Center coordinates
        cy, cx = size // 2, size // 2
        r_scale = size / 512.0
        
        # 1. Draw a clean glowing ring representing "Cleaning" (Blue/Indigo glow)
        cv2.circle(img, (cx, cy), int(120 * r_scale), (240, 180, 60), int(12 * r_scale), lineType=cv2.LINE_AA)
        
        # 2. Draw a broom/sparkle symbol
        # Draw three sparkles (shining stars)
        # Sparkle 1 (top-right)
        s1_cx, s1_cy = int(cx + 60 * r_scale), int(cy - 60 * r_scale)
        pts1 = np.array([
            [s1_cx, int(s1_cy - 25 * r_scale)],
            [int(s1_cx + 8 * r_scale), int(s1_cy - 8 * r_scale)],
            [int(s1_cx + 25 * r_scale), s1_cy],
            [int(s1_cx + 8 * r_scale), int(s1_cy + 8 * r_scale)],
            [s1_cx, int(s1_cy + 25 * r_scale)],
            [int(s1_cx - 8 * r_scale), int(s1_cy + 8 * r_scale)],
            [int(s1_cx - 25 * r_scale), s1_cy],
            [int(s1_cx - 8 * r_scale), int(s1_cy - 8 * r_scale)]
        ], dtype=np.int32)
        cv2.fillPoly(img, [pts1], (100, 240, 255), lineType=cv2.LINE_AA)
        
        # Sparkle 2 (bottom-left)
        s2_cx, s2_cy = int(cx - 70 * r_scale), int(cy + 60 * r_scale)
        pts2 = np.array([
            [s2_cx, int(s2_cy - 15 * r_scale)],
            [int(s2_cx + 5 * r_scale), int(s2_cy - 5 * r_scale)],
            [int(s2_cx + 15 * r_scale), s2_cy],
            [int(s2_cx + 5 * r_scale), int(s2_cy + 5 * r_scale)],
            [s2_cx, int(s2_cy + 15 * r_scale)],
            [int(s2_cx - 5 * r_scale), int(s2_cy + 5 * r_scale)],
            [int(s2_cx - 15 * r_scale), s2_cy],
            [int(s2_cx - 5 * r_scale), int(s2_cy - 5 * r_scale)]
        ], dtype=np.int32)
        cv2.fillPoly(img, [pts2], (100, 240, 255), lineType=cv2.LINE_AA)

        # 3. Draw a stylized sheet of paper (document) in the center tilted
        # Document borders
        doc_pts = np.array([
            [int(cx - 50 * r_scale), int(cy - 60 * r_scale)],
            [int(cx + 20 * r_scale), int(cy - 60 * r_scale)],
            [int(cx + 50 * r_scale), int(cy - 30 * r_scale)],
            [int(cx + 50 * r_scale), int(cy + 70 * r_scale)],
            [int(cx - 50 * r_scale), int(cy + 70 * r_scale)]
        ], dtype=np.int32)
        cv2.fillPoly(img, [doc_pts], (245, 245, 245), lineType=cv2.LINE_AA)
        cv2.polylines(img, [doc_pts], True, (60, 40, 30), int(6 * r_scale), lineType=cv2.LINE_AA)
        
        # Folded corner
        fold_pts = np.array([
            [int(cx + 20 * r_scale), int(cy - 60 * r_scale)],
            [int(cx + 20 * r_scale), int(cy - 30 * r_scale)],
            [int(cx + 50 * r_scale), int(cy - 30 * r_scale)]
        ], dtype=np.int32)
        cv2.fillPoly(img, [fold_pts], (200, 200, 200), lineType=cv2.LINE_AA)
        cv2.polylines(img, [fold_pts], True, (60, 40, 30), int(4 * r_scale), lineType=cv2.LINE_AA)

        # Lines of text on the document (simulating cleaning)
        # Clean lines (solid blue/grey text lines)
        cv2.line(img, (int(cx - 30 * r_scale), int(cy - 10 * r_scale)), (int(cx + 30 * r_scale), int(cy - 10 * r_scale)), (80, 70, 70), int(5 * r_scale), lineType=cv2.LINE_AA)
        cv2.line(img, (int(cx - 30 * r_scale), int(cy + 15 * r_scale)), (int(cx + 30 * r_scale), int(cy + 15 * r_scale)), (80, 70, 70), int(5 * r_scale), lineType=cv2.LINE_AA)
        cv2.line(img, (int(cx - 30 * r_scale), int(cy + 40 * r_scale)), (int(cx + 10 * r_scale), int(cy + 40 * r_scale)), (80, 70, 70), int(5 * r_scale), lineType=cv2.LINE_AA)

        # Save image
        out_path = os.path.join(public_dir, f'icon-{size}.png')
        cv2.imwrite(out_path, img)
        print(f"Generated: {out_path}")

if __name__ == '__main__':
    create_pwa_icon()
