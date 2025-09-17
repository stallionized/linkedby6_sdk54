import { createNavigationContainerRef } from '@react-navigation/native';

// Create a navigation ref that can be used outside of React components
export const navigationRef = createNavigationContainerRef();

// Helper function to navigate
export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

// Helper function to reset navigation stack
export function resetNavigation(routeName) {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: 0,
      routes: [{ name: routeName }],
    });
  }
}
