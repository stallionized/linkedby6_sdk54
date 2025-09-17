import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
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

const colors = {
  primaryBlue: '#1E88E5',
  lightBlue: '#90CAF9',
  darkBlue: '#0D47A1',
  backgroundLightGray: '#F8F9FA',
  backgroundLightBlue: '#F5F8FA',
  cardWhite: '#FFFFFF',
  textDark: '#263238',
  textMedium: '#546E7A',
  textLight: '#78909C',
  textWhite: '#FFFFFF',
  borderLight: '#E0E0E0',
  overlayBlueStart: 'rgba(30, 136, 229, 0.85)',
  overlayBlueEnd: 'rgba(144, 202, 249, 0.75)',
  footerBackground: '#263238',
  chatInputBackground: 'rgba(255, 255, 255, 0.2)',
};

const StepCard = ({ number, title, description, index }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.02,
      useNativeDriver: true,
      friction: 7,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
    }).start();
  };

  const getBadgeColor = () => {
    switch(index) {
      case 0: return colors.lightBlue;
      case 1: return colors.primaryBlue;
      case 2: return colors.darkBlue;
      default: return colors.lightBlue;
    }
  };

  const verticalOffset = index === 1 ? -8 : 0;

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.stepCardWrapper, { marginTop: verticalOffset }]}
    >
      <Animated.View style={[styles.stepCard, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.stepCardInner}>
          <View style={[styles.stepNumberBadge, { backgroundColor: getBadgeColor() }]}>
            <Text style={styles.stepNumberText}>{number}</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{title}</Text>
            <Text style={styles.stepDescription}>{description}</Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const FeatureCard = ({ label, number, gradientColors, title, description, designType }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.02,
      useNativeDriver: true,
      friction: 7,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
    }).start();
  };

  const renderDesign = () => {
    switch (designType) {
      case 'waves':
        return (
          <View style={styles.featureDesignContainer}>
            <LinearGradient colors={gradientColors} style={styles.featureWave1} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <LinearGradient colors={[gradientColors[1], gradientColors[0]]} style={styles.featureWave2} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} />
          </View>
        );
      case 'circles':
        return (
          <View style={styles.featureDesignContainer}>
            <LinearGradient colors={gradientColors} style={styles.featureCircle1} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <LinearGradient colors={[gradientColors[1], gradientColors[0]]} style={styles.featureCircle2} start={{ x: 1, y: 1 }} end={{ x: 0, y: 0 }} />
            <View style={styles.featureCircle3} />
          </View>
        );
      case 'diagonal':
        return (
          <View style={styles.featureDesignContainer}>
            <LinearGradient colors={gradientColors} style={styles.featureDiagonal1} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <LinearGradient colors={[gradientColors[1], gradientColors[0]]} style={styles.featureDiagonal2} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} />
          </View>
        );
      case 'dots':
        return (
          <View style={styles.featureDesignContainer}>
            <LinearGradient colors={gradientColors} style={styles.featureDot1} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <LinearGradient colors={gradientColors} style={styles.featureDot2} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <LinearGradient colors={[gradientColors[1], gradientColors[0]]} style={styles.featureDot3} start={{ x: 1, y: 1 }} end={{ x: 0, y: 0 }} />
            <View style={styles.featureDot4} />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.featureCardWrapper}
    >
      <Animated.View style={[styles.featureCard, { transform: [{ scale: scaleAnim }] }]}>
        {renderDesign()}
        <View style={styles.featureLabel}>
          <Text style={styles.featureLabelText}>{number} • {label}</Text>
        </View>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </Animated.View>
    </Pressable>
  );
};

