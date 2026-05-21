// src/utils/aiMemory.ts

type ChatMessage = {
    role: 'user' | 'assistant';
    content: string;
    createdAt: Date;
};

const memoryStore = new Map<string, ChatMessage[]>();

const MAX_MESSAGES = 10;

export const getChatHistory = (userId: string) => {
    return memoryStore.get(userId) || [];
};

export const saveChatMessage = (
    userId: string,
    role: 'user' | 'assistant',
    content: string
) => {
    const current = memoryStore.get(userId) || [];

    current.push({
        role,
        content,
        createdAt: new Date()
    });

    const latest = current.slice(-MAX_MESSAGES);

    memoryStore.set(userId, latest);
};

export const formatChatHistory = (userId: string) => {
    const history = getChatHistory(userId);

    if (history.length === 0) {
        return 'Chưa có lịch sử hội thoại.';
    }

    return history
        .map((msg) => {
            const role = msg.role === 'user' ? 'Admin' : 'AI';
            return `${role}: ${msg.content}`;
        })
        .join('\n');
};