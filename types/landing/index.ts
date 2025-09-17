import { LucideIcon } from "lucide-react-native";

export interface AccordionItem {
  id: number;
  title: string;
  content: string;
  image?: string;
}

export interface WeekContent {
  id: number;
  title: string;
  description: string;
  topics: string[];
  imageUrl: string;
}

export interface Stat {
  value: string;
  label: string;
}

export interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface TestimonialItem {
  name: string;
  role: string;
  image: string;
  borderColor: string;
  text: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface PricingTier {
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  features: string[];
  highlighted?: boolean;
  ctaText: string;
}

export interface SlideContent {
  title: string;
  subtitle?: string;
  bullets?: string[];
  boxes?: { title: string; description: string }[];
  highlight?: string;
  image?: string;
}
