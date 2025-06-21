import { io, type Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL;

let socket: Socket | null = null;

// getSocket -> gets auth token
export const getSocket = async (): Promise<Socket> => {
  if (socket) {
    return socket;
  }

  const token = await SecureStore.getItemAsync('authToken');

  if (!token) {
    throw new Error('Authentication token not found.');
  }

  // auth token
  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
  });

  // Handle connection errors
  socket.on('connect_error', async (err) => {
    if (err.message.includes('Invalid token')) {
      console.error('Authentication error:', err.message);

      await SecureStore.deleteItemAsync('authToken');
      disconnectSocket();
      // TODO: Handle navigation to Login here
    }
  });

  return socket;
};

// disconnect & clean up socket
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
