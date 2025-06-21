import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import axios from 'axios';

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

// Auth Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    console.log(`[SOCKET AUTH] Connection rejected: No token provided`);
    return next(new Error('Authentication error: Token not provided.'));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log(`[SOCKET AUTH] Connection rejected: Invalid token`);
      return next(new Error('Authentication error: Invalid token.'));
    }
    socket.user = decoded;
    console.log(`[SOCKET AUTH] Connection accepted for user: ${decoded.username} (ID: ${decoded.userId})`);
    next();
  });
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    console.log(`[REGISTER] Registration failed: Username or password missing`);
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    
    const newUser = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, password_hash]
    );

    console.log(`[REGISTER] New user registered: ${username} (ID: ${newUser.rows[0].id})`);
    res.status(201).json(newUser.rows[0]);
  } catch (err) {
    console.error(`[REGISTER] Error:`, err);
    if (err.code === '23505') { // Unique constraint violation
      console.log(`[REGISTER] Registration failed: Username "${username}" already exists`);
      return res.status(409).json({ error: 'Username already exists.' });
    }
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    console.log(`[LOGIN] Login failed: Username or password missing`);
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user) {
      console.log(`[LOGIN] Login failed: User "${username}" not found`);
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      console.log(`[LOGIN] Login failed: Incorrect password for user "${username}"`);
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    console.log(`[LOGIN] User logged in: ${username} (ID: ${user.id})`);
    res.json({ token, userId: user.id, username: user.username });
  } catch (err) {
    console.error(`[LOGIN] Error:`, err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// TBDB API
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY;

app.get('/movies/popular', async (req, res) => {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/movie/popular`, {
      params: { api_key: TMDB_API_KEY }
    });
    console.log(`[MOVIES] Fetched popular movies`);
    res.json(response.data);
  } catch (error) {
    console.error('[MOVIES] Error fetching popular movies:', error);
    res.status(500).json({ error: 'Failed to fetch popular movies.' });
  }
});

app.get('/movies/:id/videos', async (req, res) => {
  const { id } = req.params;
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/movie/${id}/videos`, {
      params: { api_key: TMDB_API_KEY }
    });
    const trailer = response.data.results.find(
      (v) => v.site === 'YouTube' && v.type === 'Trailer'
    );
    console.log(`[MOVIES] Fetched videos for movie ID: ${id}`);
    res.json({ trailer });
  } catch (error) {
    console.error(`[MOVIES] Error fetching videos for movie ${id}:`, error);
    res.status(500).json({ error: 'Failed to fetch videos.' });
  }
});

// Rooms
// const rooms = {};

app.post('/room', async (req, res) => {
  // Room creation (authenticated users only)
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.log(`[ROOM] Room creation failed: No authorization token`);
    return res.status(401).json({ error: 'Authorization token required.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { userId, username } = decoded;

    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const title = `${username}'s Room`;

    await pool.query(
      'INSERT INTO rooms (room_code, title, host_id) VALUES ($1, $2, $3)',
      [roomCode, title, userId]
    );

    console.log(`[ROOM] Room created: ${roomCode} by user ${username} (ID: ${userId})`);
    res.json({ roomCode });
  } catch (err) {
    console.error('[ROOM] Error creating room:', err);
    if (err.name === 'JsonWebTokenError') {
      console.log(`[ROOM] Room creation failed: Invalid token`);
      return res.status(401).json({ error: 'Invalid token.' });
    }
    res.status(500).json({ error: 'Server error creating room.' });
  }
});

io.on('connection', (socket) => {
  console.log(`[SOCKET] New connection: ${socket.id} (user: ${socket.user?.username || 'unknown'})`);

  socket.on('joinRoom', async ({ roomCode }) => {
    try {
      socket.join(roomCode);
      socket.roomCode = roomCode;

      const { userId, username } = socket.user;

      // User joining -> to db
      await pool.query(
        'INSERT INTO room_users (room_code, user_id, username) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [roomCode, userId, username]
      );

      io.to(roomCode).emit('userJoined', { username });

      console.log(`[SOCKET] User "${username}" (ID: ${userId}) joined room ${roomCode}`);
    } catch (err) {
      console.error(`[SOCKET] Error in joinRoom for user ${socket.user?.username}:`, err);
    }
  });

  socket.on('chatMessage', async (payload) => {
    const { roomCode, message, sender } = payload;
    io.to(roomCode).emit('chatMessage', { sender, text: message });

    // Log chat -> to database
    try {
      await pool.query(
        'INSERT INTO chat_messages (room_code, user_id, message) VALUES ($1, $2, $3)',
        [roomCode, sender, message]
      );
      console.log(`[SOCKET] Chat message in room ${roomCode} from user ${sender}: "${message}"`);
    } catch (err) {
      console.error('[SOCKET] Error saving chat message to database:', err);
    }
  });

  socket.on('videoEvent', ({ roomCode, event }) => {
    io.to(roomCode).emit('videoEvent', event);
    console.log(`[SOCKET] Video event in room ${roomCode}:`, event);
  });

  socket.on('disconnect', () => {
    console.log(`[SOCKET] Disconnected: ${socket.id} (user: ${socket.user?.username || 'unknown'})`);
  });
});

server.listen(3000, () => console.log('Backend running on port 3000'));