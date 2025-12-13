import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuth } from './Auth';
import { supabase } from './supabaseClient';
import MobileHeader from './MobileHeader';
import MobileBottomNavigation from './MobileBottomNavigation';
import SwipeableConversationItem from './components/SwipeableConversationItem';

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
  const [archivedConversations, setArchivedConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBusinessMode, setIsBusinessMode] = useState(false);
  const [userBusinessProfile, setUserBusinessProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'archived'

  // Typing indicator states
  const [typingIndicators, setTypingIndicators] = useState({}); // conversationId -> isTyping
  const typingChannelsRef = useRef({});

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

  // Set up typing indicator channels when conversations change
  useEffect(() => {
    if (conversations.length > 0) {
      setupTypingIndicatorChannels();
    }
    return () => {
      cleanupTypingChannels();
    };
  }, [conversations, user, isBusinessMode, userBusinessProfile]);

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
          user_status,
          business_status,
          is_closed,
          is_pinned_user,
          is_pinned_business,
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

        // Determine status and pinned state based on mode
        const status = isBusinessMode ? conv.business_status : conv.user_status;
        const isPinned = isBusinessMode ? conv.is_pinned_business : conv.is_pinned_user;

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
          status: status || 'active',
          isPinned: isPinned || false,
          isClosed: conv.is_closed || false,
        };
      });

      // Separate active and archived conversations
      const activeConvs = transformedConversations.filter(c => c.status !== 'archived' && c.status !== 'deleted');
      const archivedConvs = transformedConversations.filter(c => c.status === 'archived');

      // Sort active conversations: pinned first, then by timestamp
      activeConvs.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.timestamp - a.timestamp;
      });

      setConversations(activeConvs);
      setArchivedConversations(archivedConvs);
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

  const setupTypingIndicatorChannels = () => {
    if (!user || conversations.length === 0) return;

    // Clean up existing channels first
    cleanupTypingChannels();

    conversations.forEach(conversation => {
      const conversationId = conversation.id;
      const channelName = `typing_${conversationId}`;
      
      // Create typing indicator channel for this conversation
      const typingChannel = supabase
        .channel(channelName)
        .on('broadcast', { event: 'typing' }, (payload) => {
          const { user_id, business_id, is_typing } = payload.payload;
          
          // Determine if this typing event is from the other party
          let isFromOtherParty = false;
          
          if (isBusinessMode && userBusinessProfile) {
            // In business mode, we care about typing from the user
            isFromOtherParty = user_id && user_id !== user.id;
          } else {
            // In user mode, we care about typing from the business
            isFromOtherParty = business_id && business_id !== conversation.otherPartyId;
          }
          
          if (isFromOtherParty) {
            setTypingIndicators(prev => ({
              ...prev,
              [conversationId]: is_typing
            }));
            
            // Clear typing indicator after 3 seconds if no update
            if (is_typing) {
              setTimeout(() => {
                setTypingIndicators(prev => ({
                  ...prev,
                  [conversationId]: false
                }));
              }, 3000);
            }
          }
        })
        .subscribe();

      // Store the channel reference
      typingChannelsRef.current[conversationId] = typingChannel;
    });
  };

  const cleanupTypingChannels = () => {
    Object.values(typingChannelsRef.current).forEach(channel => {
      if (channel) {
        channel.unsubscribe();
      }
    });
    typingChannelsRef.current = {};
    setTypingIndicators({});
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

  const handleArchiveConversation = useCallback(async (conversationId) => {
    try {
      const statusField = isBusinessMode ? 'business_status' : 'user_status';
      const isCurrentlyArchived = activeTab === 'archived';
      const newStatus = isCurrentlyArchived ? 'active' : 'archived';

      const { error } = await supabase
        .from('conversations')
        .update({ [statusField]: newStatus })
        .eq('id', conversationId);

      if (error) throw error;

      // Reload conversations to reflect changes
      loadConversations();
    } catch (error) {
      console.error('Error archiving conversation:', error);
      Alert.alert('Error', 'Failed to update conversation');
    }
  }, [isBusinessMode, activeTab]);

  const handlePinConversation = useCallback(async (conversationId) => {
    try {
      const pinField = isBusinessMode ? 'is_pinned_business' : 'is_pinned_user';
      const conversation = conversations.find(c => c.id === conversationId) ||
                          archivedConversations.find(c => c.id === conversationId);
      const newPinnedState = !conversation?.isPinned;

      const { error } = await supabase
        .from('conversations')
        .update({ [pinField]: newPinnedState })
        .eq('id', conversationId);

      if (error) throw error;

      // Update local state
      if (activeTab === 'active') {
        setConversations(prev => {
          const updated = prev.map(conv =>
            conv.id === conversationId ? { ...conv, isPinned: newPinnedState } : conv
          );
          // Re-sort: pinned first
          return updated.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return b.timestamp - a.timestamp;
          });
        });
      }
    } catch (error) {
      console.error('Error pinning conversation:', error);
      Alert.alert('Error', 'Failed to update conversation');
    }
  }, [isBusinessMode, conversations, archivedConversations, activeTab]);

  const handleDeleteConversation = useCallback(async (conversationId) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This will hide it from your inbox.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // For consumers, we soft delete (mark as 'deleted')
              // This keeps the conversation accessible to the business
              const { error } = await supabase
                .from('conversations')
                .update({ user_status: 'deleted' })
                .eq('id', conversationId);

              if (error) throw error;

              // Remove from local state
              setConversations(prev => prev.filter(c => c.id !== conversationId));
              setArchivedConversations(prev => prev.filter(c => c.id !== conversationId));
            } catch (error) {
              console.error('Error deleting conversation:', error);
              Alert.alert('Error', 'Failed to delete conversation');
            }
          },
        },
      ]
    );
  }, []);

  const TypingIndicator = () => (
    <View style={styles.typingIndicator}>
      <View style={[styles.typingDot, styles.typingDot1]} />
      <View style={[styles.typingDot, styles.typingDot2]} />
      <View style={[styles.typingDot, styles.typingDot3]} />
    </View>
  );

  const renderMessage = useCallback(({ item }) => {
    const isTyping = typingIndicators[item.id];
    const isArchived = activeTab === 'archived';

    return (
      <SwipeableConversationItem
        item={item}
        onPress={handleMessagePress}
        onArchive={handleArchiveConversation}
        onPin={handlePinConversation}
        onDelete={!isBusinessMode ? handleDeleteConversation : undefined}
        isTyping={isTyping}
        formatTimestamp={formatTimestamp}
        isArchived={isArchived}
      />
    );
  }, [typingIndicators, activeTab, isBusinessMode, handleArchiveConversation, handlePinConversation, handleDeleteConversation]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons
        name={activeTab === 'archived' ? 'archive' : 'message'}
        size={64}
        color={colors.textLight}
      />
      <Text style={styles.emptyStateTitle}>
        {activeTab === 'archived' ? 'No Archived Messages' : 'No Messages Yet'}
      </Text>
      <Text style={styles.emptyStateText}>
        {activeTab === 'archived'
          ? 'Archived conversations will appear here. Swipe left on a conversation to archive it.'
          : 'Start connecting with businesses and professionals to begin conversations.'}
      </Text>
      {activeTab !== 'archived' && (
        <TouchableOpacity
          style={styles.exploreButton}
          onPress={() => navigation.navigate('Search')}
        >
          <Text style={styles.exploreButtonText}>Explore Businesses</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Get the current list based on active tab
  const currentConversations = activeTab === 'active' ? conversations : archivedConversations;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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

          {/* Active / Archived Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'active' && styles.activeTab]}
              onPress={() => setActiveTab('active')}
            >
              <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
                Active
              </Text>
              {conversations.length > 0 && (
                <View style={[styles.tabBadge, activeTab === 'active' && styles.activeTabBadge]}>
                  <Text style={[styles.tabBadgeText, activeTab === 'active' && styles.activeTabBadgeText]}>
                    {conversations.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'archived' && styles.activeTab]}
              onPress={() => setActiveTab('archived')}
            >
              <Ionicons
                name="archive-outline"
                size={16}
                color={activeTab === 'archived' ? colors.primaryBlue : colors.textMedium}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.tabText, activeTab === 'archived' && styles.activeTabText]}>
                Archived
              </Text>
              {archivedConversations.length > 0 && (
                <View style={[styles.tabBadge, activeTab === 'archived' && styles.activeTabBadge]}>
                  <Text style={[styles.tabBadgeText, activeTab === 'archived' && styles.activeTabBadgeText]}>
                    {archivedConversations.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading conversations...</Text>
            </View>
          ) : currentConversations.length > 0 ? (
            <FlatList
              data={currentConversations}
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
    </GestureHandlerRootView>
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
    paddingVertical: 8,
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
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  typingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primaryBlue,
    marginHorizontal: 1,
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.7,
  },
  typingDot3: {
    opacity: 1,
  },
  typingText: {
    fontSize: 14,
    color: colors.primaryBlue,
    fontStyle: 'italic',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.cardWhite,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    padding: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: colors.primaryBlue + '15',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMedium,
  },
  activeTabText: {
    color: colors.primaryBlue,
  },
  tabBadge: {
    backgroundColor: colors.textLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  activeTabBadge: {
    backgroundColor: colors.primaryBlue,
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.cardWhite,
  },
  activeTabBadgeText: {
    color: colors.cardWhite,
  },
});

export default MessagesScreen;
