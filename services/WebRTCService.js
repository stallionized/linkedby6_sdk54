import { supabase } from '../supabaseClient';
import * as Device from 'expo-device';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
} from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';

// ICE Server configuration with STUN and TURN servers
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:openrelay.metered.ca:80' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

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

    // WebRTC specific
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.isMuted = false;
    this.isSpeakerOn = false;
    this.pendingIceCandidates = [];
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

  // ==================== WebRTC Peer Connection ====================

  async createPeerConnection() {
    try {
      console.log('Creating RTCPeerConnection...');

      this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('New ICE candidate:', event.candidate.candidate.substring(0, 50) + '...');
          this.sendIceCandidate(event.candidate);
        }
      };

      // Handle ICE connection state changes
      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', this.peerConnection.iceConnectionState);

        switch (this.peerConnection.iceConnectionState) {
          case 'connected':
          case 'completed':
            console.log('ICE connection established successfully');
            break;
          case 'failed':
            console.error('ICE connection failed');
            this.handleConnectionFailure();
            break;
          case 'disconnected':
            console.warn('ICE connection disconnected');
            break;
          case 'closed':
            console.log('ICE connection closed');
            break;
        }
      };

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        console.log('Remote track received:', event.track.kind);
        if (event.streams && event.streams[0]) {
          this.remoteStream = event.streams[0];
          if (this.remoteStreamCallback) {
            this.remoteStreamCallback(this.remoteStream);
          }
        }
      };

      // Handle connection state
      this.peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', this.peerConnection.connectionState);
      };

      console.log('RTCPeerConnection created successfully');
      return this.peerConnection;
    } catch (error) {
      console.error('Failed to create peer connection:', error);
      throw error;
    }
  }

  async getLocalStream() {
    try {
      console.log('Requesting local audio stream...');

      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      };

      this.localStream = await mediaDevices.getUserMedia(constraints);
      console.log('Local audio stream obtained successfully');

      if (this.localStreamCallback) {
        this.localStreamCallback(this.localStream);
      }

      return this.localStream;
    } catch (error) {
      console.error('Failed to get local stream:', error);
      throw new Error('Microphone access denied. Please enable microphone permissions.');
    }
  }

  async addLocalStreamToPeerConnection() {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    if (!this.localStream) {
      await this.getLocalStream();
    }

    console.log('Adding local tracks to peer connection...');
    this.localStream.getTracks().forEach((track) => {
      console.log('Adding track:', track.kind);
      this.peerConnection.addTrack(track, this.localStream);
    });
  }

  async createOffer() {
    try {
      console.log('Creating SDP offer...');

      const offerOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      };

      const offer = await this.peerConnection.createOffer(offerOptions);
      await this.peerConnection.setLocalDescription(offer);

      console.log('SDP offer created and set as local description');
      return offer;
    } catch (error) {
      console.error('Failed to create offer:', error);
      throw error;
    }
  }

  async createAnswer() {
    try {
      console.log('Creating SDP answer...');

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      console.log('SDP answer created and set as local description');
      return answer;
    } catch (error) {
      console.error('Failed to create answer:', error);
      throw error;
    }
  }

  async setRemoteDescription(sdp) {
    try {
      console.log('Setting remote description...');
      const sessionDescription = new RTCSessionDescription(sdp);
      await this.peerConnection.setRemoteDescription(sessionDescription);
      console.log('Remote description set successfully');

      // Process any pending ICE candidates
      await this.processPendingIceCandidates();
    } catch (error) {
      console.error('Failed to set remote description:', error);
      throw error;
    }
  }

  async addIceCandidate(candidate) {
    try {
      if (!this.peerConnection) {
        console.log('Peer connection not ready, queueing ICE candidate');
        this.pendingIceCandidates.push(candidate);
        return;
      }

      if (!this.peerConnection.remoteDescription) {
        console.log('Remote description not set, queueing ICE candidate');
        this.pendingIceCandidates.push(candidate);
        return;
      }

      const iceCandidate = new RTCIceCandidate(candidate);
      await this.peerConnection.addIceCandidate(iceCandidate);
      console.log('ICE candidate added successfully');
    } catch (error) {
      console.error('Failed to add ICE candidate:', error);
    }
  }

  async processPendingIceCandidates() {
    console.log(`Processing ${this.pendingIceCandidates.length} pending ICE candidates`);

    for (const candidate of this.pendingIceCandidates) {
      try {
        const iceCandidate = new RTCIceCandidate(candidate);
        await this.peerConnection.addIceCandidate(iceCandidate);
      } catch (error) {
        console.error('Failed to add pending ICE candidate:', error);
      }
    }

    this.pendingIceCandidates = [];
  }

  async sendIceCandidate(candidate) {
    if (!this.currentCall) {
      console.warn('No current call, cannot send ICE candidate');
      return;
    }

    const receiverId = this.currentCall.isOutgoing
      ? (this.currentCall.receiver_id || this.currentCall.receiverId)
      : this.currentCall.caller_id;

    if (receiverId) {
      await this.sendSignalingMessage(
        receiverId,
        this.currentCall.id,
        'ice-candidate',
        {
          candidate: candidate.candidate,
          sdpMLineIndex: candidate.sdpMLineIndex,
          sdpMid: candidate.sdpMid,
        }
      );
    }
  }

  handleConnectionFailure() {
    console.error('WebRTC connection failed');
    if (this.callStateCallback) {
      this.callStateCallback('error', { error: 'Connection failed' });
    }
    this.cleanupCall();
  }

  // ==================== Supabase Subscriptions ====================

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

  // ==================== Call Flow ====================

  async startCall(receiverId, receiverName, callType = 'user') {
    try {
      // Ensure service is properly initialized before starting call
      await this.ensureInitialized();

      console.log(`Starting ${callType} call to ${receiverName} (${receiverId})`);

      // Start InCallManager for audio routing
      InCallManager.start({ media: 'audio' });
      InCallManager.setKeepScreenOn(true);
      InCallManager.setSpeakerphoneOn(false);

      // Create peer connection and get local stream
      await this.createPeerConnection();
      await this.getLocalStream();
      await this.addLocalStreamToPeerConnection();

      // Create call record in database
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

      // Create and send SDP offer
      const offer = await this.createOffer();

      // Send signaling message with SDP offer
      if (callType === 'user') {
        await this.sendSignalingMessage(receiverId, callData.id, 'offer', {
          callerId: this.currentUserId,
          callerName: 'User',
          receiverName,
          callType,
          deviceInfo: Device.modelName,
          sdp: {
            type: offer.type,
            sdp: offer.sdp,
          },
        });
      } else {
        // For business calls, we need to find the business owner
        console.log(`Business call initiated to ${receiverName}`);
        // TODO: Get business owner ID and send offer to them
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

      this.cleanupCall();

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

      // Start InCallManager
      InCallManager.start({ media: 'audio' });
      InCallManager.setKeepScreenOn(true);
      InCallManager.setSpeakerphoneOn(false);

      // Create peer connection and get local stream
      await this.createPeerConnection();
      await this.getLocalStream();
      await this.addLocalStreamToPeerConnection();

      // If we have a pending offer, set it as remote description
      if (this.currentCall && this.currentCall.pendingOffer) {
        await this.setRemoteDescription(this.currentCall.pendingOffer);
      }

      // Create and send answer
      const answer = await this.createAnswer();

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

      // Send acceptance signaling message with SDP answer
      if (this.currentCall && this.currentCall.caller_id) {
        await this.sendSignalingMessage(
          this.currentCall.caller_id,
          callId,
          'answer',
          {
            accepted: true,
            deviceInfo: Device.modelName,
            sdp: {
              type: answer.type,
              sdp: answer.sdp,
            },
          }
        );
      }

      // Update call state
      if (this.callStateCallback) {
        this.callStateCallback('active', this.currentCall);
      }
    } catch (error) {
      console.error('Failed to accept call:', error);
      this.cleanupCall();
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

      // Send decline signaling message
      if (callToDecline && callToDecline.caller_id) {
        await this.sendSignalingMessage(
          callToDecline.caller_id,
          callId,
          'call-decline',
          {
            declined: true,
          }
        );
      }

      this.cleanupCall();

      // Update call state
      if (this.callStateCallback) {
        this.callStateCallback('ended', { reason: 'declined' });
      }
    } catch (error) {
      console.error('Failed to decline call:', error);
      this.cleanupCall();

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

      // Send end call signaling message
      const otherUserId = callToEnd.isOutgoing
        ? (callToEnd.receiver_id || callToEnd.receiverId)
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

      this.cleanupCall();

      // Update call state
      if (this.callStateCallback) {
        this.callStateCallback('ended', { reason: 'user_ended' });
      }
    } catch (error) {
      console.error('Failed to end call:', error);
      this.cleanupCall();

      if (this.callStateCallback) {
        this.callStateCallback('ended', { reason: 'error', error: error.message });
      }
    }
  }

  cleanupCall() {
    console.log('Cleaning up call resources...');

    // Stop InCallManager
    InCallManager.stop();

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Stop local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.localStream = null;
    }

    // Clear remote stream
    this.remoteStream = null;

    // Clear current call
    this.currentCall = null;

    // Reset audio state
    this.isMuted = false;
    this.isSpeakerOn = false;

    // Clear pending ICE candidates
    this.pendingIceCandidates = [];

    console.log('Call resources cleaned up');
  }

  // ==================== Signaling ====================

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

      if (callData.call_status === 'ended' || callData.call_status === 'declined') {
        this.cleanupCall();
      }

      if (this.callStateCallback) {
        this.callStateCallback(callData.call_status, this.currentCall);
      }
    }
  }

  async handleSignalingMessage(signalData) {
    console.log('Handling signaling message:', signalData.signal_type);

    switch (signalData.signal_type) {
      case 'offer':
        // Handle incoming call offer with SDP
        if (signalData.call_data && signalData.call_data.sdp) {
          if (this.currentCall) {
            this.currentCall.pendingOffer = signalData.call_data.sdp;
          }
        }
        break;

      case 'answer':
        // Handle call answer with SDP
        if (signalData.call_data && signalData.call_data.sdp) {
          await this.setRemoteDescription(signalData.call_data.sdp);
        }
        if (this.callStateCallback) {
          this.callStateCallback('active', this.currentCall);
        }
        break;

      case 'ice-candidate':
        // Handle ICE candidate
        if (signalData.call_data) {
          await this.addIceCandidate(signalData.call_data);
        }
        break;

      case 'call-decline':
        // Handle call decline
        this.cleanupCall();
        if (this.callStateCallback) {
          this.callStateCallback('ended', { reason: 'declined' });
        }
        break;

      case 'call-end':
        // Handle call end
        this.cleanupCall();
        if (this.callStateCallback) {
          this.callStateCallback('ended', { reason: 'remote_ended' });
        }
        break;
    }
  }

  // ==================== Audio Controls ====================

  async toggleMute() {
    try {
      if (this.localStream) {
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !audioTrack.enabled;
          this.isMuted = !audioTrack.enabled;
          console.log('Mute toggled:', this.isMuted);
          return this.isMuted;
        }
      }
      return false;
    } catch (error) {
      console.error('Failed to toggle mute:', error);
      return false;
    }
  }

  async toggleSpeaker() {
    try {
      this.isSpeakerOn = !this.isSpeakerOn;
      InCallManager.setSpeakerphoneOn(this.isSpeakerOn);
      console.log('Speaker toggled:', this.isSpeakerOn);
      return this.isSpeakerOn;
    } catch (error) {
      console.error('Failed to toggle speaker:', error);
      return false;
    }
  }

  getMuteState() {
    return this.isMuted;
  }

  getSpeakerState() {
    return this.isSpeakerOn;
  }

  // ==================== Cleanup ====================

  destroy() {
    try {
      // Clean up any active call
      this.cleanupCall();

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
