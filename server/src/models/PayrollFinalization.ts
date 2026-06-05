import mongoose, { Schema, Document } from 'mongoose';

export interface IPayrollFinalization extends Document {
  userId: mongoose.Types.ObjectId;
  month: number;
  year: number;
  totalHours: number;
  hourlyRate: number;
  estimatedSalary: number;
  totalAllowance: number;
  totalDeduction: number;
  finalSalary: number;
  status: 'finalized' | 'paid';
  note?: string;
  finalizedBy: mongoose.Types.ObjectId;
  finalizedAt: Date;
}

const PayrollFinalizationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    totalHours: { type: Number, required: true },
    hourlyRate: { type: Number, required: true },
    estimatedSalary: { type: Number, required: true },
    totalAllowance: { type: Number, required: true },
    totalDeduction: { type: Number, required: true },
    finalSalary: { type: Number, required: true },
    status: { type: String, enum: ['finalized', 'paid'], default: 'finalized' },
    note: { type: String },
    finalizedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    finalizedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

PayrollFinalizationSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

export default mongoose.model<IPayrollFinalization>('PayrollFinalization', PayrollFinalizationSchema);
