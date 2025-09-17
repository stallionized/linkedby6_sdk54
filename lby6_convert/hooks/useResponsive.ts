import { useWindowDimensions } from "react-native";

export const useResponsive = () => {
  const { width, height } = useWindowDimensions();

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  const responsiveValue = <T,>(mobile: T, tablet?: T, desktop?: T): T => {
    if (width >= 1024 && desktop !== undefined) return desktop;
    if (width >= 768 && tablet !== undefined) return tablet;
    return mobile;
  };

  const responsiveColumns = (mobile: number, tablet?: number, desktop?: number): number => {
    return responsiveValue(mobile, tablet, desktop);
  };

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    responsiveValue,
    responsiveColumns,
  };
};
