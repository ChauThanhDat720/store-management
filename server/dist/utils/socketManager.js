"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
let io;
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
        },
    });
    io.on('connection', (socket) => {
        ///console.log(`[Socket] Client connected: ${socket.id} `)
        ///socket.on('disconnect', () => {
        ///console.log(`[Socket] Client disconnected: ${socket.id}`);
        //});
        const { userId, role } = socket.handshake.query;
        if (userId) {
            socket.join(`user_${userId}`);
        }
        if (role === 'admin') {
            socket.join('admin_room');
        }
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io không được khởi tạo!');
    }
    return io;
};
exports.getIO = getIO;
