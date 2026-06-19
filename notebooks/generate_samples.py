import os
import cv2
import numpy as np

def create_base_page(width=800, height=1100, bg_color=255):
    return np.ones((height, width, 3), dtype=np.uint8) * bg_color

def add_text(img, text, position, font_scale=0.8, color=(0, 0, 0), thickness=2):
    cv2.putText(img, text, position, cv2.FONT_HERSHEY_DUPLEX, font_scale, color, thickness, cv2.LINE_AA)

def add_noise_salt_pepper(img, amount=0.01):
    noisy = img.copy()
    num_salt = np.ceil(amount * img.size * 0.5)
    coords = [np.random.randint(0, i - 1, int(num_salt)) for i in img.shape[:2]]
    noisy[coords[0], coords[1]] = [255, 255, 255]
    
    num_pepper = np.ceil(amount * img.size * 0.5)
    coords = [np.random.randint(0, i - 1, int(num_pepper)) for i in img.shape[:2]]
    noisy[coords[0], coords[1]] = [0, 0, 0]
    return noisy

def add_noise_gaussian(img, mean=0, var=10):
    row, col, ch = img.shape
    sigma = var ** 0.5
    gauss = np.random.normal(mean, sigma, (row, col, ch))
    noisy = img.astype(np.float32) + gauss
    noisy = np.clip(noisy, 0, 255).astype(np.uint8)
    return noisy

def add_shadow_gradient(img, start_intensity=1.0, end_intensity=0.4, direction='radial'):
    h, w, c = img.shape
    mask = np.ones((h, w), dtype=np.float32)
    
    if direction == 'radial':
        cx, cy = int(w * 0.2), int(h * 0.2)
        for y in range(h):
            for x in range(w):
                dist = np.sqrt((x - cx)**2 + (y - cy)**2)
                max_dist = np.sqrt((w - cx)**2 + (h - cy)**2)
                factor = start_intensity - (start_intensity - end_intensity) * (dist / max_dist)
                mask[y, x] = factor
    elif direction == 'linear':
        for x in range(w):
            factor = start_intensity - (start_intensity - end_intensity) * (x / w)
            mask[:, x] = factor
            
    shaded = img.astype(np.float32)
    for i in range(3):
        shaded[:, :, i] *= mask
    return np.clip(shaded, 0, 255).astype(np.uint8)

def add_yellow_aging(img):
    h, w, c = img.shape
    tint = np.zeros_like(img)
    tint[:, :, 0] = 180 # B
    tint[:, :, 1] = 230 # G
    tint[:, :, 2] = 250 # R
    aged = cv2.addWeighted(img, 0.7, tint, 0.3, 0)
    return aged

# NEW ANOMALY GENERATION FUNCTIONS

def add_motion_blur(img, size=9):
    # Create motion blur kernel diagonally
    kernel = np.zeros((size, size))
    for i in range(size):
        kernel[i, i] = 1.0
    kernel = kernel / size
    return cv2.filter2D(img, -1, kernel)

def add_out_of_focus(img, ksize=7):
    return cv2.GaussianBlur(img, (ksize, ksize), 0)

def add_jpeg_artifacts(img, quality=15):
    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
    result, encimg = cv2.imencode('.jpg', img, encode_param)
    return cv2.imdecode(encimg, 1)

def add_creases_and_folds(img):
    h, w, c = img.shape
    noisy = img.copy().astype(np.float32)
    # Generate 2-3 random fold lines
    for _ in range(np.random.randint(2, 4)):
        # Random start/end points
        x1, y1 = np.random.randint(0, w), 0
        x2, y2 = np.random.randint(0, w), h
        if np.random.rand() > 0.5:
            x1, y1 = 0, np.random.randint(0, h)
            x2, y2 = w, np.random.randint(0, h)
        
        # Crease: draw dark shadow line and white highlight line parallel
        cv2.line(noisy, (x1, y1), (x2, y2), (180, 180, 180), thickness=2)
        cv2.line(noisy, (x1 + 2, y1 + 1), (x2 + 2, y2 + 1), (255, 255, 255), 2)
    
    noisy = np.clip(noisy, 0, 255).astype(np.uint8)
    return cv2.GaussianBlur(noisy, (3, 3), 0)

