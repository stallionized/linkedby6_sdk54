import { useEffect, useCallback, useRef } from 'react';
import { Dimensions, BackHandler, Platform } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Gesture thresholds - matched to landing page menu for consistent feel
const SWIPE_THRESHOLD = 50; // Minimum swipe distance to trigger close
const VELOCITY_THRESHOLD = 500; // Velocity threshold for quick swipes

// Spring configuration for natural feel - matched to landing page
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.5,
};

/**
 * Custom hook for slider gesture handling using react-native-reanimated
 * and react-native-gesture-handler for smooth, natural swipe-to-close behavior.
 *
 * Matches the behavior of the landing page menu for consistency.
 *
 * @param {Object} options
 * @param {boolean} options.isVisible - Whether the slider is currently visible
 * @param {Function} options.onClose - Callback when slider should close
 * @param {number} options.sliderWidth - Width of the slider (defaults to screen width)
 * @param {string} options.direction - 'right' for right-side slider, 'left' for left-side (default: 'right')
 * @returns {Object} { translateX, animatedStyle, panGesture }
 */
export const useSliderGesture = ({
  isVisible,
  onClose,
  sliderWidth = SCREEN_WIDTH,
  direction = 'right',
}) => {
  // Shared value for the slider position
  const translateX = useSharedValue(sliderWidth);

  // Track if we're currently dragging
  const isDragging = useSharedValue(false);

  // Track if we're programmatically closing (to prevent useEffect from double-animating)
  const isAnimatingClose = useRef(false);

  // Helper to close the slider from worklet
  const closeSlider = useCallback(() => {
    onClose?.();
  }, [onClose]);

  // Handle visibility changes - animate in/out
  useEffect(() => {
    if (isVisible) {
      // Reset the flag when opening
      isAnimatingClose.current = false;
      // Animate in
      translateX.value = withSpring(0, SPRING_CONFIG);
    } else if (!isAnimatingClose.current) {
      // Only animate out if we're not already animating close programmatically
      translateX.value = withSpring(sliderWidth, SPRING_CONFIG);
    }
  }, [isVisible, sliderWidth]);

  // Handle Android hardware back button
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isVisible) {
        onClose?.();
        return true; // Prevent default back behavior
      }
      return false;
    });

    return () => backHandler.remove();
  }, [isVisible, onClose]);

  // Pan gesture for swipe-to-close
  const panGesture = Gesture.Pan()
    // Activate on horizontal movement with a small threshold
    .activeOffsetX([-20, 20])
    .onStart(() => {
      isDragging.value = true;
    })
    .onUpdate((event) => {
      // For right-side slider: only allow swiping right (positive translation)
      // For left-side slider: only allow swiping left (negative translation)
      if (direction === 'right') {
        if (event.translationX > 0) {
          // Direct tracking for responsive feel
          translateX.value = Math.min(sliderWidth, event.translationX);
        }
      } else {
        if (event.translationX < 0) {
          translateX.value = Math.max(-sliderWidth, event.translationX);
        }
      }
    })
    .onEnd((event) => {
      isDragging.value = false;

      const translation = direction === 'right'
        ? event.translationX
        : -event.translationX;
      const velocity = direction === 'right'
        ? event.velocityX
        : -event.velocityX;

      // Check if swipe was far enough or fast enough to close
      const shouldClose =
        translation > SWIPE_THRESHOLD ||
        velocity > VELOCITY_THRESHOLD;

      if (shouldClose) {
        // Animate out and trigger close callback
        translateX.value = withSpring(
          direction === 'right' ? sliderWidth : -sliderWidth,
          SPRING_CONFIG
        );
        runOnJS(closeSlider)();
      } else {
        // Snap back to open position with spring for natural feel
        translateX.value = withSpring(0, SPRING_CONFIG);
      }
    });

  // Animated style for the slider container
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Programmatic close with animation - matches the gesture close behavior
  // Use this for close buttons to ensure consistent animation
  const animateClose = useCallback(() => {
    // Set flag to prevent useEffect from starting another animation
    isAnimatingClose.current = true;
    // Animate out with the same spring config used for opening
    // Call onClose AFTER animation completes so component stays mounted
    translateX.value = withSpring(
      direction === 'right' ? sliderWidth : -sliderWidth,
      SPRING_CONFIG,
      (finished) => {
        'worklet';
        if (finished && onClose) {
          runOnJS(onClose)();
        }
      }
    );
  }, [direction, sliderWidth, onClose]);

  return {
    translateX,
    animatedStyle,
    panGesture,
    animateClose,
    SPRING_CONFIG,
  };
};

/**
 * Hook for handling backdrop tap-to-close
 *
 * @param {Object} options
 * @param {boolean} options.isVisible - Whether the slider is visible
 * @param {Function} options.onClose - Callback when backdrop is tapped
 * @returns {Object} { tapGesture }
 */
export const useBackdropGesture = ({ isVisible, onClose }) => {
  const closeSlider = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      if (isVisible) {
        runOnJS(closeSlider)();
      }
    });

  return { tapGesture };
};

export { SWIPE_THRESHOLD, VELOCITY_THRESHOLD, SPRING_CONFIG };
