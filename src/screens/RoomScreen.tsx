import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import ChatPanel from '../components/ChatPanel';

export default function RoomScreen({ route }) {
  const { roomCode, username, videoUrl, title } = route.params;

  // YouTube video ID from URL
  const getYouTubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const videoId = getYouTubeId(videoUrl);
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titleText}>{title}</Text>
        <Text style={styles.roomCodeText}>Room: {roomCode}</Text>
      </View>

      {videoId ? (
        <View style={styles.videoContainer}>
          <WebView
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            source={{ uri: embedUrl }}
            allowsFullscreenVideo
          />
        </View>
      ) : (
        <View style={styles.videoContainer}>
          <Text style={styles.errorText}>Could not load video.</Text>
        </View>
      )}

      <View style={styles.chatContainer}>
        <ChatPanel roomCode={roomCode} username={username} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141414',
  },
  header: {
    padding: 15,
    backgroundColor: '#202020',
    borderBottomWidth: 1,
    borderBottomColor: '#303030',
  },
  titleText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  roomCodeText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  videoContainer: {
    aspectRatio: 16 / 9,
    width: '100%',
    backgroundColor: 'black',
  },
  webview: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
  },
  errorText: {
      color: 'white',
      textAlign: 'center',
      marginTop: 50
  }
}); 