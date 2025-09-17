import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import WebRTCService from './services/WebRTCService';
import SessionTimeoutWarning from './components/SessionTimeoutWarning';
import { resetNavigation } from './navigationRef';

const AuthContext = createContext({});

// Session timeout constants - moved outside component to prevent re-creation
const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
const WARNING_DURATION = 30 * 1000; // 30 seconds warning before logout

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({
    neo4jUrl: null,
    webhookUrl: null
  });
  const [webRTCInitialized, setWebRTCInitialized] = useState(false);

  // Session timeout management
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);
  const userRef = useRef(user);

  // Keep userRef in sync with user state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Session timeout functions
  const handleSessionTimeout = useCallback(async () => {
    console.log('🔒 Session timed out due to inactivity');
    console.log('📤 Starting logout process...');

    try {
      // Clear timeouts first
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (warningRef.current) {
        clearTimeout(warningRef.current);
        warningRef.current = null;
      }

      console.log('🗑️ Clearing user state and storage...');

      // Sign out from Supabase
      await supabase.auth.signOut();

      // Clear all state
      setUser(null);
      setConfig({ neo4jUrl: null, webhookUrl: null });
      setShowTimeoutWarning(false);
      await AsyncStorage.removeItem('user');

      // Force navigation to Landing page
      console.log('🔄 Forcing navigation to Landing page...');
      resetNavigation('Landing');

      console.log('✅ Logout complete - user redirected to landing page');
    } catch (error) {
      console.error('❌ Error during session timeout signout:', error);
      // Force clear state even on error
      setUser(null);
      setConfig({ neo4jUrl: null, webhookUrl: null });
      setShowTimeoutWarning(false);
      // Force navigation to Landing page even on error
      resetNavigation('Landing');
    }
  }, []);

  const startSessionTimeout = useCallback(() => {
    // Clear any existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
    }

    console.log('🕐 Starting session timeout timer - 5 minutes');

    // Set timeout to show warning (SESSION_TIMEOUT - WARNING_DURATION)
    const warningTime = SESSION_TIMEOUT - WARNING_DURATION;

    warningRef.current = setTimeout(() => {
      console.log('⏰ Session warning time reached - showing warning modal');
      setShowTimeoutWarning(true);
    }, warningTime);

    // Set timeout for final logout (full SESSION_TIMEOUT)
    timeoutRef.current = setTimeout(() => {
      console.log('⏰ Session timeout reached - signing out user due to inactivity');
      handleSessionTimeout();
    }, SESSION_TIMEOUT);
  }, [handleSessionTimeout]);

  const resetSessionTimeout = useCallback(() => {
    setLastActivity(Date.now());
    if (userRef.current) {
      startSessionTimeout();
    }
  }, [startSessionTimeout]);

  const handleExtendSession = useCallback(() => {
    console.log('🔄 User extended session');
    setShowTimeoutWarning(false);

    // Clear any existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
    }

    // Reset session timeout
    setLastActivity(Date.now());
    if (userRef.current) {
      startSessionTimeout();
    }
  }, [startSessionTimeout]);

  const handleWarningTimeout = useCallback(async () => {
    console.log('⏰ Session timeout warning expired - user did not respond');
    console.log('🔒 Proceeding with automatic logout...');
    setShowTimeoutWarning(false);
    await handleSessionTimeout();
  }, [handleSessionTimeout]);

  // Track user activity to reset timeout
  // Stable callback that uses refs to avoid infinite loops
  const trackActivity = useCallback(() => {
    // Only track if user is logged in
    if (!userRef.current) {
      console.log('⏭️ Skipping activity tracking - no user logged in');
      return;
    }

    console.log('👆 User activity detected - resetting session timeout timer');
    setLastActivity(Date.now());

    // Clear any existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      console.log('🧹 Cleared existing logout timeout');
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      console.log('🧹 Cleared existing warning timeout');
    }

    // Set new timeouts
    const warningTime = SESSION_TIMEOUT - WARNING_DURATION;

    warningRef.current = setTimeout(() => {
      console.log('⏰ Session warning time reached - showing warning modal');
      setShowTimeoutWarning(true);
    }, warningTime);

    timeoutRef.current = setTimeout(() => {
      console.log('⏰ Session timeout reached - signing out user due to inactivity');
      handleSessionTimeout();
    }, SESSION_TIMEOUT);

    console.log(`⏱️ New session timeout set: Warning in ${warningTime/1000}s, Logout in ${SESSION_TIMEOUT/1000}s`);
  }, [handleSessionTimeout]);

  useEffect(() => {
    // Check for existing session
    checkUserSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        if (session?.user) {
          setUser(session.user);
          await AsyncStorage.setItem('user', JSON.stringify(session.user));
          await ensureUserProfile(session.user); // Ensure user profile exists
          await fetchAppConfig(); // Fetch config when user logs in
          await initializeWebRTC(session.user.id); // Initialize WebRTC service

          // Session timeout will be started by the separate useEffect below
          console.log('🕐 User logged in - session timeout will be started');
        } else {
          setUser(null);
          await AsyncStorage.removeItem('user');
          setConfig({ neo4jUrl: null, webhookUrl: null }); // Clear config on logout
          destroyWebRTC(); // Destroy WebRTC service on logout

          // Clear session timeout when user logs out
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          if (warningRef.current) {
            clearTimeout(warningRef.current);
            warningRef.current = null;
          }
          setShowTimeoutWarning(false);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningRef.current) {
        clearTimeout(warningRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start timeout for existing sessions
  useEffect(() => {
    if (user && !loading) {
      console.log('🕐 Starting session timeout for existing session');
      startSessionTimeout();
    }
  }, [user, loading, startSessionTimeout]);

  const checkUserSession = async () => {
    try {
      console.log('🔍 Checking user session...');
      setLoading(true);

      // Clear any potentially stale user state first
      setUser(null);

      // First check Supabase session with timeout (most reliable)
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Session check timeout')), 3000)
      );

      const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise])
        .catch(err => {
          console.warn('Session check timed out or failed:', err.message);
          return { data: { session: null }, error: err };
        });
      
      if (error) {
        console.error('❌ Error getting session:', error);
        // Clear any stored data on error
        await AsyncStorage.removeItem('user');
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Validate session more thoroughly
      if (session?.user && session?.access_token) {
        console.log('🔍 Found session, validating token for:', session.user.email);
        
        // Verify the session is actually valid by making an authenticated request
        try {
          const { data: profileCheck, error: profileError } = await supabase
            .from('user_profiles')
            .select('user_id')
            .eq('user_id', session.user.id)
            .limit(1);
            
          if (profileError && profileError.message?.includes('JWT')) {
            console.log('❌ Session token is invalid, clearing session');
            await supabase.auth.signOut();
            await AsyncStorage.removeItem('user');
            setUser(null);
            setLoading(false);
            return;
          }
          
          // Session is valid
          console.log('✅ Session validated successfully for:', session.user.email);
          setUser(session.user);
          await AsyncStorage.setItem('user', JSON.stringify(session.user));
          await ensureUserProfile(session.user);
          await fetchAppConfig();
          await initializeWebRTC(session.user.id);
          
        } catch (validationError) {
          console.error('❌ Session validation failed:', validationError);
          await supabase.auth.signOut();
          await AsyncStorage.removeItem('user');
          setUser(null);
        }
      } else {
        console.log('❌ No valid session found (missing user or access_token)');

        // Quick check and clear AsyncStorage if needed (don't block)
        AsyncStorage.getItem('user').then(storedUser => {
          if (storedUser) {
            console.log('🧹 Found stale stored user data, clearing...');
            AsyncStorage.removeItem('user');
          }
        });

        // No need to sign out if never signed in
        setUser(null);
      }
    } catch (error) {
      console.error('💥 Exception during session check:', error);
      // On any exception, clear everything and ensure signed out state
      try {
        await AsyncStorage.removeItem('user');
        await supabase.auth.signOut();
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppConfig = async () => {
    try {
      console.log('Fetching app configuration...');
      
      // Try multiple possible table names for configuration
      const tableNames = ['app_config', 'configuration', 'config', 'settings'];
      let configData = null;
      
      for (const tableName of tableNames) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .single();

          if (!error && data) {
            configData = data;
            console.log(`Configuration found in table: ${tableName}`);
            break;
          }
        } catch (tableError) {
          console.log(`Table ${tableName} not found or error:`, tableError.message);
        }
      }
      
      if (configData) {
        // Handle different possible column names
        const neo4jUrl = configData.neo4j_url || configData.neo4jUrl || configData.neo4j_endpoint || null;
        const webhookUrl = configData.webhook_url || configData.webhookUrl || configData.webhook_endpoint || null;
        
        setConfig({
          neo4jUrl,
          webhookUrl
        });
        
        console.log('Configuration loaded:', { 
          neo4jUrl: neo4jUrl ? 'Set' : 'Not set',
          webhookUrl: webhookUrl ? 'Set' : 'Not set'
        });
      } else {
        console.log('No configuration table found');
      }
    } catch (error) {
      console.error('Error fetching app configuration:', error);
    }
  };

  const initializeWebRTC = async (userId) => {
    try {
      if (webRTCInitialized) {
        console.log('WebRTC already initialized');
        return;
      }

      console.log('Initializing WebRTC service for user:', userId);
      
      // Set user ID first so it's available for auto-initialization
      WebRTCService.setUserId(userId);
      
      // Initialize WebRTC service with callbacks
      await WebRTCService.initialize(
        userId,
        (callState, callData) => {
          console.log('Call state changed:', callState, callData);
          // Handle call state changes globally if needed
        },
        (remoteStream) => {
          console.log('Remote stream received:', remoteStream);
          // Handle remote stream globally if needed
        },
        (localStream) => {
          console.log('Local stream received:', localStream);
          // Handle local stream globally if needed
        }
      );

      setWebRTCInitialized(true);
      console.log('WebRTC service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WebRTC service:', error);
      setWebRTCInitialized(false);
    }
  };

  const destroyWebRTC = () => {
    try {
      console.log('Destroying WebRTC service');
      WebRTCService.destroy();
      setWebRTCInitialized(false);
    } catch (error) {
      console.error('Error destroying WebRTC service:', error);
    }
  };

  const ensureUserProfile = async (user) => {
    try {
      console.log('Ensuring user profile exists for:', user.email);
      
      // Check if user profile already exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking user profile:', checkError);
        return;
      }

      if (existingProfile) {
        console.log('User profile already exists');
        return existingProfile;
      }

      // Create user profile if it doesn't exist
      console.log('Creating user profile for:', user.email);
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          full_name: user.user_metadata?.full_name || user.email.split('@')[0],
          user_phone_number: user.user_metadata?.phone || null,
          profile_image_url: null,
          is_admin: false,
          role: 'standard_user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user profile:', createError);
        return;
      }

      console.log('User profile created successfully:', newProfile);
      return newProfile;
    } catch (error) {
      console.error('Error ensuring user profile:', error);
    }
  };

  const signIn = async (email, password) => {
    try {
      console.log('Attempting to sign in:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Sign in error:', error);
        return { success: false, error: error.message };
      }
      
      if (data.user) {
        console.log('Sign in successful for:', data.user.email);
        setUser(data.user);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        await ensureUserProfile(data.user); // Ensure user profile exists
        await fetchAppConfig(); // Fetch config after successful login
        await initializeWebRTC(data.user.id); // Initialize WebRTC service after login
        return { success: true, user: data.user };
      }
      
      // If no user returned and no error
      return { success: false, error: 'Login failed - no user returned' };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out user');
      await supabase.auth.signOut();
      setUser(null);
      setConfig({ neo4jUrl: null, webhookUrl: null });
      await AsyncStorage.removeItem('user');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      config,
      webRTCInitialized,
      signIn,
      signOut,
      checkUserSession,
      fetchAppConfig,
      trackActivity
    }}>
      {children}
      <SessionTimeoutWarning
        visible={showTimeoutWarning}
        onExtendSession={handleExtendSession}
        onLogout={handleWarningTimeout}
        onTimeout={handleWarningTimeout}
        warningDuration={WARNING_DURATION}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export getSession function for compatibility with other components
