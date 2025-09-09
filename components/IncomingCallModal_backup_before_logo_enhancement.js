import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Vibration,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const IncomingCallModal = ({ 
  visible, 
  callerData,
  callerName, 
  callerInfo, 
  onAccept, 
  onDecline 
}) => {
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (visible) {
      // Start vibration pattern for incoming call
      const vibrationPattern = [0, 1000, 1000, 1000, 1000, 1000];
      Vibration.vibrate(vibrationPattern, true);

      // Start pulsing animation
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => {
        Vibration.cancel();
        pulse.stop();
      };
    }
  }, [visible, pulseAnim]);

  const handleAccept = () => {
    Vibration.cancel();
    onAccept();
  };

  const handleDecline = () => {
    Vibration.cancel();
    onDecline();
  };

  // Helper function to get caller display name
  const getCallerName = () => {
    if (callerData?.contactName) return callerData.contactName;
    if (callerData?.receiverName) return callerData.receiverName;
    if (callerName) return callerName;
    return 'Unknown Caller';
  };

  // Helper function to get caller info
  const getCallerInfo = () => {
    if (callerData?.callType === 'business') {
      return callerData?.industry || 'Business';
    }
    if (callerInfo) return callerInfo;
    return null;
  };

  // Helper function to get caller avatar/logo
  const getCallerAvatar = () => {
    if (callerData?.callType === 'business') {
      if (callerData?.businessLogo) {
        return callerData.businessLogo;
      }
    }
    if (callerData?.userProfilePicture) {
      return callerData.userProfilePicture;
    }
    return null;
  };

  // Helper function to get initials for fallback
  const getInitials = (name) => {
    if (!name) return '?';
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const displayName = getCallerName();
  const displayInfo = getCallerInfo();
  const avatarUri = getCallerAvatar();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent={true}
    >
      <View style={styles.container}>
        {/* Background gradient effect */}
        <View style={styles.backgroundGradient} />
        
        {/* Caller info section */}
        <View style={styles.callerSection}>
          <Text style={styles.incomingCallText}>Incoming Call</Text>
          
          {/* Animated caller avatar/logo */}
          <Animated.View 
            style={[
              styles.avatarContainer,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <View style={styles.avatar}>
              {avatarUri ? (
                <Image 
                  source={{ uri: avatarUri }} 
                  style={styles.avatarImage}
                  onError={() => console.log('Failed to load caller avatar image')}
                />
              ) : (
                callerData?.callType === 'business' ? (
                  <View style={styles.businessLogoFallback}>
                    <Text style={styles.businessInitials}>
                      {getInitials(displayName)}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.userAvatarFallback}>
                    <Ionicons name="person" size={80} color="#fff" />
                  </View>
                )
              )}
            </View>
          </Animated.View>
          
          <Text style={styles.callerName}>{displayName}</Text>
          {displayInfo && (
            <Text style={styles.callerInfo}>{displayInfo}</Text>
          )}
        </View>

        {/* Call actions section */}
        <View style={styles.actionsSection}>
          {/* Decline button */}
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            onPress={handleDecline}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={30} color="#fff" style={styles.declineIcon} />
          </TouchableOpacity>

          {/* Accept button */}
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={handleAccept}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={30} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Additional options */}
        <View style={styles.optionsSection}>
          <TouchableOpacity style={styles.optionButton}>
            <Ionicons name="chatbubble" size={24} color="#fff" />
            <Text style={styles.optionText}>Message</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.optionButton}>
            <Ionicons name="person-add" size={24} color="#fff" />
            <Text style={styles.optionText}>Add Contact</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 50,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#16213e',
    opacity: 0.9,
  },
  callerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  incomingCallText: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.8,
    marginBottom: 40,
    fontWeight: '300',
  },
  avatarContainer: {
    marginBottom: 30,
  },
  avatar: {
    width: 160,
    height: 160,
    borderRadius: 20,
    backgroundColor: '#0f3460',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  callerName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  callerInfo: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.7,
    textAlign: 'center',
  },
  actionsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 60,
    marginBottom: 40,
  },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    backgroundColor: '#f44336',
  },
  declineIcon: {
    transform: [{ rotate: '135deg' }],
  },
  optionsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 80,
  },
  optionButton: {
    alignItems: 'center',
    opacity: 0.7,
  },
  optionText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '300',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    resizeMode: 'contain',
  },
  businessLogoFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#0D47A1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#0f3460',
    justifyContent: 'center',
    alignItems: 'center',
  },
  businessInitials: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default IncomingCallModal;
