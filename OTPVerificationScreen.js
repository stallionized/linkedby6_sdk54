import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from './supabaseClient';
import Toast from 'react-native-toast-message';
import { recordAccessCodeUsage, updateUserOnboardingInfo, markAccessCodeRequestUsed } from './utils/onboardingService';

const { width: screenWidth } = Dimensions.get('window');

const OTPVerificationScreen = ({ navigation, route }) => {
  const {
    phoneNumber,
    email,
    password,
    fullName,
    profileImageUrl,
    // Onboarding params
    accessCode = null,
    accessCodeId = null,
    intent = 'consumer'
  } = route.params || {};

  // OTP input refs
  const input1Ref = useRef(null);
  const input2Ref = useRef(null);
  const input3Ref = useRef(null);
  const input4Ref = useRef(null);
  const input5Ref = useRef(null);
  const input6Ref = useRef(null);

  const inputRefs = [input1Ref, input2Ref, input3Ref, input4Ref, input5Ref, input6Ref];

  // State
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Format phone number for display
  const formatPhoneForDisplay = (phone) => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    } else if (digits.length === 10) {
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  // Timer for resend button
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => {
        setResendTimer(resendTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  // Auto-focus first input on mount
  useEffect(() => {
    setTimeout(() => {
      input1Ref.current?.focus();
    }, 300);
  }, []);

  const handleOtpChange = (value, index) => {
    // Only allow digits
    const digit = value.replace(/[^0-9]/g, '');

    if (digit.length > 1) {
      // Handle paste scenario
      const digits = digit.slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (index + i < 6) {
          newOtp[index + i] = d;
        }
      });
      setOtp(newOtp);

      // Focus the next empty field or last field
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs[nextIndex].current?.focus();

      // Auto-verify if all 6 digits are entered
      if (newOtp.every(d => d !== '')) {
        Keyboard.dismiss();
        handleVerifyOTP(newOtp.join(''));
      }
      return;
    }

    // Single digit entry
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs[index + 1].current?.focus();
    }

    // Auto-verify when all 6 digits are entered
    if (index === 5 && digit && newOtp.every(d => d !== '')) {
      Keyboard.dismiss();
      handleVerifyOTP(newOtp.join(''));
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (otp[index] === '' && index > 0) {
        // Move to previous input if current is empty
        inputRefs[index - 1].current?.focus();
      } else {
        // Clear current input
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
  };

  const handleVerifyOTP = async (otpCode = null) => {
    const code = otpCode || otp.join('');

    if (code.length !== 6) {
      Toast.show({
        type: 'error',
        text1: 'Invalid OTP',
        text2: 'Please enter all 6 digits',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    setIsVerifying(true);

    try {
      console.log('Verifying OTP for phone:', phoneNumber);

      // Format phone number for verification (E.164 format)
      const formattedPhone = phoneNumber.startsWith('+')
        ? phoneNumber
        : '+1' + phoneNumber.replace(/\D/g, '');

      // Verify the OTP
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: code,
        type: 'sms',
      });

      if (error) {
        console.error('OTP verification error:', error);
        Toast.show({
          type: 'error',
          text1: 'Verification Failed',
          text2: error.message || 'Invalid OTP code. Please try again.',
          position: 'top',
          visibilityTime: 4000,
        });

        // Clear OTP inputs on error
        setOtp(['', '', '', '', '', '']);
        input1Ref.current?.focus();
        setIsVerifying(false);
        return;
      }

      if (data?.user) {
        console.log('OTP verified successfully for user:', data.user.id);

        // Update user profile with additional info if provided
        if (email || fullName || profileImageUrl) {
          try {
            const { error: profileError } = await supabase
              .from('user_profiles')
              .upsert({
                user_id: data.user.id,
                full_name: fullName || null,
                user_phone_number: phoneNumber,
                profile_image_url: profileImageUrl || null,
                is_admin: false,
                role: 'standard_user',
                updated_at: new Date().toISOString()
              });

            if (profileError) {
              console.error('Error updating profile:', profileError);
            }
          } catch (profileUpdateError) {
            console.error('Profile update exception:', profileUpdateError);
          }
        }

        // Record access code usage if an access code was used
        if (accessCodeId) {
          try {
            await recordAccessCodeUsage(accessCodeId, data.user.id);
            console.log('Access code usage recorded');
          } catch (accessCodeError) {
            console.error('Error recording access code usage:', accessCodeError);
          }
        }

        // Mark access code request as used if email was provided
        if (email) {
          try {
            await markAccessCodeRequestUsed(email, data.user.id);
            console.log('Access code request marked as used');
          } catch (requestError) {
            console.error('Error marking access code request:', requestError);
          }
        }

        Toast.show({
          type: 'success',
          text1: 'Verification Successful!',
          text2: 'Welcome to Linked By Six',
          position: 'top',
          visibilityTime: 2000,
        });

        // Navigate based on intent
        setTimeout(() => {
          if (intent === 'business') {
            // Business intent - go to business pricing/setup flow
            navigation.reset({
              index: 0,
              routes: [{ name: 'BusinessPricing' }],
            });
          } else {
            // Consumer intent (default) - go to main search screen
            navigation.reset({
              index: 0,
              routes: [{ name: 'Search' }],
            });
          }
        }, 1500);
      }
    } catch (error) {
      console.error('OTP verification exception:', error);
      Toast.show({
        type: 'error',
        text1: 'Verification Error',
        text2: 'An error occurred. Please try again.',
        position: 'top',
        visibilityTime: 3000,
      });

      // Clear OTP inputs
      setOtp(['', '', '', '', '', '']);
      input1Ref.current?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend || isResending) return;

    setIsResending(true);

    try {
      console.log('Resending OTP to phone:', phoneNumber);

      // Format phone number (E.164 format)
      const formattedPhone = phoneNumber.startsWith('+')
        ? phoneNumber
        : '+1' + phoneNumber.replace(/\D/g, '');

      // Resend OTP
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) {
        console.error('Resend OTP error:', error);
        Toast.show({
          type: 'error',
          text1: 'Resend Failed',
          text2: error.message || 'Failed to resend OTP',
          position: 'top',
          visibilityTime: 3000,
        });
        return;
      }

      Toast.show({
        type: 'success',
        text1: 'OTP Sent',
        text2: 'A new verification code has been sent',
        position: 'top',
        visibilityTime: 3000,
      });

      // Reset timer
      setResendTimer(60);
      setCanResend(false);

      // Clear current OTP
      setOtp(['', '', '', '', '', '']);
      input1Ref.current?.focus();
    } catch (error) {
      console.error('Resend OTP exception:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to resend verification code',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setIsResending(false);
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <StatusBar style="light" backgroundColor="#1E88E5" translucent={false} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <LinearGradient
            colors={['#1E88E5', '#90CAF9']}
            style={styles.gradient}
          >
            <View style={styles.content}>
              {/* Logo */}
              <View style={styles.logoContainer}>
                <Image
                  source={require('./assets/logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>

              <Text style={styles.title}>Verify Your Phone</Text>
              <Text style={styles.description}>
                We've sent a 6-digit code to{'\n'}
                <Text style={styles.phoneNumber}>{formatPhoneForDisplay(phoneNumber)}</Text>
              </Text>

              {/* OTP Input */}
              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={inputRefs[index]}
                    style={[
                      styles.otpInput,
                      digit !== '' && styles.otpInputFilled
                    ]}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(value, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    editable={!isVerifying}
                  />
                ))}
              </View>

              {/* Verify Button */}
              <TouchableOpacity
                onPress={() => handleVerifyOTP()}
                style={[styles.buttonContainer, isVerifying && styles.buttonDisabled]}
                disabled={isVerifying || otp.some(d => d === '')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={isVerifying || otp.some(d => d === '') ? ['#999', '#666'] : ['#0D47A1', '#1E88E5']}
                  style={styles.button}
                >
                  {isVerifying ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.buttonText}>Verify Code</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Resend OTP */}
              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>Didn't receive the code? </Text>
                <TouchableOpacity
                  onPress={handleResendOTP}
                  disabled={!canResend || isResending}
                  style={styles.resendButton}
                >
                  {isResending ? (
                    <ActivityIndicator size="small" color="#1E88E5" />
                  ) : (
                    <Text style={[
                      styles.resendButtonText,
                      !canResend && styles.resendButtonTextDisabled
                    ]}>
                      {canResend ? 'Resend' : `Resend in ${resendTimer}s`}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Back to Registration */}
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                disabled={isVerifying}
              >
                <Text style={styles.backButtonText}>Change Phone Number</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1E88E5',
  },
  container: {
    flex: 1,
    backgroundColor: '#1E88E5',
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  logoImage: {
    width: 50,
    height: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 24,
  },
  phoneNumber: {
    fontWeight: 'bold',
    color: '#fff',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    gap: 10,
  },
  otpInput: {
    width: 50,
    height: 60,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 2,
    borderColor: 'transparent',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  otpInputFilled: {
    backgroundColor: '#fff',
    borderColor: '#0D47A1',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  button: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  resendText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
  },
  resendButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  resendButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.6)',
    textDecorationLine: 'none',
  },
  backButton: {
    marginTop: 10,
    paddingVertical: 12,
  },
  backButtonText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default OTPVerificationScreen;
