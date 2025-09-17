import React, { useState, useRef } from "react";
import { View, useWindowDimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from "react-native-reanimated";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import ConsumerPage from "@/components/screens/ConsumerPage";
import BusinessPage from "@/components/screens/BusinessPage";
import { ScrollContext } from "@/contexts/ScrollContext";

export default function Index() {
  const [isBusiness, setIsBusiness] = useState(false);
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const scrollY = useSharedValue(0);
  const { height: windowHeight } = useWindowDimensions();

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

  return (
    <ScrollContext.Provider value={{ scrollY, windowHeight }}>
      <View className="flex-1 bg-bg-primary">
        <Navbar
          isBusiness={isBusiness}
          togglePage={togglePage}
          scrollY={scrollY}
        />

        <Animated.ScrollView
          ref={scrollViewRef}
          className="flex-1"
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
}
