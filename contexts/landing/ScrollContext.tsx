import React, { createContext, useContext } from "react";
import { SharedValue } from "react-native-reanimated";

interface ScrollContextType {
  scrollY: SharedValue<number>;
  windowHeight: number;
}

export const ScrollContext = createContext<ScrollContextType | null>(null);

export const useScrollContext = () => {
  const context = useContext(ScrollContext);
  return context;
};

export default ScrollContext;
