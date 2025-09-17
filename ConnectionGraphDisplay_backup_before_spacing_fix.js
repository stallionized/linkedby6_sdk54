import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

// Helper function to get a consistent ID for a node
const getNodeId = (node) => {
  if (!node) return 'unknown';
  if (node.identity !== undefined) return `id-${node.identity}`;
  if (node.properties && node.properties.business_id) return `business-${node.properties.business_id}`;
  if (node.properties && node.properties.phone) return `person-${node.properties.phone}`;
  if (node.properties && node.properties.user_id) return `user-${node.properties.user_id}`;
  return `unknown-${Math.random().toString(36).substring(2, 9)}`;
};

// Mobile-optimized Connection Graph Display Component
const ConnectionGraphDisplay = ({ 
  pathData, 
  businessName, 
  currentUserFullName, 
  currentUserPhoneNumber,
  compact = false 
}) => {
  const [showScrollArrows, setShowScrollArrows] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollViewRef = useRef(null);
  // Log the raw pathData for debugging
  console.log("Raw Neo4j pathData received:", JSON.stringify(pathData, null, 2));
  
  // If no path data, show no connection message
  if (!pathData || !pathData.records || pathData.records.length === 0) {
    return (
      <View style={styles.noConnectionContainer}>
        <Text style={styles.noConnectionText}>No connection within 6 degrees</Text>
      </View>
    );
  }

  // Get the first record from the response
  const record = pathData.records[0];
  
  // Check if the record has the expected structure
  if (!record || !record.path || !record.degrees) {
    console.error("Invalid record structure:", record);
    return (
      <View style={styles.noConnectionContainer}>
        <Text style={styles.noConnectionText}>No connection within 6 degrees</Text>
      </View>
    );
  }
  
  const degrees = record.degrees;
  const path = record.path;
  
  // Create arrays to hold the different types of nodes
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
    console.log("Identified business node from path.end:", businessNode.name);
  } else if (path.start && path.start.labels && path.start.labels.includes('Business')) {
    businessNode = {
      id: `business-${path.start.properties?.business_id || 'unknown'}`,
      type: 'Business',
      name: businessName || path.start.properties?.name || 'Business',
      phone: null,
      identity: path.start.identity
    };
    console.log("Identified business node from path.start:", businessNode.name);
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
    console.log("Identified current user node from path.start:", currentUserNode.name);
  } else if (path.end && path.end.labels && path.end.labels.includes('Person')) {
    currentUserNode = {
      id: `person-${path.end.properties?.phone || 'unknown'}`,
      type: 'Person',
      name: currentUserFullName || path.end.properties?.full_name || 'You',
      phone: currentUserPhoneNumber || path.end.properties?.phone,
      identity: path.end.identity
    };
    console.log("Identified current user node from path.end:", currentUserNode.name);
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
    console.log("Processing segments to identify intermediate nodes");
    
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
            console.log("Added intermediate node from segment start:", node.name);
          } else if (isBusiness && !businessNode) {
            businessNode = {
              id: `business-${segment.start.properties?.business_id || 'unknown'}`,
              type: 'Business',
              name: businessName || segment.start.properties?.name || 'Business',
              phone: null,
              identity: segment.start.identity
            };
            nodesByIdentity[startId] = businessNode;
            console.log("Added business node from segment start:", businessNode.name);
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
            console.log("Added intermediate node from segment end:", node.name);
          } else if (isBusiness && !businessNode) {
            businessNode = {
              id: `business-${segment.end.properties?.business_id || 'unknown'}`,
              type: 'Business',
              name: businessName || segment.end.properties?.name || 'Business',
              phone: null,
              identity: segment.end.identity
            };
            nodesByIdentity[endId] = businessNode;
            console.log("Added business node from segment end:", businessNode.name);
          }
        }
      }
    }
  }
  
  // Order nodes correctly
  let orderedNodes = [];
  
  // Start with the business node
  if (businessNode) {
    orderedNodes.push(businessNode);
  }
  
  // Add intermediate nodes (simplified ordering for mobile)
  if (businessNode && currentUserNode && path.segments && path.segments.length > 0) {
    // Simple approach: add all intermediate nodes in order they appear
    orderedNodes = orderedNodes.concat(intermediateNodes);
  }
  
  // Add the current user node last
  if (currentUserNode) {
    orderedNodes.push(currentUserNode);
  }
  
  // If we don't have enough nodes, create a fallback path
  if (orderedNodes.length < 2 || !orderedNodes.some(node => node.type === 'Business')) {
    console.warn("Neo4j path data is incomplete. Creating fallback path visualization.");
    
    orderedNodes = [];
    
    // Add business node
    orderedNodes.push({
      id: 'business-node',
      type: 'Business',
      name: businessName || 'Business',
      phone: null
    });
    
    // Add intermediate nodes based on degrees
    const intermediateCount = Math.max(0, degrees - 1);
    if (intermediateCount > 0) {
      const intermediateNames = [
        "Contact",
        "Connection",
        "Mutual Contact"
      ];
      
      for (let i = 0; i < Math.min(intermediateCount, 3); i++) {
        orderedNodes.push({
          id: `intermediate-${i}`,
          type: 'Person',
          name: intermediateNames[i % intermediateNames.length],
          phone: null
        });
      }
    }
    
    // Add user node
    orderedNodes.push({
      id: 'user-node',
      type: 'Person',
      name: currentUserFullName || 'You',
      phone: currentUserPhoneNumber
    });
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
  
  orderedNodes = uniqueNodes;
  
  console.log("Final node order:", orderedNodes.map(node => node.name));

  // Handle scroll events to update arrow visibility
  const handleScroll = (event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollX = contentOffset.x;
    const maxScrollX = contentSize.width - layoutMeasurement.width;
    
    setCanScrollLeft(scrollX > 5);
    setCanScrollRight(scrollX < maxScrollX - 5);
  };

  // Handle content size change to determine if scrolling is needed
  const handleContentSizeChange = (contentWidth, contentHeight) => {
    const containerWidth = screenWidth - 32; // Account for padding
    const needsScrolling = contentWidth > containerWidth;
    setShowScrollArrows(needsScrolling);
    setCanScrollRight(needsScrolling);
  };

  // Scroll to left
  const scrollLeft = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ x: 0, animated: true });
    }
  };

  // Scroll to right
  const scrollRight = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  };

  // Toggle scroll arrows visibility
  const toggleScrollArrows = () => {
    if (showScrollArrows) {
      setShowScrollArrows(!showScrollArrows);
    }
  };

  // Render mobile-optimized connection graph
  return (
    <TouchableOpacity 
      style={[styles.container, compact && styles.compactContainer]}
      onPress={toggleScrollArrows}
      activeOpacity={showScrollArrows ? 0.7 : 1}
    >
      {/* Scroll arrows */}
      {showScrollArrows && (
        <View style={styles.scrollArrowsContainer}>
          <TouchableOpacity
            style={[styles.scrollArrow, styles.leftArrow, !canScrollLeft && styles.disabledArrow]}
            onPress={scrollLeft}
            disabled={!canScrollLeft}
          >
            <Ionicons name="chevron-back" size={16} color={canScrollLeft ? '#1E88E5' : '#ccc'} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.scrollArrow, styles.rightArrow, !canScrollRight && styles.disabledArrow]}
            onPress={scrollRight}
            disabled={!canScrollRight}
          >
            <Ionicons name="chevron-forward" size={16} color={canScrollRight ? '#1E88E5' : '#ccc'} />
          </TouchableOpacity>
        </View>
      )}
      
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        onContentSizeChange={handleContentSizeChange}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        <View style={styles.pathContainer}>
          {orderedNodes.map((node, index) => (
            <React.Fragment key={`node-${index}`}>
              {/* Node */}
              <View style={styles.nodeContainer}>
                <View style={[
                  styles.node,
                  node.type === 'Business' && styles.businessNode,
                  compact && styles.compactNode
                ]} />
                
                {/* Node label - Now shows full name */}
                <View style={[styles.labelContainer, compact && styles.compactLabelContainer]}>
                  <Text style={[
                    styles.nodeLabel,
                    compact && styles.compactNodeLabel
                  ]}>
                    {node.name}
                  </Text>
                  
                  {!compact && node.phone && (
                    <Text style={styles.phoneLabel}>
                      {node.phone}
                    </Text>
                  )}
                </View>
              </View>
              
              {/* Connection line */}
              {index < orderedNodes.length - 1 && (
                <View style={[
                  styles.connectionLine,
                  compact && styles.compactConnectionLine
                ]} />
              )}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
      
      {/* Degrees indicator */}
      <View style={styles.degreesContainer}>
        <Text style={[styles.degreesText, compact && styles.compactDegreesText]}>
          {degrees} degree{degrees !== 1 ? 's' : ''} of connection
        </Text>
        {showScrollArrows && (
          <Text style={styles.scrollHintText}>
            Tap arrows to scroll • Tap here to hide arrows
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    position: 'relative',
    maxHeight: 60, // Limit total height
  },
  compactContainer: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    maxHeight: 50,
  },
  scrollView: {
    maxWidth: '100%',
    maxHeight: 40,
  },
  scrollContent: {
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  scrollArrowsContainer: {
    position: 'absolute',
    top: 2,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    zIndex: 10,
  },
  scrollArrow: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 2,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  leftArrow: {
    marginLeft: 2,
  },
  rightArrow: {
    marginRight: 2,
  },
  disabledArrow: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  noConnectionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    maxHeight: 40,
  },
  noConnectionText: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  pathContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: 30,
  },
  nodeContainer: {
    alignItems: 'center',
    marginHorizontal: 2,
    width: 50,
  },
  node: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1E88E5',
  },
  businessNode: {
    backgroundColor: '#FF5722', // Orange for business
  },
  compactNode: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  labelContainer: {
    alignItems: 'center',
    marginTop: 2,
    width: 50,
    height: 20,
  },
  compactLabelContainer: {
    width: 45,
    height: 18,
    marginTop: 1,
  },
  nodeLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: '#263238',
    textAlign: 'center',
    lineHeight: 9,
  },
  compactNodeLabel: {
    fontSize: 7,
    lineHeight: 8,
  },
  phoneLabel: {
    fontSize: 6,
    color: '#546E7A',
    textAlign: 'center',
    marginTop: 1,
  },
  connectionLine: {
    height: 1,
    backgroundColor: '#1E88E5',
    width: 15,
    marginHorizontal: 1,
  },
  compactConnectionLine: {
    height: 1,
    width: 12,
  },
  degreesContainer: {
    backgroundColor: 'rgba(30, 136, 229, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
    maxHeight: 24,
  },
  degreesText: {
    fontSize: 10,
    color: '#1E88E5',
    fontWeight: '700',
    textAlign: 'center',
  },
  compactDegreesText: {
    fontSize: 9,
  },
  scrollHintText: {
    fontSize: 6,
    color: '#546E7A',
    textAlign: 'center',
    marginTop: 1,
    fontStyle: 'italic',
  },
});

export default ConnectionGraphDisplay;
