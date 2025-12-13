import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../supabaseClient';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;

    // For incoming calls, always show the notification
    if (data?.type === 'incoming_call') {
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      };
    }

    // For other notifications
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    };
  },
});

class PushNotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
    this.onNotificationReceived = null;
    this.onNotificationResponse = null;
  }

  /**
   * Initialize the push notification service
   * @param {Object} callbacks - Callback functions for notification events
   * @param {Function} callbacks.onNotificationReceived - Called when notification is received
   * @param {Function} callbacks.onNotificationResponse - Called when user interacts with notification
   */
  async initialize(callbacks = {}) {
    try {
      this.onNotificationReceived = callbacks.onNotificationReceived;
      this.onNotificationResponse = callbacks.onNotificationResponse;

      // Register for push notifications
      const token = await this.registerForPushNotifications();

      if (token) {
        this.expoPushToken = token;
        console.log('Push notification token:', token);

        // Save token to database
        await this.saveTokenToDatabase(token);
      }

      // Set up notification listeners
      this.setupNotificationListeners();

      console.log('Push notification service initialized');
      return token;
    } catch (error) {
      console.error('Error initializing push notification service:', error);
      throw error;
    }
  }

  /**
   * Register for push notifications and get the Expo push token
   */
  async registerForPushNotifications() {
    try {
      // Check if it's a physical device
      if (!Device.isDevice) {
        console.log('Push notifications require a physical device');
        return null;
      }

      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permission denied');
        return null;
      }

      // Get Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'dd7711ca-c7b6-4066-bd17-27f06af90a39', // From app.json
      });

      // Set up Android notification channel
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      return tokenData.data;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Set up Android notification channels
   */
  async setupAndroidChannels() {
    // Default channel for general notifications
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0A66C2',
    });

    // High priority channel for incoming calls
    await Notifications.setNotificationChannelAsync('incoming_calls', {
      name: 'Incoming Calls',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500, 200, 500],
      lightColor: '#0A66C2',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    // Channel for messages
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0A66C2',
    });
  }

  /**
   * Set up notification listeners
   */
  setupNotificationListeners() {
    // Listener for when a notification is received while app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);

        if (this.onNotificationReceived) {
          this.onNotificationReceived(notification);
        }
      }
    );

    // Listener for when user interacts with a notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response:', response);

        const data = response.notification.request.content.data;

        if (this.onNotificationResponse) {
          this.onNotificationResponse(response, data);
        }
      }
    );
  }

  /**
   * Save push token to Supabase database
   */
  async saveTokenToDatabase(token) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.log('No authenticated user, cannot save push token');
        return;
      }

      // Check if user_profiles table exists and has push_token column
      // If not, we'll create/update a push_tokens table
      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: user.id,
          token: token,
          platform: Platform.OS,
          device_name: Device.deviceName || 'Unknown Device',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        // If table doesn't exist, log but don't fail
        if (error.code === '42P01') {
          console.log('push_tokens table does not exist yet. Token will be stored when table is created.');
          // Store token locally for later sync
          this.pendingToken = token;
        } else {
          console.error('Error saving push token:', error);
        }
      } else {
        console.log('Push token saved to database');
      }
    } catch (error) {
      console.error('Error saving push token to database:', error);
    }
  }

  /**
   * Get the current push token
   */
  getToken() {
    return this.expoPushToken;
  }

  /**
   * Schedule a local notification (useful for testing)
   */
  async scheduleLocalNotification(title, body, data = {}, seconds = 1) {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: {
          seconds,
        },
      });

      console.log('Local notification scheduled:', identifier);
      return identifier;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      throw error;
    }
  }

  /**
   * Show an incoming call notification
   */
  async showIncomingCallNotification(callerName, callId, callType = 'user') {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Incoming Call',
          body: `${callerName} is calling...`,
          data: {
            type: 'incoming_call',
            callId,
            callerName,
            callType,
          },
          sound: true,
          priority: 'max',
          categoryIdentifier: 'incoming_call',
        },
        trigger: null, // Show immediately
      });

      console.log('Incoming call notification shown:', identifier);
      return identifier;
    } catch (error) {
      console.error('Error showing incoming call notification:', error);
      throw error;
    }
  }

  /**
   * Dismiss a specific notification
   */
  async dismissNotification(identifier) {
    try {
      await Notifications.dismissNotificationAsync(identifier);
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  }

  /**
   * Dismiss all notifications
   */
  async dismissAllNotifications() {
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.error('Error dismissing all notifications:', error);
    }
  }

  /**
   * Get badge count
   */
  async getBadgeCount() {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  /**
   * Clean up listeners
   */
  destroy() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }

    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }

    console.log('Push notification service destroyed');
  }
}

// Export singleton instance
export default new PushNotificationService();
