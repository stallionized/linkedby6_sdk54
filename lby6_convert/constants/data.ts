import {
  UserCheck,
  Shield,
  Users,
  MousePointerClick,
  DollarSign,
  MessageSquareText,
  ShieldCheck,
  Network,
  MessageSquare,
  TrendingUp,
  Search,
} from "lucide-react-native";
import { AccordionItem, FAQItem, FeatureItem, TestimonialItem } from "@/types";
import { Colors } from "./colors";

// Consumer Page Data
export const consumerCurriculumContent = {
  id: 1,
  title: "What is Six Degrees of Separation?",
  description:
    "Six Degrees of Separation shows how closely people are connected through a few relationships.",
  topics: [
    "The same relationships that connect people also connect you to businesses",
    "Real relationship paths help you start with built-in trust",
    "Recommendations gain credibility based on who they come from",
    "Connections to businesses often leads to better service and pricing.",
  ],
  imageUrl:
    "https://oofugvbdkyqtidzuaelp.supabase.co/storage/v1/object/public/business-pictures/a_dark_navy_blue_nearly_black_background.jpeg",
};

export const consumerWhySectionData: AccordionItem[] = [
  {
    id: 1,
    title: "1. Perform Your Search",
    content:
      "Start by asking for the business or service you need through AI Search Chat.",
    image:
      "https://oofugvbdkyqtidzuaelp.supabase.co/storage/v1/object/public/business-pictures/Phone_Site.png",
  },
  {
    id: 2,
    title: "2. Mapping of Connections",
    content:
      "See how Linked By Six maps your relationship paths to each business, revealing who in your extended network is linked to them.",
    image:
      "https://oofugvbdkyqtidzuaelp.supabase.co/storage/v1/object/public/business-pictures/Mapping%20to%20Business%20new%20bg.png",
  },
  {
    id: 3,
    title: "3. Review",
    content:
      "View authentic, phone-verified reviews and see how many degrees of separation connect you to each reviewer.",
    image:
      "https://oofugvbdkyqtidzuaelp.supabase.co/storage/v1/object/public/business-pictures/Review_Target_Site.png",
  },
  {
    id: 4,
    title: "4. Connect & Hire",
    content:
      "Reach out to the professional directly through the platform and get your project started with confidence.",
    image:
      "https://oofugvbdkyqtidzuaelp.supabase.co/storage/v1/object/public/business-pictures/Connect_Business_Site.png",
  },
];

export const consumerFeaturesData: FeatureItem[] = [
  {
    icon: UserCheck,
    title: "TRUSTED CONNECTIONS",
    description: "Businesses trusted by people you know",
  },
  {
    icon: Shield,
    title: "TRUST NETWORK - REVIEWS",
    description: "See your connection to every reviewer.",
  },
  {
    icon: MessageSquareText,
    title: "REAL REVIEWS",
    description: "Phone verification blocks bots and fakes",
  },
  {
    icon: Users,
    title: "INSTANT RECOMMENDATIONS",
    description: "Businesses recommended by your network",
  },
  {
    icon: MousePointerClick,
    title: "AI SEARCH CHAT",
    description: "AI finds what you need fast",
  },
  {
    icon: DollarSign,
    title: "NO COST TO YOU",
    description: "Search and connect for free",
  },
];

export const consumerTestimonialsData: TestimonialItem[] = [
  {
    name: "Charlie Miller",
    role: "E-commerce Director",
    image: "https://picsum.photos/seed/charlie/100",
    borderColor: Colors.testimonial.emerald,
    text: '"I work in e-commerce, and the \'AI in Business\' course was a game-changer. By applying AI algorithms for personalized product recommendations and targeted marketing, we witnessed a remarkable 20% surge in sales within the first quarter. Highly recommend this course!"',
  },
  {
    name: "Carl Johnson",
    role: "CEO of a Tech Startup",
    image: "https://picsum.photos/seed/carl/100",
    borderColor: Colors.testimonial.blue,
    text: '"Embracing AI through the \'AI in Business\' course has been transformative. From enhancing our customer support with AI-driven chatbots to implementing predictive analytics for strategic decision-making, our company\'s growth has skyrocketed by 40% in just 6 months!"',
  },
  {
    name: "John Grade",
    role: "Retail Store Owner",
    image: "https://picsum.photos/seed/john/100",
    borderColor: Colors.testimonial.cyan,
    text: '"I\'m a retail store owner, and taking the \'AI in Business\' course was the best decision I made. After implementing AI for inventory management and customer preferences analysis, sales shot up by 25%. It\'s been a real business and mindset booster, thanks to this course."',
  },
  {
    name: "Nina Wellington",
    role: "Marketing Agency Owner",
    image: "https://picsum.photos/seed/nina/100",
    borderColor: Colors.testimonial.purple,
    text: '"I joined the \'AI in Business\' course, and it completely changed the way I run my marketing agency. With AI-driven analytics, I can now fine-tune our campaigns, resulting in a remarkable 40% boost in ROI for my clients. This course was a game-changer for my business."',
  },
];

