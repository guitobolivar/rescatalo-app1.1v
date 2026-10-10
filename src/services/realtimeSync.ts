/**
 * Rescátalo Venezuela - Real-Time Synchronization Engine
 * Bridges Firebase Firestore and Cross-Window/Cross-Device Real-Time Bus
 */

import {
  isFirebaseConfigured,
  subscribeToFirestoreOrders,
  saveFirestoreOrder,
  subscribeToFirestoreDriverLocation,
  updateFirestoreDriverLocation,
  subscribeToFirestoreIncidents,
  saveFirestoreIncident,
} from './firebase';
import { Order, LocationPoint, ModeratorIncidentReport, AppNotification } from '../types';

export type RealtimeSyncMessage =
  | { type: 'ORDER_UPSERT'; order: Order }
  | { type: 'ORDER_ACCEPTED'; order: Order; driverName: string }
  | { type: 'DRIVER_LOCATION_UPDATE'; orderId: string; location: { lat: number; lng: number; name?: string | null; address?: string | null; heading?: number; speed?: number } }
  | { type: 'INCIDENT_NEW'; incident: ModeratorIncidentReport }
  | { type: 'NOTIFICATION_DISPATCH'; notification: AppNotification };

class RealtimeSyncManager {
  private channel: BroadcastChannel | null = null;
  private orderListeners: Set<(order: Order) => void> = new Set();
  private ordersListListeners: Set<(orders: Order[]) => void> = new Set();
  private locationListeners: Map<string, Set<(loc: { lat: number; lng: number; name?: string | null; address?: string | null; heading?: number; speed?: number }) => void>> = new Map();
  private incidentListeners: Set<(inc: ModeratorIncidentReport) => void> = new Set();
  private notificationListeners: Set<(notif: AppNotification) => void> = new Set();

  constructor() {
    this.initBroadcastChannel();
    this.initStorageListener();
    this.initFirestoreSync();
  }

  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('rescatalo_realtime_sync_v1');
        this.channel.onmessage = (event) => {
          this.handleIncomingMessage(event.data);
        };
      } catch (err) {
        console.warn('BroadcastChannel not available in this environment:', err);
      }
    }
  }

  private initStorageListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === 'rescatalo_sync_event' && event.newValue) {
          try {
            const data = JSON.parse(event.newValue);
            this.handleIncomingMessage(data);
          } catch (e) {
            // ignore
          }
        }
      });
    }
  }

  private initFirestoreSync() {
    // Listen to orders collection in Firestore
    subscribeToFirestoreOrders((remoteOrders) => {
      if (Array.isArray(remoteOrders)) {
        for (const listener of this.ordersListListeners) {
          listener(remoteOrders as Order[]);
        }
      }
    });

    // Listen to incidents in Firestore
    subscribeToFirestoreIncidents((remoteIncidents) => {
      if (Array.isArray(remoteIncidents) && remoteIncidents.length > 0) {
        for (const inc of remoteIncidents) {
          for (const listener of this.incidentListeners) {
            listener(inc as ModeratorIncidentReport);
          }
        }
      }
    });
  }

  private handleIncomingMessage(msg: RealtimeSyncMessage) {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'ORDER_UPSERT':
      case 'ORDER_ACCEPTED': {
        for (const listener of this.orderListeners) {
          listener(msg.order);
        }
        break;
      }
      case 'DRIVER_LOCATION_UPDATE': {
        const listeners = this.locationListeners.get(msg.orderId);
        if (listeners) {
          for (const listener of listeners) {
            listener(msg.location);
          }
        }
        break;
      }
      case 'INCIDENT_NEW': {
        for (const listener of this.incidentListeners) {
          listener(msg.incident);
        }
        break;
      }
      case 'NOTIFICATION_DISPATCH': {
        for (const listener of this.notificationListeners) {
          listener(msg.notification);
        }
        break;
      }
    }
  }

  public broadcast(msg: RealtimeSyncMessage) {
    // 1. BroadcastChannel (fast local tabs/windows)
    try {
      this.channel?.postMessage(msg);
    } catch (e) {
      // ignore
    }

    // 2. Storage event fallback
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'rescatalo_sync_event',
          JSON.stringify({ ...msg, _nonce: Date.now() + Math.random() })
        );
      }
    } catch (e) {
      // ignore
    }

    // 3. Firestore Cloud Persistence
    if (msg.type === 'ORDER_UPSERT' || msg.type === 'ORDER_ACCEPTED') {
      saveFirestoreOrder(msg.order);
    } else if (msg.type === 'DRIVER_LOCATION_UPDATE') {
      updateFirestoreDriverLocation(msg.orderId, {
        lat: msg.location.lat,
        lng: msg.location.lng,
      });
    } else if (msg.type === 'INCIDENT_NEW') {
      saveFirestoreIncident(msg.incident);
    }
  }

  // Subscribe methods
  public onOrderUpdate(callback: (order: Order) => void): () => void {
    this.orderListeners.add(callback);
    return () => this.orderListeners.delete(callback);
  }

  public onOrdersListUpdate(callback: (orders: Order[]) => void): () => void {
    this.ordersListListeners.add(callback);
    return () => this.ordersListListeners.delete(callback);
  }

  public onDriverLocation(
    orderId: string,
    callback: (loc: { lat: number; lng: number; name?: string | null; address?: string | null; heading?: number; speed?: number }) => void
  ): () => void {
    if (!this.locationListeners.has(orderId)) {
      this.locationListeners.set(orderId, new Set());
    }
    this.locationListeners.get(orderId)!.add(callback);

    // Also attach Firestore listener if configured
    let firestoreUnsub: (() => void) | null = null;
    if (isFirebaseConfigured) {
      firestoreUnsub = subscribeToFirestoreDriverLocation(orderId, (pos) => {
        callback({
          lat: pos.lat,
          lng: pos.lng,
          name: 'Repartidor en movimiento',
        });
      });
    }

    return () => {
      this.locationListeners.get(orderId)?.delete(callback);
      firestoreUnsub?.();
    };
  }

  public onIncidentReported(callback: (inc: ModeratorIncidentReport) => void): () => void {
    this.incidentListeners.add(callback);
    return () => this.incidentListeners.delete(callback);
  }

  public onNotification(callback: (notif: AppNotification) => void): () => void {
    this.notificationListeners.add(callback);
    return () => this.notificationListeners.delete(callback);
  }
}

export const realtimeSync = new RealtimeSyncManager();