export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
};

// Export signOut function for compatibility with other components
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// Export signUp function for registration (email/password based)
export const signUp = async (phone, password, email, fullName) => {
  try {
    console.log('Attempting to sign up user:', email);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      phone,
      options: {
        data: {
          full_name: fullName,
          phone: phone
        }
      }
    });

    if (error) {
      console.error('Sign up error:', error);
      throw error;
    }

    if (data.user) {
      console.log('Sign up successful for:', data.user.email);
      return data.user;
    }

    throw new Error('Sign up failed - no user returned');
  } catch (error) {
    console.error('Sign up error:', error);
    throw error;
  }
};

// Export signUpWithPhone function for phone-based registration with OTP
export const signUpWithPhone = async (phone) => {
  try {
    console.log('Attempting to sign up with phone:', phone);

    // Format phone number to E.164 format (+1XXXXXXXXXX)
    const formattedPhone = phone.startsWith('+')
      ? phone
      : '+1' + phone.replace(/\D/g, '');

    console.log('Formatted phone:', formattedPhone);

    // Sign up with phone - Supabase will send OTP SMS
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
      options: {
        channel: 'sms',
      }
    });

    if (error) {
      console.error('Phone sign up error:', error);
      throw error;
    }

    console.log('OTP sent successfully to:', formattedPhone);
    return { success: true, phone: formattedPhone };
  } catch (error) {
    console.error('Phone sign up error:', error);
    throw error;
  }
};

