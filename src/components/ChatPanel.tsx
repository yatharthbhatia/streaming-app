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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <FlatList
        ref={flatListRef}
        data={[...messages].reverse()}
        renderItem={({ item }) => (
          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>
              <Text style={styles.senderText}>{item.sender}:</Text> {item.text}
            </Text>
          </View>
        )}
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
  messageContainer: {
    marginBottom: 8,
    backgroundColor: '#252525',
    padding: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  messageText: {
    color: 'white',
    fontSize: 16,
  },
  senderText: {
    fontWeight: 'bold',
    color: '#00c1ff',
  },
});
