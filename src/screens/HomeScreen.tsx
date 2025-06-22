import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, ScrollView, ActivityIndicator, ImageBackground, TextInput, Modal, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import * as SecureStore from 'expo-secure-store';
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';
import { disconnectSocket } from '../utils/wsClient';
// @ts-ignore
import { LinearGradient } from 'expo-linear-gradient';

const API_URL = process.env.EXPO_PUBLIC_SOCKET_URL;

const MovieCard = ({ movie, onPress }) => (
  <TouchableOpacity style={styles.movieItem} onPress={() => onPress(movie)}>
    <Image source={{ uri: movie.poster_image }} style={styles.poster} />
  </TouchableOpacity>
);

function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
  if (match) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }
  return null;
}

export default function HomeScreen({ navigation, route }) {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const username = route.params?.username;

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/movies`);
      const data = await res.json();
      setMovies(data.results || []);
    } catch (err) {
      Alert.alert('Network Error', 'Could not fetch movies.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMovie = (movie) => {
    setSelectedMovie(movie);
    setModalVisible(true);
  };

  const handlePlayInRoom = async (movie) => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const roomRes = await fetch(`${API_URL}/room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const roomData = await roomRes.json();
      if (roomData.roomCode) {
        setModalVisible(false);
        navigation.navigate('Room', {
          roomCode: roomData.roomCode,
          username,
          watchLink: movie.homepage,
          title: movie.title,
        });
      } else {
        Alert.alert('Error', roomData.error || 'Could not create room.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while creating the room.');
    }
  };

  const handleHomepage = (url) => {
    Linking.openURL(url);
  };

  const handleJoinExistingRoom = () => {
    if (!joinRoomCode.trim()) {
      Alert.alert('Error', 'Please enter a room code.');
      return;
    }
    navigation.navigate('Room', { roomCode: joinRoomCode, username });
  };

  const handleSignOut = async () => {
    await SecureStore.deleteItemAsync('authToken');
    navigation.replace('Login');
  };

  // movies -> tmdb_id (unique)
  const uniqueMovies = [];
  const seenIds = new Set();
  for (const m of movies) {
    if (!seenIds.has(m.tmdb_id)) {
      seenIds.add(m.tmdb_id);
      uniqueMovies.push(m);
    }
  }

  // genres (unique)
  const genres = Array.from(new Set(uniqueMovies.flatMap(m => m.genres || [])));

  // For each genre, get movies in that genre
  const moviesByGenre = genres.map(genre => ({
    genre,
    movies: uniqueMovies.filter(m => m.genres && m.genres.includes(genre)),
  }));

  const heroMovie = movies[0];

  return (
    <View style={styles.container}>
      {heroMovie && (
        <ImageBackground source={{ uri: heroMovie.backdrop_image }} style={styles.heroContainer}>
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)', 'black']} style={styles.heroOverlay}>
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle} numberOfLines={1}>{heroMovie.title}</Text>
              <Text style={styles.heroDescription} numberOfLines={3}>{heroMovie.description}</Text>
              <View style={styles.heroButtonContainer}>
                <TouchableOpacity style={[styles.heroButton, styles.playButton]} onPress={() => handleSelectMovie(heroMovie)}>
                  <Text style={[styles.buttonText, { color: 'black' }]}>More Info</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.heroButton, styles.playButton]} onPress={() => handlePlayInRoom(heroMovie)}>
                  <Text style={[styles.buttonText, { color: 'black' }]}>▶ Play in Room</Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
      )}
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {loading ? (
          <View style={styles.heroContainer}><ActivityIndicator /></View>
        ) : (
          <>
            {moviesByGenre.map(({ genre, movies }) => (
              movies.length > 0 && (
                <View key={genre} style={styles.genreSection}>
                  <Text style={styles.carouselTitle}>{genre}</Text>
                  <FlatList
                    data={movies}
                    renderItem={({ item }) => <MovieCard movie={item} onPress={handleSelectMovie} />}
                    keyExtractor={(item) => `${genre}-${item.tmdb_id}`}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  />
                </View>
              )
            ))}
          </>
        )}
      </ScrollView>
      <View style={styles.joinContainer}>
        <TextInput style={styles.input} placeholder="Enter Room Code" value={joinRoomCode} onChangeText={setJoinRoomCode} placeholderTextColor="#999" />
        <TouchableOpacity style={styles.joinButton} onPress={handleJoinExistingRoom}><Text style={{ color: 'white', fontWeight: 'bold' }}>Join</Text></TouchableOpacity>
      </View>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {username}!</Text>
        <TouchableOpacity onPress={handleSignOut}><Text style={styles.signOutText}>Sign Out</Text></TouchableOpacity>
      </View>
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedMovie && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Image source={{ uri: selectedMovie.backdrop_image }} style={styles.modalBanner} />
                <Text style={styles.modalTitle}>{selectedMovie.title}</Text>
                <Text style={styles.modalGenres}>{selectedMovie.genres?.join(', ')}</Text>
                <Text style={styles.modalRating}>⭐ {selectedMovie.rating} ({selectedMovie.vote_count} votes)</Text>
                <Text style={styles.modalRelease}>Release: {selectedMovie.release_date}</Text>
                <Text style={styles.modalDescription}>{selectedMovie.description}</Text>
                <Image source={{ uri: selectedMovie.poster_image }} style={styles.modalPoster} />
                {selectedMovie.trailer && selectedMovie.trailer !== 'N/A' && getYouTubeEmbedUrl(selectedMovie.trailer) && (
                  <View style={styles.trailerContainer}>
                    <Text style={styles.trailerLabel}>Trailer:</Text>
                    <View style={styles.trailerWebViewWrapper}>
                      <WebView
                        source={{ uri: getYouTubeEmbedUrl(selectedMovie.trailer) }}
                        style={styles.trailerWebView}
                        javaScriptEnabled
                        domStorageEnabled
                        allowsFullscreenVideo
                        scrollEnabled={false}
                      />
                    </View>
                  </View>
                )}
                <View style={styles.modalButtonRow}>
                  <TouchableOpacity style={styles.modalButton} onPress={() => handleHomepage(selectedMovie.homepage)}>
                    <Text style={styles.modalButtonText}>Homepage</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalButton} onPress={() => handlePlayInRoom(selectedMovie)}>
                    <Text style={styles.modalButtonText}>Play in Room</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  heroContainer: { height: 320, width: '100%', justifyContent: 'flex-end', alignItems: 'flex-start', backgroundColor: '#000' },
  heroOverlay: { flex: 1, justifyContent: 'flex-end', paddingBottom: 40, paddingHorizontal: 20, width: '100%' },
  heroContent: { width: '70%' },
  heroTitle: { color: 'white', fontSize: 32, fontWeight: 'bold', marginBottom: 10 },
  heroDescription: { color: 'white', fontSize: 14, marginBottom: 20 },
  heroButtonContainer: { flexDirection: 'row' },
  heroButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginRight: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white' },
  playButton: { backgroundColor: 'white' },
  buttonText: { fontSize: 16, fontWeight: 'bold' },
  scrollContainer: { paddingBottom: 80 },
  genreSection: { marginTop: 20 },
  carouselTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginLeft: 20, marginBottom: 15 },
  movieItem: { marginLeft: 20, borderRadius: 8, overflow: 'hidden', backgroundColor: '#181818' },
  poster: { width: 140, height: 210, borderRadius: 8 },
  joinContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 10, backgroundColor: '#101010', borderTopColor: '#303030', borderTopWidth: 1 },
  input: { flex: 1, backgroundColor: '#252525', color: 'white', borderRadius: 8, paddingHorizontal: 15, marginRight: 10, height: 40 },
  joinButton: { paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#252525', borderRadius: 8, height: 40 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 40, zIndex: 10 },
  welcomeText: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  signOutText: { color: '#ccc', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: '#222', borderRadius: 12, padding: 16, maxHeight: '90%' },
  modalBanner: { width: '100%', height: 180, borderRadius: 8, marginBottom: 12 },
  modalTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  modalGenres: { color: '#ccc', fontSize: 14, marginBottom: 4 },
  modalRating: { color: '#ffd700', fontSize: 14, marginBottom: 4 },
  modalRelease: { color: '#aaa', fontSize: 14, marginBottom: 8 },
  modalDescription: { color: '#eee', fontSize: 16, marginBottom: 12 },
  modalPoster: { width: 120, height: 180, borderRadius: 8, alignSelf: 'center', marginBottom: 12 },
  trailerContainer: { marginBottom: 12, alignItems: 'center' },
  trailerLabel: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  trailerWebViewWrapper: { width: '100%', height: 200, marginTop: 8, marginBottom: 8, borderRadius: 8, overflow: 'hidden' },
  trailerWebView: { flex: 1, height: 200, borderRadius: 8 },
  modalButtonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  modalButton: { flex: 1, backgroundColor: '#e50914', padding: 12, borderRadius: 8, marginHorizontal: 6, alignItems: 'center' },
  modalButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  closeButton: { marginTop: 16, alignItems: 'center' },
  closeButtonText: { color: '#ccc', fontSize: 16 },
});