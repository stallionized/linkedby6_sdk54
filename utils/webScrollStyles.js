import { Platform } from 'react-native';

/**
 * Web-compatible scroll styles for React Native Web
 *
 * These styles fix the vertical scrolling issue on web while maintaining
 * native mobile behavior. Use these styles with ScrollView components.
 */

/**
 * Style for the root app container (GestureHandlerRootView, SafeAreaProvider)
 * Apply this to ensure the entire app has proper height on web
 */
export const webRootContainer = {
  flex: 1,
  ...Platform.select({
    web: {
      height: '100vh',
      width: '100vw',
      maxHeight: '100vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    },
  }),
};

/**
 * Style for the container that wraps the ScrollView
 * Apply this to KeyboardAvoidingView or parent View that contains ScrollView
 */
export const webScrollContainer = {
  flex: 1,
  ...Platform.select({
    web: {
      height: '100%',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    },
  }),
};

/**
 * Style for the ScrollView itself
 * Apply this to the ScrollView style prop
 */
export const webScrollView = {
  flex: 1,
  ...Platform.select({
    web: {
      height: '100%',
      overflow: 'auto',
      overflowY: 'scroll', // Force vertical scrollbar to always be visible
      WebkitOverflowScrolling: 'touch',
      display: 'block',
      // Ensure scrollbar is visible (browser-specific)
      scrollbarWidth: 'auto', // Firefox
      scrollbarColor: 'rgba(0, 0, 0, 0.3) transparent', // Firefox - thumb and track colors
    },
  }),
};

/**
 * Style for the ScrollView content container
 * Apply this to the ScrollView contentContainerStyle prop
 */
export const webScrollContent = {
  ...Platform.select({
    web: {
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
    },
  }),
};

/**
 * Helper function to merge web scroll styles with custom styles
 * @param {object} customStyles - Your custom styles object
 * @param {string} type - Type of style: 'container', 'view', or 'content'
 * @returns {object} - Merged styles
 */
export const mergeWebScrollStyles = (customStyles = {}, type = 'view') => {
  const baseStyles = {
    container: webScrollContainer,
    view: webScrollView,
    content: webScrollContent,
  };

  return {
    ...customStyles,
    ...baseStyles[type],
  };
};
