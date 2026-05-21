import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { CheckSquare, Square, Loader2, ListChecks } from 'lucide-react';
import type { ShiftTask } from '../types';
import { io } from 'socket.io-client';

interface Props {
  date: string;
  shift: string;
}

const ShiftChecklist: React.FC<Props> = ({ date, shift }) => {
  const [tasks, setTasks] = useState<ShiftTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/tasks?date=${date}&shift=${shift}`);
      setTasks(res.data);
    } catch (error) {
      console.error('Lỗi lấy checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    
    const socket = io('http://localhost:5000');
    socket.on('taskUpdated', (updatedTask: ShiftTask) => {
      if (updatedTask.date === date && updatedTask.shift === shift) {
        setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [date, shift]);

  const toggleTask = async (id: string, currentStatus: boolean) => {
    try {
      await api.put(`/tasks/${id}`, { isCompleted: !currentStatus });
      // UI sẽ được cập nhật qua socket hoặc fetch lại nếu cần
    } catch (error) {
      alert('Không thể cập nhật trạng thái công việc');
    }
  };

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin text-blue-500" size={20} /></div>;

  return (
    <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <ListChecks size={14} className="text-emerald-400" /> Checklist công việc ca làm
        </label>
        <span className="text-[10px] font-mono text-slate-500">
          {tasks.filter(t => t.isCompleted).length}/{tasks.length}
        </span>
      </div>

      {tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map(task => (
            <div 
              key={task._id} 
              onClick={() => toggleTask(task._id, task.isCompleted)}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                task.isCompleted 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                {task.isCompleted ? <CheckSquare size={18} className="text-emerald-400" /> : <Square size={18} />}
                <span className={`text-sm ${task.isCompleted ? 'line-through opacity-50' : ''}`}>{task.taskName}</span>
              </div>
              {task.isCompleted && task.completedBy && (
                <span className="text-[9px] text-emerald-500/70 italic">Xong bởi: {task.completedBy.fullName}</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-xs text-slate-600 italic">Chưa có đầu việc nào được phân công cho ca này.</div>
      )}
    </div>
  );
};

export default ShiftChecklist;
