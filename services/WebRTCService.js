import { supabase } from '../supabaseClient';
import * as Device from 'expo-device';

class WebRTCService {
  constructor() {
    this.currentUserId = null;
    this.callStateCallback = null;
    this.remoteStreamCallback = null;
    this.localStreamCallback = null;
    this.currentCall = null;
    this.callChannel = null;
    this.signalingChannel = null;
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  async initialize(userId, callStateCallback, remoteStreamCallback, localStreamCallback) {
    try {
      // If already initializing, wait for that to complete
      if (this.initializationPromise) {
        console.log('WebRTC Service initialization already in progress, waiting...');
        await this.initializationPromise;
        return;
      }

      // If already initialized with the same user, just update callbacks
      if (this.isInitialized && this.currentUserId === userId) {
        console.log('WebRTC Service already initialized for this user, updating callbacks');
        this.callStateCallback = callStateCallback;
        this.remoteStreamCallback = remoteStreamCallback;
        this.localStreamCallback = localStreamCallback;
        return;
      }

      // Create initialization promise
      this.initializationPromise = this._performInitialization(userId, callStateCallback, remoteStreamCallback, localStreamCallback);
      await this.initializationPromise;
      this.initializationPromise = null;

    } catch (error) {
      this.initializationPromise = null;
      console.error('Error initializing WebRTC service:', error);
      throw error;
    }
  }

  async _performInitialization(userId, callStateCallback, remoteStreamCallback, localStreamCallback) {
    // Destroy existing connections if reinitializing
    if (this.isInitialized) {
      console.log('Destroying existing WebRTC connections before reinitializing');
      this.destroy();
    }

    this.currentUserId = userId;
    this.callStateCallback = callStateCallback;
    this.remoteStreamCallback = remoteStreamCallback;
    this.localStreamCallback = localStreamCallback;

    // Set up Supabase real-time subscriptions for calls
    await this.setupCallSubscription();
    await this.setupSignalingSubscription();

    this.isInitialized = true;
    console.log('WebRTC Service initialized successfully for user:', userId);
  }

  setUserId(userId) {
    this.currentUserId = userId;
    console.log('WebRTC Service user ID set to:', userId);
  }

  // Method to ensure service is initialized before use
  async ensureInitialized() {
    if (this.initializationPromise) {
      console.log('Waiting for WebRTC initialization to complete...');
      await this.initializationPromise;
    }

    if (!this.isInitialized || !this.currentUserId) {
      console.log('WebRTC service not initialized, attempting auto-initialization...');
      
      // Try to get current user and auto-initialize
      try {
        const { supabase } = require('../supabaseClient');
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          throw new Error('WebRTC service not initialized. Please ensure user is logged in.');
        }
        
        console.log('Auto-initializing WebRTC service for user:', user.id);
        
        // Auto-initialize with minimal callbacks
        await this.initialize(
          user.id,
          this.callStateCallback || ((state, data) => console.log('Call state:', state, data)),
          this.remoteStreamCallback || ((stream) => console.log('Remote stream:', stream)),
          this.localStreamCallback || ((stream) => console.log('Local stream:', stream))
        );
        
        console.log('WebRTC service auto-initialized successfully');
      } catch (autoInitError) {
        console.error('Failed to auto-initialize WebRTC service:', autoInitError);
        throw new Error('WebRTC service not initialized. Please ensure user is logged in.');
      }
    }

    if (!this.currentUserId) {
      throw new Error('WebRTC service has no user ID. Please ensure user is logged in.');
    }
  }

