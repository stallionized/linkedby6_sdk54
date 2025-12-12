import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default Supabase connection details
const DEFAULT_SUPABASE_URL = 'https://oofugvbdkyqtidzuaelp.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vZnVndmJka3lxdGlkenVhZWxwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Mzc0NDkxOCwiZXhwIjoyMDU5MzIwOTE4fQ.y_uMDU2JX-mrJaML5JfXdSV_J_EJ8p3tJdd4HGAJjTs';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vZnVndmJka3lxdGlkenVhZWxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3NDQ5MTgsImV4cCI6MjA1OTMyMDkxOH0.xUM02cNhToNi6OXKnclFG12MyTvKr18hM2L3AmfM03o';

// Get settings from AsyncStorage if available (mobile version)
const getSettings = async () => {
  try {
    const saved = await AsyncStorage.getItem('aiSettings');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading settings from AsyncStorage:', e);
  }
  return null;
};

// Save settings to AsyncStorage (mobile version)
const saveSettings = async (settings) => {
  try {
    await AsyncStorage.setItem('aiSettings', JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings to AsyncStorage:', e);
  }
};

// Initialize with default settings (will be updated when app loads)
let supabaseUrl = DEFAULT_SUPABASE_URL;
let supabaseAnonKey = DEFAULT_SUPABASE_ANON_KEY;

// Create the Supabase client with anonymous key for auth
console.log('Creating Supabase client with URL:', supabaseUrl);
console.log('Using anonymous key for authentication');

let supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// Create a client with anon key for public operations
console.log('Creating public Supabase client with anon key');
let supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// Function to initialize the Supabase client with saved settings
const initializeSupabaseClient = async () => {
  const settings = await getSettings();
  if (settings?.pgHost && settings?.pgPassword) {
    updateSupabaseClient(settings);
  }
};

// Function to update the Supabase client with new settings
const updateSupabaseClient = async (newSettings) => {
  if (newSettings?.pgHost && newSettings?.pgPassword) {
    const newUrl = `https://${newSettings.pgHost}`;
    
    console.log('Updating Supabase client with new settings');
    console.log('New URL:', newUrl);
    
    supabaseUrl = newUrl;
    
    // Create a new client with the updated settings - use anon key for auth
    supabase = createClient(newUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      }
    });
    
    // Also update the public client with the new URL but keep using the anon key
    supabasePublic = createClient(newUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      }
    });
    
    // Save the new settings to AsyncStorage
    await saveSettings(newSettings);
  }
};

// Initialize on import and store promise for waiting
const initPromise = initializeSupabaseClient();

// Function to wait for initialization to complete
const waitForSupabaseInit = () => initPromise;

export { supabase, supabasePublic, updateSupabaseClient, initializeSupabaseClient, waitForSupabaseInit };