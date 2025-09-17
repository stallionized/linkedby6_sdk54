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
  KeyboardAvoidingView,
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
// Using your actual Stripe test publishable key
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51RXw4A4RjCM7xxHpmmL3YVOHgzKjgdKIzCBgIepx1fvnicwq0FdWpkFuKdzf4lTbwvy5P7Rf6Az4tITEMOHTWSos00ru9ufZxO';

// Use the Render webhook server URL
const STRIPE_SERVER_URL = 'https://stripeserver-production.onrender.com';

// URL Scheme for redirects
const URL_SCHEME = Constants.appOwnership === 'expo' 
  ? Linking.createURL('/--/') 
  : Linking.createURL('');

// Dynamic product catalog - fetched from webhook server
let DYNAMIC_PRODUCT_CATALOG = null;

// Function to fetch dynamic product catalog from webhook server
const fetchProductCatalog = async () => {
  try {
    console.log('Fetching dynamic product catalog from:', `${STRIPE_SERVER_URL}/products`);
    const response = await fetch(`${STRIPE_SERVER_URL}/products`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status}`);
    }
    
    const catalog = await response.json();
    console.log('Dynamic product catalog loaded:', catalog);
    DYNAMIC_PRODUCT_CATALOG = catalog;
    return catalog;
  } catch (error) {
    console.error('Error fetching product catalog:', error);
    throw error;
  }
};

// Function to get price ID from dynamic catalog
const getPriceIdFromCatalog = (planId, billingCycle) => {
  if (!DYNAMIC_PRODUCT_CATALOG) {
    throw new Error('Product catalog not loaded. Please try again.');
  }
  
  console.log('Looking for planId:', planId, 'billingCycle:', billingCycle);
  console.log('Available catalog structure:', DYNAMIC_PRODUCT_CATALOG);
  
  // The webhook server returns { products: [...], lastUpdated: ... }
  const products = DYNAMIC_PRODUCT_CATALOG.products;
  
  if (!products || !Array.isArray(products)) {
    console.error('Invalid catalog structure - products not found or not an array:', DYNAMIC_PRODUCT_CATALOG);
    throw new Error('Invalid product catalog structure. Please refresh and try again.');
  }
  
  // Find the product with matching planId
  const product = products.find(p => p.planId === planId);
  
  if (!product) {
    console.error(`Product not found for planId: ${planId}`);
    console.log('Available products:', products.map(p => ({ planId: p.planId, name: p.name })));
    throw new Error(`Product not found: ${planId}`);
  }
  
  console.log('Found product:', product);
  
  if (!product.prices) {
    console.error('Product has no prices:', product);
    throw new Error(`No prices available for plan: ${planId}`);
  }
  
  // Get the price for the billing cycle
  const priceInfo = product.prices[billingCycle];
  
  if (!priceInfo) {
    console.error(`No price found for billing cycle: ${billingCycle}`);
    console.log('Available billing cycles:', Object.keys(product.prices));
    throw new Error(`No ${billingCycle} price found for plan: ${planId}`);
  }
  
  const priceId = priceInfo.priceId;
  console.log(`Found price ID for ${planId} (${billingCycle}):`, priceId);
  
  return priceId;
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
            placeholder=""
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
            placeholder=""
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
              placeholder=""
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
              placeholder=""
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
            placeholder=""
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
      
      // Get price ID from dynamic catalog
      const priceId = getPriceIdFromCatalog(planId, billingCycle);

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
          test
