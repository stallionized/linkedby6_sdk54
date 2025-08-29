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
const BUSINESS_SLIDER_WIDTH = screenWidth; // CHANGED: 100% of screen width instead of 90%
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
        console
