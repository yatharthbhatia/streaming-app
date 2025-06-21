import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './src/screens/HomeScreen';
import RoomScreen from './src/screens/RoomScreen';
import LoginScreen from './src/screens/LoginScreen';

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
        initialRouteName="Login"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={MainStack} />
      </Stack.Navigator>
    </NavigationContainer>
  );
} 