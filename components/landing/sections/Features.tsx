import React from "react";
import { View, Text, useWindowDimensions, Platform } from "react-native";
import { FeatureItem } from "../../../types/landing";
import ScrollReveal from "../ui/ScrollReveal";
import { Colors } from "../../../constants/landing/colors";
import { scale, scaleFont, scaleSpacing } from "../../../utils/landing/scaling";

interface FeaturesProps {
  title: string;
  subtitle: string;
  features: FeatureItem[];
}

const Features: React.FC<FeaturesProps> = ({ title, subtitle, features }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  const getNumColumns = () => {
    if (isMobile) return 1;
    if (isTablet) return 2;
    return 3;
  };

  const numColumns = getNumColumns();

  return (
    <View className="py-24 relative" style={{ backgroundColor: "#020408", paddingVertical: isMobile ? scaleSpacing(96, width) : 96 }}>
      {/* Ambient Background Glow */}
      <View
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: 500,
          height: 500,
          backgroundColor: "rgba(30, 58, 138, 0.1)",
          borderRadius: 250,
          ...(Platform.OS === "web" ? { filter: "blur(120px)" } : {}),
        }}
        pointerEvents="none"
      />

      <View className="mx-auto px-4 relative z-10" style={{ maxWidth: 1280, width: "100%", paddingHorizontal: isMobile ? scaleSpacing(16, width) : 16 }}>
        {/* Header */}
        <ScrollReveal direction="down" style={{ marginBottom: isMobile ? scaleSpacing(64, width) : 64 }}>
          <Text
            className="text-white text-center uppercase"
            style={{
              fontFamily: "Rajdhani_700Bold",
              fontSize: isMobile ? scaleFont(30, width) : isDesktop ? 48 : 30,
              marginBottom: scaleSpacing(16, width),
            }}
          >
            {title}
          </Text>
          <Text
            className="text-gray-400 text-center uppercase"
            style={{
              fontFamily: "Inter_500Medium",
              fontSize: isMobile ? scaleFont(14, width) : 14,
              letterSpacing: isMobile ? scale(3, width) : 3,
            }}
          >
            {subtitle}
          </Text>
        </ScrollReveal>

        {/* Features Grid */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: isMobile ? scaleSpacing(24, width) : 24,
          }}
        >
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <ScrollReveal
                key={index}
                direction="up"
                delay={index * 100}
                style={{
                  width: isMobile ? "100%" : isTablet ? "47%" : "32%",
                  maxWidth: 450,
                }}
              >
                <View
                  style={{
                    padding: isMobile ? scaleSpacing(32, width) : 32,
                    borderRadius: isMobile ? scale(12, width) : 12,
                    borderWidth: 1,
                    borderColor: "rgba(59, 130, 246, 0.2)",
                    alignItems: "center",
                    ...(isMobile ? {} : { height: "100%" }),
                    ...(Platform.OS === "web"
                      ? { background: "linear-gradient(to bottom, #0B0E14, #05070A)" }
                      : { backgroundColor: "#0B0E14" }),
                  }}
                >
                  {/* Icon Circle */}
                  <View
                    style={{
                      width: isMobile ? scale(64, width) : 64,
                      height: isMobile ? scale(64, width) : 64,
                      borderRadius: isMobile ? scale(32, width) : 32,
                      backgroundColor: "rgba(59, 130, 246, 0.1)",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: isMobile ? scaleSpacing(24, width) : 24,
                      ...(Platform.OS === "web"
                        ? { boxShadow: "0 0 20px rgba(0, 122, 255, 0.1)" }
                        : {
                            shadowColor: "#007AFF",
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.2,
                            shadowRadius: 20,
                          }),
                    }}
                  >
                    <IconComponent size={isMobile ? scale(32, width) : 32} color={Colors.brand.glow} />
                  </View>

                  {/* Title */}
                  <Text
                    className="text-white text-center mb-4 uppercase"
                    style={{
                      fontFamily: "Rajdhani_700Bold",
                      fontSize: isMobile ? scaleFont(18, width) : 18,
                      letterSpacing: 1,
                      marginBottom: isMobile ? scaleSpacing(16, width) : 16,
                    }}
                  >
                    {feature.title}
                  </Text>

                  {/* Description */}
                  <Text
                    className="text-gray-400 text-center"
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: isMobile ? scaleFont(14, width) : 14,
                      lineHeight: isMobile ? scaleFont(22, width) : 22,
                    }}
                  >
                    {feature.description}
                  </Text>
                </View>
              </ScrollReveal>
            );
          })}
        </View>
      </View>
    </View>
  );
};

export default Features;
