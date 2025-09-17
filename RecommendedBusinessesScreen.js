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
import { useFocusEffect } from '@react-navigation/native';

// Import mobile components
import MobileHeader from './MobileHeader';
import MobileBottomNavigation from './MobileBottomNavigation';
import BusinessProfileSlider from './BusinessProfileSlider';
import AddToProjectSlider from './AddToProjectSlider';
import ConnectionGraphDisplay from './ConnectionGraphDisplay';
import BusinessLogoInitials from './components/BusinessLogoInitials';
import SocialSlider from './components/SocialSlider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Mobile-optimized constants
const CHAT_SLIDER_WIDTH = screenWidth * 0.85;
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
  currentUserFullName,
  likeCount = 0,
  commentCount = 0,
  pictureCount = 0,
  userHasLiked = false,
  onLikePress,
  onSocialPress,
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

      {/* Engagement Actions */}
      <View style={styles.engagementActions}>
        <TouchableOpacity
          style={styles.engagementButton}
          onPress={(e) => {
            e.stopPropagation();
            onLikePress(business.business_id);
          }}
        >
          <Ionicons
            name={userHasLiked ? "thumbs-up" : "thumbs-up-outline"}
            size={20}
            color={userHasLiked ? colors.primaryBlue : colors.textMedium}
          />
          {likeCount > 0 && <Text style={styles.engagementCount}>{likeCount}</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.engagementButton}
          onPress={(e) => {
            e.stopPropagation();
            onSocialPress(business.business_id, 'comments');
          }}
        >
          <Ionicons name="chatbubble-outline" size={20} color={colors.textMedium} />
          {commentCount > 0 && <Text style={styles.engagementCount}>{commentCount}</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.engagementButton}
          onPress={(e) => {
            e.stopPropagation();
            onSocialPress(business.business_id, 'pictures');
          }}
        >
          <Ionicons name="camera-outline" size={20} color={colors.textMedium} />
          {pictureCount > 0 && <Text style={styles.engagementCount}>{pictureCount}</Text>}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// Chat Message Component
const ChatMessage = ({ message }) => {
  const isUser = message.isUser;
  
  return (
    <View style={[
      styles.messageContainer,
      isUser && styles.userMessageContainer
    ]}>
      <View style={[
        styles.messageBubble,
        isUser ? styles.userMessageBubble : styles.aiMessageBubble
      ]}>
        <Text style={[
          styles.messageText,
          isUser && styles.userMessageText
        ]}>
          {message.text}
        </Text>
      </View>
    </View>
  );
};

const RecommendedBusinessesScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendedBusinesses, setRecommendedBusinesses] = useState([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserPhoneNumber, setCurrentUserPhoneNumber] = useState(null);
  const [currentUserFullName, setCurrentUserFullName] = useState('You');
  const [neo4jConfig, setNeo4jConfig] = useState(null);
  const [connectionPaths, setConnectionPaths] = useState({});
  const [loadingPaths, setLoadingPaths] = useState({});

  // Engagement metrics state
  const [engagementMetrics, setEngagementMetrics] = useState({});
  
  // Chat states
  const [chatSliderVisible, setChatSliderVisible] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { 
      id: '1', 
      text: 'Hi! I can help you find businesses to recommend. What type of business are you looking for?', 
      isUser: false 
    }
  ]);
  
  // Business profile slider states
  const [businessSliderVisible, setBusinessSliderVisible] = useState(false);
  const [addToProjectSliderVisible, setAddToProjectSliderVisible] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);

  // Social slider states
  const [socialSliderVisible, setSocialSliderVisible] = useState(false);
  const [socialBusinessId, setSocialBusinessId] = useState(null);
  
  // Animation ref for chat slider
  const chatSlideAnim = useRef(new Animated.Value(CHAT_SLIDER_WIDTH)).current;
  const businessSlideAnim = useRef(new Animated.Value(BUSINESS_SLIDER_WIDTH)).current;

  // Load user data and recommendations
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const session = await getSession();
        if (!session) {
          setError('Please log in to view your recommendations');
          setIsLoading(false);
          return;
        }
        
        setCurrentUserId(session.user.id);
        
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
            console.log('✅ User phone number loaded from profile:', profileData.user_phone_number);
          } else if (session.user.phone) {
            setCurrentUserPhoneNumber(session.user.phone);
            console.log('✅ User phone number loaded from auth:', session.user.phone);
          }
          
          if (profileData.full_name) {
            setCurrentUserFullName(profileData.full_name);
            console.log('✅ User full name loaded:', profileData.full_name);
          } else if (session.user.user_metadata?.full_name) {
            setCurrentUserFullName(session.user.user_metadata.full_name);
          }
        }
        
        await fetchRecommendedBusinesses(session.user.id);
      } catch (err) {
        console.error('Error loading user data:', err);
        setError('Failed to load recommendations');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserData();
  }, []);

  // Refresh recommendations when screen is focused to ensure synchronization with SearchScreen
  useFocusEffect(
    React.useCallback(() => {
      const refreshRecommendations = async () => {
        if (currentUserId) {
          console.log('🔄 Screen focused - refreshing recommendations to sync with SearchScreen');
          try {
            await fetchRecommendedBusinesses(currentUserId);
          } catch (err) {
            console.error('Error refreshing recommendations on focus:', err);
          }
        }
      };
      
      refreshRecommendations();
    }, [currentUserId])
  );

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

        console.log('📋 Raw Neo4j settings data from Supabase:', data);

        if (data && data.length > 0) {
          const config = data.reduce((acc, setting) => {
            if (setting.value && setting.value.trim() !== '') {
              acc[setting.key] = setting.value;
            }
            return acc;
          }, {});
          
          console.log('🔧 Parsed Neo4j config keys:', Object.keys(config));
          
          const missingKeys = settingKeys.filter(key => !config[key] || config[key].trim() === '');
          
          if (missingKeys.length === 0) {
            setNeo4jConfig(config);
            console.log('✅ Neo4j configuration loaded successfully');
          } else {
            console.warn('⚠️ Missing or empty Neo4j settings:', missingKeys);
            console.warn('Some connection features will be disabled');
            setNeo4jConfig(null);
          }
        } else {
          console.warn('ℹ️ No Neo4j settings found in global_settings table');
          console.warn('Connection path features will be disabled');
          setNeo4jConfig(null);
        }
      } catch (err) {
        console.error('💥 Exception while fetching Neo4j settings:', err);
        console.warn('Connection features disabled due to configuration error');
        setNeo4jConfig(null);
      }
    };
    
    fetchNeo4jSettings();
  }, []);

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
      console.log('🔗 Fetching connection paths for recommended businesses...');
      recommendedBusinesses.forEach(business => {
        // Only fetch if we don't already have a connection path for this business
        if (!connectionPaths[business.business_id] && !loadingPaths[business.business_id]) {
          fetchConnectionPath(business.business_id);
        }
      });
    }
  }, [currentUserPhoneNumber, recommendedBusinesses]);

  // Fetch recommended businesses from Supabase
  const fetchRecommendedBusinesses = async (userId) => {
    try {
      // Get business IDs from user_recommendations
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
      
      console.log('✅ Fetched recommended business profiles:', businessData?.length || 0, 'businesses');
      setRecommendedBusinesses(businessData || []);
      setFilteredBusinesses(businessData || []);

      // Fetch engagement metrics for all businesses
      if (businessData && businessData.length > 0) {
        const businessIds = businessData.map(b => b.business_id);
        await fetchEngagementMetrics(businessIds);
      }
    } catch (err) {
      console.error('Error fetching recommended businesses:', err);
      setError('Failed to load recommended businesses');
    }
  };

  // Fetch engagement metrics for businesses
  const fetchEngagementMetrics = async (businessIds) => {
    if (!businessIds || businessIds.length === 0 || !currentUserId) return;

    try {
      // Fetch all likes
      const { data: likesData, error: likesError } = await supabase
        .from('business_profile_likes')
        .select('business_id, user_id')
        .in('business_id', businessIds);

      if (likesError) {
        console.error('Error fetching likes:', likesError);
      }

      // Fetch comments count
      const { data: commentsData, error: commentsError } = await supabase
        .from('business_profile_comments')
        .select('business_id')
        .in('business_id', businessIds);

      if (commentsError) {
        console.error('Error fetching comments:', commentsError);
      }

      // Fetch pictures count
      const { data: picturesData, error: picturesError } = await supabase
        .from('business_profile_pictures')
        .select('business_id')
        .eq('is_active', true)
        .in('business_id', businessIds);

      if (picturesError) {
        console.error('Error fetching pictures:', picturesError);
      }

      // Count likes, comments, pictures per business and check if user liked
      const metrics = {};
      businessIds.forEach(id => {
        const businessLikes = likesData?.filter(like => like.business_id === id) || [];
        metrics[id] = {
          likeCount: businessLikes.length,
          commentCount: commentsData?.filter(comment => comment.business_id === id).length || 0,
          pictureCount: picturesData?.filter(pic => pic.business_id === id).length || 0,
          userHasLiked: businessLikes.some(like => like.user_id === currentUserId),
        };
      });

      setEngagementMetrics(metrics);
    } catch (error) {
      console.error('Error fetching engagement metrics:', error);
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

  // Toggle recommendation
  const toggleRecommendation = async (businessId) => {
    if (!currentUserId) {
      Alert.alert("Error", "You must be logged in to manage recommendations.");
      return;
    }

    const isRecommended = recommendedBusinesses.some(business => business.business_id === businessId);
    const business = recommendedBusinesses.find(b => b.business_id === businessId);
    const businessName = business?.business_name || 'this business';
    
    if (isRecommended) {
      // Show confirmation dialog when removing recommendation
      Alert.alert(
        "Remove Recommendation",
        `Are you sure you want to remove "${businessName}" from your recommendations?`,
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                const { error } = await supabase
                  .from('user_recommendations')
                  .delete()
                  .match({ user_id: currentUserId, business_id: businessId });
                if (error) throw error;
                
                // Update local state
                const updatedBusinesses = recommendedBusinesses.filter(business => business.business_id !== businessId);
                setRecommendedBusinesses(updatedBusinesses);
                setFilteredBusinesses(updatedBusinesses.filter(business => 
                  business.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  business.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (business.city && business.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  (business.state && business.state.toLowerCase().includes(searchQuery.toLowerCase()))
                ));
                
                // Show success message
                Alert.alert("Success", `"${businessName}" has been removed from your recommendations.`);
              } catch (error) {
                console.error('Error removing recommendation:', error);
                Alert.alert("Error", "Could not remove recommendation. Please try again.");
              }
            }
          }
        ]
      );
    } else {
      // This case shouldn't happen on this screen since all businesses are recommended,
      // but keeping it for completeness
      try {
        const { error } = await supabase
          .from('user_recommendations')
          .insert([{ user_id: currentUserId, business_id: businessId }]);
        if (error) throw error;
        // Note: We don't add to local state here since this screen only shows existing recommendations
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

  // Handle like button press
  const handleLikePress = async (businessId) => {
    if (!currentUserId) {
      Alert.alert('Error', 'You must be logged in to like a business');
      return;
    }

    const metrics = engagementMetrics[businessId] || {};
    const userHasLiked = metrics.userHasLiked;

    try {
      if (userHasLiked) {
        // Unlike
        const { error } = await supabase
          .from('business_profile_likes')
          .delete()
          .eq('business_id', businessId)
          .eq('user_id', currentUserId);

        if (error) throw error;

        // Update local state optimistically
        setEngagementMetrics(prev => ({
          ...prev,
          [businessId]: {
            ...prev[businessId],
            likeCount: Math.max(0, (prev[businessId]?.likeCount || 1) - 1),
            userHasLiked: false,
          }
        }));
      } else {
        // Like
        const { error } = await supabase
          .from('business_profile_likes')
          .insert([
            {
              business_id: businessId,
              user_id: currentUserId,
            }
          ]);

        if (error) throw error;

        // Update local state optimistically
        setEngagementMetrics(prev => ({
          ...prev,
          [businessId]: {
            ...prev[businessId],
            likeCount: (prev[businessId]?.likeCount || 0) + 1,
            userHasLiked: true,
          }
        }));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to update like. Please try again.');
    }
  };

  // Handle social slider open
  const handleSocialPress = (businessId, section = 'comments') => {
    setSocialBusinessId(businessId);
    setSocialSliderVisible(true);
  };

  // Handle social slider close
  const handleSocialSliderClose = () => {
    setSocialSliderVisible(false);
    setSocialBusinessId(null);
    // Refresh engagement metrics when social slider closes
    if (recommendedBusinesses.length > 0) {
      const businessIds = recommendedBusinesses.map(b => b.business_id);
      fetchEngagementMetrics(businessIds);
    }
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

  // Toggle chat slider
  const toggleChatSlider = () => {
    const toValue = chatSliderVisible ? CHAT_SLIDER_WIDTH : 0;
    
    Animated.spring(chatSlideAnim, {
      toValue,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
    
    setChatSliderVisible(!chatSliderVisible);
  };

  // Send chat message
  const handleSendMessage = () => {
    if (!currentMessage.trim()) return;
    
    const newUserMessage = {
      id: Date.now().toString(),
      text: currentMessage.trim(),
      isUser: true
    };
    
    setChatMessages(prevMessages => [...prevMessages, newUserMessage]);
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: (Date.now() + 1).toString(),
        text: `I found some businesses related to "${currentMessage.trim()}". Would you like to add any of these to your recommendations?`,
        isUser: false
      };
      setChatMessages(prevMessages => [...prevMessages, aiResponse]);
    }, 1000);
    
    setCurrentMessage('');
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <MobileHeader navigation={navigation} title="Recommended" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryBlue} />
          <Text style={styles.loadingText}>Loading your recommendations...</Text>
        </View>
        <MobileBottomNavigation navigation={navigation} activeRoute="Recommended" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <MobileHeader
        navigation={navigation}
        title="Who I Recommend"
      />

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
              placeholder="Search your recommendations..."
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
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : filteredBusinesses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="heart-outline" size={64} color={colors.textLight} />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No matching recommendations found' : 'No recommendations yet'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery 
                  ? 'Try adjusting your search terms' 
                  : 'Find businesses you love and add them to your recommendations'
                }
              </Text>
              {!searchQuery && (
                <TouchableOpacity style={styles.findBusinessButton} onPress={toggleChatSlider}>
                  <Ionicons name="search-outline" size={20} color={colors.cardWhite} />
                  <Text style={styles.findBusinessButtonText}>Find Businesses</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              <Text style={styles.resultsCount}>
                Found {filteredBusinesses.length} recommendation{filteredBusinesses.length !== 1 ? 's' : ''}
                {searchQuery && ` for "${searchQuery}"`}
              </Text>
              
              {filteredBusinesses.map((business) => (
                <BusinessCard
                  key={business.business_id}
                  business={business}
                  onPress={handleBusinessPress}
                  onBusinessLogoPress={handleBusinessLogoPress}
                  onAddToProject={handleAddToProjectClick}
                  isRecommended={true} // All businesses in this screen are recommended
                  onToggleRecommendation={toggleRecommendation}
                  connectionPath={connectionPaths[business.business_id]}
                  loadingConnection={loadingPaths[business.business_id]}
                  currentUserFullName={currentUserFullName}
                  likeCount={engagementMetrics[business.business_id]?.likeCount || 0}
                  commentCount={engagementMetrics[business.business_id]?.commentCount || 0}
                  pictureCount={engagementMetrics[business.business_id]?.pictureCount || 0}
                  userHasLiked={engagementMetrics[business.business_id]?.userHasLiked || false}
                  onLikePress={handleLikePress}
                  onSocialPress={handleSocialPress}
                />
              ))}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Chat Slider */}
      <Animated.View 
        style={[
          styles.chatSlider,
          { transform: [{ translateX: chatSlideAnim }] }
        ]}
      >
        <LinearGradient
          colors={[colors.primaryBlue, colors.darkBlue]}
          style={styles.chatHeader}
        >
          <View style={styles.chatHeaderContent}>
            <Text style={styles.chatTitle}>Find Businesses</Text>
            <TouchableOpacity onPress={toggleChatSlider}>
              <Ionicons name="close" size={24} color={colors.cardWhite} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        
        <ScrollView
          style={styles.chatMessages}
          contentContainerStyle={styles.chatMessagesContent}
          showsVerticalScrollIndicator={false}
        >
          {chatMessages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
        </ScrollView>
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.chatInputContainer}>
            <TextInput
              style={styles.chatTextInput}
              placeholder="Ask about businesses..."
              placeholderTextColor={colors.textLight}
              value={currentMessage}
              onChangeText={setCurrentMessage}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                !currentMessage.trim() && styles.sendButtonDisabled
              ]}
              onPress={handleSendMessage}
              disabled={!currentMessage.trim()}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={!currentMessage.trim() ? colors.textLight : colors.cardWhite} 
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>

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
            viewSource="who_i_recommend"
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

      {/* Social Slider */}
      <SocialSlider
        isVisible={socialSliderVisible}
        onClose={handleSocialSliderClose}
        businessId={socialBusinessId}
        currentUserId={currentUserId}
      />

      {/* Bottom Navigation */}
      <MobileBottomNavigation navigation={navigation} activeRoute="Recommended" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  content: {
    flex: 1,
    marginBottom: 70, // Space for bottom navigation
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
  engagementActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  engagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    padding: 4,
  },
  engagementCount: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
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
  findBusinessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryBlue,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  findBusinessButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.cardWhite,
    marginLeft: 8,
  },
  // Chat Slider Styles
  chatSlider: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: CHAT_SLIDER_WIDTH,
    height: '100%',
    backgroundColor: colors.cardWhite,
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
  },
  chatHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : 25,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  chatHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.cardWhite,
  },
  chatMessages: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  chatMessagesContent: {
    padding: 16,
    paddingBottom: 32,
  },
  messageContainer: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '85%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  userMessageBubble: {
    backgroundColor: colors.primaryBlue,
    borderBottomRightRadius: 4,
  },
  aiMessageBubble: {
    backgroundColor: colors.cardWhite,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: colors.textDark,
    lineHeight: 22,
  },
  userMessageText: {
    color: colors.cardWhite,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: colors.cardWhite,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 12,
    maxHeight: 120,
    fontSize: 15,
    color: colors.textDark,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 22,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  sendButtonDisabled: {
    backgroundColor: colors.textLight,
  },
  // Business slider for full width
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

export default RecommendedBusinessesScreen;
