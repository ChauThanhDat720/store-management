import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Loader2, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import type { AbsentRecord } from '../types';
import { io } from 'socket.io-client';

const AbsentList: React.FC = () => {
  const { user } = useAuth();
  const [absents, setAbsents] = useState<AbsentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAbsents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/absent');
      setAbsents(res.data);
    } catch (error) {
      console.error('Lỗi lấy danh sách đơn từ:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbsents();
    
    const socket = io('http://localhost:5000');
    socket.on('absentUpdated', () => {
      fetchAbsents();
      window.dispatchEvent(new Event('absentUpdated'));
    });
    socket.on('new_absent_request', () => {
      fetchAbsents();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    if (!window.confirm(`Bạn có chắc muốn ${status === 'approved' ? 'duyệt' : 'từ chối'} đơn này?`)) return;
    try {
      await api.put(`/absent/${id}/status`, { status });
      await fetchAbsents();
      alert(`Đã ${status === 'approved' ? 'duyệt' : 'từ chối'} đơn thành công`);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending': return <span className="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md text-xs font-semibold flex items-center gap-1"><Clock size={12}/> Chờ duyệt</span>;
      case 'approved': return <span className="px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-md text-xs font-semibold flex items-center gap-1"><CheckCircle size={12}/> Đã duyệt</span>;
      case 'rejected': return <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md text-xs font-semibold flex items-center gap-1"><XCircle size={12}/> Từ chối</span>;
      default: return null;
    }
  };

  const SHIFTS: any = {
    morning: 'Sáng',
    afternoon: 'Chiều',
    evening: 'Tối'
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-in fade-in duration-500">
      <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
        <div className="flex items-center gap-3">
          <FileText className="text-pink-400" size={24} />
          <h2 className="text-xl font-bold">Danh sách Đơn xin hủy ca</h2>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50">
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nhân viên</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ca làm xin hủy</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Lý do</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Thời gian nộp</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
              {user?.role === 'admin' && <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan={user?.role === 'admin' ? 6 : 5} className="px-6 py-12 text-center text-slate-500"><Loader2 className="animate-spin mx-auto mb-2" size={32} /> Đang tải...</td></tr>
            ) : absents.length > 0 ? (
              absents.map((absent) => (
                <tr key={absent._id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-100">{absent.userId?.fullName || 'N/A'}</div>
                    <div className="text-slate-500 text-xs">{absent.userId?.position || 'Nhân viên'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-blue-400">{absent.date}</div>
                    <div className="text-slate-400 text-xs mt-0.5">Ca {SHIFTS[absent.scheduleId?.shift] || absent.scheduleId?.shift || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300 max-w-xs truncate" title={absent.reason}>
                    {absent.reason}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">
                    {new Date(absent.createdAt).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(absent.status)}
                  </td>
                  {user?.role === 'admin' && (
                    <td className="px-6 py-4 text-right">
                      {absent.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleUpdateStatus(absent._id, 'approved')}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition-all"
                          >
                            Duyệt
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(absent._id, 'rejected')}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-all"
                          >
                            Từ chối
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Đã xử lý</span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr><td colSpan={user?.role === 'admin' ? 6 : 5} className="px-6 py-20 text-center text-slate-600">Chưa có đơn từ nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AbsentList;
