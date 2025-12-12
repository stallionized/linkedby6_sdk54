import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Contacts from 'expo-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { supabase } from '../supabaseClient';
import { getSession } from '../Auth';

// Constants
const CONTACT_SYNC_TASK = 'CONTACT_SYNC_TASK';
const SYNC_PREFERENCE_KEY = 'contactSyncMode';
const LAST_SYNC_KEY = 'contactLastSyncTimestamp';
const SYNC_USER_ID_KEY = 'contactSyncUserId';

// Phone number priority order
const PHONE_PRIORITY = ['mobile', 'home', 'work', 'main', 'iphone', 'cell'];

/**
 * Get the preferred phone number from a list of phone numbers
 * Priority: Mobile > Home > Work > Other
 */
export const getPreferredPhoneNumber = (phoneNumbers) => {
  if (!phoneNumbers || phoneNumbers.length === 0) return null;
  if (phoneNumbers.length === 1) return phoneNumbers[0].number;

  // Try to find a phone by priority
  for (const priorityType of PHONE_PRIORITY) {
    const match = phoneNumbers.find(p => {
      const label = (p.label || '').toLowerCase();
      return label.includes(priorityType);
    });
    if (match) return match.number;
  }

  // Fallback to first number
  return phoneNumbers[0].number;
};

/**
 * Normalize phone number for comparison
 * Removes all non-digit characters except leading +
 */
export const normalizePhoneNumber = (phone) => {
  if (!phone) return null;
  // Keep + at start if present, remove all other non-digits
  const hasPlus = phone.trim().startsWith('+');
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  return hasPlus ? `+${digits}` : digits;
};

/**
 * Get the contact sync preference from storage
 */
export const getContactSyncPreference = async () => {
  try {
    const preference = await AsyncStorage.getItem(SYNC_PREFERENCE_KEY);
    return preference; // 'one-time' | 'continuous' | null
  } catch (error) {
    console.error('Error getting sync preference:', error);
    return null;
  }
};

/**
 * Set the contact sync preference
 */
export const setContactSyncPreference = async (mode) => {
  try {
    await AsyncStorage.setItem(SYNC_PREFERENCE_KEY, mode);
    return true;
  } catch (error) {
    console.error('Error setting sync preference:', error);
    return false;
  }
};

/**
 * Get the last sync timestamp
 */
export const getLastSyncTimestamp = async () => {
  try {
    const timestamp = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return timestamp ? new Date(timestamp) : null;
  } catch (error) {
    console.error('Error getting last sync timestamp:', error);
    return null;
  }
};

/**
 * Update the last sync timestamp
 */
const updateLastSyncTimestamp = async () => {
  try {
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  } catch (error) {
    console.error('Error updating last sync timestamp:', error);
  }
};

/**
 * Get stored user ID for sync
 */
const getSyncUserId = async () => {
  try {
    return await AsyncStorage.getItem(SYNC_USER_ID_KEY);
  } catch (error) {
    console.error('Error getting sync user ID:', error);
    return null;
  }
};

/**
 * Store user ID for sync
 */
const setSyncUserId = async (userId) => {
  try {
    await AsyncStorage.setItem(SYNC_USER_ID_KEY, userId);
  } catch (error) {
    console.error('Error setting sync user ID:', error);
  }
};

/**
 * Perform the actual contact sync
 * Compares device contacts with stored connections and adds new ones
 */
