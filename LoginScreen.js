import React, { useState, useEffect } from 'react';
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
  ScrollView,
  Dimensions,
  Image,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from './Auth';
import { checkUserBusinessStatus } from './utils/onboardingService';

const { width: screenWidth } = Dimensions.get('window');

const LoginScreen = ({ navigation, route }) => {
  // Get intent from route params (for business signup flow)
  const { intent = null } = route.params || {};

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const { signIn } = useAuth();

  // Check for email confirmation message from registration
  useEffect(() => {
    if (route?.params?.showEmailConfirmation) {
      Alert.alert(
        'Account Created',
        'Please check your email for the confirmation link.',
        [{ text: 'OK' }]
      );
    }
  }, [route?.params]);

  // Handle keyboard visibility
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const showAlert = (title, message) => {
    Alert.alert(title, message, [{ text: 'OK' }]);
  };

  const handleSignIn = async () => {
    if (!identifier.trim()) {
      showAlert('Error', 'Please enter your email or phone number');
      return;
    }

    if (!password.trim()) {
      showAlert('Error', 'Please enter your password');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Login attempt:', { identifier, password });

      const result = await signIn(identifier, password);

      if (result.success) {
        console.log('Login successful, user:', result.user.email);

        // If intent is business, check business status and route accordingly
        if (intent === 'business') {
          try {
            const businessStatus = await checkUserBusinessStatus(result.user.id);

            if (businessStatus.hasBusiness) {
              if (businessStatus.businessStatus === 'Active') {
                // User has active business, go to business dashboard
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'BusinessDashboard' }],
                });
              } else {
                // Business profile is incomplete, go to complete it
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'BusinessProfile' }],
                });
              }
            } else {
              // No business yet, go to business pricing to set one up
              navigation.reset({
                index: 0,
                routes: [{ name: 'BusinessPricing' }],
              });
            }
          } catch (businessCheckError) {
            console.error('Error checking business status:', businessCheckError);
            // Default to business pricing on error
            navigation.reset({
              index: 0,
              routes: [{ name: 'BusinessPricing' }],
            });
          }
        } else {
          // Default consumer flow - go to Search screen
          navigation.reset({
            index: 0,
            routes: [{ name: 'Search' }],
          });
        }
      } else {
        console.error('Login failed:', result.error);
        showAlert('Login Error', result.error || 'Login failed');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      showAlert('Login Error', error.message || 'An error occurred during login');
      setIsSubmitting(false);
    }
  };

  const goToRegistration = () => {
    // For existing users coming from business landing, they should go to ZipCodeIntake
    // For direct registration access, navigate normally
    if (intent === 'business') {
      navigation.navigate('ZipCodeIntake', { intent: 'consumer_and_business' });
    } else {
      navigation.navigate('ZipCodeIntake', { intent: 'consumer_only' });
    }
  };

  const handleGoogleLogin = () => {
    // TODO: Implement Google OAuth
    showAlert('Coming Soon', 'Google login will be implemented soon');
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
          <LinearGradient
            colors={['#1E88E5', '#90CAF9']}
            style={styles.gradient}
          >
            <ScrollView 
              contentContainerStyle={[
                styles.scrollContainer,
                keyboardVisible && styles.scrollContainerKeyboard
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              bounces={false}
              keyboardDismissMode="interactive"
              style={styles.scrollView}
            >
            <TouchableWithoutFeedback onPress={dismissKeyboard}>
              <View style={styles.touchableArea}>
          <View style={styles.innerContainer}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image 
                source={require('./assets/logo.png')} 
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            
            <Text style={styles.title}>Linked By Six</Text>
            <Text style={styles.description}>
              Enter your credentials to login to your account.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Email or Phone Number"
              placeholderTextColor="#999"
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              value={identifier}
              onChangeText={setIdentifier}
              editable={!isSubmitting}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              secureTextEntry
              autoCorrect={false}
              value={password}
              onChangeText={setPassword}
              editable={!isSubmitting}
              onSubmitEditing={handleSignIn}
              returnKeyType="done"
            />

            <TouchableOpacity 
              onPress={handleSignIn} 
              style={[styles.buttonContainer, isSubmitting && styles.buttonDisabled]}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isSubmitting ? ['#999', '#666'] : ['#0D47A1', '#1E88E5']}
                style={styles.button}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>Login</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={goToRegistration} 
              style={styles.toggleButton}
              disabled={isSubmitting}
            >
              <Text style={styles.toggleButtonText}>
                Don't have an account? Register
              </Text>
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.orText}>Or</Text>
              <View style={styles.divider} />
            </View>

            <TouchableOpacity 
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.googleButtonText}>🔍 Login with Google</Text>
            </TouchableOpacity>
          </View>
              </View>
            </TouchableWithoutFeedback>
            </ScrollView>
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
  container: {
    flex: 1,
    backgroundColor: '#1E88E5',
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingBottom: Platform.OS === 'android' ? 0 : 20,
    backgroundColor: 'transparent',
  },
  scrollContainerKeyboard: {
    justifyContent: 'center',
    paddingTop: 20,
    paddingBottom: Platform.OS === 'android' ? 0 : 20,
  },
  innerContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(30, 136, 229, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  logoImage: {
    width: 50,
    height: 50,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E88E5',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#333',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  button: {
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  toggleButton: {
    marginTop: 5,
    marginBottom: 20,
    paddingVertical: 8,
  },
  toggleButtonText: {
    color: '#1E88E5',
    fontSize: 14,
    fontWeight: '500',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
    width: '100%',
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  orText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  googleButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
  },
  googleButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  touchableArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LoginScreen;
