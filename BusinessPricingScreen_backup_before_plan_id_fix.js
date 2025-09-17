import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView, 
  TouchableOpacity, 
  Text,
  Alert,
  Dimensions 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import MobileHeader from './MobileHeader';
import MobileBottomNavigation from './MobileBottomNavigation';

const { width: screenWidth } = Dimensions.get('window');

const colors = {
  primaryBlue: '#1E88E5',
  lightBlue: '#90CAF9',
  darkBlue: '#0D47A1',
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

const BusinessPricingScreen = ({ navigation }) => {
  const [selectedPlan, setSelectedPlan] = useState('');
  const [selectedFrequency, setSelectedFrequency] = useState('monthly');

  console.log('BusinessPricingScreen rendered, selectedPlan:', selectedPlan, 'frequency:', selectedFrequency);

  // Monitor state changes
  useEffect(() => {
    console.log('*** selectedPlan state changed to:', selectedPlan);
  }, [selectedPlan]);

  // Complete pricing tiers with all features (from original)
  const TIERS = [
    {
      id: "essential",
      name: "Essential",
      price: {
        monthly: 49,
        yearly: 499,
      },
      description: "Standard directory placement",
      features: [
        "Directory Placement: Standard",
        "Employee Accounts: 1",
        "Analytics: Basic",
        "Included Leads/Month: 0",
        "Per Additional Lead: $2",
        "Account Manager: No",
      ],
      cta: "Select Plan",
    },
    {
      id: "growth",
      name: "Growth",
      price: {
        monthly: 99,
        yearly: 999,
      },
      description: "Priority directory placement",
      features: [
        "Directory Placement: Mid",
        "Employee Accounts: 5",
        "Analytics: Advanced",
        "Included Leads/Month: 5",
        "Per Additional Lead: $2",
        "Account Manager: No",
      ],
      cta: "Select Plan",
      popular: true,
    },
    {
      id: "pro-enterprise",
      name: "Pro/Enterprise",
      price: {
        monthly: 199,
        yearly: 1999,
      },
      description: "Featured/Top directory placement",
      features: [
        "Directory Placement: Top",
        "Employee Accounts: 15",
        "Analytics: Premium/Export",
        "Included Leads/Month: 20",
        "Per Additional Lead: $2",
        "Account Manager: Yes",
      ],
      cta: "Select Plan",
    },
  ];

  const handleSelectPlan = (planId) => {
    console.log('=== PLAN SELECTION CLICKED ===');
    console.log('Plan ID clicked:', planId);
    console.log('Previous selectedPlan:', selectedPlan);
    
    setSelectedPlan(planId);
    
    console.log('setSelectedPlan called with:', planId);
    console.log('State should update to:', planId);
  };

  const handleContinueToPayment = () => {
    console.log('=== CONTINUE TO PAYMENT CLICKED ===');
    console.log('Current selectedPlan:', selectedPlan);
    console.log('Current frequency:', selectedFrequency);
    
    if (!selectedPlan) {
      console.log('No plan selected, showing alert');
      Alert.alert('Select Plan', 'Please select a plan first');
      return;
    }

    const plan = TIERS.find(p => p.id === selectedPlan);
    console.log('Found plan object:', plan);
    
    if (!plan) {
      console.log('ERROR: Plan not found in TIERS array');
      Alert.alert('Error', 'Plan not found');
      return;
    }

    console.log('Plan found, proceeding with navigation...');
    console.log('Navigation object exists:', !!navigation);
    
    const navigationData = {
      planId: plan.id,
      planName: plan.name,
      planPrice: plan.price[selectedFrequency],
      billingCycle: selectedFrequency,
      isNewSubscription: true
    };
    
    console.log('About to navigate to Billing with data:', navigationData);
    
    try {
      navigation.navigate('Billing', navigationData);
      console.log('✅ Navigation call completed successfully');
    } catch (error) {
      console.error('❌ Navigation error:', error);
      Alert.alert('Navigation Error', error.message);
    }
  };

  // Find the selected plan object
  const selectedPlanObject = TIERS.find(tier => tier.id === selectedPlan) || null;

  // Calculate card width for mobile
  const cardWidth = screenWidth > 768 ? (screenWidth - 64) / 3 - 16 : screenWidth - 32;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <MobileHeader 
        navigation={navigation} 
        title="Business Pricing" 
        showBackButton={true} 
      />

      <View style={styles.content}>
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Business Prices</Text>
            <Text style={styles.subtitle}>Choose the best plan for your business needs</Text>
          </View>

          {/* Frequency Selector */}
          <View style={styles.frequencyContainer}>
            <TouchableOpacity
              style={[
                styles.frequencyButton,
                selectedFrequency === 'monthly' && styles.frequencyButtonActive
              ]}
              onPress={() => {
                console.log('Switching to monthly');
                setSelectedFrequency('monthly');
              }}
            >
              <Text style={[
                styles.frequencyText,
                selectedFrequency === 'monthly' && styles.frequencyTextActive
              ]}>
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.frequencyButton,
                selectedFrequency === 'yearly' && styles.frequencyButtonActive
              ]}
              onPress={() => {
                console.log('Switching to yearly');
                setSelectedFrequency('yearly');
              }}
            >
              <Text style={[
                styles.frequencyText,
                selectedFrequency === 'yearly' && styles.frequencyTextActive
              ]}>
                Yearly
              </Text>
              <Text style={styles.saveText}>Save 35%</Text>
            </TouchableOpacity>
          </View>

          {/* Pricing Cards */}
          <View style={styles.cardsContainer}>
            {TIERS.map((tier) => {
              const isSelected = selectedPlan === tier.id;
              const price = tier.price[selectedFrequency];
              
              return (
                <View
                  key={tier.id}
                  style={[
                    styles.card,
                    { width: cardWidth },
                    tier.popular && !isSelected && styles.cardPopular,
                    isSelected && styles.cardSelected
                  ]}
                >
                  {/* Popular Badge - always show for popular tiers */}
                  {tier.popular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularBadgeText}>🔥 Most Popular</Text>
                    </View>
                  )}

                  {/* Card Content */}
                  <View style={[
                    styles.cardContent, 
                    tier.popular && { marginTop: 20 }, // Space for popular banner
                    !tier.popular && { marginTop: 20 } // Matched spacing for perfect alignment
                  ]}>
                    <Text style={styles.planName}>{tier.name}</Text>
                    <Text style={styles.planDescription}>{tier.description}</Text>
                    
                    <View style={styles.priceContainer}>
                      <Text style={styles.price}>${price}</Text>
                      <Text style={styles.priceFrequency}>per {selectedFrequency.slice(0, -2)}</Text>
                    </View>

                    {/* Features */}
                    <View style={styles.featuresContainer}>
                      {tier.features.map((feature, index) => (
                        <View key={index} style={styles.featureItem}>
                          <View style={styles.checkIcon}>
                            <Text style={styles.checkIconText}>✓</Text>
                          </View>
                          <Text style={styles.featureText}>{feature}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Select Button */}
                    <TouchableOpacity
                      style={[
                        styles.selectButton,
                        isSelected && styles.selectButtonSelected
                      ]}
                      onPress={() => {
                        console.log(`Plan selection button clicked for: ${tier.name}`);
                        handleSelectPlan(tier.id);
                      }}
                    >
                      <Text style={[
                        styles.selectButtonText,
                        isSelected && styles.selectButtonTextSelected
                      ]}>
                        {isSelected ? '✓ SELECTED' : 'SELECT PLAN'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
          
          {/* Continue to Payment Button (appears when plan selected) */}
          {selectedPlan && (
            <View style={styles.continueButtonContainer}>
              <View style={styles.selectedPlanSummary}>
                <Text style={styles.selectedPlanText}>
                  ✅ Selected: {selectedPlanObject.name} Plan
                </Text>
                <Text style={styles.selectedPlanPrice}>
                  ${selectedPlanObject.price[selectedFrequency]}/{selectedFrequency.slice(0, -2)}
                </Text>
              </View>
              
              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleContinueToPayment}
              >
                <Text style={styles.continueButtonText}>
                  Continue to Payment
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Status Message when no plan selected */}
          {!selectedPlan && (
            <View style={styles.noSelectionContainer}>
              <Text style={styles.noSelectionText}>
                👆 Please select a plan above to continue
              </Text>
            </View>
          )}

          {/* Bottom padding for navigation */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>

      <MobileBottomNavigation navigation={navigation} activeRoute="BusinessPricing" />
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
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  headerContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: colors.cardWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.darkBlue,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMedium,
    textAlign: 'center',
  },
  frequencyContainer: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: colors.cardWhite,
    borderRadius: 25,
    padding: 4,
    margin: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  frequencyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 80,
  },
  frequencyButtonActive: {
    backgroundColor: colors.primaryBlue,
  },
  frequencyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textMedium,
  },
  frequencyTextActive: {
    color: colors.cardWhite,
  },
  saveText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: 'bold',
    marginTop: 2,
  },
  cardsContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: colors.cardWhite,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  cardPopular: {
    borderWidth: 2,
    borderColor: colors.primaryBlue,
    transform: [{ scale: 1.02 }],
  },
  cardSelected: {
    backgroundColor: '#f0f8ff',
    borderColor: colors.primaryBlue,
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    backgroundColor: colors.primaryBlue,
    paddingVertical: 10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  popularBadgeText: {
    color: colors.cardWhite,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  cardContent: {
    marginTop: 0,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  planDescription: {
    fontSize: 16,
    color: colors.textMedium,
    textAlign: 'center',
    marginBottom: 20,
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  price: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  priceFrequency: {
    fontSize: 14,
    color: colors.textMedium,
    marginTop: 4,
  },
  featuresContainer: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkIconText: {
    color: colors.cardWhite,
    fontSize: 12,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 15,
    color: colors.textMedium,
    flex: 1,
    lineHeight: 20,
  },
  selectButton: {
    backgroundColor: colors.primaryBlue,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  selectButtonSelected: {
    backgroundColor: colors.success,
  },
  selectButtonText: {
    color: colors.cardWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  selectButtonTextSelected: {
    color: colors.cardWhite,
    fontWeight: '700',
  },
  continueButtonContainer: {
    padding: 20,
    backgroundColor: colors.cardWhite,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: 20,
    marginHorizontal: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedPlanSummary: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primaryBlue,
  },
  selectedPlanText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 4,
  },
  selectedPlanPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primaryBlue,
  },
  continueButton: {
    backgroundColor: colors.primaryBlue,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  continueButtonText: {
    color: colors.cardWhite,
    fontSize: 18,
    fontWeight: '600',
  },
  noSelectionContainer: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    margin: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  noSelectionText: {
    fontSize: 16,
    color: colors.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  bottomPadding: {
    height: 100, // Space for bottom navigation
  },
});

export default BusinessPricingScreen;