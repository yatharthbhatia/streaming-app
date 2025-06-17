import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, FlatList, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { getSocket } from '../utils/wsClient';

export default function ChatPanel({ roomCode }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const socket = getSocket();

  useEffect(() => {
    if (roomCode) {
      socket.emit('joinRoom', { roomCode });

      socket.on('chatMessage', (message) => {
        setMessages((prevMessages) => [...prevMessages, message]);
      });
    }

    return () => {
      socket.off('chatMessage');
      // TODO: Consider adding socket.emit('leaveRoom', { roomCode }) to track when users leave rooms
    };
  }, [roomCode]);

  const sendMessage = () => {
    if (input.trim() && roomCode) {
      socket.emit('chatMessage', { roomCode, message: input });
      setInput('');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <View style={{ flex: 1, padding: 10 }}>
        <FlatList
          data={messages}
          renderItem={({ item }) => (
            <Text style={{ marginBottom: 4 }}>
              <Text style={{ fontWeight: 'bold' }}>{item.sender.substring(0, 4)}:</Text> {item.text}
            </Text>
          )}
          keyExtractor={(_, i) => i.toString()}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 10 }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type a message"
            style={{ borderWidth: 1, flex: 1, marginRight: 8, padding: 8, borderRadius: 5, borderColor: '#ccc' }}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <Button title="Send" onPress={sendMessage} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
