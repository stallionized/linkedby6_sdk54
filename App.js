import React, { useState, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, StatusBar, Platform, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { navigationRef } from './navigationRef';
import { webRootContainer } from './utils/webScrollStyles';
import { injectWebScrollbarStyles } from './utils/webScrollbarStyles';
import './global.css';

// Import only essential components first to test
import { AuthProvider, useAuth } from './Auth';
import PushNotificationService from './services/PushNotificationService';
import SplashScreen from './SplashScreen';
import ConsumerLandingPageNew from './ConsumerLandingPageNew';
import ADPPageNew from './ADPPageNew';
import LandingPage from './LandingPage';
import BusinessLandingPage from './BusinessLandingPage';
import LoginScreen from './LoginScreen';
import RegistrationScreen from './RegistrationScreen';
import OTPVerificationScreen from './OTPVerificationScreen';
import ZipCodeIntakeScreen from './ZipCodeIntakeScreen';
import AccessCodeScreen from './AccessCodeScreen';
import SearchScreen from './SearchScreen';
import ConnectionsScreen from './ConnectionsScreen';
import MessagesScreen from './MessagesScreen';
import ProjectQueueScreen from './ProjectQueueScreen';
import RecommendedBusinessesScreen from './RecommendedBusinessesScreen';
import BusinessPricingScreen from './BusinessPricingScreen';
import BusinessProfileScreen from './BusinessProfileScreen';
import BusinessAnalyticsScreen from './BusinessAnalyticsScreen';
import BusinessDashboardScreen from './BusinessDashboardScreen';
import BusinessConnectionsScreen from './BusinessConnectionsScreen';
import BusinessMessagesScreen from './BusinessMessagesScreen';
import AccessCodeManagementScreen from './AccessCodeManagementScreen';
import WaitlistManagementScreen from './WaitlistManagementScreen';
import ConversationScreen from './ConversationScreen';
import Toast from 'react-native-toast-message';
import ActivityTracker from './components/ActivityTracker';

const Stack = createStackNavigator();

// Simple fallback component in case of import errors
const FallbackScreen = ({ route }) => {
  const screenName = route?.name || 'Fallback';
  return (
    <View style={styles.fallbackScreen}>
      <Text style={styles.fallbackText}>{screenName} Screen</Text>
      <Text style={styles.fallbackSubtext}>This screen is loading...</Text>
    </View>
  );
};

function AppNavigator() {
  console.log("AppNavigator rendering...");
  const { user, loading } = useAuth();
  const [isBusinessMode, setIsBusinessMode] = useState(false);

  // Log auth state changes
  useEffect(() => {
    console.log("🔄 Auth state changed - user:", user ? 'logged in' : 'logged out');
  }, [user]);

  // Initialize push notifications when user is authenticated
  useEffect(() => {
    const initializePushNotifications = async () => {
      if (user && user.id) {
        try {
          console.log("📱 Initializing push notifications for user:", user.id);
          await PushNotificationService.initialize({
            onNotificationReceived: (notification) => {
              console.log("📬 Notification received in app:", notification);
              const data = notification.request.content.data;

              // Handle incoming call notifications
              if (data?.type === 'incoming_call') {
                console.log("📞 Incoming call notification:", data);
                // The WebRTCService will handle the call via Supabase Realtime
                // This notification is just for when the app is in background
              }
            },
            onNotificationResponse: (response, data) => {
              console.log("👆 Notification tapped:", data);

              // Navigate based on notification type
              if (data?.type === 'incoming_call' && data?.callId) {
                // Navigate to the call screen or handle the call
                console.log("📞 User tapped incoming call notification");
              } else if (data?.type === 'message') {
                // Navigate to messages
                navigationRef.current?.navigate('Messages');
              }
            },
          });
          console.log("✅ Push notifications initialized successfully");
        } catch (error) {
          console.error("❌ Failed to initialize push notifications:", error);
        }
      }
    };

    initializePushNotifications();

    // Cleanup on unmount or user logout
    return () => {
      if (!user) {
        PushNotificationService.destroy();
      }
    };
  }, [user]);

  // Show loading screen while checking authentication
  if (loading) {
    console.log("Auth still loading, showing fallback...");
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // More robust authentication check - ensure user object has required properties
  const isAuthenticated = user && user.id && user.email;
  const initialRouteName = isAuthenticated ? "Search" : "Landing";

  console.log("🔍 Auth loaded - User object:", user ? { id: user.id, email: user.email } : null);
  console.log("🎯 Navigation initial route:", initialRouteName);

  const handleBusinessModeToggle = (businessMode) => {
    console.log("Business mode toggled to:", businessMode);
    setIsBusinessMode(businessMode);
  };

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent' },
        animationEnabled: true,
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="Landing" component={ConsumerLandingPageNew} />
      <Stack.Screen name="LandingOld" component={LandingPage} />
      <Stack.Screen name="BusinessLanding" component={BusinessLandingPage} />
      <Stack.Screen name="InvestorADP" component={ADPPageNew} />
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Registration" component={RegistrationScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      <Stack.Screen name="ZipCodeIntake" component={ZipCodeIntakeScreen} />
      <Stack.Screen name="AccessCode" component={AccessCodeScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="Connections" component={ConnectionsScreen} />
      <Stack.Screen name="Messages" component={MessagesScreen} />
      <Stack.Screen name="Conversation" component={ConversationScreen} />
      <Stack.Screen name="ProjectQueue" component={ProjectQueueScreen} />
      <Stack.Screen name="RecommendedBusinesses" component={RecommendedBusinessesScreen} />
      <Stack.Screen name="BusinessPricing">
        {(props) => <BusinessPricingScreen {...props} />}
      </Stack.Screen>
      <Stack.Screen name="BusinessProfileScreen">
        {(props) => <BusinessProfileScreen {...props} />}
      </Stack.Screen>
      <Stack.Screen name="BusinessAnalytics">
        {(props) => (
          <BusinessAnalyticsScreen
            {...props}
            isBusinessMode={isBusinessMode}
            onBusinessModeToggle={handleBusinessModeToggle}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="BusinessDashboard">
        {(props) => (
          <BusinessDashboardScreen
            {...props}
            isBusinessMode={isBusinessMode}
            onBusinessModeToggle={handleBusinessModeToggle}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="BusinessConnections">
        {(props) => (
          <BusinessConnectionsScreen
            {...props}
            isBusinessMode={isBusinessMode}
            onBusinessModeToggle={handleBusinessModeToggle}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="BusinessMessages">
        {(props) => (
          <BusinessMessagesScreen
            {...props}
            isBusinessMode={isBusinessMode}
            onBusinessModeToggle={handleBusinessModeToggle}
          />
        )}
      </Stack.Screen>
      {/* Admin screens */}
      <Stack.Screen name="AccessCodeManagement" component={AccessCodeManagementScreen} />
      <Stack.Screen name="WaitlistManagement" component={WaitlistManagementScreen} />
    </Stack.Navigator>
  );
}

function AppContent() {
  console.log("AppContent rendering...");
  const { loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashFinish = () => {
    console.log("Splash finished, showing main app");
    setShowSplash(false);
  };

  // Add timeout fallback for splash screen
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      console.log("Splash timeout reached, forcing main app to show");
      setShowSplash(false);
    }, 5000); // 5 second maximum splash time

    return () => clearTimeout(timeout);
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#1E88E5"
        translucent={false}
        animated={true}
      />
      <ActivityTracker>
        {showSplash ? (
          <SplashScreen onFinish={handleSplashFinish} loading={loading} />
        ) : (
          <NavigationContainer ref={navigationRef}>
            <AppNavigator />
          </NavigationContainer>
        )}
      </ActivityTracker>
      <Toast />
    </GestureHandlerRootView>
  );
}

export default function App() {
  console.log("Main App component rendering...");

  // Inject custom scrollbar styles for web on mount
  React.useEffect(() => {
    injectWebScrollbarStyles();
  }, []);

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
    ...webRootContainer,
    backgroundColor: '#F5F7FA',
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    fontSize: 18,
    color: '#1E88E5',
    fontWeight: 'bold',
  },
  fallbackScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 20,
  },
  fallbackText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E88E5',
    marginBottom: 10,
    textAlign: 'center',
  },
  fallbackSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
