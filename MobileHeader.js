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
  showNewSearch = false
}) => {
  const { user, signOut } = useAuth();

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  const handleSettingsPress = () => {
    Alert.alert(
      'Settings',
      'Choose an option:',
      [
        {
          text: 'Profile Settings',
          onPress: () => navigation.navigate('Settings'),
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => handleSignOut(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
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

          {/* User Profile/Settings */}
          {user ? (
            <TouchableOpacity
              style={styles.profileButton}
              onPress={handleSettingsPress}
            >
              <Text style={styles.profileButtonText}>Profile</Text>
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
    minWidth: 80, // Ensure enough space for actions
  },
  iconButton: {
    padding: 8,
    marginLeft: 4,
    borderRadius: 8,
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
