import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { supabase } from './supabaseClient';
import MobileHeader from './MobileHeader';
import MobileBottomNavigation from './MobileBottomNavigation';

// Stripe configuration - Direct Stripe integration
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51RXw4A4RjCM7xxHpvdyxvP5OqfOsL80xdsp6217MWItGmJ6IYNa4M7WxVnvZmdprZBy9jbGQ6q5oMkMj0sDWceoV00DgmppGMz'; // Replace with your publishable key

// Stripe Price IDs for each plan (you'll need to create these in your Stripe dashboard)
const STRIPE_PRICE_IDS = {
  essential: {
    monthly: 'price_essential_monthly', // Replace with actual Stripe price ID
    yearly: 'price_essential_yearly',   // Replace with actual Stripe price ID
  },
  growth: {
    monthly: 'price_growth_monthly',    // Replace with actual Stripe price ID
    yearly: 'price_growth_yearly',      // Replace with actual Stripe price ID
  },
  'pro-enterprise': {
    monthly: 'price_pro_monthly',       // Replace with actual Stripe price ID
    yearly: 'price_pro_yearly',         // Replace with actual Stripe price ID
  },
};

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

const BillingScreen = ({ navigation, route }) => {
  // Extract plan selection data from BusinessPricingScreen
  const { 
    planId, 
    planName, 
    planPrice, 
    billingCycle, 
    isNewSubscription 
  } = route?.params || {};

  const [loading, setLoading] = useState(false);
  const [stripeCustomerId, setStripeCustomerId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [error, setError] = useState(null);
  
  // State to control checkout rendering
  const [showCheckout, setShowCheckout] = useState(false);
  const checkoutMountedRef = useRef(false);

  // Simplified initialization flow for checkout only
  const initializeBillingFlow = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        Alert.alert('Error', 'Please log in to continue');
        navigation.goBack();
        return;
      }

      setCurrentUser(user);

      // Get or create Stripe customer
      let customerId = null;
      try {
        const { data: profileData } = await supabase
          .from('business_profiles')
          .select('stripe_customer_id')
          .eq('user_id', user.id)
          .single();

        customerId = profileData?.stripe_customer_id;
      } catch (error) {
        console.log('No existing business profile found');
      }

      // Create Stripe customer if doesn't exist
      if (!customerId) {
        try {
          customerId = await createStripeCustomer(user.email, user.id);
          console.log('Created Stripe customer:', customerId);
        } catch (error) {
          console.error('Failed to create Stripe customer:', error);
          Alert.alert('Error', 'Failed to initialize payment system. Please try again.');
          return;
        }
      }

      setStripeCustomerId(customerId);

      // Create checkout session and get URL for mobile
      await createCheckoutSession();

    } catch (error) {
      console.error('Error initializing billing flow:', error);
      setError(error.message || 'Failed to initialize billing information. Please try again.');
      Alert.alert('Error', 'Failed to initialize billing information. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  // Create checkout session using direct Stripe API
  const createCheckoutSession = useCallback(async () => {
    try {
      console.log('Creating Stripe checkout session...');
      console.log('Plan details:', { planId, planName, planPrice, billingCycle });
      console.log('Current user:', currentUser);
      console.log('User email:', currentUser?.email);
      
      // Validate user email
      if (!currentUser?.email || currentUser.email.trim() === '') {
        throw new Error('User email is required for checkout. Please ensure you are logged in with a valid email address.');
      }
      
      // Get the Stripe price ID for the selected plan
      const priceId = STRIPE_PRICE_IDS[planId]?.[billingCycle];
      
      if (!priceId) {
        throw new Error(`No Stripe price ID found for plan: ${planId} (${billingCycle})`);
      }
      
      console.log('Using Stripe price ID:', priceId);
      console.log('Using email for checkout:', currentUser.email);
      
      // Create checkout session using Stripe API
      const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRIPE_PUBLISHABLE_KEY.replace('pk_', 'sk_')}`, // Convert to secret key
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'payment_method_types[]': 'card',
          'line_items[0][price]': priceId,
          'line_items[0][quantity]': '1',
          'mode': 'subscription',
          'success_url': 'https://your-app.com/success?session_id={CHECKOUT_SESSION_ID}',
          'cancel_url': 'https://your-app.com/cancel',
          'customer_email': currentUser.email.trim(),
          'metadata[user_id]': currentUser?.id || '',
          'metadata[plan_id]': planId,
          'metadata[plan_name]': planName,
          'metadata[billing_cycle]': billingCycle,
        }).toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Stripe API error response:', errorData);
        throw new Error(`Stripe API error: ${errorData.error?.message || response.statusText}`);
      }
      
      const session = await response.json();
      console.log('Stripe checkout session created:', session.id);
      
      if (!session.url) {
        throw new Error('No checkout URL received from Stripe');
      }
      
      // Set the official Stripe checkout URL
      setCheckoutUrl(session.url);
      setShowCheckout(true);
      
    } catch (error) {
      console.error('Error creating Stripe checkout session:', error);
      setError(error.message);
      throw error;
    }
  }, [planId, planName, planPrice, billingCycle, currentUser]);

  // Initialize on mount
  useEffect(() => {
    initializeBillingFlow();
    
    // Cleanup function to reset checkout state
    return () => {
      setShowCheckout(false);
      checkoutMountedRef.current = false;
    };
  }, [initializeBillingFlow]);

  // Create Stripe customer function using direct Stripe API
  const createStripeCustomer = useCallback(async (email, userId) => {
    try {
      console.log('Creating Stripe customer for:', email);
      
      // Validate email before creating customer
      if (!email || email.trim() === '') {
        throw new Error('Valid email address is required to create Stripe customer');
      }
      
      const response = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRIPE_PUBLISHABLE_KEY.replace('pk_', 'sk_')}`, // Convert to secret key
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'email': email.trim(),
          'metadata[user_id]': userId,
        }).toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Stripe customer creation error:', errorData);
        throw new Error(`Stripe API error: ${errorData.error?.message || response.statusText}`);
      }

      const customer = await response.json();
      console.log('Stripe customer created:', customer.id);
      
      // Save customer ID to Supabase
      try {
        await supabase
          .from('business_profiles')
          .upsert({
            user_id: userId,
            stripe_customer_id: customer.id,
          });
      } catch (dbError) {
        console.warn('Failed to save customer ID to database:', dbError);
        // Continue anyway, as the customer was created successfully
      }
      
      return customer.id;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw error;
    }
  }, []);

  // Handle WebView navigation state changes
  const handleWebViewNavigationStateChange = (navState) => {
    const { url } = navState;
    console.log('WebView navigation to:', url);
    
    // Handle success
    if (url.includes('billing-success') || url.includes('success')) {
      Alert.alert(
        'Payment Successful!',
        '🎉 Your subscription has been activated successfully.',
        [
          {
            text: 'Continue',
            onPress: () => {
              navigation.navigate('Search', {
                message: 'Subscription created successfully!',
                type: 'success'
              });
            }
          }
        ]
      );
      return false; // Prevent WebView from navigating
    }
    
    // Handle cancellation
    if (url.includes('billing-cancel') || url.includes('cancel')) {
      Alert.alert(
        'Payment Cancelled',
        'Your payment was cancelled. You can try again anytime.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
      return false; // Prevent WebView from navigating
    }
    
    return true; // Allow navigation for other URLs
  };

  // Retry function
  const handleRetry = () => {
    setError(null);
    setShowCheckout(false);
    setCheckoutUrl(null);
    initializeBillingFlow();
  };

  // Open in external browser option
  const openInBrowser = () => {
    if (checkoutUrl) {
      Linking.openURL(checkoutUrl);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <MobileHeader 
          navigation={navigation} 
          title="Billing" 
          showBackButton={true} 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryBlue} />
          <Text style={styles.loadingText}>
            Setting up your subscription...
          </Text>
          <Text style={styles.loadingSubtext}>
            This should only take a moment
          </Text>
        </View>
        <MobileBottomNavigation navigation={navigation} activeRoute="Billing" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <MobileHeader 
        navigation={navigation} 
        title="Billing" 
        showBackButton={true} 
      />
      
      <View style={styles.content}>
        {/* Title Header */}
        <View style={styles.titleContainer}>
          <Text style={styles.pageTitle}>
            Complete Subscription
          </Text>
          {planName && (
            <Text style={styles.planSubtitle}>
              {planName} - {billingCycle === 'yearly' ? 'Annual' : 'Monthly'} Plan
            </Text>
          )}
          {planPrice && (
            <Text style={styles.priceSubtitle}>
              ${planPrice}/{billingCycle === 'yearly' ? 'year' : 'month'}
            </Text>
          )}
        </View>

        {/* Error State */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              ⚠️ Payment system temporarily unavailable
            </Text>
            <Text style={styles.errorSubtext}>
              {error}
            </Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={handleRetry}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Checkout WebView */}
        {showCheckout && checkoutUrl && !error && (
          <View style={styles.checkoutContainer}>
            <View style={styles.checkoutHeader}>
              <Text style={styles.checkoutHeaderText}>
                Secure Payment by Stripe
              </Text>
              <TouchableOpacity 
                style={styles.browserButton}
                onPress={openInBrowser}
              >
                <Text style={styles.browserButtonText}>
                  Open in Browser
                </Text>
              </TouchableOpacity>
            </View>
            
            <WebView
              source={{ uri: checkoutUrl }}
              style={styles.webview}
              onNavigationStateChange={handleWebViewNavigationStateChange}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.webviewLoading}>
                  <ActivityIndicator size="large" color={colors.primaryBlue} />
                  <Text style={styles.webviewLoadingText}>Loading payment form...</Text>
                </View>
              )}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              // Handle errors
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error('WebView error:', nativeEvent);
                setError('Failed to load payment form. Please try again.');
              }}
              // Security settings
              allowsBackForwardNavigationGestures={false}
              scalesPageToFit={true}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={true}
            />
          </View>
        )}
      </View>
      
      <MobileBottomNavigation navigation={navigation} activeRoute="Billing" />
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
  titleContainer: {
    backgroundColor: colors.cardWhite,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primaryBlue,
    marginBottom: 8,
    textAlign: 'center',
  },
  planSubtitle: {
    fontSize: 18,
    color: colors.textDark,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  priceSubtitle: {
    fontSize: 20,
    color: colors.primaryBlue,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundGray,
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textDark,
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textMedium,
    textAlign: 'center',
  },
  errorContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fed7d7',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.error,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#9b2c2c',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.error,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.cardWhite,
    fontWeight: '600',
    fontSize: 16,
  },
  checkoutContainer: {
    flex: 1,
    backgroundColor: colors.cardWhite,
  },
  checkoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.backgroundGray,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  checkoutHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMedium,
  },
  browserButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primaryBlue,
  },
  browserButtonText: {
    fontSize: 12,
    color: colors.primaryBlue,
    fontWeight: '500',
  },
  webview: {
    flex: 1,
    backgroundColor: colors.cardWhite,
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cardWhite,
  },
  webviewLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textMedium,
    textAlign: 'center',
  },
});

export default BillingScreen;
