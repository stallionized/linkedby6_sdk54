import React, { useEffect } from "react";
import { View, Text, Platform } from "react-native";
import { Briefcase } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { professions } from "@/constants/data";

const LogoTicker: React.FC = () => {
  const translateX = useSharedValue(0);

  // Calculate approximate width for animation
  const ITEM_WIDTH = 220; // Average item width including gap
  const TOTAL_WIDTH = professions.length * ITEM_WIDTH;
  const DURATION = 360000; // 360 seconds for slow scroll

  useEffect(() => {
    translateX.value = 0;
    translateX.value = withRepeat(
      withTiming(-TOTAL_WIDTH, {
        duration: DURATION,
        easing: Easing.linear,
      }),
      -1, // infinite
      false
    );

    return () => {
      cancelAnimation(translateX);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const renderItem = (item: string, index: number, prefix: string) => (
    <View
      key={`${prefix}-${index}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginRight: 48, // gap-12 = 48px
      }}
    >
      <Briefcase size={20} color="#22D3EE" />
      <Text
        style={{
          fontFamily: "Rajdhani_700Bold",
          fontSize: 18,
          color: "#FFFFFF",
        }}
      >
        {item}
      </Text>
    </View>
  );

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
        backgroundColor: "#020408",
      }}
    >
      <ScrollReveal direction="none" duration={1000}>
        <View style={{ maxWidth: 1280, width: "100%", alignSelf: "center", paddingHorizontal: 16, paddingVertical: 32 }}>
          <Text
            style={{
              textAlign: "center",
              fontSize: 14,
              color: "#9CA3AF",
              marginBottom: 32,
              textTransform: "uppercase",
              letterSpacing: 3,
              fontFamily: "Inter_500Medium",
            }}
          >
            Discover trusted professionals across every industry
          </Text>

          <View style={{ position: "relative", overflow: "hidden" }}>
            {/* Left Fade Gradient */}
            <View
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: 64,
                zIndex: 10,
                ...(Platform.OS === "web"
                  ? { background: "linear-gradient(to right, #020408, transparent)" }
                  : { backgroundColor: "transparent" }),
              }}
              pointerEvents="none"
            />

            {/* Right Fade Gradient */}
            <View
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                width: 64,
                zIndex: 10,
                ...(Platform.OS === "web"
                  ? { background: "linear-gradient(to left, #020408, transparent)" }
                  : { backgroundColor: "transparent" }),
              }}
              pointerEvents="none"
            />

            {/* Animated Container */}
            <Animated.View
              style={[
                animatedStyle,
                {
                  flexDirection: "row",
                  flexWrap: "nowrap",
                  opacity: 0.6,
                  paddingHorizontal: 24,
                },
              ]}
            >
              {/* First Set */}
              {professions.map((item, i) => renderItem(item, i, "a"))}
              {/* Second Set (Duplicate for seamless loop) */}
              {professions.map((item, i) => renderItem(item, i, "b"))}
            </Animated.View>
          </View>
        </View>
      </ScrollReveal>
    </View>
  );
};

export default LogoTicker;
