import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Download, Users, Clock, AlertCircle, CheckCircle2, TrendingUp, Calendar, ChevronLeft, ChevronRight, FileText, Loader2 } from 'lucide-react';

interface UserSummary {
  userId: string;
  fullName: string;
  position: string;
  totalSchedules: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  earlyCount: number;
  totalWorkHours: number;
}

const AdminAttendanceSummary: React.FC = () => {
  const [summary, setSummary] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const { data } = await api.get(`/attendance/summary?month=${month}&year=${year}`);
      setSummary(data);
    } catch (error) {
      console.error('Lỗi khi tải thống kê:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [currentDate]);

  useEffect(() => {
    const handleUpdate = () => fetchSummary();
    window.addEventListener('attendanceUpdated', handleUpdate);
    window.addEventListener('scheduleUpdated', handleUpdate);
    return () => {
      window.removeEventListener('attendanceUpdated', handleUpdate);
      window.removeEventListener('scheduleUpdated', handleUpdate);
    };
  }, [currentDate]);

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  // Lọc theo tìm kiếm
  const filteredSummary = summary.filter(user => 
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Tính toán tổng quan dựa trên danh sách đã lọc (hoặc toàn bộ tùy ý, ở đây tôi dùng toàn bộ để admin thấy tổng cửa hàng)
  const totals = summary.reduce((acc, curr) => ({
    schedules: acc.schedules + curr.totalSchedules,
    absent: acc.absent + curr.absentCount,
    late: acc.late + curr.lateCount,
    hours: acc.hours + curr.totalWorkHours
  }), { schedules: 0, absent: 0, late: 0, hours: 0 });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Bộ lọc */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-6 rounded-3xl border border-slate-800 backdrop-blur-md">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="text-emerald-400" size={24} /> Báo cáo hiệu suất tháng
          </h2>
          <p className="text-slate-400 text-sm">Chỉ hiển thị nhân viên có lịch làm trong tháng</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Tìm tên nhân viên..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-all min-w-[200px]"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
              <Users size={16} />
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400">
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-2 px-4 min-w-[160px] justify-center">
              <Calendar size={16} className="text-blue-400" />
              <span className="font-bold text-slate-200">
                Tháng {currentDate.getMonth() + 1}, {currentDate.getFullYear()}
              </span>
            </div>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

        <button className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-900/20">
          <Download size={18} /> Xuất báo cáo (Excel)
        </button>

      {/* Thẻ thống kê tổng quan */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Tổng ca làm" value={totals.schedules} icon={<Users className="text-blue-400" />} sub="Toàn bộ nhân sự" color="blue" />
        <StatCard title="Số buổi vắng" value={totals.absent} icon={<AlertCircle className="text-red-400" />} sub="Tự động ghi nhận" color="red" />
        <StatCard title="Số lần đi muộn" value={totals.late} icon={<Clock className="text-amber-400" />} sub="Sau 15 phút" color="amber" />
        <StatCard title="Tổng giờ công" value={Math.round(totals.hours)} icon={<FileText className="text-emerald-400" />} sub="Đã đối soát" color="emerald" />
      </div>

      {/* Bảng chi tiết nhân viên */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800">
                <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nhân viên</th>
                <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Tổng ca</th>
                <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Đúng giờ</th>
                <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Đi muộn</th>
                <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Vắng mặt</th>
                <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Về sớm</th>
                <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Tổng giờ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-20 text-center">
                    <Loader2 className="animate-spin text-blue-500 mx-auto mb-4" size={40} />
                    <p className="text-slate-400 font-medium">Đang tính toán số liệu...</p>
                  </td>
                </tr>
              ) : filteredSummary.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-20 text-center text-slate-500">Không tìm thấy nhân viên phù hợp.</td>
                </tr>
              ) : (
                filteredSummary.map(user => (
                  <tr key={user.userId} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-blue-400 border border-slate-700 group-hover:border-blue-500/50 transition-colors">
                          {user.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-200 text-sm">{user.fullName}</div>
                          <div className="text-[10px] text-slate-500 uppercase font-medium">{user.position}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-center font-mono font-bold text-slate-300">{user.totalSchedules}</td>
                    <td className="p-5 text-center">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                        {user.presentCount}
                      </span>
                    </td>
                    <td className="p-5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                        user.lateCount > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-800/50 text-slate-600 border-transparent'
                      }`}>
                        {user.lateCount}
                      </span>
                    </td>
                    <td className="p-5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                        user.absentCount > 0 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-slate-800/50 text-slate-600 border-transparent'
                      }`}>
                        {user.absentCount}
                      </span>
                    </td>
                    <td className="p-5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                        user.earlyCount > 0 ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-slate-800/50 text-slate-600 border-transparent'
                      }`}>
                        {user.earlyCount}
                      </span>
                    </td>
                    <td className="p-5 text-right font-mono font-bold text-emerald-400 text-sm">
                      {user.totalWorkHours}h
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  sub: string;
  color: 'blue' | 'red' | 'amber' | 'emerald';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, sub, color }) => {
  const colors = {
    blue: 'border-blue-500/20 bg-blue-500/5 text-blue-400',
    red: 'border-red-500/20 bg-red-500/5 text-red-400',
    amber: 'border-amber-500/20 bg-amber-500/5 text-amber-400',
    emerald: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400',
  };

  return (
    <div className={`p-6 rounded-3xl border ${colors[color]} backdrop-blur-md space-y-4`}>
      <div className="flex justify-between items-start">
        <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
          {icon}
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</div>
          <div className="text-3xl font-black mt-1">{value}</div>
        </div>
      </div>
      <div className="pt-4 border-t border-slate-800/50 flex items-center gap-2">
        <CheckCircle2 size={14} className="opacity-50" />
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{sub}</span>
      </div>
    </div>
  );
};

export default AdminAttendanceSummary;
