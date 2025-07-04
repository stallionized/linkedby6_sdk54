import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Image,
  PanResponder,
  Keyboard
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from './supabaseClient';

// Import your existing components (make sure these are converted to mobile)
import MobileBottomNavigation from './MobileBottomNavigation';
import BusinessProfileSlider from './BusinessProfileSlider';
import AddToProjectSlider from './AddToProjectSlider';
import MobileHeader from './MobileHeader';
import ConnectionGraphDisplay from './ConnectionGraphDisplay';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Mobile-optimized constants
const CHAT_SLIDER_WIDTH = screenWidth; // 100% of screen width
const BUSINESS_SLIDER_WIDTH = screenWidth * 0.9; // 90% of screen width
const BOTTOM_TAB_HEIGHT = 70;

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

// Business Logo Component
const BusinessLogo = ({ business }) => {
  const [bgColor] = useState(getColorFromName(business.business_name || 'Business'));
  
  return (
    <View style={[styles.businessLogo, { backgroundColor: bgColor }]}>
      {business.image_url ? (
        <Image source={{ uri: business.image_url }} style={styles.businessLogoImage} />
      ) : (
        <Text style={styles.businessLogoText}>
          {business.business_name ? business.business_name.charAt(0).toUpperCase() : 'B'}
        </Text>
      )}
    </View>
  );
};

