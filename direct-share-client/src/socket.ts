import { io, Socket } from 'socket.io-client';

const clientSocket: Socket = io('http://localhost:3000',  {
  withCredentials: true,
  secure: true,
  rejectUnauthorized: true,
  transports: ["websocket", "polling"] // Force fallback if needed
}); // your server URL

export default clientSocket;