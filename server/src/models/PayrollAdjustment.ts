import mongoose, { Schema, Document } from 'mongoose';

export interface IPayrollAdjustment extends Document {
  userId: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  month: number;
  year: number;
  amount: number;
  type: 'allowance' | 'deduction' | 'bonus' | 'penalty';
  reason: string;
  note?: string;
}

const PayrollAdjustmentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['allowance', 'deduction', 'bonus', 'penalty'], required: true },
    reason: { type: String, required: true },
    note: { type: String },
  },
  { timestamps: true }
);

PayrollAdjustmentSchema.index({ userId: 1, year: 1, month: 1 });

export default mongoose.model<IPayrollAdjustment>('PayrollAdjustment', PayrollAdjustmentSchema);
