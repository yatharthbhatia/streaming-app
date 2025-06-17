import React from 'react';
import { View, Text } from 'react-native';
// import Video from 'react-native-video'; // Uncomment and configure for real video

export default function VideoPlayer({ roomCode }) {
  // TODO: Connect to backend for sync events
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Video Player for Room: {roomCode}</Text>
      {/* <Video source={{ uri: 'https://your.video.url' }} ... /> */}
    </View>
  );
} 