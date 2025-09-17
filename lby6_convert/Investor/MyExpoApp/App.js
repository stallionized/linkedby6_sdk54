import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Linking } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import ADP from './ADP';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');

  useEffect(() => {
    // Check for web URL paths
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path === '/adp' || path.includes('adp')) {
        setCurrentPage('adp');
      }
    }

    // Handle initial URL when app opens (mobile)
    const handleInitialURL = async () => {
      const initialURL = await ExpoLinking.getInitialURL();
      if (initialURL) {
        handleDeepLink(initialURL);
      }
    };

    // Handle URL changes while app is running (mobile)
    const handleURL = (event) => {
      handleDeepLink(event.url);
    };

    const handleDeepLink = (url) => {
      const { path } = ExpoLinking.parse(url);
      if (path === 'adp') {
        setCurrentPage('adp');
      }
    };

    handleInitialURL();
    
    const subscription = ExpoLinking.addEventListener('url', handleURL);
    
    return () => subscription?.remove();
  }, []);

  if (currentPage === 'adp') {
    return <ADP onBack={() => setCurrentPage('home')} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Linked by Six</Text>
      <Text style={styles.subtitle}>Investor Portal</Text>
      
      <View style={styles.navigationContainer}>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => setCurrentPage('adp')}
        >
          <Text style={styles.navButtonText}>View ADP Presentation</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navButton, styles.secondaryButton]}
          onPress={() => {
            if (typeof window !== 'undefined') {
              window.open('/investors/adp.html', '_blank');
            } else {
              Linking.openURL('/investors/adp.html');
            }
          }}
        >
          <Text style={styles.navButtonText}>View HTML Version</Text>
        </TouchableOpacity>
      </View>
      
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 24,
    color: '#666',
    marginBottom: 40,
  },
  navigationContainer: {
    marginTop: 30,
  },
  navButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginVertical: 10,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#28a745',
  },
});
