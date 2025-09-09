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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import EmojiSelector from 'react-native-emoji-selector';
import { useAuth } from './Auth';
import { supabase } from './supabaseClient';
import WebRTCService from './services/WebRTCService';
import IncomingCallModal from './components/IncomingCallModal';
import ActiveCallScreen from './components/ActiveCallScreen';

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

  // Voice call states
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [showActiveCall, setShowActiveCall] = useState(false);
  const [callState, setCallState] = useState('idle'); // idle, calling, incoming, active, ended
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [activeCallData, setActiveCallData] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

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

  // Initialize WebRTC service when component mounts
  useEffect(() => {
    if (user && user.id) {
      WebRTCService.initialize(
        user.id,
        handleCallStateChange,
        handleRemoteStream,
        handleLocalStream
      );
    }

    return () => {
      // Cleanup WebRTC service when component unmounts
      WebRTCService.destroy();
    };
  }, [user]);

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

  // WebRTC callback handlers
  const handleCallStateChange = (state, callData) => {
    console.log('Call state changed:', state, callData);
    setCallState(state);
    
    switch (state) {
      case 'incoming':
        // Enhance incoming call data with contact information
        const enhancedIncomingCallData = {
          ...callData,
          contactName: callData?.callerName || contact?.name,
          contactAvatar: callData?.callerAvatar || contact?.profilePicture || contact?.avatar,
          callType: 'user'
        };
        setIncomingCallData(enhancedIncomingCallData);
        setShowIncomingCall(true);
        break;
      case 'active':
        // Enhance active call data with contact information
        const enhancedActiveCallData = {
          ...callData,
          contactName: callData?.contactName || contact?.name,
          contactAvatar: callData?.contactAvatar || contact?.profilePicture || contact?.avatar,
          callType: 'user',
          receiverId: contact?.id,
          receiverName: contact?.name
        };
        setActiveCallData(enhancedActiveCallData);
        setShowIncomingCall(false);
        setShowActiveCall(true);
        break;
      case 'ended':
        setShowIncomingCall(false);
        setShowActiveCall(false);
        setIncomingCallData(null);
        setActiveCallData(null);
        setIsMuted(false);
        setCallDuration(0);
        break;
      default:
        break;
    }
  };

  const handleRemoteStream = (stream) => {
    console.log('Remote stream received:', stream);
    // Handle remote audio stream
  };

  const handleLocalStream = (stream) => {
    console.log('Local stream received:', stream);
    // Handle local audio stream
  };

  // Voice call functions
  const handlePhoneCall = async () => {
    if (!contact?.id) {
      Alert.alert('Error', 'Cannot call this contact - no contact ID available');
      return;
    }
    
    try {
      await WebRTCService.startCall(
        contact.id, 
        contact.name || 'Unknown Contact',
        'user'
      );
    } catch (error) {
      console.error('Error starting call:', error);
      Alert.alert('Error', 'Failed to start call');
    }
  };

  const handleAcceptCall = async () => {
    try {
      await WebRTCService.acceptCall();
    } catch (error) {
      console.error('Error accepting call:', error);
      Alert.alert('Error', 'Failed to accept call');
    }
  };

  const handleDeclineCall = async () => {
    try {
      await WebRTCService.endCall();
      setShowIncomingCall(false);
    } catch (error) {
      console.error('Error declining call:', error);
    }
  };

  const handleEndCall = async () => {
    try {
      await WebRTCService.endCall();
      setShowActiveCall(false);
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  const handleToggleMute = async () => {
    try {
      const newMuteState = await WebRTCService.toggleMute();
      setIsMuted(newMuteState);
    } catch (error) {
      console.error('Error toggling mute:', error);
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
          <TouchableOpacity style={styles.headerAction} onPress={handlePhoneCall}>
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
          <TouchableOpacity style={styles.headerAction} onPress={handlePhoneCall}>
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
