import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, Pressable, useWindowDimensions, Platform } from "react-native";
import { Image } from "expo-image";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { TestimonialItem } from "@/types";

interface TestimonialsProps {
  title: string;
  subtitle: string;
  items: TestimonialItem[];
}

const CARD_WIDTH = 400;
const CARD_GAP = 24;

// Separate component for testimonial card with hover state
interface TestimonialCardProps {
  item: TestimonialItem;
  index: number;
  isMarquee: boolean;
  cardWidth: number;
  onHoverChange?: (isHovered: boolean) => void;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({
  item,
  index,
  isMarquee,
  cardWidth,
  onHoverChange,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleHoverIn = () => {
    setIsHovered(true);
    onHoverChange?.(true);
  };

  const handleHoverOut = () => {
    setIsHovered(false);
    onHoverChange?.(false);
  };

  // Web-specific wrapper style with transform
  const webWrapperStyle = Platform.OS === "web" && isMarquee ? {
    transform: isHovered ? "translateY(-4px)" : "translateY(0)",
    transition: "transform 0.3s ease",
  } : {};

  return (
    <View
      style={[
        {
          width: cardWidth,
          marginRight: isMarquee ? CARD_GAP : 0,
        },
        webWrapperStyle,
      ]}
    >
      <Pressable
        onHoverIn={handleHoverIn}
        onHoverOut={handleHoverOut}
        style={{
          backgroundColor: "#0B0E14",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {/* Accent Color Bar */}
        <View
          style={{
            height: 4,
            backgroundColor: item.borderColor,
          }}
        />
        {/* Card Content */}
        <View style={{ padding: 32 }}>
        {/* User Info */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <Image
            source={{ uri: item.image }}
            style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: "rgba(255,255,255,0.1)" }}
            contentFit="cover"
          />
          <View>
            <Text
              className="text-white uppercase"
              style={{ fontFamily: "Rajdhani_700Bold", fontSize: 16, letterSpacing: 1 }}
            >
              {item.name}
            </Text>
            <Text
              className="text-gray-400"
              style={{ fontFamily: "Inter_400Regular", fontSize: 12 }}
            >
              {item.role}
            </Text>
          </View>
        </View>

          {/* Testimonial Text */}
          <Text
            className="text-gray-300"
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              lineHeight: 22,
              fontStyle: "italic",
              opacity: 0.9,
            }}
          >
            {item.text}
          </Text>
        </View>
      </Pressable>
    </View>
  );
};

const Testimonials: React.FC<TestimonialsProps> = ({
  title,
  subtitle,
  items,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const isDesktop = screenWidth >= 768;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const translateX = useSharedValue(0);
  const marqueeTranslateX = useSharedValue(0);
  const [isPaused, setIsPaused] = useState(false);

  // Duplicate items for seamless marquee loop
  const marqueeItems = [...items, ...items];
  const totalMarqueeWidth = marqueeItems.length * (CARD_WIDTH + CARD_GAP);
  const singleSetWidth = items.length * (CARD_WIDTH + CARD_GAP);

  // Calculate reading time based on text length
  const getReadingTime = useCallback((text: string) => {
    const wordCount = text.split(/\s+/).length;
    const readingTime = Math.max(5000, wordCount * 200);
    return Math.min(readingTime, 10000);
  }, []);

  // Desktop marquee animation
  useEffect(() => {
    if (!isDesktop || isPaused) return;

    // Reset to start position
    marqueeTranslateX.value = 0;

    // Animate continuously
    marqueeTranslateX.value = withRepeat(
      withTiming(-singleSetWidth, {
        duration: 30000, // 30 seconds for one complete scroll
        easing: Easing.linear,
      }),
      -1, // Infinite repeat
      false // Don't reverse
    );

    return () => {
      cancelAnimation(marqueeTranslateX);
    };
  }, [isDesktop, isPaused, singleSetWidth]);

  // Auto-advance carousel for mobile
  useEffect(() => {
    if (!isAutoPlaying || items.length === 0 || !isMobile) return;

    const currentItem = items[currentIndex];
    const readingTime = getReadingTime(currentItem.text);

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, readingTime);

    return () => clearTimeout(timer);
  }, [currentIndex, isAutoPlaying, items, getReadingTime, isMobile]);

  // Update animation when index changes (mobile)
  useEffect(() => {
    if (isMobile) {
      translateX.value = withTiming(-currentIndex * (screenWidth - 32), {
        duration: 500,
      });
    }
  }, [currentIndex, screenWidth, isMobile]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  }, [items.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  }, [items.length]);

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  }, []);

  const mobileAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const marqueeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: marqueeTranslateX.value }],
  }));


  return (
    <View className="py-24 overflow-hidden" style={{ backgroundColor: "#020408" }}>
      {/* Header */}
      <ScrollReveal direction="down" style={{ marginBottom: 64, paddingHorizontal: 16 }}>
        <Text
          className="text-white text-center uppercase"
          style={{
            fontFamily: "Rajdhani_700Bold",
            fontSize: isDesktop ? 40 : 30,
            marginBottom: 8,
            letterSpacing: 2,
          }}
        >
          {title}
        </Text>
        <Text
          className="text-gray-400 text-center uppercase"
          style={{ fontFamily: "Inter_500Medium", fontSize: 14, letterSpacing: 3 }}
        >
          {subtitle}
        </Text>
      </ScrollReveal>

      {/* Desktop: Marquee scrolling */}
      {isDesktop && (
        <ScrollReveal direction="up" delay={200}>
          <View style={{ position: "relative", width: "100%" }}>
            {/* Left fade gradient */}
            <View
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: 128,
                zIndex: 10,
                ...(Platform.OS === "web"
                  ? { background: "linear-gradient(to right, #020408, transparent)" }
                  : { backgroundColor: "transparent" }),
              }}
              pointerEvents="none"
            />
            {/* Right fade gradient */}
            <View
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                width: 128,
                zIndex: 10,
                ...(Platform.OS === "web"
                  ? { background: "linear-gradient(to left, #020408, transparent)" }
                  : { backgroundColor: "transparent" }),
              }}
              pointerEvents="none"
            />

            {/* Marquee Container */}
            <View style={{ overflow: "hidden" }}>
              <Animated.View
                style={[
                  {
                    flexDirection: "row",
                    paddingHorizontal: 24,
                  },
                  marqueeAnimatedStyle,
                ]}
              >
                {marqueeItems.map((item, index) => (
                  <TestimonialCard
                    key={`marquee-${index}`}
                    item={item}
                    index={index}
                    isMarquee={true}
                    cardWidth={CARD_WIDTH}
                    onHoverChange={(hovered) => setIsPaused(hovered)}
                  />
                ))}
              </Animated.View>
            </View>
          </View>
        </ScrollReveal>
      )}

      {/* Mobile Carousel */}
      {isMobile && (
        <ScrollReveal direction="up" delay={200}>
          <View style={{ paddingHorizontal: 16 }}>
            <View style={{ overflow: "hidden" }}>
              <Animated.View style={[{ flexDirection: "row" }, mobileAnimatedStyle]}>
                {items.map((item, index) => (
                  <View
                    key={index}
                    style={{ width: screenWidth - 32, paddingHorizontal: 0 }}
                  >
                    <TestimonialCard
                      item={item}
                      index={index}
                      isMarquee={false}
                      cardWidth={screenWidth - 32}
                    />
                  </View>
                ))}
              </Animated.View>
            </View>

            {/* Navigation Controls */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 24 }}>
              <Pressable
                onPress={goToPrev}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ChevronLeft size={20} color="white" />
              </Pressable>

              {/* Dot Indicators */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {items.map((_, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => goToIndex(idx)}
                    style={{
                      height: 10,
                      borderRadius: 5,
                      width: idx === currentIndex ? 24 : 10,
                      backgroundColor:
                        idx === currentIndex
                          ? "white"
                          : "rgba(255, 255, 255, 0.3)",
                    }}
                  />
                ))}
              </View>

              <Pressable
                onPress={goToNext}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ChevronRight size={20} color="white" />
              </Pressable>
            </View>
          </View>
        </ScrollReveal>
      )}
    </View>
  );
};

export default Testimonials;
