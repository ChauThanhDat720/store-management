import mongoose, { Schema, Document } from 'mongoose';

export interface IShiftTask extends Document {
  date: string;
  shift: 'morning' | 'afternoon' | 'evening';
  taskName: string;
  isCompleted: boolean;
  completedBy?: mongoose.Types.ObjectId;
  completedAt?: Date;
}

const ShiftTaskSchema = new Schema(
  {
    date: { type: String, required: true },
    shift: { type: String, enum: ['morning', 'afternoon', 'evening'], required: true },
    taskName: { type: String, required: true },
    isCompleted: { type: Boolean, default: false },
    completedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

ShiftTaskSchema.index({ date: 1, shift: 1, taskName: 1 }, { unique: true });

export default mongoose.model<IShiftTask>('ShiftTask', ShiftTaskSchema);