const LandingPage = ({ navigation, onEnterApp, fadeAnim = new Animated.Value(1) }) => {
  console.log("LandingPage mounted");
  const { user, loading } = useAuth();
  const heroAnim = useRef(new Animated.Value(0)).current;
  const aboutAnim = useRef(new Animated.Value(0)).current;
  const featuresAnim = useRef(new Animated.Value(0)).current;
  const ctaButtonScale = useRef(new Animated.Value(1)).current;

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
        if (chatInput.trim()) {
          navigation.navigate('Search', { initialQuery: chatInput });
        } else {
          navigation.navigate('Search');
        }
      } else {
        navigation.navigate('LoginScreen', { initialQuery: chatInput.trim() });
      }
      setChatInput('');
    } catch (error) {
      console.error('Error handling chat submit:', error);
      navigation.navigate('LoginScreen', { initialQuery: chatInput.trim() });
    }
  };

  const handleEnterApp = async () => {
    try {
      if (user) {
        navigation.navigate('Search');
      } else {
        navigation.navigate('LoginScreen');
      }
    } catch (error) {
      console.error('Error entering app:', error);
      navigation.navigate('LoginScreen');
    }
  };

  const handleCtaPressIn = () => {
    Animated.spring(ctaButtonScale, {
      toValue: 1.02,
      useNativeDriver: true,
      friction: 7,
    }).start();
  };

  const handleCtaPressOut = () => {
    Animated.spring(ctaButtonScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
    }).start();
  };

  if (loading) {
    return null;
  }

  const isDesktop = screenWidth > 768;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar style="auto" />

        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require('./assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.logo}>Linked By Six</Text>
          </View>
          <View style={styles.headerButtons}>
            <Pressable
              style={styles.forBusinessButton}
              onPress={() => navigation.navigate('BusinessLanding')}
            >
              <Text style={styles.forBusinessButtonText}>For Business</Text>
            </Pressable>
            <Pressable
              style={styles.loginButton}
              onPress={() => navigation.navigate('LoginScreen')}
            >
              <Text style={styles.loginButtonText}>Login</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1744&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' }}
            style={styles.heroBackground}
          >
            <LinearGradient
              colors={[colors.overlayBlueStart, colors.overlayBlueEnd]}
              style={styles.heroOverlay}
            >
              <Animated.View style={[styles.heroContent, { opacity: heroAnim }]}>
                <Text style={styles.heroTitleBoldCentered}>Find Businesses People You Know Already Trust</Text>
                <Text style={styles.heroSubtitle}>Better Service & Pricing via Relationships</Text>
                <View style={styles.chatContainer}>
                  <TextInput
                    style={styles.chatInput}
                    placeholder="Search for a trusted business service..."
                    placeholderTextColor="rgba(255, 255, 255, 0.7)"
                    value={chatInput}
                    onChangeText={setChatInput}
                    multiline={true}
                    numberOfLines={5}
                    textAlignVertical="top"
                    onSubmitEditing={handleChatSubmit}
                    returnKeyType="search"
                  />
                </View>
                <Pressable
                  style={styles.heroCtaButton}
                  onPress={handleChatSubmit}
                >
                  <Text style={styles.heroCtaButtonText}>Get Started – It's Free!</Text>
                </Pressable>
              </Animated.View>
            </LinearGradient>
          </ImageBackground>

          <Animated.View style={[
            styles.howItWorksSection,
            {
              opacity: aboutAnim,
              transform: [{ translateY: aboutAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }],
            }
          ]}>
            <Text style={styles.sectionTitle}>How It Works</Text>
            <Text style={styles.sectionIntro}>
              You're closer than you think to great service. We use the 'six degrees of separation' principle to find your hidden connections to the best local businesses.
            </Text>

            <View style={styles.stepsContainer}>
              {isDesktop && <View style={styles.journeyConnector}>
                <View style={styles.connectorDot} />
                <View style={styles.connectorLine} />
                <View style={styles.connectorDot} />
                <View style={styles.connectorLine} />
                <View style={styles.connectorDot} />
              </View>}

              <StepCard number="1" title="Search" description="Tell us what you need." index={0} />
              <StepCard number="2" title="Connect" description="We instantly map your personal connection path." index={1} />
              <StepCard number="3" title="Benefit" description="Choose a business with the confidence of a warm introduction." index={2} />
            </View>
          </Animated.View>

          <Animated.View style={[
            styles.whyChooseSection,
            {
              opacity: featuresAnim,
              transform: [{ translateY: featuresAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }],
            }
          ]}>
            <Text style={styles.sectionTitle}>Why Choose Linked By Six</Text>
            <View style={styles.featuresGrid}>
              <FeatureCard
                label="TRUST"
                number="01"
                gradientColors={['#1E88E5', '#42A5F5']}
                designType="waves"
                title="Trust, Not Chance"
                description="Don't rely on anonymous reviews. We show you exactly how you're connected to a business through people you know."
              />
              <FeatureCard
                label="PROOF"
                number="02"
                gradientColors={['#0D47A1', '#1976D2']}
                designType="circles"
                title="Reviews You Can Believe"
                description="See reviews from users within your Personal Trust Network. The closer the connection, the more trustworthy the review."
              />
              <FeatureCard
                label="SERVICE"
                number="03"
                gradientColors={['#1976D2', '#2196F3']}
                designType="diagonal"
                title="Unlock Better Service"
                description="A personal connection means you're not just another customer. Get the service and fair pricing you deserve."
              />
              <FeatureCard
                label="INTELLIGENCE"
                number="04"
                gradientColors={['#42A5F5', '#90CAF9']}
                designType="dots"
                title="Smart & Simple Search"
                description="Our intelligent search understands what you're looking for and instantly finds the most relevant businesses in your network."
              />
            </View>
          </Animated.View>

          <View style={styles.ctaSectionWrapper}>
            <LinearGradient
              colors={['#0D47A1', '#1E88E5', '#42A5F5']}
              style={styles.ctaSection}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.ctaDecorativeElement} />
              <View style={[styles.ctaLayoutContainer, isDesktop && styles.ctaLayoutDesktop]}>
                <View style={[styles.ctaTextColumn, isDesktop && styles.ctaTextColumnDesktop]}>
                  <Text style={[styles.ctaTitle, isDesktop && styles.ctaTitleDesktop]}>Ready to Find a Service You Can Truly Trust?</Text>
                  <Text style={[styles.ctaSubtitle, isDesktop && styles.ctaSubtitleDesktop]}>Stop wasting time with unreliable reviews and start finding great businesses through your personal network. It's 100% free. Always.</Text>
                </View>
                <View style={styles.ctaButtonColumn}>
                  <Pressable
                    onPressIn={handleCtaPressIn}
                    onPressOut={handleCtaPressOut}
                    onPress={handleEnterApp}
                  >
                    <Animated.View style={[styles.ctaButton, { transform: [{ scale: ctaButtonScale }] }]}>
                      <LinearGradient
                        colors={['#FFFFFF', '#F5F5F5']}
                        style={styles.ctaButtonGradient}
                      >
                        <Text style={styles.ctaButtonText}>Create Your Free Account</Text>
                      </LinearGradient>
                    </Animated.View>
                  </Pressable>
                </View>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.footer}>
            <View style={styles.footerTopBorder} />
            <View style={[styles.footerContent, isDesktop && styles.footerContentDesktop]}>
              <View style={[styles.footerBrand, isDesktop && styles.footerBrandDesktop]}>
                <Text style={styles.footerLogo}>Linked By Six</Text>
                <Text style={styles.footerTagline}>Trust Through Connections</Text>
              </View>
              <View style={styles.footerLinks}>
                <Pressable onPress={() => navigation.navigate('BusinessLanding')} style={styles.footerLink}>
                  <Text style={styles.footerLinkText}>For Business</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.footerDivider} />
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
    paddingBottom: 0,
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
    letterSpacing: -0.5,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  forBusinessButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 25,
  },
  forBusinessButtonText: {
    color: colors.textMedium,
    fontWeight: '600',
    fontSize: 14,
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
    fontSize: 14,
  },
  heroBackground: {
    height: 520,
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
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 50,
    width: '100%',
    maxWidth: 700,
    alignItems: 'center',
  },
  heroTitleBoldCentered: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textWhite,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  heroSubtitle: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 26,
    letterSpacing: 0.2,
  },
  chatContainer: {
    width: '100%',
    marginTop: 10,
  },
  chatInput: {
    backgroundColor: colors.chatInputBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.textWhite,
    fontSize: 16,
    minHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  heroCtaButton: {
    backgroundColor: colors.cardWhite,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 28,
    marginTop: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  heroCtaButtonText: {
    color: colors.primaryBlue,
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  howItWorksSection: {
    position: 'relative',
    paddingVertical: 60,
    paddingHorizontal: screenWidth > 768 ? 50 : 24,
    marginTop: 50,
    backgroundColor: colors.backgroundLightBlue,
  },
  sectionTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: colors.darkBlue,
    textAlign: 'center',
    marginBottom: 18,
    letterSpacing: 1.2,
  },
  sectionIntro: {
    fontSize: 16,
    color: colors.textMedium,
    textAlign: 'center',
    marginBottom: 50,
    lineHeight: 26,
    maxWidth: 680,
    alignSelf: 'center',
  },
  stepsContainer: {
    position: 'relative',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: screenWidth > 768 ? 'space-between' : 'center',
    gap: screenWidth > 768 ? 24 : 20,
    paddingHorizontal: screenWidth > 768 ? 20 : 0,
  },
  journeyConnector: {
    position: 'absolute',
    top: 70,
    left: '50%',
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 100,
    zIndex: 0,
  },
  connectorLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.borderLight,
    marginHorizontal: 8,
  },
  connectorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.lightBlue,
  },
  stepCardWrapper: {
    width: screenWidth > 768 ? '30%' : '100%',
    minWidth: screenWidth > 768 ? 260 : undefined,
    maxWidth: screenWidth > 768 ? 320 : undefined,
  },
  stepCard: {
    minHeight: 200,
    borderRadius: 16,
    backgroundColor: colors.cardWhite,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  stepCardInner: {
    position: 'relative',
    padding: 24,
    minHeight: 200,
  },
  stepNumberBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    zIndex: 2,
  },
  stepNumberText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textWhite,
  },
  stepContent: {
    paddingRight: 50,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.textMedium,
    lineHeight: 22,
  },
  whyChooseSection: {
    paddingVertical: 60,
    paddingHorizontal: screenWidth > 768 ? 50 : 24,
    marginTop: 40,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: screenWidth > 768 ? 'space-between' : 'center',
    gap: 20,
  },
  featureCardWrapper: {
    width: screenWidth > 768 ? '48%' : '100%',
    minWidth: screenWidth > 768 ? 300 : undefined,
  },
  featureCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: 20,
    padding: 26,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  featureDesignContainer: {
    position: 'relative',
    width: '100%',
    height: 80,
    marginBottom: 20,
    marginTop: -26,
    marginHorizontal: -26,
    overflow: 'hidden',
  },
  featureWave1: {
    position: 'absolute',
    width: '70%',
    height: 60,
    borderRadius: 100,
    top: -20,
    left: -30,
    opacity: 0.8,
  },
  featureWave2: {
    position: 'absolute',
    width: '50%',
    height: 50,
    borderRadius: 100,
    top: 20,
    right: -20,
    opacity: 0.6,
  },
  featureCircle1: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    top: 10,
    left: 15,
    opacity: 0.7,
  },
  featureCircle2: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    top: 30,
    left: 60,
    opacity: 0.5,
  },
  featureCircle3: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    top: 15,
    right: 20,
    backgroundColor: 'rgba(30, 136, 229, 0.3)',
  },
  featureDiagonal1: {
    position: 'absolute',
    width: 120,
    height: 6,
    top: 25,
    left: -20,
    transform: [{ rotate: '15deg' }],
    opacity: 0.8,
  },
  featureDiagonal2: {
    position: 'absolute',
    width: 100,
    height: 4,
    top: 50,
    right: -10,
    transform: [{ rotate: '-15deg' }],
    opacity: 0.6,
  },
  featureDot1: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    top: 15,
    left: 20,
    opacity: 0.8,
  },
  featureDot2: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    top: 25,
    left: 50,
    opacity: 0.7,
  },
  featureDot3: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    top: 40,
    left: 35,
    opacity: 0.6,
  },
  featureDot4: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    top: 20,
    right: 30,
    backgroundColor: 'rgba(30, 136, 229, 0.4)',
  },
  featureLabel: {
    marginBottom: 12,
  },
  featureLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textLight,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  featureTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 12,
    letterSpacing: 0.1,
  },
  featureDescription: {
    fontSize: 14,
    color: colors.textMedium,
    lineHeight: 22,
  },
  ctaSectionWrapper: {
    marginTop: 60,
    marginHorizontal: screenWidth > 768 ? 50 : 24,
  },
  ctaSection: {
    position: 'relative',
    padding: screenWidth > 768 ? 50 : 36,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#0D47A1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  ctaDecorativeElement: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  ctaLayoutContainer: {
    alignItems: 'center',
    zIndex: 1,
  },
  ctaLayoutDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 40,
  },
  ctaTextColumn: {
    alignItems: 'center',
  },
  ctaTextColumnDesktop: {
    flex: 1,
    alignItems: 'flex-start',
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textWhite,
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: 0.3,
    lineHeight: 32,
  },
  ctaTitleDesktop: {
    fontSize: 28,
    textAlign: 'left',
    lineHeight: 36,
  },
  ctaSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  ctaSubtitleDesktop: {
    textAlign: 'left',
    maxWidth: 480,
    marginBottom: 0,
  },
  ctaButtonColumn: {
    alignItems: 'center',
  },
  ctaButton: {
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 4,
  },
  ctaButtonGradient: {
    paddingHorizontal: 36,
    paddingVertical: 16,
  },
  ctaButtonText: {
    color: colors.darkBlue,
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.4,
  },
  footer: {
    paddingHorizontal: screenWidth > 768 ? 50 : 24,
    paddingTop: 50,
    paddingBottom: 36,
    backgroundColor: colors.footerBackground,
    marginTop: 70,
  },
  footerTopBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  footerContent: {
    alignItems: 'center',
    marginBottom: 32,
  },
  footerContentDesktop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  footerBrand: {
    alignItems: 'center',
    marginBottom: 24,
  },
  footerBrandDesktop: {
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  footerLogo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textWhite,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  footerTagline: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 14,
  },
  footerLink: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  footerLinkText: {
    fontSize: 13,
    color: colors.lightBlue,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  footerDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 24,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    letterSpacing: 0.4,
  },
});

export default LandingPage;
