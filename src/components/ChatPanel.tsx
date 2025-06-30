import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, FlatList, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Image, ScrollView } from 'react-native';
import { getSocket, disconnectSocket } from '../utils/wsClient';

const isAndroidTV = Platform.OS === 'android' && Platform.isTV;

const placeholder1 = 'https://ui-avatars.com/api/?name=User+1&background=0D8ABC&color=fff&size=128';
const placeholder2 = 'https://ui-avatars.com/api/?name=User+2&background=F39C12&color=fff&size=128';

export default function ChatPanel({ roomCode, username, users = ['User 1', 'User 2'] }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState(null);
  const flatListRef = useRef(null);
  const [view, setView] = useState('chat');

  useEffect(() => {
    const initializeSocket = async () => {
      try {
        const newSocket = await getSocket();
        setSocket(newSocket);
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
      socket.emit('joinRoom', { roomCode });
      const handleChatMessage = (message) => {
        setMessages((prevMessages) => [...prevMessages, message]);
      };
      const handleUserJoined = ({ username: joinedUsername }) => {
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: 'System', text: `${joinedUsername} has joined the room.` },
        ]);
      };
      socket.on('chatMessage', handleChatMessage);
      socket.on('userJoined', handleUserJoined);
      return () => {
        socket.off('chatMessage', handleChatMessage);
        socket.off('userJoined', handleUserJoined);
      };
    }
  }, [socket, roomCode]);

  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, [messages]);

  const sendMessage = () => {
    if (input.trim() && socket) {
      const messagePayload = {
        roomCode,
        message: input,
        sender: username,
      };
      socket.emit('chatMessage', messagePayload);
      setInput('');
    }
  };

  // bubble rendering -> chat messages (custom)
  const renderItem = ({ item }) => {
    const isMe = item.sender === username;
    const isSystem = item.sender === 'System';
    return (
      <View
        style={[
          styles.bubbleContainer,
          isMe ? styles.bubbleContainerRight : styles.bubbleContainerLeft,
          isSystem && { alignSelf: 'center' },
        ]}
      >
        <View
          style={[
            styles.bubble,
            isMe
              ? styles.bubbleRight
              : isSystem
              ? styles.bubbleSystem
              : styles.bubbleLeft,
          ]}
        >
          {!isMe && !isSystem && (
            <Text style={
              isAndroidTV
                ? [styles.senderName, { color: getStyleColor(styles.senderName) }]
                : styles.senderName
            }>
              {item.sender}
            </Text>
          )}
          <Text
            style={
              isSystem
                ? isAndroidTV
                  ? [styles.systemText, { color: getStyleColor(styles.systemText) }]
                  : styles.systemText
                : isAndroidTV
                  ? [styles.messageText, { color: getStyleColor(styles.messageText) }]
                  : styles.messageText
            }
          >
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  // android tv -> view
  const Container = isAndroidTV ? View : KeyboardAvoidingView;
  const containerProps = isAndroidTV
    ? { style: styles.chatContainer }
    : Platform.OS === 'ios'
      ? { style: styles.chatContainer, behavior: 'padding' as 'padding' }
      : { style: styles.chatContainer };

  const renderToggle = () => (
    <View style={styles.toggleContainer}>
      <TouchableOpacity
        style={[styles.toggleButton, view === 'chat' && styles.toggleButtonActive]}
        onPress={() => setView('chat')}
      >
        <Text style={[styles.toggleButtonText, view === 'chat' && styles.toggleButtonTextActive]}>Chat</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.toggleButton, view === 'video' && styles.toggleButtonActive]}
        onPress={() => setView('video')}
      >
        <Text style={[styles.toggleButtonText, view === 'video' && styles.toggleButtonTextActive]}>Video</Text>
      </TouchableOpacity>
    </View>
  );

  // video (placeholders)
  const renderVideoPlaceholders = () => (
    <View style={styles.videoContainer}>
      <View style={styles.videoBox}>
        <Image source={{ uri: placeholder1 }} style={styles.videoImage} />
        <Text style={styles.videoUsername}>{users[0] || 'User 1'}</Text>
      </View>
      <View style={styles.videoBox}>
        <Image source={{ uri: placeholder2 }} style={styles.videoImage} />
        <Text style={styles.videoUsername}>{users[1] || 'User 2'}</Text>
      </View>
    </View>
  );

  const scrollViewRef = useRef(null);

  // color -> from styles (extract)
  const getStyleColor = (styleObj) => (styleObj && styleObj.color ? styleObj.color : undefined);

  return (
    <Container {...containerProps}>
      {renderToggle()}
      {view === 'chat' ? (
        isAndroidTV ? (
          <View style={{ flex: 1 }}>
            <ScrollView
              contentContainerStyle={{ flexGrow: 1}}
              ref={scrollViewRef}
              onContentSizeChange={() => scrollViewRef.current.scrollToEnd({ animated: true })}
            >
              {messages.length > 0 && messages.map((item, index) => {
                const isMe = item.sender === username;
                const isSystem = item.sender === 'System';
                return (
                  <View
                    key={index}
                    style={[
                      styles.bubbleContainer,
                      isMe ? styles.bubbleContainerRight : styles.bubbleContainerLeft,
                      isSystem && { alignSelf: 'center' },
                    ]}
                  >
                    <View
                      style={[
                        styles.bubble,
                        isMe
                          ? styles.bubbleRight
                          : isSystem
                          ? styles.bubbleSystem
                          : styles.bubbleLeft,
                      ]}
                    >
                      {!isMe && !isSystem && (
                        <Text style={
                          isAndroidTV
                            ? [styles.senderName, { color: getStyleColor(styles.senderName) }]
                            : styles.senderName
                        }>
                          {item.sender}
                        </Text>
                      )}
                      <Text
                        style={
                          isSystem
                            ? isAndroidTV
                              ? [styles.systemText, { color: getStyleColor(styles.systemText) }]
                              : styles.systemText
                            : isAndroidTV
                              ? [styles.messageText, { color: getStyleColor(styles.messageText) }]
                              : styles.messageText
                        }
                      >
                        {item.text}
                      </Text>
                    </View>
                  </View>
                );
              })}
              {messages.length === 0 && (
                <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>
                  No messages yet. Start the conversation!
                </Text>
              )}
            </ScrollView>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={[...messages].reverse()}
            renderItem={renderItem}
            keyExtractor={(_, i) => i.toString()}
            style={styles.list}
            contentContainerStyle={{ paddingBottom: 10, flexGrow: 1, justifyContent: 'flex-end' }}
            inverted
          />
        )
      ) : (
        renderVideoPlaceholders()
      )}
      <View style={styles.inputContainer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={isAndroidTV ? 'Type a mess....' : 'Type a message'}
          style={styles.input}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
          placeholderTextColor={isAndroidTV ? '#555' : undefined}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    gap: 10,
  },
  toggleButton: {
    backgroundColor: '#222',
    paddingVertical: 8,
    paddingHorizontal: 22,
    borderRadius: 18,
    marginHorizontal: 4,
  },
  toggleButtonActive: {
    backgroundColor: '#fff',
  },
  toggleButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  toggleButtonTextActive: {
    color: '#222',
  },
  videoContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'stretch',
    backgroundColor: '#181818',
    paddingVertical: 30,
    gap: 24,
  },
  videoBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222',
    borderRadius: 16,
    marginHorizontal: 24,
    marginVertical: 0,
    paddingVertical: 32,
    paddingHorizontal: 10,
  },
  videoImage: {
    width: 50,
    height: 50,
    borderRadius: 64,
    marginBottom: 12,
  },
  videoUsername: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  chatContainer: {
    flex: 1,
    minHeight: 220,
    borderTopWidth: 1,
    borderColor: '#303030',
    backgroundColor: '#181818',
  },
  list: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  bubbleContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  bubbleContainerRight: {
    justifyContent: 'flex-end',
  },
  bubbleContainerLeft: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bubbleRight: {
    backgroundColor: '#F0F0F0',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
  },
  bubbleLeft: {
    backgroundColor: '#E4E6EB',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 6,
  },
  bubbleSystem: {
    backgroundColor: '#333',
    alignSelf: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#888',
    marginTop: 4,
  },
  messageText: {
    color: '#222',
    fontSize: 16,
  },
  systemText: {
    color: '#fff',
    fontSize: 15,
    fontStyle: 'italic',
  },
  senderName: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#303030',
    backgroundColor: '#000',
  },
  input: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#555',
    backgroundColor: '#333',
    color: 'white',
    marginRight: 8,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
