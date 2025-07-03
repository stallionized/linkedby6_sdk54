import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Dimensions,
  Image
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from './supabaseClient';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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

// Function to generate consistent color from business name
const getColorFromName = (name) => {
  const colors = [
    '#FF5733', '#33A8FF', '#FF33A8', '#A833FF', '#33FF57',
    '#FFD433', '#FF8333', '#3357FF', '#33FFEC', '#8CFF33'
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const BusinessProfileSlider = ({ 
  isVisible, 
  onClose, 
  businessId, 
  userId, 
  viewSource = 'unknown' 
}) => {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRecommended, setIsRecommended] = useState(false);
  const [bgColor, setBgColor] = useState('#FF5733');

  useEffect(() => {
    if (isVisible && businessId) {
      fetchBusinessProfile();
      if (userId) {
        checkRecommendationStatus();
      }
    }
  }, [isVisible, businessId, userId]);

  useEffect(() => {
    if (business?.business_name) {
      setBgColor(getColorFromName(business.business_name));
    }
  }, [business]);

  const fetchBusinessProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('business_profiles')
        .select(`
          *,
          business_contacts (
            contact_type,
            contact_value,
            is_primary
          )
        `)
        .eq('business_id', businessId)
        .single();

      if (error) {
        throw error;
      }

      setBusiness(data);

      // Track view if user is logged in
      if (userId) {
        try {
          await supabase
            .from('business_profile_views')
            .insert({
              user_id: userId,
              business_id: businessId,
              view_source: viewSource,
              viewed_at: new Date().toISOString()
            });
        } catch (viewError) {
          // Don't fail the main operation if view tracking fails
          console.error('Error tracking view:', viewError);
        }
      }

    } catch (err) {
      console.error('Error fetching business profile:', err);
      setError(err.message || 'Failed to load business profile');
    } finally {
      setLoading(false);
    }
  };

  const checkRecommendationStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('user_recommendations')
        .select('id')
        .eq('user_id', userId)
        .eq('business_id', businessId)
        .single();

      setIsRecommended(!!data);
    } catch (error) {
      // Not found is expected if not recommended
      setIsRecommended(false);
    }
  };

  const toggleRecommendation = async () => {
    if (!userId) {
      Alert.alert('Error', 'You must be logged in to recommend businesses');
      return;
    }

    try {
      if (isRecommended) {
        const { error } = await supabase
          .from('user_recommendations')
          .delete()
          .match({ user_id: userId, business_id: businessId });

        if (error) throw error;
        setIsRecommended(false);
      } else {
        const { error } = await supabase
          .from('user_recommendations')
          .insert([{ user_id: userId, business_id: businessId }]);

        if (error) throw error;
        setIsRecommended(true);
      }
    } catch (error) {
      console.error('Error toggling recommendation:', error);
      Alert.alert('Error', 'Failed to update recommendation');
    }
  };

  const handleContactPress = (contact) => {
    const { contact_type, contact_value } = contact;
    
    switch (contact_type) {
      case 'phone':
        Linking.openURL(`tel:${contact_value}`);
        break;
      case 'email':
        Linking.openURL(`mailto:${contact_value}`);
        break;
      case 'website':
        let url = contact_value;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = `https://${url}`;
        }
        Linking.openURL(url);
        break;
      default:
        break;
    }
  };

  const getContactIcon = (type) => {
    switch (type) {
      case 'phone':
        return 'call-outline';
      case 'email':
        return 'mail-outline';
      case 'website':
        return 'globe-outline';
      default:
        return 'information-outline';
    }
  };

  const formatContactValue = (type, value) => {
    switch (type) {
      case 'phone':
        // Format phone number for display
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length === 10) {
          return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        }
        return value;
      case 'website':
        // Remove protocol for display
        return value.replace(/^https?:\/\//, '');
      default:
        return value;
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Business Profile</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color={colors.textDark} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primaryBlue} />
            <Text style={styles.loadingText}>Loading business profile...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchBusinessProfile}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : business ? (
          <>
            {/* Business Header */}
            <View style={styles.businessHeader}>
              <View style={[styles.businessLogo, { backgroundColor: bgColor }]}>
                {business.image_url ? (
                  <Image source={{ uri: business.image_url }} style={styles.businessLogoImage} />
                ) : (
                  <Text style={styles.businessLogoText}>
                    {business.business_name ? business.business_name.charAt(0).toUpperCase() : 'B'}
                  </Text>
                )}
              </View>
              <View style={styles.businessInfo}>
                <Text style={styles.businessName}>{business.business_name}</Text>
                {business.industry && (
                  <Text style={styles.businessIndustry}>{business.industry}</Text>
                )}
                <View style={styles.businessLocation}>
                  <Ionicons name="location-outline" size={16} color={colors.textMedium} />
                  <Text style={styles.businessLocationText}>
                    {business.city && business.state ? 
                      `${business.city}, ${business.state}` : 
                      business.zip_code || 'Location not specified'
                    }
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.recommendButton}
                onPress={toggleRecommendation}
              >
                <Ionicons
                  name={isRecommended ? "heart" : "heart-outline"}
                  size={24}
                  color={isRecommended ? colors.error : colors.textMedium}
                />
              </TouchableOpacity>
            </View>

            {/* Description */}
            {business.description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>
                <Text style={styles.description}>{business.description}</Text>
              </View>
            )}

            {/* Contact Information */}
            {business.business_contacts && business.business_contacts.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Contact Information</Text>
                {business.business_contacts.map((contact, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.contactItem}
                    onPress={() => handleContactPress(contact)}
                  >
                    <View style={styles.contactInfo}>
                      <Ionicons
                        name={getContactIcon(contact.contact_type)}
                        size={20}
                        color={colors.primaryBlue}
                      />
                      <View style={styles.contactDetails}>
                        <Text style={styles.contactType}>
                          {contact.contact_type.charAt(0).toUpperCase() + contact.contact_type.slice(1)}
                          {contact.is_primary && ' (Primary)'}
                        </Text>
                        <Text style={styles.contactValue}>
                          {formatContactValue(contact.contact_type, contact.contact_value)}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Coverage Information */}
            {business.coverage_type && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Service Coverage</Text>
                <View style={styles.coverageItem}>
                  <Ionicons name="business-outline" size={20} color={colors.primaryBlue} />
                  <Text style={styles.coverageText}>
                    {business.coverage_type.charAt(0).toUpperCase() + business.coverage_type.slice(1)} coverage
                    {business.coverage_type === 'local' && business.coverage_radius && 
                      ` within ${business.coverage_radius} miles`}
                  </Text>
                </View>
              </View>
            )}

            {/* Additional Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Details</Text>
              {business.founded_year && (
                <View style={styles.detailItem}>
                  <Ionicons name="calendar-outline" size={20} color={colors.textMedium} />
                  <Text style={styles.detailText}>Founded in {business.founded_year}</Text>
                </View>
              )}
              {business.employee_count && (
                <View style={styles.detailItem}>
                  <Ionicons name="people-outline" size={20} color={colors.textMedium} />
                  <Text style={styles.detailText}>{business.employee_count} employees</Text>
                </View>
              )}
              {business.annual_revenue && (
                <View style={styles.detailItem}>
                  <Ionicons name="trending-up-outline" size={20} color={colors.textMedium} />
                  <Text style={styles.detailText}>Annual revenue: ${business.annual_revenue}</Text>
                </View>
              )}
            </View>

            {/* Connection Analysis Placeholder */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Six Degrees Analysis</Text>
              <View style={styles.analysisPlaceholder}>
                <Ionicons name="analytics-outline" size={32} color={colors.textLight} />
                <Text style={styles.analysisText}>Connection analysis loading...</Text>
                <Text style={styles.analysisSubtext}>
                  We're analyzing your network connections to this business
                </Text>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cardWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.cardWhite,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textMedium,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.error,
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
    fontSize: 16,
    fontWeight: '600',
  },
  businessHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    backgroundColor: colors.cardWhite,
    marginBottom: 8,
  },
  businessLogo: {
    width: 80,
    height: 80,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  businessLogoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  businessLogoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.cardWhite,
  },
  businessInfo: {
    flex: 1,
    marginRight: 16,
  },
  businessName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 8,
  },
  businessIndustry: {
    fontSize: 16,
    color: colors.textMedium,
    marginBottom: 8,
  },
  businessLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  businessLocationText: {
    fontSize: 14,
    color: colors.textMedium,
    marginLeft: 6,
  },
  recommendButton: {
    padding: 8,
  },
  section: {
    backgroundColor: colors.cardWhite,
    marginBottom: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: colors.textDark,
    lineHeight: 24,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactDetails: {
    marginLeft: 12,
    flex: 1,
  },
  contactType: {
    fontSize: 14,
    color: colors.textMedium,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 16,
    color: colors.textDark,
    fontWeight: '500',
  },
  coverageItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coverageText: {
    fontSize: 16,
    color: colors.textDark,
    marginLeft: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 16,
    color: colors.textDark,
    marginLeft: 12,
  },
  analysisPlaceholder: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  analysisText: {
    fontSize: 16,
    color: colors.textMedium,
    marginTop: 12,
    fontWeight: '500',
  },
  analysisSubtext: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default BusinessProfileSlider;