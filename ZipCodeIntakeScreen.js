import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { submitZipCodeIntake } from './utils/onboardingService';

const { width: screenWidth } = Dimensions.get('window');

const ZipCodeIntakeScreen = ({ navigation, route }) => {
  const { intent = 'consumer', prefilledEmail = '' } = route.params || {};

  // Form state
  const [email, setEmail] = useState(prefilledEmail);
  const [phone, setPhone] = useState('');
  const [smsConsent, setSmsConsent] = useState(false);
  const [zipCode, setZipCode] = useState('');
  const [signupIntent, setSignupIntent] = useState(
    intent === 'business' ? 'consumer_and_business' : 'consumer_only'
  );

  // Validation state
  const [emailError, setEmailError] = useState('');
  const [zipCodeError, setZipCodeError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Result state
  const [showResult, setShowResult] = useState(false);
  const [resultType, setResultType] = useState(null); // 'access_code' or 'waitlist'

  // Validate email
  const validateEmail = (text) => {
    setEmail(text);
    if (!text) {
      setEmailError('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  // Validate ZIP code
  const validateZipCode = (text) => {
    // Only allow digits
    const cleaned = text.replace(/\D/g, '').slice(0, 5);
    setZipCode(cleaned);
    if (cleaned.length === 0) {
      setZipCodeError('ZIP code is required');
    } else if (cleaned.length !== 5) {
      setZipCodeError('Please enter a 5-digit ZIP code');
    } else {
      setZipCodeError('');
    }
  };

  // Format phone number
  const formatPhone = (text) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 10);
    let formatted = cleaned;
    if (cleaned.length >= 6) {
      formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length >= 3) {
      formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    }
    setPhone(formatted);
  };

  // Check if form is valid
  const isFormValid = () => {
    return (
      email &&
      !emailError &&
      zipCode.length === 5 &&
      !zipCodeError
    );
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!isFormValid()) {
      Toast.show({
        type: 'error',
        text1: 'Please check your information',
        text2: 'Email and ZIP code are required',
      });
      return;
    }

    setIsSubmitting(true);
    Keyboard.dismiss();

    try {
      const result = await submitZipCodeIntake({
        email,
        phone: phone.replace(/\D/g, ''), // Send just digits
        smsConsent,
        zipCode,
        signupIntent
      });

      if (result.success) {
        setResultType(result.type);
        setShowResult(true);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: result.message || 'Something went wrong. Please try again.',
        });
      }
    } catch (error) {
      console.error('Error submitting intake:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Unable to process your request. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render success result screen
  if (showResult) {
    return (
      <LinearGradient
        colors={['#0a0a0f', '#1a1a2e', '#16213e']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.container}>
          <StatusBar style="light" />
          <View style={styles.resultContainer}>
            <View style={styles.resultIconContainer}>
              <Ionicons
                name={resultType === 'access_code' ? 'mail-outline' : 'time-outline'}
                size={80}
                color="#3B82F6"
              />
            </View>

            {resultType === 'access_code' ? (
              <>
                <Text style={styles.resultTitle}>Check Your Email!</Text>
                <Text style={styles.resultMessage}>
                  We've sent your access code to{'\n'}
                  <Text style={styles.resultEmail}>{email}</Text>
                </Text>
                <Text style={styles.resultSubtext}>
                  Use the code to complete your registration and start connecting
                  with trusted service providers.
                </Text>
                <TouchableOpacity
                  style={styles.resultButton}
                  onPress={() => navigation.navigate('AccessCode', { email, intent: signupIntent })}
                >
                  <LinearGradient
                    colors={['#3B82F6', '#8B5CF6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientButton}
                  >
                    <Text style={styles.resultButtonText}>I Have My Code</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.resultTitle}>You're on the Waitlist!</Text>
                <Text style={styles.resultMessage}>
                  We're currently serving New Jersey and New York, but we're
                  expanding soon.
                </Text>
                <Text style={styles.resultSubtext}>
                  We'll email you at {email} as soon as Linked By Six is available
                  in your area!
                </Text>
                <TouchableOpacity
                  style={styles.resultButton}
                  onPress={() => navigation.navigate('Landing')}
                >
                  <LinearGradient
                    colors={['#3B82F6', '#8B5CF6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientButton}
                  >
                    <Text style={styles.resultButtonText}>Back to Home</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#0a0a0f', '#1a1a2e', '#16213e']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>Get Started</Text>
                <Text style={styles.subtitle}>
                  Enter your info to check availability in your area
                </Text>
              </View>

              {/* Form */}
              <View style={styles.form}>
                {/* Email */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email *</Text>
                  <View style={[styles.inputContainer, emailError && styles.inputError]}>
                    <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="you@example.com"
                      placeholderTextColor="#666"
                      value={email}
                      onChangeText={validateEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                  </View>
                  {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                </View>

                {/* Phone (Optional) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone (Optional)</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="(555) 123-4567"
                      placeholderTextColor="#666"
                      value={phone}
                      onChangeText={formatPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                  {phone.length > 0 && (
                    <TouchableOpacity
                      style={styles.checkboxContainer}
                      onPress={() => setSmsConsent(!smsConsent)}
                    >
                      <View style={[styles.checkbox, smsConsent && styles.checkboxChecked]}>
                        {smsConsent && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                      <Text style={styles.checkboxLabel}>I agree to receive SMS updates</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* ZIP Code */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>ZIP Code *</Text>
                  <View style={[styles.inputContainer, zipCodeError && styles.inputError]}>
                    <Ionicons name="location-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="12345"
                      placeholderTextColor="#666"
                      value={zipCode}
                      onChangeText={validateZipCode}
                      keyboardType="number-pad"
                      maxLength={5}
                    />
                  </View>
                  {zipCodeError ? <Text style={styles.errorText}>{zipCodeError}</Text> : null}
                  <Text style={styles.helperText}>
                    Currently serving New Jersey and New York
                  </Text>
                </View>

                {/* Signup Intent */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>I want to:</Text>
                  <TouchableOpacity
                    style={[
                      styles.intentOption,
                      signupIntent === 'consumer_only' && styles.intentOptionSelected
                    ]}
                    onPress={() => setSignupIntent('consumer_only')}
                  >
                    <View style={styles.radioOuter}>
                      {signupIntent === 'consumer_only' && <View style={styles.radioInner} />}
                    </View>
                    <View style={styles.intentTextContainer}>
                      <Text style={styles.intentTitle}>Find trusted services</Text>
                      <Text style={styles.intentSubtitle}>
                        Get recommendations from people you trust
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.intentOption,
                      signupIntent === 'consumer_and_business' && styles.intentOptionSelected
                    ]}
                    onPress={() => setSignupIntent('consumer_and_business')}
                  >
                    <View style={styles.radioOuter}>
                      {signupIntent === 'consumer_and_business' && <View style={styles.radioInner} />}
                    </View>
                    <View style={styles.intentTextContainer}>
                      <Text style={styles.intentTitle}>Find services AND list my business</Text>
                      <Text style={styles.intentSubtitle}>
                        Also grow my business through referrals
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.submitButton, !isFormValid() && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={!isFormValid() || isSubmitting}
                >
                  <LinearGradient
                    colors={isFormValid() ? ['#3B82F6', '#8B5CF6'] : ['#4B5563', '#374151']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientButton}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitButtonText}>Continue</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Already have a code? */}
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => navigation.navigate('AccessCode', { intent: signupIntent })}
                >
                  <Text style={styles.linkText}>Already have an access code?</Text>
                </TouchableOpacity>

                {/* Login link */}
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => navigation.navigate('Login', { intent: signupIntent })}
                >
                  <Text style={styles.linkText}>Already have an account? Sign in</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    marginTop: 20,
    marginBottom: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginLeft: -8,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    lineHeight: 24,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D1D5DB',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    height: 56,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 6,
  },
  helperText: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 6,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#4B5563',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  checkboxLabel: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  intentOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    marginBottom: 12,
  },
  intentOptionSelected: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#4B5563',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
  },
  intentTextContainer: {
    flex: 1,
  },
  intentTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  intentSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  submitButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  gradientButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  linkText: {
    color: '#3B82F6',
    fontSize: 14,
  },
  // Result screen styles
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  resultIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  resultMessage: {
    fontSize: 16,
    color: '#D1D5DB',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  resultEmail: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  resultSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  resultButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  resultButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ZipCodeIntakeScreen;
