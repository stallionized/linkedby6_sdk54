import React, { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, StatusBar, Platform, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import only essential components first to test
import { AuthProvider, useAuth } from './Auth';
import SplashScreen from './SplashScreen';
import LandingPage from './LandingPage';
import LoginScreen from './LoginScreen';
import SearchScreen from './SearchScreen';
import Toast from 'react-native-toast-message';

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

  // Show loading screen while checking authentication
  if (loading) {
    console.log("Auth still loading, showing fallback...");
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Determine initial route based on authentication state
  const initialRouteName = user ? "Search" : "Landing";
  console.log("Auth loaded, user:", user ? "authenticated" : "not authenticated", "initialRoute:", initialRouteName);

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent' },
        animationEnabled: true,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen name="Landing" component={LandingPage} />
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      {/* Add other screens gradually after testing */}
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
  console.log("Main App component rendering...");
  
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
