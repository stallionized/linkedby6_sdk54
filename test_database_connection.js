// Test script to check if voice call database tables exist
import { supabase } from './supabaseClient.js';

async function testDatabaseTables() {
  console.log('Testing database connection and tables...');
  
  try {
    // Test if voice_calls table exists
    const { data, error } = await supabase
      .from('voice_calls')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('voice_calls table error:', error);
      console.log('❌ voice_calls table does not exist or has permission issues');
      console.log('Please run the SQL commands in database/voice_call_tables.sql in your Supabase dashboard');
      return false;
    }
    
    console.log('✅ voice_calls table exists and is accessible');
    
    // Test if call_signaling table exists
    const { data: signalingData, error: signalingError } = await supabase
      .from('call_signaling')
      .select('*')
      .limit(1);
    
    if (signalingError) {
      console.error('call_signaling table error:', signalingError);
      console.log('❌ call_signaling table does not exist or has permission issues');
      return false;
    }
    
    console.log('✅ call_signaling table exists and is accessible');
    console.log('✅ All voice call database tables are ready!');
    return true;
    
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}

// Run the test
testDatabaseTables();
