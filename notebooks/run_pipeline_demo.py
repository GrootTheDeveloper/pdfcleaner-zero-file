import cv2
import numpy as np
import os
import time

class DocumentCleanerPipeline:
    def __init__(self, config):
        self.config = config
        self.timings = {}
        self.detected_skew_angle = 0.0
        self.warnings = []
        
    def detect_anomalies(self, bgr_img):
        """
        Detect basic image quality issues: blur, overexposure, and cutoff edges.
        """
        self.warnings = []
        gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY) if len(bgr_img.shape) == 3 else bgr_img.copy()
        
        # 1. Blur detection (Laplacian Variance)
        lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        is_blurred = lap_var < 80.0
        if is_blurred:
            self.warnings.append(f"[WARN] Out of Focus (Laplacian var: {lap_var:.2f} < 80)")
            
        # 2. Overexposure detection (Saturated pixels > 25%)
        saturated_ratio = np.sum(gray >= 254) / gray.size
        is_overexposed = saturated_ratio > 0.25
        if is_overexposed:
            self.warnings.append(f"[WARN] Overexposed/Glare ({saturated_ratio*100:.1f}% pixels > 254)")
            
        # 3. Cut-off margin detection
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        h, w = thresh.shape
        margin = 15
        
        top_pixels = np.sum(thresh[0:margin, :] > 0)
        bottom_pixels = np.sum(thresh[h-margin:h, :] > 0)
        left_pixels = np.sum(thresh[:, 0:margin] > 0)
        right_pixels = np.sum(thresh[:, w-margin:w] > 0)
        
        is_cutoff = (top_pixels > 50 or bottom_pixels > 50 or left_pixels > 50 or right_pixels > 50)
        if is_cutoff:
            self.warnings.append(f"[WARN] Margin cut-off (Pixels at edges: T={top_pixels}, B={bottom_pixels}, L={left_pixels}, R={right_pixels})")
            
        return {
            'blur_variance': lap_var,
            'is_blurred': is_blurred,
            'saturated_ratio': saturated_ratio,
            'is_overexposed': is_overexposed,
            'edge_pixels': (top_pixels, bottom_pixels, left_pixels, right_pixels),
            'is_cutoff': is_cutoff
        }

    def deskew(self, img):
        if len(img.shape) == 3:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        else:
            gray = img.copy()
            
        # FIX: Pre-normalize background so heavy shadow doesn't confuse the Otsu threshold
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (51, 51))
        bg = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, kernel)
        norm_gray = cv2.divide(gray, bg, scale=255)
        
        # Smooth noise before thresholding to prevent bounding rect issues
        norm_gray = cv2.medianBlur(norm_gray, 5)
        
        # Otsu threshold on the NORMALIZED grayscale
        thresh = cv2.threshold(norm_gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
        
        # Find coordinates of text pixels
        coords = np.column_stack(np.where(thresh > 0))
        if len(coords) == 0:
            return img.copy(), 0.0
            
        # Find minimum area rectangle
        rect = cv2.minAreaRect(coords)
        angle = rect[-1]
        
        # Normalize angle
        if angle < -45:
            angle = -(90 + angle)
        elif angle > 45:
            angle = 90 - angle
        else:
            angle = -angle
            
        # Rotate ORIGINAL image
        (h, w) = img.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=(255, 255, 255))
        
        return rotated, angle

    def run(self, bgr_img):
        self.timings = {}
        stages = {}
        
        # A. Anomaly Detection
        t_detect = time.perf_counter()
        self.detect_anomalies(bgr_img)
        self.timings['anomaly_detection'] = (time.perf_counter() - t_detect) * 1000
        
        grayscale = self.config.get('grayscale', True)
        
        # 1. Grayscale
        t0 = time.perf_counter()
        if grayscale:
            current_img = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
        else:
            current_img = bgr_img.copy()
        self.timings['grayscale'] = (time.perf_counter() - t0) * 1000
        stages['grayscale'] = current_img.copy()
        
        # 2. Noise Reduction (Done BEFORE Deskew so interpolation doesn't smear noise dots)
        t0 = time.perf_counter()
        if self.config.get('enable_noise_reduction', True):
            ksize = self.config.get('blur_kernel_size', 3)
            ksize = ksize if ksize % 2 == 1 else ksize + 1
            blur_type = self.config.get('blur_type', 'median')
            if blur_type == 'median':
                current_img = cv2.medianBlur(current_img, ksize)
            else:
                current_img = cv2.GaussianBlur(current_img, (ksize, ksize), 0)
        self.timings['noise_reduction'] = (time.perf_counter() - t0) * 1000
        stages['noise_reduction'] = current_img.copy()
        
        # 3. Auto-Deskew
        t0 = time.perf_counter()
        if self.config.get('enable_deskew', False):
            current_img, angle = self.deskew(current_img)
            self.detected_skew_angle = angle
        else:
            self.detected_skew_angle = 0.0
        self.timings['deskew'] = (time.perf_counter() - t0) * 1000
        stages['deskewed'] = current_img.copy()
        
        # 4. Background Normalization
        t0 = time.perf_counter()
        if self.config.get('enable_background_norm', True):
            norm_ksize = self.config.get('norm_kernel_size', 25)
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (norm_ksize, norm_ksize))
            bg = cv2.morphologyEx(current_img, cv2.MORPH_CLOSE, kernel)
            current_img = cv2.divide(current_img, bg, scale=255)
        self.timings['background_normalization'] = (time.perf_counter() - t0) * 1000
        stages['background_normalization'] = current_img.copy()
        
        # 5. Gamma Correction
        t0 = time.perf_counter()
        gamma = self.config.get('gamma', 1.0)
        if gamma != 1.0:
            invGamma = 1.0 / gamma
            table = np.array([((i / 255.0) ** invGamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
            current_img = cv2.LUT(current_img, table)
        self.timings['gamma_correction'] = (time.perf_counter() - t0) * 1000
        stages['gamma_correction'] = current_img.copy()
        
        # 6. Contrast Stretching
        t0 = time.perf_counter()
        current_img = cv2.normalize(current_img, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX)
        self.timings['contrast_stretching'] = (time.perf_counter() - t0) * 1000
        stages['contrast_stretching'] = current_img.copy()
        
        # 7. Adaptive Thresholding & Morphology (ONLY for grayscale)
        if grayscale:
            t0 = time.perf_counter()
            if self.config.get('enable_thresholding', True):
                block = self.config.get('threshold_block_size', 21)
                block = block if block % 2 == 1 else block + 1
                c_val = self.config.get('threshold_c', 10)
                current_img = cv2.adaptiveThreshold(
                    current_img, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, block, c_val)
            self.timings['thresholding'] = (time.perf_counter() - t0) * 1000
            stages['thresholded'] = current_img.copy()
            
            t0 = time.perf_counter()
            if self.config.get('enable_morphology', True) and self.config.get('enable_thresholding', True):
                morph_size = self.config.get('morphology_kernel_size', 2)
                morph_type = self.config.get('morph_type', 'open')
                if morph_size > 0:
                    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (morph_size, morph_size))
                    if morph_type == 'close':
                        current_img = cv2.morphologyEx(current_img, cv2.MORPH_CLOSE, kernel)
                    else:
                        current_img = cv2.morphologyEx(current_img, cv2.MORPH_OPEN, kernel)
            self.timings['morphology'] = (time.perf_counter() - t0) * 1000
            stages['morphology'] = current_img.copy()
            
        stages['final_output'] = current_img.copy()
        return stages

MODE_CONFIGS = {
    'light-clean': {
        'grayscale': False,
        'enable_noise_reduction': True, 'blur_type': 'gaussian', 'blur_kernel_size': 3,
        'enable_background_norm': True, 'norm_kernel_size': 35,
        'gamma': 1.1, 'contrast': 1.1,
        'enable_thresholding': False, 'enable_morphology': False
    },
    'strong-background-removal': {
        'grayscale': True,
        'enable_noise_reduction': True, 'blur_type': 'median', 'blur_kernel_size': 3,
        'enable_background_norm': True, 'norm_kernel_size': 25,
        'gamma': 0.8, 'contrast': 1.4,
        'enable_thresholding': True, 'threshold_block_size': 25, 'threshold_c': 15,
        'enable_morphology': False
    },
    'heavy-noise-reduction': {
        'grayscale': True,
        'enable_noise_reduction': True, 'blur_type': 'median', 'blur_kernel_size': 3,
        'enable_background_norm': True, 'norm_kernel_size': 25,
        'gamma': 0.9, 'contrast': 1.2,
        'enable_thresholding': True, 'threshold_block_size': 21, 'threshold_c': 12,
        'enable_morphology': False
    },
    'text-contrast-boost': {
        'grayscale': True,
        'enable_noise_reduction': True, 'blur_type': 'median', 'blur_kernel_size': 3,
        'enable_background_norm': True, 'norm_kernel_size': 21,
        'gamma': 0.6, 'contrast': 1.6,
        'enable_thresholding': True, 'threshold_block_size': 21, 'threshold_c': 12,
        'enable_morphology': False
    },
    'print-optimized': {
        'grayscale': True,
        'enable_noise_reduction': True, 'blur_type': 'gaussian', 'blur_kernel_size': 3,
        'enable_background_norm': True, 'norm_kernel_size': 21,
        'gamma': 0.8, 'contrast': 1.4,
        'enable_thresholding': True, 'threshold_block_size': 21, 'threshold_c': 15,
        'enable_morphology': False
    },
    'color-preservation': {
        'grayscale': False,
        'enable_noise_reduction': True, 'blur_type': 'gaussian', 'blur_kernel_size': 3,
        'enable_background_norm': True, 'norm_kernel_size': 41,
        'gamma': 0.9, 'contrast': 1.2,
        'enable_thresholding': False, 'enable_morphology': False
    }
}

sample_dir = 'notebooks/samples'
output_dir = 'notebooks/outputs'
os.makedirs(output_dir, exist_ok=True)

test_cases = [
    # Category A
    ('a01_shadow_book.png', 'strong-background-removal', False),
    ('a02_faded_receipt.png', 'text-contrast-boost', False),
    ('a03_yellowed_journal.png', 'light-clean', False),
    ('a04_noisy_photocopy.png', 'heavy-noise-reduction', False),
    ('a05_skewed_6deg.png', 'strong-background-removal', True),
    # Category B
    ('b01_out_of_focus.png', 'text-contrast-boost', False),
    ('b02_motion_blur.png', 'text-contrast-boost', False),
    ('b03_underexposed.png', 'text-contrast-boost', False),
    ('b04_overexposed.png', 'light-clean', False),
    ('b05_low_dpi.png', 'print-optimized', False),
    # Category C
    ('c01_creases_folds.png', 'print-optimized', False),
    ('c02_coffee_stain.png', 'strong-background-removal', False),
    ('c03_punch_holes.png', 'print-optimized', False),
    ('c04_finger_occlusion.png', 'light-clean', False),
    ('c05_torn_edge.png', 'print-optimized', False),
    # Category D
    ('d01_thin_table.png', 'print-optimized', False),
    ('d02_mixed_chart.png', 'color-preservation', False),
    ('d03_red_stamp.png', 'color-preservation', False),
    ('d04_blue_signature.png', 'color-preservation', False),
    ('d05_colored_paper.png', 'light-clean', False),
    # Category E
    ('e01_skewed_3deg.png', 'strong-background-removal', True),
    ('e02_skewed_12deg.png', 'strong-background-removal', True),
    ('e03_skewed_neg8deg.png', 'strong-background-removal', True),
    ('e04_skewed_with_noise.png', 'heavy-noise-reduction', True),
    ('e05_skewed_faded.png', 'text-contrast-boost', True),
    # Category F
    ('f01_shadow_skew_blur.png', 'strong-background-removal', True),
    ('f02_jpeg_stain_fold.png', 'print-optimized', False),
    ('f03_lowdpi_noise_holes.png', 'heavy-noise-reduction', False),
    ('f04_color_stamp_sig.png', 'color-preservation', False),
    ('f05_watermark_pink_finger.png', 'light-clean', False)
]

print("=== STARTING PIPELINE PROCESSING ON 30 SAMPLES ===\n")

results_summary = []

for idx, (filename, mode, enable_deskew) in enumerate(test_cases, 1):
    img_path = os.path.join(sample_dir, filename)
    img = cv2.imread(img_path)
    if img is None:
        print(f"Error: Could not load image at {img_path}")
        continue
    
    config = MODE_CONFIGS[mode].copy()
    config['enable_deskew'] = enable_deskew
    
    cleaner = DocumentCleanerPipeline(config)
    stages = cleaner.run(img)
    
    print(f"=== [{idx:02d}/30] {filename} ===")
    print(f"  Preset: {mode} | Deskew: {'ON' if enable_deskew else 'OFF'}")
    if enable_deskew:
        print(f"  Detected Angle: {cleaner.detected_skew_angle:.2f} deg")
        
    if cleaner.warnings:
        print("  Detections:")
        for warning in cleaner.warnings:
            print(f"    {warning}")
            
    total_t = sum(cleaner.timings.values())
    print(f"  Stage Timings:")
    for stage, t in cleaner.timings.items():
        if stage == 'deskew' and not enable_deskew: continue
        print(f"    - {stage}: {t:.2f} ms")
    print(f"  Total: {total_t:.2f} ms")
    
    out_path = os.path.join(output_dir, f"cleaned_{filename}")
    cv2.imwrite(out_path, stages['final_output'])
    print(f"  Saved: {out_path}\n")
    
    results_summary.append((filename, total_t, cleaner.detected_skew_angle if enable_deskew else None))

print("=== SUMMARY TABLE ===")
print(f"{'Filename':<30} | {'Time (ms)':<10} | {'Angle (deg)':<12}")
print("-" * 58)
for fn, t, angle in results_summary:
    angle_str = f"{angle:.2f}" if angle is not None else "N/A"
    print(f"{fn:<30} | {t:<10.2f} | {angle_str:<12}")

print("\nDone processing all 30 test cases.")
