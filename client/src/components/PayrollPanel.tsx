import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Calendar, ChevronLeft, ChevronRight, CheckCircle2, DollarSign, Loader2, Plus, ReceiptText, Trash2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { PayrollSummary } from '../types';

const formatMoney = (value: number | null | undefined) => {
  return `${Number(value || 0).toLocaleString('vi-VN')} VND`;
};

const formatShift = (shift: string) => {
  if (shift === 'morning') return 'Sang';
  if (shift === 'afternoon') return 'Chieu';
  return 'Toi';
};

const PayrollPanel = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [payroll, setPayroll] = useState<PayrollSummary[]>([]);
  const [myPayroll, setMyPayroll] = useState<PayrollSummary | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState({
    type: 'allowance',
    amount: '',
    reason: '',
    note: '',
  });
  const [hourlyRateInput, setHourlyRateInput] = useState('');
  const [finalizeNote, setFinalizeNote] = useState('');

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const selectedPayroll = useMemo(() => {
    return payroll.find(item => item.user._id === selectedUserId) || payroll[0] || null;
  }, [payroll, selectedUserId]);

  useEffect(() => {
    if (selectedPayroll) {
      setHourlyRateInput(String(selectedPayroll.hourlyRate || ''));
    }
  }, [selectedPayroll?.user._id, selectedPayroll?.hourlyRate]);

  const fetchPayroll = async () => {
    setLoading(true);

    try {
      if (user?.role === 'admin') {
        const res = await api.get(`/payroll?month=${month}&year=${year}`);
        setPayroll(res.data.payroll);
        setSelectedUserId((current) => current || res.data.payroll[0]?.user?._id || '');
      } else {
        const res = await api.get(`/payroll/me?month=${month}&year=${year}`);
        setMyPayroll(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [month, year, user?.role]);

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    setSelectedUserId('');
  };

  const addAdjustment = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPayroll) return;

    setSaving(true);
    try {
      await api.post('/payroll/adjustments', {
        userId: selectedPayroll.user._id,
        month,
        year,
        type: adjustmentForm.type,
        amount: Number(adjustmentForm.amount),
        reason: adjustmentForm.reason,
        note: adjustmentForm.note,
      });
      setAdjustmentForm({ type: 'allowance', amount: '', reason: '', note: '' });
      await fetchPayroll();
    } finally {
      setSaving(false);
    }
  };

  const deleteAdjustment = async (id: string) => {
    await api.delete(`/payroll/adjustments/${id}`);
    await fetchPayroll();
  };

  const finalizePayroll = async () => {
    if (!selectedPayroll) return;

    setSaving(true);
    try {
      await api.post(`/payroll/${selectedPayroll.user._id}/finalize`, {
        month,
        year,
        note: finalizeNote,
      });
      setFinalizeNote('');
      await fetchPayroll();
    } finally {
      setSaving(false);
    }
  };

  const updateHourlyRate = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPayroll) return;

    setSaving(true);
    try {
      await api.put(`/employees/${selectedPayroll.user._id}`, {
        salary: Number(hourlyRateInput),
      });
      await fetchPayroll();
    } finally {
      setSaving(false);
    }
  };

  const renderSummaryCards = (summary: PayrollSummary) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <PayrollCard title="Tong gio da lam" value={`${summary.totalHours}h`} sub={`${summary.completedShifts}/${summary.totalRegisteredShifts} ca hoan thanh`} />
      <PayrollCard title="Luong/giờ" value={formatMoney(summary.hourlyRate)} sub="Lay tu ho so nhan vien" />
      <PayrollCard title="Luong du kien" value={formatMoney(summary.estimatedSalary)} sub="Tong gio x luong/gio" />
      <PayrollCard title="Luong chinh thuc" value={summary.officialSalary ? formatMoney(summary.officialSalary) : 'Chua chot'} sub={summary.payrollStatus === 'draft' ? 'Cho admin chot cuoi thang' : 'Da duoc admin chot'} />
    </div>
  );

  const renderDetailTable = (summary: PayrollSummary) => (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-950/50 border-b border-slate-800">
            <tr>
              <th className="p-4 text-xs text-slate-500 uppercase">Ngay</th>
              <th className="p-4 text-xs text-slate-500 uppercase">Ca</th>
              <th className="p-4 text-xs text-slate-500 uppercase">Check-in</th>
              <th className="p-4 text-xs text-slate-500 uppercase">Check-out</th>
              <th className="p-4 text-xs text-slate-500 uppercase text-right">Gio lam</th>
              <th className="p-4 text-xs text-slate-500 uppercase">Trang thai</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {summary.details.length > 0 ? summary.details.map((item) => (
              <tr key={item.schedule._id} className="hover:bg-slate-800/30">
                <td className="p-4 text-sm">{item.schedule.date}</td>
                <td className="p-4 text-sm">{formatShift(item.schedule.shift)}</td>
                <td className="p-4 text-sm text-slate-400">{item.attendance?.checkIn ? new Date(item.attendance.checkIn).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--'}</td>
                <td className="p-4 text-sm text-slate-400">{item.attendance?.checkOut ? new Date(item.attendance.checkOut).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--'}</td>
                <td className="p-4 text-sm text-right font-mono text-emerald-400">{item.attendance?.workHours || 0}h</td>
                <td className="p-4 text-sm">{item.attendance?.status || 'chua cham cong'}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="p-12 text-center text-slate-500">Chua co ca lam trong thang nay.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500">
        <Loader2 className="animate-spin mx-auto mb-3" size={36} />
        Dang tai bang luong...
      </div>
    );
  }

  const currentSummary = user?.role === 'admin' ? selectedPayroll : myPayroll;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4 bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="text-emerald-400" />
            {user?.role === 'admin' ? 'Bang luong thang' : 'Luong cua toi'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">Luong du kien tinh theo tong gio da checkout.</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 w-fit">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2 px-3 min-w-[140px] justify-center">
            <Calendar size={16} className="text-blue-400" />
            <span className="font-bold">Thang {month}, {year}</span>
          </div>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {user?.role === 'admin' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-950/50 border-b border-slate-800">
                <tr>
                  <th className="p-4 text-xs text-slate-500 uppercase">Nhan vien</th>
                  <th className="p-4 text-xs text-slate-500 uppercase text-right">Gio</th>
                  <th className="p-4 text-xs text-slate-500 uppercase text-right">Du kien</th>
                  <th className="p-4 text-xs text-slate-500 uppercase text-right">Phu cap</th>
                  <th className="p-4 text-xs text-slate-500 uppercase text-right">Khau tru</th>
                  <th className="p-4 text-xs text-slate-500 uppercase text-right">Chinh thuc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {payroll.map(item => (
                  <tr
                    key={item.user._id}
                    onClick={() => setSelectedUserId(item.user._id)}
                    className={`cursor-pointer hover:bg-slate-800/40 ${selectedPayroll?.user._id === item.user._id ? 'bg-blue-500/10' : ''}`}
                  >
                    <td className="p-4">
                      <div className="font-semibold">{item.user.fullName}</div>
                      <div className="text-xs text-slate-500">{item.user.position || 'Nhan vien'}</div>
                    </td>
                    <td className="p-4 text-right font-mono">{item.totalHours}h</td>
                    <td className="p-4 text-right font-mono text-emerald-400">{formatMoney(item.estimatedSalary)}</td>
                    <td className="p-4 text-right font-mono text-blue-400">{formatMoney(item.totalAllowance)}</td>
                    <td className="p-4 text-right font-mono text-red-400">{formatMoney(item.totalDeduction)}</td>
                    <td className="p-4 text-right font-mono font-bold">{item.officialSalary ? formatMoney(item.officialSalary) : 'Chua chot'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {currentSummary && (
        <>
          {renderSummaryCards(currentSummary)}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6 min-w-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MiniStat label="Ca dang ky" value={currentSummary.totalRegisteredShifts} />
                <MiniStat label="Di muon" value={currentSummary.lateCount} />
                <MiniStat label="Ve som" value={currentSummary.earlyCount} />
                <MiniStat label="Vang" value={currentSummary.absentShifts} />
              </div>
              {renderDetailTable(currentSummary)}
            </div>

            <div className="space-y-4 min-w-0">
              {user?.role === 'admin' && (
                <form onSubmit={updateHourlyRate} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h3 className="font-bold flex items-center gap-2">
                    <DollarSign size={18} className="text-emerald-400" />
                    Luong/gio cua nhan vien
                  </h3>
                  <input
                    type="number"
                    min="0"
                    value={hourlyRateInput}
                    onChange={(e) => setHourlyRateInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                    placeholder="Vi du: 35000"
                  />
                  <button disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl py-2 font-semibold">
                    Cap nhat luong/gio
                  </button>
                </form>
              )}

              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
                <h3 className="font-bold flex items-center gap-2 mb-4">
                  <ReceiptText size={18} className="text-blue-400" />
                  Phu cap / khau tru
                </h3>

                <div className="space-y-3 mb-5">
                  {currentSummary.adjustments.length > 0 ? currentSummary.adjustments.map(adjustment => (
                    <div key={adjustment._id} className="flex items-start justify-between gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <div>
                        <div className={`font-semibold text-sm ${adjustment.type === 'allowance' || adjustment.type === 'bonus' ? 'text-blue-400' : 'text-red-400'}`}>
                          {adjustment.type === 'allowance' || adjustment.type === 'bonus' ? '+' : '-'}{formatMoney(adjustment.amount)}
                        </div>
                        <div className="text-xs text-slate-400">{adjustment.reason}</div>
                      </div>
                      {user?.role === 'admin' && (
                        <button onClick={() => deleteAdjustment(adjustment._id)} className="text-slate-500 hover:text-red-400">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  )) : (
                    <p className="text-sm text-slate-500">Chua co dieu chinh nao.</p>
                  )}
                </div>

                {user?.role === 'admin' && (
                  <form onSubmit={addAdjustment} className="space-y-3">
                    <select
                      value={adjustmentForm.type}
                      onChange={(e) => setAdjustmentForm(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                    >
                      <option value="allowance">Phu cap</option>
                      <option value="deduction">Khau tru</option>
                    </select>
                    <input
                      type="number"
                      value={adjustmentForm.amount}
                      onChange={(e) => setAdjustmentForm(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="So tien"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                    />
                    <input
                      value={adjustmentForm.reason}
                      onChange={(e) => setAdjustmentForm(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Ly do"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                    />
                    <button disabled={saving} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl py-2 font-semibold">
                      <Plus size={16} /> Them dieu chinh
                    </button>
                  </form>
                )}
              </div>

              {user?.role === 'admin' && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h3 className="font-bold flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-400" />
                    Chot luong
                  </h3>
                  <textarea
                    value={finalizeNote}
                    onChange={(e) => setFinalizeNote(e.target.value)}
                    placeholder="Ghi chu chot luong..."
                    className="w-full min-h-24 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  />
                  <button disabled={saving} onClick={finalizePayroll} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl py-2 font-semibold">
                    Chot luong chinh thuc
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const PayrollCard = ({ title, value, sub }: { title: string; value: string; sub: string }) => (
  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 min-w-0">
    <div className="text-xs uppercase tracking-widest text-slate-500 font-bold">{title}</div>
    <div className="mt-2 text-2xl font-black text-white break-words">{value}</div>
    <div className="mt-2 text-xs text-slate-500">{sub}</div>
  </div>
);

const MiniStat = ({ label, value }: { label: string; value: number }) => (
  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
    <div className="text-xs text-slate-500">{label}</div>
    <div className="text-xl font-bold">{value}</div>
  </div>
);

export default PayrollPanel;
