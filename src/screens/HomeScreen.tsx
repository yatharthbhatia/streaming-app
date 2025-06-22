import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, ScrollView, ActivityIndicator, ImageBackground, TextInput } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';
import { disconnectSocket } from '../utils/wsClient';
// @ts-ignore
import { LinearGradient } from 'expo-linear-gradient';

const API_URL = process.env.EXPO_PUBLIC_SOCKET_URL;
const TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_URL = 'https://image.tmdb.org/t/p/original';


const HeroBanner = ({ movie, onWatchAndCreate }) => {
  if (!movie) return <View style={styles.heroContainer}><ActivityIndicator size="large" color="#fff" /></View>;
  return (
    <ImageBackground source={{ uri: `${TMDB_BACKDROP_URL}${movie.backdrop_path}` }} style={styles.heroContainer}>
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)', 'black']} style={styles.heroOverlay}>
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle} numberOfLines={1}>{movie.title}</Text>
          <Text style={styles.heroDescription} numberOfLines={3}>{movie.overview}</Text>
          <View style={styles.heroButtonContainer}>
            <TouchableOpacity style={[styles.heroButton, styles.playButton]} onPress={() => onWatchAndCreate(movie)}>
              <Text style={[styles.buttonText, { color: 'black' }]}>▶ Watch & Create Room</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </ImageBackground>
  );
};

const MovieCard = ({ movie, onPress }) => (
  <TouchableOpacity style={styles.movieItem} onPress={() => onPress(movie)}>
    <Image source={{ uri: `${TMDB_IMAGE_URL}${movie.poster_path}` }} style={styles.poster} />
  </TouchableOpacity>
);

const MovieCategory = ({ title, movies, onPressMovie }) => (
  <View style={styles.categoryContainer}>
    <Text style={styles.carouselTitle}>{title}</Text>
    <FlatList data={movies} renderItem={({ item }) => (<MovieCard movie={item} onPress={onPressMovie} />)} keyExtractor={(item) => item.id.toString()} horizontal showsHorizontalScrollIndicator={false} />
  </View>
);


export default function HomeScreen({ navigation, route }) {
  const [categories, setCategories] = useState([]);
  const [heroMovie, setHeroMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const username = route.params?.username;

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const popularRes = await fetch(`${API_URL}/movies/popular`);
        if (!popularRes.ok) throw new Error("Failed to get popular movies");
        const popularData = await popularRes.json();
        const firstMovieId = popularData.results?.[0]?.id;
        if (firstMovieId) {
          const detailedRes = await fetch(`${API_URL}/movie/${firstMovieId}`);
          if (detailedRes.ok) setHeroMovie(await detailedRes.json());
        }
        const otherCategories = [
          { title: 'Popular', movies: popularData.results },
          { title: 'Top Rated', endpoint: '/movies/top_rated' },
          { title: 'Action', endpoint: '/discover/genre/28' },
        ].filter(c => !c.movies);
        const categoryPromises = otherCategories.map(async (cat) => {
          const res = await fetch(`${API_URL}${cat.endpoint}`);
          return res.ok ? { ...cat, movies: (await res.json()).results } : null;
        });
        const settled = (await Promise.allSettled(categoryPromises)).map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean);
        setCategories([
            { title: 'Popular', movies: popularData.results },
            ...settled
        ]);
      } catch (err) {
        Alert.alert("Network Error", "Could not fetch movies.");
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);
  
  const handleSelectMovie = async (movie) => {
    setHeroMovie(null);
    const detailedRes = await fetch(`${API_URL}/movie/${movie.id}`);
    if (detailedRes.ok) setHeroMovie(await detailedRes.json());
    else Alert.alert("Error", "Could not load movie details.");
  };

  const handleWatchAndCreate = async (movie) => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const roomRes = await fetch(`${API_URL}/room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const roomData = await roomRes.json();

      if (roomData.roomCode) {
        showRoomCodePopup(roomData.roomCode, null, movie.title);
      } else {
        Alert.alert('Error', roomData.error || 'Could not create room.');
      }
    } catch (error) {
        console.error("Error in handleWatchAndCreate:", error);
      Alert.alert('Error', 'An error occurred while creating the room.');
    }
  };

  const showRoomCodePopup = (roomCode, watchLink, title) => {
    Alert.alert('Room Created!', `Your Room Code is: ${roomCode}`, [
      { text: 'Share', onPress: () => Share.share({ message: `Join my SocialRoom to watch ${title}! Code: ${roomCode}` }) },
      { text: 'Copy', onPress: () => Clipboard.setStringAsync(roomCode).then(() => Alert.alert("Copied!")) },
      { text: 'Join Room', onPress: () => navigation.navigate('Room', { roomCode, username, watchLink, title }) },
    ]);
  };

  const handleJoinExistingRoom = () => {
    if (!joinRoomCode.trim()) {
      Alert.alert("Error", "Please enter a room code.");
      return;
    }
    navigation.navigate('Room', { roomCode: joinRoomCode, username });
  };
  
  const handleSignOut = async () => {
    await SecureStore.deleteItemAsync('authToken');
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {loading ? <View style={styles.heroContainer}><ActivityIndicator/></View> : <HeroBanner movie={heroMovie} onWatchAndCreate={handleWatchAndCreate} />}
        {categories.map((category) => (
          category.movies && category.movies.length > 0 && <MovieCategory key={category.title} title={category.title} movies={category.movies} onPressMovie={handleSelectMovie} />
        ))}
      </ScrollView>
      <View style={styles.joinContainer}>
        <TextInput style={styles.input} placeholder="Enter Room Code" value={joinRoomCode} onChangeText={setJoinRoomCode} placeholderTextColor="#999" />
        <TouchableOpacity style={styles.joinButton} onPress={handleJoinExistingRoom}><Text style={{ color: 'white', fontWeight: 'bold' }}>Join</Text></TouchableOpacity>
      </View>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {username}!</Text>
        <TouchableOpacity onPress={handleSignOut}><Text style={styles.signOutText}>Sign Out</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  scrollContainer: { paddingBottom: 80 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 40, zIndex: 10,},
  welcomeText: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  signOutText: { color: '#ccc', fontSize: 16 },
  heroContainer: { height: 480, width: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  heroOverlay: { flex: 1, justifyContent: 'flex-end', paddingBottom: 40, paddingHorizontal: 20, width: '100%' },
  heroContent: { width: '70%' },
  heroTitle: { color: 'white', fontSize: 40, fontWeight: 'bold', marginBottom: 10 },
  heroDescription: { color: 'white', fontSize: 14, marginBottom: 20 },
  heroButtonContainer: { flexDirection: 'row' },
  heroButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginRight: 10, flexDirection: 'row', alignItems: 'center' },
  playButton: { backgroundColor: 'white' },
  buttonText: { fontSize: 16, fontWeight: 'bold' },
  categoryContainer: { marginTop: 20 },
  carouselTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginLeft: 20, marginBottom: 15 },
  movieItem: { marginLeft: 20, borderRadius: 8, overflow: 'hidden' },
  poster: { width: 140, height: 210, borderRadius: 8 },
  joinContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 10, backgroundColor: '#101010', borderTopColor: '#303030', borderTopWidth: 1 },
  input: { flex: 1, backgroundColor: '#252525', color: 'white', borderRadius: 8, paddingHorizontal: 15, marginRight: 10, height: 40 },
  joinButton: { paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#252525', borderRadius: 8, height: 40 },
});