// Business Card Component
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
          <View style={styles.businessLocation}>
            <Ionicons name="location-outline" size={14} color={colors.textMedium} />
            <Text style={styles.businessLocationText} numberOfLines={1}>
              {business.city && business.state ? `${business.city}, ${business.state}` : 
               business.zip_code || 'Location not specified'}
            </Text>
          </View>
          
          {/* Coverage Info */}
          {business.coverage_type && (
            <View style={styles.coverageInfo}>
              <Ionicons name="business-outline" size={12} color={colors.textMedium} />
              <Text style={styles.coverageText}>
                {business.coverage_type.charAt(0).toUpperCase() + business.coverage_type.slice(1)}
                {business.coverage_type === 'local' && business.coverage_radius && 
                  ` (${business.coverage_radius}mi)`}
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

// Chat Message Component
const ChatMessage = ({ message }) => {
  const isUser = message.type === 'user';
  const isError = message.type === 'error';
  const isSystem = message.type === 'system';
  
  return (
    <View style={[
      styles.messageContainer,
      isUser && styles.userMessageContainer,
      isSystem && styles.systemMessageContainer
    ]}>
      <View style={[
        styles.messageBubble,
        isUser && styles.userMessageBubble,
        isError && styles.errorMessageBubble,
        isSystem && styles.systemMessageBubble
      ]}>
        <Text style={[
          styles.messageText,
          isUser && styles.userMessageText,
          isError && styles.errorMessageText,
          isSystem && styles.systemMessageText
        ]}>
          {message.text}
        </Text>
        
        {/* ADDED: Show business count if AI message has business IDs */}
        {message.type === 'ai' && message.businessIds && message.businessIds.length > 0 && (
          <View style={styles.businessCountBadge}>
            <Ionicons name="business-outline" size={12} color={colors.primaryBlue} />
            <Text style={styles.businessCountText}>
              {message.businessIds.length} business{message.businessIds.length !== 1 ? 'es' : ''} found
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const SearchScreen = ({ navigation, route }) => {
  // Get safe area insets for proper positioning
  const insets = useSafeAreaInsets();
  
  // State management
  const [persistedForUserId, setPersistedForUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [ms2WebhookUrl, setMs2WebhookUrl] = useState('');
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [businessProfiles, setBusinessProfiles] = useState([]);
  const [recommendedBusinessIds, setRecommendedBusinessIds] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserPhoneNumber, setCurrentUserPhoneNumber] = useState(null);
  const [currentUserFullName, setCurrentUserFullName] = useState('You');
  const [neo4jConfig, setNeo4jConfig] = useState(null);
  const [connectionPaths, setConnectionPaths] = useState({});
  const [loadingPaths, setLoadingPaths] = useState({});
  const [hasInitialized, setHasInitialized] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  // ADDED: Loading state for business profiles
  const [loadingBusinessProfiles, setLoadingBusinessProfiles] = useState(false);

  // Slider states
  const [chatSliderVisible, setChatSliderVisible] = useState(false);
  const [businessSliderVisible, setBusinessSliderVisible] = useState(false);
  const [addToProjectSliderVisible, setAddToProjectSliderVisible] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);

  // Animation refs
  const chatSlideAnim = useRef(new Animated.Value(-CHAT_SLIDER_WIDTH)).current;
  const businessSlideAnim = useRef(new Animated.Value(BUSINESS_SLIDER_WIDTH)).current;

  // Refs
  const scrollViewRef = useRef(null);
  const chatScrollViewRef = useRef(null);
  const textInputRef = useRef(null);

  // Clear all state when user changes
  const clearAllState = () => {
    console.log('Clearing all search state for new user');
    setMessages([]);
    setInputText('');
    setBusinessProfiles([]);
    setRecommendedBusinessIds([]);
    setConnectionPaths({});
    setSessionId('');
    setMs2WebhookUrl('');
    setIsTyping(false);
    setError(null);
    setLoadingPaths({});
    setLoadingBusinessProfiles(false);
    setBusinessSliderVisible(false);
    setAddToProjectSliderVisible(false);
    setSelectedBusinessId(null);
  };

  // Monitor auth state changes to detect user changes
  useEffect(() => {
    let authListener;
    
    const setupAuthListener = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const initialUserId = session?.user?.id || null;
      
      if (initialUserId && persistedForUserId && initialUserId !== persistedForUserId) {
        console.log('Different user detected on mount, clearing state');
        clearAllState();
        setPersistedForUserId(initialUserId);
      } else if (initialUserId) {
        setPersistedForUserId(initialUserId);
      }
      
      const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);
        const newUserId = session?.user?.id || null;
        
        if (event === 'SIGNED_OUT') {
          console.log('User signed out, clearing state');
          clearAllState();
          setPersistedForUserId(null);
          setCurrentUserId(null);
        } else if (event === 'SIGNED_IN' && newUserId && newUserId !== persistedForUserId) {
          console.log(`New user signed in (${newUserId}), clearing state from previous user (${persistedForUserId})`);
          clearAllState();
          setPersistedForUserId(newUserId);
          setCurrentUserId(newUserId);
          setHasInitialized(false);
        }
      });
      
      authListener = listener;
    };
    
    setupAuthListener();
    
    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [persistedForUserId]);

  // Load user session and data
  useEffect(() => {
    const loadUserSessionAndData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          setCurrentUserId(session.user.id);
          fetchUserRecommendations(session.user.id);
          
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
        }
      } catch (error) {
        console.error('💥 Error loading user session or profile data:', error);
      }
    };
    loadUserSessionAndData();
  }, []);

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

  // Handle initial query from route params
  useEffect(() => {
    if (ms2WebhookUrl && route?.params?.initialQuery) {
      const query = route.params.initialQuery;
      setInputText(query);
      setTimeout(() => { 
        if (query && query.trim()) handleSendMessage(query); 
      }, 500);
    }
  }, [route?.params?.initialQuery, ms2WebhookUrl]);

  // Initialize screen state when user is loaded
  useEffect(() => {
    if (!currentUserId || hasInitialized) return;
    
    console.log('Initializing search screen for user:', currentUserId);
    
    setIsLoadingSettings(true);
    setError(null);
    
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    setSessionId(newSessionId);
    console.log('Generated new session ID:', newSessionId);
    
    setMessages([{ 
      _id: `welcome_${Date.now()}`, 
      text: "Welcome! Ask me anything about businesses or services you're looking for.", 
      createdAt: new Date(), 
      type: 'system' 
    }]);
    
    const fetchMS2WebhookUrl = async () => {
      try {
        const { data, error } = await supabase
          .from('global_settings')
          .select('value')
          .eq('key', 'ms2_webhook_url')
          .single();
          
        if (error) {
          console.error('Error fetching MS2 Webhook URL:', error);
          setError('Error fetching webhook configuration.');
          setIsLoadingSettings(false);
          return;
        }
        
        if (data && data.value) {
          setMs2WebhookUrl(data.value);
          setError(null);
          console.log('✅ MS2 Webhook URL loaded successfully');
        } else {
          console.warn('MS2 Webhook URL not found in settings.');
          setError('Webhook URL not configured.');
        }
      } catch (err) {
        console.error('Error fetching MS2 Webhook URL:', err.message);
        setError('Failed to load webhook configuration.');
      } finally {
        setIsLoadingSettings(false);
      }
    };
    
    fetchMS2WebhookUrl();
    setHasInitialized(true);
    
  }, [currentUserId, hasInitialized]);

  // UPDATED: Send message handler with better business ID extraction
  const handleSendMessage = async (text) => {
    const messageText = text || inputText;
    if (!messageText.trim() || isTyping) return;
    
    const userMessage = { 
      _id: Date.now().toString(), 
      text: messageText.trim(), 
      createdAt: new Date(), 
      type: 'user' 
    };
    
    if (!ms2WebhookUrl) {
      console.warn('Cannot send message: MS2 Webhook URL is not configured.');
      const errorMessage = { 
        _id: Date.now().toString(), 
        text: "Error: Chat feature requires configuration. Please contact support.", 
        createdAt: new Date(), 
        type: 'error' 
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    setError(null);
    
    try {
      console.log('🚀 Sending message to webhook:', messageText.trim());
      
      const response = await fetch(ms2WebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          session_id: sessionId, 
          chatInput: userMessage.text, 
          query: userMessage.text 
        }),
      });
      
      if (!response.ok) throw new Error(`Webhook failed with status: ${response.status}`);
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Expected JSON response but got ${contentType || 'no content'}`);
      }
      
      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response from webhook');
      }
      
      let aiResponseData;
      try { 
        aiResponseData = JSON.parse(responseText); 
      } catch (parseError) { 
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}`); 
      }
      
      console.log('📥 Raw AI response data:', JSON.stringify(aiResponseData, null, 2));
      
      let aiResponseText = '';
      let businessIds = [];
      let hasBusinessIds = false;
      
      // ENHANCED: Better business ID extraction logic (same as web version)
      if (Array.isArray(aiResponseData) && aiResponseData.length > 0 && aiResponseData[0].output) {
        const outputText = aiResponseData[0].output;
        aiResponseText = outputText;
        
        // Look for JSON code block first
        const jsonBlockMatch = outputText.match(/```json\s*\n([\s\S]*?)\n\s*```/);
        if (jsonBlockMatch && jsonBlockMatch[1]) {
          try {
            const jsonData = JSON.parse(jsonBlockMatch[1]);
            console.log('📊 Parsed JSON from code block:', jsonData);
            if (jsonData.business_ids) { 
              businessIds = jsonData.business_ids; 
              hasBusinessIds = true; 
            } else if (jsonData.business_id) { 
              businessIds = [jsonData.business_id]; 
              hasBusinessIds = true; 
            }
            if (hasBusinessIds) {
              aiResponseText = outputText.replace(/```json\s*\n[\s\S]*?\n\s*```/g, '').trim() || 
                "I found some businesses that might interest you. Check out the results below.";
            }
          } catch (e) { 
            console.error('Error parsing JSON from code block:', e); 
          }
        } else {
          // Fallback: Look for business_ids in the text
          const businessIdsMatch = outputText.match(/"business_ids":\s*(\[[^\]]+\])/);
          if (businessIdsMatch && businessIdsMatch[1]) {
            try {
              businessIds = JSON.parse(businessIdsMatch[1]);
              hasBusinessIds = true;
              console.log('📊 Found business_ids in text:', businessIds);
            } catch (e) {
              console.error('Error parsing business_ids from output text:', e);
            }
          } else {
            // Look for single business_id
            const businessIdMatch = outputText.match(/"business_id":\s*"([^"]+)"/);
            if (businessIdMatch && businessIdMatch[1]) {
              businessIds = [businessIdMatch[1]];
              hasBusinessIds = true;
              console.log('📊 Found single business_id in text:', businessIds);
            }
          }
        }
      } else if (aiResponseData && aiResponseData.answer) {
        aiResponseText = aiResponseData.answer;
        if (aiResponseData.business_ids) { 
          businessIds = aiResponseData.business_ids; 
          hasBusinessIds = true; 
        } else if (aiResponseData.business_id) { 
          businessIds = [aiResponseData.business_id]; 
          hasBusinessIds = true; 
        }
      } else if (Array.isArray(aiResponseData) && aiResponseData.length > 0 && (aiResponseData[0].business_ids || aiResponseData[0].business_id)) {
        if (aiResponseData[0].business_ids) {
          businessIds = aiResponseData[0].business_ids;
          hasBusinessIds = true;
        } else if (aiResponseData[0].business_id) {
          businessIds = [aiResponseData[0].business_id];
          hasBusinessIds = true;
        }
        aiResponseText = aiResponseData[0].output || aiResponseData[0].answer || "I found some businesses that might interest you. Check out the results below.";
      }
      
      if (hasBusinessIds && !aiResponseText) {
        aiResponseText = "I found some businesses that might interest you. Check out the results below.";
      }
      
      console.log('🎯 Final extracted data:', {
        aiResponseText,
        businessIds,
        hasBusinessIds,
        businessCount: businessIds.length
      });
      
      const aiMessage = { 
        _id: (Date.now() + 1).toString(), 
        text: aiResponseText, 
        createdAt: new Date(), 
        type: 'ai', 
        businessIds: businessIds.length > 0 ? businessIds : undefined 
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // FIXED: Fetch business profiles when business IDs are found
      if (businessIds.length > 0) {
        console.log('🔍 Fetching business profiles for IDs:', businessIds);
        await fetchBusinessProfiles(businessIds);
      }
      
    } catch (err) {
      console.error('Error calling MS2 Webhook:', err.message);
      let errorMsg = `Failed to get response: ${err.message}`;
      
      if (err.message.includes('JSON')) {
        errorMsg = 'The service returned an invalid response format.';
      } else if (err.message.includes('Failed to fetch') || err.message.includes('Network Error')) {
        errorMsg = 'Could not connect to the search service.';
      } else if (err.message.includes('status: 4')) {
        errorMsg = 'Request error. Please try again.';
      } else if (err.message.includes('status: 5')) {
        errorMsg = 'Service temporarily unavailable.';
      }
      
      setError(errorMsg);
      const errorMessage = { 
        _id: (Date.now() + 1).toString(), 
        text: `Error: ${errorMsg}`, 
        createdAt: new Date(), 
        type: 'error' 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally { 
      setIsTyping(false); 
    }
  };

  // Fetch user recommendations
  const fetchUserRecommendations = async (userId) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('user_recommendations')
        .select('business_id')
        .eq('user_id', userId);
      if (error) throw error;
      setRecommendedBusinessIds(data.map(rec => rec.business_id));
    } catch (error) {
      console.error('Error fetching user recommendations:', error);
    }
  };

  // Toggle recommendation
  const toggleRecommendation = async (businessId) => {
    if (!currentUserId) {
      Alert.alert("Error", "You must be logged in to recommend businesses.");
      return;
    }

    const isRecommended = recommendedBusinessIds.includes(businessId);
    
    try {
      if (isRecommended) {
        const { error } = await supabase
          .from('user_recommendations')
          .delete()
          .match({ user_id: currentUserId, business_id: businessId });
        if (error) throw error;
        setRecommendedBusinessIds(prev => prev.filter(id => id !== businessId));
      } else {
        const { error } = await supabase
          .from('user_recommendations')
          .insert([{ user_id: currentUserId, business_id: businessId }]);
        if (error) throw error;
        setRecommendedBusinessIds(prev => [...prev, businessId]);
      }
    } catch (error) {
      console.error('Error toggling recommendation:', error);
      Alert.alert("Error", "Could not update recommendation.");
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

  // UPDATED: Fetch business profiles with loading state
  const fetchBusinessProfiles = async (ids) => {
    if (!ids || ids.length === 0) return;
    
    console.log('📋 Fetching business profiles for IDs:', ids);
    setLoadingBusinessProfiles(true);
    
    try {
      const { data, error } = await supabase
        .from('business_profiles')
        .select(`
          business_id, 
          business_name, 
          description, 
          industry, 
          image_url, 
          city, 
          state, 
          zip_code, 
          coverage_type, 
          coverage_details, 
          coverage_radius
        `)
        .in('business_id', ids);
        
      if (error) throw error;
      
      console.log('✅ Fetched business profiles:', data?.length || 0, 'businesses');
      setBusinessProfiles(data || []);
      
      // Fetch connection paths for each business
      if (data && data.length > 0 && currentUserId) {
        data.forEach(business => fetchConnectionPath(business.business_id));
      }
    } catch (err) { 
      console.error('Failed to fetch business profiles:', err); 
      setError('Failed to load business profiles'); 
    } finally {
      setLoadingBusinessProfiles(false);
    }
  };

  // Animation functions
  const toggleChatSlider = useCallback(() => {
    const toValue = chatSliderVisible ? -CHAT_SLIDER_WIDTH : 0;
    
    Animated.spring(chatSlideAnim, {
      toValue,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
    
    setChatSliderVisible(!chatSliderVisible);
  }, [chatSliderVisible, chatSlideAnim]);

  const openBusinessSlider = useCallback((businessId) => {
    setSelectedBusinessId(businessId);
    setBusinessSliderVisible(true);
    
    Animated.spring(businessSlideAnim, {
      toValue: 0,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  }, [businessSlideAnim]);

  const closeBusinessSlider = useCallback(() => {
    Animated.spring(businessSlideAnim, {
      toValue: BUSINESS_SLIDER_WIDTH,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start(() => {
      setBusinessSliderVisible(false);
      setSelectedBusinessId(null);
    });
  }, [businessSlideAnim]);

  const handleNewSearch = () => {
    console.log('New Search clicked - clearing current search state');
    
    setMessages([{ 
      _id: `welcome_${Date.now()}`, 
      text: "Welcome! Ask me anything about businesses or services you're looking for.", 
      createdAt: new Date(), 
      type: 'system' 
    }]);
    setInputText('');
    setBusinessProfiles([]);
    setConnectionPaths({});
    setIsTyping(false);
    setError(null);
    setLoadingPaths({});
    setLoadingBusinessProfiles(false);
    
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    setSessionId(newSessionId);
    console.log('Generated new session ID for new search:', newSessionId);
  };

  // Handle business interactions
  const handleBusinessClick = (businessId) => {
    // Instead of navigating to a non-existent screen, open the business profile slider
    setSelectedBusinessId(businessId);
    openBusinessSlider(businessId);
  };

  const handleBusinessLogoClick = (businessId) => {
    setSelectedBusinessId(businessId);
    openBusinessSlider(businessId);
  };

  const handleAddToProjectClick = (businessId) => {
    setSelectedBusinessId(businessId);
    setAddToProjectSliderVisible(true);
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatScrollViewRef.current && messages.length > 0) {
      setTimeout(() => {
        chatScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isTyping]);

  // Keyboard event listeners for chat
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        if (chatSliderVisible) {
          setKeyboardHeight(e.endCoordinates.height);
        }
      }
    );
    
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, [chatSliderVisible]);

  // Pan responder for chat slider
  const chatPanResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
    },
    onPanResponderMove: (evt, gestureState) => {
      if (chatSliderVisible && gestureState.dx < 0) {
        chatSlideAnim.setValue(Math.max(gestureState.dx, -CHAT_SLIDER_WIDTH));
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dx < -CHAT_SLIDER_WIDTH * 0.3) {
        toggleChatSlider();
      } else {
        Animated.spring(chatSlideAnim, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
      }
    },
  });

  if (isLoadingSettings && !hasInitialized) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryBlue} />
          <Text style={styles.loadingText}>Initializing search...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      
      {/* Header */}
      <MobileHeader
        navigation={navigation}
        title="AI Search"
        rightActions={[
          {
            icon: chatSliderVisible ? "chatbubbles" : "chatbubbles-outline",
            onPress: toggleChatSlider,
            badge: messages.filter(m => m.type === 'ai').length
          }
        ]}
      />

      {/* Main Content */}
      <KeyboardAvoidingView 
        style={styles.mainContent}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Business Results */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.resultsContainer}
          contentContainerStyle={styles.resultsContent}
          showsVerticalScrollIndicator={false}
        >
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          
          {/* ADDED: Loading state for business profiles */}
          {loadingBusinessProfiles && (
            <View style={styles.loadingBusinessContainer}>
              <ActivityIndicator size="large" color={colors.primaryBlue} />
              <Text style={styles.loadingBusinessText}>Loading businesses...</Text>
            </View>
          )}
          
          {businessProfiles.length > 0 ? (
            <>
              <View style={styles.resultsHeaderContainer}>
                <Text style={styles.resultsHeader}>
                  Found {businessProfiles.length} business{businessProfiles.length !== 1 ? 'es' : ''}
                </Text>
                <TouchableOpacity style={styles.newSearchButton} onPress={handleNewSearch}>
                  <Ionicons name="refresh-outline" size={16} color={colors.primaryBlue} />
                  <Text style={styles.newSearchButtonText}>New Search</Text>
                </TouchableOpacity>
              </View>
              
              {businessProfiles.map((business) => (
                <BusinessCard
                  key={business.business_id}
                  business={business}
                  onPress={handleBusinessClick}
                  onBusinessLogoPress={handleBusinessLogoClick}
                  onAddToProject={handleAddToProjectClick}
                  isRecommended={recommendedBusinessIds.includes(business.business_id)}
                  onToggleRecommendation={toggleRecommendation}
                  connectionPath={connectionPaths[business.business_id]}
                  loadingConnection={loadingPaths[business.business_id]}
                  currentUserFullName={currentUserFullName}
                />
              ))}
            </>
          ) : !loadingBusinessProfiles ? (
            <View style={styles.emptyResults}>
              <Ionicons name="search-outline" size={64} color={colors.textLight} />
              <Text style={styles.emptyResultsText}>Start your search</Text>
              <Text style={styles.emptyResultsSubtext}>
                Use the AI chat to find businesses and services that match your needs
              </Text>
              <TouchableOpacity style={styles.startChatButton} onPress={toggleChatSlider}>
                <Ionicons name="chatbubbles-outline" size={20} color={colors.cardWhite} />
                <Text style={styles.startChatButtonText}>Open AI Chat</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Chat Slider */}
      <Animated.View 
        style={[
          styles.chatSlider,
          { 
            transform: [{ translateX: chatSlideAnim }],
            top: insets.top,
            height: screenHeight - insets.top - insets.bottom,
          }
        ]}
        {...chatPanResponder.panHandlers}
      >
        <LinearGradient
          colors={[colors.primaryBlue, colors.darkBlue]}
          style={styles.chatHeader}
        >
          <View style={styles.chatHeaderContent}>
            <Text style={styles.chatHeaderTitle}>AI Search Chat</Text>
            <View style={styles.chatHeaderActions}>
              <TouchableOpacity style={styles.newSearchChatButton} onPress={handleNewSearch}>
                <Ionicons name="refresh-outline" size={16} color={colors.cardWhite} />
                <Text style={styles.newSearchChatButtonText}>New Search</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.chatHeaderClose} 
                onPress={toggleChatSlider}
              >
                <Ionicons name="close" size={24} color={colors.cardWhite} />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
        
        <ScrollView
          ref={chatScrollViewRef}
          style={[
            styles.chatMessages,
            { marginBottom: keyboardHeight > 0 ? keyboardHeight + 80 : 80 }
          ]}
          contentContainerStyle={styles.chatMessagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <ChatMessage key={message._id} message={message} />
          ))}
          
          {isTyping && (
            <View style={styles.typingContainer}>
              <ActivityIndicator size="small" color={colors.primaryBlue} />
              <Text style={styles.typingText}>AI is thinking...</Text>
            </View>
          )}
        </ScrollView>
        
        {/* Chat input container */}
        <View 
          style={[
            styles.chatInputWrapper,
            {
              position: 'absolute',
              bottom: keyboardHeight,
              left: 0,
              right: 0,
            }
          ]}
        >
          <View style={styles.chatInputContainer}>
            <TextInput
              ref={textInputRef}
              style={styles.chatTextInput}
              placeholder="Ask about businesses or services..."
              placeholderTextColor={colors.textLight}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => handleSendMessage()}
              returnKeyType="send"
              multiline
              maxLength={500}
              editable={!isTyping}
            />
            <TouchableOpacity
              style={[
                styles.sendButton, 
                (!inputText.trim() || isTyping) && styles.sendButtonDisabled
              ]}
              onPress={() => handleSendMessage()}
              disabled={!inputText.trim() || isTyping}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={(!inputText.trim() || isTyping) ? colors.textLight : colors.cardWhite} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* Business Profile Slider */}
      {businessSliderVisible && (
        <Animated.View style={[
          styles.businessSlider,
          { 
            transform: [{ translateX: businessSlideAnim }],
            top: insets.top,
            bottom: insets.bottom,
            height: screenHeight - insets.top - insets.bottom,
          }
        ]}>
          <BusinessProfileSlider
            isVisible={businessSliderVisible}
            onClose={closeBusinessSlider}
            businessId={selectedBusinessId}
            userId={currentUserId}
            viewSource="search_card"
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

      {/* Bottom Navigation */}
      <MobileBottomNavigation navigation={navigation} activeRoute="Search" />
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
  mainContent: {
    flex: 1,
    marginBottom: BOTTOM_TAB_HEIGHT,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsContent: {
    padding: 16,
    paddingBottom: 32,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  // ADDED: Loading business profiles styles
  loadingBusinessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingBusinessText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textMedium,
    fontWeight: '500',
  },
  resultsHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textDark,
  },
  newSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardWhite,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primaryBlue,
  },
  newSearchButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryBlue,
    marginLeft: 4,
  },
  emptyResults: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyResultsText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textMedium,
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyResultsSubtext: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  startChatButton: {
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
  startChatButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.cardWhite,
    marginLeft: 8,
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
  },
  businessLogoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.cardWhite,
  },
  businessCardInfo: {
    flex: 1,
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
  // Chat Slider Styles
  chatSlider: {
    position: 'absolute',
    left: 0,
    width: CHAT_SLIDER_WIDTH,
    backgroundColor: colors.cardWhite,
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
  },
  chatHeader: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  chatHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.cardWhite,
    flex: 1,
  },
  chatHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatHeaderClose: {
    padding: 4,
    marginLeft: 8,
  },
  newSearchChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  newSearchChatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.cardWhite,
    marginLeft: 6,
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
  systemMessageContainer: {
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: '85%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.cardWhite,
  },
  userMessageBubble: {
    backgroundColor: colors.primaryBlue,
    borderBottomRightRadius: 4,
  },
  errorMessageBubble: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    borderRadius: 12,
  },
  systemMessageBubble: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: colors.primaryBlue,
    borderRadius: 12,
  },
  messageText: {
    fontSize: 15,
    color: colors.textDark,
    lineHeight: 22,
  },
  userMessageText: {
    color: colors.cardWhite,
  },
  errorMessageText: {
    color: colors.error,
  },
  systemMessageText: {
    color: colors.primaryBlue,
    textAlign: 'center',
    fontWeight: '500',
  },
  // ADDED: Business count badge styles
  businessCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: colors.backgroundGray,
    borderRadius: 12,
  },
  businessCountText: {
    fontSize: 12,
    color: colors.primaryBlue,
    fontWeight: '600',
    marginLeft: 4,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.cardWhite,
    borderRadius: 18,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  typingText: {
    fontSize: 14,
    color: colors.textMedium,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  // Chat input wrapper for fixed positioning above keyboard
  chatInputWrapper: {
    backgroundColor: colors.cardWhite,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: colors.cardWhite,
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

export default SearchScreen;
