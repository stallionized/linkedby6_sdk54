import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ImageBackground,
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

// Define Color Palette (matching consumer landing page)
const colors = {
  primaryBlue: '#1E88E5',
  lightBlue: '#90CAF9',
  darkBlue: '#0D47A1',
  backgroundLightGray: '#ECEFF1',
  cardWhite: '#FFFFFF',
  textDark: '#263238',
  textMedium: '#546E7A',
  textWhite: '#FFFFFF',
  borderLight: '#CFD8DC',
  overlayBlueStart: 'rgba(30, 136, 229, 0.85)',
  overlayBlueEnd: 'rgba(144, 202, 249, 0.75)',
  footerBackground: '#455A64',
};

const BenefitCard = ({ icon, title, description }) => (
  <View style={styles.benefitCard}>
    <View style={styles.benefitIcon}>
      <Text style={styles.benefitIconText}>{icon}</Text>
    </View>
    <Text style={styles.benefitTitle}>{title}</Text>
    <Text style={styles.benefitDescription}>{description}</Text>
  </View>
);

const BusinessLandingPage = ({ navigation }) => {
  console.log("BusinessLandingPage mounted");
  const { user, loading } = useAuth();
  const heroAnim = useRef(new Animated.Value(0)).current;
  const howItWorksAnim = useRef(new Animated.Value(0)).current;
  const benefitsAnim = useRef(new Animated.Value(0)).current;

  // Auto-redirect authenticated users to appropriate screen
  useEffect(() => {
    if (!loading && user && user.id && user.email) {
      console.log("✅ Authenticated user on Business Landing page");
      // Check if user has business profile, redirect accordingly
      // For now, we'll keep them on the page to let them explore
    }
  }, [user, loading, navigation]);

  const handleScroll = (event) => {
    const yOffset = event.nativeEvent.contentOffset.y;
    if (yOffset > 10) {
      Animated.timing(howItWorksAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
    if (yOffset > 50) {
      Animated.timing(benefitsAnim, {
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

    Animated.timing(howItWorksAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    Animated.timing(benefitsAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [heroAnim, howItWorksAnim, benefitsAnim]);

  const handleJoinBusiness = async () => {
    try {
      if (user) {
        // User is authenticated, navigate to business registration/pricing
        navigation.navigate('RegistrationScreen', { businessMode: true });
      } else {
        // User not authenticated, go to login with business flag
        navigation.navigate('LoginScreen', { businessMode: true });
      }
    } catch (error) {
      console.error('Error joining as business:', error);
      navigation.navigate('LoginScreen', { businessMode: true });
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
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.forConsumersButton}
              onPress={() => navigation.navigate('Landing')}
            >
              <Text style={styles.forConsumersButtonText}>For Consumers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => navigation.navigate('LoginScreen')}
            >
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
          </View>
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
            source={{ uri: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' }}
            style={styles.heroBackground}
          >
            <LinearGradient
              colors={[colors.overlayBlueStart, colors.overlayBlueEnd]}
              style={styles.heroOverlay}
            >
              <Animated.View style={[styles.heroContent, { opacity: heroAnim }]}>
                <Text style={styles.heroTitleBoldCentered}>Turn Relationships Into Your Strongest Marketing Channel.</Text>
                <Text style={styles.heroSubtitle}>Linked By Six shows how customers are connected to your business, helping you earn warmer leads, stronger loyalty, and better long-term relationships.</Text>
                <TouchableOpacity
                  style={styles.heroCtaButton}
                  onPress={handleJoinBusiness}
                >
                  <Text style={styles.heroCtaButtonText}>Join as a Business</Text>
                </TouchableOpacity>
              </Animated.View>
            </LinearGradient>
          </ImageBackground>

          {/* How It Works for Businesses Section */}
          <Animated.View style={[
            styles.section,
            {
              opacity: howItWorksAnim,
              transform: [{ translateY: howItWorksAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }],
            }
          ]}>
            <Text style={[styles.sectionTitle, { color: colors.darkBlue }]}>How It Works for Businesses</Text>
            <Text style={styles.sectionIntro}>
              Leverage your customer relationships to grow your business with insights that matter.
            </Text>

            {/* Three-step process */}
            <View style={styles.stepsContainer}>
              <View style={styles.stepCard}>
                <View style={styles.stepIconContainer}>
                  <Text style={styles.stepIcon}>🔗</Text>
                </View>
                <Text style={styles.stepTitle}>Connect Your Network</Text>
                <Text style={styles.stepDescription}>Your customer relationships become visible.</Text>
              </View>

              <View style={styles.stepCard}>
                <View style={styles.stepIconContainer}>
                  <Text style={styles.stepIcon}>📊</Text>
                </View>
                <Text style={styles.stepTitle}>See Who Drives Influence</Text>
                <Text style={styles.stepDescription}>Identify the people who generate referrals.</Text>
              </View>

              <View style={styles.stepCard}>
                <View style={styles.stepIconContainer}>
                  <Text style={styles.stepIcon}>📈</Text>
                </View>
                <Text style={styles.stepTitle}>Grow Through Trust</Text>
                <Text style={styles.stepDescription}>Warmer introductions help you close more business.</Text>
              </View>
            </View>
          </Animated.View>

          {/* Benefits Section */}
          <Animated.View style={[
            styles.section,
            {
              opacity: benefitsAnim,
              transform: [{ translateY: benefitsAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }],
            }
          ]}>
            <Text style={[styles.sectionTitle, { color: colors.darkBlue }]}>Why Businesses Choose Us</Text>
            <View style={styles.benefitsGrid}>
              <BenefitCard
                icon="💎"
                title="Higher-Quality Leads"
                description="Customers who find you through connections are more qualified and ready to engage."
              />
              <BenefitCard
                icon="🎯"
                title="Referral Insights"
                description="See exactly where your referrals come from and who your top influencers are."
              />
              <BenefitCard
                icon="🤝"
                title="Stronger Customer Retention"
                description="Personal connections create loyalty. Connected customers stay longer and spend more."
              />
              <BenefitCard
                icon="💰"
                title="Better Pricing Alignment"
                description="Understand your value through the lens of relationships, not just transactions."
              />
            </View>
          </Animated.View>

          {/* Analytics Section */}
          <View style={styles.analyticsSection}>
            <Text style={styles.analyticsSectionTitle}>Built for Growth</Text>
            <Text style={styles.analyticsSectionText}>
              Access powerful dashboards that show:
            </Text>
            <View style={styles.analyticsFeatures}>
              <View style={styles.analyticsFeature}>
                <Text style={styles.analyticsIcon}>📍</Text>
                <Text style={styles.analyticsFeatureText}>Where your referrals come from</Text>
              </View>
              <View style={styles.analyticsFeature}>
                <Text style={styles.analyticsIcon}>⭐</Text>
                <Text style={styles.analyticsFeatureText}>Which relationships generate the most business</Text>
              </View>
              <View style={styles.analyticsFeature}>
                <Text style={styles.analyticsIcon}>👥</Text>
                <Text style={styles.analyticsFeatureText}>Who your top influencers are</Text>
              </View>
            </View>
          </View>

          {/* Final CTA Section */}
          <LinearGradient
            colors={[colors.darkBlue, colors.primaryBlue]}
            style={styles.ctaSection}
          >
            <Text style={styles.ctaTitle}>Ready to Grow Your Business Through Relationships?</Text>
            <Text style={styles.ctaSubtitle}>Join businesses that are already turning connections into their competitive advantage.</Text>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={handleJoinBusiness}
            >
              <Text style={styles.ctaButtonText}>Get Started Today</Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerLogo}>Linked By Six</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Landing')}
              style={styles.footerLink}
            >
              <Text style={styles.footerLinkText}>For Consumers</Text>
            </TouchableOpacity>
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  forConsumersButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 25,
  },
  forConsumersButtonText: {
    color: colors.textMedium,
    fontWeight: '600',
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
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 700,
    alignItems: 'center',
  },
  heroTitleBoldCentered: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textWhite,
    textAlign: 'center',
    marginBottom: 20,
  },
  heroSubtitle: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 26,
  },
  heroCtaButton: {
    backgroundColor: colors.cardWhite,
    paddingHorizontal: 35,
    paddingVertical: 18,
    borderRadius: 25,
    elevation: 4,
  },
  heroCtaButtonText: {
    color: colors.primaryBlue,
    fontWeight: 'bold',
    fontSize: 17,
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
  sectionIntro: {
    fontSize: 16,
    color: colors.textMedium,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  stepsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  stepCard: {
    alignItems: 'center',
    width: screenWidth > 600 ? '30%' : '100%',
    marginBottom: 20,
    padding: 15,
  },
  stepIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(30, 136, 229, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  stepIcon: {
    fontSize: 32,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 14,
    color: colors.textMedium,
    textAlign: 'center',
    lineHeight: 20,
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  benefitCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    width: screenWidth > 600 ? '48%' : '100%',
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  benefitIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(30, 136, 229, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  benefitIconText: {
    fontSize: 24,
  },
  benefitTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 10,
  },
  benefitDescription: {
    fontSize: 14,
    color: colors.textMedium,
    lineHeight: 20,
  },
  analyticsSection: {
    padding: 30,
    marginHorizontal: 15,
    marginTop: 25,
    backgroundColor: colors.cardWhite,
    borderRadius: 10,
    elevation: 3,
  },
  analyticsSectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.darkBlue,
    textAlign: 'center',
    marginBottom: 15,
  },
  analyticsSectionText: {
    fontSize: 16,
    color: colors.textMedium,
    textAlign: 'center',
    marginBottom: 25,
  },
  analyticsFeatures: {
    marginTop: 10,
  },
  analyticsFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingLeft: 20,
  },
  analyticsIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  analyticsFeatureText: {
    fontSize: 16,
    color: colors.textDark,
    flex: 1,
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
  footerLink: {
    marginBottom: 15,
  },
  footerLinkText: {
    fontSize: 14,
    color: colors.lightBlue,
    textDecorationLine: 'underline',
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
});

export default BusinessLandingPage;
