# Architecture Decision Record (ADR) 001: Phase 1 - Image Processing Pipeline

## Context

Dự án PDFCleaner cần một pipeline xử lý ảnh đủ mạnh để dọn rác, làm nét chữ, và chuẩn hoá các file scan/photocopy tồi tệ trước khi nhúng lại vào PDF. Trước khi viết code WebAssembly cho Frontend, chúng ta đã xây dựng một bản Prototype bằng Python (OpenCV) để chốt thuật toán và các tham số.

## Decisions

1. **Thứ tự thực thi Pipeline (Pipeline Order)**:
   Để tránh việc nhiễu (salt & pepper) bị nội suy (interpolation) làm phình to trong quá trình xoay ảnh (Deskew), luồng thực thi bắt buộc phải tuân theo:
   `Grayscale -> Noise Reduction (Median Blur) -> Auto-Deskew -> Background Normalization -> Gamma -> Contrast -> Thresholding -> Morphology Cleanup`.

2. **Các chế độ xử lý (Processing Modes)**:
   - `print-optimized`: Bắt buộc dùng `Gaussian Blur` (không dùng Median/Morphology) để bảo toàn hoàn hảo các đường kẻ bảng (thin lines) 1-pixel.
   - `heavy-noise-reduction`: Chuyên trị nhiễu photocopy. Dùng `Median Blur` (kernel 3) để xoá sạch chấm đen. Không dùng Morphology mạnh để tránh làm móp méo chữ Low DPI.
   - `text-contrast-boost`: Dành cho hoá đơn mờ, dùng `Median Blur` và Gamma/Contrast mạnh.
   - `color-preservation`: Tách biệt hoàn toàn khối xử lý. Không chuyển sang LAB space (tránh bão hoà màu), mà áp dụng Gaussian Blur và Background Normalization trực tiếp trên không gian `BGR` để màu sắc (đỏ, xanh, v.v.) được rực rỡ và chân thực.

3. **Background Normalization**:
   Sử dụng hình thái học `MORPH_CLOSE` với kernel lớn (25-41) để nội suy một bức ảnh nền (chỉ có màu giấy/bóng râm), sau đó lấy ảnh gốc chia (`cv2.divide`) cho ảnh nền. Cách này xoá được viền đen photocopy và đổ bóng 3D cực kỳ hiệu quả.

## Consequences

- Engine Phase 2 (Web Worker) sẽ được kiến trúc hoá mapping 1:1 với các quyết định thuật toán này.
- Mọi chỉnh sửa về sau cần tham chiếu file `packages/shared/src/constants/processing-modes.ts` làm Source of Truth.