export const consumerFaqData: FAQItem[] = [
  {
    question:
      "What makes Linked By Six more trustworthy than other review platforms?",
    answer:
      "Linked By Six uses phone-number authentication instead of email, which significantly reduces fake or duplicate accounts and makes reviews far more reliable. Every recommendation is tied to real people with verified identities.",
  },
  {
    question: "How does the Trust Network work?",
    answer:
      "Linked By Six shows how many degrees of separation connect you to each reviewer, giving you a clear view of whose experiences are closest to you and most credible.",
  },
  {
    question: "Why does Linked By Six ask to access my contacts?",
    answer:
      "Your contacts are used only to map relationship paths. They stay encrypted, private, and never shared, sold, or messaged. You can also block anyone who adds you, at any time.",
  },
  {
    question: "How is my information kept secure?",
    answer:
      "We use strong encryption and strict access controls to protect your data. None of your contact details are visible to users or businesses, and your phone number is never shown.",
  },
  {
    question:
      "Does it cost anything to search for businesses on Linked By Six?",
    answer:
      "No. Searching, viewing recommendations, and exploring your Trust Network are completely free.",
  },
  {
    question:
      "Is there a service charge when choosing to work with a business?",
    answer:
      "No. Linked By Six does not charge users any service fees when connecting with or hiring a business.",
  },
];

// Business Page Data
export const businessCurriculumContent = {
  id: 1,
  title: "The Network Effect Advantage",
  description:
    "Tap into the hidden pathways of human connection to amplify your visibility and grow through trust-powered momentum.",
  topics: [
    "Get discovered through trusted connections that elevate your business beyond cold outreach",
    "Convert warmer prospects who already feel a sense of familiarity through shared networks",
    "Build a reputation that spreads through circles where trust already exists",
    "Lower acquisition costs by turning natural referrals into a scalable growth advantage",
  ],
  imageUrl: "/network_effect.png",
};

export const businessWhySectionData: AccordionItem[] = [
  {
    id: 1,
    title: "1. Create Your Profile",
    content:
      "Share your services, expertise, and availability so people can easily understand how you can help.",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: 2,
    title: "2. Get Matched",
    content:
      "We connect your offerings to people actively searching for services like yours through trust-based network mapping.",
    image: "/Search_Results_Business_Site.png",
  },
  {
    id: 3,
    title: "3. Communicate Within the App",
    content:
      "Use built-in communication and outreach tools to respond quickly when someone wants to learn more or request your services.",
    image:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: 4,
    title: "4. Grow Business & Trust Network",
    content:
      "Deliver great service and build relationships that naturally expand your circle of trusted connections—opening even more doors over time.",
    image: "/Growth_Business_Site.png",
  },
];

export const businessFeaturesData: FeatureItem[] = [
  {
    icon: TrendingUp,
    title: "High Quality Leads",
    description: "Warm, trust-driven leads—not random clicks",
  },
  {
    icon: ShieldCheck,
    title: "Real-World Reach",
    description: "Reach grows naturally through real-world connections",
  },
  {
    icon: Network,
    title: "Smart Discovery",
    description:
      "Visibility grows through AI search & profile-based recommendations",
  },
  {
    icon: MessageSquare,
    title: "Instant Communication",
    description: "Communicate instantly with potential clients within app",
  },
  {
    icon: Users,
    title: "Dynamic Analytics",
    description: "Clear insights that drive smarter growth decisions",
  },
  {
    icon: Search,
    title: "Relationship Ranking",
    description: "Rankings reflect connections—not spending",
  },
];

