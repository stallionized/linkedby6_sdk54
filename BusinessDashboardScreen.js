import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import MobileHeader from './MobileHeader';
import MobileBusinessNavigation from './MobileBusinessNavigation';

const BusinessDashboardScreen = ({ navigation, isBusinessMode, onBusinessModeToggle }) => {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <MobileHeader
        navigation={navigation}
        title="Business Dashboard"
        showBackButton={false}
        isBusinessMode={isBusinessMode}
        onBusinessModeToggle={onBusinessModeToggle}
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Business Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Your central hub for managing business operations
          </Text>
        </View>
        
        <View style={styles.placeholderContainer}>
          <MaterialIcons name="construction" size={48} color="#9E9E9E" />
          <Text style={styles.placeholderTitle}>Coming Soon</Text>
          <Text style={styles.placeholderText}>
            Your business dashboard is under development. This will be your central hub for managing business operations.
          </Text>
        </View>

        <View style={styles.cardsContainer}>
          <View style={styles.featureCard}>
            <MaterialIcons name="trending-up" size={24} color="#1E88E5" />
            <Text style={styles.featureTitle}>Performance</Text>
            <Text style={styles.featureDescription}>Track key metrics</Text>
          </View>
          
          <View style={styles.featureCard}>
            <MaterialIcons name="people" size={24} color="#1E88E5" />
            <Text style={styles.featureTitle}>Team</Text>
            <Text style={styles.featureDescription}>Manage your team</Text>
          </View>
          
          <View style={styles.featureCard}>
            <MaterialIcons name="schedule" size={24} color="#1E88E5" />
            <Text style={styles.featureTitle}>Schedule</Text>
            <Text style={styles.featureDescription}>View appointments</Text>
          </View>
          
          <View style={styles.featureCard}>
            <MaterialIcons name="settings" size={24} color="#1E88E5" />
            <Text style={styles.featureTitle}>Settings</Text>
            <Text style={styles.featureDescription}>Configure options</Text>
          </View>
        </View>
      </ScrollView>
      
      <MobileBusinessNavigation 
        navigation={navigation} 
        activeRoute="BusinessDashboard"
        visible={true}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    flex: 1,
    paddingBottom: 100, // Account for bottom navigation
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#546E7A',
    lineHeight: 22,
  },
  placeholderContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    marginBottom: 30,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666666',
    marginTop: 16,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  cardsContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginTop: 12,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
});

export default BusinessDashboardScreen;
