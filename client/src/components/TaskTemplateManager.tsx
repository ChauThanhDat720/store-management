import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Trash2, Loader2, ClipboardList, CheckCircle2 } from 'lucide-react';
import type { ShiftTaskTemplate } from '../types';

const TaskTemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<ShiftTaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState({ shift: 'morning', taskName: '' });

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tasks/templates');
      setTemplates(res.data);
    } catch (error) {
      console.error('Lỗi lấy danh sách task mẫu:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.taskName.trim()) return;
    try {
      await api.post('/tasks/templates', newTask);
      setNewTask({ ...newTask, taskName: '' });
      fetchTemplates();
    } catch (error) {
      alert('Lỗi khi thêm task mẫu');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa task mẫu này?')) return;
    try {
      await api.delete(`/tasks/templates/${id}`);
      fetchTemplates();
    } catch (error) {
      alert('Lỗi khi xóa task mẫu');
    }
  };

  const SHIFTS = [
    { id: 'morning', label: 'Sáng', color: 'text-amber-400' },
    { id: 'afternoon', label: 'Chiều', color: 'text-orange-400' },
    { id: 'evening', label: 'Tối', color: 'text-indigo-400' }
  ];

  return (
    <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-in fade-in duration-500">
      <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
        <div className="flex items-center gap-3">
          <ClipboardList className="text-emerald-400" size={24} />
          <h2 className="text-xl font-bold">Quản lý Checklist mẫu</h2>
        </div>
      </div>

      <div className="p-6">
        <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4 mb-8 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
          <div className="flex-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Tên công việc</label>
            <input 
              type="text" 
              value={newTask.taskName}
              onChange={(e) => setNewTask({...newTask, taskName: e.target.value})}
              placeholder="VD: Lau dọn quầy, Kiểm tiền..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div className="w-full md:w-48">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Chọn Ca</label>
            <select 
              value={newTask.shift}
              onChange={(e) => setNewTask({...newTask, shift: e.target.value as any})}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
            >
              <option value="morning">Ca Sáng</option>
              <option value="afternoon">Ca Chiều</option>
              <option value="evening">Ca Tối</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="w-full md:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2">
              <Plus size={18} /> Thêm mẫu
            </button>
          </div>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SHIFTS.map(shift => (
            <div key={shift.id} className="bg-slate-950/30 rounded-2xl border border-slate-800/50 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className={`font-bold uppercase text-xs tracking-widest ${shift.color}`}>Ca {shift.label}</h3>
                <span className="text-[10px] font-mono text-slate-600">{templates.filter(t => t.shift === shift.id).length} việc</span>
              </div>
              
              <div className="space-y-2">
                {loading ? (
                  <div className="py-4 flex justify-center"><Loader2 className="animate-spin text-slate-700" size={20} /></div>
                ) : templates.filter(t => t.shift === shift.id).length > 0 ? (
                  templates.filter(t => t.shift === shift.id).map(template => (
                    <div key={template._id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800 group hover:border-slate-700 transition-all">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 size={14} className="text-slate-600" />
                        <span className="text-sm text-slate-300">{template.taskName}</span>
                      </div>
                      <button 
                        onClick={() => handleDelete(template._id)}
                        className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-slate-700 italic font-medium">Chưa có đầu việc mẫu</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TaskTemplateManager;
