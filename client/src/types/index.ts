export type User = {
  id: string;
  fullName: string;
  email: string;
  role: 'admin' | 'employee';
};

export type Employee = {
  _id?: string;
  fullName: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  salary: number;
  status: 'active' | 'inactive';
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type AttendanceRecord = {
  _id: string;
  userId: {
    _id: string;
    fullName: string;
    email: string;
    role: string;
  };
  schedule: string | { _id: string };
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: 'present' | 'late' | 'absent' | 'early';
  address?: string;
  workHours?: number;
  accuracy?: number;
};

export type ScheduleRecord = {
  _id: string;
  userId: {
    _id: string;
    fullName: string;
    email: string;
    position?: string;
    department?: string;
  };
  date: string;
  shift: 'morning' | 'afternoon' | 'evening';
};

export type ShiftNoteRecord = {
  _id: string;
  date: string;
  shift: 'morning' | 'afternoon' | 'evening';
  note: string;
};

export type AbsentRecord = {
  _id: string;
  userId: {
    _id: string;
    fullName: string;
    email: string;
    position?: string;
  };
  scheduleId: {
    _id: string;
    shift: 'morning' | 'afternoon' | 'evening';
    date: string;
  };
  date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};

export type ShiftTask = {
  _id: string;
  date: string;
  shift: 'morning' | 'afternoon' | 'evening';
  taskName: string;
  isCompleted: boolean;
  completedBy?: {
    _id: string;
    fullName: string;
  };
  completedAt?: string;
};

export type ShiftTaskTemplate = {
  _id: string;
  shift: 'morning' | 'afternoon' | 'evening';
  taskName: string;
};

export type NotificationRecord = {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'ai_reminder';
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  readAt?: string;
};

export type PayrollAdjustment = {
  _id: string;
  userId: string;
  month: number;
  year: number;
  amount: number;
  type: 'allowance' | 'deduction' | 'bonus' | 'penalty';
  reason: string;
  note?: string;
};

export type PayrollSummary = {
  user: {
    _id: string;
    fullName: string;
    email: string;
    position?: string;
    department?: string;
  };
  month: number;
  year: number;
  totalRegisteredShifts: number;
  completedShifts: number;
  absentShifts: number;
  approvedAbsentRequests: number;
  lateCount: number;
  earlyCount: number;
  totalHours: number;
  hourlyRate: number;
  estimatedSalary: number;
  totalAllowance: number;
  totalDeduction: number;
  officialSalary: number | null;
  payrollStatus: 'draft' | 'finalized' | 'paid';
  finalizedAt?: string | null;
  finalizationNote?: string;
  adjustments: PayrollAdjustment[];
  details: Array<{
    schedule: ScheduleRecord;
    attendance: AttendanceRecord | null;
  }>;
};

export {};
