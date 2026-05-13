import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { ChevronLeft, ChevronRight, Clock, MapPin, Search, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Employee, ScheduleRecord, AttendanceRecord } from '../types';

const SHIFTS = {
  morning: { label: 'Sáng', start: '08:00', end: '12:00' },
  afternoon: { label: 'Chiều', start: '12:00', end: '16:30' },
  evening: { label: 'Tối', start: '16:30', end: '20:30' }
};

const AdminAttendanceSheet: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      
      const [empRes, schRes, attRes] = await Promise.all([
        api.get('/auth/users'),
        api.get(`/schedules?month=${month}&year=${year}`),
        api.get('/attendance')
      ]);
      
      console.log('Users fetched:', empRes.data.length);
      console.log('Schedules fetched:', schRes.data.schedules.length);
      console.log('Attendance fetched:', attRes.data.length);

      setEmployees(empRes.data);
      setSchedules(schRes.data.schedules);
      setAttendance(attRes.data);
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu bảng công:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  useEffect(() => {
    const handleUpdate = () => fetchData();
    window.addEventListener('attendanceUpdated', handleUpdate);
    window.addEventListener('scheduleUpdated', handleUpdate);
    window.addEventListener('employeeUpdated', handleUpdate);
    return () => {
      window.removeEventListener('attendanceUpdated', handleUpdate);
      window.removeEventListener('scheduleUpdated', handleUpdate);
      window.removeEventListener('employeeUpdated', handleUpdate);
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
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const weekDays = getWeekDays(currentDate);
  const weekDates = weekDays.map(d => formatDate(d));

  const filteredEmployees = employees.filter(emp => 
    emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header & Filter */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <FileSpreadsheet className="text-emerald-400" /> Bảng công chi tiết tuần
          </h2>
          <p className="text-slate-500 text-sm mt-1">Đối soát ca đăng ký với thời gian điểm danh và GPS thực tế</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Tìm nhân viên, vị trí..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)))} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"><ChevronLeft size={18} /></button>
            <div className="px-3 font-semibold text-xs min-w-[150px] text-center">Tuần: {weekDays[0].getDate()}/{weekDays[0].getMonth()+1} - {weekDays[6].getDate()}/{weekDays[6].getMonth()+1}</div>
            <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)))} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"><ChevronRight size={18} /></button>
          </div>

          <button className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20">
            <Download size={18} /> Xuất Excel
          </button>
        </div>
      </div>

      {/* Main Sheet Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800">
                <th className="sticky left-0 z-20 bg-slate-950 p-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-left w-64 border-r border-slate-800">Nhân viên / Ngày</th>
                {weekDays.map((day, idx) => (
                  <th key={idx} className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center min-w-[180px] border-r border-slate-800/50">
                    <div className={formatDate(day) === formatDate(new Date()) ? 'text-emerald-400' : ''}>
                      {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'][idx]}
                      <div className="text-[10px] mt-1 opacity-60 font-mono">{day.getDate()}/{day.getMonth() + 1}</div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredEmployees.map(emp => (
                <tr key={emp._id} className="group hover:bg-slate-800/20 transition-colors">
                  <td className="sticky left-0 z-10 bg-slate-900/90 group-hover:bg-slate-800/90 backdrop-blur-sm p-4 border-r border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold border border-emerald-500/20">
                        {emp.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-100 text-sm">{emp.fullName}</div>
                        <div className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">{emp.position}</div>
                      </div>
                    </div>
                  </td>
                  
                  {weekDates.map(dateStr => {
                    const dayShifts = schedules.filter(s => s.userId?._id === emp._id && s.date === dateStr);
                    
                    return (
                      <td key={dateStr} className="p-3 border-r border-slate-800/30">
                        <div className="space-y-4">
                          {dayShifts.map(shift => {
                            const att = attendance.find(a => 
                              (typeof a.schedule === 'string' ? a.schedule === shift._id : a.schedule?._id === shift._id)
                            );
                            
                            return (
                              <div key={shift._id} className="space-y-3 pb-3 border-b border-slate-800 last:border-0 last:pb-0">
                                {/* Ca đăng ký */}
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                                    Ca {SHIFTS[shift.shift].label}
                                  </span>
                                  {att?.status && (
                                    <span className={`text-[9px] font-bold uppercase ${
                                      att.status === 'present' ? 'text-emerald-400' : 'text-amber-400'
                                    }`}>
                                      {att.status === 'present' ? 'Đúng giờ' : att.status === 'late' ? 'Muộn' : 'Về sớm'}
                                    </span>
                                  )}
                                </div>

                                {/* Giờ thực tế */}
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-0.5">
                                    <div className="text-[9px] text-slate-500 uppercase font-bold">Vào</div>
                                    <div className={`text-xs font-mono font-bold ${!att?.checkIn ? 'text-slate-700' : 'text-slate-200'}`}>
                                      {formatTime(att?.checkIn) || '--:--'}
                                    </div>
                                  </div>
                                  <div className="space-y-0.5">
                                    <div className="text-[9px] text-slate-500 uppercase font-bold">Ra</div>
                                    <div className={`text-xs font-mono font-bold ${!att?.checkOut ? 'text-slate-700' : 'text-slate-200'}`}>
                                      {formatTime(att?.checkOut) || '--:--'}
                                    </div>
                                  </div>
                                </div>

                                {/* GPS & Accuracy */}
                                {att && (
                                  <div className="pt-2 border-t border-slate-800/50 flex items-center justify-between text-[9px]">
                                    <div className="flex items-center gap-1 text-slate-500">
                                      <MapPin size={10} />
                                      <span className="truncate max-w-[80px]">{att.address?.split(',')[0] || 'N/A'}</span>
                                    </div>
                                    {att.accuracy && (
                                      <div className={`font-mono ${att.accuracy > 100 ? 'text-red-400' : 'text-emerald-500'}`}>
                                        ±{Math.round(att.accuracy)}m
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {dayShifts.length === 0 && (
                            <div className="h-20 flex items-center justify-center text-slate-800">
                              <Clock size={16} className="opacity-20" />
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-20 text-center text-slate-600 font-medium">Không tìm thấy nhân viên phù hợp.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend / Tips */}
      <div className="flex flex-wrap gap-4 text-[11px] text-slate-500 bg-slate-900/30 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> Đúng giờ</div>
        <div className="flex items-center gap-1.5"><AlertCircle size={14} className="text-amber-500" /> Đi muộn / Về sớm</div>
        <div className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-600" /> Vị trí GPS được ghi lại tại thời điểm Check-in</div>
      </div>
    </div>
  );
};

export default AdminAttendanceSheet;
