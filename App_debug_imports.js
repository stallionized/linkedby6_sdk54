import React, { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, StatusBar, Platform, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Test imports one by one
let AuthProvider, useAuth, SplashScreen, LandingPage, LoginScreen, SearchScreen, Toast;

try {
  console.log("Testing Auth import...");
  const AuthModule = require('./Auth');
  AuthProvider = AuthModule.AuthProvider;
  useAuth = AuthModule.useAuth;
  console.log("Auth import successful");
} catch (error) {
  console.error("Auth import failed:", error);
  AuthProvider = ({ children }) => children;
  useAuth = () => ({ user: null, loading: false });
}

try {
  console.log("Testing SplashScreen import...");
  SplashScreen = require('./SplashScreen').default;
  console.log("SplashScreen import successful");
} catch (error) {
  console.error("SplashScreen import failed:", error);
  SplashScreen = () => (
    <View style={styles.fallbackScreen}>
      <Text style={styles.fallbackText}>Splash Screen Error</Text>
    </View>
  );
}

try {
  console.log("Testing LandingPage import...");
  LandingPage = require('./LandingPage').default;
  console.log("LandingPage import successful");
} catch (error) {
  console.error("LandingPage import failed:", error);
  LandingPage = () => (
    <View style={styles.fallbackScreen}>
      <Text style={styles.fallbackText}>Landing Page Error</Text>
    </View>
  );
}

try {
  console.log("Testing LoginScreen import...");
  LoginScreen = require('./LoginScreen').default;
  console.log("LoginScreen import successful");
} catch (error) {
  console.error("LoginScreen import failed:", error);
  LoginScreen = () => (
    <View style={styles.fallbackScreen}>
      <Text style={styles.fallbackText}>Login Screen Error</Text>
    </View>
  );
}

try {
  console.log("Testing SearchScreen import...");
  SearchScreen = require('./SearchScreen').default;
  console.log("SearchScreen import successful");
} catch (error) {
  console.error("SearchScreen import failed:", error);
  SearchScreen = () => (
    <View style={styles.fallbackScreen}>
      <Text style={styles.fallbackText}>Search Screen Error</Text>
    </View>
  );
}

try {
  console.log("Testing Toast import...");
  Toast = require('react-native-toast-message').default;
  console.log("Toast import successful");
} catch (error) {
  console.error("Toast import failed:", error);
  Toast = () => null;
}

const Stack = createStackNavigator();

function AppNavigator() {
  console.log("AppNavigator rendering...");
  const { user, loading } = useAuth();

  if (loading) {
    console.log("Auth still loading...");
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const initialRouteName = user ? "Search" : "Landing";
  console.log("Auth loaded, initialRoute:", initialRouteName);

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
    </Stack.Navigator>
  );
}

function AppContent() {
  console.log("AppContent rendering...");
  const { loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashFinish = () => {
    console.log("Splash finished");
    setShowSplash(false);
  };

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      console.log("Splash timeout, forcing main app");
      setShowSplash(false);
    }, 3000);

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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E53E3E',
    marginBottom: 10,
    textAlign: 'center',
  },
});
