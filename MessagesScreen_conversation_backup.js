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
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Sample messages data - replace with actual data fetching
  useEffect(() => {
    // Simulate loading messages
    const sampleMessages = [
      {
        id: '1',
        sender: 'John Smith',
        message: 'Hi! I saw your business profile and I\'m interested in collaborating.',
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        unread: true,
        avatar: null,
      },
      {
        id: '2',
        sender: 'Sarah Johnson',
        message: 'Thanks for connecting! Let\'s schedule a meeting to discuss the project.',
        timestamp: new Date(Date.now() - 7200000), // 2 hours ago
        unread: false,
        avatar: null,
      },
      {
        id: '3',
        sender: 'Mike Davis',
        message: 'Great presentation today! Looking forward to working together.',
        timestamp: new Date(Date.now() - 86400000), // 1 day ago
        unread: false,
        avatar: null,
      },
    ];
    setMessages(sampleMessages);
  }, []);

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

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Implement message sending logic here
      Alert.alert('Message', 'Message functionality will be implemented soon!');
      setNewMessage('');
    }
  };

  const handleMessagePress = (messageId) => {
    // Mark message as read and navigate to conversation
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, unread: false } : msg
      )
    );
    Alert.alert('Message', 'Opening conversation view...');
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
        {messages.length > 0 ? (
          <FlatList
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messagesContainer}
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
});

export default MessagesScreen;
