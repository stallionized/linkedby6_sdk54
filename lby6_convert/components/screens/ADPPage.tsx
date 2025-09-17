import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  useWindowDimensions,
} from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react-native";
import { VIMEO_VIDEO_ID } from "@/constants/data";

interface Slide {
  title: string;
  subtitle?: string;
  content?: string;
  bullets?: string[];
  boxes?: { title: string; content: string }[];
  highlight?: { title: string; content: string };
  extraBox?: { title: string; content: string };
  cta?: { title: string; content: string };
  footer?: string;
  slideNumber?: string;
  type?: string;
}

const slides: Slide[] = [
  {
    title: "Linked By Six",
    subtitle: "Connecting People to Businesses Through Their Network",
    content: "A Strategic Investment & Partnership Opportunity for ADP",
    type: "title",
  },
  {
    title: "The Problem",
    content:
      "Consumers struggle to find trustworthy businesses and service providers",
    bullets: [
      "Traditional directories lack personal trust signals",
      "Online reviews can be fake or manipulated (especially on email-based platforms)",
      "Word-of-mouth recommendations are powerful but limited to immediate contacts",
      "Businesses waste resources on broad, untargeted marketing",
      "Consumers often pay higher prices without personal connections",
    ],
    footer:
      "Result: Consumers make uninformed decisions and miss out on better service and pricing, while businesses lose qualified leads",
    slideNumber: "2 / 10",
  },
  {
    title: "The Linked By Six Solution",
    subtitle: "Leveraging the Power of Six Degrees of Separation",
    content:
      "Linked By Six is a C2B platform that connects consumers to businesses through their personal network relationships",
    bullets: [
      "Users discover businesses through trusted connections in their extended network",
      "Personal relationships unlock better service and better pricing for consumers",
      "Phone number authentication substantially reduces fake reviews (unlike email-based platforms)",
      "Businesses gain access to warm, qualified leads with built-in trust",
      "One-stop shop: Lead generation + business operations tools + customer service solutions",
      "Transform cold outreach into warm introductions",
    ],
    footer: "Provisional Patent Secured",
    slideNumber: "3 / 10",
  },
  {
    title: "How It Works",
    boxes: [
      {
        title: "For Consumers",
        content:
          "Search for services they need and see which businesses connect to them through their network of friends, family, and colleagues",
      },
      {
        title: "For Businesses",
        content:
          "Subscribe to appear in directory, access lead generation tools, and leverage operational efficiency features",
      },
    ],
    highlight: {
      title: "The Six Degrees Advantage",
      content:
        "Customers receive better service and better prices by leveraging personal relationships. Phone number authentication drastically reduces fake reviews compared to email-based review platforms.",
    },
    slideNumber: "4 / 10",
  },
  {
    title: "Business Model",
    subtitle: "B2B SaaS Subscription Revenue",
    content: "Businesses pay recurring subscriptions for:",
    bullets: [
      "Directory placement based on personal relationships businesses create",
      "Employee seat licenses - allowing customers to leverage relationships with employees",
      "Lead generation and customer acquisition tools",
      "Business operations and efficiency solutions",
      "Enhanced customer service capabilities",
      "Analytics and insights on network connections",
    ],
    footer:
      "Scalable, predictable recurring revenue with low customer acquisition cost due to network effects",
    slideNumber: "5 / 10",
  },
  {
    title: "Market Opportunity",
    content:
      "Massive addressable market at the intersection of multiple growing sectors:",
    bullets: [
      "Business directory and lead generation market",
      "Small and medium business software tools",
      "Social networking and trusted recommendation platforms",
      "Customer relationship management solutions",
    ],
    highlight: {
      title: "Key Market Dynamics",
      content:
        "SMBs increasingly need integrated solutions that combine marketing, operations, and customer service. Linked By Six delivers all three powered by trusted network connections.",
    },
    slideNumber: "6 / 10",
  },
  {
    title: "Why ADP?",
    subtitle: "Perfect Strategic Alignment",
    boxes: [
      {
        title: "ADP's Assets",
        content:
          "Massive base of business clients already using ADP for payroll, HR, and workforce management",
      },
      {
        title: "Linked By Six's Value",
        content:
          "Lead generation and customer acquisition tools that drive business growth for ADP clients",
      },
    ],
    highlight: {
      title: "Value-Added Service for ADP",
      content:
        "Linked By Six becomes a premium value-added service ADP can offer to their current business portfolio - strengthening client relationships and creating new revenue streams",
    },
    footer:
      "ADP clients need customers. Linked By Six delivers qualified leads through trusted networks.",
    slideNumber: "7 / 10",
  },
  {
    title: "Strategic Partnership Vision",
    subtitle: "Integrated Platform Approach",
    content: "Embed ADP services directly within Linked By Six:",
    bullets: [
      "ADP payroll tools integrated into Linked By Six business dashboard",
      "HR management features available to Linked By Six subscribers",
      "Workforce management solutions as premium add-ons",
      "Seamless experience: Find customers AND manage operations in one platform",
    ],
    highlight: {
      title: "Win-Win Integration",
      content:
        "ADP expands its SMB reach, Linked By Six becomes a more complete business solution. Both platforms become stickier and more valuable.",
    },
    slideNumber: "8 / 10",
  },
  {
    title: "Traction & Validation",
    content: "Linked By Six has demonstrated product-market fit:",
    bullets: [
      "Provisional Patent secured - protecting our unique network-based business discovery technology",
      "Investor video showcasing user and business benefits completed",
      "Platform demonstrates clear value proposition for both sides of marketplace",
      "Ready to scale with strategic partner and investment",
    ],
    footer:
      "This is the ideal time for ADP to invest before Linked By Six achieves broader market penetration",
    slideNumber: "9 / 10",
  },
  {
    title: "The Ask",
    content:
      "We're seeking a comprehensive strategic partnership with ADP:",
    boxes: [
      {
        title: "Investment",
        content: "Capital to accelerate growth and platform development",
      },
      {
        title: "Partnership",
        content:
          "Integration of ADP services within Linked By Six platform",
      },
    ],
    extraBox: {
      title: "Client Access",
      content:
        "Introduction to ADP's business client base to rapidly scale Linked By Six adoption",
    },
    cta: {
      title: "Let's Build the Future Together",
      content:
        "Linked By Six + ADP: Connecting businesses to customers and empowering operations",
    },
    slideNumber: "10 / 10",
  },
];

