import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  ActivityIndicator, 
  ImageBackground, 
  TextInput, 
  Modal, 
  Linking, 
  Dimensions, 
  Share, 
  Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import * as SecureStore from 'expo-secure-store';
import * as Clipboard from 'expo-clipboard';
// import { disconnectSocket } from '../utils/wsClient';
import { LinearGradient } from 'expo-linear-gradient';

const API_URL = process.env.EXPO_PUBLIC_SOCKET_URL;

type Movie = {
  tmdb_id: string;
  title: string;
  homepage: string;
  poster_image?: string;
  backdrop_image?: string;
  description?: string;
  genres?: string[];
  rating?: number;
  vote_count?: number;
  release_date?: string;
  trailer?: string;
};

const MovieCard = ({ movie, onPress }) => (
  <TouchableOpacity style={styles.movieItem} onPress={() => onPress(movie)}>
    <Image source={{ uri: movie.poster_image }} style={styles.poster} />
  </TouchableOpacity>
);

function getYouTubeEmbedUrl(url: string) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
  if (match) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }
  return null;
}

// heroCarousel (implementation)
const HERO_CAROUSEL_SIZE = 8;
const SLIDE_WIDTH = Dimensions.get('window').width;
const SLIDE_HEIGHT = 320;

const HeroCarousel = ({ movies, onSelect, onPlay }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const intervalRef = useRef(null);
  const isManualScroll = useRef(false);

  // auto-scroll (logic)
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!isManualScroll.current && movies.length > 1) {
        setCurrentIndex(prev => {
          const next = (prev + 1) % movies.length;
          flatListRef.current?.scrollToIndex({ index: next, animated: true });
          return next;
        });
      }
      isManualScroll.current = false;
    }, 6000);
    return () => clearInterval(intervalRef.current);
  }, [movies.length]);

  // currentIndex
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const handleScroll = () => {
    isManualScroll.current = true;
  };

  const getHeroImage = (movie: Movie) => {
    if (!movie) return require('../../assets/images/icon-1280x768.png');
    if (movie.backdrop_image) return { uri: movie.backdrop_image };
    if (movie.poster_image) return { uri: movie.poster_image };
    return require('../../assets/images/icon-1280x768.png');
  };

  return (
    <View style={[styles.heroBannerCarouselContainer, { width: SLIDE_WIDTH, height: SLIDE_HEIGHT }]}>
      <FlatList
        ref={flatListRef}
        data={movies}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => `hero-${item.tmdb_id}`}
        renderItem={({ item }) => {
          const img = getHeroImage(item);
          return (
            <ImageBackground
              source={img}
              style={{ width: SLIDE_WIDTH, height: SLIDE_HEIGHT, justifyContent: 'flex-end' }}
              resizeMode="cover"
            >
              {/* top (gradient) */}
              <LinearGradient
                colors={['rgba(0,0,0,0.99)', 'rgba(0,0,0,0)']}
                style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '50%' }}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
              
              {/* bottom (gradient) */}
              <LinearGradient
                colors={['rgba(0,0,0,0.95)', 'rgba(0,0,0,0.0)']}
                style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%' }}
                start={{ x: 0, y: 1 }}
                end={{ x: 0, y: 0 }}
              />
              <View style={{ width: '70%', zIndex: 1, paddingBottom: 40, paddingHorizontal: 20 }}>
                <Text style={styles.heroTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.heroDescription} numberOfLines={3} ellipsizeMode="tail">{item.description}</Text>
                <View style={styles.heroButtonContainer}>
                  <TouchableOpacity style={[styles.heroButton, styles.playButton]} onPress={() => onSelect(item)}>
                    <Text style={[styles.buttonText, { color: 'black' }]}>More Info</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.heroButton, styles.playButton]} onPress={() => onPlay(item)}>
                    <Text style={[styles.buttonText, { color: 'black' }]}>▶ Play in Room</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ImageBackground>
          );
        }}
        getItemLayout={(_, index) => ({ length: SLIDE_WIDTH, offset: SLIDE_WIDTH * index, index })}
        initialScrollIndex={0}
        onScrollBeginDrag={handleScroll}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
      />

      {/* Dots indicator */}
      <View style={styles.heroDotsContainer}>
        {movies.map((_, idx: number) => (
          <View key={idx} style={[styles.heroDot, idx === currentIndex && styles.heroDotActive]} />
        ))}
      </View>
    </View>
  );
};

