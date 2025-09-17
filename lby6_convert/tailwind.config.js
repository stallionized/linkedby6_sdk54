/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
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
      },
      fontFamily: {
        sans: ["Inter"],
        display: ["Rajdhani"],
      },
    },
  },
  plugins: [],
};
