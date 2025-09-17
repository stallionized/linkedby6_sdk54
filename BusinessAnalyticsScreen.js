import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from './Auth';
import { supabase } from './supabaseClient';
import MobileHeader from './MobileHeader';
import MobileBusinessNavigation from './MobileBusinessNavigation';

const { width: screenWidth } = Dimensions.get('window');

const colors = {
  primaryGreen: '#10B981',
  lightGreen: '#6EE7B7',
  darkGreen: '#047857',
  backgroundGray: '#F5F7FA',
  cardWhite: '#FFFFFF',
  textDark: '#263238',
  textMedium: '#546E7A',
  textLight: '#90A4AE',
  borderLight: '#E0E7FF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

const BusinessAnalyticsScreen = ({ navigation, isBusinessMode, onBusinessModeToggle }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [businessProfile, setBusinessProfile] = useState(null);

  useEffect(() => {
    fetchBusinessProfile();
  }, [user]);

  const fetchBusinessProfile = async () => {
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profile && !error) {
        setBusinessProfile(profile);
      }
    } catch (error) {
      console.log('No business profile found');
    }
  };

  const renderPlaceholderCard = (title, icon, description) => (
    <View style={styles.card} key={title}>
      <View style={styles.cardHeader}>
        <MaterialIcons name={icon} size={24} color={colors.primaryGreen} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={styles.cardDescription}>{description}</Text>
      <View style={styles.placeholderContent}>
        <Text style={styles.placeholderText}>Coming Soon</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <MobileHeader
        navigation={navigation}
        title="Business Analytics"
        showBackButton={false}
        isBusinessMode={isBusinessMode}
        onBusinessModeToggle={onBusinessModeToggle}
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Track your business performance and insights
          </Text>
        </View>

        <View style={styles.cardsContainer}>
          {renderPlaceholderCard(
            'Revenue Overview',
            'trending-up',
            'Monitor your business revenue trends and growth'
          )}
          
          {renderPlaceholderCard(
            'Customer Insights',
            'people',
            'Analyze customer behavior and engagement metrics'
          )}
          
          {renderPlaceholderCard(
            'Sales Performance',
            'bar-chart',
            'Track sales metrics and conversion rates'
          )}
          
          {renderPlaceholderCard(
            'Marketing Analytics',
            'campaign',
            'Measure marketing campaign effectiveness'
          )}
          
          {renderPlaceholderCard(
            'Financial Reports',
            'account-balance',
            'Generate detailed financial reports and statements'
          )}
          
          {renderPlaceholderCard(
            'Growth Metrics',
            'show-chart',
            'Monitor business growth and key performance indicators'
          )}
        </View>

        <View style={styles.comingSoonSection}>
          <MaterialIcons name="construction" size={48} color={colors.textLight} />
          <Text style={styles.comingSoonTitle}>Analytics Coming Soon</Text>
          <Text style={styles.comingSoonText}>
            We're working on powerful analytics tools to help you understand your business better. 
            Stay tuned for detailed insights, reports, and performance metrics.
          </Text>
        </View>
      </ScrollView>

      <MobileBusinessNavigation navigation={navigation} activeRoute="BusinessAnalytics" visible={true} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  content: {
    flex: 1,
    paddingBottom: 100, // Account for bottom navigation
  },
  header: {
    padding: 20,
    backgroundColor: colors.cardWhite,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.textMedium,
    lineHeight: 22,
  },
  cardsContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  card: {
    backgroundColor: colors.cardWhite,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textDark,
    marginLeft: 12,
  },
  cardDescription: {
    fontSize: 14,
    color: colors.textMedium,
    lineHeight: 20,
    marginBottom: 16,
  },
  placeholderContent: {
    backgroundColor: colors.backgroundGray,
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 16,
    color: colors.textLight,
    fontWeight: '500',
  },
  comingSoonSection: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 24,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textDark,
    marginTop: 16,
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 16,
    color: colors.textMedium,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
});

export default BusinessAnalyticsScreen;
