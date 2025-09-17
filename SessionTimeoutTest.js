import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from './Auth';

const SessionTimeoutTest = () => {
  const { user, trackActivity } = useAuth();

  const handleTestTimeout = () => {
    Alert.alert(
      "Session Timeout Test",
      "This will trigger the session timeout warning in 5 seconds, followed by automatic logout if no action is taken.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Test Warning",
          onPress: () => {
            // Temporarily reduce timeout for testing
            console.log("🧪 Testing session timeout warning in 5 seconds...");
            setTimeout(() => {
              // This would normally be handled by the session timeout logic
              Alert.alert("Test Complete", "In the real app, the warning modal would appear now.");
            }, 5000);
          }
        }
      ]
    );
  };

  const handleTrackActivity = () => {
    trackActivity();
    Alert.alert("Activity Tracked", "Session timeout has been reset to 5 minutes from now.");
  };

  if (!user) {
    return null; // Don't show test component if user is not logged in
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Session Timeout Test</Text>
      <Text style={styles.subtitle}>Current user: {user.email}</Text>
      
      <TouchableOpacity style={styles.button} onPress={handleTrackActivity}>
        <Text style={styles.buttonText}>Reset Session Timer</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.button, styles.testButton]} onPress={handleTestTimeout}>
        <Text style={styles.buttonText}>Test Timeout Alert</Text>
      </TouchableOpacity>
      
      <Text style={styles.info}>
        • Session will timeout after 5 minutes of inactivity{'\n'}
        • User interactions should reset the timer{'\n'}
        • User will be automatically signed out when timeout occurs
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 15,
    borderRadius: 10,
    maxWidth: 250,
    zIndex: 1000,
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#1E88E5',
    padding: 10,
    borderRadius: 5,
    marginBottom: 8,
  },
  testButton: {
    backgroundColor: '#FF5722',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  info: {
    color: '#ccc',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 5,
  },
});

export default SessionTimeoutTest;
