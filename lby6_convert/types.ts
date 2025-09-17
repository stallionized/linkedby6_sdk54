import React from 'react';

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
  icon: React.ElementType;
  title: string;
  description: string;
}

export interface TestimonialItem {
  name: string;
  role: string;
  image: string;
  colorClass: string;
  text: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}