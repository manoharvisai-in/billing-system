import { io } from 'socket.io-client';

let socket = null;

export const connectSocket = (userRole) => {
  if (socket?.connected) return socket;

  socket = io(window.location.origin, {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket.id);
    // Join role-based room for targeted updates
    if (userRole) {
      socket.emit('join_room', userRole);
      socket.emit('join_room', 'all');
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
