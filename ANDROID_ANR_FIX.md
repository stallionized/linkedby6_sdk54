# Android "App Not Responding" (ANR) Fix Guide

## Problem
Android emulator shows "Linked By Six isn't responding" dialog when app loads.

## Root Causes
1. Heavy JavaScript operations on main thread
2. Large component tree rendering
3. Database queries blocking UI
4. Neo4j connection initialization
5. Multiple network requests on mount

---

## Quick Fixes (Try These First)

### Fix 1: Defer Heavy Operations

Add this to the top of `SearchScreen.js` after imports:

```javascript
// Add after imports
import { InteractionManager } from 'react-native';

// Inside SearchScreen component, wrap heavy operations:
useEffect(() => {
  // Defer non-critical operations until animations complete
  InteractionManager.runAfterInteractions(() => {
    // Move Neo4j initialization here
    fetchNeo4jConfig();
    fetchMS2WebhookUrl();
    fetchUserRecommendations(currentUserId);
  });
}, []);
```

### Fix 2: Increase Android Timeout

Create/edit `android/gradle.properties`:

```properties
# Add these lines
android.enableDexingArtifactTransform=false
android.enableDexingArtifactTransform.desugaring=false

# Increase timeout
org.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=512m -XX:+HeapDumpOnOutOfMemoryError
```

### Fix 3: Enable Hermes Engine

Check `android/app/build.gradle`:

```gradle
project.ext.react = [
    enableHermes: true,  // Make sure this is true
]
```

Then rebuild:
```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

### Fix 4: Lazy Load Components

Wrap heavy components in `React.lazy()`:

```javascript
// At top of SearchScreen.js
const BusinessProfileSlider = React.lazy(() => import('./BusinessProfileSlider'));
const ConnectionGraphDisplay = React.lazy(() => import('./ConnectionGraphDisplay'));

// Then use with Suspense:
<Suspense fallback={<ActivityIndicator />}>
  <BusinessProfileSlider {...props} />
</Suspense>
```

---

## Medium Fixes (If Quick Fixes Don't Work)

### Fix 5: Optimize SearchScreen Mount

Replace the initialization code in SearchScreen.js:

```javascript
// BEFORE (blocking):
useEffect(() => {
  if (hasInitialized) return;

  // All these run at once, blocking UI:
  fetchNeo4jConfig();
  fetchMS2WebhookUrl();
  fetchUserRecommendations(currentUserId);
  // ...more heavy operations

  setHasInitialized(true);
}, []);

// AFTER (non-blocking):
useEffect(() => {
  if (hasInitialized) return;

  // Stagger operations with delays
  const loadSequence = async () => {
    // Load critical data first
    await fetchMS2WebhookUrl();

    // Small delay before next operation
    await new Promise(resolve => setTimeout(resolve, 100));
    await fetchUserRecommendations(currentUserId);

    await new Promise(resolve => setTimeout(resolve, 100));
    await fetchNeo4jConfig();

    setHasInitialized(true);
  };

  // Run in background
  InteractionManager.runAfterInteractions(loadSequence);
}, []);
```

### Fix 6: Reduce Neo4j Queries on Mount

Check if you're making Neo4j calls immediately. Move them to on-demand:

```javascript
// BEFORE: Runs on mount for every business
useEffect(() => {
  businessProfiles.forEach(business => {
    fetchConnectionPath(business.business_id); // BLOCKS UI
  });
}, [businessProfiles]);

// AFTER: Only fetch when user interacts
const handleBusinessClick = (business) => {
  fetchConnectionPath(business.business_id); // On-demand
  openBusinessProfile(business);
};
```

---

## Advanced Fixes (Last Resort)

### Fix 7: Enable React Native Debugger Optimizations

Add to `App.js`:

```javascript
if (__DEV__) {
  require('react-native').LogBox.ignoreLogs([
    'Require cycle:',
    'Remote debugger',
  ]);
}

// Enable native driver for animations
const animConfig = {
  useNativeDriver: true,
  duration: 300,
};
```

### Fix 8: Split SearchScreen Into Chunks

Create a loading screen component:

```javascript
// SearchScreenLoader.js
import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

