import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Define color palette matching LandingPage
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
  chatInputBackground: 'rgba(255, 255, 255, 0.2)',
};

export default function ADPInvestorScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="auto" />

      {/* Header matching LandingPage design */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image
            source={require('./assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.logo}>Linked By Six</Text>
        </View>
      </View>

      <LinearGradient
        colors={['#1E88E5', '#42A5F5']}
        style={styles.heroSection}
      >
        <View style={styles.heroContent}>
          <MaterialIcons name="business" size={32} color="white" />
          <Text style={styles.title}>ADP Investment Presentation</Text>
          <Text style={styles.subtitle}>Six Degrees Network - Professional Networking Platform</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Executive Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          <Text style={styles.sectionContent}>
            Six Degrees Network is revolutionizing professional networking by combining personal and business connections in a single, AI-powered platform. Our innovative approach bridges traditional networking gaps, creating unprecedented opportunities for collaboration and growth.
          </Text>
        </View>

        {/* Market Opportunity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Market Opportunity</Text>
          <View style={styles.metricGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>$50B+</Text>
              <Text style={styles.metricLabel}>Global Professional Networking Market</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>1.2B+</Text>
              <Text style={styles.metricLabel}>LinkedIn Users</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>500M+</Text>
              <Text style={styles.metricLabel}>Business Professionals</Text>
            </View>
          </View>
        </View>

        {/* Key Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Performance</Text>

          <View style={styles.metricRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricItemValue}>15,247</Text>
              <Text style={styles.metricItemLabel}>Active Users</Text>
              <Text style={styles.metricItemGrowth}>+12.5% MoM</Text>
            </View>

            <View style={styles.metricItem}>
              <Text style={styles.metricItemValue}>1,892</Text>
              <Text style={styles.metricItemLabel}>Business Partnerships</Text>
              <Text style={styles.metricItemGrowth}>+8.3% MoM</Text>
            </View>
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricItemValue}>$127K</Text>
              <Text style={styles.metricItemLabel}>Monthly Revenue</Text>
              <Text style={styles.metricItemGrowth}>+15.2% MoM</Text>
            </View>

            <View style={styles.metricItem}>
              <Text style={styles.metricItemValue}>89,342</Text>
              <Text style={styles.metricItemLabel}>Network Connections</Text>
              <Text style={styles.metricItemGrowth}>+22.1% MoM</Text>
            </View>
          </View>
        </View>

        {/* Competitive Advantages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Competitive Advantages</Text>

          <View style={styles.advantageList}>
            <View style={styles.advantageItem}>
              <MaterialIcons name="lightbulb" size={24} color="#1E88E5" />
              <View style={styles.advantageContent}>
                <Text style={styles.advantageTitle}>Proprietary AI Algorithms</Text>
                <Text style={styles.advantageDescription}>
                  Advanced connection algorithms that understand professional relationships and business synergies
                </Text>
              </View>
            </View>

            <View style={styles.advantageItem}>
              <MaterialIcons name="sync" size={24} color="#1E88E5" />
              <View style={styles.advantageContent}>
                <Text style={styles.advantageTitle}>Dual-Mode Networking</Text>
                <Text style={styles.advantageDescription}>
                  Seamlessly bridges personal and professional networking in one unified platform
                </Text>
              </View>
            </View>

            <View style={styles.advantageItem}>
              <MaterialIcons name="analytics" size={24} color="#1E88E5" />
              <View style={styles.advantageContent}>
                <Text style={styles.advantageTitle}>Advanced Analytics</Text>
                <Text style={styles.advantageDescription}>
                  Real-time insights into network performance and business opportunities
                </Text>
              </View>
            </View>

            <View style={styles.advantageItem}>
              <MaterialIcons name="security" size={24} color="#1E88E5" />
              <View style={styles.advantageContent}>
                <Text style={styles.advantageTitle}>Enterprise-Grade Security</Text>
                <Text style={styles.advantageDescription}>
                  Bank-level encryption and privacy controls for sensitive business data
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Business Model */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Model</Text>

          <View style={styles.businessModelGrid}>
            <View style={styles.businessModelCard}>
              <Text style={styles.businessModelTitle}>Subscriptions</Text>
              <Text style={styles.businessModelValue}>70%</Text>
              <Text style={styles.businessModelDesc}>Recurring revenue</Text>
            </View>

            <View style={styles.businessModelCard}>
              <Text style={styles.businessModelTitle}>Premium Features</Text>
              <Text style={styles.businessModelValue}>20%</Text>
              <Text style={styles.businessModelDesc}>Advanced tools</Text>
            </View>

            <View style={styles.businessModelCard}>
              <Text style={styles.businessModelTitle}>Enterprise</Text>
              <Text style={styles.businessModelValue}>10%</Text>
              <Text style={styles.businessModelDesc}>Custom solutions</Text>
            </View>
          </View>
        </View>

        {/* Investment Opportunity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Investment Opportunity</Text>
          <View style={styles.investmentCard}>
            <Text style={styles.investmentTitle}>Series A Round</Text>
            <Text style={styles.investmentAmount}>$2.5M Target</Text>
            <Text style={styles.investmentDetails}>
              Seeking strategic investment to accelerate product development, expand market reach, and strengthen competitive positioning in the professional networking space.
            </Text>

            <View style={styles.useOfFunds}>
              <Text style={styles.useOfFundsTitle}>Use of Funds:</Text>
              <Text style={styles.useOfFundsItem}>• Product Development: 40%</Text>
              <Text style={styles.useOfFundsItem}>• Market Expansion: 30%</Text>
              <Text style={styles.useOfFundsItem}>• Team Growth: 20%</Text>
              <Text style={styles.useOfFundsItem}>• Marketing & Sales: 10%</Text>
            </View>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.contactCard}>
            <Text style={styles.contactTitle}>Investment Inquiries</Text>
            <Text style={styles.contactEmail}>investors@sixdegreesnetwork.com</Text>
            <Text style={styles.contactPhone}>(555) 123-4567</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLightGray,
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
  heroSection: {
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    flex: 1,
    paddingBottom: 30,
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  sectionContent: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  metricGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E88E5',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricItem: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  metricItemValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E88E5',
    marginBottom: 4,
  },
  metricItemLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  metricItemGrowth: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  advantageList: {
    marginTop: 16,
  },
  advantageItem: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  advantageContent: {
    flex: 1,
    marginLeft: 16,
  },
  advantageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  advantageDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  businessModelGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  businessModelCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  businessModelTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  businessModelValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E88E5',
    marginBottom: 4,
  },
  businessModelDesc: {
    fontSize: 12,
    color: '#666',
  },
  investmentCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 20,
    marginTop: 16,
  },
  investmentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  investmentAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E88E5',
    marginBottom: 12,
  },
  investmentDetails: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  useOfFunds: {
    marginTop: 16,
  },
  useOfFundsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  useOfFundsItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  contactCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 20,
    marginTop: 16,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  contactEmail: {
    fontSize: 16,
    color: '#1E88E5',
    marginBottom: 8,
  },
  contactPhone: {
    fontSize: 16,
    color: '#666',
  },
});