def add_punch_holes(img):
    h, w, c = img.shape
    noisy = img.copy()
    hole_color = (40, 40, 40) # Dark grey punch hole shadow
    radius = 12
    # Standard 3-hole punch on the left margin
    for y in [h // 4, h // 2, 3 * h // 4]:
        cv2.circle(noisy, (35, y), radius, hole_color, -1)
        cv2.circle(noisy, (35, y), radius + 1, (230, 230, 230), 1) # highlight edge
    return noisy

def add_bleed_through(img):
    h, w, c = img.shape
    overlay = np.ones_like(img) * 255
    text_color = (220, 220, 220) # Faint gray text hằn lên
    # Mirrored text effect
    add_text(overlay, "SHTIMROGAL LAUTREV ED ISU", (w - 450, h // 3), font_scale=0.7, color=text_color, thickness=2)
    add_text(overlay, "ETALPMET ETISOPMOC GNILEED EB OT", (w - 550, 2 * h // 3), font_scale=0.7, color=text_color, thickness=2)
    
    bled = cv2.multiply(img.astype(np.float32) / 255.0, overlay.astype(np.float32) / 255.0) * 255
    return np.clip(bled, 0, 255).astype(np.uint8)

def add_watermark(img):
    h, w, c = img.shape
    overlay = img.copy()
    watermark_text = "CONFIDENTIAL"
    
    # Create canvas for watermark
    txt_img = np.zeros((h, w, 3), dtype=np.uint8)
    cv2.putText(txt_img, watermark_text, (50, h // 2), cv2.FONT_HERSHEY_DUPLEX, 2.5, (230, 230, 230), 8, cv2.LINE_AA)
    
    # Rotate 45 deg
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, 45, 1.0)
    rotated_txt = cv2.warpAffine(txt_img, M, (w, h), borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0))
    
    mask = (rotated_txt > 0).astype(bool)
    overlay[mask] = cv2.addWeighted(overlay, 0.85, rotated_txt, 0.15, 0)[mask]
    return overlay

def add_finger_occlusion(img):
    h, w, c = img.shape
    noisy = img.copy()
    # Draw skin colored polygon on right edge
    finger_color = (150, 175, 235) # BGR skin tone
    pts = np.array([[w, h // 2 - 80], [w - 90, h // 2 - 30], [w - 90, h // 2 + 30], [w, h // 2 + 80]], np.int32)
    pts = pts.reshape((-1, 1, 2))
    cv2.fillPoly(noisy, [pts], finger_color)
    return noisy

def add_mixed_content(img):
    h, w, c = img.shape
    noisy = img.copy()
    
    # Draw grid/chart
    cv2.rectangle(noisy, (400, 350), (720, 580), (245, 245, 240), -1)
    cv2.rectangle(noisy, (400, 350), (720, 580), (180, 180, 180), 2)
    # Draw graph lines
    pts1 = np.array([[420, 550], [480, 480], [540, 510], [600, 410], [700, 380]], np.int32)
    cv2.polylines(noisy, [pts1], False, (220, 50, 50), 3) # Blue line
    pts2 = np.array([[420, 520], [480, 450], [540, 420], [600, 470], [700, 440]], np.int32)
    cv2.polylines(noisy, [pts2], False, (50, 180, 50), 3) # Green line
    
    # Draw red approval stamp
    cv2.circle(noisy, (620, 850), 65, (50, 50, 220), 4) # Red (BGR)
    cv2.circle(noisy, (620, 850), 58, (50, 50, 220), 1, cv2.LINE_AA)
    cv2.putText(noisy, "APPROVED", (575, 845), cv2.FONT_HERSHEY_DUPLEX, 0.5, (50, 50, 220), 2, cv2.LINE_AA)
    cv2.putText(noisy, "PDFCLEANER", (570, 868), cv2.FONT_HERSHEY_DUPLEX, 0.4, (50, 50, 220), 1, cv2.LINE_AA)
    
    return noisy

os.makedirs('notebooks/samples', exist_ok=True)

# ----------------- ORIGINAL 5 SAMPLES -----------------
# 1. Generate Sample Book Page
print("Generating sample_book.png...")
book_img = create_base_page()
add_text(book_img, "CHAPTER I: THE PRINCIPLES OF CLEANING", (80, 100), font_scale=1.0, thickness=2)
add_text(book_img, "This document serves as a test case for PDFCleaner.", (80, 160))
add_text(book_img, "We simulate real-world scanned PDF artifacts, which include:", (80, 200))
add_text(book_img, "- Dark shadows caused by camera scanning angle.", (100, 240))
add_text(book_img, "- Noise and page-folding gradients.", (100, 280))
add_text(book_img, "- Lower contrast text in faded regions.", (100, 320))
add_text(book_img, "Local processing on client side solves privacy issues.", (80, 380))
add_text(book_img, "The backend only tracks presets and system events.", (80, 420))
add_text(book_img, "Privacy-first model is the future of web applications.", (80, 460))
book_img = add_shadow_gradient(book_img, start_intensity=1.0, end_intensity=0.35, direction='radial')
book_img = add_noise_gaussian(book_img, var=5)
cv2.imwrite('notebooks/samples/sample_book.png', book_img)

# 2. Generate Sample Receipt
print("Generating sample_receipt.png...")
receipt_img = create_base_page(width=500, height=800, bg_color=245)
add_text(receipt_img, "SUPERMARKET CO., LTD", (100, 80), font_scale=0.9, thickness=2)
add_text(receipt_img, "Store #4810 - Cashier #02", (100, 120), font_scale=0.7)
add_text(receipt_img, "-----------------------------------", (80, 160))
add_text(receipt_img, "ITEM 1         $12.50", (80, 200), font_scale=0.7)
add_text(receipt_img, "ITEM 2         $3.99", (80, 240), font_scale=0.7)
add_text(receipt_img, "ITEM 3 (FADED) $45.00", (80, 280), font_scale=0.7, color=(120, 120, 120))
add_text(receipt_img, "ITEM 4         $1.50", (80, 320), font_scale=0.7)
add_text(receipt_img, "-----------------------------------", (80, 360))
add_text(receipt_img, "SUBTOTAL       $62.99", (80, 400), font_scale=0.8, thickness=2)
add_text(receipt_img, "TAX (8%)       $5.04", (80, 440), font_scale=0.7)
add_text(receipt_img, "TOTAL          $68.03", (80, 480), font_scale=0.9, thickness=2)
add_text(receipt_img, "-----------------------------------", (80, 520))
add_text(receipt_img, "THANK YOU FOR SHOPPING WITH US!", (60, 580), font_scale=0.6)
receipt_img = add_shadow_gradient(receipt_img, start_intensity=1.0, end_intensity=0.6, direction='linear')
receipt_img = add_noise_salt_pepper(receipt_img, amount=0.015)
cv2.imwrite('notebooks/samples/sample_receipt.png', receipt_img)

# 3. Generate Sample Handwriting
print("Generating sample_handwriting.png...")
hand_img = create_base_page()
add_text(hand_img, "Personal Journal Entry - June 2026", (80, 100), font_scale=0.9, thickness=2)
add_text(hand_img, "Today we started implementing the processing pipeline.", (80, 160))
add_text(hand_img, "The algorithm needs to deal with yellowed paper.", (80, 200))
add_text(hand_img, "Using adaptive thresholding we can separate text", (80, 240))
add_text(hand_img, "from the messy background efficiently.", (80, 280))
hand_img = add_yellow_aging(hand_img)
cv2.circle(hand_img, (600, 500), 80, (100, 150, 180), -1)
hand_img = cv2.GaussianBlur(hand_img, (51, 51), 0)
hand_img = add_noise_salt_pepper(hand_img, amount=0.005)
cv2.imwrite('notebooks/samples/sample_handwriting.png', hand_img)

# 4. Generate Heavy Noise Photocopy
print("Generating sample_photocopy.png...")
photo_img = create_base_page()
add_text(photo_img, "CONFIDENTIAL CONTRACT AGREEMENT", (100, 100), font_scale=1.0, thickness=2)
add_text(photo_img, "1. Parties: Company A and Partner B", (80, 160))
add_text(photo_img, "2. Purpose: Zero-file PDF Cleaning Platform", (80, 200))
add_text(photo_img, "3. Term: 10 weeks duration starting today.", (80, 240))
add_text(photo_img, "4. Scope: Processing documents client-side.", (80, 280))
photo_img = cv2.addWeighted(photo_img, 0.7, np.ones_like(photo_img) * 120, 0.3, 0)
photo_img[0:1100, 0:30] = [20, 20, 20]
photo_img[0:1100, 770:800] = [20, 20, 20]
photo_img = cv2.GaussianBlur(photo_img, (3, 3), 0)
photo_img = add_noise_salt_pepper(photo_img, amount=0.02)
cv2.imwrite('notebooks/samples/sample_photocopy.png', photo_img)

# 5. Generate Skewed/Tilted Book Page
print("Generating sample_skewed.png...")
skewed_img = create_base_page()
add_text(skewed_img, "AUTO-DESKEW ALGORITHM TESTING", (100, 100), font_scale=1.0, thickness=2)
add_text(skewed_img, "This page is intentionally rotated to test the straightening feature.", (80, 160))
add_text(skewed_img, "We use OpenCV minAreaRect to detect the dominant angle of the text.", (80, 200))
add_text(skewed_img, "Then we rotate the image back to align it horizontally.", (80, 240))
add_text(skewed_img, "Deskewing is a crucial pre-processing step for OCR engines", (80, 280))
add_text(skewed_img, "and improves overall reading comfort.", (80, 320))
# Rotate by 6.5 degrees clockwise
(h, w) = skewed_img.shape[:2]
center = (w // 2, h // 2)
M = cv2.getRotationMatrix2D(center, -6.5, 1.0)
skewed_img = cv2.warpAffine(skewed_img, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=(255, 255, 255))
cv2.imwrite('notebooks/samples/sample_skewed.png', skewed_img)


# ----------------- COMPOSITE SAMPLES (NEW) -----------------
# 6. Sample Composite 1: bóng loang lổ + nghiêng + nhòe + ghost text
print("Generating sample_composite_1.png...")
comp1 = create_base_page()
add_text(comp1, "COMPOSITE TRIAL 1: COMPLEX GEOMETRY", (80, 100), font_scale=0.9, thickness=2)
add_text(comp1, "This page simulates a combination of severe geometry issues.", (80, 160))
add_text(comp1, "It contains background bleeding (ghost text) from back-page.", (80, 210))
add_text(comp1, "A heavy radial shadow gradient covers the top-left corner.", (80, 260))
add_text(comp1, "The camera was slightly out of focus, causing blurriness.", (80, 310))
add_text(comp1, "Finally, the page is tilted by 8 degrees counter-clockwise.", (80, 360))
add_text(comp1, "Verification gate requires: straightening, background normalization,", (80, 420))
add_text(comp1, "and preserving blurred text strokes.", (80, 470))

comp1 = add_bleed_through(comp1)
comp1 = add_shadow_gradient(comp1, start_intensity=1.0, end_intensity=0.25, direction='radial')
comp1 = add_out_of_focus(comp1, ksize=5)

# Rotate by 8 degrees CCW (which is +8 degrees rotation in warpAffine)
(h, w) = comp1.shape[:2]
center = (w // 2, h // 2)
M = cv2.getRotationMatrix2D(center, 8.0, 1.0)
comp1 = cv2.warpAffine(comp1, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=(255, 255, 255))
cv2.imwrite('notebooks/samples/sample_composite_1.png', comp1)


# 7. Sample Composite 2: jpeg nén + giấy vàng + vết cà phê + nếp gấp + kẹp giấy
print("Generating sample_composite_2.png...")
comp2 = create_base_page()
add_text(comp2, "COMPOSITE TRIAL 2: PHYSICAL DAMAGE & ARTIFACTS", (80, 100), font_scale=0.8, thickness=2)
add_text(comp2, "This sample focuses on physical page degradation.", (80, 160))
add_text(comp2, "The page is colored with a yellowed paper aging tint.", (80, 210))
add_text(comp2, "A messy circular coffee stain is visible on the page.", (80, 260))
add_text(comp2, "Crease and fold lines traverse the document vertically.", (80, 310))
add_text(comp2, "A staple kẹp giấy appears at the top left corner.", (80, 360))
add_text(comp2, "Finally, the image has been heavily compressed via JPEG.", (80, 410))

comp2 = add_yellow_aging(comp2)

# Add coffee stain
cv2.circle(comp2, (550, 420), 75, (100, 140, 175), -1)
# Blur the coffee stain to bleed into paper fibers
mask = np.zeros_like(comp2)
cv2.circle(mask, (550, 420), 75, (255, 255, 255), -1)
blurred = cv2.GaussianBlur(comp2, (41, 41), 0)
comp2 = np.where(mask > 0, blurred, comp2)

comp2 = add_creases_and_folds(comp2)

# Draw staple (kẹp giấy) at top left
cv2.rectangle(comp2, (25, 20), (40, 75), (170, 170, 170), -1)
cv2.rectangle(comp2, (25, 20), (40, 75), (110, 110, 110), 2)
# Draw paper staple curves (a simple arc using lines/ellipses)
cv2.ellipse(comp2, (32, 20), (7, 5), 0, 0, 180, (110, 110, 110), 2)

comp2 = add_jpeg_artifacts(comp2, quality=15)
cv2.imwrite('notebooks/samples/sample_composite_2.png', comp2)


# 8. Sample Composite 3: low DPI + nhiễu photocopy + thấu mực + lỗ bấm kim
print("Generating sample_composite_3.png...")
comp3 = create_base_page()
add_text(comp3, "COMPOSITE TRIAL 3: RECEIPT & HEAVY PHOTOCOPY NOISE", (80, 100), font_scale=0.8, thickness=2)
add_text(comp3, "This page simulates a low quality photocopy.", (80, 160))
add_text(comp3, "It features high density salt & pepper noise.", (80, 210))
add_text(comp3, "A dark photocopying edge lies on the left margin.", (80, 260))
add_text(comp3, "Bleed-through ghost text shows up faintly in the background.", (80, 310))
add_text(comp3, "Three punched binder holes sit near the left border.", (80, 360))
add_text(comp3, "Finally, it has a low DPI pixelated look.", (80, 410))

comp3 = add_bleed_through(comp3)
# Photocopy dark edge on left
comp3[0:1100, 0:25] = [35, 35, 35]
comp3 = add_punch_holes(comp3)
comp3 = add_noise_salt_pepper(comp3, amount=0.025)

# Downscale then upscale to get low DPI effect
h, w = comp3.shape[:2]
comp3_low = cv2.resize(comp3, (400, 550), interpolation=cv2.INTER_LINEAR)
comp3 = cv2.resize(comp3_low, (w, h), interpolation=cv2.INTER_NEAREST)

cv2.imwrite('notebooks/samples/sample_composite_3.png', comp3)


# 9. Sample Composite 4: chữ in + biểu đồ vẽ màu + con dấu đỏ/xanh + chữ ký
print("Generating sample_composite_4.png...")
comp4 = create_base_page()
add_text(comp4, "COMPOSITE TRIAL 4: ADMINISTRATIVE REPORT WITH COLOR", (80, 100), font_scale=0.8, thickness=2)
add_text(comp4, "This page simulates a typical business document with mixed elements.", (80, 150))
add_text(comp4, "It includes high contrast text alongside colored figures.", (80, 190))
add_text(comp4, "A hand-signed signature in dark blue ink is located below.", (80, 230))
add_text(comp4, "A red approved seal / stamp is stamped in the bottom right corner.", (80, 270))
add_text(comp4, "Goal: preserve color chart and signature in color-preservation mode,", (80, 310))
add_text(comp4, "or completely binarize cleanly in print-optimized mode.", (80, 350))

# Blue signature scribble
pts = np.array([[200, 900], [210, 885], [230, 915], [260, 890], [290, 910], [330, 880], [380, 915]], np.int32)
cv2.polylines(comp4, [pts], False, (180, 80, 40), 3) # Blue (BGR)

comp4 = add_mixed_content(comp4)
comp4 = add_shadow_gradient(comp4, start_intensity=1.0, end_intensity=0.8, direction='radial')
comp4 = add_noise_gaussian(comp4, var=3)

cv2.imwrite('notebooks/samples/sample_composite_4.png', comp4)


# 10. Sample Composite 5: watermark nền + giấy màu hồng + viết tay bút mực
print("Generating sample_composite_5.png...")
comp5 = create_base_page()
add_text(comp5, "COMPOSITE TRIAL 5: HANDWRITTEN & WATERMARK", (80, 100), font_scale=0.8, thickness=2)
add_text(comp5, "This test case contains a security watermark as background.", (80, 160))
add_text(comp5, "The paper has a soft pink color tint.", (80, 210))
add_text(comp5, "We have blue handwritten notes pointing to key elements.", (80, 260))
add_text(comp5, "A finger occlusion is visible at the right edge.", (80, 310))
add_text(comp5, "Adaptive thresholding should keep handwriting visible.", (80, 360))

# Pink paper tint (BGR: B=225, G=215, R=255)
pink_tint = np.zeros_like(comp5)
pink_tint[:, :, 0] = 225
pink_tint[:, :, 1] = 215
pink_tint[:, :, 2] = 255
comp5 = cv2.addWeighted(comp5, 0.75, pink_tint, 0.25, 0)

comp5 = add_watermark(comp5)

# Blue handwriting notes (using script style)
cv2.putText(comp5, "Verify this specific layout!", (150, 750), cv2.FONT_HERSHEY_SCRIPT_SIMPLEX, 0.9, (150, 40, 20), 2, cv2.LINE_AA)
# Draw an arrow pointing to the text
cv2.arrowedLine(comp5, (100, 735), (130, 700), (150, 40, 20), 3, tipLength=0.3)

comp5 = add_finger_occlusion(comp5)
comp5 = add_out_of_focus(comp5, ksize=3)

cv2.imwrite('notebooks/samples/sample_composite_5.png', comp5)

print("\nGenerated 10 sample scanned images in notebooks/samples/ successfully (5 basic + 5 composite)!")
