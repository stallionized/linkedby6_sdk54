/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./constants/**/*.{js,jsx,ts,tsx}",
    "./contexts/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#007AFF",
          glow: "#00C2FF",
        },
        bg: {
          primary: "#020408",
          secondary: "#0B0E14",
        },
      },
      fontFamily: {
        inter: ["Inter_400Regular"],
        "inter-light": ["Inter_300Light"],
        "inter-medium": ["Inter_500Medium"],
        "inter-semibold": ["Inter_600SemiBold"],
        "inter-bold": ["Inter_700Bold"],
        "inter-extrabold": ["Inter_800ExtraBold"],
        rajdhani: ["Rajdhani_400Regular"],
        "rajdhani-medium": ["Rajdhani_500Medium"],
        "rajdhani-semibold": ["Rajdhani_600SemiBold"],
        "rajdhani-bold": ["Rajdhani_700Bold"],
      },
    },
  },
  plugins: [],
};
