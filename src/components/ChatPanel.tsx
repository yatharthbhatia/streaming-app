import React, { useState } from 'react';
import { View, TextInput, Button, FlatList, Text } from 'react-native';

export default function ChatPanel({ roomCode }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  // TODO: Connect to backend via WebSocket for real-time chat

  const sendMessage = () => {
    // TODO: Emit message to backend
    setMessages([...messages, { text: input, sender: 'me' }]);
    setInput('');
  };

  return (
    <View style={{ flex: 1, padding: 10 }}>
      <FlatList
        data={messages}
        renderItem={({ item }) => <Text>{item.sender}: {item.text}</Text>}
        keyExtractor={(_, i) => i.toString()}
        style={{ flex: 1 }}
      />
      <TextInput
        value={input}
        onChangeText={setInput}
        placeholder="Type a message"
        style={{ borderWidth: 1, marginBottom: 8, padding: 6 }}
      />
      <Button title="Send" onPress={sendMessage} />
    </View>
  );
} 