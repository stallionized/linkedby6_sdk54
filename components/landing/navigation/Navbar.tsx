import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
  Platform,
  BackHandler,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Menu, X, ArrowRight } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  useDerivedValue,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import { useScrollContext } from "../../../contexts/landing/ScrollContext";
import { navigate } from "../../../navigationRef";

interface NavbarProps {
  isBusiness: boolean;
  togglePage: () => void;
  scrollY?: Animated.SharedValue<number>;
  // External menu control for swipe gestures
  isMenuOpen?: boolean;
  onMenuOpenChange?: (isOpen: boolean) => void;
  menuTranslateX?: Animated.SharedValue<number>;
}

const NAVBAR_HEIGHT = 72; // Approximate height of navbar content
const SWIPE_THRESHOLD = 50; // Minimum swipe distance to trigger menu
const SWIPE_VELOCITY_THRESHOLD = 500; // Velocity threshold for quick swipes

const Navbar: React.FC<NavbarProps> = ({
  isBusiness,
  togglePage,
  scrollY,
  isMenuOpen: externalIsMenuOpen,
  onMenuOpenChange,
  menuTranslateX: externalMenuTranslateX,
}) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [internalIsMenuOpen, setInternalIsMenuOpen] = useState(false);
  const fallbackScrollY = useSharedValue(0);
  const scrollContext = useScrollContext();

  // Use external state if provided, otherwise use internal state
  const isMobileMenuOpen = externalIsMenuOpen !== undefined ? externalIsMenuOpen : internalIsMenuOpen;
  const setIsMobileMenuOpen = onMenuOpenChange || setInternalIsMenuOpen;

  // Shared value for menu slide animation
  const internalMenuTranslateX = useSharedValue(width);
  const menuTranslateX = externalMenuTranslateX || internalMenuTranslateX;

  const isMobile = width < 768;
  const isNative = Platform.OS === "ios" || Platform.OS === "android";

  // Helper functions to update state from worklet
  const openMenu = () => setIsMobileMenuOpen(true);
  const closeMenu = () => setIsMobileMenuOpen(false);

  // Use the passed scrollY, then context, then fallback to 0
  const currentScrollY = scrollY ?? scrollContext?.scrollY ?? fallbackScrollY;

  // Derive whether we're scrolled (value > threshold)
  const isScrolled = useDerivedValue(() => {
    return currentScrollY.value > 10 ? 1 : 0;
  });

  const animatedNavStyle = useAnimatedStyle(() => {
    // When at top (scrollY <= 10), fully transparent
    // When scrolled, semi-transparent with backdrop
    // When menu is open, stay transparent - the menu provides the background
    const opacity = interpolate(
      currentScrollY.value,
      [0, 10, 50],
      [0, 0, 0.8]
    );

    return {
      backgroundColor: isMobileMenuOpen ? "transparent" : `rgba(2, 4, 8, ${opacity})`,
      borderBottomWidth: isScrolled.value > 0 && !isMobileMenuOpen ? 1 : 0,
      borderBottomColor: "rgba(255, 255, 255, 0.1)",
    };
  });

  const handleTogglePage = () => {
    togglePage();
    setIsMobileMenuOpen(false);
  };

  const handleLogin = () => {
    setIsMobileMenuOpen(false);
    navigate("LoginScreen");
  };

  // Animated style for backdrop blur (web only)
  // Don't apply blur when menu is open - navbar should be transparent
  const animatedBlurStyle = useAnimatedStyle(() => {
    if (Platform.OS !== "web") return {};

    const shouldBlur = currentScrollY.value > 10 && !isMobileMenuOpen;
    return {
      backdropFilter: shouldBlur ? "blur(12px)" : "blur(0px)",
      WebkitBackdropFilter: shouldBlur ? "blur(12px)" : "blur(0px)",
    } as any;
  });

  // Animated style for mobile menu slide
  const animatedMenuStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: menuTranslateX.value }],
  }));

  // Animate menu when state changes (only for internal state without external control)
  // When external control is used, the parent handles the animation
  useEffect(() => {
    if (externalMenuTranslateX === undefined) {
      menuTranslateX.value = withSpring(isMobileMenuOpen ? 0 : width, {
        damping: 20,
        stiffness: 200,
        mass: 0.5,
      });
    }
  }, [isMobileMenuOpen, width, externalMenuTranslateX]);

  // Handle Android back button
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [isMobileMenuOpen]);

  // Swipe gesture to close menu (swipe right when menu is open)
  const swipeToCloseGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onUpdate((event) => {
      // Only allow closing when menu is open and swiping right
      if (isMobileMenuOpen && event.translationX > 0) {
        menuTranslateX.value = Math.min(width, event.translationX);
      }
    })
    .onEnd((event) => {
      if (isMobileMenuOpen) {
        // Check if swipe was far enough or fast enough to close
        const shouldClose =
          event.translationX > SWIPE_THRESHOLD ||
          event.velocityX > SWIPE_VELOCITY_THRESHOLD;

        if (shouldClose) {
          menuTranslateX.value = withSpring(width, {
            damping: 20,
            stiffness: 200,
            mass: 0.5,
          });
          runOnJS(closeMenu)();
        } else {
          // Snap back to open
          menuTranslateX.value = withSpring(0, {
            damping: 20,
            stiffness: 200,
            mass: 0.5,
          });
        }
      }
    });

  return (
    <>
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            paddingTop: insets.top,
          },
          animatedNavStyle,
          Platform.OS === "web" ? animatedBlurStyle : {},
        ]}
      >
        <View style={{ maxWidth: 1280, width: "100%", alignSelf: "center", paddingHorizontal: 16 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 16,
            }}
          >
            {/* Logo */}
            <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <LinearGradient
                colors={["#2563EB", "#22D3EE"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  ...(Platform.OS === "web"
                    ? { boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }
                    : {
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.1,
                        shadowRadius: 15,
                        elevation: 5,
                      }),
                }}
              >
                <Image
                  source={require("../../../assets/landing/images/logo.png")}
                  style={{ width: 36, height: 36 }}
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
            </Pressable>

            {/* Desktop Navigation */}
            {!isMobile && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 32 }}>
                <Pressable onPress={handleTogglePage}>
                  <Text
                    style={{
                      fontFamily: "Inter_700Bold",
                      fontSize: 14,
                      color: "#60A5FA",
                      textTransform: "uppercase",
                      letterSpacing: 3,
                    }}
                  >
                    {isBusiness ? "For Consumers" : "For Businesses"}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Desktop CTA Button */}
            {!isMobile && (
              <Pressable onPress={handleLogin}>
                <LinearGradient
                  colors={["#007AFF", "#00C2FF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingHorizontal: 24,
                    paddingVertical: 10,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter_700Bold",
                      fontSize: 14,
                      color: "#FFFFFF",
                      textTransform: "uppercase",
                      letterSpacing: 3,
                    }}
                  >
                    LOG IN
                  </Text>
                  <ArrowRight size={16} color="white" />
                </LinearGradient>
              </Pressable>
            )}

            {/* Mobile Menu Button */}
            {isMobile && (
              <Pressable
                style={{ padding: 8 }}
                onPress={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X size={24} color="white" />
                ) : (
                  <Menu size={24} color="white" />
                )}
              </Pressable>
            )}
          </View>
        </View>
      </Animated.View>

      {/* Mobile Menu Overlay - slides BEHIND navbar (zIndex: 40 < navbar's 50) */}
      {/* The menu extends to the top and provides the background that shows through the transparent navbar */}
      {isMobile && (
        <GestureDetector gesture={isNative ? swipeToCloseGesture : Gesture.Pan()}>
          <Animated.View
            style={[
              {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 40,
                backgroundColor: "#020408",
              },
              animatedMenuStyle,
            ]}
            pointerEvents={isMobileMenuOpen ? "auto" : "none"}
          >
            {/* Content container with proper padding to start below navbar */}
            <View
              style={{
                flex: 1,
                paddingTop: insets.top + NAVBAR_HEIGHT + 16,
                paddingHorizontal: 24,
              }}
            >
              <View style={{ gap: 32 }}>
                <Pressable
                  onPress={handleTogglePage}
                  style={{
                    borderBottomWidth: 1,
                    borderBottomColor: "rgba(255,255,255,0.1)",
                    paddingBottom: 16,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Rajdhani_700Bold",
                      fontSize: 20,
                      color: "#60A5FA",
                    }}
                  >
                    {isBusiness ? "Switch to Consumer" : "Switch to Business"}
                  </Text>
                </Pressable>

                <View style={{ marginTop: 32 }}>
                  <Pressable style={{ width: "100%" }} onPress={handleLogin}>
                    <LinearGradient
                      colors={["#007AFF", "#00C2FF"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        paddingVertical: 16,
                        borderRadius: 8,
                        alignItems: "center",
                        ...(Platform.OS === "web"
                          ? { boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }
                          : {
                              shadowColor: "#000",
                              shadowOffset: { width: 0, height: 10 },
                              shadowOpacity: 0.1,
                              shadowRadius: 15,
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
                          letterSpacing: 3,
                        }}
                      >
                        LOG IN
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            </View>
          </Animated.View>
        </GestureDetector>
      )}

    </>
  );
};

// Export constants for parent component
export { NAVBAR_HEIGHT, SWIPE_THRESHOLD, SWIPE_VELOCITY_THRESHOLD };

export default Navbar;
