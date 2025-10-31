/**
 * Notification Utilities
 *
 * Provides sound and browser notification functionality for the notification system.
 * Handles Web Audio API for notification sounds and Notification API for browser notifications.
 *
 * Features:
 * - Notification sound playback with error handling
 * - Browser notification with permission management
 * - Priority-based notification behavior
 * - Proper error recovery and logging
 */

import type { SmartNotification, NotificationData } from '@/hooks/useSmartNotifications';

// Notification sound configuration
const NOTIFICATION_SOUND_CONFIG = {
  frequency: 800, // Hz - pleasant notification tone
  duration: 150, // ms - short and subtle
  volume: 0.3, // 30% volume - not intrusive
  type: 'sine' as OscillatorType, // smooth sine wave
};

/**
 * Play notification sound using Web Audio API
 *
 * Creates a synthetic tone using OscillatorNode for notification sound.
 * Fallback to silent operation if Web Audio API is not supported.
 *
 * @param priority - Notification priority (affects volume)
 * @returns Promise that resolves when sound completes
 */
export async function playNotificationSound(
  priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
): Promise<void> {
  try {
    // Check for Web Audio API support
    if (typeof window === 'undefined' || !window.AudioContext) {
      console.warn('[NotificationUtils] Web Audio API not supported');
      return;
    }

    // Create audio context
    const audioContext = new AudioContext();

    // Create oscillator for tone generation
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    // Configure oscillator
    oscillator.type = NOTIFICATION_SOUND_CONFIG.type;
    oscillator.frequency.setValueAtTime(
      NOTIFICATION_SOUND_CONFIG.frequency,
      audioContext.currentTime
    );

    // Configure volume based on priority
    const volumeMultiplier = priority === 'urgent' || priority === 'high' ? 1.2 : 1.0;
    const finalVolume = Math.min(
      NOTIFICATION_SOUND_CONFIG.volume * volumeMultiplier,
      0.5 // cap at 50% to avoid being too loud
    );

    gainNode.gain.setValueAtTime(finalVolume, audioContext.currentTime);

    // Connect audio nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Play sound
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + NOTIFICATION_SOUND_CONFIG.duration / 1000);

    // Wait for sound to complete
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        audioContext.close();
        resolve();
      }, NOTIFICATION_SOUND_CONFIG.duration + 50);
    });

    console.log(`[NotificationUtils] Played notification sound (priority: ${priority})`);
  } catch (error) {
    console.error('[NotificationUtils] Error playing notification sound:', error);
    // Silent failure - don't disrupt user experience
  }
}

/**
 * Show browser notification using Notification API
 *
 * Displays a native browser notification with proper permission handling.
 * Automatically requests permission if not yet granted.
 *
 * @param notification - Notification data
 * @returns Promise that resolves to the Notification instance or null
 */
export async function showBrowserNotification(
  notification: {
    title: string;
    message: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    data: NotificationData | null;
  }
): Promise<Notification | null> {
  try {
    // Check for Notification API support
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('[NotificationUtils] Browser notifications not supported');
      return null;
    }

    // Check current permission status
    let permission = Notification.permission;

    // Request permission if not yet determined
    if (permission === 'default') {
      console.log('[NotificationUtils] Requesting notification permission');
      permission = await Notification.requestPermission();
    }

    // Exit if permission denied
    if (permission !== 'granted') {
      console.warn('[NotificationUtils] Notification permission denied');
      return null;
    }

    // Create notification options
    const options: NotificationOptions = {
      body: notification.message,
      icon: '/favicon-mda.svg', // Use app icon
      badge: '/favicon-mda.svg',
      tag: `notification-${Date.now()}`, // Unique tag for each notification
      requireInteraction: notification.priority === 'urgent' || notification.priority === 'high',
      silent: false, // Use system sound
      data: notification.data, // Pass through custom data
    };

    // Create and show notification
    const browserNotification = new Notification(notification.title, options);

    // Handle notification click
    browserNotification.onclick = () => {
      window.focus(); // Bring app to focus
      browserNotification.close();

      // Navigate to entity if available
      if (notification.data?.entity_type && notification.data?.entity_id) {
        console.log('[NotificationUtils] Notification clicked - navigate to entity:', {
          type: notification.data.entity_type,
          id: notification.data.entity_id,
        });
        // Navigation could be handled here or in the calling component
      }
    };

    // Auto-close after delay based on priority
    const autoCloseDelay = notification.priority === 'urgent' ? 10000 : 5000;
    setTimeout(() => {
      browserNotification.close();
    }, autoCloseDelay);

    console.log('[NotificationUtils] Browser notification shown:', notification.title);

    return browserNotification;
  } catch (error) {
    console.error('[NotificationUtils] Error showing browser notification:', error);
    return null;
  }
}

/**
 * Check if browser notifications are supported and enabled
 *
 * @returns true if notifications are available and permitted
 */
export function areBrowserNotificationsEnabled(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  return Notification.permission === 'granted';
}

/**
 * Request browser notification permission
 *
 * @returns Promise resolving to permission status
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission !== 'default') {
      return Notification.permission;
    }

    const permission = await Notification.requestPermission();
    console.log('[NotificationUtils] Notification permission:', permission);
    return permission;
  } catch (error) {
    console.error('[NotificationUtils] Error requesting notification permission:', error);
    return 'denied';
  }
}
