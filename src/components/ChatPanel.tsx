import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, FlatList, Text, StyleSheet } from 'react-native';
import { getSocket, disconnectSocket } from '../utils/wsClient';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

export default function ChatPanel({ roomCode, username }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState(null);

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
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      resetScrollToCoords={{ x: 0, y: 0 }}
      scrollEnabled={false}
    >
      <FlatList
        data={messages}
        renderItem={({ item }) => (
          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>
              <Text style={styles.senderText}>{item.sender}:</Text> {item.text}
            </Text>
          </View>
        )}
        keyExtractor={(_, i) => i.toString()}
        style={styles.list}
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
        <Button title="Send" onPress={sendMessage} />
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  contentContainer: {
    flexGrow: 1,
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
    borderTopColor: '#ccc',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 8,
    padding: 8,
    borderRadius: 5,
  },
  messageContainer: {
    marginBottom: 5,
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  messageText: {
    color: 'black',
  },
  senderText: {
    fontWeight: 'bold',
    color: 'black',
  },
});
