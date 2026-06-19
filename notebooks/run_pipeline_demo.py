import cv2
import numpy as np
import os
import time

class DocumentCleanerPipeline:
    def __init__(self, config):
        self.config = config
        self.timings = {}
        self.detected_skew_angle = 0.0
        
    def deskew(self, img):
        # We need grayscale to calculate skew angle
        if len(img.shape) == 3:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        else:
            gray = img.copy()
            
        # Invert the image (text becomes white, background black)
        thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
        
        # Grab all coordinates of white pixels (text)
        coords = np.column_stack(np.where(thresh > 0))
        if len(coords) == 0:
            return img.copy(), 0.0
            
        # minAreaRect returns (center, size, angle)
        rect = cv2.minAreaRect(coords)
        angle = rect[-1]
        
        # Adjust angle to rotate back
        # In OpenCV 4.x minAreaRect returns angle in range [-90, 0] or [0, 90] depending on rotation
        if angle < -45:
            angle = -(90 + angle)
        elif angle > 45:
            angle = 90 - angle
        else:
            angle = -angle
            
        # Rotate the image
        (h, w) = img.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        # Warp with white background
        rotated = cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=(255, 255, 255))
        
        return rotated, angle

    def run(self, bgr_img):
        self.timings = {}
        stages = {}
        current_img = bgr_img.copy()
        
        # 0. Optional Auto-Deskew
        t0 = time.perf_counter()
        if self.config.get('enable_deskew', False):
            current_img, angle = self.deskew(current_img)
            self.detected_skew_angle = angle
        else:
            self.detected_skew_angle = 0.0
        self.timings['deskew'] = (time.perf_counter() - t0) * 1000
        stages['deskewed'] = current_img.copy()
        
        # 1. Grayscale
        t0 = time.perf_counter()
        if self.config.get('grayscale', True):
            gray = cv2.cvtColor(current_img, cv2.COLOR_BGR2GRAY)
        else:
            gray = current_img.copy()
        self.timings['grayscale'] = (time.perf_counter() - t0) * 1000
        stages['grayscale'] = gray.copy()
        
        # 2. Noise Reduction (Blur)
        t0 = time.perf_counter()
        if self.config.get('enable_noise_reduction', True):
            ksize = self.config.get('blur_kernel_size', 3)
            ksize = ksize if ksize % 2 == 1 else ksize + 1
            
            blur_type = self.config.get('blur_type', 'median')
            if blur_type == 'median':
                blurred = cv2.medianBlur(gray, ksize)
            elif blur_type == 'gaussian':
                blurred = cv2.GaussianBlur(gray, (ksize, ksize), 0)
            else:
                blurred = cv2.GaussianBlur(gray, (ksize, ksize), 0)
        else:
            blurred = gray.copy()
        self.timings['noise_reduction'] = (time.perf_counter() - t0) * 1000
        stages['noise_reduction'] = blurred.copy()
        
        # 3. Background Normalization
        t0 = time.perf_counter()
        if self.config.get('enable_background_norm', True):
            norm_ksize = self.config.get('norm_kernel_size', 25)
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (norm_ksize, norm_ksize))
            bg = cv2.morphologyEx(blurred, cv2.MORPH_CLOSE, kernel)
            normalized = cv2.divide(blurred, bg, scale=255)
        else:
            normalized = blurred.copy()
        self.timings['background_normalization'] = (time.perf_counter() - t0) * 1000
        stages['background_normalization'] = normalized.copy()
        
        # 4. Gamma Correction
        t0 = time.perf_counter()
        gamma = self.config.get('gamma', 1.0)
        if gamma != 1.0:
            invGamma = 1.0 / gamma
            table = np.array([((i / 255.0) ** invGamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
            gamma_corrected = cv2.LUT(normalized, table)
        else:
            gamma_corrected = normalized.copy()
        self.timings['gamma_correction'] = (time.perf_counter() - t0) * 1000
        stages['gamma_correction'] = gamma_corrected.copy()
        
        # 5. Contrast Enhancement (Stretching)
        t0 = time.perf_counter()
        contrast = self.config.get('contrast', 1.0)
        if contrast != 1.0 or True:
            contrast_stretched = cv2.normalize(gamma_corrected, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX)
        else:
            contrast_stretched = gamma_corrected.copy()
        self.timings['contrast_stretching'] = (time.perf_counter() - t0) * 1000
        stages['contrast_stretching'] = contrast_stretched.copy()
        
        # 6. Adaptive Thresholding
        t0 = time.perf_counter()
        if self.config.get('enable_thresholding', True):
            block = self.config.get('threshold_block_size', 21)
            block = block if block % 2 == 1 else block + 1
            c_val = self.config.get('threshold_c', 10)
            thresholded = cv2.adaptiveThreshold(
                contrast_stretched,
                255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY,
                block,
                c_val
            )
        else:
            thresholded = contrast_stretched.copy()
        self.timings['thresholding'] = (time.perf_counter() - t0) * 1000
        stages['thresholded'] = thresholded.copy()
        
        # 7. Morphology Cleanup (Noise Removal)
        t0 = time.perf_counter()
        if self.config.get('enable_morphology', True) and self.config.get('enable_thresholding', True):
            morph_size = self.config.get('morphology_kernel_size', 2)
            if morph_size > 0:
                kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (morph_size, morph_size))
                cleaned = cv2.morphologyEx(thresholded, cv2.MORPH_OPEN, kernel)
            else:
                cleaned = thresholded.copy()
        else:
            cleaned = thresholded.copy()
        self.timings['morphology'] = (time.perf_counter() - t0) * 1000
        stages['morphology'] = cleaned.copy()
        
        return stages

MODE_CONFIGS = {
    'light-clean': {
        'grayscale': True,
        'enable_noise_reduction': True,
        'blur_type': 'gaussian',
        'blur_kernel_size': 3,
        'enable_background_norm': False,
        'gamma': 1.1,
        'contrast': 1.1,
        'enable_thresholding': False,
        'enable_morphology': False
    },
    'strong-background-removal': {
        'grayscale': True,
        'enable_noise_reduction': True,
        'blur_type': 'median',
        'blur_kernel_size': 3,
        'enable_background_norm': True,
        'norm_kernel_size': 25,
        'gamma': 0.8,
        'contrast': 1.4,
        'enable_thresholding': True,
        'threshold_block_size': 25,
        'threshold_c': 15,
        'enable_morphology': True,
        'morphology_kernel_size': 2
    },
    'text-contrast-boost': {
        'grayscale': True,
        'enable_noise_reduction': True,
        'blur_type': 'median',
        'blur_kernel_size': 3,
        'enable_background_norm': True,
        'norm_ksize': 21,
        'gamma': 0.6,
        'contrast': 1.6,
        'enable_thresholding': True,
        'threshold_block_size': 21,
        'threshold_c': 12,
        'enable_morphology': True,
        'morphology_kernel_size': 2
    },
    'print-optimized': {
        'grayscale': True,
        'enable_noise_reduction': True,
        'blur_type': 'median',
        'blur_kernel_size': 3,
        'enable_background_norm': True,
        'norm_kernel_size': 21,
        'gamma': 0.8,
        'contrast': 1.4,
        'enable_thresholding': True,
        'threshold_block_size': 21,
        'threshold_c': 15,
        'enable_morphology': True,
        'morphology_kernel_size': 2
    },
    'compressed-output': {
        'grayscale': True,
        'enable_noise_reduction': True,
        'blur_type': 'median',
        'blur_kernel_size': 3,
        'enable_background_norm': True,
        'norm_kernel_size': 15,
        'gamma': 0.9,
        'contrast': 1.3,
        'enable_thresholding': True,
        'threshold_block_size': 15,
        'threshold_c': 10,
        'enable_morphology': True,
        'morphology_kernel_size': 2
    }
}

sample_dir = 'notebooks/samples'
output_dir = 'notebooks/outputs'
os.makedirs(output_dir, exist_ok=True)

test_cases = [
    ('Book Page (Shadows)', 'sample_book.png', 'strong-background-removal', False),
    ('Receipt (Faded)', 'sample_receipt.png', 'text-contrast-boost', False),
    ('Journal (Yellow/Coffee)', 'sample_handwriting.png', 'light-clean', False),
    ('Photocopy (Heavy Noise)', 'sample_photocopy.png', 'print-optimized', False),
    ('Skewed Page (Tilted)', 'sample_skewed.png', 'strong-background-removal', True)
]

for title, filename, mode, enable_deskew in test_cases:
    img_path = os.path.join(sample_dir, filename)
    img = cv2.imread(img_path)
    if img is None:
        print(f"Error: Could not load image at {img_path}")
        continue
    
    config = MODE_CONFIGS[mode].copy()
    config['enable_deskew'] = enable_deskew
    
    cleaner = DocumentCleanerPipeline(config)
    stages = cleaner.run(img)
    
    print(f"\n=== {title} processed with mode: {mode} ===")
    if enable_deskew:
        print(f"  Auto-Deskew: ENABLED")
        print(f"  Detected Skew Angle: {cleaner.detected_skew_angle:.2f} degrees")
    for stage, t in cleaner.timings.items():
        if stage == 'deskew' and not enable_deskew:
            continue
        print(f"  Stage '{stage}': {t:.2f} ms")
    total_t = sum(cleaner.timings.values())
    print(f"  Total execution time: {total_t:.2f} ms")
    
    # Save the final cleaned output
    cleaned_img = stages['morphology']
    out_path = os.path.join(output_dir, f"cleaned_{filename}")
    cv2.imwrite(out_path, cleaned_img)
    print(f"  Saved cleaned result to: {out_path}")

print("\nDone processing all demo test cases.")
