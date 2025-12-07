import React, { useState, useRef, useEffect } from "react";
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
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Import landing page components
import Navbar from "./components/landing/navigation/Navbar";
import Footer from "./components/landing/navigation/Footer";
import ConsumerPage from "./components/landing/screens/ConsumerPage";
import BusinessPage from "./components/landing/screens/BusinessPage";
import { ScrollContext } from "./contexts/landing/ScrollContext";

const ConsumerLandingPageNew = ({ navigation }) => {
  const [isBusiness, setIsBusiness] = useState(false);
  const scrollViewRef = useRef(null);
  const scrollY = useSharedValue(0);
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

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

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#020408" }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ color: "#FFFFFF", marginTop: 16, fontWeight: "600" }}>Loading...</Text>
      </View>
    );
  }

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
        />

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
      </View>
    </ScrollContext.Provider>
  );
};

export default ConsumerLandingPageNew;
