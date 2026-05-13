import mongoose, { Schema, Document } from 'mongoose';

export interface ISchedule extends Document {
  userId: mongoose.Types.ObjectId;
  date: string;
  shift: 'morning' | 'afternoon' | 'evening';
}

const ScheduleSchema: Schema = new Schema(
  {

    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    shift: { type: String, enum: ['morning', 'afternoon', 'evening'], required: true },
  },
  { timestamps: true }
);

// Tránh đăng ký trùng ca trong cùng 1 ngày
ScheduleSchema.index({ userId: 1, date: 1, shift: 1 }, { unique: true });

export default mongoose.model<ISchedule>('Schedule', ScheduleSchema);
