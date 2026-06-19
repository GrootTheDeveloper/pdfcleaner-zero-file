import os
import cv2
import numpy as np

def create_base_page(width=800, height=1100, bg_color=255):
    # Create white canvas
    return np.ones((height, width, 3), dtype=np.uint8) * bg_color

def add_text(img, text, position, font_scale=0.8, color=(0, 0, 0), thickness=2):
    # Draw text using OpenCV Hershey Duplex
    cv2.putText(img, text, position, cv2.FONT_HERSHEY_DUPLEX, font_scale, color, thickness, cv2.LINE_AA)

def add_noise_salt_pepper(img, amount=0.01):
    # Salt and pepper noise
    noisy = img.copy()
    # Add salt (white noise)
    num_salt = np.ceil(amount * img.size * 0.5)
    coords = [np.random.randint(0, i - 1, int(num_salt)) for i in img.shape[:2]]
    noisy[coords[0], coords[1]] = [255, 255, 255]
    
    # Add pepper (black noise)
    num_pepper = np.ceil(amount * img.size * 0.5)
    coords = [np.random.randint(0, i - 1, int(num_pepper)) for i in img.shape[:2]]
    noisy[coords[0], coords[1]] = [0, 0, 0]
    return noisy

def add_noise_gaussian(img, mean=0, var=10):
    # Gaussian noise
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
        # Radial shadow from center to bottom-right
        cx, cy = int(w * 0.2), int(h * 0.2) # Light source at top-left
        for y in range(h):
            for x in range(w):
                dist = np.sqrt((x - cx)**2 + (y - cy)**2)
                max_dist = np.sqrt((w - cx)**2 + (h - cy)**2)
                factor = start_intensity - (start_intensity - end_intensity) * (dist / max_dist)
                mask[y, x] = factor
    elif direction == 'linear':
        # Linear shadow from left to right
        for x in range(w):
            factor = start_intensity - (start_intensity - end_intensity) * (x / w)
            mask[:, x] = factor
            
    # Apply mask
    shaded = img.astype(np.float32)
    for i in range(3):
        shaded[:, :, i] *= mask
    return np.clip(shaded, 0, 255).astype(np.uint8)

def add_yellow_aging(img):
    # Simulate yellowed aging paper
    h, w, c = img.shape
    # Add yellowish tint
    tint = np.zeros_like(img)
    tint[:, :, 0] = 180 # Blue channel lower
    tint[:, :, 1] = 230 # Green channel mid
    tint[:, :, 2] = 250 # Red channel high
    
    aged = cv2.addWeighted(img, 0.7, tint, 0.3, 0)
    return aged

# Create notebooks directory if not exists
os.makedirs('notebooks/samples', exist_ok=True)

# 1. Generate Sample Book Page (Uneven lighting/shadow)
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
# Add radial shadow
book_img = add_shadow_gradient(book_img, start_intensity=1.0, end_intensity=0.35, direction='radial')
# Add mild gaussian noise
book_img = add_noise_gaussian(book_img, var=5)
cv2.imwrite('notebooks/samples/sample_book.png', book_img)

# 2. Generate Sample Receipt (Faded printing, low contrast, speckles)
print("Generating sample_receipt.png...")
receipt_img = create_base_page(width=500, height=800, bg_color=245)
add_text(receipt_img, "SUPERMARKET CO., LTD", (100, 80), font_scale=0.9, thickness=2)
add_text(receipt_img, "Store #4810 - Cashier #02", (100, 120), font_scale=0.7)
add_text(receipt_img, "-----------------------------------", (80, 160))
add_text(receipt_img, "ITEM 1         $12.50", (80, 200), font_scale=0.7)
add_text(receipt_img, "ITEM 2         $3.99", (80, 240), font_scale=0.7)
add_text(receipt_img, "ITEM 3 (FADED) $45.00", (80, 280), font_scale=0.7, color=(120, 120, 120)) # Faded text
add_text(receipt_img, "ITEM 4         $1.50", (80, 320), font_scale=0.7)
add_text(receipt_img, "-----------------------------------", (80, 360))
add_text(receipt_img, "SUBTOTAL       $62.99", (80, 400), font_scale=0.8, thickness=2)
add_text(receipt_img, "TAX (8%)       $5.04", (80, 440), font_scale=0.7)
add_text(receipt_img, "TOTAL          $68.03", (80, 480), font_scale=0.9, thickness=2)
add_text(receipt_img, "-----------------------------------", (80, 520))
add_text(receipt_img, "THANK YOU FOR SHOPPING WITH US!", (60, 580), font_scale=0.6)
# Add linear shadow gradient (e.g. folded receipt)
receipt_img = add_shadow_gradient(receipt_img, start_intensity=1.0, end_intensity=0.6, direction='linear')
# Add salt and pepper noise (dirt)
receipt_img = add_noise_salt_pepper(receipt_img, amount=0.015)
cv2.imwrite('notebooks/samples/sample_receipt.png', receipt_img)

# 3. Generate Sample Handwriting/Yellowed document (Aged paper, dark spots)
print("Generating sample_handwriting.png...")
hand_img = create_base_page()
add_text(hand_img, "Personal Journal Entry - June 2026", (80, 100), font_scale=0.9, thickness=2)
add_text(hand_img, "Today we started implementing the processing pipeline.", (80, 160))
add_text(hand_img, "The algorithm needs to deal with yellowed paper.", (80, 200))
add_text(hand_img, "Using adaptive thresholding we can separate text", (80, 240))
add_text(hand_img, "from the messy background efficiently.", (80, 280))
# Add yellow aging
hand_img = add_yellow_aging(hand_img)
# Add some coffee stains (dark circles)
cv2.circle(hand_img, (600, 500), 80, (100, 150, 180), -1) # Coffee stain base
# Add blur to stain to make it realistic
hand_img = cv2.GaussianBlur(hand_img, (51, 51), 0)
# Add salt and pepper noise
hand_img = add_noise_salt_pepper(hand_img, amount=0.005)
cv2.imwrite('notebooks/samples/sample_handwriting.png', hand_img)

# 4. Generate Heavy Noise Photocopy (Gray background, edge noise)
print("Generating sample_photocopy.png...")
photo_img = create_base_page()
add_text(photo_img, "CONFIDENTIAL CONTRACT AGREEMENT", (100, 100), font_scale=1.0, thickness=2)
add_text(photo_img, "1. Parties: Company A and Partner B", (80, 160))
add_text(photo_img, "2. Purpose: Zero-file PDF Cleaning Platform", (80, 200))
add_text(photo_img, "3. Term: 10 weeks duration starting today.", (80, 240))
add_text(photo_img, "4. Scope: Processing documents client-side.", (80, 280))
# Darken background to simulate gray photocopy
photo_img = cv2.addWeighted(photo_img, 0.7, np.ones_like(photo_img) * 120, 0.3, 0)
# Add heavy noise
photo_img = add_noise_salt_pepper(photo_img, amount=0.03)
# Add photocopy borders (black stripes on edge)
photo_img[0:1100, 0:30] = [20, 20, 20] # left border
photo_img[0:1100, 770:800] = [20, 20, 20] # right border
photo_img = cv2.GaussianBlur(photo_img, (5, 5), 0)
cv2.imwrite('notebooks/samples/sample_photocopy.png', photo_img)

print("Generated 4 sample scanned images in notebooks/samples/")