  async setupCallSubscription() {
    return new Promise((resolve, reject) => {
      try {
        // Subscribe to voice_calls table for incoming calls
        this.callChannel = supabase
          .channel(`voice_calls_${this.currentUserId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'voice_calls',
              filter: `receiver_id=eq.${this.currentUserId}`,
            },
            (payload) => {
              console.log('Incoming call received:', payload);
              this.handleIncomingCall(payload.new);
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'voice_calls',
              filter: `caller_id=eq.${this.currentUserId}`,
            },
            (payload) => {
              console.log('Call status updated:', payload);
              this.handleCallStatusUpdate(payload.new);
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'voice_calls',
              filter: `receiver_id=eq.${this.currentUserId}`,
            },
            (payload) => {
              console.log('Call status updated:', payload);
              this.handleCallStatusUpdate(payload.new);
            }
          )
          .subscribe((status, error) => {
            console.log('Call subscription status:', status, error);
            if (status === 'SUBSCRIBED') {
              console.log('Call subscription established successfully');
              resolve();
            } else if (status === 'CHANNEL_ERROR') {
              console.error('Call subscription failed with status:', status);
              console.error('Call subscription error details:', error);
              reject(new Error(`Failed to subscribe to call channel: ${error?.message || 'Unknown error'}`));
            } else if (status === 'TIMED_OUT') {
              console.error('Call subscription timed out');
              reject(new Error('Call subscription timed out'));
            } else if (status === 'CLOSED') {
              console.warn('Call subscription was closed');
              // Don't reject on close during normal operation
            }
          });
      } catch (error) {
        console.error('Error setting up call subscription:', error);
        reject(error);
      }
    });
  }

  async setupSignalingSubscription() {
    return new Promise((resolve, reject) => {
      try {
        // Subscribe to call_signaling table for WebRTC signaling
        this.signalingChannel = supabase
          .channel(`call_signaling_${this.currentUserId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'call_signaling',
              filter: `receiver_id=eq.${this.currentUserId}`,
            },
            (payload) => {
              console.log('Signaling message received:', payload);
              this.handleSignalingMessage(payload.new);
            }
          )
          .subscribe((status, error) => {
            console.log('Signaling subscription status:', status, error);
            if (status === 'SUBSCRIBED') {
              console.log('Signaling subscription established successfully');
              resolve();
            } else if (status === 'CHANNEL_ERROR') {
              console.error('Signaling subscription failed with status:', status);
              console.error('Signaling subscription error details:', error);
              reject(new Error(`Failed to subscribe to signaling channel: ${error?.message || 'Unknown error'}`));
            } else if (status === 'TIMED_OUT') {
              console.error('Signaling subscription timed out');
              reject(new Error('Signaling subscription timed out'));
            } else if (status === 'CLOSED') {
              console.warn('Signaling subscription was closed');
              // Don't reject on close during normal operation
            }
          });
      } catch (error) {
        console.error('Error setting up signaling subscription:', error);
        reject(error);
      }
    });
  }

