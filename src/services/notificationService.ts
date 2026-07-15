import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';
import { AppNotification } from '../types';

// Initialize Firebase Cloud Messaging
const messaging = getMessaging();

// Request permission for notifications
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted');
      return true;
    } else {
      console.log('Notification permission denied');
      return false;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

// Get FCM token
export const getFCMToken = async (): Promise<string | null> => {
  try {
    const token = await getToken(messaging, {
      vapidKey: 'BFGdxoF1o4IukZN10YDs8XAnLCmycrAB2qyrMqiVH49xJP7RmawI543Os3pipnPgxpWNqn2wJnb7XXz0kPItbEU'
    });
    
    if (token) {
      console.log('FCM token:', token);
      return token;
    } else {
      console.log('No registration token available');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

// Update FCM token on server
export const updateFCMToken = async (token: string): Promise<boolean> => {
  try {
    const updateToken = httpsCallable(functions, 'updateFCMToken');
    await updateToken({ fcmToken: token });
    console.log('FCM token updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating FCM token:', error);
    return false;
  }
};

// Listen for foreground messages
export const onForegroundMessage = (callback: (payload: any) => void) => {
  return onMessage(messaging, callback);
};

// Initialize notification service
export const initializeNotifications = async (): Promise<boolean> => {
  try {
    // Request permission
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      return false;
    }
    
    // Get FCM token
    const token = await getFCMToken();
    if (!token) {
      return false;
    }
    
    // Update token on server
    const updated = await updateFCMToken(token);
    if (!updated) {
      return false;
    }
    
    console.log('Notifications initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing notifications:', error);
    return false;
  }
};

// Show local notification
export const showLocalNotification = (title: string, body: string, icon?: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: icon || '/logo192.png',
      badge: '/logo192.png',
      tag: 'studybuddy-notification',
    });
    
    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);
    
    return notification;
  }
  return null;
};
