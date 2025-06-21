import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const API_URL = process.env.EXPO_PUBLIC_SOCKET_URL;

  const handleAuth = async () => {

    // Alert.alert('Connecting to...', `${API_URL}/register`);

    const endpoint = isRegistering ? '/register' : '/login';
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        if (isRegistering) {
          Alert.alert('Success', 'Registration successful! Please log in.');
          setIsRegistering(false);
        } else {
          // Login successful, save token and navigate
          await SecureStore.setItemAsync('authToken', data.token);
          navigation.replace('Main', { username: data.username });
        }
      } else {
        Alert.alert('Error', data.error || 'An unknown error occurred.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Network Error', 'Could not connect to the server.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isRegistering ? 'Register' : 'Login'}</Text>
      <TextInput
        value={username}
        onChangeText={setUsername}
        placeholder="Username"
        style={styles.input}
        autoCapitalize="none"
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        style={styles.input}
        secureTextEntry
      />
      <Button title={isRegistering ? 'Register' : 'Login'} onPress={handleAuth} />
      <View style={{ marginTop: 12 }}>
        <Button
          title={isRegistering ? 'Back to Login' : 'Need an account? Register'}
          onPress={() => setIsRegistering(!isRegistering)}
          color="#888"
        />
      </View>
    </View>
  );
}

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    width: '80%',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 20,
    borderRadius: 5,
  },
}); 