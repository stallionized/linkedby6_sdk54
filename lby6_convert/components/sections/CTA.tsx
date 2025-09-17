import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Alert, useWindowDimensions, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight } from "lucide-react-native";
import ScrollReveal from "@/components/ui/ScrollReveal";

const CTA: React.FC = () => {
  const [email, setEmail] = useState("");
  const { width } = useWindowDimensions();
  const isDesktop = width >= 640;

  const handleSubmit = () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }
    if (!email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }
    Alert.alert("Success", "Thank you for joining the waitlist!");
    setEmail("");
  };

  return (
    <View style={{ paddingBottom: 128, backgroundColor: "#020408", paddingHorizontal: 16 }}>
      <View style={{ maxWidth: 896, width: "100%", alignSelf: "center" }}>
        <ScrollReveal direction="up">
          <View
            style={{
              position: "relative",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.5)",
              borderRadius: 16,
              padding: isDesktop ? 64 : 32,
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            {/* Top Glow Line */}
            <View
              style={{
                position: "absolute",
                top: 0,
                left: "16.67%",
                width: "66.67%",
                height: 4,
                ...(Platform.OS === "web"
                  ? { background: "linear-gradient(to right, transparent, #3B82F6, transparent)", filter: "blur(4px)" }
                  : { backgroundColor: "rgba(59, 130, 246, 0.5)" }),
              }}
              pointerEvents="none"
            />

            {/* Top Left Glow */}
            <View
              style={{
                position: "absolute",
                top: -96,
                left: -96,
                width: 256,
                height: 256,
                borderRadius: 128,
                backgroundColor: "rgba(37, 99, 235, 0.1)",
                ...(Platform.OS === "web" ? { filter: "blur(80px)" } : {}),
              }}
              pointerEvents="none"
            />

            {/* Bottom Right Glow */}
            <View
              style={{
                position: "absolute",
                bottom: -96,
                right: -96,
                width: 256,
                height: 256,
                borderRadius: 128,
                backgroundColor: "rgba(6, 182, 212, 0.1)",
                ...(Platform.OS === "web" ? { filter: "blur(80px)" } : {}),
              }}
              pointerEvents="none"
            />

            {/* Heading */}
            <Text
              style={{
                fontFamily: "Rajdhani_700Bold",
                fontSize: isDesktop ? 30 : 24,
                color: "#FFFFFF",
                textAlign: "center",
                marginBottom: 24,
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              Access Linked By Six for free!
            </Text>

            {/* Description */}
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                lineHeight: 22,
                color: "#9CA3AF",
                textAlign: "center",
                marginBottom: 40,
                maxWidth: 576,
              }}
            >
              Sign up now to get on the waitlist. We want to ensure you get the best experience in using our application. We will providing access in waves. Thanks in advance for your patience.
            </Text>

            {/* Email Form */}
            <View
              style={{
                flexDirection: isDesktop ? "row" : "column",
                gap: 12,
                maxWidth: 448,
                width: "100%",
              }}
            >
              {/* Email Input */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#F3F4F6",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Your Email address"
                  placeholderTextColor="#6B7280"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={{
                    paddingHorizontal: 24,
                    paddingVertical: 14,
                    color: "#000000",
                    fontFamily: "Inter_500Medium",
                    fontSize: 14,
                  }}
                />
              </View>

              {/* Submit Button */}
              <Pressable onPress={handleSubmit}>
                {({ pressed }) => (
                  <LinearGradient
                    colors={pressed ? ["#60A5FA", "#3B82F6"] : ["#3B82F6", "#2563EB"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      paddingHorizontal: 32,
                      paddingVertical: 14,
                      borderRadius: 8,
                      ...(Platform.OS === "web"
                        ? { boxShadow: "0 0 20px rgba(0, 122, 255, 0.3)" }
                        : {
                            shadowColor: "#007AFF",
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.3,
                            shadowRadius: 20,
                            elevation: 5,
                          }),
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter_700Bold",
                        fontSize: 14,
                        color: "#FFFFFF",
                        textTransform: "uppercase",
                        letterSpacing: 2,
                      }}
                    >
                      Submit
                    </Text>
                    <ArrowRight size={16} color="white" />
                  </LinearGradient>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollReveal>
      </View>
    </View>
  );
};

export default CTA;
