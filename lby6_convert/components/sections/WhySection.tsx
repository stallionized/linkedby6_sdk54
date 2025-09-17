import React, { useState } from "react";
import { View, Text, Pressable, useWindowDimensions, Platform } from "react-native";
import { Image } from "expo-image";
import { Plus, X } from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { AccordionItem } from "@/types";
import { Colors } from "@/constants/colors";
import { resolveImageSource } from "@/constants/images";
import { scale, scaleFont, scaleSpacing } from "@/utils/scaling";

interface WhySectionProps {
  title: string;
  description: string;
  accordionData: AccordionItem[];
  imageSrc: string;
  imageAlt: string;
}

const WhySection: React.FC<WhySectionProps> = ({
  title,
  description,
  accordionData,
  imageSrc,
}) => {
  const { width } = useWindowDimensions();
  const [openId, setOpenId] = useState<number | null>(null);
  const isDesktop = width >= 768;

  const toggleAccordion = (id: number) => {
    setOpenId(openId === id ? null : id);
  };

  // Determine which image to show
  const activeItem = accordionData.find((item) => item.id === openId);
  const currentImage = activeItem?.image || accordionData[0]?.image || imageSrc;
  const isMobile = !isDesktop;

  return (
    <View className="py-24 relative overflow-hidden" style={{ paddingVertical: isMobile ? scaleSpacing(96, width) : 96 }}>
      {/* Ambient Background Spot */}
      <View
        style={{
          position: "absolute",
          left: 0,
          top: "50%",
          width: 500,
          height: 500,
          backgroundColor: "rgba(30, 58, 138, 0.2)",
          borderRadius: 250,
          ...(Platform.OS === "web" ? { filter: "blur(100px)", transform: "translateY(-50%)" } : {}),
        }}
        pointerEvents="none"
      />

      <View className="mx-auto px-4 relative z-10" style={{ maxWidth: 1280, width: "100%", paddingHorizontal: isMobile ? scaleSpacing(16, width) : 16 }}>
        {/* Title */}
        <ScrollReveal direction="down">
          <View className="text-center mb-16" style={{ marginBottom: isMobile ? scaleSpacing(64, width) : 64 }}>
            <Text
              className="text-white text-center mb-4 uppercase"
              style={{
                fontFamily: "Rajdhani_700Bold",
                fontSize: isMobile ? scaleFont(30, width) : isDesktop ? 48 : 30,
              }}
            >
              {title}
            </Text>
          </View>
        </ScrollReveal>

        {/* Grid Layout */}
        <View
          style={{
            flexDirection: isDesktop ? "row" : "column",
            gap: isMobile ? scaleSpacing(48, width) : 48,
            alignItems: "center",
          }}
        >
          {/* Accordion Side */}
          <ScrollReveal direction="left" delay={200} style={{ flex: 1, width: "100%" }}>
            <View>
              {/* Description */}
              <Text
                className="text-gray-400 mb-8"
                style={{
                  fontFamily: "Inter_400Regular",
                  lineHeight: isMobile ? scaleFont(24, width) : 24,
                  fontSize: isMobile ? scaleFont(14, width) : 14,
                  marginBottom: isMobile ? scaleSpacing(32, width) : 32,
                }}
              >
                {description}
              </Text>

              {/* Accordion Items */}
              <View style={{ gap: isMobile ? scaleSpacing(12, width) : 12 }}>
                {accordionData.map((item) => {
                  const isOpen = openId === item.id;
                  return (
                    <AccordionItemComponent
                      key={item.id}
                      item={item}
                      isOpen={isOpen}
                      onToggle={() => toggleAccordion(item.id)}
                      showMobileImage={!isDesktop}
                      screenWidth={width}
                    />
                  );
                })}
              </View>

              {/* Footnote */}
              <Text
                className="text-gray-500 mt-6"
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: isMobile ? scaleFont(14, width) : 14,
                  marginTop: isMobile ? scaleSpacing(24, width) : 24,
                }}
              >
                Contact mapping is based on the contact information uploaded by Linked By Six users.
              </Text>
            </View>
          </ScrollReveal>

          {/* Image Side - Desktop Only */}
          {isDesktop && (
            <ScrollReveal direction="right" delay={400} style={{ flex: 1 }}>
              <View className="relative">
                {/* Background decoration */}
                <View
                  style={{
                    position: "absolute",
                    right: -16,
                    bottom: -16,
                    width: "100%",
                    height: "100%",
                    borderWidth: 2,
                    borderColor: "rgba(37, 99, 235, 0.3)",
                    borderRadius: 12,
                    zIndex: -1,
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    right: -16,
                    bottom: -16,
                    width: "66%",
                    height: "66%",
                    backgroundColor: "rgba(37, 99, 235, 0.2)",
                    zIndex: -1,
                    ...(Platform.OS === "web" ? { filter: "blur(40px)" } : {}),
                  }}
                />

                {/* Image Container */}
                <View
                  className="rounded-xl overflow-hidden border border-white/10"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 25 },
                    shadowOpacity: 0.5,
                    shadowRadius: 50,
                    elevation: 20,
                  }}
                >
                  <Image
                    source={resolveImageSource(currentImage)}
                    style={{ width: "100%", aspectRatio: 4 / 3 }}
                    contentFit="cover"
                    transition={500}
                  />
                  {/* Overlay Gradient */}
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      ...(Platform.OS === "web"
                        ? { background: "linear-gradient(to top right, rgba(30, 58, 138, 0.4), transparent)" }
                        : { backgroundColor: "rgba(30, 58, 138, 0.2)" }),
                    }}
                  />
                </View>
              </View>
            </ScrollReveal>
          )}
        </View>
      </View>
    </View>
  );
};

