import React, { useEffect } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useFonts } from "expo-font";
import {
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import {
  Rajdhani_400Regular,
  Rajdhani_500Medium,
  Rajdhani_600SemiBold,
  Rajdhani_700Bold,
} from "@expo-google-fonts/rajdhani";

// Import ADP page component
import ADPPage from "./components/landing/screens/ADPPage";

const ADPPageNew = ({ navigation }) => {
  const [fontsLoaded, fontError] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Rajdhani_400Regular,
    Rajdhani_500Medium,
    Rajdhani_600SemiBold,
    Rajdhani_700Bold,
  });

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#020408" }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ color: "#FFFFFF", marginTop: 16, fontWeight: "600" }}>Loading...</Text>
      </View>
    );
  }

  return <ADPPage />;
};

export default ADPPageNew;
