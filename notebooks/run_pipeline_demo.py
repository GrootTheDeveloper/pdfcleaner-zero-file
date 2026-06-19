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
        Phát hiện các lỗi chất lượng ảnh cơ bản: ảnh mờ nét, ảnh cháy sáng và tài liệu bị mất mép.
        """
        self.warnings = []
        gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY) if len(bgr_img.shape) == 3 else bgr_img.copy()
        
        # 1. Phát hiện ảnh mờ nét (Laplacian Variance)
        lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        is_blurred = lap_var < 80.0
        if is_blurred:
            self.warnings.append(f"[WARNING] Ảnh bị mờ nét / Out of Focus (Độ sắc nét Laplacian: {lap_var:.2f} < 80.0)")
            
        # 2. Phát hiện cháy sáng / Chói đèn Flash (Overexposure)
        # Tỷ lệ pixel đạt độ sáng bão hòa >= 254
        saturated_ratio = np.sum(gray >= 254) / gray.size
        is_overexposed = saturated_ratio > 0.25
        if is_overexposed:
            self.warnings.append(f"[WARNING] Ảnh bị cháy sáng / Flash Glare ({saturated_ratio*100:.1f}% số pixel đạt độ sáng trắng bão hòa > 25%)")
            
        # 3. Phát hiện mất mép / Rìa đen sẫm (Cut-off Page / Edge artifacts)
        # Binarize bằng phân ngưỡng Otsu đảo ngược (chữ màu trắng, nền đen)
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        h, w = thresh.shape
        margin = 15
        
        # Trích xuất vùng biên lề
        top_margin = thresh[0:margin, :]
        bottom_margin = thresh[h-margin:h, :]
        left_margin = thresh[:, 0:margin]
        right_margin = thresh[:, w-margin:w]
        
        # Đếm số pixel chữ chạm mép biên lề
        top_pixels = np.sum(top_margin > 0)
        bottom_pixels = np.sum(bottom_margin > 0)
        left_pixels = np.sum(left_margin > 0)
        right_pixels = np.sum(right_margin > 0)
        
        # Ngưỡng kích hoạt nếu số lượng pixel vượt 50 (tránh nhiễu lẻ tẻ)
        is_cutoff = (top_pixels > 50 or bottom_pixels > 50 or left_pixels > 50 or right_pixels > 50)
        if is_cutoff:
            self.warnings.append(f"[WARNING] Nội dung bị sát mép hoặc dính rìa đen (Pixel chạm lề: Trên={top_pixels}, Dưới={bottom_pixels}, Trái={left_pixels}, Phải={right_pixels})")
            
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
            
        # Phân ngưỡng Otsu đảo ngược để lấy nét chữ làm nổi bật góc xoay
        thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
        
        # Tìm tọa độ của tất cả các pixel chữ
        coords = np.column_stack(np.where(thresh > 0))
        if len(coords) == 0:
            return img.copy(), 0.0
            
        # Tìm hình chữ nhật bao quanh nhỏ nhất bao lấy tập tọa độ
        rect = cv2.minAreaRect(coords)
        angle = rect[-1]
        
        # Quy chuẩn hóa góc xoay thẳng
        if angle < -45:
            angle = -(90 + angle)
        elif angle > 45:
            angle = 90 - angle
        else:
            angle = -angle
            
        # Xoay ảnh Affine xung quanh tâm ảnh với nền trắng
        (h, w) = img.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=(255, 255, 255))
        
        return rotated, angle

    def run(self, bgr_img):
        self.timings = {}
        stages = {}
        
        # A. Chạy chuẩn đoán chất lượng ảnh trước tiên
        t_detect = time.perf_counter()
        self.detect_anomalies(bgr_img)
        self.timings['anomaly_detection'] = (time.perf_counter() - t_detect) * 1000
        
        current_img = bgr_img.copy()
        
        # 0. Sửa xoay lệch tự động (Auto-Deskew)
        t0 = time.perf_counter()
        if self.config.get('enable_deskew', False):
            current_img, angle = self.deskew(current_img)
            self.detected_skew_angle = angle
        else:
            self.detected_skew_angle = 0.0
        self.timings['deskew'] = (time.perf_counter() - t0) * 1000
        stages['deskewed'] = current_img.copy()
        
        grayscale = self.config.get('grayscale', True)
        
        # Xử lý 2 luồng: Màu (Preserve Colors) vs Đen Trắng (Binarize)
        if grayscale:
            # 1. Grayscale conversion
            t0 = time.perf_counter()
            gray = cv2.cvtColor(current_img, cv2.COLOR_BGR2GRAY)
            self.timings['grayscale'] = (time.perf_counter() - t0) * 1000
            stages['grayscale'] = gray.copy()
            
            # 2. Lọc nhiễu (Median/Gaussian)
            t0 = time.perf_counter()
            if self.config.get('enable_noise_reduction', True):
                ksize = self.config.get('blur_kernel_size', 3)
                ksize = ksize if ksize % 2 == 1 else ksize + 1
                blur_type = self.config.get('blur_type', 'median')
                if blur_type == 'median':
                    blurred = cv2.medianBlur(gray, ksize)
                else:
                    blurred = cv2.GaussianBlur(gray, (ksize, ksize), 0)
            else:
                blurred = gray.copy()
            self.timings['noise_reduction'] = (time.perf_counter() - t0) * 1000
            stages['noise_reduction'] = blurred.copy()
            
            # 3. Cân bằng nền (Background Normalization)
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
            
            # 5. Contrast Stretching
            t0 = time.perf_counter()
            contrast_stretched = cv2.normalize(gamma_corrected, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX)
            self.timings['contrast_stretching'] = (time.perf_counter() - t0) * 1000
            stages['contrast_stretching'] = contrast_stretched.copy()
            
            # 6. Adaptive Thresholding (Gaussian C)
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
            
            # 7. Morphology Cleanup (Lọc hạt nhiễu dính/bụi bẩn đen tách rời)
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
            stages['final_output'] = cleaned.copy()
            
        else:
            # GIỮ MÀU SẮC (PRESERVE COLORS) - Xử lý trong không gian màu LAB
            # 1. Chuyển đổi BGR sang LAB để xử lý kênh sáng L độc lập
            t0 = time.perf_counter()
            lab = cv2.cvtColor(current_img, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            self.timings['color_space_lab_convert'] = (time.perf_counter() - t0) * 1000
            stages['grayscale'] = l.copy() # L kênh sáng làm đại diện xám
            
            # 2. Lọc nhiễu kênh sáng (Median/Gaussian)
            t0 = time.perf_counter()
            if self.config.get('enable_noise_reduction', True):
                ksize = self.config.get('blur_kernel_size', 3)
                ksize = ksize if ksize % 2 == 1 else ksize + 1
                blur_type = self.config.get('blur_type', 'gaussian')
                if blur_type == 'median':
                    blurred_l = cv2.medianBlur(l, ksize)
                else:
                    blurred_l = cv2.GaussianBlur(l, (ksize, ksize), 0)
            else:
                blurred_l = l.copy()
            self.timings['noise_reduction'] = (time.perf_counter() - t0) * 1000
            stages['noise_reduction'] = blurred_l.copy()
            
            # 3. Cân bằng nền kênh sáng LAB (Background Normalization in L channel)
            t0 = time.perf_counter()
            if self.config.get('enable_background_norm', True):
                norm_ksize = self.config.get('norm_kernel_size', 35)
                kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (norm_ksize, norm_ksize))
                bg = cv2.morphologyEx(blurred_l, cv2.MORPH_CLOSE, kernel)
                normalized_l = cv2.divide(blurred_l, bg, scale=255)
            else:
                normalized_l = blurred_l.copy()
            self.timings['background_normalization'] = (time.perf_counter() - t0) * 1000
            stages['background_normalization'] = normalized_l.copy()
            
            # 4. Gamma Correction kênh L
            t0 = time.perf_counter()
            gamma = self.config.get('gamma', 1.0)
            if gamma != 1.0:
                invGamma = 1.0 / gamma
                table = np.array([((i / 255.0) ** invGamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
                gamma_corrected_l = cv2.LUT(normalized_l, table)
            else:
                gamma_corrected_l = normalized_l.copy()
            self.timings['gamma_correction'] = (time.perf_counter() - t0) * 1000
            stages['gamma_correction'] = gamma_corrected_l.copy()
            
            # 5. Contrast Stretching kênh L
            t0 = time.perf_counter()
            contrast_stretched_l = cv2.normalize(gamma_corrected_l, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX)
            self.timings['contrast_stretching'] = (time.perf_counter() - t0) * 1000
            stages['contrast_stretching'] = contrast_stretched_l.copy()
            
            # Bỏ qua khâu Thresholding và Morphology vì đây là ảnh màu giữ nét gốc
            stages['thresholded'] = contrast_stretched_l.copy()
            stages['morphology'] = contrast_stretched_l.copy()
            
            # 6. Ghép kênh LAB và chuyển ngược về BGR
            t0 = time.perf_counter()
            merged_lab = cv2.merge([contrast_stretched_l, a, b])
            final_bgr = cv2.cvtColor(merged_lab, cv2.COLOR_LAB2BGR)
            self.timings['color_space_bgr_convert'] = (time.perf_counter() - t0) * 1000
            stages['final_output'] = final_bgr.copy()
            
        return stages

MODE_CONFIGS = {
    'light-clean': {
        'grayscale': False, # Giữ màu tự nhiên cho ghi chú bút mực màu
        'enable_noise_reduction': True,
        'blur_type': 'gaussian',
        'blur_kernel_size': 3,
        'enable_background_norm': True,
        'norm_kernel_size': 35,
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
        'norm_kernel_size': 21,
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
    },
    'color-preservation': {
        'grayscale': False, # Giữ nguyên màu của biểu đồ, chữ ký, con dấu đỏ
        'enable_noise_reduction': True,
        'blur_type': 'gaussian',
        'blur_kernel_size': 3,
        'enable_background_norm': True,
        'norm_kernel_size': 31,
        'gamma': 0.9,
        'contrast': 1.3,
        'enable_thresholding': False,
        'enable_morphology': False
    }
}

sample_dir = 'notebooks/samples'
output_dir = 'notebooks/outputs'
os.makedirs(output_dir, exist_ok=True)

test_cases = [
    # 5 MẪU CƠ BẢN GỐC
    ('Book Page (Shadows)', 'sample_book.png', 'strong-background-removal', False),
    ('Receipt (Faded)', 'sample_receipt.png', 'text-contrast-boost', False),
    ('Journal (Yellow/Coffee)', 'sample_handwriting.png', 'light-clean', False),
    ('Photocopy (Heavy Noise)', 'sample_photocopy.png', 'print-optimized', False),
    ('Skewed Page (Tilted)', 'sample_skewed.png', 'strong-background-removal', True),
    # 5 MẪU LỖI PHỨC HỢP MỚI
    ('Comp 1: Shadows + Skew + Blur + GhostText', 'sample_composite_1.png', 'strong-background-removal', True),
    ('Comp 2: Jpeg + Stains + Creases + Staple', 'sample_composite_2.png', 'print-optimized', False),
    ('Comp 3: Low DPI + Heavy Noise + Holes', 'sample_composite_3.png', 'print-optimized', False),
    ('Comp 4: Charts + Signature + Stamps (Color)', 'sample_composite_4.png', 'color-preservation', False),
    ('Comp 5: Watermark + Pink Paper + Handwriting', 'sample_composite_5.png', 'light-clean', False)
]

print("=== STARTING PIPELINE PROCESSING ON 10 SAMPLES ===\n")

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
    
    print(f"=== {title} ===")
    print(f"  Preset Mode   : {mode}")
    print(f"  Auto-Deskew   : {'ĐÃ BẬT' if enable_deskew else 'TẮT'}")
    if enable_deskew:
        print(f"  Detected Angle: {cleaner.detected_skew_angle:.2f} degrees")
        
    # In cảnh báo phát hiện chất lượng kém
    if cleaner.warnings:
        print("  Chuẩn đoán chất lượng (Detections):")
        for warning in cleaner.warnings:
            print(f"    {warning}")
    else:
        print("  Chuẩn đoán chất lượng: Đạt chất lượng thông thường.")
        
    # In timings
    print("  Thời gian xử lý từng khâu:")
    for stage, t in cleaner.timings.items():
        if stage == 'deskew' and not enable_deskew:
            continue
        print(f"    - Stage '{stage}': {t:.2f} ms")
    total_t = sum(cleaner.timings.values())
    print(f"  Tổng thời gian chạy: {total_t:.2f} ms")
    
    # Lưu ảnh đầu ra
    cleaned_img = stages['final_output']
    out_path = os.path.join(output_dir, f"cleaned_{filename}")
    cv2.imwrite(out_path, cleaned_img)
    print(f"  Lưu kết quả sạch tại: {out_path}\n")

print("Done processing all 10 test cases.")
