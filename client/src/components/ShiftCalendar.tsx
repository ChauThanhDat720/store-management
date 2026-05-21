import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { ChevronLeft, ChevronRight, Info, CheckCircle2, X, MessageSquare, Save, Users, Clock, PlusCircle, MapPin, LogOut as LogOutIcon, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import type { ScheduleRecord, ShiftNoteRecord, AttendanceRecord, AbsentRecord } from '../types';
import { useAuth } from '../context/AuthContext';
import ShiftChecklist from './ShiftChecklist';

const SHIFTS = [
  { id: 'morning', label: 'Sáng', time: '08:00 - 12:00' },
  { id: 'afternoon', label: 'Chiều', time: '12:00 - 16:30' },
  { id: 'evening', label: 'Tối', time: '16:30 - 20:30' }
] as const;

interface SelectedShift {
  date: string;
  shift: typeof SHIFTS[number];
}

const ShiftCalendar: React.FC = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [notes, setNotes] = useState<ShiftNoteRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [absentRequests, setAbsentRequests] = useState<AbsentRecord[]>([]);
  const [, setLoading] = useState(false);
  const [attLoading, setAttLoading] = useState(false);
  const [selectedShift, setSelectedShift] = useState<SelectedShift | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  
  const [cancelShiftId, setCancelShiftId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      
      const [schRes, attRes, absRes] = await Promise.all([
        api.get(`/schedules?month=${month}&year=${year}`),
        api.get('/attendance'),
        api.get('/absent')
      ]);
      
      setSchedules(schRes.data.schedules);
      setNotes(schRes.data.notes);
      setAttendance(attRes.data);
      setAbsentRequests(absRes.data);
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu lịch làm:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentDate.getMonth()]); // Chỉ fetch lại khi đổi tháng

  useEffect(() => {
    const handleUpdate = () => fetchData();
    window.addEventListener('attendanceUpdated', handleUpdate);
    window.addEventListener('scheduleUpdated', handleUpdate);
    window.addEventListener('absentUpdated', handleUpdate);
    return () => {
      window.removeEventListener('attendanceUpdated', handleUpdate);
      window.removeEventListener('scheduleUpdated', handleUpdate);
      window.removeEventListener('absentUpdated', handleUpdate);
    };
  }, [currentDate]);

  useEffect(() => {
    if (selectedShift && notes.length > 0) {
      const currentNote = notes.find(n => n.date === selectedShift.date && n.shift === selectedShift.shift.id);
      setAdminNote(currentNote?.note || '');
    } else {
      setAdminNote('');
    }
  }, [selectedShift, notes]);

  const getWeekDays = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
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

  const getLocation = (): Promise<{ latitude: number, longitude: number, accuracy: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Trình duyệt không hỗ trợ định vị GPS'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        () => reject(new Error('Không lấy được vị trí. Vui lòng cho phép quyền truy cập vị trí.')),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const handleAttendance = async (type: 'in' | 'out', scheduleId: string) => {
    try {
      setAttLoading(true);
      const coords = await getLocation();
      const endpoint = type === 'in' ? '/attendance/checkin' : '/attendance/checkout';
      const res = await api.post(endpoint, { ...coords, scheduleId });
      
      if (type === 'out' && res.data.warning) {
        alert(`Tan ca thành công!\n\nLƯU Ý: ${res.data.warning}\nDanh sách chưa xong: ${res.data.unfinishedTasks.join(', ')}.\nAdmin đã nhận được thông báo này.`);
      } else {
        alert(`${type === 'in' ? 'Vào ca' : 'Tan ca'} thành công!`);
      }
      
      await fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || error.message || 'Lỗi điểm danh');
    } finally {
      setAttLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!selectedShift) return;
    try {
      await api.post('/schedules', { date: selectedShift.date, shift: selectedShift.shift.id });
      await fetchData();
      setSelectedShift(null);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi đăng ký ca làm');
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn hủy trực tiếp ca làm này không? (Quyền Admin)')) return;
    try {
      await api.delete(`/schedules/${id}`);
      await fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi hủy ca làm');
    }
  };

  const handleCancelRequest = async () => {
    if (!cancelShiftId) return;
    if (!cancelReason.trim()) {
      alert('Vui lòng nhập lý do xin hủy ca');
      return;
    }
    try {
      await api.post(`/absent/${cancelShiftId}`, { reason: cancelReason });
      await fetchData();
      setCancelShiftId(null);
      setCancelReason('');
      alert('Đã gửi đơn xin hủy ca thành công!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi gửi đơn xin hủy ca');
    }
  };

  const handleUpdateNote = async () => {
    if (!selectedShift) return;
    try {
      setSavingNote(true);
      await api.post('/schedules/note', {
        date: selectedShift.date,
        shift: selectedShift.shift.id,
        note: adminNote
      });
      await fetchData();
      alert('Đã lưu ghi chú thành công!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi cập nhật ghi chú');
    } finally {
      setSavingNote(false);
    }
  };

  const weekDays = getWeekDays(currentDate);
  const dayLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

  const changeWeek = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + offset * 7);
    setCurrentDate(newDate);
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-center bg-slate-900/80 gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold flex items-center gap-2 text-blue-400">
            <CalendarIcon className="text-blue-400" size={24} /> Lịch trình tuần này
          </h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
            {weekDays[0].toLocaleDateString('vi-VN')} - {weekDays[6].toLocaleDateString('vi-VN')}
          </p>
        </div>
        <div className="flex items-center gap-4 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button onClick={() => changeWeek(-1)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400">
            <ChevronLeft size={20} />
          </button>
          <span className="font-semibold text-sm min-w-[150px] text-center">
            {currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => changeWeek(1)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {weekDays.map((day, idx) => {
            const dateStr = formatDate(day);
            const isToday = formatDate(new Date()) === dateStr;
            const daySchedules = schedules.filter(s => s.date === dateStr);
            const dayNotes = notes.filter(n => n.date === dateStr);
            const hasMyShift = daySchedules.some(s => s.userId?._id === user?.id);

            return (
              <div 
                key={dateStr} 
                className={`flex flex-col min-h-[500px] border p-3 rounded-2xl transition-all ${
                  isToday 
                    ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.15)]' 
                    : hasMyShift 
                      ? 'border-emerald-500/40 bg-emerald-500/5' 
                      : 'border-slate-800 bg-slate-950/40'
                }`}
              >
                <div className="flex flex-col items-center mb-6 py-2 border-b border-slate-800/50">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{dayLabels[idx]}</span>
                  <span className={`text-xl font-mono font-bold ${isToday ? 'text-blue-400' : hasMyShift ? 'text-emerald-400' : 'text-slate-200'}`}>{day.getDate()}</span>
                </div>
                
                <div className="space-y-4 flex-1">
                  {SHIFTS.map(shift => {
                    const shiftRegs = daySchedules.filter(s => s.shift === shift.id);
                    const myReg = shiftRegs.find(s => s.userId?._id === user?.id);
                    const isFull = shiftRegs.length >= 4;
                    const att = attendance.find(a => myReg && (typeof a.schedule === 'string' ? a.schedule === myReg._id : a.schedule?._id === myReg._id));
                    
                    return (
                      <div key={shift.id} className="space-y-2">
                        <button
                          onClick={() => setSelectedShift({ date: dateStr, shift })}
                          className={`w-full p-3 rounded-xl flex flex-col gap-2 transition-all border relative overflow-hidden group ${
                            myReg
                              ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/50'
                              : isFull
                                ? 'bg-slate-900 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-blue-500/50 hover:bg-slate-800/80'
                          }`}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="text-[10px] font-bold uppercase">Ca {shift.label}</span>
                            <span className="text-[9px] font-mono opacity-60">{shiftRegs.length}/4</span>
                          </div>
                          
                          <div className="text-[9px] opacity-70 flex items-center gap-1">
                            <Clock size={10} /> {shift.time.split(' - ')[0]}
                          </div>

                          {/* Trạng thái điểm danh nhanh */}
                          {myReg && att && (
                            <div className="absolute top-0 right-0 p-1">
                              {att.checkOut ? <CheckCircle2 size={12} className="text-emerald-300" /> : att.checkIn ? <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /> : null}
                            </div>
                          )}
                        </button>
                        
                        {/* Danh sách nhân viên trong ca */}
                        <div className="flex flex-wrap gap-1 px-1">
                          {shiftRegs.map(reg => (
                            <div key={reg._id} className={`text-[8px] px-1.5 py-0.5 rounded-md truncate max-w-[50px] font-medium ${reg.userId?._id === user?.id ? 'bg-blue-400 text-white' : 'bg-slate-800 text-slate-500 border border-slate-700/50'}`}>
                              {(reg.userId?.fullName || 'N/A').split(' ').pop()}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {dayNotes.some(n => n.note) && (
                  <div className="mt-4 p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center gap-2">
                    <MessageSquare size={12} className="text-purple-400 shrink-0" />
                    <span className="text-[9px] text-purple-300 truncate">Có ghi chú Admin</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedShift && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div>
                <h2 className="text-xl font-bold text-blue-400">Ca {selectedShift.shift.label}</h2>
                <p className="text-slate-500 text-[10px] flex items-center gap-1 mt-1 uppercase tracking-wider"><Clock size={12} /> {new Date(selectedShift.date).toLocaleDateString('vi-VN')} | {selectedShift.shift.time}</p>
              </div>
              <button onClick={() => setSelectedShift(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors"><X size={24} /></button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* ĐIỂM DANH TRỰC TIẾP */}
              {(() => {
                const myReg = schedules.find(s => s.date === selectedShift.date && s.shift === selectedShift.shift.id && s.userId?._id === user?.id);
                const isToday = formatDate(new Date()) === selectedShift.date;
                
                if (myReg && isToday) {
                  const att = attendance.find(a => (typeof a.schedule === 'string' ? a.schedule === myReg._id : a.schedule?._id === myReg._id));
                  return (
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 shadow-inner">
                      <div className="flex items-center gap-3 mb-4 text-blue-100">
                        <MapPin size={18} className="text-blue-400" />
                        <span className="text-sm font-bold">Điểm danh ca làm hôm nay</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => handleAttendance('in', myReg._id)}
                          disabled={attLoading || !!att?.checkIn}
                          className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-xl text-xs font-bold text-white transition-all shadow-lg shadow-blue-900/20"
                        >
                          {attLoading ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                          {att?.checkIn ? `Vào: ${formatTime(att.checkIn)}` : 'Vào ca (In)'}
                        </button>
                        <button 
                          onClick={() => handleAttendance('out', myReg._id)}
                          disabled={attLoading || !att?.checkIn || !!att?.checkOut}
                          className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-xl text-xs font-bold text-white transition-all border border-slate-700"
                        >
                          {attLoading ? <Loader2 size={14} className="animate-spin" /> : <LogOutIcon size={14} />}
                          {att?.checkOut ? `Ra: ${formatTime(att.checkOut)}` : 'Tan ca (Out)'}
                        </button>
                      </div>
                      {att?.address && (
                        <div className="mt-3 text-[10px] text-slate-400 flex items-start gap-1.5 bg-slate-950/50 p-2 rounded-lg">
                          <Info size={12} className="shrink-0 mt-0.5" />
                          <span>Vị trí: {att.address}</span>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })()}

              <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2"><MessageSquare size={14} className="text-purple-400" /> Ghi chú ca làm</label>
                {user?.role === 'admin' ? (
                  <div className="space-y-3">
                    <textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Nhập lời dặn dò..." className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50 transition-all min-h-[80px]" />
                    <button onClick={handleUpdateNote} disabled={savingNote} className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"><Save size={16} /> {savingNote ? 'Đang lưu...' : 'Lưu lời dặn'}</button>
                  </div>
                ) : (
                  <div className={`p-4 rounded-xl ${adminNote ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-slate-800/30 border border-transparent'}`}>
                    <p className={`text-sm ${adminNote ? 'text-slate-200' : 'text-slate-500 italic'}`}>{adminNote || 'Không có ghi chú.'}</p>
                  </div>
                )}
              </div>

              {/* CHECKLIST CÔNG VIỆC TRONG CA */}
              <ShiftChecklist date={selectedShift.date} shift={selectedShift.shift.id} />

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Users size={14} className="text-blue-400" /> Nhân viên tham gia</label>
                <div className="space-y-3">
                  {schedules.filter(s => s.date === selectedShift.date && s.shift === selectedShift.shift.id).map(reg => {
                    const att = attendance.find(a => (typeof a.schedule === 'string' ? a.schedule === reg._id : a.schedule?._id === reg._id));
                    const absentReq = absentRequests.find(a => typeof a.scheduleId === 'string' ? a.scheduleId === reg._id : a.scheduleId?._id === reg._id);

                    return (
                      <div key={reg._id} className={`p-4 rounded-2xl border transition-all ${reg.userId?._id === user?.id ? 'bg-blue-600/5 border-blue-500/30' : 'bg-slate-800/40 border-slate-800/50'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${reg.userId?._id === user?.id ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>{(reg.userId?.fullName || 'N/A').charAt(0)}</div>
                            <div>
                              <div className="text-sm font-bold text-slate-200">{reg.userId?.fullName || 'N/A'} {reg.userId?._id === user?.id && <span className="text-[10px] text-blue-400 ml-1">(Bạn)</span>}</div>
                              <div className="text-[10px] text-slate-500 uppercase">{reg.userId?.position || 'Nhân viên'}</div>
                            </div>
                          </div>
                          {(reg.userId?._id === user?.id || user?.role === 'admin') && (
                            <div className="flex items-center gap-2">
                              {absentReq ? (
                                <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase ${
                                  absentReq.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                                  absentReq.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {absentReq.status === 'pending' ? 'Đang chờ duyệt hủy' : absentReq.status === 'approved' ? 'Đã duyệt hủy' : 'Từ chối hủy'}
                                </span>
                              ) : (
                                <button onClick={() => user?.role === 'admin' ? handleCancel(reg._id) : setCancelShiftId(reg._id)} className="p-1.5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-all" title="Hủy ca"><X size={14} /></button>
                              )}
                            </div>
                          )}
                        </div>

                        {(user?.role === 'admin' || reg.userId?._id === user?.id) && (
                          <div className="pt-3 mt-3 border-t border-slate-800/50 grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-[8px] text-slate-500 font-bold uppercase mb-1">Vào ca</div>
                              <div className={`text-xs font-mono font-bold ${att?.checkIn ? 'text-emerald-400' : 'text-slate-600'}`}>
                                {formatTime(att?.checkIn)}
                              </div>
                            </div>
                            <div>
                              <div className="text-[8px] text-slate-500 font-bold uppercase mb-1">Tan ca</div>
                              <div className={`text-xs font-mono font-bold ${att?.checkOut ? 'text-emerald-400' : 'text-slate-600'}`}>
                                {formatTime(att?.checkOut)}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {user?.role === 'employee' && !schedules.some(s => s.date === selectedShift.date && s.shift === selectedShift.shift.id && s.userId?._id === user?.id) && (
                <button 
                  onClick={handleRegister} 
                  disabled={schedules.filter(s => s.date === selectedShift.date && s.shift === selectedShift.shift.id).length >= 4}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                >
                  <PlusCircle size={20} /> Đăng ký tham gia ca làm này
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận lý do xin hủy ca */}
      {cancelShiftId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-100 mb-2">Đơn xin hủy ca</h3>
            <p className="text-xs text-slate-400 mb-4">Vui lòng nhập lý do để Quản lý xem xét.</p>
            <textarea 
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="VD: Có việc đột xuất gia đình..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-red-500/50 min-h-[100px] mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => { setCancelShiftId(null); setCancelReason(''); }} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-all">Đóng</button>
              <button onClick={handleCancelRequest} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-red-600/20">Gửi đơn</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ShiftCalendar;
