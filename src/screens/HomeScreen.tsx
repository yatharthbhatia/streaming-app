import React, { useState } from 'react';
import { View, Button, TextInput, Text } from 'react-native';

export default function HomeScreen({ navigation }) {
  const [roomCode, setRoomCode] = useState('');

  const createRoom = async () => {
    const res = await fetch('http://localhost:3000/room', { method: 'POST' });
    const data = await res.json();
    navigation.navigate('Room', { roomCode: data.roomCode });
  };

  const joinRoom = () => {
    navigation.navigate('Room', { roomCode });
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button title="Create Room" onPress={createRoom} />
      <Text style={{ margin: 20 }}>OR</Text>
      <TextInput
        placeholder="Enter Room Code"
        value={roomCode}
        onChangeText={setRoomCode}
        style={{ borderWidth: 1, width: 200, marginBottom: 10, padding: 8 }}
      />
      <Button title="Join Room" onPress={joinRoom} />
    </View>
  );
} 