import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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

  // Render mobile-optimized connection graph
  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
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
              
              {/* Node label */}
              <View style={[styles.labelContainer, compact && styles.compactLabelContainer]}>
                <Text style={[
                  styles.nodeLabel,
                  compact && styles.compactNodeLabel
                ]} numberOfLines={compact ? 1 : 2}>
                  {node.name}
                </Text>
                
                {!compact && node.phone && (
                  <Text style={styles.phoneLabel} numberOfLines={1}>
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
      
      {/* Degrees indicator */}
      <View style={styles.degreesContainer}>
        <Text style={[styles.degreesText, compact && styles.compactDegreesText]}>
          {degrees} degree{degrees !== 1 ? 's' : ''} of connection
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  compactContainer: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  noConnectionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  noConnectionText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  pathContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  nodeContainer: {
    alignItems: 'center',
    marginHorizontal: 4,
  },
  node: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1E88E5',
  },
  businessNode: {
    backgroundColor: '#FF5722', // Orange for business
  },
  compactNode: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  labelContainer: {
    alignItems: 'center',
    marginTop: 4,
    maxWidth: 80,
    minHeight: 32,
  },
  compactLabelContainer: {
    maxWidth: 60,
    minHeight: 20,
    marginTop: 2,
  },
  nodeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#263238',
    textAlign: 'center',
    lineHeight: 12,
  },
  compactNodeLabel: {
    fontSize: 9,
    lineHeight: 11,
  },
  phoneLabel: {
    fontSize: 8,
    color: '#546E7A',
    textAlign: 'center',
    marginTop: 2,
  },
  connectionLine: {
    height: 2,
    backgroundColor: '#1E88E5',
    minWidth: 20,
    maxWidth: 30,
    flex: 1,
    marginHorizontal: 2,
  },
  compactConnectionLine: {
    height: 1,
    minWidth: 15,
    maxWidth: 20,
  },
  degreesContainer: {
    backgroundColor: 'rgba(30, 136, 229, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  degreesText: {
    fontSize: 10,
    color: '#1E88E5',
    fontWeight: '600',
    textAlign: 'center',
  },
  compactDegreesText: {
    fontSize: 9,
  },
});

export default ConnectionGraphDisplay;