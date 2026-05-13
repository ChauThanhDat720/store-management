import mongoose, { Schema, Document } from 'mongoose';

// 1. Định nghĩa Interface cho User
export interface IUser extends Document {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  role: 'admin' | 'employee';
  position?: string;
  department?: string;
  salary?: number;
  startDate?: Date;
  status?: 'active' | 'inactive';
  avatar?: string;
}

// 2. Tạo Schema
const UserSchema: Schema = new Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Vẫn bắt buộc để login, nhưng sẽ được cấp mặc định nếu tạo từ admin
    phone: { type: String },
    role: { type: String, enum: ['admin', 'employee'], default: 'employee' },
    position: { type: String, default: 'Nhân viên' },
    department: { type: String, default: 'Cửa hàng' },
    salary: { type: Number },
    startDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    avatar: { type: String },
  },
  { timestamps: true }
);

// 3. Xuất Model
export default mongoose.model<IUser>('User', UserSchema);
