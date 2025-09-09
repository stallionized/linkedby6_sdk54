import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Alert,
  Dimensions,
  ActivityIndicator,
  Animated
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const WebBrowserSlider = ({ isVisible, onClose, url, businessName }) => {
  const webViewRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(screenWidth)).current; // Start off-screen to the right
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState(url);
  const [error, setError] = useState(null);

  // Format URL to ensure it has proper protocol
  const formatUrl = (inputUrl) => {
    if (!inputUrl) return 'https://google.com';
    
    let formattedUrl = inputUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }
    return formattedUrl;
  };

  const handleNavigationStateChange = (navState) => {
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
    setCurrentUrl(navState.url);
    setLoading(navState.loading);
  };

  const handleGoBack = () => {
    if (webViewRef.current && canGoBack) {
      webViewRef.current.goBack();
    }
  };

  const handleGoForward = () => {
    if (webViewRef.current && canGoForward) {
      webViewRef.current.goForward();
    }
  };

  const handleRefresh = () => {
    if (webViewRef.current) {
      webViewRef.current.reload();
      setLoading(true);
    }
  };

  const handleError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    // Log error silently without console.error to prevent React Native error overlay
    console.log('WebView error handled:', nativeEvent);
    setLoading(false);
    
    // Provide user-friendly error messages based on error codes
    let friendlyMessage = 'Failed to load website';
    if (nativeEvent.code === -2 || nativeEvent.description?.includes('ERR_NAME_NOT_RESOLVED')) {
      friendlyMessage = 'Website not found. The domain may not exist or may be temporarily unavailable.';
    } else if (nativeEvent.code === -6 || nativeEvent.description?.includes('ERR_INTERNET_DISCONNECTED')) {
      friendlyMessage = 'No internet connection available.';
    } else if (nativeEvent.code === -8 || nativeEvent.description?.includes('ERR_TIMED_OUT')) {
      friendlyMessage = 'Connection timed out. Please try again later.';
    } else if (nativeEvent.description?.includes('ERR_CONNECTION_REFUSED')) {
      friendlyMessage = 'Connection refused. The website may be down.';
    } else if (nativeEvent.description) {
      friendlyMessage = `Unable to load website: ${nativeEvent.description}`;
    }
    
    setError(friendlyMessage);
    
    // Return true to indicate the error has been handled
    return true;
  };

  const handleLoadStart = () => {
    setLoading(true);
    setError(null);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  // Handle slide animations
  useEffect(() => {
    if (isVisible) {
      // Slide in from right to left
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      // Slide out from left to right
      Animated.timing(slideAnim, {
        toValue: screenWidth,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [isVisible, slideAnim]);

  // Custom close handler that triggers animation
  const handleClose = () => {
    // Start slide out animation
    Animated.timing(slideAnim, {
      toValue: screenWidth,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      // Call the original onClose after animation completes
      onClose();
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { transform: [{ translateX: slideAnim }] }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0D47A1" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header with controls */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              style={styles.headerButton} 
              onPress={handleClose}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {businessName || 'Website'}
            </Text>
          </View>
          
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={[styles.headerButton, !canGoBack && styles.disabledButton]} 
              onPress={handleGoBack}
              disabled={!canGoBack}
            >
              <Ionicons 
                name="arrow-back" 
                size={20} 
                color={canGoBack ? "#fff" : "#666"} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.headerButton, !canGoForward && styles.disabledButton]} 
              onPress={handleGoForward}
              disabled={!canGoForward}
            >
              <Ionicons 
                name="arrow-forward" 
                size={20} 
                color={canGoForward ? "#fff" : "#666"} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.headerButton} 
              onPress={handleRefresh}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* URL Bar */}
        <View style={styles.urlBar}>
          <View style={styles.urlContainer}>
            <Ionicons name="lock-closed" size={16} color="#059669" style={styles.lockIcon} />
            <Text style={styles.urlText} numberOfLines={1}>
              {currentUrl}
            </Text>
          </View>
        </View>

        {/* Loading indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#0D47A1" />
          </View>
        )}

        {/* WebView */}
        <View style={styles.webViewContainer}>
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="warning-outline" size={48} color="#DC2626" />
              <Text style={styles.errorTitle}>Unable to load website</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              <Text style={styles.errorUrl}>URL: {formatUrl(url)}</Text>
              <View style={styles.errorButtons}>
                <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <WebView
              ref={webViewRef}
              source={{ uri: formatUrl(url) }}
              style={styles.webView}
              onNavigationStateChange={handleNavigationStateChange}
              onError={handleError}
              onLoadStart={handleLoadStart}
              onLoadEnd={handleLoadEnd}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.webViewLoadingContainer}>
                  <ActivityIndicator size="large" color="#0D47A1" />
                  <Text style={styles.webViewLoadingText}>Loading website...</Text>
                </View>
              )}
              // Error handling properties
              onHttpError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.log('WebView HTTP error handled:', nativeEvent);
                // Handle HTTP errors silently
              }}
              onRenderProcessGone={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.log('WebView render process gone:', nativeEvent);
                // Handle render process errors silently
              }}
              // Security and performance settings
              javaScriptEnabled={true}
              domStorageEnabled={true}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              // Suppress error overlays
              originWhitelist={['*']}
              mixedContentMode={'compatibility'}
              // Handle external links
              onShouldStartLoadWithRequest={(request) => {
                // Allow all navigation within the WebView
                return true;
              }}
            />
          )}
        </View>
      </SafeAreaView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0D47A1',
    zIndex: 1000,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#0D47A1',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 32,
    paddingBottom: 8,
    backgroundColor: '#0D47A1',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  urlBar: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockIcon: {
    marginRight: 8,
  },
  urlText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  loadingContainer: {
    height: 2,
    backgroundColor: '#E3F2FD',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 1,
    overflow: 'hidden',
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
  },
  webViewLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  webViewLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#0D47A1',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#DC2626',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
  },
  errorUrl: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'monospace',
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#0D47A1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#666',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WebBrowserSlider;
