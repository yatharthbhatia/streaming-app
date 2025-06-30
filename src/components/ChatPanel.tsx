import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, FlatList, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { getSocket, disconnectSocket } from '../utils/wsClient';

export default function ChatPanel({ roomCode, username }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState(null);
  const flatListRef = useRef(null);

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

  // message rendering
  const renderItem = ({ item }) => {
    const isMe = item.sender === username;
    const isSystem = item.sender === 'System';
    return (
      <View
        style={[
          styles.bubbleContainer,
          isMe ? styles.bubbleContainerRight : styles.bubbleContainerLeft,
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
            <Text style={styles.senderName}>{item.sender}</Text>
          )}
          <Text style={isSystem ? styles.systemText : styles.messageText}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <FlatList
        ref={flatListRef}
        data={[...messages].reverse()}
        renderItem={renderItem}
        keyExtractor={(_, i) => i.toString()}
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 10, flexGrow: 1, justifyContent: 'flex-end' }}
        inverted
      />
      <View style={styles.inputContainer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type a message"
          style={styles.input}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
