import React, { useState } from 'react';
import { View, Button, TextInput, Text } from 'react-native';

export default function HomeScreen({ navigation, route }) {
  const [roomCode, setRoomCode] = useState('');
  const username = route.params?.username;

  const createRoom = async () => {
    const res = await fetch(`${process.env.EXPO_PUBLIC_SOCKET_URL}/room`, { method: 'POST' });
    console.log('Room creation response:', await res.clone().json());
    const data = await res.json();
    navigation.navigate('Room', { roomCode: data.roomCode, username });
  };

  const joinRoom = () => {
    navigation.navigate('Room', { roomCode, username });
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      {username && <Text style={{ fontSize: 18, marginBottom: 20 }}>Welcome, {username}!</Text>}
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