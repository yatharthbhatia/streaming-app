# SocialRooms

SocialRooms is a cross-platform application designed for Android TV, iOS, and web, allowing users to create shared media-watching experiences. Users can browse movies, create private rooms, and watch content together in sync, with a real-time chat feature to communicate with others in the room.

---

## Key Features

- **User Authentication:** Secure user registration and login system with JWT-based authentication.
- **Movie Discovery:** Browse an extensive list of movies, view details, and watch trailers.
- **Genre-Based Carousels:** Movies are dynamically organized by genre for easy discovery.
- **Private Watch Rooms:** Create private rooms with a unique, shareable code to watch content with friends.
- **Real-Time Chat:** A fully-featured chat panel in each room for real-time communication.
- **Synced Video Playback:** The video player is synchronized between all users in a room.
- **Optimized for Android TV:** The UI is designed to be fully navigable with a D-pad, providing a seamless TV experience.

---

## Tech Stack

- **Frontend:** React Native, Expo
- **Backend:** Node.js, Express, Socket.IO
- **Database:** PostgreSQL
- **Styling:** React Native Stylesheets with platform-specific adjustments.
- **Navigation:** React Navigation

---

## Project Structure

```
/backend              # Node.js backend (Express + Socket.IO)
/src
  /components         # Reusable UI components (VideoPlayer, ChatPanel)
  /screens            # App screens (Login, Home, Room)
  /utils              # Utility modules (wsClient)
/assets               # Static assets like images and fonts
schema.sql            # SQL schema for the PostgreSQL database
App.tsx               # Main app entry (navigation setup)
```

---

## Getting Started

### Prerequisites

- Node.js
- pnpm (or npm/yarn)
- PostgreSQL installed and running.

### 1. Clone the Repository

```sh
git clone https://github.com/yatharthbhatia/streaming-app.git
cd streaming-app
```

### 2. Backend Setup

```sh
# Navigate to the backend directory
cd backend

# Install dependencies
pnpm install

# Create a .env file and add the following variables
touch .env
```

**`.env` file contents:**

```env
# Connection string for your PostgreSQL database
PG_CONNECTION_STRING="postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME"

# Secret key for signing JWT tokens
JWT_SECRET="YOUR_SUPER_SECRET_KEY"
```

**Set up the database:**

1.  Connect to your PostgreSQL instance.
2.  Create a new database.
3.  Run the `schema.sql` file located in the root of the project to create the necessary tables.

**Start the backend server:**

```sh
cd backend
pnpm start
```

### 3. Frontend Setup

```sh
# From the root directory, install dependencies
pnpm install

# Create a .env file in the root directory
touch .env
```

**`.env` file contents:**

```env
# The URL of your running backend server
EXPO_PUBLIC_SOCKET_URL="http://<YOUR_LOCAL_IP>:3000"
```

Replace `<YOUR_LOCAL_IP>` with your computer's local IP address (e.g., `192.168.1.13`).

**Start the frontend app:**

```sh
# Run on Android, iOS, or web
pnpm start expo
```

---

## API Endpoints & WebSocket Events

### Backend API

-   `POST /register`: Create a new user account.
-   `POST /login`: Log in a user and receive a JWT token.
-   `POST /room`: Create a new room (requires authentication).
-   `GET /room/:code`: Get details for an existing room.
-   `GET /movies`: Get a list of all movies.

### WebSocket Events

-   `joinRoom`: Join a room with a specific `roomCode`.
-   `chatMessage`: Send or receive a chat message.
-   `videoEvent`: Send or receive video playback events for synchronization.
-   `userJoined`: Broadcasts when a new user joins a room.

---
