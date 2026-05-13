import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { ChevronLeft, ChevronRight, Users, AlertCircle, Clock, Printer } from 'lucide-react';
import type { ScheduleRecord, AttendanceRecord } from '../types';

const SHIFTS = [
  { id: 'morning', label: 'Sáng (8:00 - 12:00)', start: 8, startMin: 0, end: 12, endMin: 0 },
  { id: 'afternoon', label: 'Chiều (12:00 - 16:30)', start: 12, startMin: 0, end: 16, endMin: 30 },
  { id: 'evening', label: 'Tối (16:30 - 20:30)', start: 16, startMin: 30, end: 20, endMin: 30 }
];

const AdminScheduleOverview: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [, setLoading] = useState(false);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      
      // Lấy lịch làm
      const scheduleRes = await api.get(`/schedules?month=${month}&year=${year}`);
      setSchedules(scheduleRes.data.schedules);
      
      // Lấy tất cả điểm danh (không lọc theo ngày cụ thể ở backend để lấy cả tháng/tuần)
      // Lưu ý: Nếu dữ liệu lớn, nên tối ưu backend để lọc theo tuần/tháng
      const attendanceRes = await api.get('/attendance');
      setAttendance(attendanceRes.data);
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [currentDate]);

  useEffect(() => {
    const handleUpdate = () => fetchSchedules();
    window.addEventListener('attendanceUpdated', handleUpdate);
    window.addEventListener('scheduleUpdated', handleUpdate);
    return () => {
      window.removeEventListener('attendanceUpdated', handleUpdate);
      window.removeEventListener('scheduleUpdated', handleUpdate);
    };
  }, [currentDate]);

  const getWeekDays = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(d.setDate(diff));
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const checkViolation = (timeStr: string | undefined, type: 'in' | 'out', shiftId: string) => {
    if (!timeStr) return false;
    const time = new Date(timeStr);
    const shift = SHIFTS.find(s => s.id === shiftId);
    if (!shift) return false;

    if (type === 'in') {
      return time.getHours() > shift.start || (time.getHours() === shift.start && time.getMinutes() > shift.startMin);
    } else {
      return time.getHours() < shift.end || (time.getHours() === shift.end && time.getMinutes() < shift.endMin);
    }
  };

  const weekDays = getWeekDays(currentDate);
  const weekDates = weekDays.map(d => formatDate(d));

  const employeeStats: Record<string, { name: string, count: number }> = {};
  schedules.forEach(s => {
    if (weekDates.includes(s.date)) {
      const userId = s.userId._id;
      if (!employeeStats[userId]) {
        employeeStats[userId] = { name: s.userId.fullName, count: 0 };
      }
      employeeStats[userId].count++;
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3"><Users className="text-blue-400" /> Tổng hợp ca làm & Điểm danh</h2>
          <p className="text-slate-500 text-sm mt-1">Kiểm tra lịch trình và đối soát thời gian vào/ra thực tế</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)))} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"><ChevronLeft size={20} /></button>
          <div className="px-4 font-semibold text-sm min-w-[200px] text-center">{weekDays[0].toLocaleDateString('vi-VN')} - {weekDays[6].toLocaleDateString('vi-VN')}</div>
          <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)))} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"><ChevronRight size={20} /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-left w-32">Ca làm</th>
                  {weekDays.map((day, idx) => (
                    <th key={idx} className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center border-l border-slate-800">
                      <div className={formatDate(day) === formatDate(new Date()) ? 'text-blue-400' : ''}>
                        {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'][idx]}
                        <div className="text-[10px] mt-1 opacity-60 font-mono">{day.getDate()}/{day.getMonth() + 1}</div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {SHIFTS.map(shift => (
                  <tr key={shift.id} className="group hover:bg-slate-800/20 transition-colors">
                    <td className="p-4 align-top">
                      <div className="font-bold text-slate-300 text-sm">{shift.label.split(' ')[0]}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-1">{shift.label.split('(')[1].replace(')', '')}</div>
                    </td>
                    {weekDates.map(dateStr => {
                      const shiftRegs = schedules.filter(s => s.date === dateStr && s.shift === shift.id);
                      return (
                        <td key={dateStr} className="p-2 align-top border-l border-slate-800/50 min-h-[100px]">
                          <div className="space-y-2">
                            {shiftRegs.map(reg => {
                              const att = attendance.find(a => a.userId?._id === reg.userId._id && a.date === dateStr);
                              const isLate = checkViolation(att?.checkIn, 'in', shift.id);
                              const isEarly = checkViolation(att?.checkOut, 'out', shift.id);

                              return (
                                <div key={reg._id} className="p-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-blue-500/50 transition-all">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-400">{reg.userId.fullName.charAt(0)}</div>
                                    <span className="text-[11px] font-bold text-slate-200 truncate">{reg.userId.fullName}</span>
                                  </div>
                                  
                                  {/* Hiển thị thời gian điểm danh */}
                                  <div className="grid grid-cols-2 gap-1 mt-1">
                                    <div className={`flex flex-col text-[9px] ${isLate ? 'text-red-400 font-bold' : 'text-slate-500'}`}>
                                      <span className="opacity-60">Vào:</span>
                                      <span>{formatTime(att?.checkIn)}</span>
                                    </div>
                                    <div className={`flex flex-col text-[9px] ${isEarly ? 'text-red-400 font-bold' : 'text-slate-500'}`}>
                                      <span className="opacity-60">Ra:</span>
                                      <span>{formatTime(att?.checkOut)}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            {shiftRegs.length === 0 && <div className="h-10 flex items-center justify-center border border-dashed border-slate-800 rounded-lg opacity-20"><Clock size={14} /></div>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><AlertCircle size={16} className="text-amber-400" /> Thống kê tuần này</h3>
            <div className="space-y-3">
              {Object.values(employeeStats).map((stat, idx) => (
                <div key={idx} className={`p-3 rounded-xl border ${stat.count < 3 ? 'bg-red-500/5 border-red-500/20' : 'bg-green-500/5 border-green-500/20'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-200">{stat.name}</span>
                    <span className={`text-xs font-mono font-bold ${stat.count < 3 ? 'text-red-400' : 'text-green-400'}`}>{stat.count}/3 ca</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${stat.count < 3 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min((stat.count / 3) * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold transition-all border border-slate-700 flex items-center justify-center gap-2 shadow-lg" onClick={() => window.print()}><Printer size={20} /> In báo cáo tuần</button>
        </div>
      </div>
    </div>
  );
};

export default AdminScheduleOverview;
