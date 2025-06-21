import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, ScrollView, ActivityIndicator, ImageBackground, Linking } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';
import { disconnectSocket } from '../utils/wsClient';
import { LinearGradient } from 'expo-linear-gradient';

const API_URL = process.env.EXPO_PUBLIC_SOCKET_URL;
const TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_URL = 'https://image.tmdb.org/t/p/original';

const MOVIE_CATEGORIES = [
  { title: 'Popular', endpoint: '/movies/popular' },
  { title: 'Top Rated', endpoint: '/movies/top_rated' },
  { title: 'Action', endpoint: '/discover/genre/28' },
  { title: 'Comedy', endpoint: '/discover/genre/35' },
];

const WATCH_PROVIDERS = [
  { id: 8, name: 'Netflix', logo_path: '/t2yyOv4xD993sM7uFaVIvlgk0Sj.jpg' },
  { id: 9, name: 'Prime Video', logo_path: '/9A1JSVmSxsyaBK4SUFsYV_kePAd.jpg' },
  { id: 337, name: 'Disney+', logo_path: '/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg' },
  { id: 1899, name: 'Max', logo_path: '/f05wYj_pA202yKx6Sg2_nS9g2G.jpg' },
];

const WatchProviderIcon = ({ provider }) => (
    <View style={{ marginRight: 10 }}>
        <Image
            source={{ uri: `${TMDB_IMAGE_URL}${provider.logo_path}` }}
            style={{ width: 40, height: 40, borderRadius: 8 }}
        />
    </View>
);

const HeroBanner = ({ movie, onJoin }) => {
  if (movie === null) {
    return (
      <View style={styles.heroContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!movie) {
    return <View style={styles.heroContainer} />;
  }

  const logo = movie.images?.logos?.find(l => l.iso_639_1 === 'en');
  const providers = movie?.['watch/providers']?.results?.US?.flatrate;
  const trailer = movie?.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer');

  return (
    <ImageBackground
      source={{ uri: `${TMDB_BACKDROP_URL}${movie.backdrop_path}` }}
      style={styles.heroContainer}
    >
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.6)', 'black']}
        style={styles.heroOverlay}
      >
        <View style={styles.heroContent}>
          {logo ? (
            <Image
              source={{ uri: `${TMDB_IMAGE_URL}${logo.file_path}` }}
              style={styles.heroLogo}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.heroTitle}>{movie.title}</Text>
          )}
          <Text style={styles.heroDescription} numberOfLines={3}>{movie.overview}</Text>

          {providers && providers.length > 0 ? (
            <View>
                <Text style={styles.watchNowText}>Available on:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexGrow: 0, marginBottom: 15}}>
                    {providers.map(p => <WatchProviderIcon key={p.provider_id} provider={p} />)}
                </ScrollView>
            </View>
          ) : null}

          <View style={styles.heroButtonContainer}>
            <TouchableOpacity 
                style={[styles.heroButton, styles.playButton]}
                onPress={() => onJoin(trailer)}
            >
              <Text style={[styles.buttonText, { color: 'black' }]}>▶ Create Room & Watch Trailer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.heroButton, styles.infoButton]}>
              <Text style={styles.buttonText}>ⓘ More Info</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </ImageBackground>
  );
};

const MovieCard = ({ movie, onPress }) => (
  <TouchableOpacity style={styles.movieItem} onPress={() => onPress(movie)}>
    <Image
      source={{ uri: `${TMDB_IMAGE_URL}${movie.poster_path}` }}
      style={styles.poster}
    />
  </TouchableOpacity>
);

const MovieCategory = ({ title, movies, onPressMovie }) => (
  <View style={styles.categoryContainer}>
    <Text style={styles.carouselTitle}>{title}</Text>
    <FlatList
      data={movies}
      renderItem={({ item }) => (
        <MovieCard movie={item} onPress={onPressMovie} />
      )}
      keyExtractor={(item) => item.id.toString()}
      horizontal
      showsHorizontalScrollIndicator={false}
    />
  </View>
);

