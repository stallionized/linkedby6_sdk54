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
import RegistrationScreen from './RegistrationScreen';
import SearchScreen from './SearchScreen';
import SettingsScreen from './SettingsScreen';
import RecommendedBusinessesScreen from './RecommendedBusinessesScreen';
import ProjectQueueScreen from './ProjectQueueScreen';
import ConnectionsScreen from './ConnectionsScreen';
import MessagesScreen from './MessagesScreen';
import BusinessPricingScreen from './BusinessPricingScreen'; // Add BusinessPricingScreen
import BillingScreen from './billingscreen'; // Fixed import path (matches your file name)
import Toast from 'react-native-toast-message';

const Stack = createStackNavigator();

function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Landing"
      screenOptions={{
        headerShown: false, // Hide headers for all screens
        cardStyle: { backgroundColor: 'transparent' },
        animationEnabled: true,
        // Default gesture configuration
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
        name="Registration" 
        component={RegistrationScreen}
        options={{
          gestureEnabled: true,
          title: 'Create Account', // For accessibility
        }}
      />
      
      {/* SearchScreen with custom gesture handling */}
      <Stack.Screen 
        name="Search" 
        component={SearchScreen}
        options={{
          // Disable default swipe back to prevent conflicts with chat slider
          gestureEnabled: false,
          // Ensure proper animation for SearchScreen
          animationEnabled: true,
        }}
      />
      
      {/* Business Pricing Screen - first step for subscription */}
      <Stack.Screen 
        name="BusinessPricing" 
        component={BusinessPricingScreen}
        options={{
          gestureEnabled: true,
          title: 'Business Pricing', // For accessibility
        }}
      />
      
      {/* Billing Screen - second step for payment */}
      <Stack.Screen 
        name="Billing" 
        component={BillingScreen}
        options={{
          gestureEnabled: true,
          title: 'Billing & Payments', // For accessibility
        }}
      />
      
      {/* Other main screens */}
      <Stack.Screen 
        name="RecommendedBusinesses" 
        component={RecommendedBusinessesScreen}
        options={{
          gestureEnabled: true,
          title: 'Recommended Businesses', // For accessibility
        }}
      />
      <Stack.Screen 
        name="ProjectQueue" 
        component={ProjectQueueScreen}
        options={{
          gestureEnabled: true,
          title: 'Project Queue', // For accessibility
        }}
      />
      <Stack.Screen 
        name="Connections" 
        component={ConnectionsScreen}
        options={{
          gestureEnabled: false,
          title: 'Connections', // For accessibility
          cardStyleInterpolator: ({ current, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateX: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 0],
                    }),
                  },
                ],
              },
            };
          },
        }}
      />
      <Stack.Screen 
        name="Messages" 
        component={MessagesScreen}
        options={{
          gestureEnabled: true,
          title: 'Messages', // For accessibility
        }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          gestureEnabled: true,
          title: 'Settings', // For accessibility
        }}
      />
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
          {/* StatusBar configuration optimized for mobile */}
          <StatusBar 
            barStyle="light-content"
            backgroundColor="#1E88E5" 
            translucent={false}
            animated={true}
          />
          
          {showSplash ? (
            <SplashScreen onFinish={handleSplashFinish} />
          ) : (
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          )}
          <Toast />
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