const ADPPage: React.FC = () => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isMobile = width < 768;

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const vimeoUrl = `https://player.vimeo.com/video/${VIMEO_VIDEO_ID}?badge=0&autopause=0&player_id=0&app_id=58479`;

  const PresentationSlide = ({
    isFullscreenMode = false,
  }: {
    isFullscreenMode?: boolean;
  }) => {
    const slide = slides[currentSlide];
    const isTitleSlide = slide.type === "title";

    const titleSize = isFullscreenMode ? 28 : 22;
    const subtitleSize = isFullscreenMode ? 20 : 16;
    const contentSize = isFullscreenMode ? 16 : 14;
    const bulletSize = isFullscreenMode ? 15 : 13;

    return (
      <View
        className="bg-white rounded-2xl p-6 flex-1"
        style={{ maxHeight: isFullscreenMode ? "85%" : undefined }}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={
            isTitleSlide
              ? { flex: 1, justifyContent: "center" }
              : undefined
          }
        >
          {/* Title */}
          <Text
            style={{
              fontSize: titleSize,
              fontFamily: "Inter_700Bold",
              color: isTitleSlide ? "#2563EB" : "#000",
              marginBottom: 12,
            }}
          >
            {slide.title}
          </Text>

          {/* Subtitle */}
          {slide.subtitle && (
            <Text
              style={{
                fontSize: subtitleSize,
                fontFamily: "Inter_500Medium",
                color: isTitleSlide ? "#2563EB" : "#000",
                marginBottom: 12,
              }}
            >
              {slide.subtitle}
            </Text>
          )}

          {/* Content */}
          {slide.content && (
            <Text
              style={{
                fontSize: contentSize,
                fontFamily: "Inter_400Regular",
                color: "#4B5563",
                marginBottom: 12,
                lineHeight: contentSize * 1.5,
              }}
            >
              {slide.content}
            </Text>
          )}

          {/* Bullets */}
          {slide.bullets && (
            <View style={{ marginBottom: 12, gap: 8 }}>
              {slide.bullets.map((bullet, index) => (
                <View key={index} className="flex-row items-start">
                  <Text
                    style={{
                      color: "#2563EB",
                      fontFamily: "Inter_700Bold",
                      marginRight: 8,
                    }}
                  >
                    →
                  </Text>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: bulletSize,
                      fontFamily: "Inter_400Regular",
                      color: "#4B5563",
                    }}
                  >
                    {bullet}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Boxes */}
          {slide.boxes && (
            <View
              className={`${isMobile ? "gap-3" : "flex-row gap-4"}`}
              style={{ marginBottom: 12 }}
            >
              {slide.boxes.map((box, index) => (
                <View
                  key={index}
                  className="flex-1 bg-gray-50 p-4 rounded-lg"
                  style={{ borderLeftWidth: 4, borderLeftColor: "#2563EB" }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter_700Bold",
                      color: "#2563EB",
                      marginBottom: 8,
                    }}
                  >
                    {box.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: bulletSize,
                      fontFamily: "Inter_400Regular",
                      color: "#4B5563",
                    }}
                  >
                    {box.content}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Highlight */}
          {slide.highlight && (
            <View
              className="bg-blue-50 p-4 rounded-xl"
              style={{ marginBottom: 12 }}
            >
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  color: "#1F2937",
                  marginBottom: 8,
                }}
              >
                {slide.highlight.title}
              </Text>
              <Text
                style={{
                  fontSize: bulletSize,
                  fontFamily: "Inter_400Regular",
                  color: "#4B5563",
                }}
              >
                {slide.highlight.content}
              </Text>
            </View>
          )}

          {/* Extra Box */}
          {slide.extraBox && (
            <View
              className="bg-gray-50 p-4 rounded-lg"
              style={{
                marginBottom: 12,
                borderLeftWidth: 4,
                borderLeftColor: "#2563EB",
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  color: "#2563EB",
                  marginBottom: 8,
                }}
              >
                {slide.extraBox.title}
              </Text>
              <Text
                style={{
                  fontSize: bulletSize,
                  fontFamily: "Inter_400Regular",
                  color: "#4B5563",
                }}
              >
                {slide.extraBox.content}
              </Text>
            </View>
          )}

          {/* CTA */}
          {slide.cta && (
            <View
              className="bg-blue-600 p-4 rounded-xl items-center"
              style={{ marginBottom: 12 }}
            >
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  color: "#FFF",
                  marginBottom: 8,
                }}
              >
                {slide.cta.title}
              </Text>
              <Text
                style={{
                  fontSize: bulletSize,
                  fontFamily: "Inter_400Regular",
                  color: "#FFF",
                  textAlign: "center",
                }}
              >
                {slide.cta.content}
              </Text>
            </View>
          )}

          {/* Footer */}
          {slide.footer && (
            <Text
              style={{
                fontSize: bulletSize,
                fontFamily: "Inter_600SemiBold",
                color: "#000",
                marginTop: 12,
              }}
            >
              {slide.footer}
            </Text>
          )}
        </ScrollView>

        {/* Navigation */}
        <View
          className="flex-row justify-between items-center pt-4 mt-4"
          style={{ borderTopWidth: 1, borderTopColor: "#E5E7EB" }}
        >
          <Pressable
            onPress={prevSlide}
            disabled={currentSlide === 0}
            className="flex-row items-center px-4 py-2 rounded-full border border-blue-600"
            style={{ opacity: currentSlide === 0 ? 0.3 : 1 }}
          >
            <ChevronLeft size={16} color="#2563EB" />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                color: "#2563EB",
                fontSize: 13,
              }}
            >
              Previous
            </Text>
          </Pressable>

          <Text
            style={{
              fontFamily: "Inter_400Regular",
              color: "#6B7280",
              fontSize: 13,
            }}
          >
            {currentSlide + 1} / {slides.length}
          </Text>

          <Pressable
            onPress={nextSlide}
            disabled={currentSlide === slides.length - 1}
            className="flex-row items-center px-4 py-2 rounded-full border border-blue-600"
            style={{ opacity: currentSlide === slides.length - 1 ? 0.3 : 1 }}
          >
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                color: "#2563EB",
                fontSize: 13,
              }}
            >
              Next
            </Text>
            <ChevronRight size={16} color="#2563EB" />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-bg-primary">
      {/* Header Bar */}
      <View
        className="bg-bg-secondary/80 px-5 py-2 border-b border-white/10"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center">
          <LinearGradient
            colors={["#2563EB", "#06B6D4"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="w-8 h-8 rounded-lg items-center justify-center mr-2"
          >
            <Image
              source={require("@/assets/images/logo.png")}
              className="w-7 h-7"
              contentFit="contain"
            />
          </LinearGradient>
          <Text
            className="text-white text-xl"
            style={{ fontFamily: "Rajdhani_700Bold" }}
          >
            Linked By Six
          </Text>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView className="flex-1 px-5 pt-4">
        {/* Welcome Section */}
        <View className="bg-bg-secondary rounded-xl p-5 mb-5 border border-white/10">
          <Text
            className="text-white text-xl mb-4"
            style={{ fontFamily: "Inter_700Bold" }}
          >
            Welcome ADP
          </Text>
          <Text
            className="text-gray-300 leading-relaxed"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            We're excited to explore how Linked By Six and ADP can work together
            to innovate the way people and businesses connect through trust and
            technology.
          </Text>
        </View>

        {/* Concept Video Section */}
        <View className="bg-bg-secondary rounded-xl p-5 mb-5 border border-white/10">
          <Text
            className="text-white text-xl mb-4"
            style={{ fontFamily: "Inter_700Bold" }}
          >
            Concept Video
          </Text>
          <Text
            className="text-gray-300 leading-relaxed mb-4"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            Watch our concept video to see how Linked By Six transforms the way
            people discover and connect with businesses through their trusted
            network.
          </Text>

          <View
            className="rounded-lg overflow-hidden border border-white/10"
            style={{ aspectRatio: 16 / 9 }}
          >
            <WebView
              source={{ uri: vimeoUrl }}
              style={{ flex: 1, backgroundColor: "#0B0E14" }}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
            />
          </View>
        </View>

        {/* Strategy & Partnership Section */}
        <View className="bg-bg-secondary rounded-xl p-5 mb-5 border border-white/10">
          <Text
            className="text-white text-xl mb-4"
            style={{ fontFamily: "Inter_700Bold" }}
          >
            Strategy & Partnership
          </Text>
          <Text
            className="text-gray-300 leading-relaxed mb-4"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            The strategy deck highlights multiple ways we can collaborate,
            designed to stay flexible and evolve with ADP's vision for how we
            move forward together.
          </Text>

          {/* Embedded Presentation */}
          <View
            className="bg-blue-600 rounded-xl p-4"
            style={{ aspectRatio: isMobile ? 3 / 4 : 16 / 9 }}
          >
            <View className="flex-1 relative">
              <PresentationSlide />

              {/* Fullscreen Button */}
              <Pressable
                onPress={() => setIsFullscreen(true)}
                className="absolute top-2 right-2 bg-black/70 px-3 py-1.5 rounded flex-row items-center gap-1"
              >
                <Maximize2 size={14} color="white" />
                <Text
                  className="text-white text-xs"
                  style={{ fontFamily: "Inter_600SemiBold" }}
                >
                  Fullscreen
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fullscreen Modal */}
      <Modal
        visible={isFullscreen}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setIsFullscreen(false)}
      >
        <View className="flex-1 bg-blue-600 items-center justify-center">
          <Pressable
            onPress={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 bg-white/20 px-4 py-2 rounded flex-row items-center gap-2 z-10"
            style={{ top: insets.top + 10 }}
          >
            <X size={16} color="white" />
            <Text
              className="text-white"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              Exit Fullscreen
            </Text>
          </Pressable>
          <View style={{ width: "90%", height: "85%" }}>
            <PresentationSlide isFullscreenMode />
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ADPPage;
