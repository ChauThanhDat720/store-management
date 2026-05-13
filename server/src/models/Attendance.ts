import mongoose, { Schema, Document } from 'mongoose';
interface IGeoLocation {
    type: 'Point';
    coordinates: [number, number];
}
// Interface cho bản ghi điểm danh
export interface IAttendance extends Document {
    schedule: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    date: string;
    checkIn?: Date;
    checkOut?: Date;
    status: 'present' | 'late' | 'absent' | 'early';
    address?: string;
    workHours?: number;
    location?: IGeoLocation;
    accuracy: number;
}

const AttendanceSchema: Schema = new Schema(
    {
        schedule: { type: Schema.Types.ObjectId, ref: 'Schedule', required: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        date: { type: String, required: true },
        checkIn: { type: Date },
        checkOut: { type: Date },
        status: { type: String, enum: ['present', 'late', 'absent', 'early'], default: 'present' },
        location: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number] }
        },
        address: { type: String },
        accuracy: { type: Number },
        workHours: { type: Number },
    },
    { timestamps: true }
);

export default mongoose.model<IAttendance>('Attendance', AttendanceSchema);
