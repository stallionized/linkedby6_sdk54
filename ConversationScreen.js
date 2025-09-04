import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Keyboard,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import EmojiSelector from 'react-native-emoji-selector';
import { useAuth } from './Auth';
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
  // App-themed conversation colors
  conversationBackground: '#F5F7FA',
  messageReceived: '#FFFFFF',
  messageSent: '#1E88E5', // Using app's primary blue
  messageTextSent: '#FFFFFF',
  messageTextReceived: '#263238',
  timestampText: '#90A4AE',
  headerBackground: '#1E88E5',
  inputBackground: '#FFFFFF',
};

const ConversationScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { contact } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const flatListRef = useRef(null);
  const textInputRef = useRef(null);

  // Keyboard event listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardHeight(event.endCoordinates.height);
      setShowEmojiPicker(false); // Hide emoji picker when keyboard shows
      setShowAttachmentMenu(false); // Hide attachment menu when keyboard shows
      // Scroll to bottom when keyboard shows
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // Load messages from database
  useEffect(() => {
    if (user && route.params?.conversationId) {
      loadMessages();
      setupRealtimeSubscription();
    }
  }, [user, route.params?.conversationId]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const { conversationId, isBusinessMode: routeIsBusinessMode, userBusinessProfile: routeUserBusinessProfile } = route.params || {};
      
      if (!conversationId) return;

      // Fetch messages from database
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      // Transform messages for display
      const transformedMessages = messagesData.map(msg => {
        // Determine if message was sent by current user
        const isBusinessSender = routeIsBusinessMode || false;
        const currentUserId = isBusinessSender && routeUserBusinessProfile 
          ? routeUserBusinessProfile.business_id 
          : user.id;
        
        const isSent = msg.sender_id === currentUserId && 
                      msg.sender_role === (isBusinessSender ? 'business' : 'standard_user');

        return {
          id: msg.id,
          text: msg.content,
          timestamp: new Date(msg.created_at),
          isSent: isSent,
          isDelivered: true,
          isRead: true,
        };
      });

      setMessages(transformedMessages);
      
      // Scroll to bottom after loading
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);

    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const { conversationId } = route.params || {};
    if (!conversationId) return;

    // Subscribe to new messages in this conversation
    const messageSubscription = supabase
      .channel(`messages_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          // Add new message to local state if it's not from current user
          const newMessage = payload.new;
          const { isBusinessMode: routeIsBusinessMode, userBusinessProfile: routeUserBusinessProfile } = route.params || {};
          
          const isBusinessSender = routeIsBusinessMode || false;
          const currentUserId = isBusinessSender && routeUserBusinessProfile 
            ? routeUserBusinessProfile.business_id 
            : user.id;
          
          const isSent = newMessage.sender_id === currentUserId && 
                        newMessage.sender_role === (isBusinessSender ? 'business' : 'standard_user');

          // Only add if it's not already in our local state (to avoid duplicates)
          setMessages(prev => {
            const exists = prev.find(msg => msg.id === newMessage.id);
            if (exists) return prev;

            const transformedMessage = {
              id: newMessage.id,
              text: newMessage.content,
              timestamp: new Date(newMessage.created_at),
              isSent: isSent,
              isDelivered: true,
              isRead: true,
            };

            return [...prev, transformedMessage];
          });

          // Scroll to bottom when new message arrives
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      )
      .subscribe();

    return () => {
      messageSubscription.unsubscribe();
    };
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (timestamp) => {
    const today = new Date();
    const messageDate = new Date(timestamp);
    
    if (messageDate.toDateString() === today.toDateString()) {
      return null; // Don't show date for today
    }
    
    return messageDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    });
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() && user) {
      const messageText = newMessage.trim();
      setNewMessage(''); // Clear input immediately for better UX
      
      try {
        // Get conversation details from route params
        const { conversationId, isBusinessMode: routeIsBusinessMode, userBusinessProfile: routeUserBusinessProfile } = route.params || {};
        
        // Determine sender details based on current mode
        const isBusinessSender = routeIsBusinessMode || false;
        const senderId = isBusinessSender && routeUserBusinessProfile 
          ? routeUserBusinessProfile.business_id 
          : user.id;
        
        // Insert message into database
        const { data: messageData, error: messageError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: senderId,
            sender_role: isBusinessSender ? 'business' : 'standard_user',
            content: messageText,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (messageError) {
          console.error('Error sending message:', messageError);
          // Restore the message text if there was an error
          setNewMessage(messageText);
          return;
        }

        // Update conversation's last message
        const { error: conversationError } = await supabase
          .from('conversations')
          .update({
            last_message_text: messageText,
            last_message_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', conversationId);

        if (conversationError) {
          console.error('Error updating conversation:', conversationError);
        }

        // Add message to local state for immediate display
        const newMsg = {
          id: messageData.id,
          text: messageText,
          timestamp: new Date(messageData.created_at),
          isSent: true,
          isDelivered: false,
          isRead: false,
        };
        
        setMessages(prev => [...prev, newMsg]);
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);

      } catch (error) {
        console.error('Error sending message:', error);
        // Restore the message text if there was an error
        setNewMessage(messageText);
      }
    }
  };

  const handleEmojiSelect = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    // Focus back to text input
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);
  };

  const toggleEmojiPicker = () => {
    if (showEmojiPicker) {
      setShowEmojiPicker(false);
      // Focus text input when closing emoji picker
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
    } else {
      // Dismiss keyboard first, then show emoji picker
      Keyboard.dismiss();
      setTimeout(() => {
        setShowEmojiPicker(true);
      }, 100);
    }
  };

  const toggleAttachmentMenu = () => {
    if (showAttachmentMenu) {
      setShowAttachmentMenu(false);
      // Focus text input when closing attachment menu
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
    } else {
      // Dismiss keyboard and emoji picker first, then show attachment menu
      Keyboard.dismiss();
      setShowEmojiPicker(false);
      setTimeout(() => {
        setShowAttachmentMenu(true);
      }, 100);
    }
  };

  const handleAttachmentSelect = (type) => {
    setShowAttachmentMenu(false);
    // Handle different attachment types
    switch (type) {
      case 'gallery':
        console.log('Open gallery');
        // TODO: Implement gallery picker
        break;
      case 'camera':
        console.log('Open camera');
        // TODO: Implement camera
        break;
      case 'file':
        console.log('Open file picker');
        // TODO: Implement file picker
        break;
      case 'location':
        console.log('Share location');
        // TODO: Implement location sharing
        break;
      case 'contact':
        console.log('Share contact');
        // TODO: Implement contact sharing
        break;
      default:
        break;
    }
  };

  const renderMessage = ({ item, index }) => {
    const showDate = index === 0 || formatDate(item.timestamp) !== formatDate(messages[index - 1]?.timestamp);
    const dateToShow = formatDate(item.timestamp);
    
    return (
      <View>
        {showDate && dateToShow && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>{dateToShow}</Text>
          </View>
        )}
        <View style={[
          styles.messageContainer,
          item.isSent ? styles.sentMessageContainer : styles.receivedMessageContainer
        ]}>
          <View style={[
            styles.messageBubble,
            item.isSent ? styles.sentMessage : styles.receivedMessage
          ]}>
            <Text style={[
              styles.messageText,
              { color: item.isSent ? colors.messageTextSent : colors.messageTextReceived }
            ]}>
              {item.text}
            </Text>
            <View style={styles.messageFooter}>
              <Text style={[
                styles.timestampText,
                { color: item.isSent ? colors.lightBlue : colors.timestampText }
              ]}>
                {formatTime(item.timestamp)}
              </Text>
              {item.isSent && (
                <View style={styles.messageStatus}>
                  <Ionicons 
                    name={item.isRead ? "checkmark-done" : "checkmark"} 
                    size={16} 
                    color={item.isRead ? colors.lightBlue : colors.lightBlue} 
                  />
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.cardWhite} />
      </TouchableOpacity>
      
      <View style={styles.contactInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {contact?.name ? contact.name.split(' ').map(n => n[0]).join('') : 'MC'}
          </Text>
        </View>
        <View style={styles.contactDetails}>
          <Text style={styles.contactName}>
            {contact?.name || 'Mr.Iron-Cut'}
          </Text>
          <Text style={styles.lastSeen}>last seen at 5:20 AM</Text>
        </View>
      </View>
      
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.headerAction}>
          <Ionicons name="call" size={24} color={colors.cardWhite} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerAction}>
          <Ionicons name="ellipsis-vertical" size={24} color={colors.cardWhite} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <StatusBar style="light" />
      </SafeAreaView>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.cardWhite} />
        </TouchableOpacity>
        
        <View style={styles.contactInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {contact?.name ? contact.name.split(' ').map(n => n[0]).join('') : 'MC'}
            </Text>
          </View>
          <View style={styles.contactDetails}>
            <Text style={styles.contactName}>
              {contact?.name || 'Mr.Iron-Cut'}
            </Text>
            <Text style={styles.lastSeen}>last seen at 5:20 AM</Text>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerAction}>
            <Ionicons name="call" size={24} color={colors.cardWhite} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerAction}>
            <Ionicons name="ellipsis-vertical" size={24} color={colors.cardWhite} />
          </TouchableOpacity>
        </View>
      </View>
      
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
        
        <View style={styles.inputContainer}>
          <TouchableOpacity 
            style={styles.inputAction}
            onPress={toggleEmojiPicker}
          >
            <Ionicons 
              name={showEmojiPicker ? "happy" : "happy-outline"} 
              size={24} 
              color={showEmojiPicker ? colors.primaryBlue : colors.timestampText} 
            />
          </TouchableOpacity>
          
          <TextInput
            ref={textInputRef}
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Message"
            placeholderTextColor={colors.timestampText}
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={handleSendMessage}
            blurOnSubmit={false}
            textAlignVertical="top"
            autoCorrect={true}
            autoCapitalize="sentences"
            enablesReturnKeyAutomatically={true}
            keyboardType="default"
            autoFocus={false}
          />
          
          <TouchableOpacity 
            style={styles.inputAction}
            onPress={toggleAttachmentMenu}
          >
            <Ionicons 
              name="attach" 
              size={24} 
              color={showAttachmentMenu ? colors.primaryBlue : colors.timestampText} 
            />
          </TouchableOpacity>
          
          {newMessage.trim() ? (
            <TouchableOpacity 
              style={[styles.sendButton, styles.activeSendButton]}
              onPress={handleSendMessage}
            >
              <Ionicons name="send" size={20} color={colors.cardWhite} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.sendButton}>
              <Ionicons name="camera" size={24} color={colors.timestampText} />
            </TouchableOpacity>
          )}
        </View>

        {/* Emoji Picker Modal */}
        <Modal
          visible={showEmojiPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowEmojiPicker(false)}
        >
          <View style={styles.emojiModalContainer}>
            <TouchableOpacity 
              style={styles.emojiModalOverlay}
              onPress={() => setShowEmojiPicker(false)}
            />
            <View style={styles.emojiPickerContainer}>
              <View style={styles.emojiPickerHeader}>
                <Text style={styles.emojiPickerTitle}>Choose an emoji</Text>
                <TouchableOpacity 
                  onPress={() => setShowEmojiPicker(false)}
                  style={styles.emojiCloseButton}
                >
                  <Ionicons name="close" size={24} color={colors.textDark} />
                </TouchableOpacity>
              </View>
              <View style={styles.emojiSelectorWrapper}>
                <EmojiSelector
                  onEmojiSelected={handleEmojiSelect}
                  showTabs={true}
                  showSearchBar={true}
                  showSectionTitles={true}
                  category={undefined}
                  columns={8}
                  placeholder="Search emoji..."
                  showHistory={true}
                  theme={{
                    container: {
                      backgroundColor: colors.cardWhite,
                      flex: 1,
                    },
                    searchBar: {
                      backgroundColor: colors.backgroundGray,
                      borderColor: colors.borderLight,
                      color: colors.textDark,
                    },
                    searchBarText: {
                      color: colors.textDark,
                    },
                    category: {
                      color: colors.textDark,
                      backgroundColor: colors.backgroundGray,
                    },
                    tabBar: {
                      backgroundColor: colors.cardWhite,
                      borderTopColor: colors.borderLight,
                    },
                    tabBarIcon: {
                      color: colors.timestampText,
                    },
                    tabBarIconActive: {
                      color: colors.primaryBlue,
                    },
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Attachment Menu Modal */}
        <Modal
          visible={showAttachmentMenu}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowAttachmentMenu(false)}
        >
          <View style={styles.attachmentModalContainer}>
            <TouchableOpacity 
              style={styles.attachmentModalOverlay}
              onPress={() => setShowAttachmentMenu(false)}
            />
            <View style={styles.attachmentMenuContainer}>
              <View style={styles.attachmentMenuHeader}>
                <Text style={styles.attachmentMenuTitle}>Share</Text>
                <TouchableOpacity 
                  onPress={() => setShowAttachmentMenu(false)}
                  style={styles.attachmentCloseButton}
                >
                  <Ionicons name="close" size={24} color={colors.textDark} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.attachmentOptionsContainer}>
                <View style={styles.attachmentOptionsRow}>
                  <TouchableOpacity 
                    style={styles.attachmentOption}
                    onPress={() => handleAttachmentSelect('gallery')}
                  >
                    <View style={[styles.attachmentIconContainer, { backgroundColor: colors.primaryBlue }]}>
                      <Ionicons name="images" size={28} color={colors.cardWhite} />
                    </View>
                    <Text style={styles.attachmentOptionText}>Gallery</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.attachmentOption}
                    onPress={() => handleAttachmentSelect('camera')}
                  >
                    <View style={[styles.attachmentIconContainer, { backgroundColor: colors.success }]}>
                      <Ionicons name="camera" size={28} color={colors.cardWhite} />
                    </View>
                    <Text style={styles.attachmentOptionText}>Camera</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.attachmentOption}
                    onPress={() => handleAttachmentSelect('file')}
                  >
                    <View style={[styles.attachmentIconContainer, { backgroundColor: colors.warning }]}>
                      <Ionicons name="document" size={28} color={colors.cardWhite} />
                    </View>
                    <Text style={styles.attachmentOptionText}>File</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.attachmentOption}
                    onPress={() => handleAttachmentSelect('location')}
                  >
                    <View style={[styles.attachmentIconContainer, { backgroundColor: colors.error }]}>
                      <Ionicons name="location" size={28} color={colors.cardWhite} />
                    </View>
                    <Text style={styles.attachmentOptionText}>Location</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.attachmentOptionsRow}>
                  <TouchableOpacity 
                    style={styles.attachmentOption}
                    onPress={() => handleAttachmentSelect('contact')}
                  >
                    <View style={[styles.attachmentIconContainer, { backgroundColor: colors.textMedium }]}>
                      <Ionicons name="person" size={28} color={colors.cardWhite} />
                    </View>
                    <Text style={styles.attachmentOptionText}>Contact</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.attachmentOption}
                    onPress={() => handleAttachmentSelect('poll')}
                  >
                    <View style={[styles.attachmentIconContainer, { backgroundColor: colors.lightBlue }]}>
                      <Ionicons name="bar-chart" size={28} color={colors.cardWhite} />
                    </View>
                    <Text style={styles.attachmentOptionText}>Poll</Text>
                  </TouchableOpacity>

                  <View style={styles.attachmentOption}>
                    {/* Empty placeholder for alignment */}
                  </View>

                  <View style={styles.attachmentOption}>
                    {/* Empty placeholder for alignment */}
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.conversationBackground,
  },
  safeAreaTop: {
    backgroundColor: colors.headerBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.headerBackground,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: colors.cardWhite,
    fontWeight: 'bold',
    fontSize: 14,
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    color: colors.cardWhite,
    fontSize: 18,
    fontWeight: '600',
  },
  lastSeen: {
    color: colors.lightBlue,
    fontSize: 14,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAction: {
    marginLeft: 20,
  },
  content: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateSeparatorText: {
    backgroundColor: colors.textLight,
    color: colors.cardWhite,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '500',
  },
  messageContainer: {
    marginVertical: 2,
  },
  sentMessageContainer: {
    alignItems: 'flex-end',
  },
  receivedMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: screenWidth * 0.75,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  sentMessage: {
    backgroundColor: colors.messageSent,
    borderBottomRightRadius: 4,
  },
  receivedMessage: {
    backgroundColor: colors.messageReceived,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timestampText: {
    color: colors.timestampText,
    fontSize: 12,
  },
  messageStatus: {
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  inputAction: {
    marginHorizontal: 2,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.textDark,
    fontSize: 16,
    maxHeight: 100,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sendButton: {
    marginLeft: 4,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
  },
  activeSendButton: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Emoji Picker Styles
  emojiModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  emojiModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  emojiPickerContainer: {
    backgroundColor: colors.cardWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: screenHeight * 0.6,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  emojiPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  emojiPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textDark,
  },
  emojiCloseButton: {
    padding: 4,
  },
  emojiSelectorWrapper: {
    flex: 1,
    height: screenHeight * 0.45,
  },
  // Attachment Menu Styles
  attachmentModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  attachmentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  attachmentMenuContainer: {
    backgroundColor: colors.cardWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  attachmentMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  attachmentMenuTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textDark,
  },
  attachmentCloseButton: {
    padding: 4,
  },
  attachmentOptionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  attachmentOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  attachmentOption: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  attachmentIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  attachmentOptionText: {
    fontSize: 12,
    color: colors.textDark,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default ConversationScreen;
