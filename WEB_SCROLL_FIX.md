# Web Vertical Scrolling Fix

## Problem
The web version of the app had a vertical scrolling issue due to the default `react-native-web` template setting `body { overflow: hidden; }`. This requires ScrollView components to have specific styles to work properly on web. Additionally, the scrollbar was not visible even when scrolling worked.

## Solution
Created two utility files:
1. `utils/webScrollStyles.js` - Provides web-compatible scroll styles for React Native components
2. `utils/webScrollbarStyles.js` - Injects custom CSS to make scrollbars visible and styled

## How to Use

### 1. Import the utility
```javascript
import { webScrollContainer, webScrollView, webScrollContent } from './utils/webScrollStyles';
```

### 2. Apply styles to your components

```javascript
// Example pattern:
<KeyboardAvoidingView style={styles.mainContent}>
  <ScrollView
    style={styles.scrollView}
    contentContainerStyle={styles.scrollContent}
  >
    {/* Your content */}
  </ScrollView>
</KeyboardAvoidingView>

// In your StyleSheet:
const styles = StyleSheet.create({
  mainContent: {
    ...webScrollContainer,  // Apply to parent container
    // your other styles
  },
  scrollView: {
    ...webScrollView,  // Apply to ScrollView
    // your other styles
  },
  scrollContent: {
    ...webScrollContent,  // Apply to contentContainerStyle
    // your other styles
  },
});
```

### 3. Order matters!
Use the spread operator (...) at the **beginning** of your style object so your custom styles can override the web styles if needed:

```javascript
// ✅ Good - web styles first, then custom styles
scrollView: {
  ...webScrollView,
  backgroundColor: 'white',
},

// ❌ Bad - custom styles will be overridden
scrollView: {
  backgroundColor: 'white',
  ...webScrollView,
},
```

## What's Included

### Scrollbar Styles (Auto-injected)
The scrollbar styles are automatically injected when the app loads via `App.js`:
- Custom scrollbar width and colors
- Hover effects for better UX
- Cross-browser support (Chrome, Firefox, Safari, Edge)
- Always-visible scrollbar option

### Scroll Container Styles
- `webRootContainer` - For root app containers (SafeAreaView, GestureHandlerRootView)
- `webScrollContainer` - For containers that wrap ScrollViews
- `webScrollView` - For the ScrollView component itself
- `webScrollContent` - For ScrollView's contentContainerStyle

## Already Fixed Screens
- ✅ App.js (root container + scrollbar injection)
- ✅ SearchScreen.js
- ✅ LandingPage.js

## Screens That May Need Fixing
If you encounter scrolling issues on other screens, apply the same pattern to:
- ConnectionsScreen.js
- MessagesScreen.js
- BusinessProfileScreen.js
- BusinessConnectionsScreen.js
- BusinessMessagesScreen.js
- BusinessAnalyticsScreen.js
- BusinessDashboardScreen.js
- Any other screen with ScrollView components

## Testing
After applying the fix, restart your web server with:
```bash
npx expo start --web --clear
```

Then test vertical scrolling on the affected screens.
