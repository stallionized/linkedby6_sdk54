import React, { useState } from "react";
import { View, Text, Pressable, useWindowDimensions, Platform } from "react-native";
import { Plus, X } from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { FAQItem } from "@/types";

interface FAQProps {
  title: string;
  subtitle: string;
  items: FAQItem[];
}

const FAQ: React.FC<FAQProps> = ({ title, subtitle, items }) => {
  const { width } = useWindowDimensions();
  const [openIndex, setOpenIndex] = useState<number>(-1);
  const isDesktop = width >= 768;

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <View style={{ paddingVertical: 96, backgroundColor: "#020408", paddingHorizontal: 16 }}>
      {/* Header */}
      <ScrollReveal direction="down" style={{ marginBottom: 64 }}>
        <Text
          className="text-white text-center uppercase"
          style={{
            fontFamily: "Rajdhani_700Bold",
            fontSize: isDesktop ? 48 : 30,
            marginBottom: 16,
          }}
        >
          {title}
        </Text>
        <Text
          className="text-gray-400 text-center uppercase"
          style={{
            fontFamily: "Inter_500Medium",
            fontSize: 14,
            letterSpacing: 3,
          }}
        >
          {subtitle}
        </Text>
      </ScrollReveal>

      {/* FAQ Items */}
      <View style={{ maxWidth: 896, width: "100%", alignSelf: "center", gap: 16 }}>
        {items.map((item, index) => {
          const isOpen = openIndex === index;

          return (
            <ScrollReveal key={index} direction="up" delay={index * 100}>
              <FAQItemComponent
                item={item}
                isOpen={isOpen}
                onToggle={() => toggleItem(index)}
              />
            </ScrollReveal>
          );
        })}
      </View>
    </View>
  );
};

interface FAQItemComponentProps {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}

const FAQItemComponent: React.FC<FAQItemComponentProps> = ({
  item,
  isOpen,
  onToggle,
}) => {
  const [isHovered, setIsHovered] = useState(false);

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
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: isOpen ? "#0B1221" : (isHovered ? "rgba(255,255,255,0.05)" : "transparent"),
        borderWidth: isOpen ? 1 : 0,
        borderColor: isOpen ? "rgba(30, 58, 138, 0.5)" : "transparent",
        ...(Platform.OS === "web" ? { transition: "all 0.3s ease" } : {}),
      }}
    >
      <Pressable
        onPress={onToggle}
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
          padding: 20,
        }}
      >
        {/* Icon on LEFT */}
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: isOpen ? "#3B82F6" : "rgba(59, 130, 246, 0.2)",
            alignItems: "center",
            justifyContent: "center",
            ...(Platform.OS === "web" ? { transition: "background-color 0.3s ease" } : {}),
          }}
        >
          {isOpen ? (
            <X size={14} strokeWidth={3} color="#FFFFFF" />
          ) : (
            <Plus size={14} strokeWidth={3} color="#60A5FA" />
          )}
        </View>

        {/* Question text */}
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 14,
            color: isOpen ? "#FFFFFF" : "#D1D5DB",
            flex: 1,
          }}
        >
          {item.question}
        </Text>
      </Pressable>

      <Animated.View style={contentStyle}>
        <View
          style={{
            paddingHorizontal: 20,
            paddingBottom: 20,
            paddingLeft: 60, // Align with text (20 padding + 24 icon + 16 gap)
          }}
        >
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              lineHeight: 22,
              color: "#9CA3AF",
            }}
          >
            {item.answer}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
};

export default FAQ;
