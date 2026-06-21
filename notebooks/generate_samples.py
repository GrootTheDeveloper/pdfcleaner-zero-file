"""
generate_samples.py
Tao 30 anh test da dang cho PDFCleaner project.
6 danh muc (A-F), moi danh muc 5 anh.
"""

import os
import cv2
import numpy as np

# Dat seed de ket qua co the tai tao
np.random.seed(42)

SAMPLE_DIR = os.path.join(os.path.dirname(__file__), 'samples')
os.makedirs(SAMPLE_DIR, exist_ok=True)

# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

def create_base_page(width=800, height=1100, bg_color=255):
    """Tao trang giay trang nen BGR 3 kenh."""
    return np.ones((height, width, 3), dtype=np.uint8) * bg_color


def add_text(img, text, position, font_scale=0.8, color=(0, 0, 0), thickness=2):
    """Ve mot dong chu len anh."""
    cv2.putText(img, text, position, cv2.FONT_HERSHEY_DUPLEX,
                font_scale, color, thickness, cv2.LINE_AA)


def add_text_block(img, lines, start_y=100, x=80, spacing=45,
                   font_scale=0.8, color=(0, 0, 0), thickness=2):
    """Ve nhieu dong chu lien tiep len anh."""
    for i, line in enumerate(lines):
        y = start_y + i * spacing
        add_text(img, line, (x, y), font_scale=font_scale,
                 color=color, thickness=thickness)


def add_noise_salt_pepper(img, amount=0.01):
    """Them nhieu muoi tieu (salt & pepper noise)."""
    noisy = img.copy()
    num_salt = int(np.ceil(amount * img.size * 0.5))
    # Salt (white pixels)
    coords = [np.random.randint(0, i - 1, num_salt) for i in img.shape[:2]]
    noisy[coords[0], coords[1]] = [255, 255, 255]
    # Pepper (black pixels)
    num_pepper = int(np.ceil(amount * img.size * 0.5))
    coords = [np.random.randint(0, i - 1, num_pepper) for i in img.shape[:2]]
    noisy[coords[0], coords[1]] = [0, 0, 0]
    return noisy


def add_noise_gaussian(img, mean=0, var=10):
    """Them nhieu Gauss."""
    sigma = var ** 0.5
    gauss = np.random.normal(mean, sigma, img.shape)
    noisy = img.astype(np.float32) + gauss
    return np.clip(noisy, 0, 255).astype(np.uint8)


def add_shadow_gradient(img, start_intensity=1.0, end_intensity=0.4, direction='radial'):
    """Them gradient bong do (radial tu goc tren-trai hoac linear)."""
    h, w = img.shape[:2]
    if direction == 'radial':
        # Tao mask radial tu goc top-left
        cx, cy = int(w * 0.15), int(h * 0.15)
        Y, X = np.mgrid[0:h, 0:w]
        dist = np.sqrt((X - cx).astype(np.float32)**2 + (Y - cy).astype(np.float32)**2)
        max_dist = np.sqrt((w - cx)**2 + (h - cy)**2)
        mask = start_intensity - (start_intensity - end_intensity) * (dist / max_dist)
    else:
        # Linear gradient tu trai sang phai
        mask = np.linspace(start_intensity, end_intensity, w, dtype=np.float32)
        mask = np.tile(mask, (h, 1))

    shaded = img.astype(np.float32)
    for c in range(3):
        shaded[:, :, c] *= mask
    return np.clip(shaded, 0, 255).astype(np.uint8)


def add_yellow_aging(img):
    """Lam vang giay cu (yellowed paper aging)."""
    tint = np.zeros_like(img)
    tint[:, :, 0] = 180  # B
    tint[:, :, 1] = 230  # G
    tint[:, :, 2] = 250  # R
    return cv2.addWeighted(img, 0.7, tint, 0.3, 0)


def add_motion_blur(img, size=15):
    """Them nhoe chuyen dong cheo (diagonal motion blur)."""
    kernel = np.zeros((size, size), dtype=np.float32)
    for i in range(size):
        kernel[i, i] = 1.0
    kernel /= size
    return cv2.filter2D(img, -1, kernel)


def add_out_of_focus(img, ksize=9):
    """Lam mat net (out of focus) bang GaussianBlur."""
    k = ksize if ksize % 2 == 1 else ksize + 1
    return cv2.GaussianBlur(img, (k, k), 0)


def add_jpeg_artifacts(img, quality=15):
    """Them artifact nen JPEG chat luong thap."""
    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
    _, enc = cv2.imencode('.jpg', img, encode_param)
    return cv2.imdecode(enc, cv2.IMREAD_COLOR)


