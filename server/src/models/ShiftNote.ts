import mongoose, { Schema, Document } from 'mongoose';

export interface IShiftNote extends Document {
  date: string; // YYYY-MM-DD
  shift: 'morning' | 'afternoon' | 'evening';
  note: string;
}

const ShiftNoteSchema: Schema = new Schema(
  {
    shiftNote: { type: Schema.Types.ObjectId, ref: 'ShiftNote', required: true },
    date: { type: String, required: true },
    shift: { type: String, enum: ['morning', 'afternoon', 'evening'], required: true },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

// Mỗi ca trong 1 ngày chỉ có 1 bản ghi ghi chú
ShiftNoteSchema.index({ date: 1, shift: 1 }, { unique: true });

export default mongoose.model<IShiftNote>('ShiftNote', ShiftNoteSchema);
