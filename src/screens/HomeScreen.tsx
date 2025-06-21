import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, TextInput, Share } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Clipboard from 'expo-clipboard';
import { disconnectSocket } from '../utils/wsClient';

const API_URL = process.env.EXPO_PUBLIC_SOCKET_URL;
const TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/w500';

export default function HomeScreen({ navigation, route }) {
  const [movies, setMovies] = useState([]);
  const [trailerKey, setTrailerKey] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const username = route.params?.username;

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const res = await fetch(`${API_URL}/movies/popular`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        setMovies(data.results);
        if (data.results?.length > 0) {
          fetchTrailer(data.results[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch movies:', err);
        Alert.alert("Network Error", "Could not fetch movies. Please check your connection and ensure the backend is running.");
      }
    };
    fetchMovies();
  }, []);

  const fetchTrailer = async (movieId) => {
    try {
      const res = await fetch(`${API_URL}/movies/${movieId}/videos`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (data.trailer?.key) {
        setTrailerKey(data.trailer.key);
      } else {
        setTrailerKey(null);
      }
    } catch (err) {
      console.error('Failed to fetch trailer:', err);
    }
  };

  const showRoomCodePopup = (roomCode) => {
    const message = `Here is your room code: ${roomCode}\n\nShare it with your friends to let them join!`;
    Alert.alert(
      'Room Created!',
      message,
      [
        {
          text: 'Share',
          onPress: async () => {
            try {
              await Share.share({
                message: `Join my SocialRooms session! Room code: ${roomCode}`,
                title: 'Join my SocialRoom!',
              });
            } catch (error) {
              Alert.alert(error.message);
            }
          },
        },
        
        {
          text: 'Copy Code',
          onPress: async () => {
            await Clipboard.setStringAsync(roomCode);
            Alert.alert('Copied!', 'Room code copied to clipboard.');
          },
        },
        
        {
          text: 'Join Room',
          onPress: () => navigation.navigate('Room', { roomCode, username }),
          style: 'default',
        },
      ],
      { cancelable: true }
    );
  };

  const handleSignOut = async () => {
    disconnectSocket();
    await SecureStore.deleteItemAsync('authToken');
    navigation.replace('Login');
  };

  const createRoom = async () => {
    const token = await SecureStore.getItemAsync('authToken');
    try {
      const res = await fetch(`${API_URL}/room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.roomCode) {
        showRoomCodePopup(data.roomCode);
      } else {
        Alert.alert('Error', data.error || 'Could not create room.');
      }
    } catch (error) {
      console.error('Error creating room:', error);
      Alert.alert('Error', 'An error occurred while creating the room.');
    }
  };

  const joinRoom = () => {
    if (!roomCode.trim()) {
      Alert.alert('Error', 'Please enter a room code.');
      return;
    }
    navigation.navigate('Room', { roomCode, username });
  };
  
  const renderMovie = ({ item }) => (
    <TouchableOpacity
      style={styles.movieItem}
      onFocus={() => fetchTrailer(item.id)}
      onPress={() => { /* TODO: add movie details here */ }}
    >
      <Image
        source={{ uri: `${TMDB_IMAGE_URL}${item.poster_path}` }}
        style={styles.poster}
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.overlay}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome, {username}!</Text>
          <TouchableOpacity onPress={handleSignOut}><Text style={styles.signOutText}>Sign Out</Text></TouchableOpacity>
        </View>

        <View>
          <Text style={styles.carouselTitle}>Popular Movies</Text>
          <FlatList
            data={movies}
            renderItem={renderMovie}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        </View>

        <View style={{ marginTop: 12 }} />

        <View style={styles.roomContainer}>
          <TouchableOpacity onPress={createRoom} style={styles.button}>
            <Text style={styles.buttonText}>Create Room</Text>
          </TouchableOpacity>
          <View style={styles.joinContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter Room Code"
              placeholderTextColor="#999"
              value={roomCode}
              onChangeText={setRoomCode}
            />
            <TouchableOpacity onPress={joinRoom} style={styles.button}>
              <Text style={styles.buttonText}>Join Room</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 30,
  },
  welcomeText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  signOutText: { color: '#ccc', fontSize: 16 },
  carouselTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 30,
    marginBottom: 15,
  },
  movieItem: {
    marginLeft: 30,
    borderRadius: 10,
    overflow: 'hidden',
  },
  poster: {
    width: 150,
    height: 225,
    borderRadius: 8,
  },
  roomContainer: {
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  joinContainer: {
    flexDirection: 'row',
    marginTop: 15,
    alignItems: 'center',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    marginRight: 10,
    fontSize: 16,
    flex: 1,
  },
});
