import mongoose, { Schema, Document } from "mongoose";
export interface IAbsent extends Document {
    scheduleId: mongoose.Types.ObjectId,
    reason: string,
    userId: mongoose.Types.ObjectId,
    date: string,
    status: 'pending' | 'approved' | 'rejected'
}
const AbsentSchema: Schema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        date: { type: String, required: true },
        reason: { type: String, required: true },
        scheduleId: { type: Schema.Types.ObjectId, ref: 'Schedule', required: true },
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
    },
    { timestamps: true }
);
export default mongoose.model<IAbsent>('Absent', AbsentSchema);