export const performContactSync = async (userId = null) => {
  try {
    // Get user ID
    let currentUserId = userId;
    if (!currentUserId) {
      const session = await getSession();
      currentUserId = session?.user?.id;
    }
    if (!currentUserId) {
      currentUserId = await getSyncUserId();
    }

    if (!currentUserId) {
      console.log('ContactSync: No user ID available, skipping sync');
      return { success: false, reason: 'no_user' };
    }

    // Check sync preference
    const syncPreference = await getContactSyncPreference();
    if (syncPreference !== 'continuous') {
      console.log('ContactSync: Continuous sync not enabled, skipping');
      return { success: false, reason: 'sync_disabled' };
    }

    // Check contacts permission
    const { status } = await Contacts.getPermissionsAsync();
    if (status !== 'granted') {
      console.log('ContactSync: Contacts permission not granted');
      return { success: false, reason: 'no_permission' };
    }

    // Get device contacts
    const { data: deviceContacts } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
    });

    if (!deviceContacts || deviceContacts.length === 0) {
      console.log('ContactSync: No device contacts found');
      return { success: true, added: 0 };
    }

    // Get existing connections from database
    const { data: existingConnections, error: fetchError } = await supabase
      .from('connections')
      .select('contact_phone_number')
      .eq('user_id', currentUserId);

    if (fetchError) {
      console.error('ContactSync: Error fetching existing connections:', fetchError);
      return { success: false, reason: 'fetch_error' };
    }

    // Create set of normalized existing phone numbers
    const existingPhoneNumbers = new Set(
      (existingConnections || [])
        .map(conn => normalizePhoneNumber(conn.contact_phone_number))
        .filter(Boolean)
    );

    // Filter for new contacts only
    const newContacts = deviceContacts
      .filter(contact => contact.name && contact.phoneNumbers?.length > 0)
      .map(contact => {
        const preferredPhone = getPreferredPhoneNumber(contact.phoneNumbers);
        return {
          user_id: currentUserId,
          name: contact.name,
          contact_phone_number: preferredPhone || '',
          relationship: 'Customer',
          family_relation: null,
          friend_details: null
        };
      })
      .filter(contact => {
        const normalizedPhone = normalizePhoneNumber(contact.contact_phone_number);
        if (!normalizedPhone) return false;
        return !existingPhoneNumbers.has(normalizedPhone);
      });

    if (newContacts.length === 0) {
      console.log('ContactSync: No new contacts to add');
      await updateLastSyncTimestamp();
      return { success: true, added: 0 };
    }

    // Insert new contacts
    const { data: insertedData, error: insertError } = await supabase
      .from('connections')
      .insert(newContacts)
      .select();

    if (insertError) {
      console.error('ContactSync: Error inserting new contacts:', insertError);
      return { success: false, reason: 'insert_error' };
    }

    await updateLastSyncTimestamp();
    console.log(`ContactSync: Added ${insertedData.length} new contacts`);

    return { success: true, added: insertedData.length };
  } catch (error) {
    console.error('ContactSync: Error during sync:', error);
    return { success: false, reason: 'unknown_error' };
  }
};

// Define the background task
TaskManager.defineTask(CONTACT_SYNC_TASK, async () => {
  try {
    console.log('ContactSync: Background task running');
    const result = await performContactSync();

    if (result.success) {
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } else {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
  } catch (error) {
    console.error('ContactSync: Background task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Initialize contact sync (register background task and AppState listener)
 */
export const initializeContactSync = async (userId) => {
  // Only on native platforms
  if (Platform.OS === 'web') {
    console.log('ContactSync: Web platform - background sync not available');
    return false;
  }

  try {
    // Store user ID and preference
    await setSyncUserId(userId);
    await setContactSyncPreference('continuous');

    // Register background fetch task
    const isRegistered = await TaskManager.isTaskRegisteredAsync(CONTACT_SYNC_TASK);

    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(CONTACT_SYNC_TASK, {
        minimumInterval: 15 * 60, // 15 minutes (iOS minimum)
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log('ContactSync: Background task registered');
    }

    // Set up AppState listener for foreground sync
    setupAppStateListener();

    console.log('ContactSync: Initialized successfully');
    return true;
  } catch (error) {
    console.error('ContactSync: Error initializing:', error);
    return false;
  }
};

/**
 * Stop continuous contact sync
 */
export const stopContactSync = async () => {
  try {
    await setContactSyncPreference('one-time');

    // Unregister background task
    const isRegistered = await TaskManager.isTaskRegisteredAsync(CONTACT_SYNC_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(CONTACT_SYNC_TASK);
      console.log('ContactSync: Background task unregistered');
    }

    return true;
  } catch (error) {
    console.error('ContactSync: Error stopping sync:', error);
    return false;
  }
};

// AppState listener reference
let appStateSubscription = null;
let lastAppState = 'active';

/**
 * Set up AppState listener for foreground sync
 */
const setupAppStateListener = () => {
  // Remove existing listener if any
  if (appStateSubscription) {
    appStateSubscription.remove();
  }

  appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
    // Sync when app comes to foreground
    if (lastAppState.match(/inactive|background/) && nextAppState === 'active') {
      console.log('ContactSync: App came to foreground, checking for sync');

      const preference = await getContactSyncPreference();
      if (preference === 'continuous') {
        performContactSync();
      }
    }
    lastAppState = nextAppState;
  });
};

/**
 * Manual sync trigger (for Settings screen)
 */
export const triggerManualSync = async () => {
  return performContactSync();
};

/**
 * Check if background sync is available on current platform
 */
export const isBackgroundSyncAvailable = () => {
  return Platform.OS !== 'web';
};

/**
 * Get sync status for display in Settings
 */
export const getSyncStatus = async () => {
  const preference = await getContactSyncPreference();
  const lastSync = await getLastSyncTimestamp();
  const isRegistered = Platform.OS !== 'web'
    ? await TaskManager.isTaskRegisteredAsync(CONTACT_SYNC_TASK)
    : false;

  return {
    enabled: preference === 'continuous',
    lastSync,
    backgroundTaskRegistered: isRegistered,
    platformSupported: Platform.OS !== 'web',
  };
};
