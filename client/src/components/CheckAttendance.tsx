import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { MapPin, CheckCircle, LogOut as LogOutIcon, Loader2, Clock, AlertCircle } from 'lucide-react';
import type { ScheduleRecord, AttendanceRecord } from '../types';

interface GeoData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface CheckAttendanceProps {
  onSuccess?: () => void;
}

const CheckAttendance: React.FC<CheckAttendanceProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [fetchingSchedules, setFetchingSchedules] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  const [todaySchedules, setTodaySchedules] = useState<ScheduleRecord[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');

  const fetchTodayData = async () => {
    try {
      setFetchingSchedules(true);
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      
      // Lấy lịch làm của hôm nay
      const schRes = await api.get(`/schedules?date=${dateStr}`);
      // Lấy điểm danh của hôm nay
      const attRes = await api.get(`/attendance?date=${dateStr}`);
      
      setTodaySchedules(schRes.data.schedules);
      setTodayAttendance(attRes.data);
      
      // Tự động chọn ca đầu tiên nếu có
      if (schRes.data.schedules.length > 0 && !selectedScheduleId) {
        setSelectedScheduleId(schRes.data.schedules[0]._id);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu hôm nay:', err);
    } finally {
      setFetchingSchedules(false);
    }
  };

  useEffect(() => {
    fetchTodayData();
  }, []);

  const getLocation = (): Promise<GeoData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Trình duyệt không hỗ trợ định vị GPS'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          resolve({ latitude, longitude, accuracy });
        },
        () => {
          reject(new Error('Không lấy được vị trí. Vui lòng cho phép quyền truy cập vị trí.'));
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const handleCheck = async (type: 'in' | 'out') => {
    if (!selectedScheduleId) {
      setError('Vui lòng chọn ca làm việc để điểm danh');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');
    try {
      const { latitude, longitude, accuracy } = await getLocation();
      const endpoint = type === 'in' ? '/attendance/checkin' : '/attendance/checkout';
      
      await api.post(endpoint, { 
        latitude, 
        longitude, 
        accuracy,
        scheduleId: selectedScheduleId 
      });
      
      setMessage(`✅ ${type === 'in' ? 'Check‑in' : 'Check‑out'} ca làm thành công!`);
      fetchTodayData(); // Tải lại dữ liệu để cập nhật trạng thái
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const getShiftLabel = (id: string) => {
    const labels: any = { morning: 'Sáng', afternoon: 'Chiều', evening: 'Tối' };
    return labels[id] || id;
  };

  const selectedAtt = todayAttendance.find(a => a.schedule === selectedScheduleId || (typeof a.schedule === 'object' && (a.schedule as any)._id === selectedScheduleId));

  return (
    <div className="flex justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
        <h2 className="text-xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Điểm danh theo ca
        </h2>
        
        {/* Lựa chọn ca làm */}
        <div className="mb-8 space-y-3">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block text-left ml-1">Chọn ca làm hôm nay</label>
          {fetchingSchedules ? (
            <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-600" /></div>
          ) : todaySchedules.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {todaySchedules.map(sch => {
                const isSelected = selectedScheduleId === sch._id;
                const att = todayAttendance.find(a => a.schedule === sch._id || (typeof a.schedule === 'object' && (a.schedule as any)._id === sch._id));
                
                return (
                  <button
                    key={sch._id}
                    onClick={() => setSelectedScheduleId(sch._id)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      isSelected 
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-200' 
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Clock size={16} className={isSelected ? 'text-blue-400' : 'text-slate-600'} />
                      <span className="font-semibold text-sm">Ca {getShiftLabel(sch.shift)}</span>
                    </div>
                    {att ? (
                      <div className="flex gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${att.checkIn ? 'bg-green-500' : 'bg-slate-700'}`} title="Vào" />
                        <div className={`w-2 h-2 rounded-full ${att.checkOut ? 'bg-green-500' : 'bg-slate-700'}`} title="Ra" />
                      </div>
                    ) : (
                      <span className="text-[10px] opacity-40">Chưa điểm danh</span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-6 border-2 border-dashed border-slate-800 rounded-2xl text-slate-600 text-sm">
              Hôm nay bạn không có lịch làm việc nào được đăng ký.
            </div>
          )}
        </div>

        {message && (
          <div className="mb-6 p-3 bg-green-500/10 text-green-400 rounded-xl text-sm flex items-center justify-center gap-2">
            <CheckCircle size={16} /> {message}
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-3 bg-red-500/10 text-red-400 rounded-xl text-sm flex items-center justify-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div className="space-y-4">
          <button
            className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-30 disabled:grayscale"
            onClick={() => handleCheck('in')}
            disabled={loading || !selectedScheduleId || !!selectedAtt?.checkIn}
          >
            {loading ? <Loader2 className="animate-spin" /> : <MapPin size={20} />}
            {selectedAtt?.checkIn ? 'Đã Check‑in' : 'Vào ca (Check‑in)'}
          </button>

          <button
            className="w-full py-4 px-6 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl border border-slate-700 transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:grayscale"
            onClick={() => handleCheck('out')}
            disabled={loading || !selectedScheduleId || !selectedAtt?.checkIn || !!selectedAtt?.checkOut}
          >
            {loading ? <Loader2 className="animate-spin" /> : <LogOutIcon size={20} />}
            {selectedAtt?.checkOut ? 'Đã Check‑out' : 'Tan ca (Check‑out)'}
          </button>
        </div>
        
        <p className="mt-6 text-[10px] text-slate-500 italic">
          Vui lòng chọn ca làm và bật GPS trước khi nhấn điểm danh.
        </p>
      </div>
    </div>
  );
};

export default CheckAttendance;
