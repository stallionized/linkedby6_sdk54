import React from "react";
import { View, Text, Pressable, useWindowDimensions, TextInput, Platform } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight, Sparkles } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Gradients } from "../../../constants/landing/colors";
import { scale, scaleFont, scaleSpacing } from "../../../utils/landing/scaling";
import ScrollReveal from "../ui/ScrollReveal";

interface HeroProps {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  mobileSubtitle?: React.ReactNode;
  ctaText: string;
  onCtaClick?: () => void;
  backgroundImage?: string;
  showPhoneInput?: boolean;
}

const Hero: React.FC<HeroProps> = ({
  title,
  subtitle,
  mobileSubtitle,
  ctaText,
  onCtaClick,
  backgroundImage = "https://images.unsplash.com/photo-1763806787199-8cb1a4606758?q=100&w=2726&auto=format&fit=crop",
  showPhoneInput = false,
}) => {
  const { height: windowHeight, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobile = width < 768;
  const isXL = width >= 1024;

  return (
    <View
      className="relative w-full overflow-hidden bg-bg-primary"
      style={{ minHeight: windowHeight }}
    >
      {/* Background Image */}
      {Platform.OS === "web" ? (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "stretch",
            backgroundColor: "#020408",
            pointerEvents: "none",
          }}
        >
          <img
            src={backgroundImage}
            alt="Background"
            style={{
              maxWidth: 1920,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "90% 55%",
              userSelect: "none",
              flexShrink: 0,
            }}
          />
        </div>
      ) : (
        <Image
          source={{ uri: backgroundImage }}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
          contentFit="cover"
          contentPosition={isMobile ? { top: "50%", left: "88%" } : { top: "55%", left: "90%" }}
        />
      )}


      {/* Floating AI Input Card - Desktop Only (XL breakpoint) */}
      {showPhoneInput && isXL && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "stretch",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "relative",
              maxWidth: 1920,
              width: "100%",
              height: "100%",
            }}
          >
            <View
              style={{
                position: "absolute",
                bottom: "46%",
                right: "13%",  // Adjusted to center over phone
                width: "23.4%",  // 450px at 1920px viewport, scales proportionally
                minWidth: 350,   // Prevent card from getting too small
                zIndex: 20,
              }}
              pointerEvents="box-none"
            >
          {/* Connection Line to Hand (Decorative) */}
          <LinearGradient
            colors={["transparent", "rgba(34, 211, 238, 0.5)", "transparent"]}
            start={{ x: 0.5, y: 1 }}
            end={{ x: 0.5, y: 0 }}
            style={{
              position: "absolute",
              bottom: -128,
              left: "50%",
              width: 1,
              height: 128,
              marginLeft: -0.5,
            }}
          />

          {/* Input Card */}
          <View style={{ position: "relative" }}>
            {/* Animated Border Glow */}
            <LinearGradient
              colors={["#3B82F6", "#22D3EE", "#2563EB"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                position: "absolute",
                top: -4,
                left: -4,
                right: -4,
                bottom: -4,
                borderRadius: 16,
                opacity: 0.5,
                ...(Platform.OS === "web" ? { filter: "blur(4px)" } : {}),
              }}
            />

            <View
              style={{
                backgroundColor: "rgba(11, 14, 20, 0.8)",
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.1)",
                borderRadius: 12,
                overflow: "hidden",
                ...(Platform.OS === "web"
                  ? {
                      backdropFilter: "blur(24px)",
                      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                    }
                  : {
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 25 },
                      shadowOpacity: 0.25,
                      shadowRadius: 50,
                      elevation: 20,
                    }),
              }}
            >
              {/* Header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(255, 255, 255, 0.1)",
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                }}
              >
                {/* Dots */}
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: "#2563EB",
                    }}
                  />
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: "#60A5FA",
                    }}
                  />
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: "#22D3EE",
                    }}
                  />
                </View>

                {/* AI Assistant Label */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Sparkles size={12} color="#22D3EE" />
                  <Text
                    style={{
                      fontFamily: "Inter_700Bold",
                      fontSize: 10,
                      color: "#22D3EE",
                      textTransform: "uppercase",
                      letterSpacing: 2,
                    }}
                  >
                    AI Assistant
                  </Text>
                </View>
              </View>

              {/* Text Area */}
              <View style={{ padding: 4 }}>
                <TextInput
                  placeholder="Example: I need a certified electrician for a panel upgrade..."
                  placeholderTextColor="#6B7280"
                  multiline
                  numberOfLines={4}
                  style={{
                    width: "100%",
                    height: 128,
                    backgroundColor: "rgba(5, 7, 10, 0.5)",
                    color: "#FFFFFF",
                    padding: 16,
                    fontSize: 18,
                    lineHeight: 26,
                    borderRadius: 8,
                    fontFamily: "Inter_400Regular",
                    textAlignVertical: "top",
                  }}
                />
              </View>

              {/* Footer */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderTopWidth: 1,
                  borderTopColor: "rgba(255, 255, 255, 0.05)",
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 10,
                    color: "#6B7280",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Press Enter to search
                </Text>
                <Pressable
                  style={{
                    backgroundColor: "#2563EB",
                    paddingHorizontal: 20,
                    paddingVertical: 6,
                    borderRadius: 4,
                    ...(Platform.OS === "web"
                      ? { boxShadow: "0 0 15px rgba(37, 99, 235, 0.4)" }
                      : {
                          shadowColor: "#2563EB",
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.4,
                          shadowRadius: 15,
                          elevation: 5,
                        }),
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter_700Bold",
                      fontSize: 10,
                      color: "#FFFFFF",
                      textTransform: "uppercase",
                      letterSpacing: 2,
                    }}
                  >
                    Send
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
            </View>
          </div>
        </div>
      )}

      {/* Content */}
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          maxWidth: 1280,
          width: "100%",
          alignSelf: "center",
          paddingHorizontal: scaleSpacing(16, width),
          paddingTop: insets.top + scaleSpacing(80, width),
          paddingBottom: isMobile ? scaleSpacing(100, width) : 40,
          zIndex: 10,
        }}
      >
        {/* Content container - half width on XL, full on mobile */}
        <View
          style={{
            width: isXL ? "50%" : "100%",
            alignItems: isMobile ? "center" : "flex-start",
            gap: scaleSpacing(32, width),
          }}
        >
          {/* Title */}
          <ScrollReveal direction="up" delay={100} distance={40} animateOnMount>
            <View>
              <Text
                style={{
                  fontFamily: "Rajdhani_700Bold",
                  fontSize: isMobile ? scaleFont(48, width) : isXL ? 72 : 60,
                  lineHeight: isMobile ? scaleFont(52, width) : isXL ? 78 : 66,
                  color: "#FFFFFF",
                  textAlign: isMobile ? "center" : "left",
                }}
              >
                {title}
              </Text>
            </View>
          </ScrollReveal>

          {/* Subtitle */}
          <ScrollReveal direction="up" delay={250} distance={40} animateOnMount>
            <View
              style={{
                borderLeftWidth: isXL ? 2 : 0,
                borderLeftColor: "#3B82F6",
                paddingLeft: isXL ? 24 : 0,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: isMobile ? scaleFont(16, width) : 20,
                  lineHeight: isMobile ? scaleFont(24, width) : 28,
                  color: "#D1D5DB",
                  maxWidth: scale(500, width),
                  textAlign: isMobile ? "center" : "left",
                }}
              >
                {isMobile && mobileSubtitle ? mobileSubtitle : subtitle}
              </Text>
            </View>
          </ScrollReveal>

          {/* Mobile Input Field */}
          {showPhoneInput && isMobile && (
            <ScrollReveal direction="up" delay={400} distance={30} animateOnMount>
              <View
                style={{
                  width: "85%",
                  maxWidth: scale(300, width),
                }}
              >
                <View
                  style={{
                    backgroundColor: "rgba(11, 14, 20, 0.9)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: scale(16, width),
                    paddingHorizontal: scaleSpacing(16, width),
                    paddingTop: scaleSpacing(12, width),
                    paddingBottom: scaleSpacing(16, width),
                  }}
                >
                  <TextInput
                    placeholder="Describe the service you need..."
                    placeholderTextColor="#6B7280"
                    multiline
                    scrollEnabled={true}
                    style={{
                      color: "#FFFFFF",
                      fontSize: scaleFont(12, width),
                      lineHeight: scaleFont(18, width),
                      fontFamily: "Inter_400Regular",
                      textAlignVertical: "top",
                      height: scale(80, width),
                      maxHeight: scale(80, width),
                    }}
                  />
                </View>
              </View>
            </ScrollReveal>
          )}

          {/* CTA Button */}
          <ScrollReveal direction="up" delay={isMobile ? 550 : 400} distance={30} animateOnMount>
            <View
              style={{
                width: isMobile ? "66%" : "auto",
                maxWidth: isMobile ? scale(300, width) : undefined,
                marginTop: isMobile ? scaleSpacing(128, width) : 0,
                alignSelf: isMobile ? "center" : "flex-start",
              }}
            >
              <Pressable onPress={onCtaClick}>
                {({ pressed }) => (
                  <LinearGradient
                    colors={
                      pressed
                        ? (Gradients.brandHover as [string, string])
                        : (Gradients.brand as [string, string])
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: scaleSpacing(12, width),
                      paddingHorizontal: scaleSpacing(32, width),
                      paddingVertical: scaleSpacing(16, width),
                      borderRadius: scale(12, width),
                      shadowColor: Colors.brand.glow,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: pressed ? 0.5 : 0.3,
                      shadowRadius: pressed ? 12 : 8,
                      elevation: 5,
                      transform: [{ translateY: pressed ? 0 : -2 }],
                      ...(Platform.OS === "web"
                        ? { boxShadow: `0 0 30px rgba(0, 194, 255, ${pressed ? 0.5 : 0.3})` }
                        : {}),
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter_700Bold",
                        fontSize: scaleFont(14, width),
                        color: "#FFFFFF",
                        textTransform: "uppercase",
                        letterSpacing: scale(3, width),
                      }}
                    >
                      {ctaText}
                    </Text>
                    <ArrowRight size={scale(20, width)} color="white" />
                  </LinearGradient>
                )}
              </Pressable>
            </View>
          </ScrollReveal>
        </View>
      </View>
    </View>
  );
};

export default Hero;
