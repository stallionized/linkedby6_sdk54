import React, { useState } from 'react';
import { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ImageBackground,
  TextInput,
  Image,
  ScrollView,
  Dimensions,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from './Auth';
import { webRootContainer, webScrollContainer, webScrollView, webScrollContent } from './utils/webScrollStyles';

const { width: screenWidth } = Dimensions.get('window');

// Define Lighter Gray Color Palette
const colors = {
  primaryBlue: '#1E88E5',       // Material Blue 600 (Accent)
  lightBlue: '#90CAF9',         // Material Blue 200 (Lighter Accent)
  darkBlue: '#0D47A1',          // Material Blue 900 (Used for button & accents)
  backgroundLightGray: '#ECEFF1', // Blue Grey 50 (Main Background - Lighter)
  cardWhite: '#FFFFFF',          // White for cards
  textDark: '#263238',          // Blue Grey 900 (Primary Text)
  textMedium: '#546E7A',        // Blue Grey 600 (Secondary Text)
  textWhite: '#FFFFFF',          // Text on dark/blue backgrounds
  borderLight: '#CFD8DC',       // Blue Grey 100 (Borders)
  overlayBlueStart: 'rgba(30, 136, 229, 0.85)', // Primary Blue with opacity
  overlayBlueEnd: 'rgba(144, 202, 249, 0.75)',  // Light Blue with opacity
  footerBackground: '#455A64',   // Blue Grey 700 (Mid-dark footer)
  chatInputBackground: 'rgba(255, 255, 255, 0.2)', // Keep transparent white for chat input on overlay
};

const FeatureCard = ({ icon, title, description }) => (
  <View style={styles.featureCard}>
    <View style={styles.featureIcon}>
      <Text style={styles.featureIconText}>{icon}</Text>
    </View>
    <Text style={styles.featureTitle}>{title}</Text>
    <Text style={styles.featureDescription}>{description}</Text>
  </View>
);

const ConnectionNode = ({ label, color, isEndpoint }) => (
  <View style={[styles.node, { backgroundColor: color || colors.primaryBlue }]}>
    <Text style={[styles.nodeText, isEndpoint && styles.endpointText]}>{label}</Text>
  </View>
);

const ConnectionLine = () => (
  <LinearGradient
    colors={[colors.primaryBlue, colors.lightBlue]}
    style={styles.connectionLine}
    start={{ x: 0, y: 0 }}
    end={{ x: 0, y: 1 }}
  />
);

const LandingPage = ({ navigation, onEnterApp, fadeAnim = new Animated.Value(1) }) => {
  console.log("LandingPage mounted");
  const { user, loading } = useAuth();
  const heroAnim = useRef(new Animated.Value(0)).current;
  const aboutAnim = useRef(new Animated.Value(0)).current;
  const featuresAnim = useRef(new Animated.Value(0)).current;

  // Auto-redirect authenticated users to Search screen with more robust checks
  useEffect(() => {
    if (!loading && user && user.id && user.email) {
      console.log("✅ Fully authenticated user detected on Landing page, redirecting to Search");
      console.log("User details:", { id: user.id, email: user.email });
      navigation.replace('Search');
    } else if (!loading && user) {
      console.log("⚠️ Incomplete user object detected on Landing page:", user);
      console.log("Missing required fields - staying on Landing page");
    } else if (!loading) {
      console.log("✅ No authenticated user - correctly showing Landing page");
    }
  }, [user, loading, navigation]);

  const handleScroll = (event) => {
    const yOffset = event.nativeEvent.contentOffset.y;
    if (yOffset > 10) {
      Animated.timing(aboutAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
    if (yOffset > 50) {
      Animated.timing(featuresAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  };

  useEffect(() => {
    Animated.timing(heroAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    Animated.timing(aboutAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    Animated.timing(featuresAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [heroAnim, aboutAnim, featuresAnim]);

  const [chatInput, setChatInput] = useState('');

  const handleChatSubmit = async () => {
    try {
      if (user) {
        // User is authenticated, go directly to Search
        if (chatInput.trim()) {
          navigation.navigate('Search', { initialQuery: chatInput });
        } else {
          navigation.navigate('Search');
        }
      } else {
        // User not authenticated, go to login with query
        navigation.navigate('LoginScreen', { initialQuery: chatInput.trim() });
      }
      setChatInput('');
    } catch (error) {
      console.error('Error handling chat submit:', error);
      // Fallback navigation
      navigation.navigate('LoginScreen', { initialQuery: chatInput.trim() });
    }
  };

  const handleEnterApp = async () => {
    try {
      if (user) {
        // User is authenticated, go directly to Search
        navigation.navigate('Search');
      } else {
        // User not authenticated, go to login
        navigation.navigate('LoginScreen');
      }
    } catch (error) {
      console.error('Error entering app:', error);
      navigation.navigate('LoginScreen');
    }
  };

  // Don't render anything while checking authentication
  if (loading) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar style="auto" />

        {/* Header */}
        <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image
            source={require('./assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.logo}>Linked By Six</Text>
        </View>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('LoginScreen')}
        >
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1744&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' }}
          style={styles.heroBackground}
        >
          <LinearGradient
            colors={[colors.overlayBlueStart, colors.overlayBlueEnd]}
            style={styles.heroOverlay}
          >
            <Animated.View style={[styles.heroContent, { opacity: heroAnim }]}>
              <Text style={styles.heroTitleBoldCentered}>What service are you looking for?</Text>
              <View style={styles.chatContainer}>
                <TextInput
                  style={styles.chatInput}
                  placeholder="Describe the type of service you are searching for..."
                  placeholderTextColor="rgba(255, 255, 255, 0.7)"
                  value={chatInput}
                  onChangeText={setChatInput}
                  multiline={true}
                  numberOfLines={4}
                  textAlignVertical="top"
                  onSubmitEditing={handleChatSubmit}
                  returnKeyType="send"
                />
                <TouchableOpacity
                  style={styles.chatSubmitButton}
                  onPress={handleChatSubmit}
                >
                  <Text style={styles.chatSubmitButtonText}>⬆</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </LinearGradient>
        </ImageBackground>

        {/* About Section */}
        <Animated.View style={[
          styles.section,
          {
            opacity: aboutAnim,
            transform: [{ translateY: aboutAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }],
          }
        ]}>
          <Text style={[styles.sectionTitle, { color: colors.darkBlue }]}>The Power of Six Degrees</Text>

          {/* Content layout - stacked on mobile */}
          <View style={styles.contentContainer}>
            {/* Text content */}
            <View style={styles.textContent}>
              <Text style={styles.sectionText}>
                The theory of six degrees of separation states that everyone is connected to everyone else through at most six social connections. This means you're likely already connected to the best businesses in your area through friends, family, or acquaintances.
              </Text>
              <Text style={styles.sectionText}>
                Just as people are connected to each other, people are also connected to businesses through relationships. A business owner might be your friend's cousin, or your colleague's neighbor. These hidden connections often lead to better service, personalized experiences, and exclusive deals.
              </Text>
              <Text style={styles.sectionText}>
                Our platform reveals these valuable connections, helping you find businesses where you already have a relationship advantage. By leveraging your existing network, you can make more informed choices and receive preferential treatment.
              </Text>
            </View>

            {/* Network visualization */}
            <View style={styles.networkVisualization}>
              <Image
                source={require('./assets/network-animation.gif')}
                style={styles.networkImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </Animated.View>

        {/* Features Section */}
        <Animated.View style={[
          styles.section,
          {
            opacity: featuresAnim,
            transform: [{ translateY: featuresAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }],
          }
        ]}>
          <Text style={[styles.sectionTitle, { color: colors.darkBlue }]}>Key Features</Text>
          <View style={styles.featuresGrid}>
            <FeatureCard
              icon="🔍"
              title="AI-Powered Search"
              description="Find businesses that match your criteria with our advanced search algorithm."
            />
            <FeatureCard
              icon="🔗"
              title="Relationship Mapping"
              description="Visualize connection strings between you and businesses through your network."
            />
            <FeatureCard
              icon="👤"
              title="Business Profiles"
              description="Create and customize your business profile to showcase your services."
            />
            <FeatureCard
              icon="📱"
              title="Contact Management"
              description="Import and organize your contacts to strengthen your network."
            />
          </View>
        </Animated.View>

        {/* CTA Section */}
        <LinearGradient
          colors={[colors.darkBlue, colors.primaryBlue]}
          style={styles.ctaSection}
        >
          <Text style={styles.ctaTitle}>Ready to Transform Your Business Network?</Text>
          <Text style={styles.ctaSubtitle}>Join thousands of businesses already leveraging the power of connections.</Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleEnterApp}
          >
            <Text style={styles.ctaButtonText}>Enter App</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerLogo}>Linked By Six</Text>
          <Text style={styles.footerText}>© 2025 SixDegrees Business Network. All rights reserved.</Text>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    ...webRootContainer,
    backgroundColor: colors.backgroundLightGray,
  },
  flex: {
    ...webScrollContainer,
  },
  scrollView: {
    ...webScrollView,
  },
  scrollContent: {
    ...webScrollContent,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.cardWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    zIndex: 10,
    elevation: 2,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  logo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.darkBlue,
  },
  loginButton: {
    borderWidth: 2,
    borderColor: colors.primaryBlue,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 25,
  },
  loginButtonText: {
    color: colors.primaryBlue,
    fontWeight: '600',
  },
  heroBackground: {
    height: 500,
    width: '100%',
  },
  heroOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  heroContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 50,
    width: '100%',
    maxWidth: 700,
    alignItems: 'center',
  },
  heroTitleBoldCentered: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textWhite,
    textAlign: 'center',
    marginBottom: 25,
  },
  chatContainer: {
    position: 'relative',
    width: '100%',
    marginTop: 10,
  },
  chatInput: {
    backgroundColor: colors.chatInputBackground,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    paddingRight: 50,
    color: colors.textWhite,
    fontSize: 16,
    minHeight: 150,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  chatSubmitButton: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 6,
    height: 30,
    width: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  chatSubmitButtonText: {
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    padding: 20,
    marginHorizontal: 15,
    marginTop: 25,
    backgroundColor: colors.cardWhite,
    borderRadius: 10,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primaryBlue,
    textAlign: 'center',
    marginBottom: 20,
  },
  contentContainer: {
    flexDirection: 'column',
    marginTop: 20,
    marginBottom: 10,
  },
  textContent: {
    width: '100%',
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 16,
    color: colors.textMedium,
    marginBottom: 15,
    lineHeight: 24,
  },
  networkVisualization: {
    width: '100%',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 5,
  },
  networkImage: {
    width: '100%',
    height: screenWidth > 768 ? 200 : 150,
    maxWidth: '100%',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    width: screenWidth > 600 ? '48%' : '100%',
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(30, 136, 229, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  featureIconText: {
    fontSize: 24,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 10,
  },
  featureDescription: {
    fontSize: 14,
    color: colors.textMedium,
    lineHeight: 20,
  },
  ctaSection: {
    padding: 30,
    marginTop: 30,
    marginHorizontal: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textWhite,
    textAlign: 'center',
    marginBottom: 15,
  },
  ctaSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 25,
  },
  ctaButton: {
    backgroundColor: colors.cardWhite,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  ctaButtonText: {
    color: colors.primaryBlue,
    fontWeight: 'bold',
    fontSize: 16,
  },
  node: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 5,
    elevation: 3,
  },
  nodeText: {
    color: colors.textWhite,
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 14,
  },
  endpointText: {
    fontSize: 16,
  },
  connectionLine: {
    width: 4,
    height: 30,
    borderRadius: 2,
  },
  footer: {
    padding: 30,
    backgroundColor: colors.footerBackground,
    alignItems: 'center',
    marginTop: 20,
  },
  footerLogo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textWhite,
    marginBottom: 15,
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
});

export default LandingPage;
