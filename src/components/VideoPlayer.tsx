import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import Video from 'react-native-video';
import { getSocket } from '../utils/wsClient';

export default function VideoPlayer({ roomCode }) {
  const videoRef = useRef(null);
  const [paused, setPaused] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoSource, setVideoSource] = useState(null); // This will store the video URL to play

  const socket = getSocket();

  useEffect(() => {
    if (roomCode) {
      // Emit initial video state when joining room to sync with other viewers
      // socket.emit('videoEvent', { roomCode, event: { type: 'initial', time: currentTime, paused: paused } });

      socket.on('videoEvent', (event) => {
        console.log('Received video event:', event);
        switch (event.type) {
          case 'play':
            setPaused(false);
            break;
          case 'pause':
            setPaused(true);
            break;
          case 'seek':
            if (videoRef.current) {
              videoRef.current.seek(event.time);
            }
            setCurrentTime(event.time);
            break;
          default:
            break;
        }
      });
    }

    return () => {
      socket.off('videoEvent');
    };
  }, [roomCode]);

  const handlePlayPause = () => {
    const newPausedState = !paused;
    setPaused(newPausedState);
    socket.emit('videoEvent', { roomCode, event: { type: newPausedState ? 'pause' : 'play', time: currentTime } });
  };

  const handleSeek = (time) => {
    if (videoRef.current) {
      videoRef.current.seek(time);
    }
    setCurrentTime(time);
    socket.emit('videoEvent', { roomCode, event: { type: 'seek', time: time } });
  };

  const onProgress = (data) => {
    setCurrentTime(data.currentTime);
  };

  return (
    <View style={styles.container}>
      {videoSource ? (
        <Video
          source={videoSource}
          ref={videoRef}
          paused={paused}
          onProgress={onProgress}
          onEnd={() => setPaused(true)}
          style={styles.video}
          controls={false} // Using custom controls for synchronized playback
          resizeMode="contain"
        />
      ) : (
        <View style={styles.placeholder}>
          <Text>No video loaded for Room: {roomCode}</Text>
          {/* URL can be added here */}
          <Button title="Load Sample Video" onPress={() => setVideoSource(null)} />
        </View>
      )}

      <View style={styles.controls}>
        <Button title={paused ? 'Play' : 'Pause'} onPress={handlePlayPause} />
        <Button title="Seek +10s" onPress={() => handleSeek(currentTime + 10)} />
        <Button title="Seek -10s" onPress={() => handleSeek(currentTime - 10)} />
        <Text>Time: {Math.floor(currentTime)}s</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    position: 'absolute',
    bottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
  },
});
