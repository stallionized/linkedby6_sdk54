import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({
    neo4jUrl: null,
    webhookUrl: null
  });

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
          await fetchAppConfig(); // Fetch config when user logs in
        } else {
          setUser(null);
          await AsyncStorage.removeItem('user');
          setConfig({ neo4jUrl: null, webhookUrl: null }); // Clear config on logout
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkUserSession = async () => {
    try {
      console.log('Checking user session...');
      
      // First check Supabase session (most reliable)
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
      }
      
      if (session?.user) {
        console.log('Found active session for:', session.user.email);
        setUser(session.user);
        await AsyncStorage.setItem('user', JSON.stringify(session.user));
        await fetchAppConfig(); // Fetch config for logged in user
      } else {
        console.log('No active session found');
        // Check AsyncStorage as fallback
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          console.log('Found stored user, but no active session - clearing storage');
          await AsyncStorage.removeItem('user');
        }
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking user session:', error);
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
        await fetchAppConfig(); // Fetch config after successful login
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
      signIn,
      signOut,
      checkUserSession,
      fetchAppConfig
    }}>
      {children}
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

// Export signUp function for registration
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