  async startCall(receiverId, receiverName, callType = 'user') {
    try {
      // Ensure service is properly initialized before starting call
      await this.ensureInitialized();

      console.log(`Starting ${callType} call to ${receiverName} (${receiverId})`);

      // Create call record in database with proper ID handling
      const callRecord = {
        caller_id: this.currentUserId,
        call_status: 'ringing',
      };

      // Handle business calls vs user calls
      if (callType === 'business') {
        callRecord.receiver_business_id = receiverId;
      } else {
        callRecord.receiver_id = receiverId;
      }

      const { data: callData, error: callError } = await supabase
        .from('voice_calls')
        .insert(callRecord)
        .select()
        .single();

      if (callError) {
        throw callError;
      }

      this.currentCall = {
        ...callData,
        receiverName,
        receiverId,
        callType,
        isOutgoing: true,
      };

      // Update call state
      if (this.callStateCallback) {
        this.callStateCallback('calling', this.currentCall);
      }

      // Send initial signaling message (only for user-to-user calls)
      // For business calls, we don't send signaling messages since there's no specific user to signal
      if (callType === 'user') {
        await this.sendSignalingMessage(receiverId, callData.id, 'offer', {
          callerId: this.currentUserId,
          callerName: 'User', // You might want to get this from user profile
          receiverName,
          callType,
          deviceInfo: Device.modelName,
        });
      } else {
        // For business calls, we just log that the call was initiated
        console.log(`Business call initiated to ${receiverName} - no signaling needed`);
      }

      return callData.id;
    } catch (error) {
      console.error('Failed to start call:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack
      });
      
      if (this.callStateCallback) {
        this.callStateCallback('error', { error: error.message });
      }
      
      // Provide user-friendly error messages
      if (error.message && error.message.includes('relation "voice_calls" does not exist')) {
        throw new Error('Voice calling database tables are not set up. Please contact support.');
      } else if (error.code === 'PGRST116') {
        throw new Error('Voice calling database tables are not accessible. Please contact support.');
      } else if (error.message) {
        throw new Error(`Call failed: ${error.message}`);
      } else {
        throw new Error('Unable to start call. Please check your internet connection and try again.');
      }
    }
  }

  async acceptCall(callId) {
    try {
      console.log(`Accepting call ${callId}`);

      // Update call status to accepted
      const { error: updateError } = await supabase
        .from('voice_calls')
        .update({ 
          call_status: 'active',
          answered_at: new Date().toISOString(),
        })
        .eq('id', callId);

      if (updateError) {
        throw updateError;
      }

      // Send acceptance signaling message only for user-to-user calls
      if (this.currentCall && this.currentCall.callType === 'user' && this.currentCall.caller_id) {
        await this.sendSignalingMessage(
          this.currentCall.caller_id,
          callId,
          'answer',
          {
            accepted: true,
            deviceInfo: Device.modelName,
          }
        );
      } else if (this.currentCall && this.currentCall.callType === 'business') {
        console.log('Business call accepted - no signaling message needed');
      }

      // Update call state
      if (this.callStateCallback) {
        this.callStateCallback('active', this.currentCall);
      }
    } catch (error) {
      console.error('Failed to accept call:', error);
      if (this.callStateCallback) {
        this.callStateCallback('error', { error: error.message });
      }
    }
  }

  async declineCall(callId) {
    try {
      console.log(`Declining call ${callId}`);

      // Store call info before clearing it
      const callToDecline = this.currentCall ? { ...this.currentCall } : null;

      // Update call status to declined
      const { error: updateError } = await supabase
        .from('voice_calls')
        .update({ 
          call_status: 'declined',
          ended_at: new Date().toISOString(),
        })
        .eq('id', callId);

      if (updateError) {
        throw updateError;
      }

      // Send decline signaling message only for user-to-user calls
      if (callToDecline && callToDecline.callType === 'user' && callToDecline.caller_id) {
        await this.sendSignalingMessage(
          callToDecline.caller_id,
          callId,
          'call-decline',
          {
            declined: true,
          }
        );
      } else if (callToDecline && callToDecline.callType === 'business') {
        console.log('Business call declined - no signaling message needed');
      }

      // Clear current call
      this.currentCall = null;

      // Update call state
      if (this.callStateCallback) {
        this.callStateCallback('ended', { reason: 'declined' });
      }
    } catch (error) {
      console.error('Failed to decline call:', error);
      // Ensure currentCall is cleared even if there's an error
      this.currentCall = null;
      
      // Still notify about call end even if there was an error
      if (this.callStateCallback) {
        this.callStateCallback('ended', { reason: 'error', error: error.message });
      }
    }
  }

  async endCall() {
    try {
      if (!this.currentCall) {
        console.log('No active call to end');
        return;
      }

      console.log(`Ending call ${this.currentCall.id}`);

      // Store call info before clearing it
      const callToEnd = { ...this.currentCall };

      // Update call status to ended
      const { error: updateError } = await supabase
        .from('voice_calls')
        .update({ 
          call_status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('id', callToEnd.id);

      if (updateError) {
        console.error('Failed to update call status:', updateError);
      }

      // Send end call signaling message only for user-to-user calls
      // For business calls, we don't send signaling messages since there's no specific user to signal
      if (callToEnd.callType === 'user') {
        const otherUserId = callToEnd.isOutgoing 
          ? callToEnd.receiver_id 
          : callToEnd.caller_id;

        if (otherUserId) {
          await this.sendSignalingMessage(
            otherUserId,
            callToEnd.id,
            'call-end',
            {
              endedBy: this.currentUserId,
            }
          );
        }
      } else {
        console.log('Business call ended - no signaling message needed');
      }

      // Clear current call first
      this.currentCall = null;

      // Update call state
      if (this.callStateCallback) {
        this.callStateCallback('ended', { reason: 'user_ended' });
      }
    } catch (error) {
      console.error('Failed to end call:', error);
      // Ensure currentCall is cleared even if there's an error
      this.currentCall = null;
      
      // Still notify about call end even if there was an error
      if (this.callStateCallback) {
        this.callStateCallback('ended', { reason: 'error', error: error.message });
      }
    }
  }

  async sendSignalingMessage(receiverId, callId, messageType, data) {
    try {
      const { error } = await supabase
        .from('call_signaling')
        .insert({
          call_id: callId,
          sender_id: this.currentUserId,
          receiver_id: receiverId,
          signal_type: messageType,
          call_data: data,
        });

      if (error) {
        throw error;
      }

      console.log(`Signaling message sent: ${messageType}`);
    } catch (error) {
      console.error('Failed to send signaling message:', error);
    }
  }

  handleIncomingCall(callData) {
    console.log('Handling incoming call:', callData);
    
    this.currentCall = {
      ...callData,
      isOutgoing: false,
    };

    if (this.callStateCallback) {
      this.callStateCallback('incoming', this.currentCall);
    }
  }

  handleCallStatusUpdate(callData) {
    console.log('Call status updated:', callData);
    
    if (this.currentCall && this.currentCall.id === callData.id) {
      this.currentCall = { ...this.currentCall, ...callData };
      
      if (this.callStateCallback) {
        this.callStateCallback(callData.call_status, this.currentCall);
      }
    }
  }

  handleSignalingMessage(signalData) {
    console.log('Handling signaling message:', signalData);
    
    switch (signalData.signal_type) {
      case 'offer':
        // Handle incoming call offer
        break;
      case 'answer':
        // Handle call answer
        if (this.callStateCallback) {
          this.callStateCallback('active', this.currentCall);
        }
        break;
      case 'call-decline':
        // Handle call decline
        if (this.callStateCallback) {
          this.callStateCallback('ended', { reason: 'declined' });
        }
        this.currentCall = null;
        break;
      case 'call-end':
        // Handle call end
        if (this.callStateCallback) {
          this.callStateCallback('ended', { reason: 'remote_ended' });
        }
        this.currentCall = null;
        break;
    }
  }

  async toggleMute() {
    try {
      // For now, we'll just log this - in a full implementation with native audio,
      // you'd pause/resume recording or adjust audio levels
      console.log('Toggle mute requested');
      return true;
    } catch (error) {
      console.error('Failed to toggle mute:', error);
      return false;
    }
  }

  async toggleSpeaker() {
    try {
      // For now, we'll just log this - in a full implementation with native audio,
      // you'd toggle between speaker and earpiece audio output
      console.log('Toggle speaker requested');
      return true;
    } catch (error) {
      console.error('Failed to toggle speaker:', error);
      return false;
    }
  }

  destroy() {
    try {
      // Unsubscribe from channels
      if (this.callChannel) {
        supabase.removeChannel(this.callChannel);
        this.callChannel = null;
      }

      if (this.signalingChannel) {
        supabase.removeChannel(this.signalingChannel);
        this.signalingChannel = null;
      }

      // Reset state
      this.currentCall = null;
      this.currentUserId = null;
      this.callStateCallback = null;
      this.remoteStreamCallback = null;
      this.localStreamCallback = null;
      this.isInitialized = false;

      console.log('WebRTC Service destroyed');
    } catch (error) {
      console.error('Error destroying WebRTC service:', error);
    }
  }
}

// Export singleton instance
export default new WebRTCService();
