// Interview Service
// Utility functions for managing business profile interview sessions

import { supabase } from '../supabaseClient';

/**
 * Generates a unique session ID for a new interview
 */
export const generateSessionId = () => {
  return `interview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Starts a new interview session
 * @param {string} businessId - Optional: ID of existing business to update
 * @returns {Promise<{sessionId: string, initialMessage: string}>}
 */
export const startInterview = async (businessId = null) => {
  try {
    const sessionId = generateSessionId();

    // Call business_profile_interview Edge Function to start session
    const { data, error } = await supabase.functions.invoke(
      'business_profile_interview',
      {
        body: {
          session_id: sessionId,
          business_id: businessId,
          user_message: '', // Empty message to get initial greeting
        },
      }
    );

    if (error) {
      throw error;
    }

    return {
      sessionId: data.session_id || sessionId,
      initialMessage: data.message,
      conversationHistory: data.conversation_history || [],
      currentPhase: data.current_phase,
      completionPercentage: data.completion_percentage,
    };
  } catch (error) {
    console.error('Error starting interview:', error);
    throw new Error(`Failed to start interview: ${error.message}`);
  }
};

/**
 * Sends a message in the interview conversation
 * @param {string} sessionId - The interview session ID
 * @param {string} message - User's message
 * @param {Array} conversationHistory - Previous conversation history
 * @param {string} businessId - Optional: ID of business being updated
 * @returns {Promise<{response: object}>}
 */
export const sendInterviewMessage = async (
  sessionId,
  message,
  conversationHistory = [],
  businessId = null
) => {
  try {
    const { data, error } = await supabase.functions.invoke(
      'business_profile_interview',
      {
        body: {
          session_id: sessionId,
          business_id: businessId,
          user_message: message,
          conversation_history: conversationHistory,
        },
      }
    );

    if (error) {
      throw error;
    }

    return {
      type: data.type, // 'question', 'confirmation', 'completed', 'error'
      message: data.message,
      conversationHistory: data.conversation_history,
      currentPhase: data.current_phase,
      completionPercentage: data.completion_percentage,
      collectedData: data.collected_data,
      previewData: data.preview_data,
      businessId: data.business_id,
    };
  } catch (error) {
    console.error('Error sending interview message:', error);
    throw new Error(`Failed to send message: ${error.message}`);
  }
};

/**
 * Retrieves an existing interview session
 * @param {string} sessionId - The interview session ID
 * @returns {Promise<{session: object}>}
 */
export const getInterviewSession = async (sessionId) => {
  try {
    const { data, error } = await supabase.rpc('get_interview_session', {
      p_session_id: sessionId,
    });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return data[0];
  } catch (error) {
    console.error('Error retrieving interview session:', error);
    throw new Error(`Failed to retrieve session: ${error.message}`);
  }
};

/**
 * Abandons an in-progress interview session
 * @param {string} sessionId - The interview session ID
 * @returns {Promise<{success: boolean}>}
 */
export const abandonInterview = async (sessionId) => {
  try {
    const session = await getInterviewSession(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    const { error } = await supabase.rpc('update_interview_session', {
      p_session_id: sessionId,
      p_conversation_history: session.conversation_history,
      p_current_phase: session.current_phase,
      p_completion_percentage: session.completion_percentage,
      p_collected_data: session.collected_data,
      p_status: 'abandoned',
    });

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error abandoning interview:', error);
    throw new Error(`Failed to abandon interview: ${error.message}`);
  }
};

/**
 * Resumes an existing interview session for a business
 * @param {string} businessId - The business ID
 * @returns {Promise<{sessionId: string, conversationHistory: Array, collectedData: object, currentPhase: string, completionPercentage: number, isResuming: boolean} | null>}
 */
export const resumeInterview = async (businessId) => {
  try {
    // Look for most recent in-progress session for this business
    const { data: sessions, error } = await supabase
      .from('profile_interview_sessions')
      .select('*')
      .eq('business_id', businessId)
      .eq('status', 'in_progress')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      throw error;
    }

    if (sessions && sessions.length > 0) {
      const session = sessions[0];
      return {
        sessionId: session.session_id,
        conversationHistory: session.conversation_history || [],
        collectedData: session.collected_data || {},
        currentPhase: session.current_phase || 'basic_info',
        completionPercentage: session.completion_percentage || 0,
        isResuming: true,
      };
    }

    return null;
  } catch (error) {
    console.error('Error resuming interview:', error);
    return null;
  }
};

/**
 * Manually triggers enrichment for a business profile
 * @param {string} businessId - The business ID
 * @param {object} businessData - Business profile data
 * @returns {Promise<{enrichment: object}>}
 */
export const enrichBusinessProfile = async (businessId, businessData) => {
  try {
    const { data, error } = await supabase.functions.invoke(
      'enrich_business_profile',
      {
        body: {
          business_id: businessId,
          business_data: businessData,
        },
      }
    );

    if (error) {
      throw error;
    }

    if (!data.success) {
      throw new Error(data.error || 'Enrichment failed');
    }

    return {
      enrichment: data.enriched_data.enrichment,
      businessData: data.enriched_data.business_data,
    };
  } catch (error) {
    console.error('Error enriching business profile:', error);
    throw new Error(`Failed to enrich profile: ${error.message}`);
  }
};

/**
 * Gets enrichment data for a business
 * @param {string} businessId - The business ID
 * @returns {Promise<{enrichment: object | null}>}
 */
export const getBusinessEnrichment = async (businessId) => {
  try {
    const { data, error } = await supabase.rpc('get_business_enrichment', {
      p_business_id: businessId,
    });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return data[0];
  } catch (error) {
    console.error('Error getting business enrichment:', error);
    throw new Error(`Failed to get enrichment: ${error.message}`);
  }
};

/**
 * Validates collected business data
 * @param {object} data - Collected business data
 * @returns {{valid: boolean, missingFields: string[]}}
 */
export const validateBusinessData = (data) => {
  const requiredFields = [
    'business_name',
    'industry',
    'description',
    'city',
    'state',
  ];

  const missingFields = requiredFields.filter((field) => !data[field]);

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
};

/**
 * Formats business data for display
 * @param {object} data - Business data
 * @returns {object} Formatted data
 */
export const formatBusinessDataForDisplay = (data) => {
  return {
    'Business Name': data.business_name || 'N/A',
    'Industry': data.industry || 'N/A',
    'Description': data.description || 'N/A',
    'Location': data.city && data.state ? `${data.city}, ${data.state}` : 'N/A',
    'ZIP Code': data.zip_code || 'Not provided',
    'Coverage Type': data.coverage_type || 'Not specified',
    'Service Radius': data.coverage_radius
      ? `${data.coverage_radius} miles`
      : 'Not specified',
    'Service Areas': Array.isArray(data.service_areas)
      ? data.service_areas.join(', ')
      : 'Not specified',
  };
};

/**
 * Calculates interview progress percentage
 * @param {string} phase - Current interview phase
 * @param {object} collectedData - Data collected so far
 * @returns {number} Progress percentage (0-100)
 */
export const calculateInterviewProgress = (phase, collectedData) => {
  const phaseWeights = {
    basic_info: 60,
    coverage: 85,
    enrichment: 95,
    review: 100,
    completed: 100,
  };

  const baseProgress = phaseWeights[phase] || 0;

  // Fine-tune based on collected data
  const requiredFields = [
    'business_name',
    'industry',
    'description',
    'city',
    'state',
  ];
  const optionalFields = ['coverage_type', 'service_areas', 'zip_code'];

  const requiredCount = requiredFields.filter(
    (field) => collectedData[field]
  ).length;
  const optionalCount = optionalFields.filter(
    (field) => collectedData[field]
  ).length;

  const requiredWeight = 0.7;
  const optionalWeight = 0.3;

  const dataProgress =
    (requiredCount / requiredFields.length) * requiredWeight * 100 +
    (optionalCount / optionalFields.length) * optionalWeight * 100;

  // Return weighted average, capped at phase maximum
  return Math.min(Math.round((baseProgress + dataProgress) / 2), baseProgress);
};

/**
 * Industry specialization mapping
 * Lists professional categories that need specialization
 */
export const INDUSTRY_SPECIALIZATIONS = {
  // Legal Professionals
  attorney: [
    'Criminal Defense Attorney',
    'Family Law Attorney',
    'Personal Injury Lawyer',
    'Corporate Attorney',
    'Real Estate Attorney',
    'Immigration Attorney',
    'Tax Attorney',
    'Estate Planning Attorney',
  ],
  lawyer: [
    'Criminal Defense Lawyer',
    'Family Law Lawyer',
    'Personal Injury Lawyer',
    'Corporate Lawyer',
  ],

  // Medical Professionals
  doctor: [
    'Primary Care Physician',
    'Cardiologist',
    'Dermatologist',
    'Pediatrician',
    'Orthopedic Surgeon',
    'Psychiatrist',
  ],
  dentist: ['General Dentist', 'Orthodontist', 'Cosmetic Dentist'],
  therapist: [
    'Physical Therapist',
    'Occupational Therapist',
    'Mental Health Therapist',
  ],

  // Financial Professionals
  accountant: [
    'Tax Preparation',
    'Bookkeeping',
    'CFO Services',
    'CPA Services',
  ],

  // Contractors & Trades
  contractor: [
    'Electrical Contractor',
    'Plumbing Contractor',
    'HVAC Contractor',
    'Roofing Contractor',
    'General Contractor',
  ],
  mechanic: ['Auto Repair', 'Transmission Specialist', 'Brake Specialist'],

  // Other Professionals
  consultant: [
    'Business Consultant',
    'IT Consultant',
    'Marketing Consultant',
  ],
  designer: ['Graphic Designer', 'Web Designer', 'Interior Designer'],
  photographer: ['Wedding Photographer', 'Portrait Photographer'],
};

/**
 * Checks if an industry needs specialization
 * @param {string} industry - The industry term
 * @returns {{needs: boolean, category?: string, specializations?: string[]}}
 */
export const needsSpecialization = (industry) => {
  if (!industry) return { needs: false };

  const lowerIndustry = industry.toLowerCase().trim();

  for (const [category, specializations] of Object.entries(
    INDUSTRY_SPECIALIZATIONS
  )) {
    if (lowerIndustry.includes(category)) {
      return {
        needs: true,
        category: category,
        specializations: specializations,
      };
    }
  }

  return { needs: false };
};

/**
 * Gets list of specializations for a given industry category
 * @param {string} category - The broad category (e.g., "attorney", "doctor")
 * @returns {string[]} List of specializations
 */
export const getIndustrySpecializations = (category) => {
  if (!category) return [];

  const lowerCategory = category.toLowerCase().trim();
  return INDUSTRY_SPECIALIZATIONS[lowerCategory] || [];
};

/**
 * Checks if an industry term is a broad category
 * @param {string} industry - The industry term
 * @returns {boolean}
 */
export const isBroadCategory = (industry) => {
  return needsSpecialization(industry).needs;
};

export default {
  generateSessionId,
  startInterview,
  sendInterviewMessage,
  getInterviewSession,
  abandonInterview,
  resumeInterview,
  enrichBusinessProfile,
  getBusinessEnrichment,
  validateBusinessData,
  formatBusinessDataForDisplay,
  calculateInterviewProgress,
  needsSpecialization,
  getIndustrySpecializations,
  isBroadCategory,
  INDUSTRY_SPECIALIZATIONS,
};
