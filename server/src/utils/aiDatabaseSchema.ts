// src/utils/aiDatabaseSchema.ts

export const databaseSchema = `
Bạn có quyền đọc dữ liệu từ các collection sau:

1. users
Ý nghĩa: lưu thông tin nhân viên và admin.
Fields:
- fullName: tên nhân viên
- email: email
- phone: số điện thoại
- role: admin hoặc employee
- position: chức vụ
- department: phòng ban
- salary: lương
- startDate: ngày bắt đầu làm
- status: active hoặc inactive

2. attendances
Ý nghĩa: lưu dữ liệu chấm công.
Fields:
- userId: id nhân viên
- date: ngày chấm công, dạng YYYY-MM-DD
- checkIn: giờ vào
- checkOut: giờ ra
- status: trạng thái chấm công

3. schedules
Ý nghĩa: lưu lịch làm việc.
Fields:
- userId: id nhân viên
- date: ngày làm việc
- shift: ca làm
- note: ghi chú
`;