export default function SearchScreenLoader({ onReady }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate loading steps
    const steps = [
      'Loading configuration...',
      'Connecting to database...',
      'Fetching user data...',
      'Ready!',
    ];

    let current = 0;
    const interval = setInterval(() => {
      current++;
      setProgress((current / steps.length) * 100);

      if (current >= steps.length) {
        clearInterval(interval);
        setTimeout(onReady, 200);
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
      <Text>Loading... {Math.round(progress)}%</Text>
    </View>
  );
}
```

Then use in SearchScreen:

```javascript
const [isLoaded, setIsLoaded] = useState(false);

if (!isLoaded) {
  return <SearchScreenLoader onReady={() => setIsLoaded(true)} />;
}

return (
  // Normal SearchScreen content
);
```

### Fix 9: Optimize Supabase Queries

Make queries more efficient:

```javascript
// BEFORE: Multiple queries
const { data: businesses } = await supabase.from('business_profiles').select('*');
const { data: recommendations } = await supabase.from('user_recommendations').select('*');

// AFTER: Single query with join
const { data } = await supabase
  .from('business_profiles')
  .select(`
    *,
    user_recommendations!inner(user_id)
  `)
  .eq('user_recommendations.user_id', userId)
  .limit(10); // Limit initial load
```

---

## Diagnostic Steps

### 1. Check What's Blocking

Add timing logs:

```javascript
console.time('SearchScreen-mount');

useEffect(() => {
  console.time('fetchNeo4jConfig');
  await fetchNeo4jConfig();
  console.timeEnd('fetchNeo4jConfig');

  console.time('fetchMS2WebhookUrl');
  await fetchMS2WebhookUrl();
  console.timeEnd('fetchMS2WebhookUrl');

  console.timeEnd('SearchScreen-mount');
}, []);
```

### 2. Monitor Component Renders

Add React DevTools:

```bash
npm install -g react-devtools
react-devtools
```

Then in your app, add:
```javascript
// App.js
if (__DEV__) {
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
  });
}
```

### 3. Profile Performance

```bash
# Start profiler
npx react-native run-android --variant=release

# Use Chrome DevTools
# Open chrome://inspect
# Click "inspect" on your app
# Go to Performance tab
# Record while loading SearchScreen
```

---

## Emulator-Specific Fixes

### Fix 10: Increase Emulator Resources

In Android Studio:
1. Tools → AVD Manager
2. Edit your emulator
3. Show Advanced Settings
4. Increase:
   - RAM: 4096 MB (minimum)
   - VM Heap: 512 MB
   - Internal Storage: 4096 MB

### Fix 11: Enable Hardware Acceleration

In `~/.android/avd/YourDevice.avd/config.ini`:

```ini
hw.gpu.enabled=yes
hw.gpu.mode=auto
```

Or create new emulator with:
- Graphics: Hardware - GLES 2.0
- Boot option: Quick Boot

### Fix 12: Use Physical Device

```bash
# Enable USB debugging on phone
# Connect phone via USB

adb devices
npx react-native run-android
```

Physical devices are MUCH faster than emulators.

---

## Recommended Solution Hierarchy

Try in this order:

1. ✅ **Fix 1** (Defer operations) - 2 minutes
2. ✅ **Fix 10** (Increase emulator RAM) - 5 minutes
3. ✅ **Fix 3** (Enable Hermes) - 10 minutes
4. ✅ **Fix 5** (Stagger operations) - 15 minutes
5. ✅ **Fix 6** (On-demand Neo4j) - 20 minutes
6. ✅ **Fix 12** (Use physical device) - 5 minutes

---

## Expected Results

After fixes:
- ✅ App loads without ANR dialog
- ✅ Initial render < 3 seconds
- ✅ Smooth UI interactions
- ✅ No "Not Responding" warnings

---

## Still Having Issues?

Check these:

### Enable Logging
```javascript
// Add to SearchScreen.js
console.log('🟢 SearchScreen mounted');
console.log('🟡 Starting initialization...');
// ... after each operation
console.log('✅ Initialization complete');
```

### Check Metro Bundler
Look for warnings like:
- "Require cycle detected"
- "Large bundle size"
- "Long initialization time"

### Rebuild Clean
```bash
cd android
./gradlew clean
cd ..
rm -rf node_modules
npm install
npx react-native run-android
```

---

## For Edge Function Migration

Once you implement the Edge Functions (from previous implementation), you'll remove several blocking operations:

**Before (n8n/webhook):**
- ❌ Fetch webhook URL from Supabase (blocking)
- ❌ Initialize Neo4j connection (blocking)
- ❌ Heavy network calls

**After (Edge Functions):**
- ✅ Direct Edge Function calls (faster)
- ✅ No webhook config needed
- ✅ Fewer initialization steps

This will significantly reduce ANR issues! 🚀
