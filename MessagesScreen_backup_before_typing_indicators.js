import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from './Auth';
import { supabase } from './supabaseClient';
import MobileHeader from './MobileHeader';
import MobileBottomNavigation from './MobileBottomNavigation';

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

const MessagesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBusinessMode, setIsBusinessMode] = useState(false);
  const [userBusinessProfile, setUserBusinessProfile] = useState(null);

  // Check if user has a business profile and can switch modes
  useEffect(() => {
    checkUserBusinessProfile();
  }, [user]);

  // Load conversations when user or mode changes
  useEffect(() => {
    if (user) {
      loadConversations();
      setupRealtimeSubscription();
    }
  }, [user, isBusinessMode]);

  const checkUserBusinessProfile = async () => {
    if (!user) return;

    try {
      const { data: businessProfile, error } = await supabase
        .from('business_profiles')
        .select('business_id, business_name, business_status')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (businessProfile && !error) {
        setUserBusinessProfile(businessProfile);
      }
    } catch (error) {
      console.log('No business profile found for user');
    }
  };

  const loadConversations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // First, get conversations without the problematic foreign key references
      let query = supabase
        .from('conversations')
        .select(`
          id,
          user_id,
          business_id,
          last_message_text,
          last_message_at,
          user_last_read_at,
          business_last_read_at,
          created_at,
          updated_at
        `)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      // Filter based on current mode
      if (isBusinessMode && userBusinessProfile) {
        // In business mode: show conversations where this user's business is involved
        query = query.eq('business_id', userBusinessProfile.business_id);
      } else {
        // In user mode: show conversations where this user is the user participant
        query = query.eq('user_id', user.id);
      }

      const { data: conversationsData, error } = await query;

      if (error) {
        console.error('Error loading conversations:', error);
        Alert.alert('Error', 'Failed to load conversations');
        return;
      }

      if (!conversationsData || conversationsData.length === 0) {
        setConversations([]);
        return;
      }

      // Get unique user IDs and business IDs to fetch profile data
      const userIds = [...new Set(conversationsData.map(conv => conv.user_id).filter(Boolean))];
      const businessIds = [...new Set(conversationsData.map(conv => conv.business_id).filter(Boolean))];

      // Fetch user profiles
      const { data: userProfiles } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, profile_image_url')
        .in('user_id', userIds);

      // Fetch business profiles
      const { data: businessProfiles } = await supabase
        .from('business_profiles')
        .select('business_id, business_name, image_url')
        .in('business_id', businessIds);

      // Create lookup maps for faster access
      const userProfileMap = {};
      const businessProfileMap = {};

      if (userProfiles) {
        userProfiles.forEach(profile => {
          userProfileMap[profile.user_id] = profile;
        });
      }

      if (businessProfiles) {
        businessProfiles.forEach(profile => {
          businessProfileMap[profile.business_id] = profile;
        });
      }

      // Transform data for display
      const transformedConversations = conversationsData.map(conv => {
        const userProfile = userProfileMap[conv.user_id];
        const businessProfile = businessProfileMap[conv.business_id];

        // Determine if conversation has unread messages
        const lastReadTime = isBusinessMode 
          ? conv.business_last_read_at 
          : conv.user_last_read_at;
        
        const hasUnread = conv.last_message_at && 
          (!lastReadTime || new Date(conv.last_message_at) > new Date(lastReadTime));

        return {
          id: conv.id,
          conversationId: conv.id,
          sender: isBusinessMode 
            ? (userProfile?.full_name || 'Unknown User')
            : (businessProfile?.business_name || 'Unknown Business'),
          message: conv.last_message_text || 'No messages yet',
          timestamp: conv.last_message_at ? new Date(conv.last_message_at) : new Date(conv.created_at),
          unread: hasUnread,
          avatar: isBusinessMode 
            ? userProfile?.profile_image_url 
            : businessProfile?.image_url,
          otherPartyId: isBusinessMode ? conv.user_id : conv.business_id,
          isBusinessConversation: !isBusinessMode,
        };
      });

      setConversations(transformedConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      Alert.alert('Error', 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!user) return;

    // Subscribe to conversation changes
    const conversationSubscription = supabase
      .channel('conversations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: isBusinessMode && userBusinessProfile
            ? `business_id=eq.${userBusinessProfile.business_id}`
            : `user_id=eq.${user.id}`
        },
        () => {
          loadConversations(); // Reload conversations when changes occur
        }
      )
      .subscribe();

    // Subscribe to new messages
    const messageSubscription = supabase
      .channel('messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          loadConversations(); // Reload conversations when new messages arrive
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      conversationSubscription.unsubscribe();
      messageSubscription.unsubscribe();
    };
  };

  const toggleBusinessMode = () => {
    if (userBusinessProfile) {
      setIsBusinessMode(!isBusinessMode);
    } else {
      Alert.alert(
        'Business Profile Required',
        'You need to create a business profile to access business mode.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Create Profile', onPress: () => navigation.navigate('BusinessPricing') }
        ]
      );
    }
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else {
      return 'Just now';
    }
  };

  const handleMessagePress = (conversationId) => {
    // Find the selected conversation
    const selectedConversation = conversations.find(conv => conv.id === conversationId);
    
    if (!selectedConversation) return;

    // Mark conversation as read
    markConversationAsRead(conversationId);
    
    // Navigate to conversation screen with real data
    navigation.navigate('Conversation', {
      conversationId: conversationId,
      contact: {
        id: selectedConversation.otherPartyId,
        name: selectedConversation.sender,
        lastSeen: 'last seen recently',
        isBusinessConversation: selectedConversation.isBusinessConversation,
      },
      isBusinessMode: isBusinessMode,
      userBusinessProfile: userBusinessProfile,
    });
  };

  const markConversationAsRead = async (conversationId) => {
    try {
      const updateField = isBusinessMode ? 'business_last_read_at' : 'user_last_read_at';
      
      await supabase
        .from('conversations')
        .update({ [updateField]: new Date().toISOString() })
        .eq('id', conversationId);

      // Update local state
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId ? { ...conv, unread: false } : conv
        )
      );
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  };

  const renderMessage = ({ item }) => (
    <TouchableOpacity
      style={[styles.messageItem, item.unread && styles.unreadMessage]}
      onPress={() => handleMessagePress(item.id)}
    >
      <View style={styles.messageHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.sender.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
        </View>
        <View style={styles.messageContent}>
          <View style={styles.messageTop}>
            <Text style={[styles.senderName, item.unread && styles.unreadText]}>
              {item.sender}
            </Text>
            <Text style={styles.timestamp}>
              {formatTimestamp(item.timestamp)}
            </Text>
          </View>
          <Text style={styles.messageText} numberOfLines={2}>
            {item.message}
          </Text>
        </View>
        {item.unread && <View style={styles.unreadIndicator} />}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="message" size={64} color={colors.textLight} />
      <Text style={styles.emptyStateTitle}>No Messages Yet</Text>
      <Text style={styles.emptyStateText}>
        Start connecting with businesses and professionals to begin conversations.
      </Text>
      <TouchableOpacity
        style={styles.exploreButton}
        onPress={() => navigation.navigate('Search')}
      >
        <Text style={styles.exploreButtonText}>Explore Businesses</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <MobileHeader
        navigation={navigation}
        title="Messages"
        showBackButton={false}
      />
      
      <View style={styles.content}>
        {/* Business Mode Toggle */}
        {userBusinessProfile && (
          <View style={styles.modeToggleContainer}>
            <TouchableOpacity
              style={[styles.modeToggle, !isBusinessMode && styles.activeModeToggle]}
              onPress={() => !isBusinessMode || toggleBusinessMode()}
            >
              <Ionicons 
                name="person" 
                size={16} 
                color={!isBusinessMode ? colors.cardWhite : colors.textMedium} 
              />
              <Text style={[
                styles.modeToggleText, 
                !isBusinessMode && styles.activeModeToggleText
              ]}>
                Personal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeToggle, isBusinessMode && styles.activeModeToggle]}
              onPress={() => isBusinessMode || toggleBusinessMode()}
            >
              <Ionicons 
                name="business" 
                size={16} 
                color={isBusinessMode ? colors.cardWhite : colors.textMedium} 
              />
              <Text style={[
                styles.modeToggleText, 
                isBusinessMode && styles.activeModeToggleText
              ]}>
                Business
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        ) : conversations.length > 0 ? (
          <FlatList
            data={conversations}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messagesContainer}
            refreshing={loading}
            onRefresh={loadConversations}
          />
        ) : (
          renderEmptyState()
        )}
      </View>

      <MobileBottomNavigation navigation={navigation} activeRoute="Messages" />
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
    paddingBottom: 70, // Account for bottom navigation
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
  },
  messageItem: {
    backgroundColor: colors.cardWhite,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  unreadMessage: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primaryBlue,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.cardWhite,
    fontWeight: 'bold',
    fontSize: 16,
  },
  messageContent: {
    flex: 1,
  },
  messageTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
  },
  unreadText: {
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: 12,
    color: colors.textLight,
  },
  messageText: {
    fontSize: 14,
    color: colors.textMedium,
    lineHeight: 20,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryBlue,
    marginLeft: 8,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textDark,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textMedium,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  exploreButton: {
    backgroundColor: colors.primaryBlue,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  exploreButtonText: {
    color: colors.cardWhite,
    fontWeight: '600',
    fontSize: 16,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.cardWhite,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 8,
    padding: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  modeToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  activeModeToggle: {
    backgroundColor: colors.primaryBlue,
  },
  modeToggleText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMedium,
  },
  activeModeToggleText: {
    color: colors.cardWhite,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textMedium,
    textAlign: 'center',
  },
});

export default MessagesScreen;
