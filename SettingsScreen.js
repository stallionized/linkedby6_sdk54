import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from './supabaseClient';
import { useAuth } from './Auth';

// Import mobile components
import MobileHeader from './MobileHeader';
import MobileBottomNavigation from './MobileBottomNavigation';

const { width: screenWidth } = Dimensions.get('window');

// Colors palette
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

// Initial settings for admin view
const getInitialSettings = () => ({
  ms2WebHook: '',
  admin_neo4j_api_key: '',
  admin_neo4j_uri: '',
  admin_neo4j_username: '',
  admin_neo4j_password: '',
  admin_aura_instance_id: '',
  admin_aura_instance_name: '',
});

const SettingsScreen = ({ navigation }) => {
  const { user, config, signOut } = useAuth();
  
  // Database settings state (for admin view)
  const [settings, setSettings] = useState(getInitialSettings());
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // User profile state
  const [userId, setUserId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [originalPhoneNumber, setOriginalPhoneNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [hasBusiness, setHasBusiness] = useState(false);
  const [businessId, setBusinessId] = useState(null);
  const [businessName, setBusinessName] = useState('');
  const [businessStatus, setBusinessStatus] = useState('Active');

  // Function to fetch Admin Global Settings from global_settings table (admin only)
  const fetchAdminGlobalSettings = async () => {
    const settingKeys = [
      'ms2_webhook_url',
      'admin_neo4j_api_key',
      'admin_neo4j_uri',
      'admin_neo4j_username',
      'admin_neo4j_password',
      'admin_aura_instance_id',
      'admin_aura_instance_name',
    ];

    try {
      const { data, error } = await supabase
        .from('global_settings')
        .select('key, value')
        .in('key', settingKeys);

      if (error) {
        console.error('Error fetching Admin Global Settings:', error);
        return;
      }

      if (data && data.length > 0) {
        const newSettings = {};
        data.forEach(item => {
          if (item.key === 'ms2_webhook_url') {
            newSettings.ms2WebHook = item.value || '';
          } else {
            newSettings[item.key] = item.value || '';
          }
        });
        setSettings(prev => ({
          ...prev,
          ...newSettings
        }));
      }
    } catch (error) {
      console.error('Error fetching Admin Global Settings:', error);
    }
  };

  // Function to fetch current user's role and profile data
  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      
      if (user) {
        setUserId(user.id);
        
        // Get user role and admin status
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching user profile:', error);
          setIsLoading(false);
          return;
        }
        
        // Get email from auth user
        setEmail(user.email || '');
        
        // Get phone number from user_profiles if available, otherwise from auth user
        if (data && data.user_phone_number) {
          setPhoneNumber(data.user_phone_number);
          setOriginalPhoneNumber(data.user_phone_number);
        } else if (data && data.phone_number) {
          setPhoneNumber(data.phone_number);
          setOriginalPhoneNumber(data.phone_number);
        } else {
          setPhoneNumber(user.phone || '');
          setOriginalPhoneNumber(user.phone || '');
        }
        
        // Get full name from user metadata
        if (user.user_metadata && user.user_metadata.full_name) {
          setFullName(user.user_metadata.full_name);
        }
        
        if (data) {
          // Update full name from profile if available
          if (data.full_name) {
            setFullName(data.full_name);
          }
          
          // Handle profile image
          if (data.profile_image_url) {
            setProfileImage(data.profile_image_url);
          }
          
          // Set user role and admin status
          const role = data.role || 'standard_user';
          const adminStatus = data.is_admin === true || role === 'admin';
          
          setUserRole(role);
          setIsAdmin(adminStatus);
          
          // Only fetch Admin Global Settings if user is admin
          if (adminStatus) {
            fetchAdminGlobalSettings();
          }
        } else {
          setUserRole('standard_user');
          setIsAdmin(false);
        }
        
        // Check if user has a business profile
        const { data: businessData } = await supabase
          .from('business_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (businessData) {
          setHasBusiness(true);
          setBusinessId(businessData.business_id);
          setBusinessName(businessData.business_name || '');
          setBusinessStatus(businessData.business_status || 'Active');
        } else {
          setHasBusiness(false);
        }
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error in fetchUserData:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // Function to update a global setting (upsert)
  const saveGlobalSetting = async (key, value) => {
    try {
      // First check if the setting exists
      const { data: existingData, error: checkError } = await supabase
        .from('global_settings')
        .select('*')
        .eq('key', key)
        .maybeSingle();

      if (checkError) {
        console.error(`Error checking global setting ${key}:`, checkError);
        throw new Error(`Failed to check setting ${key}: ${checkError.message}`);
      }

      if (existingData) {
        // Update existing setting
        const { data, error } = await supabase
          .from('global_settings')
          .update({ value: value })
          .eq('key', key)
          .select();

        if (error) {
          console.error(`Error updating global setting ${key}:`, error);
          throw new Error(`Failed to update setting ${key}: ${error.message}`);
        }
      } else {
        // Insert new setting
        const { data, error } = await supabase
          .from('global_settings')
          .insert([{ key: key, value: value }])
          .select();

        if (error) {
          console.error(`Error inserting global setting ${key}:`, error);
          throw new Error(`Failed to insert setting ${key}: ${error.message}`);
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Error in saveGlobalSetting for ${key}:`, error);
      throw error;
    }
  };

  // Function to pick profile image from gallery
  const pickProfileImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to upload images');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        exif: false,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking profile image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
    return phoneRegex.test(phone);
  };

  // Function to handle saving admin settings
  const handleSaveAdminSettings = async () => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'You need admin privileges to save these settings.');
      return;
    }

    setIsLoading(true);
    try {
      // Update MS2 Web Hook URL
      if (settings.ms2WebHook !== undefined) {
        await saveGlobalSetting('ms2_webhook_url', settings.ms2WebHook);
      }

      // Update Neo4j and Aura settings
      const adminSettingsToSave = [
        { key: 'admin_neo4j_api_key', value: settings.admin_neo4j_api_key },
        { key: 'admin_neo4j_uri', value: settings.admin_neo4j_uri },
        { key: 'admin_neo4j_username', value: settings.admin_neo4j_username },
        { key: 'admin_neo4j_password', value: settings.admin_neo4j_password },
        { key: 'admin_aura_instance_id', value: settings.admin_aura_instance_id },
        { key: 'admin_aura_instance_name', value: settings.admin_aura_instance_name },
      ];

      for (const setting of adminSettingsToSave) {
        if (setting.value !== undefined) {
          await saveGlobalSetting(setting.key, setting.value);
        }
      }
      
      await fetchAdminGlobalSettings(); // Re-fetch to confirm
      
      Alert.alert('Success', 'Admin settings saved successfully!');
    } catch (error) {
      console.error('Error saving admin settings:', error);
      Alert.alert('Error', 'Error saving admin settings: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle saving user profile
  const handleSaveUserProfile = async () => {
    try {
      // Validate form
      if (!phoneNumber.trim()) {
        Alert.alert('Missing Information', 'Please enter your phone number.');
        return;
      }

      if (!validatePhone(phoneNumber)) {
        Alert.alert('Invalid Phone Number', 'Please enter a valid phone number.');
        return;
      }

      if (!fullName.trim()) {
        Alert.alert('Missing Information', 'Please enter your full name.');
        return;
      }

      if (!email.trim()) {
        Alert.alert('Missing Information', 'Please enter your email address.');
        return;
      }

      if (!validateEmail(email)) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        return;
      }

      setIsSubmitting(true);
      
      // Check if user is authenticated
      if (!userId) {
        if (!user) {
          Alert.alert('Authentication Required', 'Please log in to update your profile');
          setIsSubmitting(false);
          return;
        }
        setUserId(user.id);
      }
      
      // Prepare user profile data
      const profileData = {
        user_id: userId,
        full_name: fullName.trim(),
        user_phone_number: phoneNumber.trim(), // Use consistent column name
        profile_image_url: profileImage,
        is_admin: isAdmin,
        role: userRole,
        updated_at: new Date(),
      };
      
      // Update user profile in database using upsert
      const { error } = await supabase
        .from('user_profiles')
        .upsert(profileData, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        });

      if (error) {
        throw error;
      }
      
      // Update the original phone number to match the new one
      setOriginalPhoneNumber(phoneNumber.trim());
      
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to reset user profile form
  const handleResetUserProfile = async () => {
    await fetchUserData();
    Alert.alert('Success', 'Form reset to last saved values');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryBlue} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <MobileHeader navigation={navigation} title="Settings" />

      {/* Main Content */}
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Authentication Status Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark-outline" size={24} color={colors.success} />
              <Text style={styles.sectionTitle}>Authentication Status</Text>
            </View>
            
            <View style={styles.statusContainer}>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Login Status:</Text>
                <View style={[styles.statusBadge, user ? styles.statusSuccess : styles.statusError]}>
                  <Text style={styles.statusText}>
                    {user ? 'Logged In' : 'Not Logged In'}
                  </Text>
                </View>
              </View>
              
              {user && (
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>Email:</Text>
                  <Text style={styles.statusValue}>{user.email}</Text>
                </View>
              )}
              
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Neo4j URL:</Text>
                <Text style={styles.statusValue}>
                  {config.neo4jUrl ? '✅ Configured' : '❌ Not Set'}
                </Text>
              </View>
              
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Webhook URL:</Text>
                <Text style={styles.statusValue}>
                  {config.webhookUrl ? '✅ Configured' : '❌ Not Set'}
                </Text>
              </View>
            </View>
            
            {user && (
              <TouchableOpacity
                style={[styles.button, styles.signOutButton]}
                onPress={() => {
                  Alert.alert(
                    'Sign Out',
                    'Are you sure you want to sign out?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Sign Out', 
                        style: 'destructive',
                        onPress: signOut
                      }
                    ]
                  );
                }}
              >
                <Ionicons name="log-out-outline" size={20} color={colors.cardWhite} />
                <Text style={styles.buttonText}>Sign Out</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* User Profile Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={24} color={colors.primaryBlue} />
              <Text style={styles.sectionTitle}>User Profile</Text>
            </View>
            
            {/* Profile Picture */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Profile Picture</Text>
              <View style={styles.profileImageContainer}>
                {profileImage ? (
                  <View style={styles.profileImageWrapper}>
                    <Image 
                      source={{ uri: profileImage }} 
                      style={styles.profileImage}
                    />
                    <TouchableOpacity 
                      style={styles.removeImageButton}
                      onPress={() => setProfileImage(null)}
                    >
                      <Ionicons name="close-circle" size={24} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.addImageButton} 
                    onPress={pickProfileImage}
                  >
                    <Ionicons name="camera-outline" size={32} color={colors.primaryBlue} />
                    <Text style={styles.addImageText}>Add Photo</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number (Username)</Text>
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="(123) 456-7890"
                keyboardType="phone-pad"
                placeholderTextColor={colors.textLight}
              />
            </View>
            
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="John Doe"
                placeholderTextColor={colors.textLight}
              />
            </View>
            
            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.textLight}
              />
            </View>

            {/* Account Information */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Account Type</Text>
              <View style={styles.accountTypeBadge}>
                <Text style={styles.accountTypeText}>
                  {userRole === 'admin' ? 'Admin' : 
                   userRole === 'user_and_business' ? 'User & Business' : 
                   'Standard User'}
                </Text>
              </View>
            </View>

            {/* Business Information (if applicable) */}
            {hasBusiness && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Business Information</Text>
                <View style={styles.businessInfoContainer}>
                  <Text style={styles.businessInfoText}>
                    <Text style={styles.businessInfoLabel}>Name: </Text>
                    {businessName || 'Not specified'}
                  </Text>
                  <Text style={styles.businessInfoText}>
                    <Text style={styles.businessInfoLabel}>Status: </Text>
                    {businessStatus}
                  </Text>
                </View>
              </View>
            )}

            {/* Profile Action Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSaveUserProfile}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={colors.cardWhite} />
                ) : (
                  <>
                    <Ionicons name="checkmark-outline" size={20} color={colors.cardWhite} />
                    <Text style={styles.buttonText}>Save Profile</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.resetButton]}
                onPress={handleResetUserProfile}
                disabled={isSubmitting}
              >
                <Ionicons name="refresh-outline" size={20} color={colors.textMedium} />
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Admin Settings Section */}
          {isAdmin ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="settings-outline" size={24} color={colors.success} />
                <Text style={[styles.sectionTitle, { color: colors.success }]}>Admin Settings</Text>
              </View>
              <Text style={styles.sectionSubtitle}>Configure system-wide settings</Text>
              
              {/* MS2 Webhook URL */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>MS2 Webhook URL</Text>
                <Text style={styles.helperText}>Required for AI chat functionality</Text>
                <TextInput
                  style={styles.input}
                  value={settings.ms2WebHook || ''}
                  onChangeText={(value) => setSettings(prev => ({ ...prev, ms2WebHook: value }))}
                  placeholder="https://your-webhook-url.com"
                  autoCapitalize="none"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              {/* Neo4j Settings */}
              <View style={styles.neo4jSection}>
                <Text style={styles.neo4jHeader}>Neo4j Configuration</Text>
                <Text style={styles.helperText}>Required for connection path visualization</Text>

                {/* Neo4j URI */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Neo4j URI</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.admin_neo4j_uri || ''}
                    onChangeText={(value) => setSettings(prev => ({ ...prev, admin_neo4j_uri: value }))}
                    placeholder="bolt://your-neo4j-instance.com:7687"
                    autoCapitalize="none"
                    placeholderTextColor={colors.textLight}
                  />
                </View>

                {/* Neo4j Username */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Neo4j Username</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.admin_neo4j_username || ''}
                    onChangeText={(value) => setSettings(prev => ({ ...prev, admin_neo4j_username: value }))}
                    placeholder="neo4j"
                    autoCapitalize="none"
                    placeholderTextColor={colors.textLight}
                  />
                </View>

                {/* Neo4j Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Neo4j Password</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.admin_neo4j_password || ''}
                    onChangeText={(value) => setSettings(prev => ({ ...prev, admin_neo4j_password: value }))}
                    placeholder="Enter Neo4j password"
                    secureTextEntry
                    placeholderTextColor={colors.textLight}
                  />
                </View>

                {/* Neo4j API Key */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Neo4j API Key (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.admin_neo4j_api_key || ''}
                    onChangeText={(value) => setSettings(prev => ({ ...prev, admin_neo4j_api_key: value }))}
                    placeholder="Enter Neo4j API Key"
                    secureTextEntry
                    placeholderTextColor={colors.textLight}
                  />
                </View>
              </View>

              {/* Aura Settings */}
              <View style={styles.auraSection}>
                <Text style={styles.auraHeader}>Aura Configuration (Optional)</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Aura Instance ID</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.admin_aura_instance_id || ''}
                    onChangeText={(value) => setSettings(prev => ({ ...prev, admin_aura_instance_id: value }))}
                    placeholder="Enter Aura Instance ID"
                    placeholderTextColor={colors.textLight}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Aura Instance Name</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.admin_aura_instance_name || ''}
                    onChangeText={(value) => setSettings(prev => ({ ...prev, admin_aura_instance_name: value }))}
                    placeholder="Enter Aura Instance Name"
                    placeholderTextColor={colors.textLight}
                  />
                </View>
              </View>
              
              {/* Admin Save Button */}
              <TouchableOpacity
                style={[styles.button, styles.adminSaveButton]}
                onPress={handleSaveAdminSettings}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.cardWhite} />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={20} color={colors.cardWhite} />
                    <Text style={styles.buttonText}>Save Admin Settings</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* Non-Admin Info */
            <View style={styles.section}>
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={24} color={colors.primaryBlue} />
                <Text style={styles.infoText}>
                  Contact an administrator to configure system settings like AI chat and connection analysis.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Navigation */}
      <MobileBottomNavigation navigation={navigation} activeRoute="Settings" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textMedium,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    marginBottom: 70, // Space for bottom navigation
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: colors.cardWhite,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textDark,
    marginLeft: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textMedium,
    marginBottom: 20,
    marginTop: -8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: colors.textMedium,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: colors.cardWhite,
    color: colors.textDark,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  profileImageWrapper: {
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.borderLight,
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: colors.cardWhite,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  addImageButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: colors.primaryBlue,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
  },
  addImageText: {
    color: colors.primaryBlue,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  accountTypeBadge: {
    backgroundColor: colors.primaryBlue,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  accountTypeText: {
    color: colors.cardWhite,
    fontSize: 14,
    fontWeight: '600',
  },
  businessInfoContainer: {
    backgroundColor: colors.backgroundGray,
    padding: 16,
    borderRadius: 12,
  },
  businessInfoText: {
    fontSize: 14,
    color: colors.textDark,
    marginBottom: 4,
  },
  businessInfoLabel: {
    fontWeight: '600',
    color: colors.textMedium,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: '48%',
  },
  saveButton: {
    backgroundColor: colors.primaryBlue,
  },
  resetButton: {
    backgroundColor: colors.backgroundGray,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  adminSaveButton: {
    backgroundColor: colors.success,
    marginTop: 16,
    width: '100%',
  },
  buttonText: {
    color: colors.cardWhite,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  resetButtonText: {
    color: colors.textMedium,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  neo4jSection: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primaryBlue,
  },
  neo4jHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primaryBlue,
    marginBottom: 8,
  },
  auraSection: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    marginVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  auraHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primaryBlue,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: colors.darkBlue,
    lineHeight: 20,
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
  },
  statusValue: {
    fontSize: 14,
    color: colors.textMedium,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusSuccess: {
    backgroundColor: colors.success,
  },
  statusError: {
    backgroundColor: colors.error,
  },
  statusText: {
    color: colors.cardWhite,
    fontSize: 12,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: colors.error,
    width: '100%',
    marginTop: 8,
  },
});

export default SettingsScreen;
