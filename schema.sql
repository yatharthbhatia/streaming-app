SET search_path TO public;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    room_code VARCHAR(64) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    room_code VARCHAR(10) UNIQUE NOT NULL,
    title VARCHAR(255),
    watch_url TEXT,
    host_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE room_users (
    id SERIAL PRIMARY KEY,
    room_code VARCHAR(10) NOT NULL,
    user_id INTEGER NOT NULL,
    username VARCHAR(255) NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_code, user_id)
);