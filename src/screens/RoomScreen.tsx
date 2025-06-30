import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, FlatList, Platform } from 'react-native';
import VideoPlayer from '../components/VideoPlayer';
import ChatPanel from '../components/ChatPanel';
import { disconnectSocket, getSocket } from '../utils/wsClient';

const API_URL = process.env.EXPO_PUBLIC_SOCKET_URL;

export default function RoomScreen({ route }) {
  const { roomCode, username, watchLink, title } = route.params;
  const [currentVideoUrl, setCurrentVideoUrl] = useState(watchLink);
  const [currentTitle, setCurrentTitle] = useState(title || 'Chat Room');
  const [sessionParam, setSessionParam] = useState('');
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [videoLogs, setVideoLogs] = useState([]);

  useEffect(() => {
    const fetchAppInit = async () => {
      try {
        const res = await fetch(`${API_URL}/app/init`);
        const config = await res.json();
        if (config.init_key) {
          setSessionParam(config.init_key);
        }
      } catch (error) {
        console.error('Failed to fetch app init data:', error);
        Alert.alert('Error', 'Could not load video configuration. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchAppInit();
  }, []);

  useEffect(() => {
    const initializeSocket = async () => {
      try {
        const newSocket = await getSocket();
        setSocket(newSocket);
        console.log('Socket initialized:', !!newSocket);
      } catch (error) {
        console.error('Failed to initialize socket:', error);
      }
    };
    initializeSocket();
    return () => {
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    if (socket && roomCode) {
      console.log('Emitting joinRoom', roomCode);
      socket.emit('joinRoom', { roomCode });

      const handleChatMessage = (message) => {
        console.log('Received chatMessage:', message);
        setMessages((prevMessages) => [...prevMessages, message]);
      };

      const handleUserJoined = ({ username: joinedUsername }) => {
        if (Platform.OS === 'android' && Platform.isTV) {
          setMessages((prevMessages) => [
            ...prevMessages,
            { sender: 'System', text: `${joinedUsername} has joined the room.` },
          ]);
        }
      };

      socket.on('chatMessage', handleChatMessage);
      socket.on('userJoined', handleUserJoined);

      return () => {
        socket.off('chatMessage', handleChatMessage);
        socket.off('userJoined', handleUserJoined);
      };
    }
  }, [socket, roomCode]);

  const handleVideoLog = async (logData) => {
    console.log('📹 Video log received in RoomScreen:', logData);
    
    // update local logs
    setVideoLogs(prev => [...prev, logData]);
    
    // send to backend server
    try {
      const response = await fetch(`${API_URL}/api/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...logData,
          roomCode,
          username
        })
      });
      
      if (response.ok) {
        console.log('✅ Video log sent to backend successfully');
      } else {
        console.error('❌ Failed to send video log to backend:', response.status);
      }
    } catch (error) {
      console.error('❌ Error sending video log to backend:', error);
    }
  };

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
    if (loading) {
      return <ActivityIndicator color="#fff" style={{ flex: 1 }} />;
    }
    
    return (
      <VideoPlayer
        roomCode={roomCode}
        watchUrl={currentVideoUrl}
        sessionParam={sessionParam}
        onVideoLog={handleVideoLog}
      />
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
        {Platform.OS === 'android' && (
          <View style={{ flex: 1, backgroundColor: '#222' }}>
            <FlatList
              data={messages}
              renderItem={({ item }) => (
                <Text style={{ color: '#fff', fontSize: 18, margin: 8 }}>
                  {item.sender}: {item.text}
                </Text>
              )}
              keyExtractor={(_, i) => i.toString()}
              ListEmptyComponent={
                <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>
                  No messages yet. Start the conversation!
                </Text>
              }
            />
          </View>
        )}
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
    minHeight: 220,
    borderTopWidth: 1,
    borderColor: '#303030',
    backgroundColor: '#181818',
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