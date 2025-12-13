import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { useSliderGesture } from './hooks/useSliderGesture';

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

  // Use the reusable slider gesture hook for smooth, natural swipe-to-close
  const { animatedStyle, panGesture } = useSliderGesture({
    isVisible,
    onClose,
    sliderWidth: SLIDER_WIDTH,
    direction: 'right',
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

    // The Business→Owner/Employee relationship shouldn't count as a degree
    // Degrees should represent person-to-person hops only
    const rawDegrees = record.degrees;
    const degrees = Math.max(1, rawDegrees - 1);
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
    
    // Build ordered nodes by following the segment chain sequentially
    // This ensures nodes appear in the correct path order
    let orderedNodes = [];

    if (path.segments && path.segments.length > 0) {
      // Start with path.start (first node in the path)
      const startNode = path.start;
      if (startNode) {
        const isPerson = startNode.labels?.includes('Person');
        const isBusiness = startNode.labels?.includes('Business');

        // Check if this is the current user or business, use our pre-identified nodes if so
        const startIdentity = `${startNode.identity.low}-${startNode.identity.high || 0}`;
        const businessIdentity = businessNode?.identity ? `${businessNode.identity.low}-${businessNode.identity.high || 0}` : null;
        const userIdentity = currentUserNode?.identity ? `${currentUserNode.identity.low}-${currentUserNode.identity.high || 0}` : null;

        if (businessIdentity && startIdentity === businessIdentity) {
          orderedNodes.push(businessNode);
        } else if (userIdentity && startIdentity === userIdentity) {
          orderedNodes.push(currentUserNode);
        } else {
          orderedNodes.push({
            id: isBusiness ? `business-${startNode.properties?.business_id || 'unknown'}` : `person-${startNode.properties?.phone || 'unknown'}`,
            type: isBusiness ? 'Business' : 'Person',
            name: isBusiness ? (businessName || startNode.properties?.name || 'Business') : (startNode.properties?.full_name || 'Unknown Person'),
            phone: startNode.properties?.phone || null,
            identity: startNode.identity
          });
        }
      }

      // Follow each segment's end node (which is the next node in the path)
      for (const segment of path.segments) {
        if (segment.end) {
          const isPerson = segment.end.labels?.includes('Person');
          const isBusiness = segment.end.labels?.includes('Business');

          // Check if this is the current user or business node
          const endIdentity = `${segment.end.identity.low}-${segment.end.identity.high || 0}`;
          const businessIdentity = businessNode?.identity ? `${businessNode.identity.low}-${businessNode.identity.high || 0}` : null;
          const userIdentity = currentUserNode?.identity ? `${currentUserNode.identity.low}-${currentUserNode.identity.high || 0}` : null;

          if (businessIdentity && endIdentity === businessIdentity) {
            orderedNodes.push(businessNode);
          } else if (userIdentity && endIdentity === userIdentity) {
            orderedNodes.push(currentUserNode);
          } else {
            orderedNodes.push({
              id: isBusiness ? `business-${segment.end.properties?.business_id || 'unknown'}` : `person-${segment.end.properties?.phone || 'unknown'}`,
              type: isBusiness ? 'Business' : 'Person',
              name: isBusiness ? (businessName || segment.end.properties?.name || 'Business') : (segment.end.properties?.full_name || 'Unknown Person'),
              phone: segment.end.properties?.phone || null,
              identity: segment.end.identity
            });
          }
        }
      }
    } else {
      // Fallback if no segments: just add business and user nodes
      if (businessNode) {
        orderedNodes.push(businessNode);
      }
      if (currentUserNode) {
        orderedNodes.push(currentUserNode);
      }
    }

    // Reverse the order so Business is on the left and current user is on the right
    // Neo4j returns path starting from current user, but we want Business → ... → User
    if (orderedNodes.length > 0 && orderedNodes[0]?.type !== 'Business') {
      orderedNodes.reverse();
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
          node.type === 'Business' && styles.businessNodeCircle,
          // Owner/employee is the Person node right after the Business (index 1)
          index === 1 && node.type === 'Person' && styles.ownerEmployeeNodeCircle
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

        {index === 1 && node.type === 'Person' && (
          <View style={styles.ownerEmployeeBadge}>
            <Text style={styles.ownerEmployeeBadgeText}>Represents Business</Text>
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
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.container,
          {
            top: insets.top,
            height: screenHeight - insets.top - insets.bottom,
          },
          animatedStyle,
        ]}
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
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
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
    </GestureDetector>
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
  ownerEmployeeNodeCircle: {
    backgroundColor: '#4CAF50', // Green for owner/employee who represents the business
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
  ownerEmployeeBadge: {
    backgroundColor: '#4CAF50', // Green to match the node color
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  ownerEmployeeBadgeText: {
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
