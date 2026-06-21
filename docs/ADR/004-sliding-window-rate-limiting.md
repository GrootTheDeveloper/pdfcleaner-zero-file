# Architecture Decision Record (ADR) 004: Sliding Window Rate Limiting using Redis

## Context

Để bảo vệ API control plane khỏi các cuộc tấn công DDoS, spam tài khoản, hoặc spam dữ liệu telemetry, chúng ta cần một cơ chế giới hạn tần suất truy cập (Rate Limiting) mạnh mẽ, chính xác, và có khả năng phân tán.

## Decisions

1. **Sliding Window Counter qua Redis**:
   - Sử dụng cấu trúc dữ liệu **Sorted Set (ZSET)** của Redis để ghi nhận thời gian (timestamp) của mỗi request.
   - Khi một request mới gửi đến:
     1. Xóa các bản ghi cũ nằm ngoài khoảng thời gian (window size).
     2. Đếm số lượng phần tử còn lại trong ZSET.
     3. Nếu vượt quá giới hạn, chặn với lỗi HTTP `429 Too Many Requests`.
     4. Thêm timestamp hiện tại vào ZSET nếu chưa vượt giới hạn.
   - Thiết lập thời gian tự hủy (TTL) cho mỗi key ZSET để tránh tích tụ bộ nhớ Redis.

2. **Giới hạn theo Nhóm Endpoint**:
   - **Xác thực (Auth)**: Tối đa 5 requests / 1 phút (chống brute force).
   - **Telemetry & Error Reports**: Tối đa 60 requests / 1 phút.
   - **Các endpoint khác**: Tối đa 120 requests / 1 phút.

## Consequences

- Khắc phục hoàn toàn nhược điểm "bùng nổ request ở biên" của thuật toán Fixed Window.
- Hoạt động chính xác trên môi trường đa máy chủ (Cluster/Multi-instance).
- Phản hồi nhanh chóng với độ trễ tối thiểu nhờ các câu lệnh Redis được gom cụm (Multi/Exec transaction block).
