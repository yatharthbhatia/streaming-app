# SocialRooms TV App

A cross-platform (Android TV, iOS, and web) real-time chat and video sync application. Users can create or join rooms with a unique code, chat in real time, and synchronize video playback across devices. The backend is powered by Node.js and Socket.IO.

---

## Features

- **Room System:** Create or join rooms with a unique code.
- **Real-Time Chat:** Chat with other users in the same room.
- **Video Sync:** Play, pause, and seek video in sync across all users in a room.
- **Cross-Platform:** Works on Android TV, iOS, and web (via Expo).
- **WebSocket Backend:** Fast, real-time communication using Socket.IO.

---

## Project Structure

```
/backend              # Node.js backend (Express + Socket.IO)
/src
  /components         # Reusable UI components (VideoPlayer, ChatPanel)
  /screens            # App screens (HomeScreen, RoomScreen)
  /utils              # Utility modules (wsClient)
App.tsx               # Main app entry (navigation)
babel.config.js       # Babel config (with env and NativeWind support)
package.json          # Project dependencies and scripts
.env                  # Environment variables (SOCKET_URL)
```

---

## Getting Started

### 1. Clone the Repository

```sh
git clone https://github.com/yatharthbhatia/streaming-app
cd SocialRooms
```

### 2. Install Dependencies

#### TV App (Root Directory)

```sh
pnpm install
```

#### Backend

```sh
cd backend
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```
API_URL=http://<YOUR_LOCAL_IP>:3000
```
Replace `<YOUR_LOCAL_IP>` with your computer's local IP address (e.g., `192.168.1.13`).

### 4. Start the Backend

```sh
cd backend
pnpm start
```
The backend will run on `http://<YOUR_LOCAL_IP>:3000`.

### 5. Start the TV App

In a new terminal, from the project root:

```sh
pnpm start expo -a
```
Use Expo to run the app on Android TV, iOS, or web.

---

## Usage

1. **Create a Room:** On one device, click "Create Room" to generate a unique code.
2. **Join a Room:** On another device, enter the code and click "Join Room".
3. **Chat:** Send messages in real time.
4. **Video Sync:** Load a sample video and use play/pause/seek controls to synchronize playback across all users in the room.

---

## Backend Overview

- **POST /room:** Create a new room, returns a unique code.
- **WebSocket Events:**
  - `joinRoom`: Join a room by code.
  - `chatMessage`: Send/receive chat messages.
  - `videoEvent`: Sync video playback (play, pause, seek).

---

## Scripts

- `pnpm start expo -a` - Start the Expo app
- `pnpm run android` - Run on Android TV
- `pnpm run ios` - Run on iOS
- `pnpm run web` - Run on web
- `cd backend && pnpm start` - Start the backend server
