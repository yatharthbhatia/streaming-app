import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
// @ts-ignore
import { WebView } from 'react-native-webview';
import ChatPanel from '../components/ChatPanel';

export default function RoomScreen({ route }) {
  const { roomCode, username, watchLink, title, videoUrl } = route.params;
  const [currentVideoUrl, setCurrentVideoUrl] = useState(videoUrl || watchLink);
  const [currentTitle, setCurrentTitle] = useState(title || 'Chat Room');

  const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const videoId = getYouTubeId(currentVideoUrl);
  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  const directLink = !videoId ? currentVideoUrl : null;

  const renderVideo = () => {
    if (embedUrl) {
      return (
        <WebView
            source={{ uri: embedUrl }}
            style={{ flex: 1 }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsFullscreenVideo
        />
      );
    }
    if (directLink) {
        return (
            <WebView
                source={{ uri: directLink }}
                style={{ flex: 1 }}
                startInLoadingState={true}
                renderLoading={() => <ActivityIndicator color="#fff" style={{...StyleSheet.absoluteFillObject}}/>}
                onError={(e) => Alert.alert("Playback Error", "This content may be protected by DRM. Please use the official app if it fails to load.")}
            />
        );
    }
    return (
        <View style={styles.noVideoContainer}>
            <Text style={styles.noVideoText}>No video selected. Enjoy the chat!</Text>
        </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.mainContent}>
        <View style={styles.header}>
          <Text style={styles.titleText} numberOfLines={1}>{currentTitle}</Text>
          <Text style={styles.roomCodeText}>Room Code: {roomCode}</Text>
        </View>
        {renderVideo()}
      </View>
      <View style={styles.chatContainer}>
        <ChatPanel roomCode={roomCode} username={username} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#000',
  },
  mainContent: {
    flex: 3,
  },
  chatContainer: {
    flex: 1,
    borderLeftWidth: 1,
    borderColor: '#303030',
  },
  header: {
    padding: 10,
    backgroundColor: '#181818',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 40,
  },
  roomCodeText: {
    color: '#aaa',
    fontSize: 12,
    marginRight: 10,
  },
  noVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noVideoText: {
    color: 'white',
    fontSize: 16,
    marginBottom: 20,
  },
}); 