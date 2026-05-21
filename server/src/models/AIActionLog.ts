import mongoose, { Schema, Document } from "mongoose";
export interface IAIActionLog extends Document {
    requestedBy: mongoose.Types.ObjectId;
    message: string;
    action: string;
    payload: any;
    summary: string;
    status: 'pending' | 'executed' | 'rejected' | 'failed';
    result?: any;
    error?: string;
    executedAt?: Date;
}
const AIActionLogSchema = new Schema(
    {
        requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        message: { type: String, required: true },
        action: { type: String, required: true },
        payload: { type: Schema.Types.Mixed, required: true },
        summary: { type: String, required: true },
        status: {
            type: String,
            enum: ['pending', 'executed', 'rejected', 'failed'],
            default: 'pending',
        },
        result: Schema.Types.Mixed,
        error: String,
        executedAt: Date,
    },
    { timestamps: true }
);
export default mongoose.model<IAIActionLog>('AIActionLog', AIActionLogSchema)