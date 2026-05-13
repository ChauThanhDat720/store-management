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

export {};
