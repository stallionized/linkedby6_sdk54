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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from './Auth';

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
  const flatListRef = useRef(null);

  // Sample conversation data - replace with actual data fetching
  useEffect(() => {
    const sampleConversation = [
      {
        id: '1',
        text: 'Yooo. I have a playmate coming over later',
        timestamp: new Date('2024-09-01T20:38:00'),
        isSent: true,
        isDelivered: true,
        isRead: true,
      },
      {
        id: '2',
        text: 'Wish I knew earlier. I just got home from 2hrs of soccer. There\'s no way I can make it',
        timestamp: new Date('2024-09-01T20:44:00'),
        isSent: false,
      },
      {
        id: '3',
        text: 'I only knew 10 mins ago lol',
        timestamp: new Date('2024-09-01T20:45:00'),
        isSent: true,
        isDelivered: true,
        isRead: true,
      },
      {
        id: '4',
        text: 'Oh ok. Well I am sure you going to have a blast with that',
        timestamp: new Date('2024-09-01T20:47:00'),
        isSent: false,
      },
      {
        id: '5',
        text: 'She was like can I come over tonight so you can spank me and fill me up lol',
        timestamp: new Date('2024-09-01T20:47:00'),
        isSent: true,
        isDelivered: true,
        isRead: true,
      },
      {
        id: '6',
        text: 'She\'s been a bad girl?',
        timestamp: new Date('2024-09-01T20:48:00'),
        isSent: false,
      },
      {
        id: '7',
        text: 'She was emotional last week',
        timestamp: new Date('2024-09-01T20:52:00'),
        isSent: true,
        isDelivered: true,
        isRead: true,
      },
      {
        id: '8',
        text: 'Lol',
        timestamp: new Date('2024-09-01T20:52:00'),
        isSent: true,
        isDelivered: true,
        isRead: true,
      },
      {
        id: '9',
        text: 'And i had to put her on ice',
        timestamp: new Date('2024-09-01T20:52:00'),
        isSent: true,
        isDelivered: true,
        isRead: true,
      },
      {
        id: '10',
        text: 'Time to tame a brat',
        timestamp: new Date('2024-09-01T20:53:00'),
        isSent: false,
      },
      {
        id: '11',
        text: 'What\'s up',
        timestamp: new Date('2024-09-01T16:42:00'),
        isSent: false,
        isDateSeparator: false,
      },
      {
        id: '12',
        text: 'Yooo. Just got in',
        timestamp: new Date('2024-09-01T20:17:00'),
        isSent: true,
        isDelivered: true,
        isRead: true,
      },
      {
        id: '13',
        text: 'Long weekend?',
        timestamp: new Date('2024-09-01T20:19:00'),
        isSent: false,
      },
      {
        id: '14',
        text: 'Very. I have one of my playmates over now. We were chilling on my sky deck',
        timestamp: new Date('2024-09-01T20:19:00'),
        isSent: true,
        isDelivered: true,
        isRead: true,
      },
      {
        id: '15',
        text: 'When you trying to have the mfm?',
        timestamp: new Date('2024-09-01T20:20:00'),
        isSent: false,
      },
    ];
    setMessages(sampleConversation.reverse()); // Reverse to show latest at bottom
  }, []);

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

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const newMsg = {
        id: Date.now().toString(),
        text: newMessage.trim(),
        timestamp: new Date(),
        isSent: true,
        isDelivered: false,
        isRead: false,
      };
      
      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      
      {renderHeader()}
      
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
          <TouchableOpacity style={styles.inputAction}>
            <Ionicons name="happy-outline" size={24} color={colors.timestampText} />
          </TouchableOpacity>
          
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Message"
            placeholderTextColor={colors.timestampText}
            multiline
            maxLength={1000}
          />
          
          <TouchableOpacity style={styles.inputAction}>
            <Ionicons name="attach" size={24} color={colors.timestampText} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.sendButton}
            onPress={handleSendMessage}
          >
            <Ionicons name="camera" size={24} color={colors.timestampText} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.conversationBackground,
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
    alignItems: 'flex-end',
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
    marginHorizontal: 8,
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
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sendButton: {
    marginLeft: 8,
  },
});

export default ConversationScreen;
