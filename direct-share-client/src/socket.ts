import { io, Socket } from 'socket.io-client';
import { serverUrl } from './config';

const socketUrl = serverUrl;

const clientSocket: Socket = io(socketUrl, {
  withCredentials: true,
  secure: socketUrl.startsWith('https'),
  rejectUnauthorized: import.meta.env.MODE === 'production',
  transports: ["websocket", "polling"]
});

export default clientSocket;