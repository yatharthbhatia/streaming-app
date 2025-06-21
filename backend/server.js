import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';


dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Postgres connection
const pool = new Pool({
  connectionString: process.env.PG_CONNECTION_STRING,
});

// Middleware
app.use(cors());
app.use(express.json());

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    
    const newUser = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, password_hash]
    );

    res.status(201).json(newUser.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'Username already exists.' });
    }
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token, userId: user.id, username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

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

  socket.on('chatMessage', async (payload) => {
    const { roomCode, message, sender } = payload;
    io.to(roomCode).emit('chatMessage', { sender, text: message });

    // Log chat message to the database
    try {
      await pool.query(
        'INSERT INTO chat_messages (room_code, user_id, message) VALUES ($1, $2, $3)',
        [roomCode, sender, message]
      );
    } catch (err) {
      console.error('Error saving chat message to database:', err);
    }
  });

  socket.on('videoEvent', ({ roomCode, event }) => {
    io.to(roomCode).emit('videoEvent', event);
  });

  socket.on('disconnect', () => {
    // handle user leaving
  });
});

server.listen(3000, () => console.log('Backend running on port 3000')); 