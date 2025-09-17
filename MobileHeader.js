import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Image
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from './Auth';
import { supabase } from './supabaseClient';

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

const MobileHeader = ({ 
  navigation, 
  title = "Search Results", 
  showBackButton = false,
  rightActions = [],
  onNewSearch,
  showNewSearch = false,
  isBusinessMode = false,
  onBusinessModeToggle
}) => {
  const { user, signOut, trackActivity } = useAuth();
  const [hasBusinessProfile, setHasBusinessProfile] = useState(false);
  const [businessProfile, setBusinessProfile] = useState(null);

  // Check if user has business profile on mount
  useEffect(() => {
    checkBusinessProfile();
  }, [user]);

  const checkBusinessProfile = async () => {
    if (!user) {
      setHasBusinessProfile(false);
      setBusinessProfile(null);
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from('business_profiles')
        .select('business_id, business_name, business_status, is_active')
        .eq('user_id', user.id)
        .single();

      if (profile && !error) {
        // Profile is fully active only if status is 'Active' (not 'Incomplete')
        const isFullyActive = profile.business_status === 'Active';
        setHasBusinessProfile(isFullyActive);
        setBusinessProfile(profile);
        console.log('Business profile found. Status:', profile.business_status, 'Fully Active:', isFullyActive);
      } else {
        setHasBusinessProfile(false);
        setBusinessProfile(null);
      }
    } catch (error) {
      console.log('No business profile found for user');
      setHasBusinessProfile(false);
      setBusinessProfile(null);
    }
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  const handleBillingPress = () => {
    console.log('Briefcase icon pressed. Has business profile:', hasBusinessProfile);
    console.log('Business profile data:', businessProfile);

    // Check if user has a business profile with 'Incomplete' status (needs to complete setup)
    if (businessProfile && businessProfile.business_status === 'Incomplete') {
      console.log('Business profile exists with Incomplete status. Navigating to BusinessProfileScreen to complete setup');
      navigation.navigate('BusinessProfileScreen');
      return;
    }

    if (hasBusinessProfile) {
      // User has fully active business profile (status = 'Active') - toggle business mode
      if (isBusinessMode) {
        // Currently in business mode - switch to general mode
        console.log('Exiting business mode, navigating to Search');
        if (onBusinessModeToggle) {
          onBusinessModeToggle(false);
        }
        navigation.navigate('Search');
      } else {
        // Currently in general mode - switch to business mode
        console.log('Entering business mode, navigating to BusinessAnalytics');
        if (onBusinessModeToggle) {
          onBusinessModeToggle(true);
        }
        navigation.navigate('BusinessAnalytics');
      }
    } else {
      // User doesn't have any business profile - go to pricing
      console.log('No business profile found, navigating to BusinessPricing');
      navigation.navigate('BusinessPricing');
    }
  };

  const handleSettingsPress = () => {
    // Track user activity to reset session timeout
    if (trackActivity) {
      trackActivity();
    }
    
    Alert.alert(
      'Account Menu',
      'Choose an option:',
      [
        {
          text: 'Settings',
          onPress: () => {
            if (trackActivity) trackActivity();
            Alert.alert('Coming Soon', 'Settings will be available in a future update.');
          },
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => handleSignOut(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            if (trackActivity) trackActivity();
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Landing' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Landing');
    }
  };

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerContent}>
        {/* Left Section */}
        <View style={styles.leftSection}>
          {showBackButton ? (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleBackPress}
            >
              <Ionicons name="arrow-back" size={24} color={colors.primaryBlue} />
            </TouchableOpacity>
          ) : (
            <View style={styles.logoContainer}>
              <Image 
                source={require('./assets/logo.png')} 
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.logoText} numberOfLines={1}>Linked By Six</Text>
            </View>
          )}
        </View>

        {/* Center Section - Empty (no title) */}
        <View style={styles.centerSection}>
          {/* No title displayed */}
        </View>

        {/* Right Section */}
        <View style={styles.rightSection}>
          {/* Billing/Suitcase Icon - only show if user is logged in */}
          {user && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleBillingPress}
            >
              <MaterialIcons 
                name={isBusinessMode ? "work" : "work-outline"} 
                size={24} 
                color={colors.primaryBlue} 
              />
            </TouchableOpacity>
          )}

          {/* Custom right actions */}
          {rightActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.iconButton}
              onPress={action.onPress}
            >
              <Ionicons 
                name={action.icon} 
                size={24} 
                color={colors.primaryBlue} 
              />
            </TouchableOpacity>
          ))}

          {/* Three Dots Menu (replacing Profile button) */}
          {user ? (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleSettingsPress}
            >
              <MaterialIcons 
                name="more-horiz" 
                size={24} 
                color={colors.primaryBlue} 
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => navigation.navigate('LoginScreen')}
            >
              <Text style={styles.profileButtonText}>Login</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: colors.cardWhite,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    elevation: 2,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32, // Match the logo height from landing page
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0, // Don't flex, use natural width
    minWidth: 160, // Ensure enough space for "Linked By Six"
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0, // Don't allow shrinking
  },
  logoImage: {
    width: 24,
    height: 24,
    marginRight: 8,
    flexShrink: 0, // Don't shrink the icon
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.darkBlue,
    flexShrink: 0, // Don't allow text to shrink
  },
  centerSection: {
    flex: 1, // Take up remaining space
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 0, // Don't flex, use natural width
    minWidth: 120, // Increased to accommodate billing icon
  },
  iconButton: {
    padding: 8,
    marginLeft: 4,
    borderRadius: 8,
  },
  businessModeIconButton: {
    backgroundColor: colors.primaryBlue,
  },
  profileButton: {
    borderWidth: 2,
    borderColor: colors.primaryBlue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 25,
    marginLeft: 8,
  },
  profileButtonText: {
    color: colors.primaryBlue,
    fontWeight: '600',
    fontSize: 14,
  },
});

export default MobileHeader;
