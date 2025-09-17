import { Dimensions } from "react-native";

// Base width for scaling calculations (iPhone SE/standard mobile width)
const BASE_WIDTH = 375;

// Get current window dimensions
const { width: SCREEN_WIDTH } = Dimensions.get("window");

/**
 * Calculate scale factor based on screen width
 * Only applies to mobile (< 768px width)
 */
export const getScaleFactor = (currentWidth: number): number => {
  if (currentWidth >= 768) return 1; // Don't scale on tablet/desktop
  return currentWidth / BASE_WIDTH;
};

/**
 * Scale a value proportionally based on screen width
 * @param size - The base size value (designed for 375px width)
 * @param currentWidth - Current screen width
 * @param minScale - Minimum scale factor (default 0.75)
 * @param maxScale - Maximum scale factor (default 1.2)
 */
export const scale = (
  size: number,
  currentWidth: number,
  minScale: number = 0.75,
  maxScale: number = 1.2
): number => {
  if (currentWidth >= 768) return size; // Don't scale on tablet/desktop

  const scaleFactor = Math.min(
    Math.max(currentWidth / BASE_WIDTH, minScale),
    maxScale
  );

  return Math.round(size * scaleFactor);
};

/**
 * Scale font size with moderate scaling (less aggressive than regular scale)
 * Font sizes typically need less scaling to remain readable
 */
export const scaleFont = (
  size: number,
  currentWidth: number,
  minScale: number = 0.85,
  maxScale: number = 1.15
): number => {
  return scale(size, currentWidth, minScale, maxScale);
};

/**
 * Scale spacing/padding/margins
 */
export const scaleSpacing = (
  size: number,
  currentWidth: number
): number => {
  return scale(size, currentWidth, 0.7, 1.3);
};