def add_creases(img, count=4):
    """Them net gap giay (crease/fold lines)."""
    h, w = img.shape[:2]
    result = img.copy().astype(np.float32)
    for _ in range(count):
        if np.random.rand() > 0.5:
            # Duong doc
            x1 = np.random.randint(50, w - 50)
            x2 = x1 + np.random.randint(-80, 80)
            pt1, pt2 = (x1, 0), (np.clip(x2, 0, w - 1), h - 1)
        else:
            # Duong ngang/cheo
            y1 = np.random.randint(50, h - 50)
            y2 = y1 + np.random.randint(-80, 80)
            pt1 = (0, y1)
            pt2 = (w - 1, np.clip(y2, 0, h - 1))
        # Ve duong toi (bong gap)
        cv2.line(result, pt1, pt2, (160, 160, 160), thickness=2, lineType=cv2.LINE_AA)
        # Ve duong sang song song (hieu ung anh sang gap)
        offset = 3
        pt1_light = (pt1[0] + offset, pt1[1] + 1)
        pt2_light = (pt2[0] + offset, pt2[1] + 1)
        cv2.line(result, pt1_light, pt2_light, (255, 255, 255), thickness=1, lineType=cv2.LINE_AA)
    result = np.clip(result, 0, 255).astype(np.uint8)
    return cv2.GaussianBlur(result, (3, 3), 0)


