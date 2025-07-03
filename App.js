import React, { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, StatusBar, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './Auth';
import SplashScreen from './SplashScreen';
import LandingPage from './LandingPage';
import LoginScreen from './LoginScreen';
import SearchScreen from './SearchScreen';
import SettingsScreen from './SettingsScreen';
import RecommendedBusinessesScreen from './RecommendedBusinessesScreen';
import ProjectQueueScreen from './ProjectQueueScreen';
import ConnectionsScreen from './ConnectionsScreen';

const Stack = createStackNavigator();

function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Landing"
      screenOptions={{
        headerShown: false, // Hide headers for all screens
        cardStyle: { backgroundColor: 'transparent' },
        animationEnabled: true,
        // Add gesture configuration for better slider performance
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        cardStyleInterpolator: ({ current, layouts }) => {
          return {
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
          };
        },
      }}
    >
      <Stack.Screen name="Landing" component={LandingPage} />
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
      <Stack.Screen 
        name="Search" 
        component={SearchScreen}
        options={{
          // Specific options for SearchScreen if needed
          gestureEnabled: false, // Disable swipe back to prevent conflicts with chat slider
        }}
      />
      <Stack.Screen 
        name="RecommendedBusinesses" 
        component={RecommendedBusinessesScreen}
        options={{
          // Enable swipe back for RecommendedBusinesses screen
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="ProjectQueue" 
        component={ProjectQueueScreen}
        options={{
          // Enable swipe back for ProjectQueue screen
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="Connections" 
        component={ConnectionsScreen}
        options={{
          // Enable swipe back for Connections screen
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          // Enable swipe back for Settings screen
          gestureEnabled: true,
        }}
      />
      {/* Add more screens here as you convert them */}
      {/* <Stack.Screen name="Registration" component={RegistrationScreen} /> */}
      {/* <Stack.Screen name="Projects" component={ProjectsScreen} /> */}
      {/* <Stack.Screen name="Messages" component={MessagesScreen} /> */}
      {/* <Stack.Screen name="Profile" component={ProfileScreen} /> */}
    </Stack.Navigator>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <GestureHandlerRootView style={styles.container}>
          {/* Set StatusBar style for the entire app */}
          <StatusBar 
            barStyle={Platform.OS === 'ios' ? 'light-content' : 'light-content'} 
            backgroundColor="#1E88E5" 
            translucent={false}
          />
          
          {showSplash ? (
            <SplashScreen onFinish={handleSplashFinish} />
          ) : (
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          )}
        </GestureHandlerRootView>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA', // Match the app's background color
  },
});