const ProviderSelector = ({ onSelect, selectedProvider }) => (
  <View style={styles.providerContainer}>
    <Text style={styles.carouselTitle}>Filter by Service</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingLeft: 20}}>
      {WATCH_PROVIDERS.map(p => (
        <TouchableOpacity key={p.id} onPress={() => onSelect(p)} style={[styles.providerLogoContainer, selectedProvider?.id === p.id && styles.providerSelected]}>
          <Image source={{ uri: `${TMDB_IMAGE_URL}${p.logo_path}` }} style={styles.providerLogo} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

export default function HomeScreen({ navigation, route }) {
  const [categories, setCategories] = useState([]);
  const [heroMovie, setHeroMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [providerMovies, setProviderMovies] = useState([]);
  const [providerLoading, setProviderLoading] = useState(false);
  const username = route.params?.username;

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const categoryPromises = MOVIE_CATEGORIES.map(async (category) => {
          const res = await fetch(`${API_URL}${category.endpoint}`);
          if (!res.ok) return null;
          const data = await res.json();
          return { ...category, movies: data.results };
        });

        const results = await Promise.allSettled(categoryPromises);
        const successfulCategories = results
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && !!r.value)
          .map((r) => r.value);
        
        setCategories(successfulCategories.filter(c => c && c.movies && c.movies.length > 0));

        const popularMovies = successfulCategories.find(c => c.title === 'Popular')?.movies;
        if (popularMovies && popularMovies.length > 0) {
          const detailedRes = await fetch(`${API_URL}/movie/${popularMovies[0].id}`);
          if (detailedRes.ok) {
            setHeroMovie(await detailedRes.json());
          } else {
            console.error('Failed to fetch hero movie details:', detailedRes.status);
            setHeroMovie(false);
          }
        } else {
            setHeroMovie(false);
        }
      } catch (err) {
        Alert.alert("Network Error", "Could not fetch movies.");
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  const handleSelectProvider = async (provider) => {
      if (selectedProvider?.id === provider.id) {
          setSelectedProvider(null);
          setProviderMovies([]);
          return;
      }
      setSelectedProvider(provider);
      setProviderLoading(true);
      try {
        const res = await fetch(`${API_URL}/discover/provider/${provider.id}`);
        if (res.ok) {
          const data = await res.json();
          setProviderMovies(data.results);
        } else {
          Alert.alert("Error", `Could not fetch movies for ${provider.name}.`);
          setProviderMovies([]);
        }
      } catch (err) {
        Alert.alert("Network Error", "Could not fetch movies.");
      } finally {
        setProviderLoading(false);
      }
    };

  const createRoom = async (trailer) => {
    if (!trailer?.key) {
        Alert.alert("No Trailer Available", "We couldn't find a trailer for this movie.");
        return;
    }
    const token = await SecureStore.getItemAsync('authToken');
    try {
      const res = await fetch(`${API_URL}/room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.roomCode) {
        navigation.navigate('Room', { 
            roomCode: data.roomCode, 
            username,
            videoUrl: `https://www.youtube.com/watch?v=${trailer.key}`,
            title: heroMovie.title
        });
      } else {
        Alert.alert('Error', data.error || 'Could not create room.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while creating the room.');
    }
  };
  
  const handleSignOut = async () => {
    await SecureStore.deleteItemAsync('authToken');
    navigation.replace('Login');
  };

  if (loading) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" color="#fff" /></View>;
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <HeroBanner movie={heroMovie} onJoin={createRoom} />
        <ProviderSelector onSelect={handleSelectProvider} selectedProvider={selectedProvider} />
        {providerLoading ? (
          <ActivityIndicator style={{ marginTop: 20 }} color="#fff" />
        ) : selectedProvider && providerMovies.length > 0 ? (
          <MovieCategory
            title={`Only on ${selectedProvider.name}`}
            movies={providerMovies}
            onPressMovie={(movie) => console.log("Pressed movie:", movie.title)}
          />
        ) : null}
        {categories.map((category) => (
          <MovieCategory
            key={category.title}
            title={category.title}
            movies={category.movies}
            onPressMovie={(movie) => {
              console.log("Pressed movie:", movie.title);
            }}
          />
        ))}
      </ScrollView>
       <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome, {username}!</Text>
          <TouchableOpacity onPress={handleSignOut}><Text style={styles.signOutText}>Sign Out</Text></TouchableOpacity>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  scrollContainer: { paddingBottom: 50 },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingTop: 40,
    zIndex: 10,
  },
  welcomeText: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  signOutText: { color: '#ccc', fontSize: 16 },

  heroContainer: { height: 480, width: '100%', justifyContent: 'flex-end' },
  heroOverlay: { flex: 1, justifyContent: 'flex-end', paddingBottom: 30, paddingHorizontal: 20 },
  heroContent: { width: '60%' },
  heroLogo: { width: '80%', height: 100, marginBottom: 10 },
  heroTitle: { color: 'white', fontSize: 40, fontWeight: 'bold', marginBottom: 10 },
  heroDescription: { color: 'white', fontSize: 14, marginBottom: 20 },
  watchNowText: { color: '#ccc', fontSize: 14, marginBottom: 8, fontWeight: 'bold' },
  heroButtonContainer: { flexDirection: 'row' },
  heroButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginRight: 10, flexDirection: 'row', alignItems: 'center' },
  playButton: { backgroundColor: 'white' },
  infoButton: { backgroundColor: 'rgba(109, 109, 110, 0.7)' },
  buttonText: { fontSize: 16, fontWeight: 'bold' },

  categoryContainer: { marginTop: 20 },
  carouselTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginLeft: 20, marginBottom: 15 },
  movieItem: { marginLeft: 20, borderRadius: 8, overflow: 'hidden' },
  poster: { width: 140, height: 210, borderRadius: 8 },

  providerContainer: { marginTop: 20 },
  providerLogoContainer: {
    marginRight: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 2,
  },
  providerSelected: {
    borderColor: 'white',
  },
  providerLogo: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
});