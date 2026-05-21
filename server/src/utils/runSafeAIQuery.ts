import User from "../models/User";
import Attendance from "../models/Attendance";
import Schedule from "../models/Schedule";
import { AppError } from "./appError";

const models: any = {
    users: User,
    attendances: Attendance,
    schedules: Schedule
};
const allowedCollections = ['users', 'attendances', 'schedules'];
const allowedFields: any = {
    users: [
        'fullName',
        'email',
        'phone',
        'role',
        'position',
        'department',
        'salary',
        'startDate',
        'status'
    ],
    attendances: [
        'userId',
        'date',
        'checkIn',
        'checkOut',
        'status'
    ],
    schedules: [
        'userId',
        'date',
        'shift',
        'note'
    ]
};
const blockedOperators = [
    '$where',
    '$function',
    '$accumulator',
    '$expr'
];
const validateObject = (obj: any) => {
    const text = JSON.stringify(obj);
    for (const op of blockedOperators) {
        if (text.includes(op)) {
            throw new AppError(`Toán tử không được phép: ${op}`, 400);
        }
    }
};
const validateFields = (collection: string, obj: any) => {
    if (!obj) return;
    const fields = allowedFields[collection];
    for (const key of Object.keys(obj)) {
        if (key.startsWith('$')) continue;
        if (!fields.includes(key)) {
            throw new AppError(`Field không được phép: ${key}`, 400);
        }
    }
};
export const runSafeAIQuery = async (plan: any) => {
    if (!plan.collection) {
        throw new AppError('Thiếu collection', 400);
    }

    if (!allowedCollections.includes(plan.collection)) {
        throw new AppError('Collection không được phép', 400);
    }

    validateObject(plan);

    validateFields(plan.collection, plan.filter);
    validateFields(plan.collection, plan.sort);

    const Model = models[plan.collection];

    const filter = plan.filter || {};
    const sort = plan.sort || {};
    const limit = Math.min(Number(plan.limit) || 10, 50);

    let query = Model.find(filter).sort(sort).limit(limit);

    if (
        Array.isArray(plan.populate) &&
        plan.populate.includes('userId') &&
        ['attendances', 'schedules'].includes(plan.collection)
    ) {
        query = query.populate('userId', 'fullName email position department');
    }

    return await query.lean();
};
