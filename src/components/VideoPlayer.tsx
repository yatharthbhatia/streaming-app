import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import Video from 'react-native-video';
import { getSocket, disconnectSocket } from '../utils/wsClient';

export default function VideoPlayer({ roomCode }) {
  const videoRef = useRef(null);
  const [paused, setPaused] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoSource, setVideoSource] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const initializeSocket = async () => {
      try {
        const newSocket = await getSocket();
        setSocket(newSocket);
      } catch (error) {
        console.error('VideoPlayer: Failed to initialize socket:', error);
      }
    };

    initializeSocket();

    return () => {
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    if (socket && roomCode) {
      const handleVideoEvent = (event) => {
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
        }
      };

      socket.on('videoEvent', handleVideoEvent);

      return () => {
        socket.off('videoEvent', handleVideoEvent);
      };
    }
  }, [socket, roomCode]);

  const handlePlayPause = () => {
    if (socket) {
      const newPausedState = !paused;
      setPaused(newPausedState);
      socket.emit('videoEvent', { roomCode, event: { type: newPausedState ? 'pause' : 'play', time: currentTime } });
    }
  };

  const handleSeek = (time) => {
    if (socket) {
      if (videoRef.current) {
        videoRef.current.seek(time);
      }
      setCurrentTime(time);
      socket.emit('videoEvent', { roomCode, event: { type: 'seek', time: time } });
    }
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
          controls={false}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={{color: 'white'}}>No video loaded for Room: {roomCode}</Text>
          <Button title="Load Sample Video" onPress={() => setVideoSource(null)} />
        </View>
      )}

      <View style={styles.controls}>
        <Button title={paused ? 'Play' : 'Pause'} onPress={handlePlayPause} />
        <Button title="Seek +10s" onPress={() => handleSeek(currentTime + 10)} />
        <Button title="Seek -10s" onPress={() => handleSeek(currentTime - 10)} />
        <Text style={{color: 'white'}}>Time: {Math.floor(currentTime)}s</Text>
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
