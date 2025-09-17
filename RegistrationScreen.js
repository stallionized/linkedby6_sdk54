import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { signUp, signIn, signUpWithPhone } from './Auth';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from './supabaseClient';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { updateUserProfile } from './Auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const RegistrationScreen = ({ navigation, route }) => {
  // Refs for input focus management
  const phoneRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  // State for user registration data
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  
  // State for form validation and submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [fullNameError, setFullNameError] = useState('');
  const [isPhoneAvailable, setIsPhoneAvailable] = useState(true);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Keyboard event listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidHideListener?.remove();
      keyboardDidShowListener?.remove();
    };
  }, []);

  // Function to pick profile image from gallery
  const pickProfileImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need access to your photo library to upload a profile picture.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Settings', 
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              }
            }
          ]
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        exif: false,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        // Validate image size (max 5MB)
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert(
            'Image Too Large',
            'Please select an image smaller than 5MB.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        setProfileImage(asset.uri);
      }
    } catch (error) {
      console.error('Error picking profile image:', error);
      Alert.alert(
        'Error',
        'Failed to pick image. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Function to handle image URLs (optimized for React Native)
  const processImageUrl = async (uri) => {
    if (!uri) return null;
    return uri; // React Native handles URIs directly
  };

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length === 10;
  };

  const validatePassword = (password) => {
    return password.length >= 6;
  };

  // Function to check if phone number is already in use
  const checkPhoneAvailability = async (phone) => {
    if (!phone || !validatePhone(phone)) return;
    
    setIsCheckingPhone(true);
    setPhoneError('');
    
    const formattedPhone = phone.replace(/\D/g, '');
    
    try {
      const { data, error } = await supabase.rpc('search_users_by_phone', {
        phone_query: formattedPhone
      });
      
      if (error) {
        console.error('Error checking phone availability:', error);
        setPhoneError('Error checking phone number availability');
        setIsPhoneAvailable(true);
      } else if (data && data.length > 0 && data[0].id) {
        setPhoneError('This phone number is already registered');
        setIsPhoneAvailable(false);
      } else {
        setPhoneError('');
        setIsPhoneAvailable(true);
      }
    } catch (error) {
      console.error('Exception checking phone availability:', error);
      setPhoneError('Error checking phone number availability');
      setIsPhoneAvailable(true);
    } finally {
      setIsCheckingPhone(false);
    }
  };

  // Debounce function for phone number check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (phoneNumber && validatePhone(phoneNumber)) {
        checkPhoneAvailability(phoneNumber);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [phoneNumber]);

  // Function to validate the form
  const validateForm = () => {
    let isValid = true;
    
    // Reset errors
    setFullNameError('');
    setPhoneError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    
    // Validate full name
    if (!fullName.trim()) {
      setFullNameError('Full name is required');
      isValid = false;
    } else if (fullName.trim().length < 2) {
      setFullNameError('Full name must be at least 2 characters');
      isValid = false;
    }
    
    // Validate phone number
    if (!phoneNumber.trim()) {
      setPhoneError('Phone number is required');
      isValid = false;
    } else if (!validatePhone(phoneNumber)) {
      setPhoneError('Please enter a valid 10-digit phone number');
      isValid = false;
    } else if (!isPhoneAvailable) {
      setPhoneError('This phone number is already registered');
      isValid = false;
    }
    
    // Validate email
    if (!email.trim()) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }
    
    // Validate password
    if (!password.trim()) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (!validatePassword(password)) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }
    
    // Validate confirm password
    if (!confirmPassword.trim()) {
      setConfirmPasswordError('Please confirm your password');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    }
    
    return isValid;
  };

  // Function to handle registration with phone OTP
  const handleRegistration = async () => {
    // Dismiss keyboard
    Keyboard.dismiss();

    // Validate form
    if (!validateForm()) {
      // Find first error and show toast
      if (fullNameError) {
        Toast.show({
          type: 'error',
          text1: 'Validation Error',
          text2: fullNameError,
          position: 'top',
          visibilityTime: 3000,
        });
      } else if (phoneError) {
        Toast.show({
          type: 'error',
          text1: 'Validation Error',
          text2: phoneError,
          position: 'top',
          visibilityTime: 3000,
        });
      } else if (emailError) {
        Toast.show({
          type: 'error',
          text1: 'Validation Error',
          text2: emailError,
          position: 'top',
          visibilityTime: 3000,
        });
      } else if (passwordError) {
        Toast.show({
          type: 'error',
          text1: 'Validation Error',
          text2: passwordError,
          position: 'top',
          visibilityTime: 3000,
        });
      } else if (confirmPasswordError) {
        Toast.show({
          type: 'error',
          text1: 'Validation Error',
          text2: confirmPasswordError,
          position: 'top',
          visibilityTime: 3000,
        });
      }
      return;
    }

    setIsSubmitting(true);

    try {
      // Check and clear existing session
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionData && sessionData.session) {
          await supabase.auth.signOut();
        }
      } catch (sessionCheckError) {
        console.error('Error checking for existing session:', sessionCheckError);
      }

      // Process profile image if exists
      let imageUrl = null;
      if (profileImage) {
        try {
          imageUrl = await processImageUrl(profileImage);
        } catch (imageError) {
          console.error('Error processing profile image:', imageError);
        }
      }

      // Format phone number consistently (E.164 format)
      const formattedPhone = '+1' + phoneNumber.replace(/\D/g, '');

      console.log('Sending OTP to phone:', formattedPhone);

      // Send OTP to phone number
      try {
        const result = await signUpWithPhone(formattedPhone);

        if (result.success) {
          console.log('OTP sent successfully, navigating to OTP verification screen');

          Toast.show({
            type: 'success',
            text1: 'Verification Code Sent',
            text2: 'Please check your phone for the code',
            position: 'top',
            visibilityTime: 2000,
          });

          // Navigate to OTP verification screen with necessary data
          setTimeout(() => {
            navigation.navigate('OTPVerification', {
              phoneNumber: formattedPhone,
              email: email.trim(),
              password: password,
              fullName: fullName.trim(),
              profileImageUrl: imageUrl,
            });
          }, 1000);
        }
      } catch (otpError) {
        console.error('Error sending OTP:', otpError);

        let errorMessage = otpError.message || 'Failed to send verification code';

        // Handle specific error cases
        if (errorMessage.includes('rate limit')) {
          errorMessage = 'Too many attempts. Please try again in a few minutes.';
        } else if (errorMessage.includes('invalid phone')) {
          errorMessage = 'Invalid phone number. Please check and try again.';
        } else if (errorMessage.includes('SMS')) {
          errorMessage = 'SMS service is not configured. Please contact support.';
        }

        Toast.show({
          type: 'error',
          text1: 'Verification Failed',
          text2: errorMessage,
          position: 'top',
          visibilityTime: 4000,
        });

        throw otpError;
      }
    } catch (error) {
      console.error('Registration error:', error);

      let errorMessage = error.message || 'There was an error creating your account. Please try again.';

      if (error.message && error.message.includes('row-level security policy')) {
        errorMessage = 'Registration failed due to database permission issues. Please contact support.';
      } else if (error.message && !error.message.includes('Verification Failed')) {
        // Only show generic error if we haven't already shown a specific one
        Toast.show({
          type: 'error',
          text1: 'Registration Failed',
          text2: errorMessage,
          position: 'top',
          visibilityTime: 4000,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to go back to login screen
  const goToLogin = () => {
    navigation.navigate('LoginScreen', { showEmailConfirmation: false });
  };

  // Handle phone number formatting with proper cursor management
  const handlePhoneNumberChange = (text) => {
    // Remove all non-digit characters
    const digits = text.replace(/\D/g, '');

    // Limit to 10 digits
    const limitedDigits = digits.slice(0, 10);

    // If empty or being deleted, allow empty string
    if (limitedDigits.length === 0) {
      setPhoneNumber('');
      return;
    }

    // Format the phone number as user types
    let formatted = '';

    // Add area code with parentheses
    formatted = '(' + limitedDigits.slice(0, 3);

    if (limitedDigits.length >= 3) {
      formatted += ') ';
    }

    if (limitedDigits.length > 3) {
      // Add next 3 digits
      formatted += limitedDigits.slice(3, 6);
    }

    if (limitedDigits.length > 6) {
      // Add hyphen and last 4 digits
      formatted += '-' + limitedDigits.slice(6, 10);
    }

    setPhoneNumber(formatted);

    // Clear phone error if valid
    if (phoneError && limitedDigits.length === 10) {
      setPhoneError('');
    }
  };

  // Handle phone input focus - move cursor to end for easy editing
  const handlePhoneFocus = () => {
    // Small delay to ensure focus is complete
    setTimeout(() => {
      if (phoneRef.current && phoneNumber) {
        // Move cursor to the end for natural typing experience
        phoneRef.current.setNativeProps({
          selection: { start: phoneNumber.length, end: phoneNumber.length }
        });
      }
    }, 10);
  };

  // Focus management for inputs
  const focusNextInput = (nextInputRef) => {
    if (nextInputRef && nextInputRef.current) {
      nextInputRef.current.focus();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" backgroundColor="#1E88E5" />
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
          <LinearGradient
            colors={['#1E88E5', '#90CAF9']}
            style={styles.container}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <ScrollView 
                contentContainerStyle={[
                  styles.scrollContainer,
                  keyboardVisible && styles.scrollContainerKeyboard
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                bounces={false}
              >
              <View style={styles.innerContainer}>
                {/* Logo */}
                <Image source={require('./assets/logo.png')} style={styles.iconImage} />
                
                {/* Title and Description */}
                <Text style={styles.title}>Create Your Account</Text>
                <Text style={styles.description}>
                  Sign up to connect with professionals in your network.
                </Text>

                {/* Profile Image */}
                <View style={styles.profileImageContainer}>
                  {profileImage ? (
                    <View style={styles.profileImageWrapper}>
                      <Image 
                        source={{ uri: profileImage }} 
                        style={styles.profileImage}
                      />
                      <TouchableOpacity 
                        style={styles.removeButton}
                        onPress={() => setProfileImage(null)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Text style={styles.removeButtonText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.addImageButton} 
                      onPress={pickProfileImage}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.addImageText}>+ Add Photo</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Full Name Input */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, fullNameError ? styles.inputError : null]}
                    placeholder="Full Name"
                    placeholderTextColor="#999"
                    value={fullName}
                    onChangeText={(text) => {
                      setFullName(text);
                      if (fullNameError && text.trim()) setFullNameError('');
                    }}
                    returnKeyType="next"
                    onSubmitEditing={() => focusNextInput(phoneRef)}
                    autoCapitalize="words"
                    textContentType="name"
                    maxLength={50}
                  />
                  {fullNameError ? <Text style={styles.errorText}>{fullNameError}</Text> : null}
                </View>

                {/* Phone Number Input */}
                <View style={styles.inputContainer}>
                  <View style={styles.phoneInputContainer}>
                    <TextInput
                      ref={phoneRef}
                      style={[
                        styles.input,
                        phoneError ? styles.inputError : null,
                        { paddingRight: isCheckingPhone ? 45 : 15 }
                      ]}
                      placeholder="Phone Number"
                      placeholderTextColor="#999"
                      keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'phone-pad'}
                      value={phoneNumber}
                      onChangeText={handlePhoneNumberChange}
                      onFocus={handlePhoneFocus}
                      returnKeyType="next"
                      onSubmitEditing={() => focusNextInput(emailRef)}
                      textContentType="telephoneNumber"
                      selectTextOnFocus={false}
                      editable={!isSubmitting}
                      autoCorrect={false}
                      autoCapitalize="none"
                    />
                    {isCheckingPhone && (
                      <ActivityIndicator 
                        size="small" 
                        color="#1E88E5" 
                        style={styles.phoneCheckIndicator} 
                      />
                    )}
                  </View>
                  {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
                </View>

                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <TextInput
                    ref={emailRef}
                    style={[styles.input, emailError ? styles.inputError : null]}
                    placeholder="Email Address"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text.toLowerCase().trim());
                      if (emailError && validateEmail(text)) setEmailError('');
                    }}
                    returnKeyType="next"
                    onSubmitEditing={() => focusNextInput(passwordRef)}
                    textContentType="emailAddress"
                    autoComplete="email"
                  />
                  {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                </View>

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <TextInput
                    ref={passwordRef}
                    style={[styles.input, passwordError ? styles.inputError : null]}
                    placeholder="Password (min. 6 characters)"
                    placeholderTextColor="#999"
                    secureTextEntry
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (passwordError && text.length >= 6) setPasswordError('');
                    }}
                    returnKeyType="next"
                    onSubmitEditing={() => focusNextInput(confirmPasswordRef)}
                    textContentType="newPassword"
                    autoComplete="password-new"
                  />
                  {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                </View>

                {/* Confirm Password Input */}
                <View style={styles.inputContainer}>
                  <TextInput
                    ref={confirmPasswordRef}
                    style={[styles.input, confirmPasswordError ? styles.inputError : null]}
                    placeholder="Confirm Password"
                    placeholderTextColor="#999"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (confirmPasswordError && text === password) setConfirmPasswordError('');
                    }}
                    returnKeyType="done"
                    onSubmitEditing={handleRegistration}
                    textContentType="newPassword"
                  />
                  {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}
                </View>

                {/* Register Button */}
                <TouchableOpacity 
                  onPress={handleRegistration} 
                  style={[
                    styles.buttonContainer,
                    isSubmitting && styles.buttonDisabled
                  ]}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={isSubmitting ? ['#ccc', '#999'] : ['#0D47A1', '#1E88E5']}
                    style={styles.button}
                  >
                    {isSubmitting ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#ffffff" />
                        <Text style={[styles.buttonText, styles.loadingText]}>Creating Account...</Text>
                      </View>
                    ) : (
                      <Text style={styles.buttonText}>Create Account</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Login Link */}
                <TouchableOpacity 
                  onPress={goToLogin} 
                  style={styles.toggleButton}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.toggleButtonText}>
                    Already have an account? <Text style={styles.toggleButtonTextBold}>Login</Text>
                  </Text>
                </TouchableOpacity>
              </View>
              </ScrollView>
            </TouchableWithoutFeedback>
          </LinearGradient>
        </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1E88E5',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
    minHeight: screenHeight - 100,
  },
  scrollContainerKeyboard: {
    justifyContent: 'center',
    paddingVertical: 15,
  },
  innerContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  iconImage: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E88E5',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#666',
    marginBottom: 25,
    textAlign: 'center',
    lineHeight: 20,
  },
  profileImageContainer: {
    marginBottom: 25,
    alignItems: 'center',
  },
  profileImageWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 6,
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '500',
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#1976d2',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fbff',
  },
  addImageText: {
    color: '#1976d2',
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  phoneCheckIndicator: {
    position: 'absolute',
    right: 15,
    zIndex: 1,
  },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    color: '#333',
  },
  inputError: {
    borderColor: '#f44336',
    backgroundColor: '#fef5f5',
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 14,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  button: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 14,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 16,
  },
  toggleButton: {
    paddingVertical: 8,
  },
  toggleButtonText: {
    color: '#666',
    fontSize: 15,
    textAlign: 'center',
  },
  toggleButtonTextBold: {
    color: '#1E88E5',
    fontWeight: '600',
  },
});

export default RegistrationScreen;