export const businessTestimonialsData: TestimonialItem[] = [
  {
    name: "Sarah Jenkins",
    role: "Landscape Architect",
    image: "https://picsum.photos/seed/sarah/100",
    borderColor: Colors.testimonial.emerald,
    text: '"Since joining Linked By Six, I\'ve seen a 50% increase in qualified leads. The clients coming in are already warm because they know someone I know. It cuts down the sales process significantly."',
  },
  {
    name: "Michael Chen",
    role: "HVAC Specialist",
    image: "https://picsum.photos/seed/mike/100",
    borderColor: Colors.testimonial.blue,
    text: '"The verification process weeded out a lot of the competition that wasn\'t serious. Now, when I get a lead, I know it\'s real, and they know I\'m legitimate. Best ROI for my marketing budget."',
  },
  {
    name: "Elena Rodriguez",
    role: "Legal Consultant",
    image: "https://picsum.photos/seed/elena/100",
    borderColor: Colors.testimonial.purple,
    text: '"Trust is everything in law. This platform allows my reputation to precede me. My clients feel more comfortable hiring me knowing we share mutual connections."',
  },
  {
    name: "David Wright",
    role: "General Contractor",
    image: "https://picsum.photos/seed/david/100",
    borderColor: Colors.testimonial.cyan,
    text: '"I used to spend thousands on ads. Now, my network does the work for me. The \'six degrees\' concept actually works in practice. Highly recommend for any service business."',
  },
];

export const businessFaqData: FAQItem[] = [
  {
    question: "Do I have to share my customer list or upload client data?",
    answer:
      "No. Linked By Six does not require you to upload your customer list or client database. The platform focuses on mapping your personal and professional contacts, not your customers. Your client information stays in your own systems and is never required for your business to participate.",
  },
  {
    question:
      "Can other businesses see or contact my customers through Linked By Six?",
    answer:
      "No. Other businesses cannot see, download, or contact your customers. Contact mapping uses encrypted relationship signals in the background to understand how people are connected, but it does not expose the identities of your contacts or customers to anyone else.",
  },
  {
    question:
      "What information is used for contact mapping, and how is it protected?",
    answer:
      "Linked By Six uses your own contacts (such as those on your phone or device) to understand degrees of separation and trust pathways. This data is processed securely and used only to calculate relationship strength and proximity—not to reveal who is in your network or to allow others to access those contacts.",
  },
  {
    question: "How does ranking work, and can visibility be bought?",
    answer:
      'Ranking is based on real relationships, relevance, and trust pathways—not ad spend. Businesses cannot pay to "jump the line." Your visibility increases as your network deepens, your connections grow, and you deliver positive experiences that reinforce trust in the system.',
  },
  {
    question: "How can my business expand its reach on Linked By Six?",
    answer:
      "Your reach grows when you and your employees join Linked By Six, connect your contacts, and continue to socialize and build relationships in the real world. Each new connection can extend your business into additional circles, creating an exponential effect as more people and employees participate.",
  },
  {
    question: "Do I need a large network for Linked By Six to be effective?",
    answer:
      "No. Even a modest network can create meaningful pathways. Over time, as you and your team add contacts and maintain genuine relationships, your business taps into more second-, third-, and further-degree connections that would be difficult to access through traditional advertising alone.",
  },
  {
    question: "How are leads generated, and what do I pay for?",
    answer:
      "Leads come from people who discover your business through trust-based mapping, AI search, and recommendations, not random impressions. Depending on your plan, you'll pay a per-lead fee only for unique leads that remain valid for a defined period (for example, 6 months), with lower per-lead costs in higher tiers.",
  },
  {
    question: "What's the difference between the Free tier and paid plans?",
    answer:
      "The Free tier gives you an unclaimed business profile that can appear in search results but includes no relationship mapping, no leads, and no analytics. Paid plans add employee seats, lead delivery, and progressively deeper analytics, making it easier to understand performance and scale your reach.",
  },
  {
    question: "Is Linked By Six an advertising platform or a CRM replacement?",
    answer:
      "Linked By Six is neither a traditional ad platform nor a CRM replacement. It's a trust-based discovery and connection layer that can complement your existing tools. You can continue using your CRM, email, or invoicing systems as usual—Linked By Six helps more of the right people find you in the first place.",
  },
  {
    question:
      "How does Linked By Six support ongoing growth, not just one-time leads?",
    answer:
      "Each interaction—being discovered, recommended, or successfully hired—strengthens your position in the network. Over time, this creates compounding visibility: your business becomes easier to find for people connected through overlapping relationships, making growth more sustainable than one-off campaigns or short-lived ads.",
  },
];

