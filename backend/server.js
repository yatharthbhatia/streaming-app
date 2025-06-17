import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Middleware
app.use(cors());
app.use(express.json());

// Rooms data
const rooms = {};

// New Room Creation
app.post('/room', (req, res) => {
  const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  rooms[roomCode] = { users: [], messages: [], videoState: {} };
  res.json({ roomCode });
});

// Socket.io
io.on('connection', (socket) => {
  socket.on('joinRoom', ({ roomCode }) => {
    socket.join(roomCode);
    socket.roomCode = roomCode;
  });

  socket.on('chatMessage', ({ roomCode, message }) => {
    io.to(roomCode).emit('chatMessage', { sender: socket.id, text: message });
  });

  socket.on('videoEvent', ({ roomCode, event }) => {
    io.to(roomCode).emit('videoEvent', event);
  });

  socket.on('disconnect', () => {
    // handle user leaving
  });
});

server.listen(3000, () => console.log('Backend running on port 3000')); 