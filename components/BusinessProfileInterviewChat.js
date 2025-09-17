// BusinessProfileInterviewChat.js
// AI-powered interview chat for business profile creation/updates

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import interviewService from '../utils/interviewService';

const BusinessProfileInterviewChat = ({ businessId, onComplete, onCancel }) => {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPhase, setCurrentPhase] = useState('basic_info');
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [collectedData, setCollectedData] = useState({});
  const [isCompleted, setIsCompleted] = useState(false);

  const scrollViewRef = useRef();

  // Initialize interview on mount
  useEffect(() => {
    initializeInterview();
  }, []);

  const initializeInterview = async () => {
    try {
      setIsLoading(true);

      // Start interview - Edge Function will automatically detect and load existing data
      const result = await interviewService.startInterview(businessId);

      setSessionId(result.sessionId);
      setMessages([
        {
          role: 'assistant',
          content: result.initialMessage,
          timestamp: new Date(),
        },
      ]);
      setCurrentPhase(result.currentPhase);
      setCompletionPercentage(result.completionPercentage);
    } catch (error) {
      Alert.alert('Error', 'Failed to start interview. Please try again.');
      console.error('Interview initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    setInputText('');

    // Add user message to chat
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const response = await interviewService.sendInterviewMessage(
        sessionId,
        userMessage,
        messages.map((m) => ({ role: m.role, content: m.content })),
        businessId
      );

      // Add assistant response to chat
      const assistantMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setCurrentPhase(response.currentPhase);
      setCompletionPercentage(response.completionPercentage);
      setCollectedData(response.collectedData || {});

      // Check if interview is completed
      if (response.type === 'completed') {
        setIsCompleted(true);

        // Show completion alert
        Alert.alert(
          'Profile Complete!',
          'Your business profile has been created with AI enrichment.',
          [
            {
              text: 'View Profile',
              onPress: () => {
                if (onComplete) {
                  onComplete({
                    businessId: response.businessId,
                    profileData: response.collectedData,
                    enrichmentData: response.previewData,
                  });
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
      console.error('Message send error:', error);

      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm sorry, I encountered an error. Could you please try again?",
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Interview',
      'Are you sure you want to cancel? Your progress will be saved.',
      [
        { text: 'Continue', style: 'cancel' },
        {
          text: 'Cancel Interview',
          style: 'destructive',
          onPress: async () => {
            try {
              await interviewService.abandonInterview(sessionId);
              if (onCancel) onCancel();
            } catch (error) {
              console.error('Error abandoning interview:', error);
              if (onCancel) onCancel();
            }
          },
        },
      ]
    );
  };

  const renderMessage = (message, index) => {
    const isUser = message.role === 'user';
    const isError = message.isError || false;

    return (
      <View
        key={index}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
            isError && styles.errorBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userMessageText : styles.assistantMessageText,
            ]}
          >
            {message.content}
          </Text>
        </View>
      </View>
    );
  };

  const getPhaseLabel = (phase) => {
    const labels = {
      basic_info: 'Basic Information',
      coverage: 'Service Coverage',
      enrichment: 'Enriching Profile',
      review: 'Review',
      completed: 'Completed',
    };
    return labels[phase] || phase;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>AI Profile Assistant</Text>
            <Text style={styles.headerSubtitle}>{getPhaseLabel(currentPhase)}</Text>
          </View>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>{completionPercentage}%</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              { width: `${completionPercentage}%` },
            ]}
          />
        </View>
      </LinearGradient>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }
      >
        {messages.map((message, index) => renderMessage(message, index))}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#667eea" />
            <Text style={styles.loadingText}>AI is thinking...</Text>
          </View>
        )}
      </ScrollView>

      {!isCompleted && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            placeholderTextColor="#999"
            multiline
            maxLength={500}
            editable={!isLoading}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons
              name="send"
              size={24}
              color={!inputText.trim() || isLoading ? '#ccc' : '#fff'}
            />
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cancelButton: {
    padding: 5,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 2,
  },
  progressContainer: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  progressText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 15,
  },
  messageContainer: {
    marginBottom: 15,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  assistantMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#667eea',
  },
  assistantBubble: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  errorBubble: {
    backgroundColor: '#ffebee',
    borderColor: '#ffcdd2',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  assistantMessageText: {
    color: '#333',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 18,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  loadingText: {
    marginLeft: 10,
    color: '#667eea',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    paddingTop: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 10,
    color: '#333',
  },
  sendButton: {
    backgroundColor: '#667eea',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
});

export default BusinessProfileInterviewChat;
