import mongoose, { Schema, Document } from 'mongoose';

export interface IPayrollAdjustment extends Document {
  userId: mongoose.Types.ObjectId;
  month: number;
  year: number;
  amount: number;
  type: 'bonus' | 'penalty';
  reason: string;
}

const PayrollAdjustmentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['bonus', 'penalty'], required: true },
    reason: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IPayrollAdjustment>('PayrollAdjustment', PayrollAdjustmentSchema);
