/**
 * Rescátalo Web Push & System Notification Manager
 * Handles background notifications and Web Notification API integration
 */

export interface SystemNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

class NotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private isSupported: boolean = false;

  constructor() {
    this.isSupported = typeof window !== 'undefined' && 'Notification' in window;
    this.initServiceWorker();
  }

  public async initServiceWorker(): Promise<void> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      this.swRegistration = reg;
    } catch (err) {
      console.warn('Service Worker registration skipped or failed:', err);
    }
  }

  public getPermissionStatus(): NotificationPermission {
    if (!this.isSupported) return 'denied';
    return Notification.permission;
  }

  public async requestPermission(): Promise<boolean> {
    if (!this.isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (e) {
      console.error('Error requesting notification permission:', e);
      return false;
    }
  }

  public async sendNotification(options: SystemNotificationOptions): Promise<boolean> {
    if (!this.isSupported) return false;

    // Check or request permission
    if (Notification.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) return false;
    }

    const title = options.title;
    const notificationOptions: NotificationOptions = {
      body: options.body,
      icon:
        options.icon ||
        'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=128&auto=format&fit=crop&q=80',
      badge:
        options.badge ||
        'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=64&auto=format&fit=crop&q=80',
      tag: options.tag || `rescatalo-${Date.now()}`,
      data: options.data,
      requireInteraction: false,
    };

    // Try service worker showNotification first (best for background/locked screen)
    if (this.swRegistration && 'showNotification' in this.swRegistration) {
      try {
        await this.swRegistration.showNotification(title, notificationOptions);
        if ('vibrate' in navigator) {
          navigator.vibrate([150, 80, 150]);
        }
        return true;
      } catch (err) {
        console.warn('SW showNotification fallback:', err);
      }
    }

    // Direct Notification constructor fallback
    try {
      const notif = new Notification(title, notificationOptions);
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
      if ('vibrate' in navigator) {
        navigator.vibrate([150, 80, 150]);
      }
      return true;
    } catch (e) {
      console.warn('Standard Notification fallback failed:', e);
      return false;
    }
  }
}

export const notificationService = new NotificationService();
