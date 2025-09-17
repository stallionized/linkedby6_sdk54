export const Colors = {
  brand: {
    DEFAULT: "#007AFF",
    glow: "#00C2FF",
    dark: "#0B0E14",
    darker: "#05070A",
  },
  bg: {
    primary: "#020408",
    secondary: "#0B0E14",
    tertiary: "#05070A",
  },
  text: {
    primary: "#FFFFFF",
    secondary: "#9CA3AF",
    muted: "#6B7280",
  },
  border: {
    light: "rgba(255, 255, 255, 0.1)",
    medium: "rgba(255, 255, 255, 0.2)",
  },
  testimonial: {
    blue: "#3B82F6",
    cyan: "#06B6D4",
    emerald: "#10B981",
    purple: "#8B5CF6",
    pink: "#EC4899",
    amber: "#F59E0B",
  },
} as const;

export const Gradients = {
  brand: ["#007AFF", "#00C2FF"],
  brandHover: ["#2563EB", "#06B6D4"],
  heroOverlayHorizontal: ["#020408", "rgba(2, 4, 8, 0.2)", "transparent"],
  heroOverlayVertical: ["transparent", "transparent", "#020408"],
  fadeLeft: ["#020408", "transparent"],
  fadeRight: ["transparent", "#020408"],
} as const;
