import mongoose, { Schema, Document } from 'mongoose';

export interface IShiftTaskTemplate extends Document {
  shift: 'morning' | 'afternoon' | 'evening';
  taskName: string;
}

const ShiftTaskTemplateSchema = new Schema(
  {
    shift: { type: String, enum: ['morning', 'afternoon', 'evening'], required: true },
    taskName: { type: String, required: true },
  },
  { timestamps: true }
);

ShiftTaskTemplateSchema.index({ shift: 1, taskName: 1 }, { unique: true });

export default mongoose.model<IShiftTaskTemplate>('ShiftTaskTemplate', ShiftTaskTemplateSchema);