// Export verifyPhoneOTP function for verifying OTP code
export const verifyPhoneOTP = async (phone, token) => {
  try {
    console.log('Attempting to verify OTP for phone:', phone);

    // Format phone number to E.164 format
    const formattedPhone = phone.startsWith('+')
      ? phone
      : '+1' + phone.replace(/\D/g, '');

    const { data, error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: token,
      type: 'sms',
    });

    if (error) {
      console.error('OTP verification error:', error);
      throw error;
    }

    if (data?.user) {
      console.log('OTP verified successfully for user:', data.user.id);
      return { success: true, user: data.user, session: data.session };
    }

    throw new Error('OTP verification failed - no user returned');
  } catch (error) {
    console.error('OTP verification error:', error);
    throw error;
  }
};

// Export signIn function for compatibility with other components
export const signIn = async (email, password) => {
  try {
    console.log('Attempting to sign in:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Sign in error:', error);
      throw error;
    }
    
    if (data.user) {
      console.log('Sign in successful for:', data.user.email);
      return data.user;
    }
    
    throw new Error('Login failed - no user returned');
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
};

// Export updateUserProfile function for profile management
export const updateUserProfile = async (userId, profileData) => {
  try {
    console.log('Updating user profile for:', userId);
    
    // First, try to insert the profile
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        full_name: profileData.full_name,
        user_phone_number: profileData.user_phone_number,
        profile_image_url: profileData.profile_image_url,
        is_admin: profileData.is_admin || false,
        role: profileData.role || 'standard_user',
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Profile update error:', error);
      throw error;
    }
    
    console.log('Profile updated successfully:', data);
    return data;
  } catch (error) {
    console.error('Update user profile error:', error);
    throw error;
  }
};
