import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
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
import { validateAccessCode } from './utils/onboardingService';

const { width: screenWidth } = Dimensions.get('window');

const AccessCodeScreen = ({ navigation, route }) => {
  const { email, intent = 'consumer_only' } = route.params || {};

  // Code input state - 8 character code
  const [code, setCode] = useState(['', '', '', '', '', '', '', '']);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const [codeId, setCodeId] = useState(null);

  // Refs for input fields
  const inputRefs = useRef([]);

  // Focus first input on mount
  useEffect(() => {
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  }, []);

  // Handle code input change
  const handleCodeChange = (value, index) => {
    // Only allow alphanumeric characters
    const cleanValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (cleanValue.length <= 1) {
      const newCode = [...code];
      newCode[index] = cleanValue;
      setCode(newCode);
      setError('');

      // Auto-focus next input
      if (cleanValue && index < 7) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (cleanValue.length > 1) {
      // Handle paste - fill multiple fields
      const chars = cleanValue.slice(0, 8 - index).split('');
      const newCode = [...code];
      chars.forEach((char, i) => {
        if (index + i < 8) {
          newCode[index + i] = char;
        }
      });
      setCode(newCode);
      setError('');

      // Focus appropriate next field
      const nextIndex = Math.min(index + chars.length, 7);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  // Handle backspace
  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Get full code string
  const getFullCode = () => code.join('');

  // Check if code is complete
  const isCodeComplete = () => code.every(c => c !== '');

  // Validate and submit code
  const handleSubmit = async () => {
    const fullCode = getFullCode();

    if (!isCodeComplete()) {
      setError('Please enter the complete 8-character code');
      return;
    }

    setIsValidating(true);
    setError('');
    Keyboard.dismiss();

    try {
      const result = await validateAccessCode(fullCode);

      if (result.valid) {
        setCodeId(result.code_id);

        Toast.show({
          type: 'success',
          text1: 'Access Code Valid!',
          text2: 'Proceeding to registration...',
        });

        // Navigate to registration with the validated code info
        navigation.navigate('Registration', {
          accessCode: fullCode,
          accessCodeId: result.code_id,
          intent: intent === 'consumer_and_business' ? 'business' : 'consumer',
          email: email || null
        });
      } else {
        setError(result.error_message || 'Invalid access code');
        // Shake animation could be added here
      }
    } catch (error) {
      console.error('Error validating code:', error);
      setError('Unable to validate code. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  // Clear all inputs
  const handleClear = () => {
    setCode(['', '', '', '', '', '', '', '']);
    setError('');
    inputRefs.current[0]?.focus();
  };

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
            <View style={styles.content}>
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Main Content */}
              <View style={styles.mainContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name="key-outline" size={48} color="#3B82F6" />
                </View>

                <Text style={styles.title}>Enter Access Code</Text>
                <Text style={styles.subtitle}>
                  Enter the 8-character code from your email
                </Text>

                {/* Code Input Grid */}
                <View style={styles.codeContainer}>
                  <View style={styles.codeRow}>
                    {code.slice(0, 4).map((char, index) => (
                      <TextInput
                        key={index}
                        ref={ref => inputRefs.current[index] = ref}
                        style={[
                          styles.codeInput,
                          char && styles.codeInputFilled,
                          error && styles.codeInputError
                        ]}
                        value={char}
                        onChangeText={(value) => handleCodeChange(value, index)}
                        onKeyPress={(e) => handleKeyPress(e, index)}
                        maxLength={8}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        selectTextOnFocus
                      />
                    ))}
                  </View>
                  <View style={styles.codeSeparator}>
                    <View style={styles.separatorLine} />
                  </View>
                  <View style={styles.codeRow}>
                    {code.slice(4, 8).map((char, index) => (
                      <TextInput
                        key={index + 4}
                        ref={ref => inputRefs.current[index + 4] = ref}
                        style={[
                          styles.codeInput,
                          char && styles.codeInputFilled,
                          error && styles.codeInputError
                        ]}
                        value={char}
                        onChangeText={(value) => handleCodeChange(value, index + 4)}
                        onKeyPress={(e) => handleKeyPress(e, index + 4)}
                        maxLength={8}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        selectTextOnFocus
                      />
                    ))}
                  </View>
                </View>

                {/* Error Message */}
                {error ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {/* Clear Button */}
                {code.some(c => c !== '') && (
                  <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                    <Text style={styles.clearButtonText}>Clear</Text>
                  </TouchableOpacity>
                )}

                {/* Submit Button */}
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    !isCodeComplete() && styles.submitButtonDisabled
                  ]}
                  onPress={handleSubmit}
                  disabled={!isCodeComplete() || isValidating}
                >
                  <LinearGradient
                    colors={isCodeComplete() ? ['#3B82F6', '#8B5CF6'] : ['#4B5563', '#374151']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientButton}
                  >
                    {isValidating ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitButtonText}>Verify & Continue</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Footer Links */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => navigation.navigate('ZipCodeIntake', { intent: intent === 'consumer_and_business' ? 'business' : 'consumer' })}
                >
                  <Text style={styles.linkText}>Don't have a code? Get one here</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => navigation.navigate('Login', { intent })}
                >
                  <Text style={styles.linkText}>Already have an account? Sign in</Text>
                </TouchableOpacity>
              </View>
            </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginLeft: -8,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 40,
  },
  codeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  codeSeparator: {
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  separatorLine: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 1,
  },
  codeInput: {
    width: 52,
    height: 64,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 6,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  codeInputFilled: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  codeInputError: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginLeft: 6,
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  clearButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  submitButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
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
  footer: {
    paddingBottom: 24,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkText: {
    color: '#3B82F6',
    fontSize: 14,
  },
});

export default AccessCodeScreen;
