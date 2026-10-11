/**
 * Rescátalo Venezuela - Firebase & Firestore Real-Time Configuration
 * Conexión estructurada a Firebase utilizando variables de entorno (.env)
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
  serverTimestamp,
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
  ORDERS: 'orders',
  DRIVERS: 'drivers',
  DRIVER_LOCATIONS: 'driver_locations',
  INCIDENTS: 'incidents',
  NOTIFICATIONS: 'notifications',
  USERS: 'users',
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
 * Elimina claves con valor `undefined` (o las reemplaza por null)
 */
export const sanitizeForFirestore = <T extends Record<string, any>>(obj: T): Record<string, any> => {
  if (obj === null || obj === undefined) return {};
  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      cleaned[key] = sanitizeForFirestore(value);
    } else if (Array.isArray(value)) {
      cleaned[key] = value
        .filter((item) => item !== undefined)
        .map((item) =>
          item !== null && typeof item === 'object' ? sanitizeForFirestore(item) : item ?? null
        );
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
};

/**
 * Guarda o actualiza un viaje en Firestore asegurando persistencia real
 */
export const saveFirestoreOrder = async (order: any): Promise<boolean> => {
  if (!db || !order?.id) return false;
  try {
    const docRef = doc(db, COLLECTIONS.ORDERS, order.id);

    const rawData = {
      ...order,
      status: order.status || 'searching', // Garantizar estado base
      driverId: order.driverId ?? null,
      driverName: order.driverName ?? null,
      driverPhone: order.driverPhone ?? null,
      driverAvatar: order.driverAvatar ?? null,
      driverRating: order.driverRating ?? null,
      driverVehicle: order.driverVehicle ? {
        type: order.driverVehicle.type ?? 'Moto',
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
 * Actualiza el estado del pedido cuando el repartidor acepta la orden en Firestore.
 * Notifica inmediatamente a la vista del cliente.
 */
export const acceptFirestoreOrder = async (
  orderId: string,
  driverData: {
    driverId?: string | null;
    driverName?: string | null;
    driverPhone?: string | null;
    driverAvatar?: string | null;
    driverRating?: number | null;
    driverVehicle?: any;
    driverPosition?: any;
  }
): Promise<boolean> => {
  if (!db || !orderId) return false;
  try {
    const docRef = doc(db, COLLECTIONS.ORDERS, orderId);

    const updatePayload = {
      status: 'ACCEPTED',
      statusText: 'Repartidor asignado',
      driverId: driverData.driverId ?? null,
      driverName: driverData.driverName ?? 'Repartidor',
      driverPhone: driverData.driverPhone ?? null,
      driverAvatar: driverData.driverAvatar ?? null,
      driverRating: driverData.driverRating ?? 5.0,
      driverVehicle: driverData.driverVehicle ?? null,
      driverPosition: driverData.driverPosition ?? null,
      acceptedAt: Date.now(),
      updatedAt: Date.now(),
    };

    const cleaned = sanitizeForFirestore(updatePayload);
    try {
      await updateDoc(docRef, cleaned);
    } catch {
      await setDoc(docRef, cleaned, { merge: true });
    }
    return true;
  } catch (err) {
    console.warn('Error al aceptar orden en Firestore:', err);
    return false;
  }
};

/**
 * Actualiza parcialmente cualquier campo de una orden en Firestore
 */
export const updateFirestoreOrder = async (
  orderId: string,
  partialData: Record<string, any>
): Promise<boolean> => {
  if (!db || !orderId) return false;
  try {
    const docRef = doc(db, COLLECTIONS.ORDERS, orderId);
    const cleaned = sanitizeForFirestore({
      ...partialData,
      updatedAt: Date.now(),
    });
    try {
      await updateDoc(docRef, cleaned);
    } catch {
      await setDoc(docRef, cleaned, { merge: true });
    }
    return true;
  } catch (err) {
    console.warn('Error actualizando orden en Firestore:', err);
    return false;
  }
};

/**
 * Actualiza el campo "status" de la orden en Firestore usando updateDoc
 * según el flujo requerido: "ARRIVED_AT_STORE", "PICKED_UP", "ARRIVED_AT_DESTINATION", "DELIVERED"
 */
export const updateOrderStatusDoc = async (
  orderId: string,
  status: string,
  extraData: Record<string, any> = {}
): Promise<boolean> => {
  if (!db || !orderId) return false;
  try {
    const docRef = doc(db, COLLECTIONS.ORDERS, orderId);
    const payload = sanitizeForFirestore({
      status,
      updatedAt: Date.now(),
      ...extraData,
    });
    try {
      await updateDoc(docRef, payload);
    } catch {
      await setDoc(docRef, payload, { merge: true });
    }
    return true;
  } catch (err) {
    console.warn('Error al actualizar estado con updateDoc en Firestore:', err);
    return false;
  }
};

/**
 * Escucha un único pedido de Firestore en tiempo real para el cliente
 */
export const subscribeToSingleFirestoreOrder = (
  orderId: string,
  onOrderChanged: (order: any | null) => void,
  onError?: (err: any) => void
): Unsubscribe | null => {
  if (!db || !orderId) return null;
  try {
    const orderDocRef = doc(db, COLLECTIONS.ORDERS, orderId);
    return onSnapshot(
      orderDocRef,
      (snap) => {
        if (snap.exists()) {
          onOrderChanged({ id: snap.id, ...snap.data() });
        } else {
          onOrderChanged(null);
        }
      },
      (err) => {
        console.warn('Error listener pedido individual Firestore:', err);
        onError?.(err);
      }
    );
  } catch (err) {
    console.warn('No se pudo establecer listener individual:', err);
    return null;
  }
};

/**
 * Actualiza el perfil del repartidor en Firestore (colección "drivers" y "users")
 * recalculando ratingAverage, totalRatings y la ponderación de prioridad
 */
export const updateDriverRatingAndPriority = async (
  driverId: string,
  ratingAverage: number,
  totalRatings: number,
  priorityWeight: number,
  extra: Record<string, any> = {}
): Promise<boolean> => {
  if (!db || !driverId) return false;
  try {
    const payload = sanitizeForFirestore({
      driverId,
      ratingAverage,
      totalRatings,
      priorityWeight,
      rating: ratingAverage,
      ratingsCount: totalRatings,
      updatedAt: Date.now(),
      ...extra,
    });

    // Guardar en colección "drivers"
    const driverRef = doc(db, COLLECTIONS.DRIVERS, driverId);
    await setDoc(driverRef, payload, { merge: true });

    // También reflejar en colección "users" para coherencia de autenticación
    const userRef = doc(db, COLLECTIONS.USERS, driverId);
    await setDoc(userRef, {
      rating: ratingAverage,
      ratingAverage,
      totalRatings,
      priorityWeight,
      ratingsCount: totalRatings,
      updatedAt: Date.now(),
    }, { merge: true });

    return true;
  } catch (err) {
    console.warn('Error actualizando calificación del repartidor en Firestore:', err);
    return false;
  }
};

/**
 * Fase 3: Chat Privado en Tiempo Real (Cliente <-> Repartidor)
 * Envía un mensaje a la subcolección `orders/{orderId}/messages`
 * con campos text, senderId, createdAt (serverTimestamp())
 */
export const sendFirestoreOrderMessage = async (
  orderId: string,
  msg: {
    text: string;
    senderId: string;
    senderName?: string;
    senderRole?: string;
  }
): Promise<string | null> => {
  if (!db || !orderId || !msg.text?.trim()) return null;
  try {
    const messagesCol = collection(db, COLLECTIONS.ORDERS, orderId, 'messages');
    const docPayload = sanitizeForFirestore({
      orderId,
      text: msg.text.trim(),
      senderId: msg.senderId,
      senderName: msg.senderName || '',
      senderRole: msg.senderRole || '',
      createdAt: serverTimestamp(),
      timestamp: Date.now(),
    });

    const docRef = await addDoc(messagesCol, docPayload);
    return docRef.id;
  } catch (err) {
    console.warn('Error enviando mensaje a subcolección orders/{orderId}/messages:', err);
    return null;
  }
};

/**
 * Fase 3: Escucha mensajes en tiempo real en la subcolección `orders/{orderId}/messages`
 * ordenados por createdAt ascendente
 */
export const subscribeToFirestoreOrderMessages = (
  orderId: string,
  onMessages: (messages: any[]) => void,
  onError?: (err: any) => void
): Unsubscribe | null => {
  if (!db || !orderId) return null;
  try {
    const messagesCol = collection(db, COLLECTIONS.ORDERS, orderId, 'messages');
    const q = query(messagesCol, orderBy('createdAt', 'asc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const ts =
            data.createdAt?.toMillis?.() ||
            (data.createdAt?.seconds ? data.createdAt.seconds * 1000 : null) ||
            data.timestamp ||
            Date.now();

          return {
            id: docSnap.id,
            orderId,
            text: data.text || '',
            senderId: data.senderId || '',
            senderName: data.senderName || '',
            senderRole: data.senderRole || 'client',
            timestamp: ts,
            createdAt: data.createdAt,
          };
        });
        onMessages(msgs);
      },
      (error) => {
        console.warn(`Error en listener de chat orders/${orderId}/messages:`, error);
        onError?.(error);
      }
    );
  } catch (err) {
    console.warn('No se pudo establecer listener para subcolección de chat:', err);
    return null;
  }
};

// ============================================================================
// GESTIÓN PERMANENTE DE USUARIOS EN FIRESTORE (CLIENTES, CONDUCTORES, MODERADOR)
// ============================================================================

/**
 * Escucha la colección de usuarios de Firestore en tiempo real
 */
export const subscribeToFirestoreUsers = (
  onUsersChanged: (users: any[]) => void,
  onError?: (err: any) => void
): Unsubscribe | null => {
  if (!db) return null;
  try {
    const usersCol = collection(db, COLLECTIONS.USERS);
    return onSnapshot(
      usersCol,
      (snapshot) => {
        const users = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        onUsersChanged(users);
      },
      (error) => {
        console.warn('Error en listener de usuarios Firestore:', error);
        onError?.(error);
      }
    );
  } catch (err) {
    console.warn('No se pudo establecer listener Firestore para usuarios:', err);
    return null;
  }
};

/**
 * Registra o guarda a un usuario de forma PERSISTENTE en Firestore.
 * Esto evita que las cuentas se borren al recargar la página o al cambiar de PC a Móvil.
 */
export const saveFirestoreUser = async (userId: string, data: any): Promise<boolean> => {
  if (!db || !userId) return false;
  try {
    const userDocRef = doc(db, COLLECTIONS.USERS, userId);
    const cleaned = sanitizeForFirestore({
      uid: userId,
      ...data,
      role: data.role || 'client', // 'client', 'driver', o 'moderator'
      updatedAt: Date.now(),
    });
    await setDoc(userDocRef, cleaned, { merge: true });
    return true;
  } catch (err) {
    console.warn('Error guardando usuario en Firestore:', err);
    return false;
  }
};

/**
 * Obtiene el perfil de usuario directamente de Firestore por su ID
 */
export const getFirestoreUser = async (userId: string): Promise<any | null> => {
  if (!db || !userId) return null;
  try {
    const userDocRef = doc(db, COLLECTIONS.USERS, userId);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (err) {
    console.warn('Error obteniendo usuario de Firestore:', err);
    return null;
  }
};

// ============================================================================
// SEGUIMIENTO DE UBICACIÓN EN TIEMPO REAL Y REPORTES
// ============================================================================

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