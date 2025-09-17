import React, { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, StatusBar, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './Auth';
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
import ConversationScreen from './ConversationScreen';
import BusinessPricingScreen from './BusinessPricingScreen'; // Add BusinessPricingScreen
import BusinessProfileScreen from './BusinessProfileScreen'; // Add BusinessProfileScreen
import BusinessConnectionsScreen from './BusinessConnectionsScreen'; // Add BusinessConnectionsScreen
import BusinessMessagesScreen from './BusinessMessagesScreen'; // Add BusinessMessagesScreen
import BusinessAnalyticsScreen from './BusinessAnalyticsScreen'; // Add BusinessAnalyticsScreen
import BusinessDashboardScreen from './BusinessDashboardScreen'; // Add BusinessDashboardScreen
import BillingScreen from './billingscreen'; // Fixed import path (matches your file name)
import ADP from './investors/ADP'; // Add ADP Investor Screen for preview
import Toast from 'react-native-toast-message';

const Stack = createStackNavigator();

function AppNavigator() {
  const { user, loading } = useAuth();
  const [isBusinessMode, setIsBusinessMode] = useState(false);

  // Show loading screen while checking authentication
  if (loading) {
    return null; // The splash screen will handle this
  }

  // Determine initial route based on authentication state
  const initialRouteName = user ? "Search" : "Landing";

  // Business mode toggle handler
  const handleBusinessModeToggle = (businessMode) => {
    setIsBusinessMode(businessMode);
  };

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
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
        options={{
          // Disable default swipe back to prevent conflicts with chat slider
          gestureEnabled: false,
          // Ensure proper animation for SearchScreen
          animationEnabled: true,
          cardStyleInterpolator: ({ current }) => {
            return {
              cardStyle: {
                opacity: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            };
          },
        }}
      >
        {(props) => (
          <SearchScreen 
            {...props} 
            isBusinessMode={isBusinessMode}
            onBusinessModeToggle={handleBusinessModeToggle}
          />
        )}
      </Stack.Screen>
      
      {/* Business Pricing Screen - first step for subscription */}
      <Stack.Screen 
        name="BusinessPricing" 
        component={BusinessPricingScreen}
        options={{
          gestureEnabled: true,
          title: 'Business Pricing', // For accessibility
        }}
      />
      
      {/* Business Profile Screen - for editing business profile */}
      <Stack.Screen 
        name="BusinessProfile" 
        component={BusinessProfileScreen}
        options={{
          gestureEnabled: true,
          title: 'Business Profile', // For accessibility
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
          cardStyleInterpolator: ({ current }) => {
            return {
              cardStyle: {
                opacity: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            };
          },
        }}
      />
      <Stack.Screen 
        name="ProjectQueue" 
        component={ProjectQueueScreen}
        options={{
          gestureEnabled: true,
          title: 'Project Queue', // For accessibility
          cardStyleInterpolator: ({ current }) => {
            return {
              cardStyle: {
                opacity: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            };
          },
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
          cardStyleInterpolator: ({ current }) => {
            return {
              cardStyle: {
                opacity: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            };
          },
        }}
      />
      <Stack.Screen 
        name="Conversation" 
        component={ConversationScreen}
        options={{
          gestureEnabled: true,
          title: 'Conversation', // For accessibility
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
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          gestureEnabled: true,
          title: 'Settings', // For accessibility
        }}
      />
      
      {/* Business Navigation Screens */}
      <Stack.Screen 
        name="BusinessConnections" 
        component={BusinessConnectionsScreen}
        options={{
          gestureEnabled: true,
          title: 'Business Connections', // For accessibility
          cardStyleInterpolator: ({ current }) => {
            return {
              cardStyle: {
                opacity: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            };
          },
        }}
      />
      <Stack.Screen 
        name="BusinessMessages" 
        component={BusinessMessagesScreen}
        options={{
          gestureEnabled: true,
          title: 'Business Messages', // For accessibility
          cardStyleInterpolator: ({ current }) => {
            return {
              cardStyle: {
                opacity: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            };
          },
        }}
      />
      <Stack.Screen 
        name="BusinessAnalytics" 
        options={{
          gestureEnabled: true,
          title: 'Business Analytics', // For accessibility
          cardStyleInterpolator: ({ current }) => {
            return {
              cardStyle: {
                opacity: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            };
          },
        }}
      >
        {(props) => (
          <BusinessAnalyticsScreen 
            {...props} 
            isBusinessMode={isBusinessMode}
            onBusinessModeToggle={handleBusinessModeToggle}
          />
        )}
      </Stack.Screen>
      <Stack.Screen 
        name="BusinessDashboard" 
        options={{
          gestureEnabled: true,
          title: 'Business Dashboard', // For accessibility
          cardStyleInterpolator: ({ current }) => {
            return {
              cardStyle: {
                opacity: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            };
          },
        }}
      >
        {(props) => (
          <BusinessDashboardScreen
            {...props}
            isBusinessMode={isBusinessMode}
            onBusinessModeToggle={handleBusinessModeToggle}
          />
        )}
      </Stack.Screen>

      {/* ADP Investor Screen for preview */}
      <Stack.Screen
        name="ADP"
        component={ADP}
        options={{
          gestureEnabled: true,
          title: 'ADP Investment Presentation', // For accessibility
        }}
      />
    </Stack.Navigator>
  );
}

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const { loading } = useAuth();

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* StatusBar configuration optimized for mobile */}
      <StatusBar 
        barStyle="light-content"
        backgroundColor="#1E88E5" 
        translucent={false}
        animated={true}
      />
      
      {showSplash ? (
        <SplashScreen onFinish={handleSplashFinish} loading={loading} />
      ) : (
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      )}
      <Toast />
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
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
