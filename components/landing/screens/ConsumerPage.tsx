import React from "react";
import { View, Text } from "react-native";
import Hero from "../sections/Hero";
import LogoTicker from "../sections/LogoTicker";
import ConceptVideo from "../sections/ConceptVideo";
import Curriculum from "../sections/Curriculum";
import WhySection from "../sections/WhySection";
import Features from "../sections/Features";
import Testimonials from "../sections/Testimonials";
import FAQ from "../sections/FAQ";
import CTA from "../sections/CTA";
import {
  consumerCurriculumContent,
  consumerWhySectionData,
  consumerFeaturesData,
  consumerTestimonialsData,
  consumerFaqData,
} from "../../../constants/landing/data";

// Hero title with styled "You Trust" in cyan
const ConsumerHeroTitle = () => (
  <>
    <Text>Find Services</Text>
    {"\n"}
    <Text style={{ color: "#22D3EE" }}>You Trust</Text>
  </>
);

const ConsumerPage: React.FC = () => {
  return (
    <View className="flex-1 bg-bg-primary">
      <Hero
        title={<ConsumerHeroTitle />}
        subtitle="Unleash the Potential for Better Service & Pricing"
        mobileSubtitle="Better Service & Pricing via Relationships"
        ctaText="GET STARTED"
        showPhoneInput={true}
      />
      <LogoTicker />
      <ConceptVideo />
      <Curriculum
        title="SIX DEGREES OF SEPARATION"
        content={consumerCurriculumContent}
      />
      <WhySection
        title="HOW LINKED BY SIX WORKS"
        description="Linked By Six connects you with businesses through trusted relationships. Discover how our platform makes finding reliable services simple and transparent:"
        accordionData={consumerWhySectionData}
        imageSrc="https://picsum.photos/seed/robotmoney/800/600"
        imageAlt="How it works"
      />
      <Features
        title="WHY CHOOSE LINKED BY SIX"
        subtitle={"Explore what sets\nLinked By Six apart"}
        features={consumerFeaturesData}
      />
      <Testimonials
        title="Success Stories"
        subtitle="Shining examples of consumer accomplishments"
        items={consumerTestimonialsData}
      />
      <FAQ
        title="Frequently Asked Questions"
        subtitle="Explore my FAQ section for helpful guidance"
        items={consumerFaqData}
      />
      <CTA />
    </View>
  );
};

export default ConsumerPage;
