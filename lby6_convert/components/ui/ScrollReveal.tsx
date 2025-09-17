import React, { useEffect, useState, useRef, useCallback, useMemo, CSSProperties } from "react";
import { ViewStyle, Platform, LayoutChangeEvent, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useAnimatedReaction,
  withDelay,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useScrollContext } from "@/contexts/ScrollContext";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
  duration?: number;
  threshold?: number;
  /** If true, animate immediately on mount (for above-the-fold content like Hero) */
  animateOnMount?: boolean;
}

const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = "",
  style,
  delay = 0,
  direction = "up",
  distance = 30,
  duration = 800,
  threshold = 0.15,
  animateOnMount = false,
}) => {
  const [isVisibleState, setIsVisibleState] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const nativeViewRef = useRef<View>(null);
  const scrollContext = useScrollContext();

  // Shared values for animation
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Native: Track element position
  const elementY = useSharedValue(0);
  const elementHeight = useSharedValue(0);
  const hasMeasured = useSharedValue(false);
  const hasTriggeredInitial = useRef(false);

  // Compute initial offset based on direction (memoized for JS thread)
  const initialOffset = useMemo(() => {
    switch (direction) {
      case "up":
        return { x: 0, y: distance };
      case "down":
        return { x: 0, y: -distance };
      case "left":
        return { x: distance, y: 0 };
      case "right":
        return { x: -distance, y: 0 };
      default:
        return { x: 0, y: 0 };
    }
  }, [direction, distance]);

  // Store offset in shared values for worklet access
  const offsetX = useSharedValue(initialOffset.x);
  const offsetY = useSharedValue(initialOffset.y);

  // Update offset shared values when direction/distance changes
  useEffect(() => {
    offsetX.value = initialOffset.x;
    offsetY.value = initialOffset.y;
  }, [initialOffset]);

  // Animation config
  const customEasing = Easing.bezier(0.22, 1, 0.36, 1);
  const animConfig = { duration, easing: customEasing };

  // Helper to trigger animation (called from JS thread)
  const triggerAnimation = useCallback(() => {
    opacity.value = withDelay(delay, withTiming(1, animConfig));
    translateX.value = withDelay(delay, withTiming(0, animConfig));
    translateY.value = withDelay(delay, withTiming(0, animConfig));
  }, [delay, duration]);

  // Native: For animateOnMount elements, trigger immediately without measuring
  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!animateOnMount) return;
    if (hasTriggeredInitial.current) return;

    // Set initial position first
    translateX.value = initialOffset.x;
    translateY.value = initialOffset.y;
    opacity.value = 0;

    hasTriggeredInitial.current = true;
    hasMeasured.value = true;

    // Small delay to ensure initial values are set, then animate
    requestAnimationFrame(() => {
      opacity.value = withDelay(delay, withTiming(1, { duration, easing: Easing.bezier(0.22, 1, 0.36, 1) }));
      translateX.value = withDelay(delay, withTiming(0, { duration, easing: Easing.bezier(0.22, 1, 0.36, 1) }));
      translateY.value = withDelay(delay, withTiming(0, { duration, easing: Easing.bezier(0.22, 1, 0.36, 1) }));
    });
  }, [animateOnMount, delay, duration, initialOffset]);

  // Set initial position on mount (skip for animateOnMount - handled above)
  useEffect(() => {
    if (animateOnMount) return;

    translateX.value = initialOffset.x;
    translateY.value = initialOffset.y;
    opacity.value = 0;
  }, [direction, distance, animateOnMount, initialOffset]);

  // Native: Trigger initial animation after a short delay on mount
  // This ensures elements in the initial viewport animate immediately
  useEffect(() => {
    if (Platform.OS === "web") return;
    if (animateOnMount) return; // Skip if using animateOnMount
    if (hasTriggeredInitial.current) return;

    // Use a timeout to ensure layout has happened
    const timer = setTimeout(() => {
      if (!hasTriggeredInitial.current && nativeViewRef.current) {
        nativeViewRef.current.measureInWindow((x, y, width, height) => {
          if (height > 0 && !hasTriggeredInitial.current) {
            const windowH = scrollContext?.windowHeight || 800;
            // If element is visible in viewport (y position is on screen)
            if (y < windowH && y + height > 0) {
              hasTriggeredInitial.current = true;
              hasMeasured.value = true;

              // Store position for scroll-based re-animation
              const currentScrollY = scrollContext?.scrollY.value || 0;
              elementY.value = y + currentScrollY;
              elementHeight.value = height;

              triggerAnimation();
            }
          }
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [scrollContext, animateOnMount, triggerAnimation]);

  // ============ WEB IMPLEMENTATION ============
  // Web: Animate based on visibility state (from IntersectionObserver)
  useEffect(() => {
    if (Platform.OS !== "web") return;

    if (isVisibleState) {
      opacity.value = withDelay(delay, withTiming(1, animConfig));
      translateX.value = withDelay(delay, withTiming(0, animConfig));
      translateY.value = withDelay(delay, withTiming(0, animConfig));
    } else {
      opacity.value = 0;
      translateX.value = initialOffset.x;
      translateY.value = initialOffset.y;
    }
  }, [isVisibleState, delay, duration, initialOffset]);

  // Web: Use Intersection Observer
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const element = wrapperRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisibleState(entry.isIntersecting);
        });
      },
      {
        threshold: threshold,
        rootMargin: "0px 0px -30px 0px",
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  // ============ NATIVE IMPLEMENTATION ============
  // Native: Derive visibility from scroll position and element position
  const isVisibleNative = useDerivedValue(() => {
    if (Platform.OS === "web") return false;
    if (!scrollContext) return true; // Fallback: always visible if no context
    if (!hasMeasured.value) return false; // Don't show until measured

    const { scrollY, windowHeight } = scrollContext;
    const viewportTop = scrollY.value;
    const viewportBottom = scrollY.value + windowHeight;
    const elTop = elementY.value;
    const elBottom = elementY.value + elementHeight.value;

    // Element is visible if it intersects viewport (with some margin)
    const margin = windowHeight * threshold;
    return elBottom > viewportTop + margin && elTop < viewportBottom - margin;
  }, [scrollContext, threshold]);

  // Native: Trigger animations when visibility changes (for scroll-based reveals)
  useAnimatedReaction(
    () => isVisibleNative.value,
    (visible, prevVisible) => {
      "worklet";
      if (Platform.OS === "web") return;

      if (visible && prevVisible === false) {
        // Animate IN
        opacity.value = withDelay(delay, withTiming(1, { duration, easing: Easing.bezier(0.22, 1, 0.36, 1) }));
        translateX.value = withDelay(delay, withTiming(0, { duration, easing: Easing.bezier(0.22, 1, 0.36, 1) }));
        translateY.value = withDelay(delay, withTiming(0, { duration, easing: Easing.bezier(0.22, 1, 0.36, 1) }));
      } else if (!visible && prevVisible === true) {
        // Reset instantly - use shared values for offset
        opacity.value = 0;
        translateX.value = offsetX.value;
        translateY.value = offsetY.value;
      }
    },
    [delay, duration]
  );

  // Native: Measure element position on layout (for elements below the fold)
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (Platform.OS === "web") return;
      // Skip if already triggered by useEffect
      if (hasTriggeredInitial.current) return;

      const { height } = event.nativeEvent.layout;
      elementHeight.value = height;

      if (!scrollContext) {
        // Fallback: animate immediately if no scroll context
        hasTriggeredInitial.current = true;
        triggerAnimation();
        return;
      }

      // Use measureInWindow to get screen position
      nativeViewRef.current?.measureInWindow((x, y, w, h) => {
        if (h === 0 || hasTriggeredInitial.current) return;

        const { windowHeight } = scrollContext;
        const currentScrollY = scrollContext.scrollY.value;

        // Store absolute position for scroll-based reveals
        elementY.value = y + currentScrollY;
        elementHeight.value = h;
        hasMeasured.value = true;

        // If element is in initial viewport, trigger animation
        if (y < windowHeight && y + h > 0) {
          hasTriggeredInitial.current = true;
          triggerAnimation();
        }
      });
    },
    [scrollContext, triggerAnimation]
  );

  // Animated style
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  // ============ RENDER ============
  // For web, wrap in a div that can be observed
  if (Platform.OS === "web") {
    const rnStyle = style as any;
    const hasSizingProps =
      rnStyle?.width || rnStyle?.flex || rnStyle?.maxWidth || rnStyle?.height;

    const wrapperStyle: CSSProperties = {};

    if (hasSizingProps) {
      if (rnStyle?.width) wrapperStyle.width = rnStyle.width;
      if (rnStyle?.maxWidth) wrapperStyle.maxWidth = rnStyle.maxWidth;
      if (rnStyle?.flex) wrapperStyle.flex = rnStyle.flex;
      if (rnStyle?.height) wrapperStyle.height = rnStyle.height;
    }

    const innerStyle: ViewStyle = {};
    if (style) {
      Object.keys(style).forEach((key) => {
        if (
          !["width", "maxWidth", "flex", "height"].includes(key) ||
          !hasSizingProps
        ) {
          (innerStyle as any)[key] = (style as any)[key];
        }
      });
    }

    if (hasSizingProps) {
      innerStyle.flex = 1;
      innerStyle.width = "100%";
    }

    return (
      <div ref={wrapperRef} style={wrapperStyle}>
        <Animated.View
          className={className}
          style={[innerStyle, animatedStyle]}
        >
          {children}
        </Animated.View>
      </div>
    );
  }

  // For native platforms
  return (
    <Animated.View
      ref={nativeViewRef}
      className={className}
      style={[style, animatedStyle]}
      onLayout={handleLayout}
    >
      {children}
    </Animated.View>
  );
};

export default ScrollReveal;
