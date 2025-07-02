# 🎬 SocialRooms

**SocialRooms** is a cross-platform, full-stack application for synchronized movie watching and real-time chat. Designed for Android TV, iOS, and web, it lets users create private rooms, browse movies, and enjoy content together—no matter where they are.

---

## 🚀 Features

- **User Authentication:** Secure registration and login with JWT.
- **Movie Discovery:** Browse a rich catalog of movies, genres, and trailers.
- **Private Watch Rooms:** Create or join rooms with a unique code.
- **Real-Time Chat:** Chat with friends in each room, with modern bubble UI and system messages.
- **Synchronized Video Playback:** Watch together in perfect sync, with play, pause, and seek events.
- **Video Logging & Analytics:** All playback events are logged for analytics and session review.
- **Seek Sync via Chat:** When someone seeks, others get a prompt to sync instantly.
- **Android TV Optimized:** Full D-pad navigation, large UI, and TV-specific layouts.
- **WebView Video Player:** Supports YouTube, Netflix, Prime Video, and more.
- **Responsive UI:** Works beautifully on TV, mobile, and web.

---

## 🛠️ Tech Stack

- **Frontend:** React Native, Expo, React Navigation
- **Backend:** Node.js, Express, Socket.IO
- **Database:** PostgreSQL
- **Styling:** React Native Stylesheets (platform-specific)
- **Video:** WebView-based universal player with injected logger
- **Authentication:** JWT (JSON Web Tokens)

---

## 📁 Project Structure

```
/backend              # Node.js backend (Express + Socket.IO)
/src
  /components         # Reusable UI components (VideoPlayer, ChatPanel)
  /screens            # App screens (Auth, Login, Home, Room)
  /utils              # Utility modules (wsClient, videoLogger)
  /assets             # Static assets (images, movie_db.json)
App.tsx               # Main app entry and navigation setup
schema.sql            # PostgreSQL schema
```

---

## 🏁 Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- pnpm (or npm/yarn)
- PostgreSQL

---

### Prerequisites

- Node.js
- pnpm (or npm/yarn)
- PostgreSQL installed and running.

### 1. Clone the Repository

```sh
git clone https://github.com/yatharthbhatia/streaming-app.git
cd streaming-app
```

---

### 2. Backend Setup

```sh
cd backend
pnpm install
touch .env
```

**`.env` file:**
```env
PG_CONNECTION_STRING="postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME"
JWT_SECRET="YOUR_SUPER_SECRET_KEY"
```

**Database Setup:**
1. Connect to PostgreSQL and create a new database.
2. Run `schema.sql` from the project root to create tables.

**Start the backend:**
```sh
pnpm start
```

---

### 3. Frontend Setup

```sh
pnpm install
touch .env
```

**`.env` file:**
```env
EXPO_PUBLIC_SOCKET_URL="http://<YOUR_LOCAL_IP>:3000"
```
Replace `<YOUR_LOCAL_IP>` with your machine's IP (e.g., `192.168.1.13`).

**Start the app:**
```sh
pnpm start
```
- Use Expo Go, Android/iOS emulator, or run on Android TV.

---

## 🖥️ Main Screens & Components

- **AuthLoadingScreen:** Checks for valid JWT and routes to Login or Main.
- **LoginScreen:** Register or log in securely.
- **HomeScreen:** Browse movies, create/join rooms, and see carousels.
- **RoomScreen:** Watch videos, chat, and sync playback in real time.
- **VideoPlayer:** Universal WebView-based player with logging and navigation.
- **ChatPanel:** Modern chat with system messages, seek prompts, and TV support.

---

## 🔌 API & WebSocket Events

### REST API

- `POST /register` — Register a new user
- `POST /login` — Authenticate and receive JWT
- `POST /room` — Create a new room (auth required)
- `GET /room/:code` — Get room details
- `GET /movies` — List all movies
- `POST /api/logs` — Log video events

### WebSocket Events

- `joinRoom` — Join a room by code
- `chatMessage` — Send/receive chat messages
- `videoLog` — Sync video events (play, pause, seek)
- `userJoined` — System message when a user joins

---

## 🖼️ Assets

- **Movie Posters & Backdrops:** `/assets/movie_db.json`
- **App Icons:** `/assets/icon.png` and TV-specific images

---

## 🧩 Extending & Customizing

- **Add More Providers:** Update `videoLogger.ts` and `getServiceFromUrl` for new streaming services.
- **UI Customization:** Edit styles in `/src/components` and `/src/screens`.
- **Analytics:** Extend backend `/api/logs` for advanced analytics.

---

## 📝 License

MIT

---