export default function HomeScreen({ navigation, route }) {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [roomPopupVisible, setRoomPopupVisible] = useState(false);
  const [createdRoomCode, setCreatedRoomCode] = useState('');
  const [createdRoomMovie, setCreatedRoomMovie] = useState('');
  const [createdRoomWatchLink, setCreatedRoomWatchLink] = useState('');
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

  const handleSelectMovie = (movie: Movie) => {
    setSelectedMovie(movie);
    setModalVisible(true);
  };

  const handlePlayInRoom = async (movie: Movie) => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const roomRes = await fetch(`${API_URL}/room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const roomData = await roomRes.json();
      if (roomData.roomCode) {
        setModalVisible(false);
        setCreatedRoomCode(roomData.roomCode);
        setCreatedRoomMovie(movie.title);
        setCreatedRoomWatchLink(movie.homepage);
        setRoomPopupVisible(true);    // popup (copy, share, join)
      } else {
        Alert.alert('Error', roomData.error || 'Could not create room.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while creating the room.');
    }
  };

  const handleHomepage = (url: string) => {
    Linking.openURL(url);
  };

  // Dedup by tmdb_id
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

  const moviesByGenre = genres.map(genre => ({
    genre,
    movies: uniqueMovies.filter(m => m.genres && m.genres.includes(genre)),
  }));

  // first movie -> hero banner
  // const heroMovie = uniqueMovies[0];

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

  const handleCopyRoomCode = async () => {
    await Clipboard.setStringAsync(createdRoomCode);
    Alert.alert('Copied', 'Room code copied to clipboard!');
  };

  const handleShareRoomCode = async () => {
    try {
      await Share.share({
        message: `Join my room for Movie:"${createdRoomMovie}"! Room code: ${createdRoomCode}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share the room code.');
    }
  };

  const handleJoinRoomFromPopup = () => {
    setRoomPopupVisible(false);
    navigation.navigate('Room', {
      roomCode: createdRoomCode,
      username,
      watchLink: createdRoomWatchLink,
      title: createdRoomMovie,
    });
  };

  return (
    <View style={styles.container}>      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.topHeaderBox}>
        {/* User Info & Sign Out */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome, {username}!</Text>
          <TouchableOpacity
            onPress={handleSignOut}
            style={{ padding: 6, borderRadius: 6, backgroundColor: '#222', marginLeft: 10 }}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* hero carousel */}
      <HeroCarousel
        movies={uniqueMovies.slice(0, HERO_CAROUSEL_SIZE)}
        onSelect={handleSelectMovie}
        onPlay={handlePlayInRoom}
      />
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
      
      {/* join room */}
      <View style={styles.joinContainer}>
        <TextInput style={styles.input} placeholder="Enter Room Code" value={joinRoomCode} onChangeText={setJoinRoomCode} placeholderTextColor="#999" />
        <TouchableOpacity style={styles.joinButton} onPress={handleJoinExistingRoom}><Text style={{ color: 'white', fontWeight: 'bold' }}>Join</Text></TouchableOpacity>
      </View>
      
      {/* modal for movie details */}
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
      
      {/* modal for room details (c, s, j) */}
      <Modal
        visible={roomPopupVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRoomPopupVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '85%', backgroundColor: '#222', borderRadius: 12, padding: 24, alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 12 }}>Room Created!</Text>
            <Text style={{ color: '#bbb', fontSize: 18, marginBottom: 8 }}>Movie: <Text style={{ color: 'white', fontWeight: 'bold' }}>{createdRoomMovie}</Text></Text>
            <Text style={{ color: '#ffd600', fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Room Code: {createdRoomCode}</Text>
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              <TouchableOpacity style={{ backgroundColor: '#444', padding: 12, borderRadius: 8, marginHorizontal: 8 }} onPress={handleCopyRoomCode}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ backgroundColor: '#444', padding: 12, borderRadius: 8, marginHorizontal: 8 }} onPress={handleShareRoomCode}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ backgroundColor: '#e50914', padding: 12, borderRadius: 8, marginHorizontal: 8 }} onPress={handleJoinRoomFromPopup}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Join Room</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: '#aaa', fontSize: 14, textAlign: 'center' }}>Share this code with friends or copy it. You can join the room now or share/copy again.</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: 'black' 
  },
  heroContainer: {
    height: 320, 
    width: '100%', 
    justifyContent: 'flex-end', 
    alignItems: 'flex-start', 
    backgroundColor: '#000' 
  },
  heroOverlay: { 
    flex: 1, 
    justifyContent: 'flex-end', 
    paddingBottom: 40, 
    paddingHorizontal: 20, 
    width: '100%' 
  },
  heroContent: {
    width: '70%' 
  },
  heroTitle: { 
    color: 'white', 
    fontSize: 32, 
    fontWeight: 'bold', 
    marginBottom: 10 
  },
  heroDescription: { 
    color: 'white', 
    fontSize: 16, 
    marginBottom: 20, 
    flexWrap: 'wrap' 
  },
  heroButtonContainer: { 
    flexDirection: 'row' 
  },
  heroButton: { 
    paddingVertical: 10, 
    paddingHorizontal: 20, 
    borderRadius: 8, 
    marginRight: 10, 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'white' 
  },
  playButton: { 
    backgroundColor: 'white' 
  },
  buttonText: { 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  scrollContainer: { 
    paddingBottom: 80 
  },
  genreSection: { 
    marginTop: 20 
  },
  carouselTitle: { 
    color: 'white', 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginLeft: 20, 
    marginBottom: 15 
  },
  movieItem: { 
    marginLeft: 20, 
    borderRadius: 8, 
    overflow: 'hidden', 
    backgroundColor: '#181818' 
  },
  poster: { 
    width: 140, 
    height: 210, 
    borderRadius: 8 
  },
  joinContainer: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    flexDirection: 'row', 
    padding: 10, 
    backgroundColor: '#101010', 
    borderTopColor: '#303030', 
    borderTopWidth: 1 
  },
  input: { 
    flex: 1, 
    backgroundColor: '#252525', 
    color: 'white', 
    borderRadius: 8, 
    paddingHorizontal: 15, 
    marginRight: 10, 
    height: 40 
  },
  joinButton: { 
    paddingHorizontal: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#252525', 
    borderRadius: 8, 
    height: 40 , 
    marginBottom: Platform.OS === 'ios' ? 12 : 0
  },
  header: { 
    position: 'relative', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 0, 
    zIndex: 10 
  },
  welcomeText: { 
    color: 'white', 
    fontSize: 22, 
    fontWeight: 'bold' 
  },
  signOutText: { 
    color: '#ccc', 
    fontSize: 16 
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalContent: { 
    width: '90%', 
    backgroundColor: '#222', 
    borderRadius: 12, 
    padding: 16, 
    maxHeight: '90%' 
  },
  modalBanner: { 
    width: '100%', 
    height: 180, 
    borderRadius: 8, 
    marginBottom: 12 
  },
  modalTitle: { 
    color: 'white', 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 8 
  },
  modalGenres: { 
    color: '#ccc', 
    fontSize: 14, 
    marginBottom: 4 
  },
  modalRating: { 
    color: '#ffd700', 
    fontSize: 14, 
    marginBottom: 4 
  },
  modalRelease: { 
    color: '#aaa', 
    fontSize: 14, 
    marginBottom: 8 
  },
  modalDescription: { 
    color: '#eee', 
    fontSize: 16, 
    marginBottom: 12 
  },
  modalPoster: { 
    width: 120, 
    height: 180, 
    borderRadius: 8, 
    alignSelf: 'center', 
    marginBottom: 12 
  },
  trailerContainer: { 
    marginBottom: 12, 
    alignItems: 'center' 
  },
  trailerLabel: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  trailerWebViewWrapper: { 
    width: '100%', 
    height: 200, 
    marginTop: 8, 
    marginBottom: 8, 
    borderRadius: 8, 
    overflow: 'hidden' 
  },
  trailerWebView: { 
    flex: 1, 
    height: 200, 
    borderRadius: 8 
  },
  modalButtonRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 12 
  },
  modalButton: { 
    flex: 1, 
    backgroundColor: '#e50914', 
    padding: 12, 
    borderRadius: 8, 
    marginHorizontal: 6, 
    alignItems: 'center' 
  },
  modalButtonText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  closeButton: { 
    marginTop: 16, 
    alignItems: 'center' 
  },
  closeButtonText: { 
    color: '#ccc', 
    fontSize: 16 
  },
  heroBannerCarouselContainer: {
    width: '100%',
    height: 320,
    marginBottom: 5,
  },
  heroDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -18,
    marginBottom: 8,
  },
  heroDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#888',
    marginHorizontal: 2,
  },
  heroDotActive: {
    backgroundColor: '#fff',
  },
  topHeaderBox: {
    width: '100%',
    backgroundColor: 'black',
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 0,
  },
});