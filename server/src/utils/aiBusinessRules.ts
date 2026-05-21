// src/utils/aiBusinessRules.ts

export const businessRules = `
QUY TẮC NGHIỆP VỤ CỦA HỆ THỐNG STORE MANAGEMENT:

1. Nhân viên
- Chỉ user có role = "employee" mới được tính là nhân viên cửa hàng.
- User có status = "inactive" là nhân viên đã nghỉ hoặc không còn hoạt động.
- Không được hiển thị password hoặc dữ liệu nhạy cảm.

2. Chấm công
- Attendance dùng để lưu dữ liệu đi làm của nhân viên.
- Nếu nhân viên có lịch làm nhưng không có bản ghi chấm công trong ngày thì xem là chưa chấm công.
- Nếu có checkIn nhưng chưa có checkOut thì nhân viên đang trong ca hoặc chưa kết thúc ca.
- Nếu không có dữ liệu chấm công thì phải nói rõ là chưa có dữ liệu, không được tự đoán.

3. Lịch làm việc
- Schedule dùng để lưu ca làm của nhân viên.
- Nếu hỏi "hôm nay", dùng ngày hiện tại.
- Nếu hỏi "ngày mai", dùng ngày sau ngày hiện tại.
- Nếu câu hỏi thiếu mốc thời gian quan trọng, hãy hỏi lại admin.

4. Cách trả lời
- Trả lời ngắn gọn, rõ ràng, chuyên nghiệp.
- Chỉ dựa trên dữ liệu được cung cấp từ database.
- Không bịa số liệu.
- Nếu dữ liệu rỗng, nói "Chưa tìm thấy dữ liệu phù hợp".
- Nếu phát hiện vấn đề, nên đưa ra gợi ý quản lý.
`;