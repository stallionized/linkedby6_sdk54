import React, { useState } from "react";
import { View, Text, Pressable, Switch, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Check } from "lucide-react-native";
import ScrollReveal from "../ui/ScrollReveal";
import { pricingTiers } from "../../../constants/landing/data";
import { Colors, Gradients } from "../../../constants/landing/colors";

const Pricing: React.FC = () => {
  const { width } = useWindowDimensions();
  const [isYearly, setIsYearly] = useState(false);
  const isMobile = width < 768;

  return (
    <View className="py-24 bg-bg-primary px-4">
      {/* Header */}
      <ScrollReveal direction="down" className="mb-8">
        <Text
          className="text-3xl md:text-4xl text-white text-center mb-2 uppercase tracking-wider"
          style={{ fontFamily: "Rajdhani_700Bold" }}
        >
          Pricing Plans
        </Text>
        <Text
          className="text-sm text-gray-400 text-center uppercase tracking-widest"
          style={{ fontFamily: "Inter_500Medium" }}
        >
          Choose the plan that fits your business
        </Text>
      </ScrollReveal>

      {/* Toggle */}
      <ScrollReveal direction="none" delay={100} className="mb-12">
        <View className="flex-row items-center justify-center gap-4">
          <Text
            className={`text-sm uppercase tracking-widest ${!isYearly ? "text-white" : "text-gray-500"}`}
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            Monthly
          </Text>
          <Switch
            value={isYearly}
            onValueChange={setIsYearly}
            trackColor={{ false: "#374151", true: Colors.brand.DEFAULT }}
            thumbColor="white"
          />
          <View className="flex-row items-center gap-2">
            <Text
              className={`text-sm uppercase tracking-widest ${isYearly ? "text-white" : "text-gray-500"}`}
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              Yearly
            </Text>
            <View className="bg-green-500/20 px-2 py-0.5 rounded">
              <Text
                className="text-green-400 text-xs"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                Save 20%
              </Text>
            </View>
          </View>
        </View>
      </ScrollReveal>

      {/* Pricing Cards */}
      <View className="max-w-6xl mx-auto">
        <View
          className={`${isMobile ? "gap-4" : "flex-row flex-wrap justify-center gap-4"}`}
        >
          {pricingTiers.map((tier, index) => (
            <ScrollReveal
              key={tier.name}
              direction="up"
              delay={index * 100}
              style={{
                width: isMobile ? "100%" : 280,
              }}
            >
              <View
                className={`rounded-2xl overflow-hidden ${
                  tier.highlighted
                    ? "border-2 border-blue-500"
                    : "border border-white/10"
                }`}
              >
                {tier.highlighted && (
                  <LinearGradient
                    colors={Gradients.brand as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="py-2"
                  >
                    <Text
                      className="text-white text-xs text-center uppercase tracking-widest"
                      style={{ fontFamily: "Inter_700Bold" }}
                    >
                      Most Popular
                    </Text>
                  </LinearGradient>
                )}

                <View className="bg-bg-secondary p-6">
                  {/* Plan Name */}
                  <Text
                    className="text-white text-xl mb-1 uppercase tracking-wide"
                    style={{ fontFamily: "Rajdhani_700Bold" }}
                  >
                    {tier.name}
                  </Text>
                  <Text
                    className="text-gray-400 text-sm mb-4"
                    style={{ fontFamily: "Inter_400Regular" }}
                  >
                    {tier.description}
                  </Text>

                  {/* Price */}
                  <View className="flex-row items-baseline gap-1 mb-6">
                    <Text
                      className="text-white text-4xl"
                      style={{ fontFamily: "Rajdhani_700Bold" }}
                    >
                      ${isYearly ? tier.yearlyPrice : tier.monthlyPrice}
                    </Text>
                    <Text
                      className="text-gray-400"
                      style={{ fontFamily: "Inter_400Regular" }}
                    >
                      /mo
                    </Text>
                  </View>

                  {/* Features */}
                  <View className="gap-3 mb-6">
                    {tier.features.map((feature, fIndex) => (
                      <View key={fIndex} className="flex-row items-center gap-3">
                        <View className="w-5 h-5 rounded-full bg-blue-500/20 items-center justify-center">
                          <Check size={12} color={Colors.brand.glow} />
                        </View>
                        <Text
                          className="text-gray-300 text-sm flex-1"
                          style={{ fontFamily: "Inter_400Regular" }}
                        >
                          {feature}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* CTA Button */}
                  <Pressable>
                    {({ pressed }) =>
                      tier.highlighted ? (
                        <LinearGradient
                          colors={
                            pressed
                              ? (Gradients.brandHover as [string, string])
                              : (Gradients.brand as [string, string])
                          }
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          className="py-3 rounded-lg items-center"
                        >
                          <Text
                            className="text-white text-sm uppercase tracking-widest"
                            style={{ fontFamily: "Inter_700Bold" }}
                          >
                            {tier.ctaText}
                          </Text>
                        </LinearGradient>
                      ) : (
                        <View
                          className="py-3 rounded-lg items-center border border-white/20"
                          style={{
                            backgroundColor: pressed
                              ? "rgba(255, 255, 255, 0.1)"
                              : "transparent",
                          }}
                        >
                          <Text
                            className="text-white text-sm uppercase tracking-widest"
                            style={{ fontFamily: "Inter_700Bold" }}
                          >
                            {tier.ctaText}
                          </Text>
                        </View>
                      )
                    }
                  </Pressable>
                </View>
              </View>
            </ScrollReveal>
          ))}
        </View>
      </View>
    </View>
  );
};

export default Pricing;
