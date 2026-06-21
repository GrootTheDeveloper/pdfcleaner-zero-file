# Báo Cáo Kỹ Thuật Chuyên Sâu: Xây Dựng Pipeline Xử Lý Ảnh (PDFCleaner Phase 1)

Tài liệu này đi sâu vào khía cạnh toán học và cơ chế hoạt động của thư viện OpenCV đằng sau các lỗi xử lý ảnh scan/photocopy. Nó minh họa chính xác lý do tại sao các vấn đề phát sinh ở mức độ pixel và chi tiết quá trình tinh chỉnh thông số (parameter tuning) để xử lý dứt điểm các cạnh tranh logic trong thuật toán.

---

## 1. Vấn đề Nội Suy Hình Học (Geometric Interpolation) & Hạt Nhiễu

**Tình huống:** Bức ảnh bị nghiêng (skewed) đồng thời chứa nhiễu hạt tiêu (salt & pepper noise - các chấm đen 1-pixel rải rác).

- **Phân tích cơ chế lỗi:**
  Thuật toán ban đầu chạy Xoay ảnh (Deskew) trước khi Khử nhiễu. Lệnh xoay `cv2.warpAffine` mặc định sử dụng thuật toán nội suy bậc 3 (`cv2.INTER_CUBIC`). Khi tính toán lại toạ độ lưới pixel ở góc nghiêng, một hạt nhiễu sắc nét (kích thước 1x1, giá trị màu đen = 0) bị phép nội suy làm mờ và "lem" ra thành một khối gradient xám có kích thước 2x2 hoặc thậm chí 3x3 pixel (với các giá trị như 100, 150).
  Khi khối xám này đi qua bộ lọc `cv2.medianBlur(ksize=3)`, bộ lọc này duyệt qua cửa sổ 3x3 (9 pixels). Để xoá được một điểm đen, Median Blur yêu cầu tối thiểu 5/9 pixel phải là nền trắng (255). Do hạt rác đã bị phình to thành khối 4-5 pixel xám, trung vị (median) không còn là màu trắng, khiến bộ lọc hoàn toàn bất lực.
  Sau đó, hàm `cv2.adaptiveThreshold` sẽ bóp khối xám này thành màu đen đặc, tạo ra rác vón cục lốm đốm khắp ảnh.

- **Giải pháp & Tuning:**
  Tái cấu trúc kiến trúc (Pipeline Order). Chuyển bước Khử nhiễu lên chạy TRƯỚC Deskew.
  Khi hạt nhiễu vẫn đang là 1-pixel sắc nét trên lưới ảnh gốc, `medianBlur(3)` dễ dàng quét qua (1 pixel đen + 8 pixel trắng -> Median = trắng) và xoá sạch 100% rác. Bức ảnh sạch tinh tươm sau đó mới được đưa vào `warpAffine` để xoay, triệt tiêu hoàn toàn hiện tượng lem rác do nội suy.

---

## 2. Nghịch Lý Bảng Biểu (Thin Lines) & Bộ Lọc Hình Thái Học

**Tình huống:** Chế độ dọn rác vô tình ăn mòn và xoá vĩnh viễn các đường kẻ bảng độ dày 1-pixel (Thin table lines).

- **Phân tích cơ chế lỗi:**
  Ban đầu, pipeline dùng `cv2.MORPH_OPEN` (ksize=2). Lệnh Open là chuỗi kết hợp của Erode (bào mòn) và Dilate (giãn nở). Tuy nhiên, vì OpenCV coi màu trắng (255) là foreground, Erode thực chất là phép lọc Min (bành trướng màu trắng lấn át màu đen).
  Với đường kẻ bảng 1-pixel, khi cửa sổ lọc Min lướt qua, nó thấy nền trắng xung quanh và bóp nghẹt đường kẻ đen thành màu trắng. Đường kẻ bị đứt đoạn hoặc xoá sạch. Sau đó bước Dilate (Max) không còn dữ liệu màu đen nào để khôi phục lại.
  Ngay cả `medianBlur` cũng xoá đường 1-pixel (vì trong ô 3x3, có 3 pixel của đường kẻ và 6 pixel nền trắng -> Median vẫn là trắng).

- **Giải pháp & Tuning (`print-optimized` preset):**
  - **Thay đổi Core Filter:** Loại bỏ hoàn toàn Morphology và Median Blur. Thay thế bằng `cv2.GaussianBlur(ksize=3)`.
  - **Cơ sở Toán học:** Gaussian Blur tính trung bình trọng số. Một đường kẻ 1-pixel (màu 0) được bao quanh bởi nền (255) sẽ bị mờ đi thành mức xám khoảng `140`. Trong khi đó, một hạt nhiễu chấm (1-pixel) sẽ bị mờ đi thành mức xám sáng hơn, khoảng `191`.
  - **Tuning Threshold:** Sử dụng `cv2.adaptiveThreshold` với `block_size=21`, `C=15`. Hàm này lấy trung bình khu vực (~255) trừ đi hằng số C (15), tạo ra vạch phân ngưỡng cắt ở mức `240`. Vì đường kẻ (`140`) thấp hơn mức cắt, nó sống sót và bị ép thành đen đậm. Nhờ vậy, cấu trúc bảng nét thanh được bảo toàn hoàn hảo.

