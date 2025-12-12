// onboardingService.js
// Utility service for onboarding-related operations including access code validation,
// ZIP code verification, and waitlist management

import { supabase } from '../supabaseClient';

/**
 * Check if access code is required for new user registration
 * @returns {Promise<boolean>} Whether access code is required
 */
export async function checkAccessCodeRequired() {
  try {
    const { data, error } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'access_code_required')
      .single();

    if (error) {
      console.error('Error checking access code required setting:', error);
      return true; // Default to required if error
    }

    return data?.value === 'true';
  } catch (error) {
    console.error('Exception checking access code required:', error);
    return true; // Default to required if exception
  }
}

/**
 * Check if geographic restriction is enabled
 * @returns {Promise<boolean>} Whether geographic restriction is enabled
 */
export async function checkGeoRestrictionEnabled() {
  try {
    const { data, error } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'geographic_restriction_enabled')
      .single();

    if (error) {
      console.error('Error checking geo restriction setting:', error);
      return true; // Default to enabled if error
    }

    return data?.value === 'true';
  } catch (error) {
    console.error('Exception checking geo restriction:', error);
    return true; // Default to enabled if exception
  }
}

/**
 * Validate an access code
 * @param {string} code - The access code to validate
 * @returns {Promise<Object>} Validation result with valid status, code_id, remaining_uses, and error_message
 */
export async function validateAccessCode(code) {
  try {
    if (!code || typeof code !== 'string') {
      return {
        valid: false,
        code_id: null,
        remaining_uses: null,
        error_message: 'Access code is required'
      };
    }

    // Call the database function to validate
    const { data, error } = await supabase
      .rpc('validate_access_code', { code_text: code.toUpperCase().trim() });

    if (error) {
      console.error('Error validating access code:', error);
      return {
        valid: false,
        code_id: null,
        remaining_uses: null,
        error_message: 'Unable to validate access code. Please try again.'
      };
    }

    if (!data || data.length === 0) {
      return {
        valid: false,
        code_id: null,
        remaining_uses: null,
        error_message: 'Invalid access code'
      };
    }

    const result = data[0];
    return {
      valid: result.valid,
      code_id: result.code_id,
      remaining_uses: result.remaining_uses,
      error_message: result.error_message
    };
  } catch (error) {
    console.error('Exception validating access code:', error);
    return {
      valid: false,
      code_id: null,
      remaining_uses: null,
      error_message: 'Unable to validate access code. Please try again.'
    };
  }
}

/**
 * Record access code usage after successful registration
 * @param {string} codeId - The UUID of the access code
 * @param {string} userId - The UUID of the user who used the code
 * @returns {Promise<boolean>} Whether the usage was recorded successfully
 */
export async function recordAccessCodeUsage(codeId, userId) {
  try {
    // First, increment the usage count
    const { data: incrementResult, error: incrementError } = await supabase
      .rpc('increment_access_code_usage', { code_text: null }); // We'll use direct update instead

    // Insert usage record
    const { error: usageError } = await supabase
      .from('access_code_usage')
      .insert({
        access_code_id: codeId,
        user_id: userId
      });

    if (usageError) {
      console.error('Error recording access code usage:', usageError);
      return false;
    }

    // Update the access code's current_uses count
    const { error: updateError } = await supabase
      .from('access_codes')
      .update({
        current_uses: supabase.raw('current_uses + 1'),
        updated_at: new Date().toISOString()
      })
      .eq('id', codeId);

    if (updateError) {
      console.error('Error updating access code usage count:', updateError);
      // Don't return false - the usage was recorded
    }

    return true;
  } catch (error) {
    console.error('Exception recording access code usage:', error);
    return false;
  }
}

/**
 * Validate a ZIP code using us_locations table and check if in service area (NY/NJ)
 * @param {string} zipCode - The ZIP code to validate
 * @returns {Promise<Object>} Validation result with valid status, inServiceArea, and location info
 */
export async function validateZipCode(zipCode) {
  try {
    if (!zipCode || !/^\d{5}$/.test(zipCode)) {
      return {
        valid: false,
        inServiceArea: false,
        state: null,
        city: null,
        error_message: 'Invalid ZIP code format'
      };
    }

    // Query the us_locations table for ZIP code data
    const { data, error } = await supabase
      .from('us_locations')
      .select('zip_code, state, city, area_name, district_name')
      .eq('zip_code', zipCode)
      .limit(1)
      .single();

    if (error || !data) {
      return {
        valid: false,
        inServiceArea: false,
        state: null,
        city: null,
        error_message: 'ZIP code not found'
      };
    }

    // Check if ZIP is in service area (NY or NJ)
    const serviceAreaStates = ['NY', 'NJ'];
    const inServiceArea = serviceAreaStates.includes(data.state);

    return {
      valid: true,
      inServiceArea: inServiceArea,
      state: data.state,
      city: data.city,
      county: data.district_name, // district_name contains the state/area name
      area: data.area_name,
      error_message: inServiceArea ? null : 'ZIP code is outside our current service area (NY/NJ only)'
    };
  } catch (error) {
    console.error('Exception validating ZIP code:', error);
    return {
      valid: false,
      inServiceArea: false,
      state: null,
      city: null,
      error_message: 'Unable to validate ZIP code. Please try again.'
    };
  }
}

/**
 * Submit ZIP code intake form - validates ZIP and sends appropriate email
 * @param {Object} params - Intake parameters
 * @param {string} params.email - User's email address
 * @param {string} params.phone - User's phone number (optional)
 * @param {boolean} params.smsConsent - Whether user consented to SMS
 * @param {string} params.zipCode - User's ZIP code
 * @param {string} params.signupIntent - 'consumer_only' or 'consumer_and_business'
 * @returns {Promise<Object>} Result with success status, type (access_code or waitlist), and message
 */