def add_punch_holes(img):
    """Them 3 lo bam kim ben le trai."""
    h, w = img.shape[:2]
    result = img.copy()
    radius = 14
    hole_color = (40, 40, 40)
    for y_pos in [h // 4, h // 2, 3 * h // 4]:
        cv2.circle(result, (35, y_pos), radius, hole_color, -1)
        cv2.circle(result, (35, y_pos), radius + 2, (210, 210, 210), 1)
    return result


def add_bleed_through(img):
    """Them hieu ung tham muc tu mat sau (ghost text bleed-through)."""
    h, w = img.shape[:2]
    overlay = np.ones_like(img) * 255
    ghost_color = (218, 218, 218)
    add_text(overlay, "REVERSE SIDE BLEED TEXT", (w - 500, h // 3),
             font_scale=0.7, color=ghost_color, thickness=2)
    add_text(overlay, "GHOSTING FROM BACK PAGE", (w - 500, h // 3 + 50),
             font_scale=0.7, color=ghost_color, thickness=2)
    add_text(overlay, "COMPOSITE TEMPLATE USAGE", (w - 520, 2 * h // 3),
             font_scale=0.7, color=ghost_color, thickness=2)
    # Multiply blend
    blended = cv2.multiply(img.astype(np.float32) / 255.0,
                           overlay.astype(np.float32) / 255.0) * 255
    return np.clip(blended, 0, 255).astype(np.uint8)


def add_watermark(img, text="CONFIDENTIAL"):
    """Them watermark cheo xam mo."""
    h, w = img.shape[:2]
    # Tao lop watermark
    txt_layer = np.zeros((h, w, 3), dtype=np.uint8)
    cv2.putText(txt_layer, text, (30, h // 2),
                cv2.FONT_HERSHEY_DUPLEX, 2.8, (230, 230, 230), 8, cv2.LINE_AA)
    # Xoay 45 do
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, 45, 1.0)
    rotated_txt = cv2.warpAffine(txt_layer, M, (w, h),
                                  borderMode=cv2.BORDER_CONSTANT,
                                  borderValue=(0, 0, 0))
    mask = rotated_txt > 0
    blended = cv2.addWeighted(img, 0.85, rotated_txt, 0.15, 0)
    result = img.copy()
    result[mask] = blended[mask]
    return result


def add_finger_occlusion(img):
    """Them hieu ung ngon tay che goc duoi-phai."""
    h, w = img.shape[:2]
    result = img.copy()
    skin_color = (145, 170, 230)  # BGR skin tone
    # Tao hinh oval bang polygon
    cx, cy = w - 60, h - 100
    pts = np.array([
        [w, h - 200], [w - 50, h - 190],
        [w - 100, h - 160], [w - 120, h - 120],
        [w - 115, h - 70], [w - 90, h - 20],
        [w - 50, h], [w, h]
    ], np.int32)
    cv2.fillPoly(result, [pts.reshape((-1, 1, 2))], skin_color)
    # Them do bong nhe
    cv2.polylines(result, [pts.reshape((-1, 1, 2))], True, (120, 140, 190), 2)
    return result


def add_mixed_content(img):
    """Them bieu do mau (bar chart + line graph) va con dau do."""
    h, w = img.shape[:2]
    result = img.copy()
    # --- Bar chart ---
    chart_x, chart_y = 420, 380
    chart_w, chart_h = 300, 220
    # Background chart
    cv2.rectangle(result, (chart_x, chart_y), (chart_x + chart_w, chart_y + chart_h),
                  (245, 245, 240), -1)
    cv2.rectangle(result, (chart_x, chart_y), (chart_x + chart_w, chart_y + chart_h),
                  (180, 180, 180), 2)
    # Bars (red, blue, green)
    bar_w = 35
    bars = [
        (chart_x + 30, 150, (60, 60, 220)),   # Red bar
        (chart_x + 80, 110, (220, 100, 60)),   # Blue bar
        (chart_x + 130, 180, (60, 180, 60)),   # Green bar
        (chart_x + 180, 90, (60, 60, 220)),    # Red bar
        (chart_x + 230, 140, (220, 100, 60)),  # Blue bar
    ]
    for bx, bh, bc in bars:
        by = chart_y + chart_h - bh
        cv2.rectangle(result, (bx, by), (bx + bar_w, chart_y + chart_h), bc, -1)
    # Line graph overlay
    line_pts = np.array([
        [chart_x + 30, chart_y + 60], [chart_x + 100, chart_y + 90],
        [chart_x + 160, chart_y + 50], [chart_x + 220, chart_y + 110],
        [chart_x + 280, chart_y + 70]
    ], np.int32)
    cv2.polylines(result, [line_pts], False, (50, 180, 50), 2, cv2.LINE_AA)
    for pt in line_pts:
        cv2.circle(result, tuple(pt), 4, (50, 180, 50), -1)

    # --- Red stamp ---
    stamp_cx, stamp_cy = 620, 850
    cv2.circle(result, (stamp_cx, stamp_cy), 65, (50, 50, 220), 4, cv2.LINE_AA)
    cv2.circle(result, (stamp_cx, stamp_cy), 55, (50, 50, 220), 1, cv2.LINE_AA)
    cv2.putText(result, "APPROVED", (stamp_cx - 52, stamp_cy + 5),
                cv2.FONT_HERSHEY_DUPLEX, 0.55, (50, 50, 220), 2, cv2.LINE_AA)
    cv2.putText(result, "PDFCLEANER", (stamp_cx - 55, stamp_cy + 25),
                cv2.FONT_HERSHEY_DUPLEX, 0.4, (50, 50, 220), 1, cv2.LINE_AA)
    return result


def add_coffee_stain(img, center, radius):
    """Them vet ca phe tron/elliptical mau nau, lam mo."""
    result = img.copy()
    stain_color = (95, 135, 170)  # BGR brownish
    # Ve ellipse
    axes = (radius, int(radius * 0.7))
    angle = np.random.randint(0, 45)
    cv2.ellipse(result, center, axes, angle, 0, 360, stain_color, -1)
    # Lam mo vung vet
    mask = np.zeros(img.shape[:2], dtype=np.uint8)
    cv2.ellipse(mask, center, (axes[0] + 20, axes[1] + 20), angle, 0, 360, 255, -1)
    blurred = cv2.GaussianBlur(result, (41, 41), 0)
    mask_3ch = np.stack([mask, mask, mask], axis=2) > 0
    result = np.where(mask_3ch, blurred, result)
    return result


def rotate_image(img, angle_deg):
    """Xoay anh quanh tam, lap nen trang."""
    h, w = img.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle_deg, 1.0)
    rotated = cv2.warpAffine(img, M, (w, h),
                              flags=cv2.INTER_CUBIC,
                              borderMode=cv2.BORDER_CONSTANT,
                              borderValue=(255, 255, 255))
    return rotated


# ==============================================================================
# IMAGE GENERATION
# ==============================================================================

generated_count = 0


def save_sample(img, filename):
    """Luu anh vao thu muc samples va in tien trinh."""
    global generated_count
    path = os.path.join(SAMPLE_DIR, filename)
    cv2.imwrite(path, img)
    generated_count += 1
    print(f"  [{generated_count:02d}/30] Saved: {filename}")


# ==============================================================================
# CATEGORY A: Basic Scans (a01 - a05)
# ==============================================================================
print("--- Category A: Basic Scans ---")

# a01: Book page with heavy radial shadow gradient from top-left
img = create_base_page()
add_text_block(img, [
    "CHAPTER I: SHADOW ARTIFACT STUDY",
    "",
    "This page demonstrates a heavy radial shadow",
    "gradient originating from the top-left corner.",
    "Such shadows occur when scanning thick books",
    "with the spine pressed against the scanner glass.",
    "The algorithm must normalize the background",
    "brightness before attempting text extraction.",
    "Shadow removal is a key pre-processing step",
    "for any document digitization pipeline.",
], start_y=100, x=80, spacing=45)
img = add_shadow_gradient(img, start_intensity=1.0, end_intensity=0.35, direction='radial')
save_sample(img, "a01_shadow_book.png")

# a02: Receipt on gray paper, faded text, salt & pepper noise
img = create_base_page(bg_color=230)
add_text_block(img, [
    "SUPERMARKET RECEIPT #4810",
    "Cashier: 02 | Date: 2026-06-19",
    "-------------------------------",
    "Item A (bread)        $3.50",
    "Item B (milk)         $2.99",
    "Item C (faded)       $12.00",
    "Item D (eggs)         $4.25",
    "-------------------------------",
    "SUBTOTAL             $22.74",
    "TAX (8%)              $1.82",
    "TOTAL                $24.56",
    "-------------------------------",
    "THANK YOU FOR SHOPPING!",
], start_y=80, x=80, spacing=42, color=(140, 140, 140))
img = add_noise_salt_pepper(img, amount=0.012)
save_sample(img, "a02_faded_receipt.png")

# a03: Yellow aged paper + circular coffee stain + light noise
img = create_base_page()
add_text_block(img, [
    "Personal Journal Entry - June 2026",
    "",
    "Today we explored yellowed paper artifacts.",
    "Old documents often have brown-yellow tinting",
    "caused by oxidation of the cellulose fibers.",
    "Additionally, a coffee stain is present in",
    "the center area of this page. The algorithm",
    "must distinguish the stain from actual text.",
    "Adaptive thresholding handles this well.",
], start_y=100, x=80, spacing=45)
img = add_yellow_aging(img)
img = add_coffee_stain(img, center=(500, 450), radius=85)
img = add_noise_salt_pepper(img, amount=0.005)
save_sample(img, "a03_yellowed_journal.png")

# a04: Photocopy with gray overlay, black edges, heavy salt&pepper
img = create_base_page()
add_text_block(img, [
    "CONFIDENTIAL CONTRACT AGREEMENT",
    "",
    "1. Parties: Company A and Partner B",
    "2. Purpose: Zero-file PDF Cleaning",
    "3. Term: 10 weeks effective today",
    "4. Scope: Client-side processing",
    "5. Noise: Heavy photocopy salt-pepper",
    "6. Edges: Dark borders left and right",
    "This is a noisy photocopy simulation.",
], start_y=100, x=80, spacing=45)
# Gray photocopy overlay
gray_overlay = np.ones_like(img) * 120
img = cv2.addWeighted(img, 0.7, gray_overlay, 0.3, 0)
# Black borders
img[0:1100, 0:30] = [20, 20, 20]
img[0:1100, 770:800] = [20, 20, 20]
img = cv2.GaussianBlur(img, (3, 3), 0)
img = add_noise_salt_pepper(img, amount=0.025)
save_sample(img, "a04_noisy_photocopy.png")

# a05: Clean text rotated -6.5 degrees clockwise
img = create_base_page()
add_text_block(img, [
    "AUTO-DESKEW ALGORITHM TESTING",
    "",
    "This page is intentionally rotated by",
    "negative 6.5 degrees clockwise to test",
    "the straightening (deskew) feature.",
    "OpenCV minAreaRect detects the dominant",
    "angle of text blocks, then rotates back.",
    "Deskewing is crucial for OCR accuracy",
    "and overall reading comfort.",
], start_y=100, x=80, spacing=45)
img = rotate_image(img, -6.5)
save_sample(img, "a05_skewed_6deg.png")


# ==============================================================================
# CATEGORY B: Image Quality Issues (b01 - b05)
# ==============================================================================
print("--- Category B: Image Quality Issues ---")

# b01: Out of focus, GaussianBlur ksize=9
img = create_base_page()
add_text_block(img, [
    "OUT OF FOCUS TEST PAGE",
    "",
    "This document simulates an out-of-focus",
    "capture with heavy Gaussian blur ksize=9.",
    "The text edges become soft and fuzzy.",
    "Text-contrast-boost mode with aggressive",
    "gamma correction can partially recover",
    "readability from such blurred scans.",
    "Higher sharpening may introduce ringing.",
], start_y=100, x=80, spacing=45)
img = add_out_of_focus(img, ksize=9)
save_sample(img, "b01_out_of_focus.png")

# b02: Motion blur, diagonal kernel size=15
img = create_base_page()
add_text_block(img, [
    "MOTION BLUR ARTIFACT TEST",
    "",
    "This page shows diagonal motion blur with",
    "a kernel size of 15 pixels. Motion blur",
    "occurs when the camera or document moves",
    "during capture. The text appears smeared",
    "along the diagonal direction. Deblurring",
    "is computationally expensive, so the pipeline",
    "focuses on enhancing contrast instead.",
], start_y=100, x=80, spacing=45)
img = add_motion_blur(img, size=15)
save_sample(img, "b02_motion_blur.png")

# b03: Underexposed (very dark)
img = create_base_page()
add_text_block(img, [
    "UNDEREXPOSED DARK IMAGE TEST",
    "",
    "This document simulates extreme underexposure",
    "where all pixel values are multiplied by 0.35.",
    "The paper appears very dark gray and the text",
    "is barely distinguishable from background.",
    "Gamma correction and contrast stretching are",
    "essential to recover the text from darkness.",
    "Background normalization also helps greatly.",
], start_y=100, x=80, spacing=45)
img = (img.astype(np.float32) * 0.35).astype(np.uint8)
save_sample(img, "b03_underexposed.png")

# b04: Overexposed with blown-out center
img = create_base_page()
add_text_block(img, [
    "OVEREXPOSED BRIGHT IMAGE TEST",
    "",
    "This page simulates severe overexposure.",
    "A large white blown-out area exists in the",
    "center where text becomes invisible. The",
    "surrounding text may have reduced contrast.",
    "Flash glare from phone cameras causes this.",
    "The pipeline detects high saturation ratio.",
    "Recovery of blown-out regions is limited.",
], start_y=100, x=80, spacing=45)
# Add brightness globally
img = np.clip(img.astype(np.int16) + 80, 0, 255).astype(np.uint8)
# Blown-out white area in center
h, w = img.shape[:2]
cv2.ellipse(img, (w // 2, h // 2), (200, 150), 0, 0, 360, (255, 255, 255), -1)
# Blur the transition
img = cv2.GaussianBlur(img, (15, 15), 0)
save_sample(img, "b04_overexposed.png")

# b05: Low DPI pixelated
img = create_base_page()
add_text_block(img, [
    "LOW DPI PIXELATED IMAGE TEST",
    "",
    "This page simulates a very low resolution",
    "scan. The image is downscaled to 200x275",
    "then upscaled back to 800x1100 using",
    "nearest-neighbor interpolation, creating",
    "a blocky pixelated appearance. OCR engines",
    "struggle with such low-quality inputs.",
    "Mild blur can soften the jagged edges.",
], start_y=100, x=80, spacing=45)
small = cv2.resize(img, (200, 275), interpolation=cv2.INTER_LINEAR)
img = cv2.resize(small, (800, 1100), interpolation=cv2.INTER_NEAREST)
save_sample(img, "b05_low_dpi.png")


# ==============================================================================
# CATEGORY C: Physical Paper Damage (c01 - c05)
# ==============================================================================
print("--- Category C: Physical Paper Damage ---")

# c01: Creases and folds (4-5 lines at random angles)
img = create_base_page()
add_text_block(img, [
    "CREASE AND FOLD DAMAGE TEST",
    "",
    "This page simulates paper that has been",
    "folded multiple times. Four to five dark",
    "and light parallel lines cross the page",
    "at random angles, mimicking fold creases.",
    "The lines create shadow-highlight pairs.",
    "Morphological operations can suppress them.",
    "Print-optimized mode handles this well.",
], start_y=100, x=80, spacing=45)
img = add_creases(img, count=5)
save_sample(img, "c01_creases_folds.png")

# c02: Large coffee stain overlapping text
img = create_base_page()
add_text_block(img, [
    "COFFEE STAIN DAMAGE TEST",
    "",
    "This document has a large brownish elliptical",
    "coffee stain overlapping the text region.",
    "The stain is blurred to simulate liquid",
    "absorption into paper fibers. Background",
    "normalization using morphological close and",
    "divide effectively removes such stains.",
    "The text underneath remains recoverable.",
], start_y=100, x=80, spacing=45)
img = add_coffee_stain(img, center=(400, 400), radius=120)
save_sample(img, "c02_coffee_stain.png")

# c03: Punch holes at left margin + text
img = create_base_page()
add_text_block(img, [
    "PUNCH HOLE MARGIN TEST",
    "",
    "This page has three dark circles along the",
    "left margin simulating standard 3-hole",
    "punch marks with radius 14 pixels each.",
    "Binder punch holes are common in office",
    "documents. The pipeline should preserve",
    "text content while the holes may appear",
    "as dark artifacts in the binary output.",
], start_y=100, x=80, spacing=45)
img = add_punch_holes(img)
save_sample(img, "c03_punch_holes.png")

# c04: Finger occlusion covering bottom-right corner
img = create_base_page()
add_text_block(img, [
    "FINGER OCCLUSION TEST",
    "",
    "This document has a skin-colored polygon",
    "covering the bottom-right corner, about",
    "120x200 pixels. This simulates a finger",
    "accidentally appearing in the camera scan.",
    "The occluded area loses all text content.",
    "Light-clean mode preserves surrounding text",
    "without aggressive binarization.",
], start_y=100, x=80, spacing=45)
img = add_finger_occlusion(img)
save_sample(img, "c04_finger_occlusion.png")

# c05: Torn edge on right side
img = create_base_page()
add_text_block(img, [
    "TORN EDGE DAMAGE TEST",
    "",
    "This page has an irregular jagged edge",
    "on the right side simulating torn paper.",
    "The transition from white paper to black",
    "torn region uses a random polygon mask.",
    "Documents with torn edges are common in",
    "archival scanning. The pipeline should",
    "handle the irregular boundary gracefully.",
], start_y=100, x=80, spacing=45)
# Create jagged right edge polygon
h, w = img.shape[:2]
num_points = 25
tear_x_base = w - 60
tear_points = []
for i in range(num_points + 1):
    y = int(i * h / num_points)
    x_offset = np.random.randint(-40, 40)
    tear_points.append([tear_x_base + x_offset, y])
# Close polygon on right side
tear_points.append([w, h])
tear_points.append([w, 0])
tear_poly = np.array(tear_points, dtype=np.int32)
cv2.fillPoly(img, [tear_poly.reshape((-1, 1, 2))], (15, 15, 15))
save_sample(img, "c05_torn_edge.png")


# ==============================================================================
# CATEGORY D: Content & Layout (d01 - d05)
# ==============================================================================
print("--- Category D: Content & Layout ---")

# d01: Full table with thin lines, 4 cols x 6 rows
img = create_base_page()
add_text(img, "TABLE LAYOUT TEST - THIN LINES", (80, 60), font_scale=0.9, thickness=2)
add_text(img, "Below is a 4-column x 6-row data table:", (80, 100), font_scale=0.6)

# Table parameters
tx, ty = 80, 140
col_w = 160
row_h = 50
cols = 4
rows = 6
# Draw grid lines (thin, thickness=1)
for r in range(rows + 1):
    y = ty + r * row_h
    cv2.line(img, (tx, y), (tx + cols * col_w, y), (0, 0, 0), 1)
for c in range(cols + 1):
    x = tx + c * col_w
    cv2.line(img, (x, ty), (x, ty + rows * row_h), (0, 0, 0), 1)
# Header row
headers = ["ID", "Name", "Score", "Grade"]
for c, hdr in enumerate(headers):
    add_text(img, hdr, (tx + c * col_w + 10, ty + 35), font_scale=0.5, thickness=1)
# Data rows
data = [
    ["001", "Alice", "95", "A+"],
    ["002", "Bob", "82", "B+"],
    ["003", "Carol", "78", "C+"],
    ["004", "Dave", "91", "A"],
    ["005", "Eve", "67", "D"],
]
for r, row_data in enumerate(data):
    for c, val in enumerate(row_data):
        add_text(img, val, (tx + c * col_w + 10, ty + (r + 1) * row_h + 35),
                 font_scale=0.5, thickness=1)
add_text_block(img, [
    "This table tests thin-line preservation.",
    "Print-optimized mode keeps lines intact.",
    "Overly aggressive morphology may erase them.",
], start_y=520, x=80, spacing=40, font_scale=0.6)
save_sample(img, "d01_thin_table.png")

# d02: Mixed chart with text, colored bars, line graph
img = create_base_page()
add_text_block(img, [
    "MIXED CONTENT: CHART AND TEXT",
    "",
    "This page contains text alongside colored",
    "graphical elements. A bar chart in red,",
    "blue, and green demonstrates the need for",
    "color-preservation mode. A line graph is",
    "overlaid on the chart area.",
], start_y=80, x=80, spacing=40)
img = add_mixed_content(img)
add_text_block(img, [
    "Color-preservation mode processes only the",
    "L channel in LAB space, keeping A and B",
    "channels intact for accurate color output.",
], start_y=680, x=80, spacing=40, font_scale=0.6)
save_sample(img, "d02_mixed_chart.png")

# d03: Text document + large circular red stamp with "APPROVED"
img = create_base_page()
add_text_block(img, [
    "OFFICIAL DOCUMENT WITH RED STAMP",
    "",
    "This letter confirms the approval of the",
    "PDFCleaner project proposal as submitted",
    "on June 15, 2026. The large circular red",
    "stamp below certifies official approval.",
    "Color-preservation mode must retain the",
    "red stamp color without desaturation.",
], start_y=80, x=80, spacing=45)
# Large red stamp
cx, cy = 400, 700
cv2.circle(img, (cx, cy), 90, (40, 40, 210), 5, cv2.LINE_AA)
cv2.circle(img, (cx, cy), 78, (40, 40, 210), 2, cv2.LINE_AA)
cv2.putText(img, "APPROVED", (cx - 72, cy + 8),
            cv2.FONT_HERSHEY_DUPLEX, 0.8, (40, 40, 210), 2, cv2.LINE_AA)
cv2.putText(img, "2026-06-19", (cx - 60, cy + 30),
            cv2.FONT_HERSHEY_DUPLEX, 0.45, (40, 40, 210), 1, cv2.LINE_AA)
save_sample(img, "d03_red_stamp.png")

# d04: Text document + flowing blue ink signature
img = create_base_page()
add_text_block(img, [
    "SIGNED DOCUMENT TEST",
    "",
    "This document contains a handwritten blue",
    "ink signature scribble at the bottom area.",
    "The signature is drawn as a polyline with",
    "flowing curves. Color-preservation mode",
    "must keep the blue ink visible and legible.",
    "Aggressive thresholding may lose the fine",
    "signature strokes.",
], start_y=80, x=80, spacing=45)
# Blue signature scribble
sig_pts = np.array([
    [150, 850], [170, 830], [200, 860], [235, 825],
    [270, 855], [310, 820], [350, 850], [395, 810],
    [430, 845], [470, 815], [510, 840], [540, 830]
], np.int32)
cv2.polylines(img, [sig_pts], False, (180, 70, 30), 3, cv2.LINE_AA)
# Underline
cv2.line(img, (150, 870), (540, 870), (180, 70, 30), 1, cv2.LINE_AA)
add_text(img, "John Smith", (250, 910), font_scale=0.6, color=(100, 100, 100))
save_sample(img, "d04_blue_signature.png")

# d05: All text on pink paper + light gaussian noise
img = create_base_page()
# Pink tint (BGR: 230, 210, 250)
pink_bg = np.zeros_like(img)
pink_bg[:, :, 0] = 230  # B
pink_bg[:, :, 1] = 210  # G
pink_bg[:, :, 2] = 250  # R
img = cv2.addWeighted(img, 0.5, pink_bg, 0.5, 0)
add_text_block(img, [
    "COLORED PAPER TEST - PINK",
    "",
    "This document is printed on pink-tinted",
    "paper with BGR values (230, 210, 250).",
    "Light Gaussian noise is added to simulate",
    "scanner sensor noise on colored paper.",
    "The pipeline must normalize the pink tint",
    "and extract clean text. Light-clean mode",
    "preserves the subtle color while cleaning.",
], start_y=100, x=80, spacing=45)
img = add_noise_gaussian(img, mean=0, var=8)
save_sample(img, "d05_colored_paper.png")


# ==============================================================================
# CATEGORY E: Rotation & Orientation (e01 - e05)
# ==============================================================================
print("--- Category E: Rotation & Orientation ---")

# e01: Text rotated 3 degrees
img = create_base_page()
add_text_block(img, [
    "SKEW TEST: 3 DEGREES CLOCKWISE",
    "",
    "This page is rotated by positive 3 degrees.",
    "A mild skew that the deskew algorithm should",
    "detect and correct with high precision.",
    "The minAreaRect approach works well for",
    "angles in the range of -15 to 15 degrees.",
    "After correction, text should be horizontal.",
], start_y=100, x=80, spacing=45)
img = rotate_image(img, 3.0)
save_sample(img, "e01_skewed_3deg.png")

# e02: Text rotated -12 degrees
img = create_base_page()
add_text_block(img, [
    "SKEW TEST: NEGATIVE 12 DEGREES",
    "",
    "This page has a significant tilt of minus",
    "12 degrees. Larger angles are harder to",
    "detect correctly because the bounding rect",
    "ambiguity increases. The pre-normalization",
    "step helps avoid false angle detection.",
    "Strong-background-removal is the preset.",
], start_y=100, x=80, spacing=45)
img = rotate_image(img, -12.0)
save_sample(img, "e02_skewed_12deg.png")

# e03: Text rotated 8 degrees with shadow gradient
img = create_base_page()
add_text_block(img, [
    "SKEW TEST: 8 DEGREES WITH SHADOW",
    "",
    "This page is rotated 8 degrees and has a",
    "radial shadow gradient added on top.",
    "The critical fix in deskew normalizes the",
    "background before Otsu threshold, so the",
    "shadow pixels do not confuse the angle",
    "detection. Without the fix, the shadow",
    "creates false text regions that skew the angle.",
], start_y=100, x=80, spacing=45)
img = add_shadow_gradient(img, start_intensity=1.0, end_intensity=0.45, direction='radial')
img = rotate_image(img, 8.0)
save_sample(img, "e03_skewed_neg8deg.png")

# e04: Text rotated -5 degrees + salt&pepper noise
img = create_base_page()
add_text_block(img, [
    "SKEW TEST: -5 DEG WITH NOISE",
    "",
    "This page is tilted negative 5 degrees and",
    "has salt-and-pepper noise at 0.02 density.",
    "The combination tests whether the deskew",
    "can handle noisy binarization. Noise creates",
    "random foreground pixels that may skew the",
    "minAreaRect result. Median blur before Otsu",
    "helps suppress noise in the deskew path.",
], start_y=100, x=80, spacing=45)
img = rotate_image(img, -5.0)
img = add_noise_salt_pepper(img, amount=0.02)
save_sample(img, "e04_skewed_with_noise.png")

# e05: Text rotated 4.5 degrees + faded text (low contrast, gamma darken)
img = create_base_page()
add_text_block(img, [
    "SKEW TEST: 4.5 DEG FADED TEXT",
    "",
    "This page is tilted 4.5 degrees and the",
    "text is severely faded with low contrast.",
    "A gamma darkening effect reduces visibility.",
    "Text-contrast-boost mode with strong gamma",
    "correction (0.6) recovers faded text well.",
    "The deskew must detect angle on faint text.",
], start_y=100, x=80, spacing=45, color=(160, 160, 160))
# Apply gamma to darken/fade
gamma_val = 1.8
inv_gamma = 1.0 / gamma_val
table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in range(256)]).astype(np.uint8)
img = cv2.LUT(img, table)
img = rotate_image(img, 4.5)
save_sample(img, "e05_skewed_faded.png")


# ==============================================================================
# CATEGORY F: Composite Multi-Error (f01 - f05)
# ==============================================================================
print("--- Category F: Composite Multi-Error ---")

# f01: Radial shadow (end=0.3) + 8-degree tilt + GaussianBlur ksize=5 + ghost text
img = create_base_page()
add_text_block(img, [
    "COMPOSITE 1: SHADOW + SKEW + BLUR + GHOST",
    "",
    "This page combines four defects at once:",
    "1. Heavy radial shadow (end intensity 0.3)",
    "2. Page tilt of 8 degrees counter-clockwise",
    "3. Gaussian blur with ksize=5 (mild blur)",
    "4. Ghost text bleed-through from back page",
    "The strong-background-removal preset with",
    "deskew enabled handles this combination.",
], start_y=100, x=80, spacing=45)
img = add_bleed_through(img)
img = add_shadow_gradient(img, start_intensity=1.0, end_intensity=0.3, direction='radial')
img = add_out_of_focus(img, ksize=5)
img = rotate_image(img, 8.0)
save_sample(img, "f01_shadow_skew_blur.png")

# f02: Yellow aging + coffee stain + creases + JPEG quality=15
img = create_base_page()
add_text_block(img, [
    "COMPOSITE 2: AGING + STAIN + FOLDS + JPEG",
    "",
    "This page has multiple physical defects:",
    "1. Yellow paper aging (oxidized cellulose)",
    "2. Brown coffee stain near center-right",
    "3. Crease fold lines across the surface",
    "4. Heavy JPEG compression (quality=15)",
    "Print-optimized mode binarizes cleanly",
    "after background normalization removes stains.",
], start_y=100, x=80, spacing=45)
img = add_yellow_aging(img)
img = add_coffee_stain(img, center=(550, 420), radius=80)
img = add_creases(img, count=4)
img = add_jpeg_artifacts(img, quality=15)
save_sample(img, "f02_jpeg_stain_fold.png")

# f03: Low DPI + salt&pepper 0.025 + punch holes + dark left edge
img = create_base_page()
add_text_block(img, [
    "COMPOSITE 3: LOW DPI + NOISE + HOLES + EDGE",
    "",
    "This page combines low-resolution artifacts:",
    "1. Downscale/upscale low DPI pixelation",
    "2. Heavy salt-and-pepper noise at 0.025",
    "3. Three punch holes on the left margin",
    "4. Dark photocopy edge on the left side",
    "Print-optimized mode with median blur and",
    "morphology cleanup produces clean output.",
], start_y=100, x=80, spacing=45)
img[0:1100, 0:25] = [35, 35, 35]  # Dark left edge
img = add_punch_holes(img)
# Low DPI
small = cv2.resize(img, (400, 550), interpolation=cv2.INTER_LINEAR)
img = cv2.resize(small, (800, 1100), interpolation=cv2.INTER_NEAREST)
img = add_noise_salt_pepper(img, amount=0.025)
save_sample(img, "f03_lowdpi_noise_holes.png")

# f04: Text + color chart + red stamp + blue signature + slight radial shadow
img = create_base_page()
add_text_block(img, [
    "COMPOSITE 4: COLOR CHART + STAMP + SIGNATURE",
    "",
    "This administrative report contains:",
    "1. Text content with mixed formatting",
    "2. Colored bar chart and line graph",
    "3. Red approval stamp at bottom right",
    "4. Blue ink signature below the text",
    "5. Slight radial shadow (end=0.85)",
    "Color-preservation mode keeps all colors.",
], start_y=80, x=80, spacing=42)
# Blue signature
sig_pts = np.array([
    [200, 900], [220, 880], [250, 910], [285, 878],
    [320, 905], [360, 870], [400, 900], [440, 875]
], np.int32)
cv2.polylines(img, [sig_pts], False, (180, 70, 30), 3, cv2.LINE_AA)
img = add_mixed_content(img)
img = add_shadow_gradient(img, start_intensity=1.0, end_intensity=0.85, direction='radial')
save_sample(img, "f04_color_stamp_sig.png")

# f05: Pink paper + diagonal watermark + blue handwriting + finger occlusion + slight blur
img = create_base_page()
add_text_block(img, [
    "COMPOSITE 5: WATERMARK + PINK + HAND + FINGER",
    "",
    "This complex test case combines five issues:",
    "1. Pink-tinted paper background",
    "2. Diagonal CONFIDENTIAL watermark",
    "3. Blue handwritten annotation notes",
    "4. Finger occlusion at bottom-right corner",
    "5. Slight Gaussian blur with ksize=3",
    "Light-clean mode gently cleans this page.",
], start_y=100, x=80, spacing=45)
# Pink tint
pink_tint = np.zeros_like(img)
pink_tint[:, :, 0] = 230
pink_tint[:, :, 1] = 210
pink_tint[:, :, 2] = 250
img = cv2.addWeighted(img, 0.75, pink_tint, 0.25, 0)
img = add_watermark(img, text="CONFIDENTIAL")
# Blue handwriting
cv2.putText(img, "Check this section!", (120, 750),
            cv2.FONT_HERSHEY_SCRIPT_SIMPLEX, 0.9, (150, 40, 20), 2, cv2.LINE_AA)
cv2.arrowedLine(img, (100, 735), (130, 700), (150, 40, 20), 3, tipLength=0.3)
img = add_finger_occlusion(img)
img = add_out_of_focus(img, ksize=3)
save_sample(img, "f05_watermark_pink_finger.png")


# ==============================================================================
# SUMMARY
# ==============================================================================
print(f"\n=== SUMMARY ===")
print(f"Total images generated: {generated_count}/30")
print(f"Output directory: {SAMPLE_DIR}")
print(f"Categories: A(Basic Scans), B(Quality Issues), C(Paper Damage),")
print(f"            D(Content & Layout), E(Rotation), F(Composite Multi-Error)")
print("All 30 sample images generated successfully!")
