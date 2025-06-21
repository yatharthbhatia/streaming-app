import React from 'react';
import { View, StyleSheet } from 'react-native';
import VideoPlayer from '../components/VideoPlayer';
import ChatPanel from '../components/ChatPanel';

export default function RoomScreen({ route }) {
  const { roomCode, username } = route.params;

  return (
    <View style={styles.container}>
      <View style={styles.videoSection}>
        <VideoPlayer roomCode={roomCode} />
      </View>
      <View style={styles.chatSection}>
        <ChatPanel roomCode={roomCode} username={username} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row' },
  videoSection: { flex: 3 },
  chatSection: { flex: 1, backgroundColor: '#eee' },
}); 