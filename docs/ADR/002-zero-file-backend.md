# Architecture Decision Record (ADR) 002: Zero-File Backend Architecture

## Context

Dự án PDFCleaner cần lưu trữ các cấu hình làm sạch (presets) cá nhân, thu thập lỗi, và telemetry hiệu năng. Tuy nhiên, việc tải file PDF/ảnh của người dùng lên server để xử lý sẽ gây ra nhiều rủi ro về mặt bảo mật thông tin (data privacy), chi phí hạ tầng (băng thông, dung lượng lưu trữ), và các vấn đề tuân thủ pháp lý (GDPR, HIPAA).

## Decisions

1. **Thiết kế Backend Zero-File**:
   - Backend API tuyệt đối không có bất kỳ endpoint nào nhận upload file (như `/upload` hoặc `/process-pdf`).
   - Cơ sở dữ liệu PostgreSQL không chứa bất kỳ bảng hoặc trường nào lưu trữ nhị phân tệp (BLOB, bytea) hoặc đường dẫn tệp trên Cloud Storage (S3/GCS).
   - Nghiêm cấm sử dụng các thư viện xử lý upload file như `multer`, `busboy`, `formidable` trong NestJS dependencies.

2. **Chỉ nhận Metadata & Telemetry**:
   - Các API thu thập dữ liệu chỉ nhận thông số kỹ thuật ẩn danh (như thời gian xử lý, số trang, dung lượng file xuất ra, chế độ làm sạch được chọn).
   - stack trace lỗi gửi lên sẽ được dọn dẹp (PII Sanitizer) để loại bỏ toàn bộ thông tin đường dẫn cục bộ (ví dụ: `C:\Users\username\...`) trước khi ghi vào database.

## Consequences

- Hệ thống đạt mức độ bảo mật quyền riêng tư tối đa (Privacy-by-Design): dữ liệu nhạy cảm của người dùng không bao giờ rời khỏi trình duyệt của họ.
- Chi phí hạ tầng backend được duy trì ở mức tối thiểu (Free-tier dễ dàng đáp ứng).
- Dễ dàng kiểm chứng sự tuân thủ thông qua các bài kiểm tra hồi quy tự động (Privacy Regression Tests).
