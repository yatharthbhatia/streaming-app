import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';

export default function AuthLoadingScreen({ navigation }) {
  useEffect(() => {
    const checkAuthToken = async () => {
      try {
        const token = await SecureStore.getItemAsync('authToken');

        if (token) {
          const decodedToken = jwtDecode(token);
          if (decodedToken.exp * 1000 > Date.now()) {
            // Token isvalid & !expired -> main page
            navigation.replace('Main', { username: (decodedToken as any).username });
            return;
          }
        }
      } catch (error) {
        console.error('Error checking auth token:', error);
      }
      
      // If !token, token isexpired -> go to Login
      navigation.replace('Login');
    };

    checkAuthToken();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 