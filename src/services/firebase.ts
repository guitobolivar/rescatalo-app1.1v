/**
 * Rescátalo Venezuela - Firebase & Firestore Real-Time Configuration
 * Conexión estructurada a Firebase utilizando variables de entorno (.env)
 */

import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import {
  app,
  db,
  auth,
  firebaseConfig,
  isFirebaseConfigured,
  registerWithFirebase,
} from '../firebaseConfig';

export { app, db, auth, firebaseConfig, isFirebaseConfigured, registerWithFirebase };

// ============================================================================
// COLECCIONES Y HELPERS DE TIEMPO REAL PARA VIAJES, CONDUCTOR Y REPORTES
// ============================================================================

export const COLLECTIONS = {
  ORDERS: 'rescatalo_orders',
  DRIVER_LOCATIONS: 'rescatalo_driver_locations',
  INCIDENTS: 'rescatalo_incidents',
  NOTIFICATIONS: 'rescatalo_notifications',
} as const;

/**
 * Escucha cambios en tiempo real en la colección de viajes / órdenes
 */
export const subscribeToFirestoreOrders = (
  onOrdersChanged: (orders: any[]) => void,
  onError?: (err: any) => void
): Unsubscribe | null => {
  if (!db) return null;

  try {
    const ordersCol = collection(db, COLLECTIONS.ORDERS);
    const q = query(ordersCol, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const ordersData = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        onOrdersChanged(ordersData);
      },
      (error) => {
        console.warn('Error en listener de órdenes Firestore:', error);
        onError?.(error);
      }
    );
  } catch (err) {
    console.warn('No se pudo establecer listener Firestore para órdenes:', err);
    return null;
  }
};

/**
 * Sanitiza recursivamente objetos para Firestore:
 * Elimina claves con valor `undefined` (o las reemplaza por null si es necesario)
 * para evitar el error "Unsupported field value: undefined" en Firestore.
 */
export const sanitizeForFirestore = <T extends Record<string, any>>(obj: T): Record<string, any> => {
  if (obj === null || obj === undefined) return {};
  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      // Omitir campo con valor undefined
      continue;
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      cleaned[key] = sanitizeForFirestore(value);
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map((item) =>
        item !== null && typeof item === 'object' ? sanitizeForFirestore(item) : item ?? null
      );
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
};

/**
 * Guarda o actualiza un viaje en Firestore
 */
export const saveFirestoreOrder = async (order: any): Promise<boolean> => {
  if (!db || !order?.id) return false;
  try {
    const docRef = doc(db, COLLECTIONS.ORDERS, order.id);

    // Mapeo seguro con valores default o null para todos los campos opcionales del ciclo de vida del pedido
    const rawData = {
      ...order,
      driverId: order.driverId ?? null,
      driverName: order.driverName ?? null,
      driverPhone: order.driverPhone ?? null,
      driverAvatar: order.driverAvatar ?? null,
      driverRating: order.driverRating ?? null,
      driverVehicle: order.driverVehicle ? {
        model: order.driverVehicle.model ?? null,
        plate: order.driverVehicle.plate ?? null,
        color: order.driverVehicle.color ?? null,
      } : null,
      driverPosition: order.driverPosition ? {
        lat: order.driverPosition.lat ?? null,
        lng: order.driverPosition.lng ?? null,
        name: order.driverPosition.name ?? null,
        address: order.driverPosition.address ?? null,
      } : null,
      acceptedAt: order.acceptedAt ?? null,
      completedAt: order.completedAt ?? null,
      cancelledAt: order.cancelledAt ?? null,
      cancelledBy: order.cancelledBy ?? null,
      cancelReason: order.cancelReason ?? null,
      ratingGiven: order.ratingGiven ? {
        stars: order.ratingGiven.stars ?? null,
        tags: order.ratingGiven.tags ?? [],
        comment: order.ratingGiven.comment ?? null,
      } : null,
      cancellationRequest: order.cancellationRequest ? {
        requestedBy: order.cancellationRequest.requestedBy ?? null,
        reason: order.cancellationRequest.reason ?? null,
        timestamp: order.cancellationRequest.timestamp ?? null,
        status: order.cancellationRequest.status ?? null,
      } : null,
      reportIncident: order.reportIncident ?? null,
      updatedAt: Date.now(),
    };

    const cleanedOrder = sanitizeForFirestore(rawData);
    await setDoc(docRef, cleanedOrder, { merge: true });
    return true;
  } catch (err) {
    console.warn('Error al guardar orden en Firestore:', err);
    return false;
  }
};

/**
 * Escucha la ubicación geográfica dinámica del repartidor en tiempo real
 */
export const subscribeToFirestoreDriverLocation = (
  orderId: string,
  onLocationUpdate: (pos: { lat: number; lng: number; heading?: number; speed?: number }) => void
): Unsubscribe | null => {
  if (!db || !orderId) return null;

  try {
    const locDoc = doc(db, COLLECTIONS.DRIVER_LOCATIONS, orderId);
    return onSnapshot(locDoc, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data?.lat && data?.lng) {
          onLocationUpdate({
            lat: data.lat,
            lng: data.lng,
            heading: data.heading,
            speed: data.speed,
          });
        }
      }
    });
  } catch (err) {
    console.warn('Error en listener de ubicación en Firestore:', err);
    return null;
  }
};

/**
 * Actualiza la ubicación geográfica dinámica del repartidor en Firestore
 */
export const updateFirestoreDriverLocation = async (
  orderId: string,
  location: { lat: number; lng: number; heading?: number; speed?: number; driverId?: string }
): Promise<boolean> => {
  if (!db || !orderId) return false;
  try {
    const locDoc = doc(db, COLLECTIONS.DRIVER_LOCATIONS, orderId);
    const cleanedLocation = sanitizeForFirestore({
      ...location,
      orderId,
      updatedAt: Date.now(),
    });
    await setDoc(locDoc, cleanedLocation, { merge: true });
    return true;
  } catch (err) {
    console.warn('Error al actualizar ubicación en Firestore:', err);
    return false;
  }
};

/**
 * Escucha y registra reportes de clientes hacia el moderador en tiempo real
 */
export const subscribeToFirestoreIncidents = (
  onIncidentsChanged: (incidents: any[]) => void
): Unsubscribe | null => {
  if (!db) return null;

  try {
    const incCol = collection(db, COLLECTIONS.INCIDENTS);
    const q = query(incCol, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const incidents = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onIncidentsChanged(incidents);
    });
  } catch (err) {
    console.warn('Error suscribiendo a incidentes en Firestore:', err);
    return null;
  }
};

export const saveFirestoreIncident = async (incident: any): Promise<boolean> => {
  if (!db || !incident?.id) return false;
  try {
    const docRef = doc(db, COLLECTIONS.INCIDENTS, incident.id);
    const cleanedIncident = sanitizeForFirestore({
      ...incident,
      updatedAt: Date.now(),
    });
    await setDoc(docRef, cleanedIncident, { merge: true });
    return true;
  } catch (err) {
    console.warn('Error guardando incidente en Firestore:', err);
    return false;
  }
};
