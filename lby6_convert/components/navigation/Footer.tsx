import React from "react";
import { View, Text, Pressable, Linking, useWindowDimensions, Platform } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowUp, Youtube, Linkedin, Instagram } from "lucide-react-native";

interface FooterProps {
  isBusiness: boolean;
  togglePage: () => void;
  scrollToTop?: () => void;
}

const Footer: React.FC<FooterProps> = ({
  isBusiness,
  togglePage,
  scrollToTop,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const handleScrollToTop = () => {
    scrollToTop?.();
  };

  const handleTogglePage = () => {
    togglePage();
    handleScrollToTop();
  };

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.1)",
        backgroundColor: "#020408",
        paddingTop: 64,
        paddingBottom: 32,
        paddingHorizontal: 16,
      }}
    >
      <View style={{ maxWidth: 1280, width: "100%", alignSelf: "center" }}>
        {/* Top Row */}
        <View
          style={{
            flexDirection: isDesktop ? "row" : "column",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 32,
            marginBottom: 64,
          }}
        >
          {/* Logo */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <LinearGradient
              colors={["#3B82F6", "#22D3EE"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Image
                source={require("@/assets/images/logo.png")}
                style={{ width: 20, height: 20 }}
                contentFit="contain"
              />
            </LinearGradient>
            <Text
              style={{
                fontFamily: "Rajdhani_700Bold",
                fontSize: 20,
                color: "#FFFFFF",
                letterSpacing: 1,
              }}
            >
              Linked By Six
            </Text>
          </View>

          {/* Navigation Links */}
          <View
            style={{
              flexDirection: isDesktop ? "row" : "column",
              alignItems: "center",
              gap: isDesktop ? 32 : 16,
            }}
          >
            <Pressable>
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 14,
                  color: "#FFFFFF",
                  textTransform: "uppercase",
                  letterSpacing: 2,
                }}
              >
                Pricing
              </Text>
            </Pressable>

            {isDesktop && (
              <View style={{ width: 32, height: 1, backgroundColor: "rgba(255,255,255,0.2)" }} />
            )}

            <Pressable>
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 14,
                  color: "#FFFFFF",
                  textTransform: "uppercase",
                  letterSpacing: 2,
                }}
              >
                Contacts
              </Text>
            </Pressable>

            {isDesktop && (
              <View style={{ width: 32, height: 1, backgroundColor: "rgba(255,255,255,0.2)" }} />
            )}

            <Pressable onPress={handleTogglePage}>
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 14,
                  color: "#60A5FA",
                  textTransform: "uppercase",
                  letterSpacing: 2,
                }}
              >
                {isBusiness ? "For Consumers" : "For Businesses"}
              </Text>
            </Pressable>
          </View>

          {/* Back to Top Button */}
          <Pressable
            onPress={handleScrollToTop}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#2563EB",
              alignItems: "center",
              justifyContent: "center",
              ...(Platform.OS === "web"
                ? { boxShadow: "0 0 15px rgba(0, 122, 255, 0.4)" }
                : {
                    shadowColor: "#007AFF",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.4,
                    shadowRadius: 15,
                    elevation: 5,
                  }),
            }}
          >
            <ArrowUp size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Bottom Row */}
        <View
          style={{
            flexDirection: isDesktop ? "row" : "column",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.05)",
            paddingTop: 32,
          }}
        >
          {/* Copyright & Powered By */}
          <View
            style={{
              flexDirection: isDesktop ? "row" : "column",
              alignItems: "center",
              gap: 16,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 10,
                color: "#6B7280",
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              © {new Date().getFullYear()} All rights reserved
            </Text>
            {isDesktop && (
              <Text style={{ color: "#6B7280", fontSize: 10 }}>•</Text>
            )}
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 10,
                color: "#6B7280",
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              Powered by Six Degrees Technologies | Designed by CJ Cacici
            </Text>
          </View>

          {/* Legal Links */}
          <View style={{ flexDirection: "row", gap: 24 }}>
            <Pressable>
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 10,
                  color: "#6B7280",
                  textTransform: "uppercase",
                  letterSpacing: 2,
                }}
              >
                Privacy Policy
              </Text>
            </Pressable>
            <Pressable>
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 10,
                  color: "#6B7280",
                  textTransform: "uppercase",
                  letterSpacing: 2,
                }}
              >
                Terms of Services
              </Text>
            </Pressable>
          </View>

          {/* Social Icons */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={() => Linking.openURL("https://youtube.com")}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: "#DC2626",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Youtube size={12} color="#FFFFFF" />
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL("https://linkedin.com")}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: "#1D4ED8",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Linkedin size={12} color="#FFFFFF" />
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL("https://instagram.com")}
            >
              <LinearGradient
                colors={["#EC4899", "#F97316"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Instagram size={12} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
};

export default Footer;