export async function submitZipCodeIntake({ email, phone, smsConsent, zipCode, signupIntent }) {
  try {
    // Validate required fields
    if (!email || !zipCode) {
      return {
        success: false,
        type: null,
        message: 'Email and ZIP code are required'
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        type: null,
        message: 'Please enter a valid email address'
      };
    }

    // Validate ZIP code format
    if (!/^\d{5}$/.test(zipCode)) {
      return {
        success: false,
        type: null,
        message: 'Please enter a valid 5-digit ZIP code'
      };
    }

    // Call the edge function
    const { data, error } = await supabase.functions.invoke('send-onboarding-email', {
      body: {
        email,
        phone: phone || null,
        smsConsent: smsConsent || false,
        zipCode,
        signupIntent: signupIntent || 'consumer_only'
      }
    });

    if (error) {
      console.error('Error calling send-onboarding-email:', error);
      return {
        success: false,
        type: null,
        message: 'Unable to process your request. Please try again.'
      };
    }

    return {
      success: data.success,
      type: data.type, // 'access_code' or 'waitlist'
      message: data.message,
      code: data.code // Only present for access_code type (for testing)
    };
  } catch (error) {
    console.error('Exception in submitZipCodeIntake:', error);
    return {
      success: false,
      type: null,
      message: 'Unable to process your request. Please try again.'
    };
  }
}

/**
 * Add a user to the waitlist manually (fallback if edge function fails)
 * @param {Object} params - Waitlist parameters
 * @param {string} params.email - User's email address
 * @param {string} params.phone - User's phone number (optional)
 * @param {boolean} params.smsConsent - Whether user consented to SMS
 * @param {string} params.zipCode - User's ZIP code
 * @param {string} params.signupIntent - 'consumer_only' or 'consumer_and_business'
 * @param {string} params.reason - Reason for waitlist ('outside_service_area' or 'no_access_code')
 * @returns {Promise<Object>} Result with success status and message
 */
export async function addToWaitlist({ email, phone, smsConsent, zipCode, signupIntent, reason }) {
  try {
    const { error } = await supabase
      .from('waitlist')
      .insert({
        email,
        phone: phone || null,
        sms_consent: smsConsent || false,
        zip_code: zipCode,
        signup_intent: signupIntent || 'consumer_only',
        waitlist_reason: reason || 'outside_service_area'
      });

    if (error) {
      console.error('Error adding to waitlist:', error);
      return {
        success: false,
        message: 'Unable to add to waitlist. Please try again.'
      };
    }

    return {
      success: true,
      message: 'Successfully added to waitlist'
    };
  } catch (error) {
    console.error('Exception adding to waitlist:', error);
    return {
      success: false,
      message: 'Unable to add to waitlist. Please try again.'
    };
  }
}

/**
 * Update user profile with ZIP code and access code used after registration
 * @param {string} userId - The user's UUID
 * @param {string} zipCode - The ZIP code used during registration
 * @param {string} accessCodeId - The access code UUID (optional)
 * @returns {Promise<boolean>} Whether the update was successful
 */
export async function updateUserOnboardingInfo(userId, zipCode, accessCodeId = null) {
  try {
    const updateData = {
      zip_code: zipCode,
      onboarding_completed_at: new Date().toISOString()
    };

    if (accessCodeId) {
      updateData.access_code_used = accessCodeId;
    }

    const { error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating user onboarding info:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception updating user onboarding info:', error);
    return false;
  }
}

/**
 * Check if a user has a business profile
 * @param {string} userId - The user's UUID
 * @returns {Promise<Object>} Result with hasBusiness, businessStatus, and businessId
 */
export async function checkUserBusinessStatus(userId) {
  try {
    const { data, error } = await supabase
      .from('business_profiles')
      .select('business_id, business_status, business_name')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return {
        hasBusiness: false,
        businessStatus: null,
        businessId: null,
        businessName: null
      };
    }

    return {
      hasBusiness: true,
      businessStatus: data.business_status,
      businessId: data.business_id,
      businessName: data.business_name
    };
  } catch (error) {
    console.error('Exception checking user business status:', error);
    return {
      hasBusiness: false,
      businessStatus: null,
      businessId: null,
      businessName: null
    };
  }
}

/**
 * Mark an access code request as used after user completes registration
 * @param {string} email - The email used in the request
 * @param {string} userId - The new user's UUID
 * @returns {Promise<boolean>} Whether the update was successful
 */
export async function markAccessCodeRequestUsed(email, userId) {
  try {
    const { error } = await supabase
      .from('access_code_requests')
      .update({
        is_used: true,
        used_user_id: userId,
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .eq('is_used', false);

    if (error) {
      console.error('Error marking access code request as used:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception marking access code request as used:', error);
    return false;
  }
}

/**
 * Convert a waitlist entry when user registers
 * @param {string} email - The email on the waitlist
 * @param {string} userId - The new user's UUID
 * @returns {Promise<boolean>} Whether the conversion was recorded
 */
export async function convertWaitlistEntry(email, userId) {
  try {
    const { error } = await supabase
      .from('waitlist')
      .update({
        is_converted: true,
        converted_user_id: userId,
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .eq('is_converted', false);

    if (error) {
      console.error('Error converting waitlist entry:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception converting waitlist entry:', error);
    return false;
  }
}

export default {
  checkAccessCodeRequired,
  checkGeoRestrictionEnabled,
  validateAccessCode,
  recordAccessCodeUsage,
  validateZipCode,
  submitZipCodeIntake,
  addToWaitlist,
  updateUserOnboardingInfo,
  checkUserBusinessStatus,
  markAccessCodeRequestUsed,
  convertWaitlistEntry
};
