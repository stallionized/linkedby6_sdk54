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
  TextInput,
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
  onCardError,
  onBillingDetailsChange
}) => {
  const [billingDetails, setBillingDetails] = useState({
    name: '',
    email: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US'
    }
  });

  const [fieldErrors, setFieldErrors] = useState({});

  const handleBillingChange = (field, value, isAddress = false) => {
    let updatedDetails;
    if (isAddress) {
      updatedDetails = {
        ...billingDetails,
        address: {
          ...billingDetails.address,
          [field]: value
        }
      };
    } else {
      updatedDetails = {
        ...billingDetails,
        [field]: value
      };
    }
    
    setBillingDetails(updatedDetails);
    onBillingDetailsChange(updatedDetails);
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateField = (field, value) => {
    switch (field) {
      case 'name':
        return value.trim().length < 2 ? 'Name must be at least 2 characters' : null;
      case 'line1':
        return value.trim().length < 5 ? 'Please enter a valid street address' : null;
      case 'city':
        return value.trim().length < 2 ? 'Please enter a valid city' : null;
      case 'state':
        return value.trim().length < 2 ? 'Please enter a valid state' : null;
      case 'postal_code':
        return value.trim().length < 5 ? 'Please enter a valid postal code' : null;
      default:
        return null;
    }
  };

  const handleFieldBlur = (field, value, isAddress = false) => {
    const error = validateField(field, value);
    if (error) {
      setFieldErrors(prev => ({
        ...prev,
        [field]: error
      }));
    }
  };

  return (
    <View style={styles.cardPaymentForm}>
      <Text style={styles.sectionTitle}>Card Information</Text>
      <Text style={styles.sectionSubtitle}>
        Enter your card details below
      </Text>
      
      <View style={styles.cardFieldContainer}>
        <CardField
          postalCodeEnabled={false} // We'll collect this separately for full address
          placeholders={{
            number: '4242 4242 4242 4242',
            expiration: 'MM/YY',
            cvc: 'CVC',
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

      {/* Billing Address Section */}
      <View style={styles.billingAddressSection}>
        <Text style={styles.sectionTitle}>Billing Address</Text>
        <Text style={styles.sectionSubtitle}>
          This helps prevent fraud and ensures secure processing
        </Text>

        {/* Full Name */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Full Name *</Text>
          <TextInput
            style={[
              styles.textInput,
              fieldErrors.name && styles.textInputError
            ]}
            placeholder="John Doe"
            value={billingDetails.name}
            onChangeText={(value) => handleBillingChange('name', value)}
            onBlur={() => handleFieldBlur('name', billingDetails.name)}
            autoCapitalize="words"
            autoComplete="name"
          />
          {fieldErrors.name && (
            <Text style={styles.errorText}>{fieldErrors.name}</Text>
          )}
        </View>

        {/* Email */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email Address *</Text>
          <TextInput
            style={[
              styles.textInput,
              fieldErrors.email && styles.textInputError
            ]}
            placeholder="john@example.com"
            value={billingDetails.email}
            onChangeText={(value) => handleBillingChange('email', value)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          {fieldErrors.email && (
            <Text style={styles.errorText}>{fieldErrors.email}</Text>
          )}
        </View>

        {/* Street Address */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Street Address *</Text>
          <TextInput
            style={[
              styles.textInput,
              fieldErrors.line1 && styles.textInputError
            ]}
            placeholder="123 Main Street"
            value={billingDetails.address.line1}
            onChangeText={(value) => handleBillingChange('line1', value, true)}
            onBlur={() => handleFieldBlur('line1', billingDetails.address.line1)}
            autoComplete="street-address"
          />
          {fieldErrors.line1 && (
            <Text style={styles.errorText}>{fieldErrors.line1}</Text>
          )}
        </View>

        {/* Apartment/Suite (Optional) */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Apartment, Suite, etc. (Optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Apt 4B"
            value={billingDetails.address.line2}
            onChangeText={(value) => handleBillingChange('line2', value, true)}
            autoComplete="address-line2"
          />
        </View>

        {/* City and State Row */}
        <View style={styles.rowContainer}>
          <View style={[styles.inputContainer, styles.flexInput]}>
            <Text style={styles.inputLabel}>City *</Text>
            <TextInput
              style={[
                styles.textInput,
                fieldErrors.city && styles.textInputError
              ]}
              placeholder="New York"
              value={billingDetails.address.city}
              onChangeText={(value) => handleBillingChange('city', value, true)}
              onBlur={() => handleFieldBlur('city', billingDetails.address.city)}
              autoComplete="address-level2"
            />
            {fieldErrors.city && (
              <Text style={styles.errorText}>{fieldErrors.city}</Text>
            )}
          </View>

          <View style={[styles.inputContainer, styles.flexInput]}>
            <Text style={styles.inputLabel}>State *</Text>
            <TextInput
              style={[
                styles.textInput,
                fieldErrors.state && styles.textInputError
              ]}
              placeholder="NY"
              value={billingDetails.address.state}
              onChangeText={(value) => handleBillingChange('state', value, true)}
              onBlur={() => handleFieldBlur('state', billingDetails.address.state)}
              autoComplete="address-level1"
              maxLength={2}
              autoCapitalize="characters"
            />
            {fieldErrors.state && (
              <Text style={styles.errorText}>{fieldErrors.state}</Text>
            )}
          </View>
        </View>

        {/* Postal Code */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Postal Code *</Text>
          <TextInput
            style={[
              styles.textInput,
              fieldErrors.postal_code && styles.textInputError
            ]}
            placeholder="10001"
            value={billingDetails.address.postal_code}
            onChangeText={(value) => handleBillingChange('postal_code', value, true)}
            onBlur={() => handleFieldBlur('postal_code', billingDetails.address.postal_code)}
            keyboardType="numeric"
            autoComplete="postal-code"
            maxLength={10}
          />
          {fieldErrors.postal_code && (
            <Text style={styles.errorText}>{fieldErrors.postal_code}</Text>
          )}
        </View>
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
  const [billingDetails, setBillingDetails] = useState(null);

  // Background payment method checking - non-blocking
  useEffect(() => {
    const checkPaymentMethods = async () => {
      // Start with card method immediately available
      const methods = [PAYMENT_METHODS.CARD];
      setAvailablePaymentMethods(methods);
      
      // Check if running in Expo Go
      const expoGo = Constants.appOwnership === 'expo';
      setIsExpoGo(expoGo);
      
      // Add platform payment methods in background
      if (!expoGo) {
        // Check Apple Pay availability (iOS only) - background
        if (Platform.OS === 'ios') {
          try {
            const isApplePaySupported = await isPlatformPaySupported();
            if (isApplePaySupported) {
              setAvailablePaymentMethods(prev => [...prev, PAYMENT_METHODS.APPLE_PAY]);
            }
          } catch (error) {
            console.log('Apple Pay check failed:', error);
          }
        }
        
        // Check Google Pay availability (Android only) - background
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
              setAvailablePaymentMethods(prev => [...prev, PAYMENT_METHODS.GOOGLE_PAY]);
            }
          } catch (error) {
            console.log('Google Pay check failed:', error);
          }
        }
      } else {
        // In Expo Go, show all methods but disable platform payments
        const allMethods = [PAYMENT_METHODS.CARD];
        if (Platform.OS === 'ios') {
          allMethods.push(PAYMENT_METHODS.APPLE_PAY);
        }
        if (Platform.OS === 'android') {
          allMethods.push(PAYMENT_METHODS.GOOGLE_PAY);
        }
        setAvailablePaymentMethods(allMethods);
      }
      
      console.log('Payment method check completed');
    };

    // Run in background without blocking UI
    setTimeout(checkPaymentMethods, 100);
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

  // Process subscription creation (now handles customer creation on-demand)
  const processSubscription = async (paymentMethodId) => {
    const priceId = STRIPE_PRICE_IDS[planId]?.[billingCycle];
    if (!priceId) {
      throw new Error(`No Stripe price ID found for plan: ${planId} (${billingCycle})`);
    }

    console.log('Creating subscription with price ID:', priceId);

    // Customer creation and subscription happens server-side during payment
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
        // Let server handle customer creation if needed
        createCustomerIfNeeded: true,
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
            {selectedPaymentMethod === PAYMENT_METHODS.CARD 
              ? `Subscribe for $${planPrice}/${billingCycle === 'yearly' ? 'year' : 'month'}`
              : `Pay with ${selectedPaymentMethod === PAYMENT_METHODS.APPLE_PAY ? 'Apple Pay' : 'Google Pay'}`
            }
          </Text>
        )}
      </TouchableOpacity>

      {/* Terms Notice */}
      <Text style={styles.termsText}>
        By subscribing, you agree to our Terms of Service and Privacy Policy. 
        You can cancel your subscription at any time.
      </Text>
    </View>
  );
};

// Main Billing Screen Component
const BillingScreen = ({ navigation, route }) => {
  // Extract plan selection data from BusinessPricingScreen
  const { 
    planId, 
    planName, 
    planPrice, 
    billingCycle, 
    isNewSubscription 
  } = route?.params || {};

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);

  // Fast initialization - only essential operations
  useEffect(() => {
    const quickInitialize = async () => {
      try {
        // Initialize Stripe (fast, local operation)
        await initStripe({
          publishableKey: STRIPE_PUBLISHABLE_KEY,
          urlScheme: URL_SCHEME,
          merchantIdentifier: 'merchant.com.linkedbysix.app',
        });

        // Get user (fast, cached operation)
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          Alert.alert('Authentication Required', 'Please log in to continue', [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]);
          return;
        }

        setCurrentUser(user);
        console.log('Quick initialization complete for:', user.email);
        
      } catch (error) {
        console.error('Initialization error:', error);
        setError('Failed to initialize payment system');
      } finally {
        // Show form immediately after basic setup
        setLoading(false);
      }
    };

    quickInitialize();
  }, [navigation]);

  // Handle successful payment
  const handlePaymentSuccess = (subscriptionData) => {
    Alert.alert(
      'Payment Successful! 🎉',
      `Your ${planName} subscription has been activated successfully.`,
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
  };

  // Handle payment error
  const handlePaymentError = (errorMessage) => {
    setError(errorMessage);
    Alert.alert('Payment Failed', errorMessage, [
      {
        text: 'Try Again',
        onPress: () => setError(null)
      }
    ]);
  };

  // Retry initialization
  const handleRetry = () => {
    setError(null);
    setLoading(true);
    // Re-run initialization
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <MobileHeader 
          navigation={navigation} 
          title="Payment" 
          showBackButton={true} 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryBlue} />
          <Text style={styles.loadingText}>
            Setting up payment options...
          </Text>
          <Text style={styles.loadingSubtext}>
            This should only take a moment
          </Text>
        </View>
        <MobileBottomNavigation navigation={navigation} activeRoute="Billing" />
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <MobileHeader 
          navigation={navigation} 
          title="Payment" 
          showBackButton={true} 
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ Setup Error</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={handleRetry}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
        <MobileBottomNavigation navigation={navigation} activeRoute="Billing" />
      </SafeAreaView>
    );
  }

  // Main render
  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <SafeAreaView style={styles.container}>
        <MobileHeader 
          navigation={navigation} 
          title="Payment" 
          showBackButton={true} 
        />
        
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <Text style={styles.pageTitle}>Complete Your Subscription</Text>
            <Text style={styles.pageSubtitle}>
              Choose your preferred payment method
            </Text>
          </View>

          {/* Payment Form */}
          {currentUser && (
            <PaymentForm
              planId={planId}
              planName={planName}
              planPrice={planPrice}
              billingCycle={billingCycle}
              currentUser={currentUser}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
            />
          )}

          {/* Bottom padding */}
          <View style={styles.bottomPadding} />
        </ScrollView>
        
        <MobileBottomNavigation navigation={navigation} activeRoute="Billing" />
      </SafeAreaView>
    </StripeProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  headerContainer: {
    backgroundColor: colors.cardWhite,
    paddingHorizontal: 20,
    paddingVertical: 24,
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
  pageSubtitle: {
    fontSize: 16,
    color: colors.textMedium,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.error,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 16,
    color: colors.textMedium,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: colors.primaryBlue,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.cardWhite,
    fontWeight: '600',
    fontSize: 16,
  },
  paymentFormContainer: {
    padding: 20,
  },
  planSummaryCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  planSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textMedium,
    marginBottom: 8,
  },
  planSummaryName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 4,
  },
  planSummaryPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primaryBlue,
    marginBottom: 4,
  },
  planSummaryBilling: {
    fontSize: 14,
    color: colors.textMedium,
  },
  paymentMethodCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentMethodSelector: {
    marginBottom: 0,
  },
  paymentMethodOption: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: colors.cardWhite,
  },
  paymentMethodOptionSelected: {
    borderColor: colors.primaryBlue,
    backgroundColor: '#f0f8ff',
  },
  paymentMethodOptionDisabled: {
    opacity: 0.5,
    backgroundColor: '#f9f9f9',
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  paymentMethodText: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 2,
  },
  paymentMethodNameDisabled: {
    color: colors.textLight,
  },
  paymentMethodDescription: {
    fontSize: 14,
    color: colors.textMedium,
  },
  paymentMethodDescriptionDisabled: {
    color: colors.textLight,
  },
  paymentMethodRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodRadioSelected: {
    borderColor: colors.primaryBlue,
  },
  paymentMethodRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primaryBlue,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textMedium,
    marginBottom: 20,
  },
  cardPaymentForm: {
    marginBottom: 0,
  },
  cardFieldContainer: {
    marginBottom: 16,
  },
  cardField: {
    height: 50,
    marginVertical: 8,
  },
  cardFieldStyle: {
    backgroundColor: colors.backgroundGray,
    borderColor: colors.borderLight,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
    placeholderColor: colors.textLight,
    textColor: colors.textDark,
  },
  cardErrorText: {
    color: colors.error,
    fontSize: 14,
    marginTop: 4,
  },
  platformPayForm: {
    marginBottom: 0,
  },
  platformPayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primaryBlue,
  },
  platformPayIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  platformPayText: {
    flex: 1,
  },
  platformPayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 4,
  },
  platformPayDescription: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primaryBlue,
  },
  securityNotice: {
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.primaryBlue,
  },
  securityText: {
    fontSize: 14,
    color: colors.textMedium,
    textAlign: 'center',
  },
  paymentButton: {
    backgroundColor: colors.primaryBlue,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  paymentButtonDisabled: {
    backgroundColor: colors.textLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  paymentButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentButtonText: {
    color: colors.cardWhite,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  termsText: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 16,
  },
  bottomPadding: {
    height: 100, // Space for bottom navigation
  },
});

export default BillingScreen;
