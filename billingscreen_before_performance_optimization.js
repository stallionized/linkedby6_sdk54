import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import { 
  StripeProvider, 
  CardField, 
  useStripe,
  isPlatformPaySupported,
  PlatformPay,
  usePlatformPay,
  initStripe
} from '@stripe/stripe-react-native';
import { supabase } from './supabaseClient';
import MobileHeader from './MobileHeader';
import MobileBottomNavigation from './MobileBottomNavigation';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

// Stripe configuration
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51RXw4A4RjCM7xxHpvdyxvP5OqfOsL80xdsp6217MWItGmJ6IYNa4M7WxVnvZmdprZBy9jbGQ6q5oMkMj0sDWceoV00DgmppGMz';

// Get Stripe server URL from app.json
const STRIPE_SERVER_URL = Constants.expoConfig?.extra?.stripeServerUrl || 'https://stripeserver-2w6d.onrender.com';

// URL Scheme for redirects
const URL_SCHEME = Constants.appOwnership === 'expo' 
  ? Linking.createURL('/--/') 
  : Linking.createURL('');

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

// Payment Method Types
const PAYMENT_METHODS = {
  CARD: 'card',
  APPLE_PAY: 'apple_pay',
  GOOGLE_PAY: 'google_pay',
};

// Payment Method Selector Component
const PaymentMethodSelector = ({ 
  selectedMethod, 
  onMethodSelect, 
  availableMethods,
  isExpoGo 
}) => {
  const getMethodIcon = (method) => {
    switch (method) {
      case PAYMENT_METHODS.CARD:
        return '💳';
      case PAYMENT_METHODS.APPLE_PAY:
        return '🍎';
      case PAYMENT_METHODS.GOOGLE_PAY:
        return '🟢';
      default:
        return '💳';
    }
  };

  const getMethodName = (method) => {
    switch (method) {
      case PAYMENT_METHODS.CARD:
        return 'Credit/Debit Card';
      case PAYMENT_METHODS.APPLE_PAY:
        return 'Apple Pay';
      case PAYMENT_METHODS.GOOGLE_PAY:
        return 'Google Pay';
      default:
        return 'Card';
    }
  };

  const getMethodDescription = (method) => {
    switch (method) {
      case PAYMENT_METHODS.CARD:
        return 'Visa, Mastercard, American Express';
      case PAYMENT_METHODS.APPLE_PAY:
        return isExpoGo ? 'Requires development build' : 'Touch ID or Face ID';
      case PAYMENT_METHODS.GOOGLE_PAY:
        return isExpoGo ? 'Requires development build' : 'Quick and secure';
      default:
        return '';
    }
  };

  return (
    <View style={styles.paymentMethodSelector}>
      <Text style={styles.sectionTitle}>Choose Payment Method</Text>
      
      {availableMethods.map((method) => (
        <TouchableOpacity
          key={method}
          style={[
            styles.paymentMethodOption,
            selectedMethod === method && styles.paymentMethodOptionSelected,
            (isExpoGo && method !== PAYMENT_METHODS.CARD) && styles.paymentMethodOptionDisabled
          ]}
          onPress={() => {
            if (isExpoGo && method !== PAYMENT_METHODS.CARD) {
              Alert.alert(
                'Development Build Required',
                `${getMethodName(method)} requires a development build and is not available in Expo Go. Please use card payment or create a development build.`
              );
              return;
            }
            onMethodSelect(method);
          }}
          disabled={isExpoGo && method !== PAYMENT_METHODS.CARD}
        >
          <View style={styles.paymentMethodContent}>
            <View style={styles.paymentMethodLeft}>
              <Text style={styles.paymentMethodIcon}>{getMethodIcon(method)}</Text>
              <View style={styles.paymentMethodText}>
                <Text style={[
                  styles.paymentMethodName,
                  (isExpoGo && method !== PAYMENT_METHODS.CARD) && styles.paymentMethodNameDisabled
                ]}>
                  {getMethodName(method)}
                </Text>
                <Text style={[
                  styles.paymentMethodDescription,
                  (isExpoGo && method !== PAYMENT_METHODS.CARD) && styles.paymentMethodDescriptionDisabled
                ]}>
                  {getMethodDescription(method)}
                </Text>
              </View>
            </View>
            <View style={[
              styles.paymentMethodRadio,
              selectedMethod === method && styles.paymentMethodRadioSelected
            ]}>
              {selectedMethod === method && (
                <View style={styles.paymentMethodRadioInner} />
              )}
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Card Payment Form Component
const CardPaymentForm = ({ 
  onCardComplete, 
  onCardError 
}) => {
  return (
    <View style={styles.cardPaymentForm}>
      <Text style={styles.sectionTitle}>Card Information</Text>
      <Text style={styles.sectionSubtitle}>
        Enter your card details below
      </Text>
      
      <View style={styles.cardFieldContainer}>
        <CardField
          postalCodeEnabled={true}
          placeholders={{
            number: '4242 4242 4242 4242',
            expiration: 'MM/YY',
            cvc: 'CVC',
            postalCode: '12345',
          }}
          cardStyle={styles.cardFieldStyle}
          style={styles.cardField}
          onCardChange={(cardDetails) => {
            console.log('Card details changed:', cardDetails);
            onCardComplete(cardDetails.complete);
            onCardError(cardDetails.error?.message || null);
          }}
        />
      </View>

      <View style={styles.securityNotice}>
        <Text style={styles.securityText}>
          🔒 Your payment information is secure and encrypted
        </Text>
      </View>
    </View>
  );
};

// Platform Pay Form Component (Apple Pay / Google Pay)
const PlatformPayForm = ({ 
  paymentMethod, 
  planPrice, 
  billingCycle 
}) => {
  const getPaymentMethodName = () => {
    return paymentMethod === PAYMENT_METHODS.APPLE_PAY ? 'Apple Pay' : 'Google Pay';
  };

  const getPaymentMethodIcon = () => {
    return paymentMethod === PAYMENT_METHODS.APPLE_PAY ? '🍎' : '🟢';
  };

  return (
    <View style={styles.platformPayForm}>
      <Text style={styles.sectionTitle}>{getPaymentMethodName()}</Text>
      <Text style={styles.sectionSubtitle}>
        Complete your payment with {getPaymentMethodName()}
      </Text>
      
      <View style={styles.platformPayInfo}>
        <Text style={styles.platformPayIcon}>{getPaymentMethodIcon()}</Text>
        <View style={styles.platformPayText}>
          <Text style={styles.platformPayTitle}>
            Ready to pay with {getPaymentMethodName()}
          </Text>
          <Text style={styles.platformPayDescription}>
            ${planPrice}/{billingCycle === 'yearly' ? 'year' : 'month'}
          </Text>
        </View>
      </View>

      <View style={styles.securityNotice}>
        <Text style={styles.securityText}>
          🔒 Secure payment powered by {getPaymentMethodName()}
        </Text>
      </View>
    </View>
  );
};

// Payment Form Component (uses Stripe hooks)
const PaymentForm = ({ 
  planId, 
  planName, 
  planPrice, 
  billingCycle, 
  currentUser, 
  onPaymentSuccess, 
  onPaymentError 
}) => {
  const { confirmPayment, createPaymentMethod } = useStripe();
  const { confirmPlatformPayPayment } = usePlatformPay();
  
  const [loading, setLoading] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardError, setCardError] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(PAYMENT_METHODS.CARD);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState([PAYMENT_METHODS.CARD]);
  const [isExpoGo, setIsExpoGo] = useState(false);

  // Check available payment methods on mount
  useEffect(() => {
    const checkPaymentMethods = async () => {
      const methods = [PAYMENT_METHODS.CARD];
      
      // Check if running in Expo Go
      const expoGo = Constants.appOwnership === 'expo';
      setIsExpoGo(expoGo);
      
      if (!expoGo) {
        // Check Apple Pay availability (iOS only)
        if (Platform.OS === 'ios') {
          try {
            const isApplePaySupported = await isPlatformPaySupported();
            if (isApplePaySupported) {
              methods.push(PAYMENT_METHODS.APPLE_PAY);
            }
          } catch (error) {
            console.log('Apple Pay check failed:', error);
          }
        }
        
        // Check Google Pay availability (Android only)
        if (Platform.OS === 'android') {
          try {
            const isGooglePaySupported = await isPlatformPaySupported({
              googlePay: {
                testEnv: true, // Set to false in production
                merchantName: 'Linked By Six',
                countryCode: 'US',
                billingAddressConfig: {
                  format: 'FULL',
                  isRequired: true,
                },
                existingPaymentMethodRequired: false,
              },
            });
            if (isGooglePaySupported) {
              methods.push(PAYMENT_METHODS.GOOGLE_PAY);
            }
          } catch (error) {
            console.log('Google Pay check failed:', error);
          }
        }
      } else {
        // In Expo Go, show all methods but disable platform payments
        if (Platform.OS === 'ios') {
          methods.push(PAYMENT_METHODS.APPLE_PAY);
        }
        if (Platform.OS === 'android') {
          methods.push(PAYMENT_METHODS.GOOGLE_PAY);
        }
      }
      
      setAvailablePaymentMethods(methods);
      console.log('Available payment methods:', methods);
    };

    checkPaymentMethods();
  }, []);

  // Handle card payment
  const handleCardPayment = async () => {
    if (!cardComplete) {
      Alert.alert('Incomplete Card', 'Please complete your card information');
      return;
    }

    setLoading(true);
    
    try {
      console.log('Starting card payment process...');
      
      // Step 1: Create payment method
      const { paymentMethod, error: pmError } = await createPaymentMethod({
        paymentMethodType: 'Card',
        paymentMethodData: {
          billingDetails: {
            email: currentUser.email,
          },
        },
      });

      if (pmError) {
        console.error('Payment method creation error:', pmError);
        throw new Error(pmError.message || 'Failed to create payment method');
      }

      console.log('Payment method created:', paymentMethod.id);
      await processSubscription(paymentMethod.id);

    } catch (error) {
      console.error('Card payment error:', error);
      onPaymentError(error.message || 'Card payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle platform pay (Apple Pay / Google Pay)
  const handlePlatformPay = async () => {
    setLoading(true);
    
    try {
      console.log('Starting platform pay process...');
      
      const priceId = STRIPE_PRICE_IDS[planId]?.[billingCycle];
      if (!priceId) {
        throw new Error(`No Stripe price ID found for plan: ${planId} (${billingCycle})`);
      }

      // Create payment intent on backend first
      const paymentIntentResponse = await fetch(`${STRIPE_SERVER_URL}/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: planPrice * 100, // Convert to cents
          currency: 'usd',
          email: currentUser.email,
          userId: currentUser.id,
          planId: planId,
          planName: planName,
          billingCycle: billingCycle,
        }),
      });

      if (!paymentIntentResponse.ok) {
        const errorData = await paymentIntentResponse.json();
        throw new Error(errorData.error || 'Failed to create payment intent');
      }

      const { clientSecret } = await paymentIntentResponse.json();

      // Configure platform pay options
      const platformPayOptions = {
        applePay: Platform.OS === 'ios' ? {
          cartItems: [{
            label: `${planName} Plan`,
            amount: `${planPrice}.00`,
            paymentType: 'Immediate',
          }],
          merchantCountryCode: 'US',
          currencyCode: 'USD',
          requiredShippingAddressFields: [],
          requiredBillingContactFields: ['emailAddress'],
        } : undefined,
        googlePay: Platform.OS === 'android' ? {
          testEnv: true, // Set to false in production
          merchantName: 'Linked By Six',
          countryCode: 'US',
          billingAddressConfig: {
            format: 'FULL',
            isRequired: true,
          },
          existingPaymentMethodRequired: false,
        } : undefined,
      };

      // Confirm platform pay payment
      const { error: confirmError } = await confirmPlatformPayPayment(
        clientSecret,
        platformPayOptions
      );

      if (confirmError) {
        console.error('Platform pay confirmation error:', confirmError);
        throw new Error(confirmError.message || 'Platform payment failed');
      }

      // Create subscription after successful payment
      await createSubscriptionAfterPayment();

    } catch (error) {
      console.error('Platform pay error:', error);
      onPaymentError(error.message || 'Platform payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Process subscription creation
  const processSubscription = async (paymentMethodId) => {
    const priceId = STRIPE_PRICE_IDS[planId]?.[billingCycle];
    if (!priceId) {
      throw new Error(`No Stripe price ID found for plan: ${planId} (${billingCycle})`);
    }

    console.log('Creating subscription with price ID:', priceId);

    const subscriptionResponse = await fetch(`${STRIPE_SERVER_URL}/create-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: currentUser.email,
        paymentMethodId: paymentMethodId,
        priceId: priceId,
        userId: currentUser.id,
        planId: planId,
        planName: planName,
        billingCycle: billingCycle,
      }),
    });

    if (!subscriptionResponse.ok) {
      const errorData = await subscriptionResponse.json();
      console.error('Subscription creation error:', errorData);
      throw new Error(errorData.error || 'Failed to create subscription');
    }

    const subscriptionData = await subscriptionResponse.json();
    console.log('Subscription response:', subscriptionData);

    // Handle payment confirmation if needed
    if (subscriptionData.clientSecret) {
      console.log('Confirming payment with client secret...');
      
      const { error: confirmError } = await confirmPayment(subscriptionData.clientSecret, {
        paymentMethodType: 'Card',
      });

      if (confirmError) {
        console.error('Payment confirmation error:', confirmError);
        throw new Error(confirmError.message || 'Payment confirmation failed');
      }
    }

    await updateDatabase(subscriptionData);
  };

  // Create subscription after platform payment
  const createSubscriptionAfterPayment = async () => {
    // Update local database
    try {
      await supabase
        .from('business_profiles')
        .upsert({
          user_id: currentUser.id,
          subscription_status: 'active',
          plan_id: planId,
          plan_name: planName,
          billing_cycle: billingCycle,
          updated_at: new Date().toISOString(),
        });
      
      console.log('Database updated successfully');
    } catch (dbError) {
      console.warn('Database update failed:', dbError);
    }

    console.log('Platform payment completed successfully!');
    onPaymentSuccess({ subscriptionId: 'platform_pay_subscription' });
  };

  // Update database after successful payment
  const updateDatabase = async (subscriptionData) => {
    try {
      await supabase
        .from('business_profiles')
        .upsert({
          user_id: currentUser.id,
          stripe_customer_id: subscriptionData.customerId,
          subscription_id: subscriptionData.subscriptionId,
          subscription_status: 'active',
          plan_id: planId,
          plan_name: planName,
          billing_cycle: billingCycle,
          updated_at: new Date().toISOString(),
        });
      
      console.log('Database updated successfully');
    } catch (dbError) {
      console.warn('Database update failed:', dbError);
      // Continue anyway as payment was successful
    }

    console.log('Payment completed successfully!');
    onPaymentSuccess(subscriptionData);
  };

  // Handle payment submission
  const handlePayment = async () => {
    if (selectedPaymentMethod === PAYMENT_METHODS.CARD) {
      await handleCardPayment();
    } else {
      await handlePlatformPay();
    }
  };

  // Check if payment can proceed
  const canProceedWithPayment = () => {
    if (selectedPaymentMethod === PAYMENT_METHODS.CARD) {
      return cardComplete;
    }
    return true; // Platform payments don't need pre-validation
  };

  return (
    <View style={styles.paymentFormContainer}>
      {/* Plan Summary */}
      <View style={styles.planSummaryCard}>
        <Text style={styles.planSummaryTitle}>Selected Plan</Text>
        <Text style={styles.planSummaryName}>{planName}</Text>
        <Text style={styles.planSummaryPrice}>
          ${planPrice}/{billingCycle === 'yearly' ? 'year' : 'month'}
        </Text>
        <Text style={styles.planSummaryBilling}>
          {billingCycle === 'yearly' ? 'Billed annually' : 'Billed monthly'}
        </Text>
      </View>

      {/* Payment Method Selector */}
      <View style={styles.paymentMethodCard}>
        <PaymentMethodSelector
          selectedMethod={selectedPaymentMethod}
          onMethodSelect={setSelectedPaymentMethod}
          availableMethods={availablePaymentMethods}
          isExpoGo={isExpoGo}
        />
      </View>

      {/* Payment Form based on selected method */}
      <View style={styles.paymentMethodCard}>
        {selectedPaymentMethod === PAYMENT_METHODS.CARD ? (
          <CardPaymentForm
            onCardComplete={setCardComplete}
            onCardError={setCardError}
          />
        ) : (
          <PlatformPayForm
            paymentMethod={selectedPaymentMethod}
            planPrice={planPrice}
            billingCycle={billingCycle}
          />
        )}
        
        {/* Card Error Display */}
        {cardError && selectedPaymentMethod === PAYMENT_METHODS.CARD && (
          <Text style={styles.cardErrorText}>{cardError}</Text>
        )}
      </View>

      {/* Payment Button */}
      <TouchableOpacity
        style={[
          styles.paymentButton,
          (!canProceedWithPayment() || loading) && styles.paymentButtonDisabled
        ]}
        onPress={handlePayment}
        disabled={!canProceedWithPayment() || loading}
      >
        {loading ? (
          <View style={styles.paymentButtonContent}>
            <ActivityIndicator size="small" color={colors.cardWhite} />
            <Text style={styles.paymentButtonText}>Processing...</Text>
          </View>
        ) : (
          <Text style={styles.paymentButtonText}>
            {selectedPaymentMethod === PAYMENT_METHODS.
