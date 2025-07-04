import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const SplashScreen = ({ onFinish }) => {
  console.log("SplashScreen mounted");
  // Create animated value for opacity
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // After 3 seconds, fade out the splash screen
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 1000, // 1 second fade out
        useNativeDriver: true,
      }).start(() => {
        // Call onFinish callback when animation is complete
        if (onFinish) {
          console.log("SplashScreen finished, navigating to Landing");
          onFinish();
        }
      });
    }, 3000); // 3 seconds delay

    // Clear timeout on unmount
    return () => clearTimeout(timer);
  }, [fadeAnim, onFinish]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.content}>
          <Text style={styles.title}>Linked By Six</Text>
          <Text style={styles.subtitle}>Better Service & Prices via Relationships</Text>
          
          {/* Particle effect simulation with dots */}
          <View style={styles.particleContainer}>
            {Array(20).fill().map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.particle, 
                  { 
                    left: Math.random() * (screenWidth - 10),
                    top: Math.random() * (screenHeight - 10),
                    width: Math.random() * 4 + 2,
                    height: Math.random() * 4 + 2,
                    opacity: Math.random() * 0.5 + 0.3
                  }
                ]} 
              />
            ))}
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0d47a1',
  },
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0d47a1',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 20,
    color: 'white',
    textAlign: 'center',
  },
  particleContainer: {
    position: 'absolute',
    width: screenWidth,
    height: screenHeight,
    top: 0,
    left: 0,
  },
  particle: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 50,
  },
});

export default SplashScreen;