interface AccordionItemComponentProps {
  item: AccordionItem;
  isOpen: boolean;
  onToggle: () => void;
  showMobileImage?: boolean;
  screenWidth: number;
}

const AccordionItemComponent: React.FC<AccordionItemComponentProps> = ({
  item,
  isOpen,
  onToggle,
  showMobileImage = false,
  screenWidth,
}) => {
  const isMobile = screenWidth < 768;

  const contentStyle = useAnimatedStyle(() => ({
    maxHeight: withTiming(isOpen ? 500 : 0, {
      duration: 300,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    }),
    opacity: withTiming(isOpen ? 1 : 0, { duration: 200 }),
  }));

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: isOpen ? "rgba(0, 194, 255, 0.5)" : "rgba(255, 255, 255, 0.1)",
        borderRadius: isMobile ? scale(8, screenWidth) : 8,
        overflow: "hidden",
        backgroundColor: isOpen ? "rgba(255, 255, 255, 0.1)" : "transparent",
        ...(isOpen && Platform.OS === "web"
          ? { boxShadow: "0 0 15px rgba(0, 194, 255, 0.15)" }
          : {}),
      }}
    >
      <Pressable
        onPress={onToggle}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? scaleSpacing(16, screenWidth) : 16,
        }}
      >
        <Text
          style={{
            fontFamily: "Rajdhani_700Bold",
            fontSize: isMobile ? scaleFont(18, screenWidth) : 18,
            color: isOpen ? "#FFFFFF" : "#D1D5DB",
            flex: 1,
            paddingRight: isMobile ? scaleSpacing(16, screenWidth) : 16,
          }}
        >
          {item.title}
        </Text>
        <View
          style={{
            borderRadius: 999,
            padding: isMobile ? scale(4, screenWidth) : 4,
            backgroundColor: isOpen ? Colors.brand.glow : "rgba(255, 255, 255, 0.1)",
          }}
        >
          {isOpen ? (
            <X size={isMobile ? scale(14, screenWidth) : 14} color={isOpen ? "#000000" : Colors.brand.glow} />
          ) : (
            <Plus size={isMobile ? scale(14, screenWidth) : 14} color={Colors.brand.glow} />
          )}
        </View>
      </Pressable>

      <Animated.View style={contentStyle} className="overflow-hidden">
        <View
          style={{
            paddingHorizontal: isMobile ? scaleSpacing(16, screenWidth) : 16,
            paddingBottom: isMobile ? scaleSpacing(16, screenWidth) : 16,
            borderTopWidth: 1,
            borderTopColor: "rgba(255, 255, 255, 0.05)",
            marginTop: isMobile ? scaleSpacing(8, screenWidth) : 8,
          }}
        >
          <Text
            className="text-gray-400 mb-4"
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: isMobile ? scaleFont(14, screenWidth) : 14,
              lineHeight: isMobile ? scaleFont(22, screenWidth) : 22,
              marginBottom: isMobile ? scaleSpacing(16, screenWidth) : 16,
            }}
          >
            {item.content}
          </Text>

          {/* Mobile Image */}
          {showMobileImage && item.image && (
            <View
              className="rounded-lg overflow-hidden border border-white/10"
              style={{
                marginTop: isMobile ? scaleSpacing(8, screenWidth) : 8,
                borderRadius: isMobile ? scale(8, screenWidth) : 8,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              <Image
                source={resolveImageSource(item.image)}
                style={{ width: "100%", aspectRatio: 16 / 9 }}
                contentFit="cover"
              />
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  );
};

export default WhySection;
