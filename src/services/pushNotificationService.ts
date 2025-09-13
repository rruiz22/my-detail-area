import { supabase } from "@/integrations/supabase/client";

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  url?: string;
}

class PushNotificationService {
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;

  // Check if push notifications are supported
  isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  // Initialize service worker and push notifications
  async initialize(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered:', this.registration);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  // Request permission for notifications
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    
    return permission;
  }

  // Subscribe to push notifications
  async subscribe(userId: string, dealerId: number): Promise<PushSubscription | null> {
    if (!this.registration) {
      await this.initialize();
    }

    if (!this.registration) {
      throw new Error('Service Worker not registered');
    }

    try {
      // Check if already subscribed
      let subscription = await this.registration.pushManager.getSubscription();

      if (!subscription) {
        // Create new subscription
        subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(
            import.meta.env.VITE_VAPID_PUBLIC_KEY || 'your-vapid-public-key'
          )
        });
      }

      if (subscription) {
        // Convert to our format
        const pushSubscription: PushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
            auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
          }
        };

        // Save subscription to database
        await this.saveSubscription(userId, dealerId, pushSubscription);
        
        this.subscription = pushSubscription;
        return pushSubscription;
      }

      return null;
    } catch (error) {
      console.error('Push subscription failed:', error);
      throw error;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(userId: string, dealerId: number): Promise<boolean> {
    try {
      if (this.registration) {
        const subscription = await this.registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      // Remove from database
      await this.removeSubscription(userId, dealerId);
      
      this.subscription = null;
      return true;
    } catch (error) {
      console.error('Push unsubscribe failed:', error);
      return false;
    }
  }

  // Get current subscription status
  async getSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) {
      return null;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        return {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
            auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
          }
        };
      }
    } catch (error) {
      console.error('Get subscription failed:', error);
    }

    return null;
  }

  // Send a test notification
  async sendTestNotification(): Promise<boolean> {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }

    try {
      const notification = new Notification('Test Notification', {
        body: 'Push notifications are working!',
        icon: '/favicon-mda.svg',
        tag: 'test'
      });

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return true;
    } catch (error) {
      console.error('Test notification failed:', error);
      return false;
    }
  }

  // Show local notification (fallback when service worker is not available)
  async showLocalNotification(payload: PushNotificationPayload): Promise<boolean> {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }

    try {
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/favicon-mda.svg',
        tag: payload.tag || 'default',
        data: payload.data,
        requireInteraction: payload.requireInteraction,
        silent: payload.silent
      });

      // Handle click
      notification.onclick = () => {
        if (payload.url) {
          window.open(payload.url, '_blank');
        }
        notification.close();
      };

      return true;
    } catch (error) {
      console.error('Local notification failed:', error);
      return false;
    }
  }

  // Private helper methods
  private async saveSubscription(userId: string, dealerId: number, subscription: PushSubscription): Promise<void> {
    try {
      // TODO: Uncomment when push_subscriptions table is created via migration
      console.log('Would save subscription:', { userId, dealerId, subscription });
      
      /*
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          dealer_id: dealerId,
          endpoint: subscription.endpoint,
          p256dh_key: subscription.keys.p256dh,
          auth_key: subscription.keys.auth,
          is_active: true,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      */
    } catch (error) {
      console.error('Save subscription failed:', error);
      throw error;
    }
  }

  private async removeSubscription(userId: string, dealerId: number): Promise<void> {
    try {
      // TODO: Uncomment when push_subscriptions table is created via migration
      console.log('Would remove subscription:', { userId, dealerId });
      
      /*
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('dealer_id', dealerId);

      if (error) throw error;
      */
    } catch (error) {
      console.error('Remove subscription failed:', error);
      throw error;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

export const pushNotificationService = new PushNotificationService();