/**
 * Location Service Utility for SearchScreen location-aware search
 * Handles GPS permissions, coordinates, and "near me" detection
 */

import { Platform, Linking, Alert } from 'react-native';

// Conditional import pattern (from BusinessProfileScreen.js)
let Location;
try {
  Location = require('expo-location');
} catch (error) {
  console.log('expo-location not available:', error);
  Location = null;
}

// "Near me" phrase detection patterns
const NEAR_ME_PATTERNS = [
  /\bnear\s*me\b/i,
  /\bnear\s*my\s*location\b/i,
  /\bnearby\b/i,
  /\bclose\s*to\s*me\b/i,
  /\bin\s*my\s*area\b/i,
  /\baround\s*me\b/i,
  /\bclose\s*by\b/i,
  /\bin\s*my\s*neighborhood\b/i,
  /\bwithin\s*\d+\s*(miles?|mi|km|kilometers?)\b/i,
  /\bnear\s*here\b/i,
  /\blocal\s+(to\s+me|businesses?|services?)\b/i,
];

/**
 * Check if query contains "near me" type phrases
 * @param {string} query - User's search query
 * @returns {boolean} - True if query contains location intent
 */
export function containsNearMePhrase(query) {
  if (!query || typeof query !== 'string') return false;
  return NEAR_ME_PATTERNS.some(pattern => pattern.test(query));
}

/**
 * Check if location services are available on device
 * @returns {Promise<boolean>}
 */
export async function isLocationAvailable() {
  if (!Location) return false;
  try {
    const enabled = await Location.hasServicesEnabledAsync();
    return enabled;
  } catch (error) {
    console.error('Error checking location services:', error);
    return false;
  }
}

/**
 * Get current permission status without requesting
 * @returns {Promise<{status: string}>} - status: 'granted', 'denied', 'undetermined', 'unavailable', 'error'
 */
export async function getPermissionStatus() {
  if (!Location) return { status: 'unavailable' };

  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return { status }; // 'granted', 'denied', 'undetermined'
  } catch (error) {
    console.error('Error getting permission status:', error);
    return { status: 'error', error };
  }
}

/**
 * Request foreground location permission
 * @returns {Promise<{status: string, canAskAgain: boolean}>}
 */
export async function requestLocationPermission() {
  if (!Location) {
    return {
      status: 'unavailable',
      canAskAgain: false,
      message: 'Location services not available on this device',
    };
  }

  try {
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    return { status, canAskAgain };
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return {
      status: 'error',
      canAskAgain: false,
      error,
    };
  }
}

/**
 * Get current GPS coordinates
 * @param {Object} options - Location options
 * @param {number} options.timeout - Timeout in milliseconds (default 15000)
 * @param {string} options.accuracy - 'low', 'medium', 'high' (default 'medium')
 * @returns {Promise<{latitude: number, longitude: number, accuracy: number, timestamp: number}>}
 */
export async function getCurrentPosition(options = {}) {
  if (!Location) {
    throw new Error('Location services not available');
  }

  const { timeout = 15000, accuracy = 'medium' } = options;

  // Map accuracy to expo-location constants
  const accuracyMap = {
    low: Location.Accuracy.Low,
    medium: Location.Accuracy.Balanced,
    high: Location.Accuracy.High,
  };

  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: accuracyMap[accuracy] || Location.Accuracy.Balanced,
      timeout,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      timestamp: location.timestamp,
    };
  } catch (error) {
    console.error('Error getting current position:', error);
    throw error;
  }
}

/**
 * Reverse geocode GPS coordinates to get city/state
 * Uses expo-location's built-in reverse geocoding
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<{city: string, state: string, zip_code: string}|null>}
 */
export async function reverseGeocodeLocation(latitude, longitude) {
  if (!Location) return null;

  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (results && results.length > 0) {
      const result = results[0];
      return {
        city: result.city || result.subregion || null,
        state: result.region || null,
        zip_code: result.postalCode || null,
        country: result.country || null,
        street: result.street || null,
        name: result.name || null,
      };
    }
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

/**
 * Get full user location data (coordinates + city/state)
 * @param {Object} options - Location options (passed to getCurrentPosition)
 * @returns {Promise<{lat: number, lng: number, city: string, state: string, zip_code: string, accuracy: number, timestamp: number}>}
 */
export async function getUserLocation(options = {}) {
  // Get GPS coordinates
  const position = await getCurrentPosition(options);

  // Reverse geocode to get city/state
  const locationInfo = await reverseGeocodeLocation(
    position.latitude,
    position.longitude
  );

  return {
    lat: position.latitude,
    lng: position.longitude,
    city: locationInfo?.city || null,
    state: locationInfo?.state || null,
    zip_code: locationInfo?.zip_code || null,
    accuracy: position.accuracy,
    timestamp: position.timestamp,
  };
}

/**
 * Get location with progressive fallback for slow GPS
 * Tries high accuracy first, then falls back to lower accuracy
 * @returns {Promise<Object>} - Location data
 */
export async function getUserLocationWithFallback() {
  try {
    // Try balanced accuracy first with shorter timeout
    return await getUserLocation({ accuracy: 'medium', timeout: 8000 });
  } catch (error) {
    console.log('Medium accuracy timeout, trying low accuracy...');
    try {
      return await getUserLocation({ accuracy: 'low', timeout: 15000 });
    } catch (error2) {
      console.error('All location attempts failed:', error2);
      throw error2;
    }
  }
}

/**
 * Open device settings for location permissions
 */
export function openLocationSettings() {
  if (Platform.OS === 'ios') {
    Linking.openURL('app-settings:');
  } else {
    Linking.openSettings();
  }
}

/**
 * Show alert explaining why location is needed and how to enable
 * @param {Function} onRetry - Callback when user taps "Try Again"
 * @param {Function} onOpenSettings - Callback when user taps "Open Settings"
 */
export function showLocationDeniedAlert(onRetry, onOpenSettings) {
  Alert.alert(
    'Location Required',
    'LinkedBySix needs your location to find businesses near you. Please enable location access to continue searching.',
    [
      {
        text: 'Open Settings',
        onPress: onOpenSettings || openLocationSettings,
      },
      {
        text: 'Try Again',
        onPress: onRetry,
        style: 'default',
      },
    ],
    { cancelable: false }
  );
}

/**
 * Format location for display (e.g., "Austin, TX")
 * @param {Object} location - Location object with city and state
 * @returns {string|null}
 */
export function formatLocationDisplay(location) {
  if (!location) return null;
  if (location.city && location.state) {
    return `${location.city}, ${location.state}`;
  }
  if (location.city) return location.city;
  if (location.state) return location.state;
  return null;
}

/**
 * Check if running on a native mobile platform
 * @returns {boolean}
 */
export function isNativeApp() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/**
 * Check if Location module is available
 * @returns {boolean}
 */
export function isLocationModuleAvailable() {
  return Location !== null;
}

// Export Location module for direct access if needed
export { Location };
