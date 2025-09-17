import React from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { LocalImages } from "@/constants/images";

const Creator: React.FC = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const stats = [
    { value: "15+", label: "Years Experience" },
    { value: "100K+", label: "Connections Built" },
    { value: "50+", label: "Industries Served" },
  ];

  return (
    <View className="py-24 bg-bg-primary px-4">
      <View className="max-w-5xl mx-auto">
        <View className={`${isMobile ? "" : "flex-row gap-12 items-center"}`}>
          {/* Image */}
          <ScrollReveal
            direction="left"
            className={`${isMobile ? "mb-8" : "flex-1"}`}
          >
            <View className="bg-bg-secondary rounded-2xl overflow-hidden border border-white/10">
              <Image
                source={LocalImages.foundersPhoto}
                className="w-full aspect-[4/5]"
                contentFit="cover"
              />
            </View>
          </ScrollReveal>

          {/* Content */}
          <ScrollReveal
            direction="right"
            delay={200}
            className={`${isMobile ? "" : "flex-1"}`}
          >
            <Text
              className="text-sm text-blue-400 mb-2 uppercase tracking-widest"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              Meet the Founder
            </Text>

            <Text
              className="text-3xl text-white mb-4 uppercase tracking-wider"
              style={{ fontFamily: "Rajdhani_700Bold" }}
            >
              Building Trust Through Connections
            </Text>

            <Text
              className="text-gray-400 mb-6 leading-relaxed"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              With over 15 years of experience in building professional
              networks, our founder understood that the most valuable
              recommendations come from people you know and trust. Linked By Six
              was born from the simple idea that everyone is connected through
              just six degrees of separation, and those connections can help
              you find the best services for your needs.
            </Text>

            <Text
              className="text-gray-400 mb-8 leading-relaxed"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              Our mission is to transform how people discover and connect with
              service providers by leveraging the power of their existing
              relationships. We believe that trust is earned through
              connections, not algorithms.
            </Text>

            {/* Stats */}
            <View className="flex-row flex-wrap gap-8">
              {stats.map((stat, index) => (
                <View key={index}>
                  <Text
                    className="text-3xl text-white mb-1"
                    style={{ fontFamily: "Rajdhani_700Bold" }}
                  >
                    {stat.value}
                  </Text>
                  <Text
                    className="text-gray-500 text-sm uppercase tracking-wider"
                    style={{ fontFamily: "Inter_500Medium" }}
                  >
                    {stat.label}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollReveal>
        </View>
      </View>
    </View>
  );
};

export default Creator;
