import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { NotificationRecord } from '../types';

const formatTime = (date: string) => {
  return new Date(date).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const NotificationCenter = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const socket = io('http://localhost:5000', {
      query: {
        userId: user.id,
        role: user.role,
      },
    });

    socket.on('notification', (notification: NotificationRecord) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.id, user?.role]);

  const markAsRead = async (id: string) => {
    await api.put(`/notifications/${id}/read`);
    setNotifications(prev => prev.map(item => (
      item._id === id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item
    )));
    setUnreadCount(prev => Math.max(prev - 1, 0));
  };

  const markAllAsRead = async () => {
    await api.put('/notifications/read-all');
    setNotifications(prev => prev.map(item => ({
      ...item,
      isRead: true,
      readAt: item.readAt || new Date().toISOString(),
    })));
    setUnreadCount(0);
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="text-blue-400" size={24} />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold">Thong bao</h2>
            <p className="text-sm text-slate-500">{unreadCount} thong bao chua doc</p>
          </div>
        </div>

        <button
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-slate-800 text-slate-200 rounded-xl text-sm font-semibold transition-colors"
        >
          <CheckCheck size={16} />
          Danh dau tat ca da doc
        </button>
      </div>

      <div className="divide-y divide-slate-800">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <Loader2 className="animate-spin mx-auto mb-3" size={28} />
            Dang tai thong bao...
          </div>
        ) : notifications.length > 0 ? (
          notifications.map(notification => (
            <button
              key={notification._id}
              onClick={() => !notification.isRead && markAsRead(notification._id)}
              className={`w-full text-left p-5 transition-colors ${
                notification.isRead ? 'bg-slate-900/20 hover:bg-slate-800/30' : 'bg-blue-500/5 hover:bg-blue-500/10'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${
                  notification.isRead ? 'bg-slate-700' : 'bg-blue-400'
                }`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className={`font-semibold ${notification.isRead ? 'text-slate-300' : 'text-white'}`}>
                      {notification.title}
                    </h3>
                    <span className="text-xs text-slate-500 shrink-0">{formatTime(notification.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400 leading-relaxed">{notification.message}</p>
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="p-16 text-center text-slate-600">
            <Bell size={36} className="mx-auto mb-3 opacity-60" />
            Chua co thong bao nao.
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
