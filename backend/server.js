import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';

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
app.use(bodyParser.json());

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// local JSON
let movies = [];
(async () => {
  try {
    const MOVIE_DB_PATH = path.join(__dirname, '../assets/movie_db.json');
    const data = await fs.readFile(MOVIE_DB_PATH, 'utf-8');
    movies = JSON.parse(data);
    console.log(`[MOVIE_DB] Loaded ${movies.length} movies from movie_db.json`);
  } catch (err) {
    console.error('[MOVIE_DB] Failed to load movie_db.json:', err);
  }
})();

// Get all movies
app.get('/movies', (req, res) => {
  res.json({ results: movies });
});

// movie -> tmdb_id
app.get('/movie/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const movie = movies.find(m => m.tmdb_id === id);
  if (movie) return res.json(movie);
  res.status(404).json({ error: 'Movie not found' });
});

// Get movies by genre
app.get('/discover/genre/:genre', (req, res) => {
  const genre = req.params.genre;
  const filtered = movies.filter(m => m.genres && m.genres.includes(genre));
  res.json({ results: filtered });
});

// movies -> title, description, or genre
app.get('/search', (req, res) => {
  const query = (req.query.query || '').toLowerCase();
  if (!query) return res.json({ results: movies });
  const filtered = movies.filter(m =>
    m.title.toLowerCase().includes(query) ||
    m.description.toLowerCase().includes(query) ||
    (m.genres && m.genres.some(g => g.toLowerCase().includes(query)))
  );
  res.json({ results: filtered });
});

// movies -> streaming provider
app.get('/discover/provider/:provider', (req, res) => {
  const provider = req.params.provider.toLowerCase();
  const filtered = movies.filter(m =>
    m.available_on && m.available_on.some(p => p.toLowerCase().includes(provider))
  );
  res.json({ results: filtered });
});

// app init
app.get('/app/init', (req, res) => {
  const initParam = process.env.APP_INIT_PARAM;
  if (!initParam) {
    console.error('[CONFIG] APP_INIT_PARAM not set in .env file.');
    return res.status(500).json({ error: 'Server configuration error.' });
  }
  res.json({ init_key: initParam });
});

// client -> server: video log
app.post('/api/logs', async (req, res) => {
  try {
    const { event, time, service, url, roomCode, username, timestamp, seekData } = req.body;
    
    console.log(`[VIDEO_LOG] ${event} at ${time} | Service: ${service} | Room: ${roomCode} | User: ${username}`);
    
    await pool.query(
      'INSERT INTO video_logs (room_code, username, event_type, time_position, service, url, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [roomCode, username, event, time, service, url, timestamp || new Date().toISOString()]
    );
    
    // videoLog event -> room (emit)
    io.to(roomCode).emit('videoLog', {
      event,
      time,
      service,
      url,
      roomCode,
      username,
      timestamp,
      seekData
    });
    
    res.json({ success: true, message: 'Video log recorded successfully' });
  } catch (err) {
    console.error('[VIDEO_LOG] Error saving video log:', err);
    res.status(500).json({ error: 'Failed to save video log' });
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

    // requestbody -> title & watchUrl
    const { title, watchUrl } = req.body;
    if (!title || !watchUrl) {
      return res.status(400).json({ error: 'Title and watchUrl are required.' });
    }

    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    await pool.query(
      'INSERT INTO rooms (room_code, title, host_id, watch_url) VALUES ($1, $2, $3, $4)',
      [roomCode, title, userId, watchUrl]
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

// room details -> title & watchUrl (no auth needed)
app.get('/room/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const result = await pool.query('SELECT title, watch_url FROM rooms WHERE room_code = $1', [code]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    const room = result.rows[0];
    res.json({
      title: room.title,
      watchUrl: room.watch_url,
    });
  } catch (err) {
    console.error(`[ROOM] Error fetching room details:`, err);
    res.status(500).json({ error: 'Server error fetching room details.' });
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