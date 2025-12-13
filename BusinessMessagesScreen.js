import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuth } from './Auth';
import { supabase } from './supabaseClient';
import MobileHeader from './MobileHeader';
import MobileBusinessNavigation from './MobileBusinessNavigation';
import SwipeableConversationItem from './components/SwipeableConversationItem';
import LeadStatusBadge, { getActiveLeadStages, getClosedLeadStages } from './components/LeadStatusBadge';
import LeadStatusSelector from './components/LeadStatusSelector';

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

// Lead tab definitions for business inbox
const LEAD_TABS = [
  { key: 'all', label: 'All Active', icon: 'chatbubbles-outline' },
  { key: 'new', label: 'New Leads', icon: 'sparkles-outline' },
  { key: 'in_progress', label: 'In Progress', icon: 'trending-up-outline' },
  { key: 'closed', label: 'Closed', icon: 'checkmark-done-outline' },
  { key: 'archived', label: 'Archived', icon: 'archive-outline' },
];

const BusinessMessagesScreen = ({ navigation, isBusinessMode, onBusinessModeToggle }) => {
  const { user } = useAuth();
  const [allConversations, setAllConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userBusinessProfile, setUserBusinessProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showStatusSelector, setShowStatusSelector] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);

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
    if (allConversations.length > 0) {
      setupTypingIndicatorChannels();
    }
    return () => {
      cleanupTypingChannels();
    };
  }, [allConversations, user, isBusinessMode, userBusinessProfile]);

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
      // First, get conversations with lead tracking fields
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
          lead_stage,
          lead_stage_updated_at,
          lead_outcome_reason,
          lead_notes,
          is_closed,
          is_pinned_user,
          is_pinned_business,
          created_at,
          updated_at
        `)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      // Filter based on current mode - business mode for this screen
      if (userBusinessProfile) {
        query = query.eq('business_id', userBusinessProfile.business_id);
      } else {
        // Fallback to user mode if no business profile
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

        // Determine if conversation has unread messages (business perspective)
        const lastReadTime = conv.business_last_read_at;
        const hasUnread = conv.last_message_at &&
          (!lastReadTime || new Date(conv.last_message_at) > new Date(lastReadTime));

        return {
          id: conv.id,
          conversationId: conv.id,
          sender: userProfile?.full_name || 'Unknown User',
          message: conv.last_message_text || 'No messages yet',
          timestamp: conv.last_message_at ? new Date(conv.last_message_at) : new Date(conv.created_at),
          unread: hasUnread,
          avatar: userProfile?.profile_image_url,
          otherPartyId: conv.user_id,
          isBusinessConversation: true,
          // Lead tracking fields
          status: conv.business_status || 'active',
          leadStage: conv.lead_stage || 'new',
          leadStageUpdatedAt: conv.lead_stage_updated_at,
          leadOutcomeReason: conv.lead_outcome_reason,
          leadNotes: conv.lead_notes,
          isPinned: conv.is_pinned_business || false,
          isClosed: conv.is_closed || false,
        };
      });

      // Sort: pinned first, then by timestamp
      transformedConversations.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.timestamp - a.timestamp;
      });

      setAllConversations(transformedConversations);
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
    if (!user || allConversations.length === 0) return;

    // Clean up existing channels first
    cleanupTypingChannels();

    allConversations.forEach(conversation => {
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
      if (onBusinessModeToggle) {
        onBusinessModeToggle(!isBusinessMode);
      }
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

  const handleMessagePress = useCallback((conversationId) => {
    // Find the selected conversation
    const conversation = allConversations.find(conv => conv.id === conversationId);

    if (!conversation) {
      console.log('Conversation not found:', conversationId);
      return;
    }

    // Mark conversation as read
    markConversationAsRead(conversationId);

    // Navigate to conversation screen with real data
    navigation.navigate('Conversation', {
      conversationId: conversationId,
      contact: {
        id: conversation.otherPartyId,
        name: conversation.sender,
        lastSeen: 'last seen recently',
        isBusinessConversation: true,
      },
      isBusinessMode: true,
      userBusinessProfile: userBusinessProfile,
      leadStage: conversation.leadStage,
      leadNotes: conversation.leadNotes,
    });
  }, [allConversations, userBusinessProfile, navigation]);

  const markConversationAsRead = async (conversationId) => {
    try {
      await supabase
        .from('conversations')
        .update({ business_last_read_at: new Date().toISOString() })
        .eq('id', conversationId);

      // Update local state
      setAllConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId ? { ...conv, unread: false } : conv
        )
      );
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  };

  // Archive/Restore conversation
  const handleArchiveConversation = useCallback(async (conversationId) => {
    try {
      const conversation = allConversations.find(c => c.id === conversationId);
      const newStatus = conversation?.status === 'archived' ? 'active' : 'archived';

      const { error } = await supabase
        .from('conversations')
        .update({ business_status: newStatus })
        .eq('id', conversationId);

      if (error) throw error;
      loadConversations();
    } catch (error) {
      console.error('Error archiving conversation:', error);
      Alert.alert('Error', 'Failed to update conversation');
    }
  }, [allConversations]);

  // Pin/Unpin conversation
  const handlePinConversation = useCallback(async (conversationId) => {
    try {
      const conversation = allConversations.find(c => c.id === conversationId);
      const newPinnedState = !conversation?.isPinned;

      const { error } = await supabase
        .from('conversations')
        .update({ is_pinned_business: newPinnedState })
        .eq('id', conversationId);

      if (error) throw error;

      // Update local state and re-sort
      setAllConversations(prev => {
        const updated = prev.map(conv =>
          conv.id === conversationId ? { ...conv, isPinned: newPinnedState } : conv
        );
        return updated.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return b.timestamp - a.timestamp;
        });
      });
    } catch (error) {
      console.error('Error pinning conversation:', error);
      Alert.alert('Error', 'Failed to update conversation');
    }
  }, [allConversations]);

  // Open lead status selector
  const handleOpenStatusSelector = useCallback((conversationId) => {
    const conversation = allConversations.find(c => c.id === conversationId);
    if (conversation) {
      setSelectedConversation(conversation);
      setShowStatusSelector(true);
    }
  }, [allConversations]);

  // Update lead stage
  const handleLeadStageChange = async (newStage, reason, notes) => {
    if (!selectedConversation) return;

    try {
      const updateData = {
        lead_stage: newStage,
        lead_stage_updated_at: new Date().toISOString(),
      };

      if (reason) {
        updateData.lead_outcome_reason = reason;
      }
      if (notes !== undefined) {
        updateData.lead_notes = notes;
      }

      const { error } = await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', selectedConversation.id);

      if (error) throw error;

      // Log to history
      await supabase.from('conversation_lead_history').insert({
        conversation_id: selectedConversation.id,
        previous_stage: selectedConversation.leadStage,
        new_stage: newStage,
        changed_by: user.id,
        reason: reason || 'manual change',
        notes: notes,
      });

      loadConversations();
    } catch (error) {
      console.error('Error updating lead stage:', error);
      Alert.alert('Error', 'Failed to update lead status');
    }
  };

  // Save lead notes
  const handleSaveNotes = async (notes) => {
    if (!selectedConversation) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ lead_notes: notes })
        .eq('id', selectedConversation.id);

      if (error) throw error;

      setAllConversations(prev =>
        prev.map(conv =>
          conv.id === selectedConversation.id ? { ...conv, leadNotes: notes } : conv
        )
      );
    } catch (error) {
      console.error('Error saving notes:', error);
      Alert.alert('Error', 'Failed to save notes');
    }
  };

  // Filter conversations based on active tab
  const getFilteredConversations = useCallback(() => {
    const activeStages = getActiveLeadStages();
    const closedStages = getClosedLeadStages();

    switch (activeTab) {
      case 'all':
        return allConversations.filter(c => c.status !== 'archived');
      case 'new':
        return allConversations.filter(c => c.leadStage === 'new' && c.status !== 'archived');
      case 'in_progress':
        return allConversations.filter(c =>
          activeStages.includes(c.leadStage) && c.leadStage !== 'new' && c.status !== 'archived'
        );
      case 'closed':
        return allConversations.filter(c =>
          closedStages.includes(c.leadStage) && c.status !== 'archived'
        );
      case 'archived':
        return allConversations.filter(c => c.status === 'archived');
      default:
        return allConversations.filter(c => c.status !== 'archived');
    }
  }, [allConversations, activeTab]);

  // Get tab counts for badges
  const getTabCounts = useCallback(() => {
    const activeStages = getActiveLeadStages();
    const closedStages = getClosedLeadStages();

    return {
      all: allConversations.filter(c => c.status !== 'archived').length,
      new: allConversations.filter(c => c.leadStage === 'new' && c.status !== 'archived').length,
      in_progress: allConversations.filter(c =>
        activeStages.includes(c.leadStage) && c.leadStage !== 'new' && c.status !== 'archived'
      ).length,
      closed: allConversations.filter(c =>
        closedStages.includes(c.leadStage) && c.status !== 'archived'
      ).length,
      archived: allConversations.filter(c => c.status === 'archived').length,
    };
  }, [allConversations]);

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
      <View style={styles.conversationItemContainer}>
        <SwipeableConversationItem
          item={item}
          onPress={handleMessagePress}
          onArchive={handleArchiveConversation}
          onPin={handlePinConversation}
          isTyping={isTyping}
          formatTimestamp={formatTimestamp}
          isArchived={isArchived}
        />
        {/* Lead Status Badge - positioned over the conversation item */}
        <TouchableOpacity
          style={styles.leadBadgeContainer}
          onPress={() => handleOpenStatusSelector(item.id)}
        >
          <LeadStatusBadge stage={item.leadStage} size="small" />
        </TouchableOpacity>
      </View>
    );
  }, [typingIndicators, activeTab, handleMessagePress, handleArchiveConversation, handlePinConversation, handleOpenStatusSelector]);

  const getEmptyStateContent = () => {
    switch (activeTab) {
      case 'new':
        return {
          icon: 'sparkles',
          title: 'No New Leads',
          text: 'New leads will appear here when customers reach out to your business.',
        };
      case 'in_progress':
        return {
          icon: 'trending-up',
          title: 'No Leads In Progress',
          text: 'Leads you\'re actively working with will appear here.',
        };
      case 'closed':
        return {
          icon: 'checkmark-done',
          title: 'No Closed Leads',
          text: 'Completed and lost leads will appear here.',
        };
      case 'archived':
        return {
          icon: 'archive',
          title: 'No Archived Messages',
          text: 'Archived conversations will appear here.',
        };
      default:
        return {
          icon: 'chatbubbles',
          title: 'No Messages Yet',
          text: 'When customers message your business, they\'ll appear here as leads.',
        };
    }
  };

  const renderEmptyState = () => {
    const content = getEmptyStateContent();
    return (
      <View style={styles.emptyState}>
        <Ionicons name={content.icon} size={64} color={colors.textLight} />
        <Text style={styles.emptyStateTitle}>{content.title}</Text>
        <Text style={styles.emptyStateText}>{content.text}</Text>
      </View>
    );
  };

  const filteredConversations = getFilteredConversations();
  const tabCounts = getTabCounts();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <MobileHeader
          navigation={navigation}
          title="Leads & Messages"
          showBackButton={false}
          isBusinessMode={isBusinessMode}
          onBusinessModeToggle={onBusinessModeToggle}
        />

        <View style={styles.content}>
          {/* Lead-Focused Tab Bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabScrollView}
            contentContainerStyle={styles.tabScrollContent}
          >
            {LEAD_TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.leadTab, activeTab === tab.key && styles.activeLeadTab]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Ionicons
                  name={tab.icon}
                  size={16}
                  color={activeTab === tab.key ? colors.primaryBlue : colors.textMedium}
                />
                <Text style={[styles.leadTabText, activeTab === tab.key && styles.activeLeadTabText]}>
                  {tab.label}
                </Text>
                {tabCounts[tab.key] > 0 && (
                  <View style={[styles.leadTabBadge, activeTab === tab.key && styles.activeLeadTabBadge]}>
                    <Text style={[styles.leadTabBadgeText, activeTab === tab.key && styles.activeLeadTabBadgeText]}>
                      {tabCounts[tab.key]}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading conversations...</Text>
            </View>
          ) : filteredConversations.length > 0 ? (
            <FlatList
              data={filteredConversations}
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

        <MobileBusinessNavigation navigation={navigation} activeRoute="BusinessMessages" visible={true} />

        {/* Lead Status Selector Modal */}
        <LeadStatusSelector
          visible={showStatusSelector}
          onClose={() => setShowStatusSelector(false)}
          currentStage={selectedConversation?.leadStage || 'new'}
          onStageChange={handleLeadStageChange}
          onSaveNotes={handleSaveNotes}
          initialNotes={selectedConversation?.leadNotes || ''}
        />
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
  // Lead tab styles
  tabScrollView: {
    maxHeight: 50,
    marginBottom: 8,
  },
  tabScrollContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  leadTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: colors.cardWhite,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  activeLeadTab: {
    backgroundColor: colors.primaryBlue + '15',
    borderWidth: 1,
    borderColor: colors.primaryBlue,
  },
  leadTabText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMedium,
  },
  activeLeadTabText: {
    color: colors.primaryBlue,
  },
  leadTabBadge: {
    backgroundColor: colors.textLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
    minWidth: 20,
    alignItems: 'center',
  },
  activeLeadTabBadge: {
    backgroundColor: colors.primaryBlue,
  },
  leadTabBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.cardWhite,
  },
  activeLeadTabBadgeText: {
    color: colors.cardWhite,
  },
  // Conversation item container for lead badge positioning
  conversationItemContainer: {
    position: 'relative',
  },
  leadBadgeContainer: {
    position: 'absolute',
    top: 12,
    right: 28,
    zIndex: 10,
  },
});

export default BusinessMessagesScreen;
