import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';

const { width, height } = Dimensions.get('window');

const ActiveCallScreen = ({ 
  visible, 
  callData,
  contactName, 
  contactInfo, 
  callDuration, 
  onEndCall, 
  onToggleMute, 
  onToggleSpeaker,
  isMuted = false,
  isSpeakerOn = false,
}) => {
  const [duration, setDuration] = useState(callDuration || 0);
  const [businessLogo, setBusinessLogo] = useState(null);
  const [logoLoading, setLogoLoading] = useState(false);

  useEffect(() => {
    let interval;
    if (visible) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [visible]);

  // Fetch business logo from Supabase if not provided in call data
  useEffect(() => {
    const fetchBusinessLogo = async () => {
      // Only fetch if it's a business call and no logo is provided
      if (callData?.callType === 'business' && !callData?.businessLogo && callData?.receiverId) {
        setLogoLoading(true);
        try {
          console.log('Fetching business logo for ID:', callData.receiverId);
          
          const { data, error } = await supabase
            .from('business_profiles')
            .select('image_url, business_name')
            .eq('business_id', callData.receiverId)
            .single();

          if (error) {
            console.error('Error fetching business logo:', error);
          } else if (data?.image_url) {
            console.log('Found business logo:', data.image_url);
            setBusinessLogo(data.image_url);
          }
        } catch (error) {
          console.error('Exception fetching business logo:', error);
        } finally {
          setLogoLoading(false);
        }
      }
    };

    if (visible && callData) {
      fetchBusinessLogo();
    }
  }, [visible, callData]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    setDuration(0);
    onEndCall();
  };

  // Helper function to get contact display name
  const getContactName = () => {
    if (callData?.contactName) return callData.contactName;
    if (callData?.receiverName) return callData.receiverName;
    if (contactName) return contactName;
    return 'Unknown Contact';
  };

  // Helper function to get contact info
  const getContactInfo = () => {
    if (callData?.callType === 'business') {
      return callData?.industry || 'Business';
    }
    if (contactInfo) return contactInfo;
    return null;
  };

  // Helper function to get avatar/logo
  const getContactAvatar = () => {
    if (callData?.callType === 'business') {
      // First check if logo was passed in call data
      if (callData?.businessLogo) {
        return callData.businessLogo;
      }
      // Then check if we fetched the logo from Supabase
      if (businessLogo) {
        return businessLogo;
      }
    }
    if (callData?.userProfilePicture) {
      return callData.userProfilePicture;
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

  const displayName = getContactName();
  const displayInfo = getContactInfo();
  const avatarUri = getContactAvatar();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent={true}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <View style={styles.container}>
        {/* Background */}
        <View style={styles.backgroundGradient} />
        
        {/* Header section */}
        <View style={styles.headerSection}>
          <Text style={styles.callStatusText}>Voice Call</Text>
          <Text style={styles.durationText}>{formatDuration(duration)}</Text>
        </View>

        {/* Contact info section */}
        <View style={styles.contactSection}>
          {/* Contact avatar/logo */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {avatarUri ? (
                <Image 
                  source={{ uri: avatarUri }} 
                  style={styles.avatarImage}
                  onError={() => console.log('Failed to load avatar image')}
                />
              ) : (
                callData?.callType === 'business' ? (
                  <View style={styles.businessLogoFallback}>
                    <Text style={styles.businessInitials}>
                      {getInitials(displayName)}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.userAvatarFallback}>
                    <Text style={styles.userInitials}>
                      {getInitials(displayName)}
                    </Text>
                  </View>
                )
              )}
            </View>
          </View>
          
          <Text style={styles.contactName}>{displayName}</Text>
          {displayInfo && (
            <Text style={styles.contactInfo}>{displayInfo}</Text>
          )}
          
          {/* Connection quality indicator */}
          <View style={styles.qualityIndicator}>
            <View style={[styles.qualityBar, styles.qualityBarActive]} />
            <View style={[styles.qualityBar, styles.qualityBarActive]} />
            <View style={[styles.qualityBar, styles.qualityBarActive]} />
            <View style={styles.qualityBar} />
          </View>
          <Text style={styles.qualityText}>Good Connection</Text>
        </View>

        {/* Call controls section */}
        <View style={styles.controlsSection}>
          {/* First row of controls */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[styles.controlButton, isMuted && styles.controlButtonActive]}
              onPress={onToggleMute}
              activeOpacity={0.8}
            >
              <Ionicons 
                name={isMuted ? "mic-off" : "mic"} 
                size={24} 
                color={isMuted ? "#1a1a2e" : "#fff"} 
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              activeOpacity={0.8}
            >
              <Ionicons name="keypad" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
              onPress={onToggleSpeaker}
              activeOpacity={0.8}
            >
              <Ionicons 
                name={isSpeakerOn ? "volume-high" : "volume-medium"} 
                size={24} 
                color={isSpeakerOn ? "#1a1a2e" : "#fff"} 
              />
            </TouchableOpacity>
          </View>

          {/* Second row of controls */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={styles.controlButton}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              activeOpacity={0.8}
            >
              <Ionicons name="videocam-off" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              activeOpacity={0.8}
            >
              <Ionicons name="person" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* End call button */}
          <View style={styles.endCallSection}>
            <TouchableOpacity
              style={styles.endCallButton}
              onPress={handleEndCall}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={30} color="#fff" style={styles.endCallIcon} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingTop: StatusBar.currentHeight || 40,
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
  headerSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  callStatusText: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
    fontWeight: '300',
  },
  durationText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '500',
    marginTop: 5,
  },
  contactSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  avatarContainer: {
    marginBottom: 30,
  },
  avatar: {
    width: 180,
    height: 180,
    borderRadius: 24,
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
  contactName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  contactInfo: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 30,
  },
  qualityIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  qualityBar: {
    width: 4,
    backgroundColor: '#fff',
    opacity: 0.3,
    marginHorizontal: 1,
  },
  qualityBarActive: {
    opacity: 1,
  },
  qualityText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.7,
  },
  controlsSection: {
    paddingBottom: 50,
    paddingHorizontal: 40,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  controlButtonActive: {
    backgroundColor: '#fff',
  },
  endCallSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  endCallButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#f44336',
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
  endCallIcon: {
    transform: [{ rotate: '135deg' }],
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    resizeMode: 'contain',
  },
  businessLogoFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    backgroundColor: '#0D47A1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    backgroundColor: '#0f3460',
    justifyContent: 'center',
    alignItems: 'center',
  },
  businessInitials: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInitials: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
});

// Add quality bar heights
StyleSheet.flatten([
  styles.qualityBar,
  { height: 8 },
]);

styles.qualityBar = {
  ...styles.qualityBar,
  height: 8,
};

// Override for different bar heights
const qualityBarStyles = StyleSheet.create({
  bar1: { height: 8 },
  bar2: { height: 12 },
  bar3: { height: 16 },
  bar4: { height: 20 },
});

export default ActiveCallScreen;
