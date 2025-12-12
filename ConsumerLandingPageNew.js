import React, { useState, useRef, useCallback } from "react";
import { View, useWindowDimensions, ActivityIndicator, Text, StatusBar, Platform } from "react-native";
import { useFonts } from "expo-font";
import {
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import {
  Rajdhani_400Regular,
  Rajdhani_500Medium,
  Rajdhani_600SemiBold,
  Rajdhani_700Bold,
} from "@expo-google-fonts/rajdhani";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

// Import landing page components
import Navbar, { SWIPE_THRESHOLD, SWIPE_VELOCITY_THRESHOLD } from "./components/landing/navigation/Navbar";
import Footer from "./components/landing/navigation/Footer";
import ConsumerPage from "./components/landing/screens/ConsumerPage";
import BusinessPage from "./components/landing/screens/BusinessPage";
import { ScrollContext } from "./contexts/landing/ScrollContext";

const ConsumerLandingPageNew = ({ navigation }) => {
  const [isBusiness, setIsBusiness] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const scrollViewRef = useRef(null);
  const scrollY = useSharedValue(0);
  const menuTranslateX = useSharedValue(0);
  const { width, height: windowHeight } = useWindowDimensions();

  const isMobile = width < 768;
  const isNative = Platform.OS === "ios" || Platform.OS === "android";

  // Initialize menuTranslateX to off-screen
  React.useEffect(() => {
    menuTranslateX.value = width;
  }, [width]);

  // Callback for opening menu (used by runOnJS in gesture handler)
  const openMenu = useCallback(() => setIsMenuOpen(true), []);

  const [fontsLoaded, fontError] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Rajdhani_400Regular,
    Rajdhani_500Medium,
    Rajdhani_600SemiBold,
    Rajdhani_700Bold,
  });

  const togglePage = () => {
    setIsBusiness(!isBusiness);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  };

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Use Reanimated scroll handler for better performance on native
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Swipe gesture to open menu (swipe left) - native only
  const swipeToOpenGesture = Gesture.Pan()
    .activeOffsetX(-20) // Only activate on leftward swipes
    .failOffsetY([-15, 15]) // Fail if vertical movement detected (allow scrolling)
    .onUpdate((event) => {
      // Only allow opening when menu is closed and swiping left
      if (!isMenuOpen && event.translationX < 0) {
        // Map the swipe to menu position (starts from right edge)
        const newTranslateX = Math.max(0, width + event.translationX);
        menuTranslateX.value = newTranslateX;
      }
    })
    .onEnd((event) => {
      if (!isMenuOpen) {
        // Check if swipe was far enough or fast enough to open
        const shouldOpen =
          event.translationX < -SWIPE_THRESHOLD ||
          event.velocityX < -SWIPE_VELOCITY_THRESHOLD;

        if (shouldOpen) {
          menuTranslateX.value = withSpring(0, {
            damping: 20,
            stiffness: 200,
            mass: 0.5,
          });
          runOnJS(openMenu)();
        } else {
          // Snap back to closed
          menuTranslateX.value = withSpring(width, {
            damping: 20,
            stiffness: 200,
            mass: 0.5,
          });
        }
      }
    });

  // Handler for menu state changes from Navbar
  const handleMenuOpenChange = useCallback((open) => {
    setIsMenuOpen(open);
    // Also animate the menu when state changes from button press
    menuTranslateX.value = withSpring(open ? 0 : width, {
      damping: 20,
      stiffness: 200,
      mass: 0.5,
    });
  }, [width, menuTranslateX]);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#020408" }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ color: "#FFFFFF", marginTop: 16, fontWeight: "600" }}>Loading...</Text>
      </View>
    );
  }

  // Render content - wrap with gesture detector on native mobile only
  const scrollContent = (
    <Animated.ScrollView
      ref={scrollViewRef}
      style={{ flex: 1 }}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    >
      {isBusiness ? <BusinessPage /> : <ConsumerPage />}

      <Footer
        isBusiness={isBusiness}
        togglePage={togglePage}
        scrollToTop={scrollToTop}
      />
    </Animated.ScrollView>
  );

  return (
    <ScrollContext.Provider value={{ scrollY, windowHeight }}>
      <View style={{ flex: 1, backgroundColor: "#020408" }}>
        {Platform.OS === "android" && (
          <StatusBar
            translucent
            backgroundColor="transparent"
            barStyle="light-content"
          />
        )}
        <Navbar
          isBusiness={isBusiness}
          togglePage={togglePage}
          scrollY={scrollY}
          isMenuOpen={isMenuOpen}
          onMenuOpenChange={handleMenuOpenChange}
          menuTranslateX={menuTranslateX}
        />

        {/* Wrap scroll content with gesture detector on native mobile */}
        {isMobile && isNative ? (
          <GestureDetector gesture={swipeToOpenGesture}>
            <View style={{ flex: 1 }}>
              {scrollContent}
            </View>
          </GestureDetector>
        ) : (
          scrollContent
        )}
      </View>
    </ScrollContext.Provider>
  );
};

export default ConsumerLandingPageNew;
