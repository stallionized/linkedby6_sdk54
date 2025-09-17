import React, { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, StatusBar, Platform, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Simple test screens
const TestScreen = ({ route }) => {
  const screenName = route?.name || 'Test';
  return (
    <View style={styles.testScreen}>
      <Text style={styles.testText}>{screenName} Screen</Text>
      <Text style={styles.testSubtext}>This screen is working correctly!</Text>
    </View>
  );
};

const Stack = createStackNavigator();

function AppNavigator() {
  console.log("AppNavigator rendering...");
  
  return (
    <Stack.Navigator
      initialRouteName="Landing"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent' },
        animationEnabled: true,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen name="Landing" component={TestScreen} />
      <Stack.Screen name="Search" component={TestScreen} />
    </Stack.Navigator>
  );
}

function AppContent() {
  console.log("AppContent rendering...");
  const [showSplash, setShowSplash] = useState(false); // Start with false to skip splash

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar 
        barStyle="light-content"
        backgroundColor="#1E88E5" 
        translucent={false}
        animated={true}
      />
      
      {showSplash ? (
        <View style={styles.splashContainer}>
          <Text style={styles.splashText}>Loading...</Text>
        </View>
      ) : (
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      )}
    </GestureHandlerRootView>
  );
}

export default function App() {
  console.log("Main App component rendering...");
  
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  testScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 20,
  },
  testText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E88E5',
    marginBottom: 10,
    textAlign: 'center',
  },
  testSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d47a1',
  },
  splashText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
});