---

## 3. Quá Tải Biến Dạng Chữ Ở Low DPI (Pixelated Text)

**Tình huống:** Bức ảnh có độ phân giải thấp, chữ bị rỗ hạt cứng (blocky). Xử lý xong chữ bị dính vào nhau và không thể đọc được.

- **Phân tích cơ chế lỗi:**
  Ở chế độ `heavy-noise-reduction`, hệ thống dùng `medianBlur(ksize=5)` (cửa sổ 5x5 = 25 pixel) và `MORPH_CLOSE(ksize=2)`.
  Với ảnh Low DPI, nét chữ được cấu thành từ các khối pixel to kệch (rộng 2-3 pixel). Cửa sổ 5x5 là quá lớn so với tỉ lệ của nét chữ Low DPI, khiến nó "bo tròn" các góc cạnh vuông vức của chữ. Tiếp theo, `MORPH_CLOSE` (Giãn nở đen rồi Bào mòn đen) kết dính các khoảng trống hẹp giữa các chữ cái (ví dụ khe giữa chữ 'e' hoặc 'a'), biến cụm từ thành một cục mực đen bết dính.

- **Giải pháp & Tuning:**
  - **Giảm bán kính tác động:** Hạ `blur_kernel_size` từ 5 xuống 3 (cửa sổ 3x3 = 9 pixel). Đủ để loại bỏ nhiễu hạt tiêu 1-pixel nhưng không đủ lớn để làm tròn vỡ nét chữ Low DPI.
  - **Tắt Morphology:** Set `enable_morphology = False` cho các preset xử lý Low DPI để đảm bảo không xảy ra hiện tượng dính nét (bridging) giữa các ký tự liền kề.

---

## 4. Bảo Toàn Không Gian Màu (Color Preservation vs LAB Space)

**Tình huống:** Các mộc đỏ, chữ ký xanh dương, đồ thị màu bị ép thành màu pastel mờ nhạt (washed out).

- **Phân tích cơ chế lỗi:**
  Phương pháp cũ chuyển đổi không gian BGR sang CIE-LAB. Kênh L (Lightness) chứa độ sáng, kênh A và B chứa quang sai (màu sắc). Thuật toán ép độ tương phản cường độ cao `cv2.normalize(alpha=0, beta=255)` chỉ được áp dụng lên kênh L để ép nền giấy dơ thành màu trắng. Tuy nhiên, các kênh A và B bị bỏ lại nguyên trạng.
  Khi gộp lại và chuyển về BGR, sự mất cân đối giữa một độ sáng cực gắt và quang sai cũ khiến màu sắc mất đi độ bão hoà (saturation), chuyển thành màu nhợt nhạt.

- **Giải pháp & Tuning:**
  - Không phân tách kênh màu. Xử lý trực tiếp trên không gian BGR.
  - Áp dụng toán học `cv2.divide` cho ảnh màu: `img = cv2.divide(bgr_img, bgr_background)`. Phép toán này chia từng kênh (B/B, G/G, R/R).
  - Kết quả: Nền xỉn màu (ví dụ `[200, 200, 200]`) chia cho chính nó sẽ bằng 1. Nhân cho scale 255 sẽ ra `[255, 255, 255]` (trắng tinh). Trong khi mộc đỏ `[50, 50, 200]` chia cho nền `[200, 200, 200]` sẽ vẫn duy trì đúng tỷ lệ trội của kênh Red. Màu sắc được bảo toàn độ rực rỡ chân thực 100%.

---

## 5. Trích Xuất Độ Dốc Bóng Đổ (Dynamic Background Normalization)

**Tình huống:** Bóng đen do nếp gấp sách hoặc rìa xám photocopy làm nhiễu loạn thuật toán phân ngưỡng cục bộ.

- **Phân tích cơ chế:**
  Sử dụng hình thái học `cv2.morphologyEx` với `MORPH_CLOSE` và kernel hình chữ nhật cực lớn (size từ 25x25 đến 41x41).
  Bản chất `MORPH_CLOSE` là Max-filter tiếp nối Min-filter. Với kernel cực lớn, cửa sổ 41x41 lướt qua sẽ bao trùm toàn bộ các nét chữ (thường chỉ rộng 3-10 pixel). Max-filter sẽ biến các chữ đen này thành màu trắng của nền xung quanh.
  Kết quả trả về là một tấm bản đồ ánh sáng (Lightmap) hoàn hảo, chỉ chứa dải gradient bóng râm của tờ giấy mà không còn dính một chữ cái nào.
  Sau đó, phép chia `cv2.divide(img, lightmap)` sẽ khuếch đại ánh sáng tại các vùng tối, cứu sáng thành công mọi góc khuất của ảnh scan mà không làm ảnh hưởng đến độ đen của nét chữ. Lệnh này tiêu tốn khoảng ~4-7ms tuỳ độ lớn kernel.

---

_Báo cáo này đại diện cho kiến trúc C-based WASM sẽ được hiện thực hoá cho Phase 2 của dự án PDFCleaner._
