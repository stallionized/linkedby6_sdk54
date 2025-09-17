import React from "react";
import { View, Text, Pressable, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Gradients } from "@/constants/colors";
import { resolveImageSource } from "@/constants/images";

interface BusinessHeroProps {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  ctaText: string;
  onCtaClick?: () => void;
  backgroundImage?: string;
}

const BusinessHero: React.FC<BusinessHeroProps> = ({
  title,
  subtitle,
  ctaText,
  onCtaClick,
  backgroundImage,
}) => {
  const { height: windowHeight, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobile = width < 768;

  return (
    <View
      className="relative w-full overflow-hidden bg-bg-primary"
      style={{ minHeight: windowHeight }}
    >
      {/* Background Image - Centered for business */}
      {backgroundImage && (
        <Image
          source={resolveImageSource(backgroundImage)}
          className="absolute inset-0 w-full h-full"
          contentFit="cover"
          contentPosition="center"
        />
      )}

      {/* Gradient Overlays */}
      <LinearGradient
        colors={["#020408", "rgba(2, 4, 8, 0.6)", "#020408"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        className="absolute inset-0"
      />

      {/* Content - Centered vertically */}
      <View
        className="flex-1 justify-center items-center px-4"
        style={{
          paddingTop: insets.top + 80,
          paddingBottom: 40,
        }}
      >
        <View className="items-center gap-8 max-w-2xl">
          {/* Title */}
          <View>
            <Text
              className="text-white text-center"
              style={{
                fontFamily: "Rajdhani_700Bold",
                fontSize: isMobile ? 48 : 72,
                lineHeight: isMobile ? 52 : 78,
              }}
            >
              {title}
            </Text>
          </View>

          {/* Subtitle */}
          <Text
            className="text-gray-300 text-center"
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: isMobile ? 16 : 20,
              lineHeight: isMobile ? 24 : 28,
              maxWidth: 500,
            }}
          >
            {subtitle}
          </Text>

          {/* CTA Button */}
          <View className="mt-8" style={{ width: isMobile ? "80%" : "auto" }}>
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
                  className="flex-row items-center justify-center gap-3 px-8 py-4 rounded-xl"
                  style={{
                    shadowColor: Colors.brand.glow,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: pressed ? 0.5 : 0.3,
                    shadowRadius: pressed ? 25 : 15,
                    elevation: 10,
                    transform: [{ translateY: pressed ? 0 : -2 }],
                  }}
                >
                  <Text
                    className="text-white text-sm uppercase tracking-widest"
                    style={{ fontFamily: "Inter_700Bold" }}
                  >
                    {ctaText}
                  </Text>
                  <ArrowRight size={20} color="white" />
                </LinearGradient>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
};

export default BusinessHero;
