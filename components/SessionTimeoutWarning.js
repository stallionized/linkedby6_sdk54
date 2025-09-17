import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const SessionTimeoutWarning = ({
  visible,
  onExtendSession,
  onLogout,
  onTimeout, // Called when timer reaches zero (vs manual logout)
  warningDuration = 30000 // 30 seconds warning by default
}) => {
  const [timeLeft, setTimeLeft] = useState(warningDuration / 1000);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [showFinalConfirmation, setShowFinalConfirmation] = useState(false);

  useEffect(() => {
    if (visible) {
      // Reset timer and confirmation state when modal becomes visible
      setTimeLeft(warningDuration / 1000);
      setShowFinalConfirmation(false);

      // Animate modal appearance
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Start countdown
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          const newValue = prev - 1;
          if (newValue <= 0) {
            clearInterval(interval);
            // Show final confirmation message
            setShowFinalConfirmation(true);
            // Wait 2 seconds then call onTimeout (or onLogout if onTimeout not provided)
            setTimeout(() => {
              const timeoutCallback = onTimeout || onLogout;
              timeoutCallback();
            }, 2000);
            return 0;
          }
          return newValue;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      // Reset animations and state when modal is hidden
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      setShowFinalConfirmation(false);
    }
  }, [visible, warningDuration, onLogout, onTimeout]);

  const handleExtendSession = () => {
    // Animate modal disappearance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onExtendSession();
    });
  };

  const handleLogoutNow = () => {
    // Animate modal disappearance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onLogout();
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleLogoutNow}
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            }
          ]}
        >
          {showFinalConfirmation ? (
            // Final confirmation message when timer reached zero
            <>
              <View style={styles.iconContainer}>
                <Text style={styles.logoutIcon}>🔒</Text>
              </View>

              <Text style={styles.title}>Logging Out</Text>

              <Text style={styles.message}>
                Your session has expired due to inactivity. You will be redirected to the login page.
              </Text>
            </>
          ) : (
            // Normal warning state with countdown and buttons
            <>
              <View style={styles.iconContainer}>
                <Text style={styles.warningIcon}>⚠️</Text>
              </View>

              <Text style={styles.title}>Session Timeout Warning</Text>

              <Text style={styles.message}>
                Your session will expire due to inactivity. You will be automatically logged out in:
              </Text>

              <View style={styles.timerContainer}>
                <Text style={styles.timer}>{formatTime(timeLeft)}</Text>
              </View>

              <Text style={styles.subMessage}>
                Would you like to extend your session?
              </Text>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.extendButton]}
                  onPress={handleExtendSession}
                  activeOpacity={0.8}
                >
                  <Text style={styles.extendButtonText}>Stay Logged In</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.logoutButton]}
                  onPress={handleLogoutNow}
                  activeOpacity={0.8}
                >
                  <Text style={styles.logoutButtonText}>Logout Now</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width: Math.min(width - 40, 400),
    maxHeight: height - 100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: 20,
  },
  warningIcon: {
    fontSize: 48,
  },
  logoutIcon: {
    fontSize: 48,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  timerContainer: {
    backgroundColor: '#FF5722',
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 25,
    marginBottom: 20,
  },
  timer: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  subMessage: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 25,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extendButton: {
    backgroundColor: '#1E88E5',
  },
  extendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  logoutButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default SessionTimeoutWarning;
