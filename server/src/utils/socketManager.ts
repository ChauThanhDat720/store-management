import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
let io: Server;
export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  });
  io.on('connection', (socket: Socket) => {
    ///console.log(`[Socket] Client connected: ${socket.id} `)
    ///socket.on('disconnect', () => {
    ///console.log(`[Socket] Client disconnected: ${socket.id}`);
    //});
    const { userId, role } = socket.handshake.query;
    if (userId) {
      socket.join(`user_${userId}`)
    }
    if (role === 'admin') {
      socket.join('admin_room');
    }
  });
  return io;
}
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io không được khởi tạo!');
  }
  return io;
};
