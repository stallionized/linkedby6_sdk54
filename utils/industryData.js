// industryData.js
// Common industries and their specializations

export const INDUSTRIES = [
  {
    category: 'Beauty & Personal Care',
    specializations: [
      'Hair Salon',
      'Barbershop',
      'Nail Salon',
      'Spa & Wellness',
      'Massage Therapy',
      'Esthetics & Skincare',
      'Makeup Artist',
      'Tattoo & Piercing',
    ],
  },
  {
    category: 'Home Services',
    specializations: [
      'Plumbing',
      'Electrical',
      'HVAC',
      'Carpentry',
      'Painting',
      'Cleaning Services',
      'Landscaping',
      'Roofing',
      'Handyman Services',
    ],
  },
  {
    category: 'Professional Services',
    specializations: [
      'Legal Services',
      'Accounting & Bookkeeping',
      'Consulting',
      'Real Estate',
      'Insurance',
      'Marketing & Advertising',
      'IT Services',
      'Photography',
      'Event Planning',
    ],
  },
  {
    category: 'Health & Medical',
    specializations: [
      'Dental',
      'Medical Practice',
      'Chiropractic',
      'Physical Therapy',
      'Mental Health Services',
      'Veterinary Services',
      'Optometry',
      'Nutrition & Dietetics',
    ],
  },
  {
    category: 'Food & Beverage',
    specializations: [
      'Restaurant',
      'Cafe & Coffee Shop',
      'Bakery',
      'Catering',
      'Food Truck',
      'Bar & Lounge',
      'Grocery & Specialty Foods',
    ],
  },
  {
    category: 'Retail',
    specializations: [
      'Clothing & Apparel',
      'Electronics',
      'Home Goods',
      'Automotive Parts',
      'Books & Stationery',
      'Jewelry',
      'Pet Supplies',
      'Sporting Goods',
    ],
  },
  {
    category: 'Automotive',
    specializations: [
      'Auto Repair',
      'Auto Detailing',
      'Car Wash',
      'Towing',
      'Auto Body Shop',
      'Tire Services',
    ],
  },
  {
    category: 'Education & Training',
    specializations: [
      'Tutoring',
      'Music Lessons',
      'Dance Studio',
      'Martial Arts',
      'Driving School',
      'Professional Training',
      'Childcare & Preschool',
    ],
  },
  {
    category: 'Fitness & Recreation',
    specializations: [
      'Gym & Fitness Center',
      'Yoga Studio',
      'Personal Training',
      'Sports Facility',
      'Recreation Center',
    ],
  },
  {
    category: 'Construction & Contractors',
    specializations: [
      'General Contractor',
      'Flooring',
      'Kitchen & Bath Remodeling',
      'Fencing',
      'Concrete Services',
      'Demolition',
    ],
  },
];

// Get all industry names (flattened list)
export const getAllIndustries = () => {
  const allIndustries = [];
  INDUSTRIES.forEach((category) => {
    allIndustries.push(...category.specializations);
  });
  return allIndustries.sort();
};

// Search industries by query
export const searchIndustries = (query) => {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const queryLower = query.toLowerCase().trim();
  const allIndustries = getAllIndustries();

  return allIndustries.filter((industry) =>
    industry.toLowerCase().includes(queryLower)
  ).slice(0, 5); // Return max 5 suggestions
};

// Get specializations for a category
export const getSpecializationsForCategory = (categoryName) => {
  const category = INDUSTRIES.find(
    (cat) => cat.category.toLowerCase() === categoryName.toLowerCase()
  );
  return category ? category.specializations : [];
};
