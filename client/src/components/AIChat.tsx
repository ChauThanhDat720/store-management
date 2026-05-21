import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { Bot, Send, X, Loader2 } from 'lucide-react';

type ChatMessage = {
  role: 'user' | 'ai';
  text: string;
  actionId?: string;
};

const isActionCommand = (text: string) => {
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return [
    'tao',
    'them',
    'xep',
    'phan',
    'duyet',
    'tu choi',
    'huy',
    'nhac',
    'giao',
    'lap lich',
    'len lich',
    'create',
    'approve',
    'reject',
    'remind',
    'assign',
  ].some((keyword) => normalized.includes(keyword));
};

const AIChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      if (isActionCommand(userMsg)) {
        const res = await api.post('/ai/actions/plan', { message: userMsg });

        if (res.data.status === 'needs_clarification') {
          setMessages(prev => [...prev, { role: 'ai', text: res.data.reply || 'Can them thong tin de thuc hien lenh nay.' }]);
          return;
        }

        setMessages(prev => [
          ...prev,
          {
            role: 'ai',
            text: `Ke hoach: ${res.data.summary || 'AI da tao ke hoach hanh dong.'}\n\nBan co muon xac nhan thuc hien khong?`,
            actionId: res.data.actionId,
          },
        ]);
        return;
      }

      const res = await api.post('/ai/chat', { message: userMsg });
      setMessages(prev => [...prev, { role: 'ai', text: res.data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Xin lỗi, tôi gặp lỗi kết nối. Hãy thử lại sau!' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (actionId: string) => {
    setConfirmingId(actionId);

    try {
      const res = await api.post(`/ai/actions/${actionId}/confirm`);
      setMessages(prev => prev.map(msg => (
        msg.actionId === actionId
          ? { ...msg, text: `${msg.text}\n\nDa thuc hien: ${res.data.message || 'Thanh cong.'}`, actionId: undefined }
          : msg
      )));
    } catch {
      setMessages(prev => prev.map(msg => (
        msg.actionId === actionId
          ? { ...msg, text: `${msg.text}\n\nKhong the thuc hien lenh nay.`, actionId: undefined }
          : msg
      )));
    } finally {
      setConfirmingId(null);
    }
  };

  const handleRejectAction = async (actionId: string) => {
    setConfirmingId(actionId);

    try {
      await api.post(`/ai/actions/${actionId}/reject`);
    } finally {
      setMessages(prev => prev.map(msg => (
        msg.actionId === actionId
          ? { ...msg, text: `${msg.text}\n\nDa huy lenh.`, actionId: undefined }
          : msg
      )));
      setConfirmingId(null);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Nút bấm mở Chat */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-full shadow-2xl shadow-blue-500/40 flex items-center justify-center hover:scale-110 transition-all duration-300 animate-bounce"
        >
          <Bot size={28} />
        </button>
      )}

      {/* Khung Chat */}
      {isOpen && (
        <div className="w-[380px] h-[500px] bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Bot size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Trợ lý AI Gemini</h3>
                <p className="text-[10px] text-blue-400">Đang trực tuyến</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Messages List */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
            {messages.length === 0 && (
              <div className="text-center mt-10">
                <Bot size={40} className="mx-auto text-slate-700 mb-3" />
                <p className="text-sm text-slate-500">Chào Admin! Tôi có thể giúp gì cho bạn hôm nay?</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-600/20'
                    : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                  }`}>
                  <div className="whitespace-pre-line">{msg.text}</div>
                  {msg.actionId && (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={confirmingId === msg.actionId}
                        onClick={() => handleConfirmAction(msg.actionId!)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold"
                      >
                        Xac nhan
                      </button>
                      <button
                        type="button"
                        disabled={confirmingId === msg.actionId}
                        onClick={() => handleRejectAction(msg.actionId!)}
                        className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs font-semibold"
                      >
                        Huy
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 p-3 rounded-2xl border border-slate-700 flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-blue-400" />
                  <span className="text-xs text-slate-400">Đang suy nghĩ...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-4 border-t border-slate-700 bg-slate-900/50">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hỏi về nhân sự, ca làm..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 pr-12 text-sm text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-600"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="absolute right-2 top-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-all"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AIChat;
