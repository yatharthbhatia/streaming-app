import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './src/screens/HomeScreen';
import RoomScreen from './src/screens/RoomScreen';
import LoginScreen from './src/screens/LoginScreen';
import AuthLoadingScreen from './src/screens/AuthLoadingScreen';
import { LogBox } from 'react-native';

// dev -> to ignored warnings
LogBox.ignoreLogs([
  "Can't open url: about:srcdoc"
]);

const Stack = createStackNavigator();

function MainStack({ route }) {
  return (
    <Stack.Navigator id={undefined}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        initialParams={{ username: route?.params?.username }}
      />
      <Stack.Screen name="Room" component={RoomScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        id={undefined}
        initialRouteName="AuthLoading"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="AuthLoading" component={AuthLoadingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={MainStack} />
      </Stack.Navigator>
    </NavigationContainer>
  );
} 