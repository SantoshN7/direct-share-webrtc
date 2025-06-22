import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import http from 'http';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';

import Lobby from './lobby';

const port = process.env.PORT || 3000;

// express server setup
const app = express();
app.use(cors());
app.use(bodyParser.json());

// socket.io setup
const server = http.createServer(app);
const io = new Server(server);
// map to store lobbies
const lobbies = new Map<string, Lobby>();
// map to store sockets & userId
const socketToUserId = new Map<string, string>();


// server started
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

io.on('connection', socket => {
  console.log('User connected', socket.id);
  // Handle lobby joining
  socket.on('joinLobby', (lobbyId: string, userId: string) => {
    if (!lobbyId || !userId) {
      console.error('Invalid lobbyId or userId');
      return;
    }
    const lobby = lobbies.get(lobbyId);
    if (!lobby) { 
      console.error(`Lobby with ID ${lobbyId} not found`);
      return;
    }
    if (lobby.isLobbyFull() && !lobby.isValidLobbyMember(userId)) {
      console.error(`User ${userId} is not a valid member of lobby ${lobbyId}`);
      return;
    } else {
      // If the user is not a member, add them with a default name
      lobby.addMember({ memberId: userId, memberName: 'No-name' });
    }
    socket.join(lobbyId);
    socketToUserId.set(socket.id, userId);
    socket.to(lobbyId).emit('lobbyStatusChanged', {lobby: lobbies.get(lobbyId) });
  });
  // Handle offer creation
  socket.on('createOffer', (lobbyId: string, offer: any, userId: string) => {
    if (!lobbyId || !offer || !userId) {
      console.error('lobbyId, offer, or userId is missing');
      return;
    }
    socket.to(lobbyId).emit('offerCreated', { offer });
  });
  // Handle answer creation
  socket.on('createAnswer', (lobbyId: string, answer: any, userId: string) => {
    if (!lobbyId || !answer || !userId) {
      console.error('lobbyId, answer, or userId is missing');
      return;
    }
    socket.to(lobbyId).emit('answerCreated', { answer });
  });
  // Handle ICE candidate exchange
  socket.on('iceCandidate', (lobbyId: string, candidate: any, userId: string) => {
    if (!lobbyId || !candidate || !userId) { 
      console.error('lobbyId, candidate, or userId is missing');
      return;
    }
    socket.to(lobbyId).emit('iceCandidate', { candidate });
  });
  // Handle lobby disconnection
  socket.on('disconnect', () => { 
    console.log('User disconnected', socket.id);
    const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
    rooms.forEach(roomId => {
      const roomSize = io.sockets.adapter.rooms.get(roomId)?.size || 0;
      const lobby = lobbies.get(roomId);
      if (!lobby) {
        console.error(`Lobby with ID ${roomId} not found`);
        return;
      }
      // remove the user from the lobby
      lobby.removeMember(socketToUserId.get(socket.id) || '');
      // send updated lobby status to other member, if any
      socket.to(roomId).emit('lobbyStatusChanged', { lobby });
      // handle lobby deletion if empty
      if (roomSize === 0 && lobbies.has(roomId) && lobby.isLobbyEmpty()) {
        console.log(`Room ${roomId} is empty, deleting lobby`);
        lobbies.delete(roomId);
      }
    });
    // remove the socket from the userId map
    socketToUserId.delete(socket.id);
  });
});



// API endpoint to receive data// POST route
app.post('/api/createLobby', (req, res) => {
  try {
    const data = req.body;
    if(!data || !data.userName || !data.userId) {
      res.status(400).send({ error: 'Invalid data.' });
      return;
    }
    const lobbyId = nanoid(10);
    const lobby = new Lobby(lobbyId, data.userId, data.lobbyName || 'Default Lobby');
    lobby.addMember({ memberId: data.userId, memberName: data.userName });
    lobbies.set(lobbyId, lobby);
    res.status(200).send({ lobbyId: lobbyId});
    return;
  } catch (error: unknown) {
    res.status(500).send({ error: (error as {message: string})?.message || 'Failed to create lobby.' });
    return; 
  }
});

app.post('/api/joinLobby', (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.lobbyId || !data.userName || !data.userId) {
      res.status(400).send({ error: 'Lobby ID is required.' });
      return;
    }
    const lobbyId = data.lobbyId as string;
    const lobby = lobbies.get(lobbyId);
    if (!lobby) {  
      res.status(404).send({ error: 'Lobby not found.' });
      return;
    }
    if (lobby.isLobbyFull()) {
      res.status(403).send({ error: 'Lobby is full.' });
      return;
    }
    lobby.addMember({ memberId: data.userId, memberName: data.userName });
    res.status(200).send({ valid: true });
    return;
  } catch (error: unknown) {
    res.status(500).send({ error: (error as {message: string})?.message || 'Failed to join lobby.' });
    return; 
  }
});