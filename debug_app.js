// Debug version of App.js to help identify white screen issues
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Simple test component to verify React Native is working
const DebugApp = () => {
  console.log("DebugApp rendering...");
  
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Debug App - React Native is working!</Text>
      <Text style={styles.text}>If you see this, the basic setup is fine.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  text: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginVertical: 10,
  },
});

export default DebugApp;
