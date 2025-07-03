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
  FlatList,
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
import MobileHeader from './MobileHeader';
import MobileBottomNavigation from './MobileBottomNavigation';
import BusinessProfileSlider from './BusinessProfileSlider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Mobile-optimized constants
const CHAT_SLIDER_WIDTH = screenWidth * 0.85;
const BUSINESS_CARD_WIDTH = (screenWidth - 48) / 2; // 2 columns with padding

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
  const colorPalette = [
    '#FF5733', '#33A8FF', '#FF33A8', '#A833FF', '#33FF57',
    '#FFD433', '#FF8333', '#3357FF', '#33FFEC', '#8CFF33'
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colorPalette.length;
  return colorPalette[index];
};

// Mobile Business Logo Component
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
const BusinessCard = ({ business, onPress, onRemove, onLogoPress }) => {
  return (
    <TouchableOpacity style={styles.businessCard} onPress={() => onPress(business)}>
      {/* Remove button */}
      <TouchableOpacity 
        style={styles.removeButton}
        onPress={(e) => {
          e.stopPropagation();
          onRemove(business.id);
        }}
      >
        <Ionicons name="close" size={16} color={colors.cardWhite} />
      </TouchableOpacity>

      {/* Logo - clickable */}
      <TouchableOpacity onPress={() => onLogoPress(business.id)}>
        <BusinessLogo business={{
          business_id: business.id,
          business_name: business.name,
          image_url: business.logo
        }} />
      </TouchableOpacity>

      <Text style={styles.businessName} numberOfLines={2}>{business.name}</Text>
      <Text style={styles.businessIndustry} numberOfLines={1}>{business.industry}</Text>
      
      <View style={styles.ratingContainer}>
        <Ionicons name="star" size={14} color="#FFD700" />
        <Text style={styles.ratingText}>{business.rating}</Text>
      </View>
      
      <Text style={styles.businessLocation} numberOfLines={1}>{business.location}</Text>
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
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  
  // Animation ref for chat slider
  const chatSlideAnim = useRef(new Animated.Value(CHAT_SLIDER_WIDTH)).current;

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

  // Filter businesses when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredBusinesses(recommendedBusinesses);
    } else {
      const filtered = recommendedBusinesses.filter(
        business => 
          business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          business.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
          business.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredBusinesses(filtered);
    }
  }, [searchQuery, recommendedBusinesses]);

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
        .select('business_id, business_name, description, industry, image_url, city, state, zip_code, coverage_type, coverage_details, coverage_radius')
        .in('business_id', businessIds);
        
      if (businessError) throw businessError;
      
      // Format business data
      const formattedBusinesses = businessData.map(business => ({
        id: business.business_id,
        name: business.business_name,
        logo: business.image_url,
        industry: business.industry || 'Not specified',
        description: business.description || 'No description available',
        rating: (Math.random() * (5 - 3.5) + 3.5).toFixed(1),
        location: business.city && business.state ? `${business.city}, ${business.state}` : 
                 business.city ? business.city : 
                 business.state ? business.state : 
                 business.zip_code ? `ZIP: ${business.zip_code}` : 'Location not specified',
        coverage_type: business.coverage_type,
        coverage_radius: business.coverage_radius,
        coverage_details: business.coverage_details
      }));
      
      setRecommendedBusinesses(formattedBusinesses);
      setFilteredBusinesses(formattedBusinesses);
    } catch (err) {
      console.error('Error fetching recommended businesses:', err);
      setError('Failed to load recommended businesses');
    }
  };

  // Remove recommendation
  const removeRecommendation = async (businessId) => {
    if (!currentUserId) return;
    
    Alert.alert(
      'Remove Recommendation',
      'Are you sure you want to remove this business from your recommendations?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('user_recommendations')
                .delete()
                .eq('user_id', currentUserId)
                .eq('business_id', businessId);
                
              if (error) throw error;
              
              // Update local state
              const updatedBusinesses = recommendedBusinesses.filter(business => business.id !== businessId);
              setRecommendedBusinesses(updatedBusinesses);
              setFilteredBusinesses(updatedBusinesses.filter(business => 
                business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                business.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
                business.location.toLowerCase().includes(searchQuery.toLowerCase())
              ));
              
            } catch (err) {
              console.error('Error removing recommendation:', err);
              Alert.alert('Error', 'Failed to remove recommendation');
            }
          }
        }
      ]
    );
  };

  // Handle business card press
  const handleBusinessPress = (business) => {
    navigation.navigate('BusinessProfilePage', { businessId: business.id });
  };

  // Handle business logo press
  const handleBusinessLogoPress = (businessId) => {
    setSelectedBusinessId(businessId);
    setBusinessSliderVisible(true);
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

  // Render business card for FlatList
  const renderBusinessCard = ({ item }) => (
    <BusinessCard
      business={item}
      onPress={handleBusinessPress}
      onRemove={removeRecommendation}
      onLogoPress={handleBusinessLogoPress}
    />
  );

  // Render chat message for FlatList
  const renderChatMessage = ({ item }) => (
    <ChatMessage message={item} />
  );

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
        rightActions={[
          {
            icon: "add-business",
            iconType: "MaterialIcons",
            onPress: toggleChatSlider
          }
        ]}
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
        <View style={styles.mainContent}>
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
                {filteredBusinesses.length} recommendation{filteredBusinesses.length !== 1 ? 's' : ''}
                {searchQuery && ` for "${searchQuery}"`}
              </Text>
              <FlatList
                data={filteredBusinesses}
                renderItem={renderBusinessCard}
                keyExtractor={item => item.id}
                numColumns={2}
                contentContainerStyle={styles.businessGrid}
                columnWrapperStyle={styles.businessRow}
                showsVerticalScrollIndicator={false}
              />
            </>
          )}
        </View>
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
      <BusinessProfileSlider
        isVisible={businessSliderVisible}
        onClose={() => setBusinessSliderVisible(false)}
        businessId={selectedBusinessId}
        userId={currentUserId}
        viewSource="who_i_recommend"
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
    padding: 16,
  },
  resultsCount: {
    fontSize: 14,
    color: colors.textMedium,
    marginBottom: 16,
    fontWeight: '500',
  },
  businessGrid: {
    paddingBottom: 32,
  },
  businessRow: {
    justifyContent: 'space-between',
  },
  businessCard: {
    width: BUSINESS_CARD_WIDTH,
    backgroundColor: colors.cardWhite,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.error,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  businessLogo: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    alignSelf: 'center',
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
  businessName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 4,
    textAlign: 'center',
  },
  businessIndustry: {
    fontSize: 14,
    color: colors.textMedium,
    marginBottom: 6,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    color: colors.textMedium,
    fontWeight: '500',
  },
  businessLocation: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
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
});

export default RecommendedBusinessesScreen;