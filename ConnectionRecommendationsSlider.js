import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from './supabaseClient';
import { getSession } from './Auth';

// Import mobile components
import BusinessProfileSlider from './BusinessProfileSlider';
import AddToProjectSlider from './AddToProjectSlider';
import ConnectionGraphDisplay from './ConnectionGraphDisplay';
import BusinessLogoInitials from './components/BusinessLogoInitials';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Mobile-optimized constants
const BUSINESS_SLIDER_WIDTH = screenWidth; // Full width like SearchScreen

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

// Function to generate consistent color from business name (same as SearchScreen)
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

// Business Logo Component - now uses BusinessLogoInitials with 2-letter fallback
const BusinessLogo = ({ business }) => {
  return (
    <BusinessLogoInitials
      businessName={business.business_name}
      imageUrl={business.image_url}
      backgroundColor={business.logo_dominant_color}
      size={72}
    />
  );
};

// Business Card Component (same layout as SearchScreen)
const BusinessCard = ({ 
  business, 
  onPress, 
  onAddToProject, 
  onBusinessLogoPress,
  isRecommended, 
  onToggleRecommendation,
  connectionPath,
  loadingConnection,
  currentUserFullName
}) => {
  return (
    <TouchableOpacity style={styles.businessCard} onPress={() => onPress(business.business_id)}>
      <View style={styles.businessCardHeader}>
        <TouchableOpacity onPress={() => onBusinessLogoPress(business.business_id)}>
          <BusinessLogo business={business} />
        </TouchableOpacity>
        
        <View style={styles.businessCardInfo}>
          <Text style={styles.businessName} numberOfLines={2}>{business.business_name}</Text>
          {business.industry && (
            <Text style={styles.businessIndustry} numberOfLines={1}>{business.industry}</Text>
          )}

          {/* Show location only if coverage is local or not set */}
          {(!business.coverage_type || business.coverage_type === 'local') && (
            <View style={styles.businessLocation}>
              <Ionicons name="location-outline" size={14} color={colors.textMedium} />
              <Text style={styles.businessLocationText} numberOfLines={1}>
                {business.city && business.state ? `${business.city}, ${business.state}` :
                 business.zip_code || 'Location not specified'}
              </Text>
            </View>
          )}

          {/* Show coverage info only if regional or national */}
          {business.coverage_type && (business.coverage_type === 'regional' || business.coverage_type === 'national') && (
            <View style={styles.coverageInfo}>
              <Ionicons name="business-outline" size={12} color={colors.textMedium} />
              <Text style={styles.coverageText}>
                {business.coverage_type.charAt(0).toUpperCase() + business.coverage_type.slice(1)}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.businessCardActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onToggleRecommendation(business.business_id)}
          >
            <Ionicons
              name={isRecommended ? "heart" : "heart-outline"}
              size={20}
              color={isRecommended ? colors.error : colors.textMedium}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onAddToProject(business.business_id)}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primaryBlue} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Six Degrees Connection Visualization */}
      <View style={styles.connectionVisualization}>
        {loadingConnection ? (
          <View style={styles.connectionContainer}>
            <ActivityIndicator size="small" color={colors.primaryBlue} />
            <Text style={styles.connectionText}>Finding connection...</Text>
          </View>
        ) : connectionPath ? (
          connectionPath.found && connectionPath.data ? (
            <View style={styles.connectionFound}>
              <ConnectionGraphDisplay 
                pathData={connectionPath.raw}
                businessName={business.business_name}
                currentUserFullName={currentUserFullName}
                compact={true} // Mobile compact version
              />
            </View>
          ) : (
            <View style={styles.connectionContainer}>
              <Ionicons name="people-outline" size={16} color={colors.textMedium} />
              <Text style={styles.connectionText}>
                {connectionPath.message || "No connection within 6 degrees"}
              </Text>
            </View>
          )
        ) : (
          <View style={styles.connectionContainer}>
            <Image 
              source={require('./assets/cropped_6_degrees_network_map.png')} 
              style={styles.networkImage}
              resizeMode="contain"
            />
            <Text style={styles.connectionText}>Connection network</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const ConnectionRecommendationsSlider = ({ 
  isVisible, 
  onClose, 
  connectionUserId, 
  connectionName,
  currentUserId 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendedBusinesses, setRecommendedBusinesses] = useState([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserPhoneNumber, setCurrentUserPhoneNumber] = useState(null);
  const [currentUserFullName, setCurrentUserFullName] = useState('You');
  const [neo4jConfig, setNeo4jConfig] = useState(null);
  const [connectionPaths, setConnectionPaths] = useState({});
  const [loadingPaths, setLoadingPaths] = useState({});
  
  // Business profile slider states
  const [businessSliderVisible, setBusinessSliderVisible] = useState(false);
  const [addToProjectSliderVisible, setAddToProjectSliderVisible] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  
  // Animation ref for business slider
  const businessSlideAnim = useRef(new Animated.Value(BUSINESS_SLIDER_WIDTH)).current;

  // Load connection's recommendations when component becomes visible
  useEffect(() => {
    if (isVisible && connectionUserId) {
      loadConnectionData();
    }
  }, [isVisible, connectionUserId]);

  // Load user data for connection paths
  useEffect(() => {
    const loadCurrentUserData = async () => {
      try {
        const session = await getSession();
        if (!session) return;
        
        // Fetch user profile data
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('user_phone_number, full_name')
          .eq('user_id', session.user.id)
          .single();
          
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('❌ Error fetching user profile data:', profileError);
        } else if (profileData) {
          if (profileData.user_phone_number) {
            setCurrentUserPhoneNumber(profileData.user_phone_number);
          } else if (session.user.phone) {
            setCurrentUserPhoneNumber(session.user.phone);
          }
          
          if (profileData.full_name) {
            setCurrentUserFullName(profileData.full_name);
          } else if (session.user.user_metadata?.full_name) {
            setCurrentUserFullName(session.user.user_metadata.full_name);
          }
        }
      } catch (err) {
        console.error('Error loading current user data:', err);
      }
    };
    
    if (isVisible) {
      loadCurrentUserData();
    }
  }, [isVisible]);

  // Fetch Neo4j settings
  useEffect(() => {
    const fetchNeo4jSettings = async () => {
      const settingKeys = ['admin_neo4j_uri', 'admin_neo4j_username', 'admin_neo4j_password'];
      
      try {
        console.log('🔍 Fetching Neo4j settings from Supabase global_settings...');
        
        const { data, error } = await supabase
          .from('global_settings')
          .select('key, value')
          .in('key', settingKeys);

        if (error) {
          console.warn('⚠️ Supabase error fetching Neo4j settings:', error);
          console.warn('Neo4j connection features may be limited due to configuration issue');
          setNeo4jConfig(null);
          return;
        }

        if (data && data.length > 0) {
          const config = data.reduce((acc, setting) => {
            if (setting.value && setting.value.trim() !== '') {
              acc[setting.key] = setting.value;
            }
            return acc;
          }, {});
          
          const missingKeys = settingKeys.filter(key => !config[key] || config[key].trim() === '');
          
          if (missingKeys.length === 0) {
            setNeo4jConfig(config);
            console.log('✅ Neo4j configuration loaded successfully');
          } else {
            console.warn('⚠️ Missing or empty Neo4j settings:', missingKeys);
            setNeo4jConfig(null);
          }
        } else {
          console.warn('ℹ️ No Neo4j settings found in global_settings table');
          setNeo4jConfig(null);
        }
      } catch (err) {
        console.error('💥 Exception while fetching Neo4j settings:', err);
        setNeo4jConfig(null);
      }
    };
    
    if (isVisible) {
      fetchNeo4jSettings();
    }
  }, [isVisible]);

  // Filter businesses when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredBusinesses(recommendedBusinesses);
    } else {
      const filtered = recommendedBusinesses.filter(
        business => 
          business.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          business.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (business.city && business.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (business.state && business.state.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredBusinesses(filtered);
    }
  }, [searchQuery, recommendedBusinesses]);

  // Fetch connection paths when user phone number and businesses are available
  useEffect(() => {
    if (currentUserPhoneNumber && recommendedBusinesses.length > 0) {
      console.log('🔗 Fetching connection paths for connection\'s recommended businesses...');
      recommendedBusinesses.forEach(business => {
        // Only fetch if we don't already have a connection path for this business
        if (!connectionPaths[business.business_id] && !loadingPaths[business.business_id]) {
          fetchConnectionPath(business.business_id);
        }
      });
    }
  }, [currentUserPhoneNumber, recommendedBusinesses]);

  // Load connection's data and recommendations
  const loadConnectionData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await fetchConnectionRecommendations(connectionUserId);
    } catch (err) {
      console.error('Error loading connection data:', err);
      setError('Failed to load recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch connection's recommended businesses from Supabase
  const fetchConnectionRecommendations = async (userId) => {
    try {
      // Get business IDs from user_recommendations for the connection
      const { data: recommendationsData, error: recommendationsError } = await supabase
        .from('user_recommendations')
        .select('business_id')
        .eq('user_id', userId);
        
      if (recommendationsError) throw recommendationsError;
      
      if (!recommendationsData || recommendationsData.length === 0) {
        setRecommendedBusinesses([]);
        setFilteredBusinesses([]);
        return;
      }
      
      // Get business details
      const businessIds = recommendationsData.map(item => item.business_id);
      const { data: businessData, error: businessError } = await supabase
        .from('business_profiles')
        .select(`
          business_id,
          business_name,
          description,
          industry,
          image_url,
          logo_dominant_color,
          city,
          state,
          zip_code,
          coverage_type,
          coverage_details,
          coverage_radius
        `)
        .in('business_id', businessIds);
        
      if (businessError) throw businessError;
      
      console.log(`✅ Fetched ${connectionName}'s recommended business profiles:`, businessData?.length || 0, 'businesses');
      setRecommendedBusinesses(businessData || []);
      setFilteredBusinesses(businessData || []);
    } catch (err) {
      console.error(`Error fetching ${connectionName}'s recommended businesses:`, err);
      setError('Failed to load recommended businesses');
    }
  };

  // Fetch connection path
  const fetchConnectionPath = async (businessId) => {
    if (!currentUserPhoneNumber || !businessId) {
      console.warn(`Cannot fetch connection path for businessId: ${businessId}. Missing user phone or business ID.`);
      setConnectionPaths(prev => ({ 
        ...prev, 
        [businessId]: { found: false, message: "Connection search unavailable" } 
      }));
      return;
    }
    
    setLoadingPaths(prev => ({ ...prev, [businessId]: true }));
    
    try {
      const backendUrl = 'https://neo4j-query-service.onrender.com';
      
      const cypherQuery = `
        MATCH (start:Person {phone: "${currentUserPhoneNumber}"})
        MATCH (target:Business {business_id: "${businessId}"})
        MATCH path = shortestPath((start)-[:FAMILY_MEMBER|FRIEND|OWNS|EMPLOYEE_OF*..6]-(target))
        RETURN path, length(path) AS degrees
      `;
      
      console.log('🔍 Sending Cypher query to neo4j-query-service for business:', businessId);
      
      const response = await fetch(`${backendUrl}/execute-cypher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: cypherQuery }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          message: `Failed to fetch connection path: ${response.status}` 
        }));
        throw new Error(errorData.message || `Failed to fetch connection path: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.records && data.records.length > 0) {
        console.log(`✅ Connection path found for business ${businessId}`);
        setConnectionPaths(prev => ({ 
          ...prev, 
          [businessId]: { found: true, data: data.records, raw: data } 
        }));
      } else {
        console.log(`❌ No connection found for business ${businessId}`);
        setConnectionPaths(prev => ({ 
          ...prev, 
          [businessId]: { found: false, message: "No connection within 6 degrees" } 
        }));
      }
    } catch (error) {
      console.warn(`⚠️ Error fetching connection path for business ${businessId}:`, error.message);
      setConnectionPaths(prev => ({ 
        ...prev, 
        [businessId]: { found: false, message: "Connection search unavailable" } 
      }));
    } finally {
      setLoadingPaths(prev => ({ ...prev, [businessId]: false }));
    }
  };

  // Toggle recommendation (for current user, not the connection)
  const toggleRecommendation = async (businessId) => {
    if (!currentUserId) {
      Alert.alert("Error", "You must be logged in to manage recommendations.");
      return;
    }

    // Check if current user has this business recommended
    const { data: existingRec, error: checkError } = await supabase
      .from('user_recommendations')
      .select('business_id')
      .eq('user_id', currentUserId)
      .eq('business_id', businessId)
      .single();

    const isRecommended = !checkError && existingRec;
    const business = recommendedBusinesses.find(b => b.business_id === businessId);
    const businessName = business?.business_name || 'this business';
    
    if (isRecommended) {
      // Remove from current user's recommendations
      try {
        const { error } = await supabase
          .from('user_recommendations')
          .delete()
          .match({ user_id: currentUserId, business_id: businessId });
        if (error) throw error;
        
        Alert.alert("Success", `"${businessName}" has been removed from your recommendations.`);
      } catch (error) {
        console.error('Error removing recommendation:', error);
        Alert.alert("Error", "Could not remove recommendation. Please try again.");
      }
    } else {
      // Add to current user's recommendations
      try {
        const { error } = await supabase
          .from('user_recommendations')
          .insert([{ user_id: currentUserId, business_id: businessId }]);
        if (error) throw error;
        
        Alert.alert("Success", `"${businessName}" has been added to your recommendations.`);
      } catch (error) {
        console.error('Error adding recommendation:', error);
        Alert.alert("Error", "Could not add recommendation.");
      }
    }
  };

  // Handle business card press
  const handleBusinessPress = (businessId) => {
    setSelectedBusinessId(businessId);
    openBusinessSlider(businessId);
  };

  // Handle business logo press
  const handleBusinessLogoPress = (businessId) => {
    setSelectedBusinessId(businessId);
    openBusinessSlider(businessId);
  };

  // Handle add to project
  const handleAddToProjectClick = (businessId) => {
    setSelectedBusinessId(businessId);
    setAddToProjectSliderVisible(true);
  };

  // Animation functions
  const openBusinessSlider = (businessId) => {
    setSelectedBusinessId(businessId);
    setBusinessSliderVisible(true);
    
    Animated.spring(businessSlideAnim, {
      toValue: 0,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };

  const closeBusinessSlider = () => {
    Animated.spring(businessSlideAnim, {
      toValue: BUSINESS_SLIDER_WIDTH,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start(() => {
      setBusinessSliderVisible(false);
      setSelectedBusinessId(null);
    });
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Check if current user has recommended a business
  const isBusinessRecommendedByCurrentUser = async (businessId) => {
    if (!currentUserId) return false;
    
    const { data, error } = await supabase
      .from('user_recommendations')
      .select('business_id')
      .eq('user_id', currentUserId)
      .eq('business_id', businessId)
      .single();
      
    return !error && data;
  };

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <LinearGradient
        colors={[colors.primaryBlue, colors.darkBlue]}
        style={styles.header}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="arrow-back" size={24} color={colors.cardWhite} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{connectionName}'s Recommendations</Text>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Main Content */}
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search-outline" size={20} color={colors.textMedium} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search recommendations..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.textLight}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch}>
                <Ionicons name="close-circle" size={20} color={colors.textMedium} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content Area */}
        <ScrollView
          style={styles.mainContent}
          contentContainerStyle={styles.resultsContent}
          showsVerticalScrollIndicator={true}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primaryBlue} />
              <Text style={styles.loadingText}>Loading {connectionName}'s recommendations...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : filteredBusinesses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="heart-outline" size={64} color={colors.textLight} />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No matching recommendations found' : `${connectionName} hasn't recommended any businesses yet`}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery 
                  ? 'Try adjusting your search terms' 
                  : 'Check back later for recommendations'
                }
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.resultsCount}>
                {connectionName} recommends {filteredBusinesses.length} business{filteredBusinesses.length !== 1 ? 'es' : ''}
                {searchQuery && ` matching "${searchQuery}"`}
              </Text>
              
              {filteredBusinesses.map((business) => (
                <BusinessCard
                  key={business.business_id}
                  business={business}
                  onPress={handleBusinessPress}
                  onBusinessLogoPress={handleBusinessLogoPress}
                  onAddToProject={handleAddToProjectClick}
                  isRecommended={false} // Will be determined dynamically
                  onToggleRecommendation={toggleRecommendation}
                  connectionPath={connectionPaths[business.business_id]}
                  loadingConnection={loadingPaths[business.business_id]}
                  currentUserFullName={currentUserFullName}
                />
              ))}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Business Profile Slider */}
      {businessSliderVisible && (
        <Animated.View style={[
          styles.businessSlider,
          { 
            transform: [{ translateX: businessSlideAnim }],
            width: BUSINESS_SLIDER_WIDTH,
          }
        ]}>
          <BusinessProfileSlider
            isVisible={businessSliderVisible}
            onClose={closeBusinessSlider}
            businessId={selectedBusinessId}
            userId={currentUserId}
            viewSource="connection_recommendations"
          />
        </Animated.View>
      )}

      {/* Add to Project Slider */}
      <AddToProjectSlider
        isVisible={addToProjectSliderVisible}
        onClose={() => setAddToProjectSliderVisible(false)}
        businessId={selectedBusinessId}
        userId={currentUserId}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  header: {
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  closeButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.cardWhite,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.cardWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundGray,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textDark,
    marginLeft: 8,
    marginRight: 8,
  },
  mainContent: {
    flex: 1,
  },
  resultsContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textMedium,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 24,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textMedium,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  resultsCount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 16,
  },
  businessCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  businessCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  businessLogo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  businessLogoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    resizeMode: 'contain',
  },
  businessLogoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.cardWhite,
  },
  businessCardInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  businessName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 4,
    lineHeight: 22,
  },
  businessIndustry: {
    fontSize: 14,
    color: colors.textMedium,
    marginBottom: 6,
    fontWeight: '500',
  },
  businessLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  businessLocationText: {
    fontSize: 12,
    color: colors.textMedium,
    marginLeft: 4,
  },
  coverageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coverageText: {
    fontSize: 12,
    color: colors.textMedium,
    marginLeft: 4,
    fontWeight: '500',
  },
  businessCardActions: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    padding: 8,
    marginVertical: 2,
    borderRadius: 20,
  },
  connectionVisualization: {
    backgroundColor: colors.backgroundGray,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    minHeight: 60,
    justifyContent: 'center',
  },
  connectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionFound: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionText: {
    fontSize: 12,
    color: colors.textMedium,
    marginLeft: 8,
    fontWeight: '500',
  },
  networkImage: {
    height: 32,
    width: 60,
    marginRight: 8,
  },
  businessSlider: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: BUSINESS_SLIDER_WIDTH,
    height: '100%',
    backgroundColor: colors.cardWhite,
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 999,
  },
});

export default ConnectionRecommendationsSlider;
