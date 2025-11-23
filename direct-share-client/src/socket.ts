import { io, Socket } from 'socket.io-client';

const socketUrl = import.meta.env.SOCKET_URL || 'http://localhost:3000';

const clientSocket: Socket = io(socketUrl, {
  withCredentials: true,
  secure: socketUrl.startsWith('https'),
  rejectUnauthorized: import.meta.env.MODE === 'production',
  transports: ["websocket", "polling"]
});

export default clientSocket;