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


// server started
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

io.on('connection', socket => {
  console.log('User connected');
  socket.on('disconnect', () => console.log('User disconnected'));
});

const lobbies = new Map<string, Lobby>();

// API endpoint to receive data// POST route
app.post('/api/createLobby', (req, res) => {
  try {
    const data = req.body;
    if(!data || !data.userName) {
      res.status(400).send({ error: 'Invalid data' });
      return;
    }
    const lobbyId = nanoid(10);
    const lobby = new Lobby(lobbyId, data.lobbyName || 'Default Lobby');
    lobbies.set(lobbyId, lobby);
    res.status(200).send({ lobbyId: lobbyId});
    return;
  } catch (error) {
    res.status(500).send({ error: 'Failed to create lobby' });
    return; 
  }
});

app.post('/api/validLobby', (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.lobbyId) {
      res.status(400).send({ error: 'Lobby ID is required' });
      return;
    }
    const lobbyId = data.lobbyId as string;
    if (!lobbies.has(lobbyId)) {  
      res.status(404).send({ error: 'Lobby not found' });
      return;
    }
    res.status(200).send({ valid: true });
    return;
  } catch (error) {
    res.status(500).send({ error: 'Failed to validate lobby' });
    return; 
  }
});