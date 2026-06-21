# Architecture Decision Record (ADR) 003: Client-Side Document Processing

## Context

Việc làm sạch các tài liệu PDF scan dài (hàng trăm trang) đòi hỏi tài nguyên CPU và RAM rất lớn. Nếu xử lý trên server-side, một vài người dùng cùng lúc xử lý tệp nặng có thể dễ dàng làm quá tải máy chủ (Denial of Service). Do đó, dự án cần một phương thức xử lý phi tập trung hiệu quả.

## Decisions

1. **Xử lý trực tiếp tại Trình duyệt (Client-Side Processing)**:
   - Toàn bộ quá trình giải nén PDF, trích xuất hình ảnh, làm sạch ảnh qua OpenCV, và đóng gói lại thành PDF mới sẽ được thực thi hoàn toàn trong trình duyệt của người dùng.
   - Sử dụng **OpenCV.js (WebAssembly)** để chạy các giải thuật xử lý ảnh với tốc độ native.
   - Sử dụng **Web Workers** để chạy các tác vụ nặng trên luồng riêng biệt, ngăn chặn việc đóng băng giao diện chính (UI thread).

2. **Quản lý Bộ nhớ (Memory Management)**:
   - Sử dụng **Transferable Objects** khi truyền dữ liệu hình ảnh (`ArrayBuffer`) giữa luồng chính và Worker để tránh việc sao chép dữ liệu (zero-copy transfer).
   - Tích hợp hàm dọn dẹp bộ nhớ thủ công (`mat.delete()`) ngay sau khi hoàn thành mỗi trang để tránh tràn bộ nhớ WebAssembly Heap.

## Consequences

- Hệ thống có khả năng mở rộng (scalability) vô hạn: số lượng người dùng tăng lên không làm tăng tải xử lý trên máy chủ.
- Ứng dụng có thể chạy hoàn toàn ngoại tuyến (Offline-First) sau khi tải xong trang web ban đầu.
- Trải nghiệm người dùng mượt mà nhờ UI thread không bị block.
