import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

const colors = {
  primaryBlue: '#1E88E5',
  cardWhite: '#FFFFFF',
  textDark: '#263238',
  textMedium: '#546E7A',
  textLight: '#90A4AE',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  archive: '#6B7280',
  pin: '#F59E0B',
};

const SwipeableConversationItem = ({
  item,
  onPress,
  onArchive,
  onPin,
  onDelete,
  isTyping,
  formatTimestamp,
  isArchived = false,
}) => {
  const swipeableRef = useRef(null);

  const closeSwipeable = () => {
    if (swipeableRef.current) {
      swipeableRef.current.close();
    }
  };

  const handleArchive = () => {
    closeSwipeable();
    if (onArchive) {
      onArchive(item.id);
    }
  };

  const handlePin = () => {
    closeSwipeable();
    if (onPin) {
      onPin(item.id);
    }
  };

  const handleDelete = () => {
    closeSwipeable();
    if (onDelete) {
      onDelete(item.id);
    }
  };

  const renderRightActions = (progress, dragX) => {
    const translateX = dragX.interpolate({
      inputRange: [-160, 0],
      outputRange: [0, 160],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={[
          styles.rightActionsContainer,
          { transform: [{ translateX }] },
        ]}
      >
        {/* Archive/Unarchive Button */}
        <RectButton
          style={[styles.actionButton, styles.archiveButton]}
          onPress={handleArchive}
        >
          <Ionicons
            name={isArchived ? 'arrow-undo' : 'archive'}
            size={22}
            color={colors.cardWhite}
          />
          <Text style={styles.actionText}>
            {isArchived ? 'Restore' : 'Archive'}
          </Text>
        </RectButton>

        {/* Delete Button (only for non-archived items) */}
        {!isArchived && (
          <RectButton
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
          >
            <Ionicons name="trash" size={22} color={colors.cardWhite} />
            <Text style={styles.actionText}>Delete</Text>
          </RectButton>
        )}
      </Animated.View>
    );
  };

  const renderLeftActions = (progress, dragX) => {
    const translateX = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [-80, 0],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={[
          styles.leftActionsContainer,
          { transform: [{ translateX }] },
        ]}
      >
        <RectButton
          style={[
            styles.actionButton,
            styles.pinButton,
            item.isPinned && styles.unpinButton,
          ]}
          onPress={handlePin}
        >
          <Ionicons
            name={item.isPinned ? 'star' : 'star-outline'}
            size={22}
            color={colors.cardWhite}
          />
          <Text style={styles.actionText}>
            {item.isPinned ? 'Unpin' : 'Pin'}
          </Text>
        </RectButton>
      </Animated.View>
    );
  };

  const TypingIndicator = () => (
    <View style={styles.typingIndicator}>
      <View style={[styles.typingDot, styles.typingDot1]} />
      <View style={[styles.typingDot, styles.typingDot2]} />
      <View style={[styles.typingDot, styles.typingDot3]} />
    </View>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      friction={2}
      rightThreshold={40}
      leftThreshold={40}
      overshootLeft={false}
      overshootRight={false}
    >
      <TouchableOpacity
        style={[styles.messageItem, item.unread && styles.unreadMessage]}
        onPress={() => onPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.messageHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.sender.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </Text>
            </View>
            {item.isPinned && (
              <View style={styles.pinnedBadge}>
                <Ionicons name="star" size={10} color={colors.pin} />
              </View>
            )}
          </View>
          <View style={styles.messageContent}>
            <View style={styles.messageTop}>
              <View style={styles.senderRow}>
                <Text
                  style={[styles.senderName, item.unread && styles.unreadText]}
                  numberOfLines={1}
                >
                  {item.sender}
                </Text>
                {item.isClosed && (
                  <View style={styles.closedBadge}>
                    <Text style={styles.closedBadgeText}>Closed</Text>
                  </View>
                )}
              </View>
              <Text style={styles.timestamp}>
                {formatTimestamp(item.timestamp)}
              </Text>
            </View>
            {isTyping ? (
              <View style={styles.typingContainer}>
                <TypingIndicator />
                <Text style={styles.typingText}>typing...</Text>
              </View>
            ) : (
              <Text style={styles.messageText} numberOfLines={2}>
                {item.message}
              </Text>
            )}
          </View>
          {item.unread && <View style={styles.unreadIndicator} />}
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  messageItem: {
    backgroundColor: colors.cardWhite,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
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
    position: 'relative',
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
  pinnedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.cardWhite,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
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
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  senderName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
    flexShrink: 1,
  },
  unreadText: {
    fontWeight: 'bold',
  },
  closedBadge: {
    backgroundColor: colors.archive,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  closedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.cardWhite,
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
  rightActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginRight: 16,
  },
  leftActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginLeft: 16,
  },
  actionButton: {
    width: 72,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 2,
  },
  archiveButton: {
    backgroundColor: colors.archive,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  pinButton: {
    backgroundColor: colors.pin,
  },
  unpinButton: {
    backgroundColor: colors.textMedium,
  },
  actionText: {
    color: colors.cardWhite,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
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
});

export default SwipeableConversationItem;
