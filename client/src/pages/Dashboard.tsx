import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import api from '../services/api';
import { UserPlus, Users, X, Save, DollarSign, LogOut, Search, Calendar, MapPin, Clock, FileSpreadsheet, TrendingUp, ClipboardList, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CheckAttendance from '../components/CheckAttendance';
import ShiftCalendar from '../components/ShiftCalendar';
import AdminScheduleOverview from '../components/AdminScheduleOverview';
import AdminAttendanceSheet from '../components/AdminAttendanceSheet';
import AdminAttendanceSummary from '../components/AdminAttendanceSummary';
import AbsentList from '../components/AbsentList';
import TaskTemplateManager from '../components/TaskTemplateManager';
import AIChat from '../components/AIChat';
import NotificationCenter from '../components/NotificationCenter';
import PayrollPanel from '../components/PayrollPanel';
import type { Employee, AttendanceRecord } from '../types';
import { io } from 'socket.io-client';

function Dashboard() {
  const { user, logout } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'employees' | 'attendance' | 'schedules' | 'admin_schedules' | 'attendance_sheet' | 'summary' | 'absents' | 'task_templates' | 'notifications' | 'payroll'>('schedules');
  const [filterDate, setFilterDate] = useState<string>('');

  const [formData, setFormData] = useState<Omit<Employee, '_id'>>({
    fullName: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    salary: 0,
    status: 'active',
  });

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu nhân viên:', error);
    }
  };

  const fetchAttendance = async (date?: string) => {
    try {
      const url = date ? `/attendance?date=${date}` : '/attendance';
      const response = await api.get(url);
      setAttendance(response.data);
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu điểm danh:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchEmployees(), fetchAttendance()]);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    const socket = io('http://localhost:5000', {
      query: {
        userId: user?.id,
        role: user?.role,
      },
    });

    socket.on('attendanceUpdated', () => {
      // Khi có người điểm danh, lấy lại danh sách
      fetchAttendance(filterDate);
      // Dispatch window event để các component con (nếu có) tự tải lại nếu cần
      window.dispatchEvent(new Event('attendanceUpdated'));
    });

    socket.on('employeeUpdated', () => {
      fetchEmployees();
      window.dispatchEvent(new Event('employeeUpdated'));
    });

    socket.on('scheduleUpdated', () => {
      window.dispatchEvent(new Event('scheduleUpdated'));
    });

    return () => {
      socket.disconnect();
    };
  }, [filterDate, user?.id, user?.role]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'salary' ? Number(value) : value,
    } as Omit<Employee, '_id'>));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/employees', formData);
      setShowModal(false);
      setFormData({
        fullName: '', email: '', phone: '', position: '', department: '', salary: 0, status: 'active',
      });
      fetchEmployees();
      alert('Thêm nhân viên thành công!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi lưu nhân viên.');
    }
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present': return <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full text-xs">Đúng giờ</span>;
      case 'late': return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-xs">Muộn</span>;
      case 'early': return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full text-xs">Về sớm</span>;
      default: return <span className="bg-slate-500/10 text-slate-400 border border-slate-500/20 px-2 py-0.5 rounded-full text-xs">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-blue-500/30">
      <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-10 py-6 lg:py-10 overflow-hidden">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent mb-2">
              Hệ Thống Quản Trị
            </h1>
            <p className="text-slate-400">
              Xin chào, <span className="text-blue-400 font-semibold">{user?.fullName}</span>
              <span className="mx-2 text-slate-600">|</span>
              <span className="px-2 py-1 bg-slate-800 rounded-md text-xs font-mono uppercase tracking-wider">{user?.role}</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            {user?.role === 'admin' && (
              <button
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/20 active:scale-95"
                onClick={() => setShowModal(true)}
              >
                <UserPlus size={20} /> Thêm Nhân Viên
              </button>
            )}
            <button
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-red-500/10 text-slate-300 hover:text-red-400 font-semibold rounded-xl border border-slate-700 hover:border-red-400/30 transition-all duration-200 active:scale-95"
              onClick={logout}
            >
              <LogOut size={20} /> Đăng xuất
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 mb-12 min-w-0">
          <div className="lg:col-span-3 min-w-0">
            <CheckAttendance onSuccess={fetchAttendance} />
          </div>

          <div className="lg:col-span-9 min-w-0 space-y-8 lg:space-y-10 p-0 sm:p-4 lg:p-6">
            <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 max-w-full overflow-hidden">
              <button
                onClick={() => setActiveTab('schedules')}
                className={`flex min-w-0 items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'schedules' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
              >
                <Calendar size={18} /> Lịch làm & Điểm danh
              </button>
              <button
                onClick={() => setActiveTab('attendance')}
                className={`flex min-w-0 items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'attendance' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
              >
                <Clock size={18} /> Lịch sử điểm danh
              </button>
              <button
                onClick={() => setActiveTab('employees')}
                className={`flex min-w-0 items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'employees' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
              >
                <Users size={18} /> Quản lý nhân viên
              </button>
              <button
                onClick={() => setActiveTab('absents')}
                className={`flex min-w-0 items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'absents' ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/20' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
              >
                <FileSpreadsheet size={18} /> Đơn xin nghỉ
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`flex min-w-0 items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'notifications' ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
              >
                <Bell size={18} /> Thong bao
              </button>
              <button
                onClick={() => setActiveTab('payroll')}
                className={`flex min-w-0 items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'payroll' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
              >
                <DollarSign size={18} /> Luong
              </button>
              {user?.role === 'admin' && (
                <button
                  onClick={() => setActiveTab('task_templates')}
                  className={`flex min-w-0 items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'task_templates' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
                >
                  <ClipboardList size={18} /> Mẫu Checklist
                </button>
              )}
              {user?.role === 'admin' && (
                <button
                  onClick={() => setActiveTab('attendance_sheet')}
                  className={`flex min-w-0 items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'attendance_sheet' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
                >
                  <FileSpreadsheet size={18} /> Bảng công tổng hợp
                </button>
              )}
              {user?.role === 'admin' && (
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`flex min-w-0 items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'summary' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
                >
                  <TrendingUp size={18} /> Thống kê tháng
                </button>
              )}
            </div>

            {(activeTab === 'attendance' || activeTab === 'employees') && (
              <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
                <div className="flex items-center gap-3">
                  {activeTab === 'employees' ? <Users className="text-blue-400" size={24} /> : <Calendar className="text-purple-400" size={24} />}
                  <h2 className="text-xl font-bold">{activeTab === 'employees' ? 'Danh Sách Nhân Viên' : 'Lịch Sử Điểm Danh'}</h2>
                </div>
                <div className="flex gap-2">
                  {activeTab === 'attendance' && (
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                        <input
                          type="date"
                          value={filterDate}
                          onChange={(e) => {
                            setFilterDate(e.target.value);
                            fetchAttendance(e.target.value);
                          }}
                          onClick={(e) => (e.target as any).showPicker?.()}
                          style={{ colorScheme: 'dark' }}
                          className="pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-purple-500/50 transition-colors cursor-pointer"
                        />
                      </div>
                      {filterDate && (
                        <button
                          onClick={() => {
                            setFilterDate('');
                            fetchAttendance('');
                          }}
                          className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 bg-slate-800/50 rounded-md"
                        >
                          Xóa lọc
                        </button>
                      )}
                    </div>
                  )}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                      type="text"
                      placeholder="Tìm kiếm..."
                      className="pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  {activeTab === 'employees' ? (
                    <>
                      <thead>
                        <tr className="bg-slate-950/50">
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Họ tên</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Liên hệ</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vị trí</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Lương/giờ</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {loading ? (
                          <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500"><Loader2 className="animate-spin mx-auto mb-2" size={32} /> Đang tải...</td></tr>
                        ) : employees.length > 0 ? (
                          employees.map((emp) => (
                            <tr key={emp._id} className="hover:bg-slate-800/30 transition-colors group">
                              <td className="px-6 py-4 font-semibold text-slate-100 group-hover:text-blue-400">{emp.fullName}</td>
                              <td className="px-6 py-4 text-sm text-slate-300">
                                <div>{emp.email}</div>
                                <div className="text-slate-500 text-xs">{emp.phone}</div>
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <div>{emp.position}</div>
                                <div className="text-slate-500 text-xs">{emp.department}</div>
                              </td>
                              <td className="px-6 py-4 font-mono text-blue-400">{emp.salary?.toLocaleString()} đ/giờ</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${emp.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-slate-500/10 text-slate-400'}`}>
                                  {emp.status === 'active' ? 'Đang làm việc' : 'Nghỉ việc'}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-600">Chưa có nhân viên.</td></tr>
                        )}
                      </tbody>
                    </>
                  ) : (
                    <>
                      <thead>
                        <tr className="bg-slate-950/50">
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nhân viên</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ngày</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vào / Ra</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng giờ</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vị trí</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {loading ? (
                          <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500"><Loader2 className="animate-spin mx-auto mb-2" size={32} /> Đang tải...</td></tr>
                        ) : attendance.length > 0 ? (
                          attendance.map((rec) => (
                            <tr key={rec._id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-semibold text-slate-100">{rec.userId?.fullName || 'N/A'}</div>
                                <div className="text-slate-500 text-xs">{rec.userId?.email}</div>
                              </td>
                              <td className="px-6 py-4 text-sm">{rec.date}</td>
                              <td className="px-6 py-4 text-sm font-mono">
                                <div className="text-green-400 flex items-center gap-1"><Clock size={12} /> {formatTime(rec.checkIn)}</div>
                                <div className="text-amber-400 flex items-center gap-1"><Clock size={12} /> {formatTime(rec.checkOut)}</div>
                              </td>
                              <td className="px-6 py-4 font-mono text-blue-400">{rec.workHours ? `${rec.workHours}h` : '--'}</td>
                              <td className="px-6 py-4">{getStatusBadge(rec.status)}</td>
                              <td className="px-6 py-4 min-w-[280px]">
                                <div className="flex items-start gap-1 text-sm text-slate-400">
                                  <MapPin size={14} className="mt-0.5 shrink-0" />
                                  <span className="whitespace-normal leading-relaxed" title={rec.address}>{rec.address || 'Không xác định'}</span>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-600">Chưa có lịch sử điểm danh.</td></tr>
                        )}
                      </tbody>
                    </>
                  )}
                </table>
              </div>
            </div>
          )}
            
            {activeTab === 'schedules' && <ShiftCalendar />}
            {activeTab === 'absents' && <AbsentList />}
            {activeTab === 'notifications' && <NotificationCenter />}
            {activeTab === 'payroll' && <PayrollPanel />}
            {activeTab === 'task_templates' && user?.role === 'admin' && <TaskTemplateManager />}
            {activeTab === 'admin_schedules' && user?.role === 'admin' && <AdminScheduleOverview />}
            {activeTab === 'attendance_sheet' && user?.role === 'admin' && <AdminAttendanceSheet />}
            {activeTab === 'summary' && user?.role === 'admin' && <AdminAttendanceSummary />}
          </div>
        </div>

        {/* Modal using Tailwind */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <h2 className="text-2xl font-bold text-blue-400">Thêm Nhân Viên Mới</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-100 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Họ và Tên</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Số điện thoại</label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Vị trí</label>
                    <input
                      type="text"
                      name="position"
                      value={formData.position}
                      onChange={handleChange}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Phòng ban</label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Lương/giờ (VNĐ)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      type="number"
                      name="salary"
                      value={formData.salary}
                      onChange={handleChange}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Trạng thái</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all cursor-pointer"
                  >
                    <option value="active">Đang làm việc</option>
                    <option value="inactive">Nghỉ việc</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-all"
                    onClick={() => setShowModal(false)}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={20} /> Lưu Nhân Viên
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      {/* AI Assistant Chat Widget */}
      {user?.role === 'admin' && <AIChat />}
    </div>
  );
}

const Loader2 = ({ className, size }: { className?: string, size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size || 24}
    height={size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export default Dashboard;
