import React from "react";
import { View } from "react-native";
import BusinessHero from "../sections/BusinessHero";
import LogoTicker from "../sections/LogoTicker";
import ConceptVideo from "../sections/ConceptVideo";
import Curriculum from "../sections/Curriculum";
import WhySection from "../sections/WhySection";
import Features from "../sections/Features";
import Testimonials from "../sections/Testimonials";
import FAQ from "../sections/FAQ";
import CTA from "../sections/CTA";
import Pricing from "../sections/Pricing";
import Creator from "../sections/Creator";
import {
  businessCurriculumContent,
  businessWhySectionData,
  businessFeaturesData,
  businessTestimonialsData,
  businessFaqData,
} from "../../../constants/landing/data";

const BusinessPage: React.FC = () => {
  return (
    <View className="flex-1 bg-bg-primary">
      <BusinessHero
        title="Grow Your Business With Trust"
        subtitle="Unleash the Potential for Better Service & Pricing"
        ctaText="LIST YOUR BUSINESS"
        backgroundImage="/hero-business-bg.png"
      />
      <LogoTicker />
      <ConceptVideo />
      <Curriculum
        title="LINKED BY SIX ADVANTAGE"
        content={businessCurriculumContent}
      />
      <WhySection
        title="HOW TO GET HIRED"
        description="Join thousands of professionals growing their business through trusted connections. Here is how it works for you:"
        accordionData={businessWhySectionData}
        imageSrc="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2070&auto=format&fit=crop"
        imageAlt="Business Growth"
      />
      <Features
        title="WHY CHOOSE LINKED BY SIX"
        subtitle="Everything you need to scale your service business"
        features={businessFeaturesData}
      />
      <Pricing />
      <Testimonials
        title="Business Success Stories"
        subtitle="Hear from professionals who grew their business with us"
        items={businessTestimonialsData}
      />
      <Creator />
      <FAQ
        title="Business FAQ"
        subtitle="Common questions from service providers"
        items={businessFaqData}
      />
      <CTA />
    </View>
  );
};

export default BusinessPage;
