import React, { useEffect } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';
import { useAuth } from '../Auth';

/**
 * ActivityTracker component wraps the app and tracks user interactions
 * to reset the session timeout on any activity
 */
const ActivityTracker = ({ children }) => {
  const { trackActivity } = useAuth();

  // Create PanResponder to track all touch events
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        // Track activity on any touch
        if (trackActivity) {
          trackActivity();
        }
        return false; // Don't capture the event, let it pass through
      },
      onMoveShouldSetPanResponder: () => {
        // Track activity on any movement/scroll
        if (trackActivity) {
          trackActivity();
        }
        return false; // Don't capture the event, let it pass through
      },
    })
  ).current;

  // Track activity on keyboard or other system events
  useEffect(() => {
    // Track initial render as activity
    if (trackActivity) {
      trackActivity();
    }
  }, [trackActivity]);

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ActivityTracker;
