import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  PanResponder,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const SLIDER_WIDTH = screenWidth * 0.85; // 85% of screen width

// Colors palette
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
  businessOrange: '#FF5722',
};

const ConnectionsDetailSlider = ({ 
  isVisible, 
  onClose, 
  pathData, 
  businessName, 
  currentUserFullName, 
  currentUserPhoneNumber 
}) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SLIDER_WIDTH)).current;

  // Animation for showing/hiding slider
  useEffect(() => {
    if (isVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: SLIDER_WIDTH,
        useNativeDriver: false,
        tension: 120, // Slightly faster closing animation
        friction: 7,  // Less friction for smoother slide out
      }).start();
    }
  }, [isVisible]);

  // Custom close handler with animation
  const handleClose = () => {
    Animated.spring(slideAnim, {
      toValue: SLIDER_WIDTH,
      useNativeDriver: false,
      tension: 120,
      friction: 7,
    }).start(() => {
      onClose(); // Call onClose after animation completes
    });
  };

  // Pan responder for swipe to close
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dx > 0) {
        slideAnim.setValue(Math.min(gestureState.dx, SLIDER_WIDTH));
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dx > SLIDER_WIDTH * 0.3) {
        onClose();
      } else {
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
      }
    },
  });

  // Parse the path data to create ordered nodes
  const parseConnectionPath = () => {
    if (!pathData || !pathData.records || pathData.records.length === 0) {
      return {
        nodes: [],
        degrees: 0,
        hasConnection: false
      };
    }

    const record = pathData.records[0];
    if (!record || !record.path || !record.degrees) {
      return {
        nodes: [],
        degrees: 0,
        hasConnection: false
      };
    }

    const degrees = record.degrees;
    const path = record.path;
    
    let businessNode = null;
    let currentUserNode = null;
    let intermediateNodes = [];
    
    // Identify the business node
    if (path.end && path.end.labels && path.end.labels.includes('Business')) {
      businessNode = {
        id: `business-${path.end.properties?.business_id || 'unknown'}`,
        type: 'Business',
        name: businessName || path.end.properties?.name || 'Business',
        phone: null,
        identity: path.end.identity
      };
    } else if (path.start && path.start.labels && path.start.labels.includes('Business')) {
      businessNode = {
        id: `business-${path.start.properties?.business_id || 'unknown'}`,
        type: 'Business',
        name: businessName || path.start.properties?.name || 'Business',
        phone: null,
        identity: path.start.identity
      };
    }
    
    // Identify the current user node
    if (path.start && path.start.labels && path.start.labels.includes('Person')) {
      currentUserNode = {
        id: `person-${path.start.properties?.phone || 'unknown'}`,
        type: 'Person',
        name: currentUserFullName || path.start.properties?.full_name || 'You',
        phone: currentUserPhoneNumber || path.start.properties?.phone,
        identity: path.start.identity
      };
    } else if (path.end && path.end.labels && path.end.labels.includes('Person')) {
      currentUserNode = {
        id: `person-${path.end.properties?.phone || 'unknown'}`,
        type: 'Person',
        name: currentUserFullName || path.end.properties?.full_name || 'You',
        phone: currentUserPhoneNumber || path.end.properties?.phone,
        identity: path.end.identity
      };
    }
    
    // Create a map of all nodes by identity for easy lookup
    const nodesByIdentity = {};
    
    // Add business and current user nodes to the map
    if (businessNode && businessNode.identity) {
      const key = `${businessNode.identity.low}-${businessNode.identity.high || 0}`;
      nodesByIdentity[key] = businessNode;
    }
    
    if (currentUserNode && currentUserNode.identity) {
      const key = `${currentUserNode.identity.low}-${currentUserNode.identity.high || 0}`;
      nodesByIdentity[key] = currentUserNode;
    }
    
    // Process all segments to identify intermediate nodes
    if (path.segments && path.segments.length > 0) {
      for (const segment of path.segments) {
        // Process start node
        if (segment.start) {
          const startId = `${segment.start.identity.low}-${segment.start.identity.high || 0}`;
          
          if (!nodesByIdentity[startId]) {
            const isPerson = segment.start.labels && segment.start.labels.includes('Person');
            const isBusiness = segment.start.labels && segment.start.labels.includes('Business');
            
            if (isPerson) {
              const node = {
                id: `person-${segment.start.properties?.phone || 'unknown'}`,
                type: 'Person',
                name: segment.start.properties?.full_name || 'Unknown Person',
                phone: segment.start.properties?.phone || null,
                identity: segment.start.identity
              };
              
              nodesByIdentity[startId] = node;
              intermediateNodes.push(node);
            } else if (isBusiness && !businessNode) {
              businessNode = {
                id: `business-${segment.start.properties?.business_id || 'unknown'}`,
                type: 'Business',
                name: businessName || segment.start.properties?.name || 'Business',
                phone: null,
                identity: segment.start.identity
              };
              nodesByIdentity[startId] = businessNode;
            }
          }
        }
        
        // Process end node
        if (segment.end) {
          const endId = `${segment.end.identity.low}-${segment.end.identity.high || 0}`;
          
          if (!nodesByIdentity[endId]) {
            const isPerson = segment.end.labels && segment.end.labels.includes('Person');
            const isBusiness = segment.end.labels && segment.end.labels.includes('Business');
            
            if (isPerson) {
              const node = {
                id: `person-${segment.end.properties?.phone || 'unknown'}`,
                type: 'Person',
                name: segment.end.properties?.full_name || 'Unknown Person',
                phone: segment.end.properties?.phone || null,
                identity: segment.end.identity
              };
              
              nodesByIdentity[endId] = node;
              intermediateNodes.push(node);
            } else if (isBusiness && !businessNode) {
              businessNode = {
                id: `business-${segment.end.properties?.business_id || 'unknown'}`,
                type: 'Business',
                name: businessName || segment.end.properties?.name || 'Business',
                phone: null,
                identity: segment.end.identity
              };
              nodesByIdentity[endId] = businessNode;
            }
          }
        }
      }
    }
    
    // Order nodes correctly - business at top, then intermediates, then current user
    let orderedNodes = [];
    
    // Start with the business node
    if (businessNode) {
      orderedNodes.push(businessNode);
    }
    
    // Add intermediate nodes
    orderedNodes = orderedNodes.concat(intermediateNodes);
    
    // Add the current user node last
    if (currentUserNode) {
      orderedNodes.push(currentUserNode);
    }
    
    // Remove duplicates
    const uniqueNodes = [];
    const seen = new Set();
    
    for (const node of orderedNodes) {
      const key = `${node.name}-${node.phone || 'no-phone'}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueNodes.push(node);
      }
    }
    
    return {
      nodes: uniqueNodes,
      degrees,
      hasConnection: uniqueNodes.length >= 2
    };
  };

  const connectionData = parseConnectionPath();

  // Render individual connection node
  const renderConnectionNode = (node, index, isLast) => (
    <View key={`${node.id}-${index}`} style={styles.nodeContainer}>
      {/* Node circle */}
      <View style={styles.nodeWrapper}>
        <View style={[
          styles.nodeCircle,
          node.type === 'Business' && styles.businessNodeCircle
        ]}>
          <Ionicons 
            name={node.type === 'Business' ? 'business' : 'person'} 
            size={24} 
            color={colors.cardWhite} 
          />
        </View>
        
        {/* Connection line */}
        {!isLast && <View style={styles.connectionLine} />}
      </View>
      
      {/* Node information */}
      <View style={[
        styles.nodeInfo,
        (index !== 0 && index !== connectionData.nodes.length - 1) && styles.nodeInfoCentered
      ]}>
        <Text style={[
          styles.nodeName,
          node.type === 'Business' && styles.businessNodeName
        ]}>
          {node.name}
        </Text>
        
        {index === 0 && (
          <View style={styles.startBadge}>
            <Text style={styles.startBadgeText}>Target Business</Text>
          </View>
        )}
        
        {index === connectionData.nodes.length - 1 && (
          <View style={styles.endBadge}>
            <Text style={styles.endBadgeText}>You</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (!isVisible) return null;

  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          transform: [{ translateX: slideAnim }],
          top: insets.top,
          height: screenHeight - insets.top - insets.bottom,
        }
      ]}
      {...panResponder.panHandlers}
    >
      <SafeAreaView style={styles.safeArea} edges={[]}>
        {/* Header */}
        <LinearGradient
          colors={[colors.primaryBlue, colors.darkBlue]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Ionicons name="people" size={24} color={colors.cardWhite} />
              <Text style={styles.headerTitle} numberOfLines={2}>
                {businessName || 'Business'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.cardWhite} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Degrees of separation - outside header */}
        {connectionData.hasConnection && (
          <View style={styles.degreesSection}>
            <View style={styles.degreesContainer}>
              <Text style={styles.degreesText}>
                {connectionData.degrees} degree{connectionData.degrees !== 1 ? 's' : ''} of separation
              </Text>
            </View>
          </View>
        )}

        {/* Content */}
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {connectionData.hasConnection ? (
            <View style={styles.pathContainer}>
              {connectionData.nodes.map((node, index) => 
                renderConnectionNode(node, index, index === connectionData.nodes.length - 1)
              )}
            </View>
          ) : (
            <View style={styles.noConnectionContainer}>
              <Ionicons name="people-outline" size={64} color={colors.textLight} />
              <Text style={styles.noConnectionTitle}>No Connection Found</Text>
              <Text style={styles.noConnectionText}>
                You don't have a connection to {businessName || 'this business'} within 6 degrees of separation.
              </Text>
              <View style={styles.suggestionContainer}>
                <Text style={styles.suggestionTitle}>Suggestions:</Text>
                <Text style={styles.suggestionText}>
                  • Connect with people who work at or know this business
                </Text>
                <Text style={styles.suggestionText}>
                  • Expand your professional network
                </Text>
                <Text style={styles.suggestionText}>
                  • Ask mutual connections for introductions
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 0,
    width: SLIDER_WIDTH,
    backgroundColor: colors.cardWhite,
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1001,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15, // Match MobileHeader paddingVertical
    borderBottomWidth: 1, // Add border like MobileHeader
    borderBottomColor: colors.borderLight,
    elevation: 2, // Match MobileHeader elevation
    zIndex: 10, // Match MobileHeader zIndex
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32, // Match MobileHeader minHeight
    paddingVertical: 4, // Increase padding to match total height
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.cardWhite,
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  headerInfo: {
    marginTop: 8,
  },
  businessNameHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.cardWhite,
    marginBottom: 8,
    lineHeight: 22,
  },
  degreesSection: {
    backgroundColor: colors.backgroundGray,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  degreesContainer: {
    backgroundColor: colors.primaryBlue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  degreesText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.cardWhite,
  },
  content: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  contentContainer: {
    padding: 20,
  },
  explanationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.cardWhite,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: colors.primaryBlue,
  },
  explanationText: {
    fontSize: 14,
    color: colors.textMedium,
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
  },
  pathContainer: {
    backgroundColor: colors.cardWhite,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  nodeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  nodeWrapper: {
    alignItems: 'center',
    marginRight: 16,
  },
  nodeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryBlue,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  businessNodeCircle: {
    backgroundColor: colors.businessOrange,
  },
  connectionLine: {
    width: 3,
    height: 40,
    backgroundColor: colors.primaryBlue,
    marginTop: 8,
    borderRadius: 2,
  },
  nodeInfo: {
    flex: 1,
    paddingTop: 4,
  },
  nodeInfoCentered: {
    height: 48, // Match the node circle height
    justifyContent: 'center',
    paddingTop: 0,
  },
  nodeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 4,
    lineHeight: 24,
  },
  businessNodeName: {
    color: colors.businessOrange,
  },
  nodeType: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMedium,
    marginBottom: 4,
  },
  nodePhone: {
    fontSize: 13,
    color: colors.textLight,
    marginBottom: 8,
  },
  startBadge: {
    backgroundColor: colors.businessOrange,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  startBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.cardWhite,
  },
  endBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  endBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.cardWhite,
  },
  noConnectionContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noConnectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textDark,
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  noConnectionText: {
    fontSize: 16,
    color: colors.textMedium,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  suggestionContainer: {
    backgroundColor: colors.cardWhite,
    padding: 20,
    borderRadius: 12,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 12,
  },
  suggestionText: {
    fontSize: 14,
    color: colors.textMedium,
    lineHeight: 20,
    marginBottom: 8,
  },
});

export default ConnectionsDetailSlider;
