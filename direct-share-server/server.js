const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');

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