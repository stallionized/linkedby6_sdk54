import React from "react";
import { View, Text, Platform, useWindowDimensions } from "react-native";
import { WebView } from "react-native-webview";
import ScrollReveal from "../ui/ScrollReveal";
import { VIMEO_VIDEO_ID } from "../../../constants/landing/data";
import { scale, scaleFont, scaleSpacing } from "../../../utils/landing/scaling";

const ConceptVideo: React.FC = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const isMobile = !isDesktop;

  const vimeoUrl = `https://player.vimeo.com/video/${VIMEO_VIDEO_ID}?badge=0&autopause=0&player_id=0&app_id=58479`;

  // Render video player based on platform
  const renderVideoPlayer = () => {
    if (Platform.OS === "web") {
      // Use native iframe for web - works better than WebView
      return (
        <iframe
          src={vimeoUrl}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            backgroundColor: "#0B0E14",
          }}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      );
    }

    // Use WebView for native platforms (iOS/Android)
    return (
      <WebView
        source={{ uri: vimeoUrl }}
        style={{ flex: 1, backgroundColor: "#0B0E14" }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
      />
    );
  };

  return (
    <View style={{ paddingVertical: isMobile ? scaleSpacing(96, width) : 96, backgroundColor: "#020408", paddingHorizontal: isMobile ? scaleSpacing(16, width) : 16, position: "relative", overflow: "hidden" }}>
      <View style={{ position: "relative", zIndex: 10 }}>
        {/* Header */}
        <ScrollReveal direction="down" style={{ marginBottom: isMobile ? scaleSpacing(48, width) : 48 }}>
          <Text
            style={{
              fontFamily: "Rajdhani_700Bold",
              fontSize: isMobile ? scaleFont(30, width) : isDesktop ? 48 : 30,
              color: "#FFFFFF",
              textAlign: "center",
              textTransform: "uppercase",
              letterSpacing: isMobile ? scale(2, width) : 2,
              marginBottom: isMobile ? scaleSpacing(24, width) : 24,
            }}
          >
            Linked By Six Intro
          </Text>
        </ScrollReveal>

        {/* Video Container */}
        <View style={{ maxWidth: 1024, width: "100%", alignSelf: "center" }}>
          <ScrollReveal direction="up" delay={200}>
            <View
              style={{
                position: "relative",
                borderRadius: isMobile ? scale(16, width) : 16,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.1)",
                backgroundColor: "#0B0E14",
                ...(Platform.OS === "web"
                  ? { boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }
                  : {
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 25 },
                      shadowOpacity: 0.25,
                      shadowRadius: 50,
                      elevation: 20,
                    }),
              }}
            >
              <View style={{ position: "relative", zIndex: 10, backgroundColor: "#000000" }}>
                <View
                  style={{
                    aspectRatio: 16 / 9,
                    width: "100%",
                  }}
                >
                  {renderVideoPlayer()}
                </View>
              </View>
            </View>
          </ScrollReveal>
        </View>
      </View>
    </View>
  );
};

export default ConceptVideo;