// Professions for LogoTicker
export const professions = [
  "Plumbers",
  "Electricians",
  "HVAC Technicians",
  "Roofers",
  "General Contractors",
  "Handymen",
  "Painters",
  "Carpenters",
  "Pest Control Technicians",
  "Landscapers",
  "Tree Service Professionals",
  "Appliance Repair Technicians",
  "House Cleaners",
  "Carpet Cleaners",
  "Home Inspectors",
  "Movers",
  "Pool Technicians",
  "Junk Removal Specialists",
  "Flooring Installers",
  "Window Installers",
  "Door Installers",
  "Fence Installers",
  "Siding Installers",
  "Gutter Installers",
  "Solar Installers",
  "Pressure Washing Professionals",
  "Home Security Technicians",
  "Auto Mechanics",
  "Auto Body Technicians",
  "Tire Technicians",
  "Car Detailers",
  "Car Wash Operators",
  "Windshield Repair Technicians",
  "Tow Truck Operators",
  "Car Audio Specialists",
  "Tint Specialists",
  "Car Sales Professionals",
  "Motorcycle Sales Professionals",
  "Boat Sales Professionals",
  "RV Sales Professionals",
  "Car Rental Agents",
  "Ride Service Drivers",
  "Lawyers",
  "Accountants",
  "Tax Preparers",
  "Financial Advisors",
  "Insurance Agents",
  "Mortgage Brokers",
  "Notaries",
  "Credit Repair Specialists",
  "Real Estate Agents",
  "Property Managers",
  "Home Appraisers",
  "Home Stagers",
  "Leasing Agents",
  "Doctors",
  "Dentists",
  "Chiropractors",
  "Physical Therapists",
  "Mental Health Counselors",
  "Nutritionists",
  "Massage Therapists",
  "Acupuncturists",
  "Home Health Aides",
  "Senior Care Providers",
  "Hair Stylists",
  "Barbers",
  "Nail Technicians",
  "Estheticians",
  "Makeup Artists",
  "Tattoo Artists",
  "Piercers",
  "Med Spa Practitioners",
  "Personal Trainers",
  "Personal Stylists",
  "Childcare Providers",
  "Babysitters",
  "Nannies",
  "Tutors",
  "Test Prep Instructors",
  "Music Teachers",
  "Dance Instructors",
  "Art Instructors",
  "Martial Arts Instructors",
  "Veterinarians",
  "Dog Walkers",
  "Pet Sitters",
  "Pet Boarding Providers",
  "Dog Trainers",
  "Pet Groomers",
  "Photographers",
  "Videographers",
  "Caterers",
  "Florists",
  "Bartenders",
  "Party Rental Providers",
  "Event Planners",
  "Wedding Planners",
  "DJs",
  "Live Entertainers",
];

// Pricing Tiers
export const pricingTiers = [
  {
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "Start with the basics",
    features: [
      "1 business profile",
      "Listed in search results",
      "Visible to connected users",
      "No relationship mapping",
      "No leads",
    ],
    ctaText: "Get Started",
  },
  {
    name: "Starter",
    monthlyPrice: 49,
    yearlyPrice: 39,
    description: "Perfect for solo professionals",
    features: [
      "Everything in Free",
      "1 employee seat",
      "Relationship mapping",
      "5 leads/month",
      "Basic analytics",
    ],
    ctaText: "Start Trial",
  },
  {
    name: "Growth",
    monthlyPrice: 149,
    yearlyPrice: 119,
    description: "For growing teams",
    features: [
      "Everything in Starter",
      "5 employee seats",
      "20 leads/month",
      "Advanced analytics",
      "Priority support",
    ],
    highlighted: true,
    ctaText: "Start Trial",
  },
  {
    name: "Enterprise",
    monthlyPrice: 399,
    yearlyPrice: 319,
    description: "For large organizations",
    features: [
      "Everything in Growth",
      "Unlimited seats",
      "Unlimited leads",
      "Custom integrations",
      "Dedicated account manager",
    ],
    ctaText: "Contact Sales",
  },
];

// Video URLs
export const VIMEO_VIDEO_ID = "1140162058";
