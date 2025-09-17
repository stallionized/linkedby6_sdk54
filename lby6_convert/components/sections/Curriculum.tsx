import React from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { resolveImageSource } from "@/constants/images";

interface CurriculumContent {
  id: number;
  title: string;
  description: string;
  topics: string[];
  imageUrl: string;
}

interface CurriculumProps {
  title: string;
  content: CurriculumContent;
}

const Curriculum: React.FC<CurriculumProps> = ({ title, content }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View className="py-24 bg-[#020408] relative overflow-hidden">
      {/* Section Title */}
      <View
        className="mx-auto px-4 relative z-10"
        style={{ maxWidth: 1152, width: "100%" }}
      >
        <ScrollReveal direction="down" style={{ marginBottom: 64 }}>
          <Text
            className="text-white text-center uppercase tracking-wide"
            style={{
              fontFamily: "Rajdhani_700Bold",
              fontSize: isMobile ? 28 : 48,
            }}
          >
            {title}
          </Text>
        </ScrollReveal>

        {/* Content Card */}
        <ScrollReveal direction="up" delay={200}>
          <View
            className="relative border border-white/20 rounded-2xl bg-[#0B0E14] overflow-hidden"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 25 },
              shadowOpacity: 0.25,
              shadowRadius: 50,
              elevation: 25,
            }}
          >
            <View className={isMobile ? "" : "flex-row"}>
              {/* Left: Image - 50% width on desktop */}
              <View
                className="relative overflow-hidden"
                style={isMobile ? { height: 256 } : { width: "50%", minHeight: 350 }}
              >
                {/* Blue overlay */}
                <View
                  className="absolute inset-0 z-10"
                  style={{ backgroundColor: "rgba(30, 58, 138, 0.2)" }}
                />
                <Image
                  source={resolveImageSource(content.imageUrl)}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              </View>

              {/* Right: Text - 50% width on desktop */}
              <View
                className="relative"
                style={
                  isMobile
                    ? { padding: 32 }
                    : { width: "50%", paddingHorizontal: 48, paddingVertical: 48 }
                }
              >
                <Text
                  className="text-white mb-4"
                  style={{
                    fontFamily: "Rajdhani_700Bold",
                    fontSize: isMobile ? 20 : 24,
                  }}
                >
                  {content.title}
                </Text>

                <Text
                  className="text-gray-400 mb-6"
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 14,
                    lineHeight: 22,
                  }}
                >
                  {content.description}
                </Text>

                {/* Topics List */}
                <View style={{ gap: 12 }}>
                  {content.topics.map((topic, index) => (
                    <View
                      key={index}
                      style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}
                    >
                      {/* Cyan dot bullet */}
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: "#22d3ee",
                          marginTop: 6,
                          flexShrink: 0,
                        }}
                      />
                      <Text
                        style={{
                          fontFamily: "Inter_400Regular",
                          fontSize: 14,
                          lineHeight: 20,
                          color: "#d1d5db",
                          flex: 1,
                        }}
                      >
                        {topic}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </ScrollReveal>
      </View>
    </View>
  );
};

export default Curriculum;
