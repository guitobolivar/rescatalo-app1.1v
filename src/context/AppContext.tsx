import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  UserRole,
  UserStatus,
  Order,
  OrderStatus,
  PricingConfig,
  ChatMessage,
  LocationPoint,
  DriverStats,
  IncomingAlert,
  PerformanceTier,
  AppNotification,
  AnnouncementBanner,
  ModeratorIncidentReport,
  DriverCancellationRequest,
  normalizeRole,
  isClientRole,
  isDriverRole,
  isAdminRole,
} from '../types';
import {
  DEFAULT_VENEZUELA_CENTER,
  POPULAR_LOCATIONS,
  calculateDistanceKm,
  playAlertChime,
  getDriverPerformance,
} from '../data/venezuelaData';
import { notificationService } from '../utils/notifications';
import { realtimeSync } from '../services/realtimeSync';
import { auth, db } from '../firebaseConfig';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import {
  COLLECTIONS,
  sanitizeForFirestore,
  saveFirestoreOrder,
  acceptFirestoreOrder,
  subscribeToFirestoreOrders,
  subscribeToFirestoreUsers,
  saveFirestoreUser,
} from '../services/firebase';

interface AppContextType {
  currentUser: User | null;
  allUsers: User[];
  isModerator: boolean;
  isAdmin: boolean;
  pricingConfig: PricingConfig;
  updatePricingConfig: (config: Partial<PricingConfig>) => void;
  announcement: AnnouncementBanner;
  updateAnnouncement: (data: Partial<AnnouncementBanner>) => void;
  setUserStatus: (userId: string, status: UserStatus, reason?: string) => void;
  deleteUser: (userId: string) => void;
  // Auth
  login: (email: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  register: (user: Omit<User, 'id'>) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  switchUserRole: (newRole: UserRole) => void;
  changeUserRoleInFirestore: (newRole: 'client' | 'driver' | 'admin', userId?: string) => Promise<boolean>;
  // User Profile
  updateUserProfile: (
    userId: string,
    data: Partial<User>,
    isByModerator?: boolean
  ) => { success: boolean; message: string; nextAllowedDate?: string };
  // Notifications
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;
  clearReadNotifications: () => void;
  pushPermissionStatus: NotificationPermission;
  requestPushPermission: () => Promise<boolean>;
  // Driver state
  isDriverOnline: boolean;
  setIsDriverOnline: (online: boolean) => void;
  driverDailyEarningsUSD: number;
  driverCompletedTrips: number;
  driverStats: DriverStats;
  incomingOrderAlert: IncomingAlert | null;
  acceptIncomingOrder: (orderId: string) => void;
  rejectIncomingOrder: (orderId: string) => void;
  // Orders
  orders: Order[];
  activeOrder: Order | null;
  setActiveOrderId: (id: string | null) => void;
  clearActiveOrderState: () => void;
  createOrder: (data: {
    origin: LocationPoint;
    destination: LocationPoint;
    serviceTypeId: string;
    itemDescription: string;
  }) => Order;
  advanceOrderStatus: (orderId: string, nextStatus: OrderStatus) => void;
  cancelOrder: (
    orderId: string,
    cancelledByRole?: 'Cliente' | 'Repartidor' | 'Moderador',
    reason?: string
  ) => void;
  submitRating: (orderId: string, stars: number, tags: string[], comment?: string) => void;
  // Chat
  chatMessages: ChatMessage[];
  sendChatMessage: (orderId: string, text: string) => void;
  // Strict cancellation & Driver incident reports
  requestDriverCancellation: (orderId: string, reason: string) => void;
  respondToCancellationRequest: (orderId: string, accepted: boolean) => void;
  incidentReports: ModeratorIncidentReport[];
  reportDriverIncident: (orderId: string, reason: string, details: string) => ModeratorIncidentReport;
  updateIncidentStatus: (
    incidentId: string,
    newStatus: 'Abierto' | 'Investigando' | 'Sancionado' | 'Resuelto'
  ) => void;
}

const DEFAULT_PRICING: PricingConfig = {
  baseFeeUSD: 2.0,
  costPerKmUSD: 0.8,
  driverCommissionRate: 0.85,
  minimumFareUSD: 2.0,
  serviceRatesUSD: {
    rescate_moto: 0.8,
    rescate_delivery: 0.95,
  },
};

const DEFAULT_ANNOUNCEMENT: AnnouncementBanner = {
  enabled: true,
  title: '¡Promociones y Entregas en Valle de la Pascua!',
  message: 'Aprovecha las tarifas accesibles en USD para compras, carreras y encomiendas en toda la ciudad con tiempo de respuesta de 10 a 15 min.',
  badge: 'COMUNICADO OFICIAL',
};

const ZERO_DRIVER_STATS: DriverStats = {
  accumulatedKm: 0,
  weeklyCompletedTrips: 0,
  weeklyEarningsUSD: 0,
  monthlyEarningsUSD: 0,
  ratingsCount: 0,
  ratingSum: 0,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. Users state - Cargado y sincronizado en tiempo real desde Firestore colección 'users'
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Current logged in user (Sincronizado directamente con Firebase Authentication y Firestore)
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // 2. Pricing config state
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(() => {
    const saved = localStorage.getItem('rescatalo_pricing');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_PRICING,
          ...parsed,
          serviceRatesUSD: {
            ...DEFAULT_PRICING.serviceRatesUSD,
            ...(parsed.serviceRatesUSD || {}),
          },
        };
      } catch {
        return DEFAULT_PRICING;
      }
    }
    return DEFAULT_PRICING;
  });

  // Announcement banner (editable by moderator)
  const [announcement, setAnnouncement] = useState<AnnouncementBanner>(() => {
    const saved = localStorage.getItem('rescatalo_announcement');
    if (saved) {
      try {
        return { ...DEFAULT_ANNOUNCEMENT, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_ANNOUNCEMENT;
      }
    }
    return DEFAULT_ANNOUNCEMENT;
  });

  useEffect(() => {
    localStorage.setItem('rescatalo_announcement', JSON.stringify(announcement));
  }, [announcement]);

  const updateAnnouncement = (data: Partial<AnnouncementBanner>) => {
    setAnnouncement((prev) => {
      const updated = { ...prev, ...data };
      localStorage.setItem('rescatalo_announcement', JSON.stringify(updated));
      return updated;
    });
  };

  // 3. Driver status
  const [isDriverOnline, setIsDriverOnline] = useState<boolean>(() => {
    const saved = localStorage.getItem('rescatalo_driver_online');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [driverDailyEarningsUSD, setDriverDailyEarningsUSD] = useState<number>(() => {
    const saved = localStorage.getItem('rescatalo_driver_earnings_clean');
    return saved ? JSON.parse(saved) : 0;
  });

  const [driverCompletedTrips, setDriverCompletedTrips] = useState<number>(() => {
    const saved = localStorage.getItem('rescatalo_driver_trips_clean');
    return saved ? JSON.parse(saved) : 0;
  });

  // Driver aggregated stats (Km acumulados, semanales, mensuales)
  const [driverStats, setDriverStats] = useState<DriverStats>(() => {
    const saved = localStorage.getItem('rescatalo_driver_stats_clean');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return ZERO_DRIVER_STATS;
      }
    }
    return ZERO_DRIVER_STATS;
  });

  // Incoming alert with priority tier & countdown metadata
  const [incomingOrderAlert, setIncomingOrderAlert] = useState<IncomingAlert | null>(null);

  // 4. Orders state - Conexión directa en tiempo real a Firestore 'rescatalo_orders'
  const [orders, setOrders] = useState<Order[]>([]);

  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  // 5. Chat messages
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('rescatalo_chat_messages');
    return saved ? JSON.parse(saved) : [];
  });

  // 6. In-App & Push Notifications
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [pushPermissionStatus, setPushPermissionStatus] = useState<NotificationPermission>(() => {
    return notificationService.getPermissionStatus();
  });

  // 7. Incident reports for moderator
  const [incidentReports, setIncidentReports] = useState<ModeratorIncidentReport[]>(() => {
    const saved = localStorage.getItem('rescatalo_incidents');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('rescatalo_incidents', JSON.stringify(incidentReports));
  }, [incidentReports]);

  // Auth State Listener en tiempo real con Firebase Authentication y Firestore
  useEffect(() => {
    if (!auth) return;
    let unsubUserDoc: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (unsubUserDoc) {
        unsubUserDoc();
        unsubUserDoc = null;
      }

      if (fbUser) {
        if (db) {
          try {
            const userDocRef = doc(db, 'users', fbUser.uid);
            unsubUserDoc = onSnapshot(userDocRef, (snap) => {
              if (snap.exists()) {
                const raw = snap.data();
                const uData: User = {
                  id: snap.id,
                  ...raw,
                  role: normalizeRole(raw?.role),
                  status: raw?.status || 'Activo',
                } as User;
                setCurrentUser(uData);
              } else {
                const isOwnerEmail = ['recataloapp@gmail.com', 'guitobolivar@gmail.com', 'julio.c.montero01@gmail.com'].includes(fbUser.email?.toLowerCase() || '');
                const defaultRole: UserRole = isOwnerEmail ? 'admin' : 'client';
                const defaultProfile: User = {
                  id: fbUser.uid,
                  name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuario',
                  email: fbUser.email || '',
                  phone: fbUser.phoneNumber || '',
                  role: defaultRole,
                  status: 'Activo',
                  rating: 5.0,
                };
                setCurrentUser(defaultProfile);
                if (db) {
                  setDoc(userDocRef, sanitizeForFirestore(defaultProfile), { merge: true }).catch(() => {});
                }
              }
            });
          } catch (e) {
            console.warn('Error subscribing to user doc in Firestore:', e);
          }
        }
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      unsubAuth();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, []);

  // Sincronización en tiempo real de la colección 'users' de Firestore
  useEffect(() => {
    const unsub = subscribeToFirestoreUsers((remoteUsers) => {
      if (Array.isArray(remoteUsers)) {
        const normalized = remoteUsers.map((u: any) => ({
          ...u,
          role: normalizeRole(u?.role),
        })) as User[];
        setAllUsers(normalized);
      }
    });
    return () => {
      unsub?.();
    };
  }, []);

  // Sincronización en tiempo real de la colección 'rescatalo_orders' de Firestore
  useEffect(() => {
    const unsub = subscribeToFirestoreOrders((remoteOrders) => {
      if (Array.isArray(remoteOrders)) {
        setOrders(remoteOrders as Order[]);
      }
    });
    return () => {
      unsub?.();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('rescatalo_pricing', JSON.stringify(pricingConfig));
  }, [pricingConfig]);

  useEffect(() => {
    localStorage.setItem('rescatalo_driver_online', JSON.stringify(isDriverOnline));
  }, [isDriverOnline]);

  useEffect(() => {
    localStorage.setItem('rescatalo_driver_earnings_clean', JSON.stringify(driverDailyEarningsUSD));
  }, [driverDailyEarningsUSD]);

  useEffect(() => {
    localStorage.setItem('rescatalo_driver_trips_clean', JSON.stringify(driverCompletedTrips));
  }, [driverCompletedTrips]);

  useEffect(() => {
    localStorage.setItem('rescatalo_driver_stats_clean', JSON.stringify(driverStats));
  }, [driverStats]);

  useEffect(() => {
    localStorage.setItem('rescatalo_chat_messages', JSON.stringify(chatMessages));
  }, [chatMessages]);

  // 8. REAL-TIME MULTI-DEVICE & FIREBASE SYNCHRONIZATION
  useEffect(() => {
    // Escucha actualizaciones directas de órdenes
    const unsubOrder = realtimeSync.onOrderUpdate((remoteOrder) => {
      setOrders((prev) => {
        const idx = prev.findIndex((o) => o.id === remoteOrder.id);
        const myActiveId = typeof window !== 'undefined' ? localStorage.getItem('rescatalo_client_active_order_id') : null;
        const isMyOrder =
          remoteOrder.clientId === currentUser?.id ||
          remoteOrder.id === myActiveId;

        if (idx >= 0) {
          const old = prev[idx];
          // Si el repartidor acaba de aceptar la orden
          if (old.status !== remoteOrder.status) {
            if (isMyOrder && remoteOrder.status === 'Repartidor asignado') {
              playAlertChime('accepted');
              notificationService.sendNotification({
                title: '🛵 ¡Repartidor Asignado!',
                body: `${remoteOrder.driverName || 'Tu repartidor'} aceptó tu viaje y viene en camino.`,
              });
              setActiveOrderId(remoteOrder.id);
            }
          }
          const copy = [...prev];
          copy[idx] = { ...old, ...remoteOrder };
          return copy;
        }

        // Nueva orden emitida por un cliente
        if (remoteOrder.status === 'Buscando repartidor') {
          if (isDriverOnline) {
            setIncomingOrderAlert({
              order: remoteOrder,
              tier: 'green',
              tierLabel: 'Prioridad Inmediata',
              delaySeconds: 0,
              dispatchedAt: Date.now(),
            });
            playAlertChime('incoming_order');
          }
        }
        return [remoteOrder, ...prev];
      });
    });

    // Escucha lista completa desde Firestore
    const unsubOrdersList = realtimeSync.onOrdersListUpdate((remoteList) => {
      setOrders((prev) => {
        const merged = [...prev];
        for (const ro of remoteList) {
          const idx = merged.findIndex((o) => o.id === ro.id);
          if (idx >= 0) {
            merged[idx] = { ...merged[idx], ...ro };
          } else {
            merged.unshift(ro);
          }
        }
        return merged;
      });
    });

    // Escucha incidentes reportados hacia el moderador
    const unsubIncidents = realtimeSync.onIncidentReported((remoteInc) => {
      setIncidentReports((prev) => {
        if (prev.some((i) => i.id === remoteInc.id)) return prev;
        return [remoteInc, ...prev];
      });
      playAlertChime('incoming_order');
    });

    // Escucha notificaciones push cruzadas
    const unsubNotif = realtimeSync.onNotification((remoteNotif) => {
      const myActiveId = typeof window !== 'undefined' ? localStorage.getItem('rescatalo_client_active_order_id') : null;
      const isTarget =
        remoteNotif.userId === 'ALL' ||
        remoteNotif.userId === currentUser?.id ||
        (remoteNotif.orderId && remoteNotif.orderId === myActiveId);

      if (isTarget) {
        setNotifications((prev) => {
          if (prev.some((n) => n.id === remoteNotif.id)) return prev;
          return [remoteNotif, ...prev];
        });
        playAlertChime('accepted');
        notificationService.sendNotification({
          title: remoteNotif.title,
          body: remoteNotif.body,
        });
      }
    });

    return () => {
      unsubOrder();
      unsubOrdersList();
      unsubIncidents();
      unsubNotif();
    };
  }, [currentUser?.id, isDriverOnline]);

  // Simulación dinámica de GPS del repartidor durante un servicio activo
  useEffect(() => {
    const runningOrder = orders.find(
      (o) =>
        (o.status === 'Repartidor asignado' || o.status === 'En camino') &&
        o.driverPosition &&
        o.destination
    );

    if (!runningOrder || !runningOrder.driverPosition) return;

    const interval = setInterval(() => {
      setOrders((prev) =>
        prev.map((ord) => {
          if (ord.id === runningOrder.id && ord.driverPosition) {
            const target =
              ord.status === 'Repartidor asignado' ? ord.origin : ord.destination;
            const dLat = target.lat - ord.driverPosition.lat;
            const dLng = target.lng - ord.driverPosition.lng;
            const stepRatio = 0.08;

            const nextPos = {
              lat: ord.driverPosition.lat + dLat * stepRatio,
              lng: ord.driverPosition.lng + dLng * stepRatio,
            };

            realtimeSync.broadcast({
              type: 'DRIVER_LOCATION_UPDATE',
              orderId: ord.id,
              location: nextPos,
            });

            return {
              ...ord,
              driverPosition: nextPos,
            };
          }
          return ord;
        })
      );
    }, 3500);

    return () => clearInterval(interval);
  }, [orders]);

  const addNotification = (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      read: false,
    };

    setNotifications((prev) => [newNotif, ...prev]);

    // Dispatch background / web push notification if permitted
    notificationService.sendNotification({
      title: newNotif.title,
      body: newNotif.body,
    });
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    playAlertChime('tap');
  };

  const clearReadNotifications = () => {
    setNotifications((prev) => prev.filter((n) => !n.read));
    playAlertChime('tap');
  };

  const requestPushPermission = async () => {
    const granted = await notificationService.requestPermission();
    setPushPermissionStatus(notificationService.getPermissionStatus());
    if (granted) {
      addNotification({
        userId: currentUser?.id || 'ALL',
        title: '🔔 Notificaciones Push Activadas',
        body: 'Ahora recibirás avisos de tus pedidos incluso con la pantalla apagada.',
        type: 'system',
      });
    }
    return granted;
  };

  const clearActiveOrderState = () => {
    setActiveOrderId(null);
    setIncomingOrderAlert(null);
  };

  // User Profile Update with 7-day limit (Unrestricted for moderator)
  const updateUserProfile = (
    userId: string,
    data: Partial<User>,
    isByModerator: boolean = false
  ): { success: boolean; message: string; nextAllowedDate?: string } => {
    const targetUser = allUsers.find((u) => u.id === userId) || (currentUser?.id === userId ? currentUser : null);
    if (!targetUser) {
      return { success: false, message: 'Usuario no encontrado.' };
    }

    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    // Apply 7-day rate-limiting if user is updating themselves
    if (!isByModerator && targetUser.lastProfileUpdate) {
      const elapsed = Date.now() - targetUser.lastProfileUpdate;
      if (elapsed < SEVEN_DAYS_MS) {
        const nextAllowed = targetUser.lastProfileUpdate + SEVEN_DAYS_MS;
        const diffMs = nextAllowed - Date.now();
        const daysLeft = Math.floor(diffMs / (24 * 60 * 60 * 1000));
        const hoursLeft = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const dateStr = new Date(nextAllowed).toLocaleDateString('es-VE', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        return {
          success: false,
          message: `Límite de seguridad: Solo puedes modificar tus datos 1 vez por semana. Podrás volver a editar el ${dateStr} (faltan ${daysLeft}d ${hoursLeft}h).`,
          nextAllowedDate: dateStr,
        };
      }
    }

    const updatedUser: User = {
      ...targetUser,
      ...data,
      lastProfileUpdate: isByModerator ? targetUser.lastProfileUpdate : Date.now(),
    };

    // Actualizar directamente en Firestore colección 'users'
    saveFirestoreUser(userId, updatedUser).catch((err) =>
      console.warn('Error guardando perfil en Firestore:', err)
    );

    setAllUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));
    if (currentUser?.id === userId) {
      setCurrentUser(updatedUser);
    }

    addNotification({
      userId,
      title: '👤 Perfil Actualizado',
      body: isByModerator
        ? 'Tus datos de cuenta fueron actualizados por la administración.'
        : 'Datos personales actualizados con éxito. Restricción de seguridad de 7 días aplicada.',
      type: 'profile',
    });

    playAlertChime('tap');

    return {
      success: true,
      message: isByModerator
        ? 'Datos del usuario modificados correctamente por el moderador.'
        : 'Perfil actualizado con éxito. Por seguridad, no podrás volver a editar tus datos hasta dentro de 7 días.',
    };
  };

  const isAdmin =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'Moderador' ||
    ['recataloapp@gmail.com', 'guitobolivar@gmail.com', 'julio.c.montero01@gmail.com'].includes(currentUser?.email?.toLowerCase() || '');

  const isModerator = isAdmin;

  // Moderator rate adjustment
  const updatePricingConfig = (newVals: Partial<PricingConfig>) => {
    if (!isModerator) {
      alert('Solo las cuentas de moderador autorizadas pueden cambiar las tarifas globales.');
      return;
    }
    setPricingConfig((prev) => ({
      ...prev,
      ...newVals,
      serviceRatesUSD: {
        ...prev.serviceRatesUSD,
        ...(newVals.serviceRatesUSD || {}),
      },
    }));
  };

  // Moderator user moderation (Suspend / Ban / Restore)
  const setUserStatus = (userId: string, newStatus: UserStatus, reason?: string) => {
    if (!isModerator) {
      alert('Solo las cuentas de moderador pueden cambiar el estado de moderación de usuarios.');
      return;
    }
    const updatePayload = {
      status: newStatus,
      suspendedReason: newStatus === 'Suspendido' ? reason || 'Penalización administrativa de moderación' : null,
    };
    saveFirestoreUser(userId, updatePayload).catch((e) =>
      console.warn('Error actualizando status en Firestore:', e)
    );

    setAllUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated: User = {
            ...u,
            status: newStatus,
            suspendedReason: newStatus === 'Suspendido' ? reason || 'Penalización administrativa de moderación' : undefined,
          };
          if (currentUser?.id === userId) {
            setCurrentUser(updated);
            if (newStatus === 'Suspendido') {
              setIsDriverOnline(false);
              setIncomingOrderAlert(null);
            }
          }
          return updated;
        }
        return u;
      })
    );
    playAlertChime('tap');
  };

  // Moderator delete account permanently
  const deleteUser = (userId: string) => {
    if (!isModerator) {
      alert('Solo las cuentas de moderador pueden eliminar cuentas.');
      return;
    }
    if (db) {
      deleteDoc(doc(db, 'users', userId)).catch((e) =>
        console.warn('Error eliminando usuario en Firestore:', e)
      );
    }
    setAllUsers((prev) => prev.filter((u) => u.id !== userId));
    if (currentUser?.id === userId) {
      setCurrentUser(null);
    }
    playAlertChime('tap');
  };

  // Auth: Login con Firebase Authentication y Firestore
  const login = async (email: string, password?: string): Promise<{ success: boolean; message?: string }> => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !password) {
      return { success: false, message: 'Por favor ingresa tu correo y contraseña.' };
    }
    if (!auth) {
      return { success: false, message: 'Firebase Authentication no está inicializado.' };
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, trimmed, password);
      const fbUser = userCredential.user;

      let userData: User | null = null;
      if (db) {
        try {
          const userSnap = await getDoc(doc(db, 'users', fbUser.uid));
          if (userSnap.exists()) {
            const raw = userSnap.data();
            userData = {
              id: userSnap.id,
              ...raw,
              role: normalizeRole(raw?.role),
              status: raw?.status || 'Activo',
            } as User;
          }
        } catch (fetchErr) {
          console.warn('Error leyendo usuario de Firestore:', fetchErr);
        }
      }

      if (!userData) {
        const isOwnerEmail = ['recataloapp@gmail.com', 'guitobolivar@gmail.com', 'julio.c.montero01@gmail.com'].includes(trimmed);
        userData = {
          id: fbUser.uid,
          name: fbUser.displayName || trimmed.split('@')[0],
          email: trimmed,
          phone: fbUser.phoneNumber || '+58 412 000 0000',
          role: isOwnerEmail ? 'admin' : 'client',
          status: 'Activo',
          rating: 5.0,
        };
      }

      if (userData.status === 'Suspendido') {
        await signOut(auth);
        return {
          success: false,
          message: `Esta cuenta se encuentra SUSPENDIDA / PENALIZADA por la administración.${
            userData.suspendedReason ? ' Motivo: ' + userData.suspendedReason : ' Contacte a soporte o moderación para más información.'
          }`,
        };
      }

      setCurrentUser(userData);
      playAlertChime('tap');
      return { success: true };
    } catch (error: any) {
      console.error('Error al iniciar sesión con Firebase:', error);
      let message = 'Error al iniciar sesión.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        message = 'Credenciales inválidas. Verifica tu correo y contraseña.';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Contraseña incorrecta. Inténtalo de nuevo.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'El formato del correo electrónico no es válido.';
      } else if (error.code === 'auth/user-disabled') {
        message = 'Esta cuenta ha sido inhabilitada por la administración.';
      } else if (error.message) {
        message = error.message;
      }
      return { success: false, message };
    }
  };

  // Auth: Register con Firebase Authentication y Firestore
  const register = async (data: Omit<User, 'id'>): Promise<{ success: boolean; message?: string }> => {
    const trimmedEmail = data.email.trim().toLowerCase();
    if (!trimmedEmail || !data.password) {
      return { success: false, message: 'Correo y contraseña son obligatorios.' };
    }
    if (!auth) {
      return { success: false, message: 'Firebase Authentication no está inicializado.' };
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, data.password);
      const fbUser = userCredential.user;

      const normalizedRole = normalizeRole(data.role);
      const isDriver = normalizedRole === 'driver' || isDriverRole(data.role);

      const sanitizedVehicle =
        isDriver && data.vehicle
          ? {
              type: data.vehicle.type || 'Moto',
              model: data.vehicle.model || '',
              plate: (data.vehicle.plate || '').toUpperCase(),
              color: data.vehicle.color || '',
            }
          : null;

      const newUserDoc = {
        id: fbUser.uid,
        uid: fbUser.uid,
        name: data.name.trim(),
        email: trimmedEmail,
        phone: data.phone || '',
        cedula: data.cedula ?? null,
        role: normalizedRole, // 'client', 'driver', 'admin'
        status: 'Activo',
        rating: 5.0,
        ratingsCount: 0,
        ratingSum: 0,
        avatar:
          data.avatar ||
          (isDriver
            ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'),
        vehicle: sanitizedVehicle,
        driverStats:
          isDriver
            ? {
                accumulatedKm: 0,
                weeklyCompletedTrips: 0,
                weeklyEarningsUSD: 0,
                monthlyEarningsUSD: 0,
                ratingsCount: 0,
                ratingSum: 0,
              }
            : null,
        createdAt: new Date().toISOString(),
        updatedAt: Date.now(),
      };

      const cleaned = sanitizeForFirestore(newUserDoc);
      if (db) {
        await setDoc(doc(db, 'users', fbUser.uid), cleaned);
      }

      const createdUser = { id: fbUser.uid, ...cleaned } as User;
      setCurrentUser(createdUser);
      playAlertChime('accepted');
      return { success: true };
    } catch (error: any) {
      console.error('Error al registrar usuario en Firebase:', error);
      let message = 'Error al registrar usuario.';
      if (error.code === 'auth/email-already-in-use') {
        message = `El correo "${data.email}" ya se encuentra registrado en Firebase.`;
      } else if (error.code === 'auth/weak-password') {
        message = 'La contraseña debe tener al menos 6 caracteres.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'El formato del correo electrónico no es válido.';
      } else if (error.message) {
        message = error.message;
      }
      return { success: false, message };
    }
  };

  const logout = async () => {
    if (auth) {
      try {
        await signOut(auth);
      } catch (e) {
        console.warn('Error cerrando sesión en Firebase:', e);
      }
    }
    setCurrentUser(null);
    playAlertChime('tap');
  };

  // Cambiar rol de usuario directamente en la base de datos de Firebase Firestore ('client', 'driver', 'admin')
  const changeUserRoleInFirestore = async (
    newRole: 'client' | 'driver' | 'admin',
    targetUserId?: string
  ): Promise<boolean> => {
    const uid = targetUserId || currentUser?.id;
    if (!uid) return false;
    const normalized = normalizeRole(newRole);

    if (db) {
      try {
        await saveFirestoreUser(uid, {
          role: normalized,
          updatedAt: Date.now(),
        });
      } catch (err) {
        console.warn('Error guardando rol en Firestore:', err);
      }
    }

    if (currentUser?.id === uid) {
      setCurrentUser((prev) => prev ? { ...prev, role: normalized } : null);
    }
    setAllUsers((prev) =>
      prev.map((u) => (u.id === uid ? { ...u, role: normalized } : u))
    );

    addNotification({
      userId: uid,
      title: '🛡️ Rol Actualizado en Firebase',
      body: `Tu rol en el sistema ahora es "${normalized}".`,
      type: 'profile',
    });

    playAlertChime('tap');
    return true;
  };

  // Switch role between available roles
  const switchUserRole = (newRole: UserRole) => {
    const normalized = normalizeRole(newRole);
    changeUserRoleInFirestore(normalized);
  };

  // Order Creation with Priority Dispatch Offset (Green: 0s, Yellow: 3s, Red: 6s)
  const createOrder = ({
    origin,
    destination,
    serviceTypeId,
    itemDescription,
  }: {
    origin: LocationPoint;
    destination: LocationPoint;
    serviceTypeId: string;
    itemDescription: string;
  }): Order => {
    if (currentUser?.status === 'Suspendido') {
      alert('Tu cuenta se encuentra suspendida por la administración. No puedes solicitar servicios.');
      throw new Error('Cuenta suspendida');
    }

    const distance = calculateDistanceKm(
      origin.lat,
      origin.lng,
      destination.lat,
      destination.lng
    );

    // Robust lookup for service rate by ID or name
    let serviceRatePerKm = pricingConfig.serviceRatesUSD[serviceTypeId as keyof typeof pricingConfig.serviceRatesUSD];
    if (serviceRatePerKm === undefined) {
      if (
        serviceTypeId.toLowerCase().includes('delivery') ||
        serviceTypeId.toLowerCase().includes('encargos') ||
        serviceTypeId.toLowerCase().includes('mandados') ||
        serviceTypeId.toLowerCase().includes('compras')
      ) {
        serviceRatePerKm = pricingConfig.serviceRatesUSD.rescate_delivery ?? 0.95;
      } else {
        serviceRatePerKm = pricingConfig.serviceRatesUSD.rescate_moto ?? 0.8;
      }
    }

    const rawTotal = pricingConfig.baseFeeUSD + distance * serviceRatePerKm;
    const totalUSD = Math.max(pricingConfig.minimumFareUSD, Math.round(rawTotal * 100) / 100);
    const driverNetUSD = Math.round(totalUSD * pricingConfig.driverCommissionRate * 100) / 100;

    const newOrder: Order = {
      id: `ORD-VEN-${Math.floor(1000 + Math.random() * 9000)}`,
      clientId: currentUser?.id || 'usr-guest',
      clientName: currentUser?.name || 'Cliente Rescátalo',
      clientPhone: currentUser?.phone || '+58 412 000 0000',
      origin,
      destination,
      distanceKm: distance,
      serviceType: serviceTypeId,
      itemDescription: itemDescription || 'Envío express',
      baseFeeUSD: pricingConfig.baseFeeUSD,
      costPerKmUSD: serviceRatePerKm,
      totalCostUSD: totalUSD,
      driverNetEarningsUSD: driverNetUSD,
      status: 'Buscando repartidor',
      createdAt: Date.now(),
      driverPosition: {
        lat: origin.lat + 0.007,
        lng: origin.lng - 0.007,
      },
    };

    // Guardar ID en sesión local del cliente para reconocimiento multi-dispositivo inmediato
    if (typeof window !== 'undefined') {
      localStorage.setItem('rescatalo_client_active_order_id', newOrder.id);
    }

    setOrders((prev) => [newOrder, ...prev]);
    setActiveOrderId(newOrder.id);
    playAlertChime('tap');

    // Guardar inmediatamente en Firestore colección 'rescatalo_orders'
    saveFirestoreOrder(newOrder).catch((err) => {
      console.warn('Error al guardar nueva orden en Firestore:', err);
    });

    // Transmitir inmediatamente en tiempo real a otros dispositivos/pestañas
    realtimeSync.broadcast({
      type: 'ORDER_UPSERT',
      order: newOrder,
    });

    const driverIncomingNotif: AppNotification = {
      id: `notif-new-trip-${Date.now()}`,
      userId: 'ALL',
      title: '🛵 ¡Nueva Solicitud de Servicio!',
      body: `Nuevo viaje en Valle de la Pascua: ${newOrder.itemDescription} ($${newOrder.totalCostUSD.toFixed(2)} USD).`,
      type: 'order_status',
      orderId: newOrder.id,
      timestamp: Date.now(),
      read: false,
    };
    realtimeSync.broadcast({
      type: 'NOTIFICATION_DISPATCH',
      notification: driverIncomingNotif,
    });

    // Priority Dispatch with Rating-Based Time Offset:
    // Green (>= 4.5): 0s delay
    // Yellow (3.5 - 4.4): 3s delay
    // Red (< 3.5): 6s delay
    // Suspended drivers are ignored completely.
    const activeDriver =
      currentUser?.role === 'Repartidor'
        ? currentUser
        : allUsers.find((u) => u.id === 'user-carlos-repartidor');

    const isHumanDriverAvailable =
      isDriverOnline && activeDriver?.status !== 'Suspendido';

    if (isHumanDriverAvailable && activeDriver) {
      const activeDriverRating = activeDriver.rating ?? 4.9;
      const perf = getDriverPerformance(activeDriverRating);
      const delayMs = perf.delaySeconds * 1000;

      setTimeout(() => {
        // Only deliver alert if order is still looking for a driver
        setOrders((currentOrders) => {
          const ord = currentOrders.find((o) => o.id === newOrder.id);
          if (ord && ord.status === 'Buscando repartidor') {
            setIncomingOrderAlert({
              order: newOrder,
              tier: perf.tier,
              tierLabel: perf.label,
              delaySeconds: perf.delaySeconds,
              dispatchedAt: Date.now(),
            });
            playAlertChime('incoming_order');
          }
          return currentOrders;
        });
      }, delayMs);
    }

    return newOrder;
  };

  // Driver accepts order
  const acceptIncomingOrder = (orderId: string) => {
    if (currentUser?.status === 'Suspendido') {
      alert('Tu cuenta se encuentra suspendida por la administración. No puedes aceptar servicios.');
      setIncomingOrderAlert(null);
      return;
    }
    setIncomingOrderAlert(null);

    const ord = orders.find((o) => o.id === orderId);
    const driverName = currentUser?.name || 'Carlos Mendoza';
    const driverPhone = currentUser?.phone || null;
    const driverAvatar = currentUser?.avatar || null;
    const driverRating = currentUser?.rating ?? 4.9;
    const driverVehicle = currentUser?.vehicle ? {
      type: currentUser.vehicle.type || 'Moto',
      model: currentUser.vehicle.model || 'Empire Keeway Horse 150',
      plate: currentUser.vehicle.plate || 'AC5-49X',
      color: currentUser.vehicle.color || 'Azul Eléctrico',
    } : null;

    const originLat = ord?.origin?.lat || DEFAULT_VENEZUELA_CENTER.lat;
    const originLng = ord?.origin?.lng || DEFAULT_VENEZUELA_CENTER.lng;

    const driverPosition = {
      lat: originLat + 0.004,
      lng: originLng - 0.004,
      name: 'Ubicación actual del repartidor',
      address: 'En camino a recogida',
    };

    // Actualizar directamente en Firestore colección rescatalo_orders
    // con campos opcionales limpios (sin undefined) y valores null asignados
    acceptFirestoreOrder(orderId, {
      driverId: currentUser?.id ?? 'repartidor',
      driverName,
      driverPhone: driverPhone ?? null,
      driverAvatar: driverAvatar ?? null,
      driverRating: driverRating ?? 5.0,
      driverVehicle: driverVehicle ?? null,
      driverPosition: driverPosition ?? null,
    }).catch((err) => {
      console.warn('Error al actualizar Firestore al aceptar orden:', err);
    });

    let updatedOrderData: Order | null = null;
    let clientNotificationObj: AppNotification | null = null;

    setOrders((prev) =>
      prev.map((item) => {
        if (item.id === orderId) {
          const updated: Order = {
            ...item,
            status: 'Repartidor asignado',
            driverId: currentUser?.id ?? 'repartidor',
            driverName,
            driverPhone: driverPhone ?? null,
            driverAvatar: driverAvatar ?? null,
            driverRating,
            driverVehicle: driverVehicle ? {
              model: driverVehicle.model,
              plate: driverVehicle.plate,
              color: driverVehicle.color,
            } : null,
            driverPosition,
            acceptedAt: Date.now(),
            completedAt: item.completedAt ?? null,
            cancelledAt: item.cancelledAt ?? null,
            cancelledBy: item.cancelledBy ?? null,
            cancelReason: item.cancelReason ?? null,
            ratingGiven: item.ratingGiven ?? null,
            cancellationRequest: item.cancellationRequest ?? null,
            reportIncident: item.reportIncident ?? null,
          };

          updatedOrderData = updated;

          clientNotificationObj = {
            id: `notif-accepted-${Date.now()}`,
            userId: item.clientId,
            title: '🛵 ¡Servicio Aceptado por Repartidor!',
            body: `${driverName} aceptó tu servicio #${item.id}. Tu repartidor va en camino al punto de recogida.`,
            type: 'order_status',
            orderId: item.id,
            timestamp: Date.now(),
            read: false,
          };

          return updated;
        }
        return item;
      })
    );

    setActiveOrderId(orderId);
    playAlertChime('accepted');

    // Notificación inmediata al cliente y sincronización en tiempo real
    if (updatedOrderData) {
      realtimeSync.broadcast({
        type: 'ORDER_ACCEPTED',
        order: updatedOrderData,
        driverName: (updatedOrderData as Order).driverName || 'Repartidor',
      });
      realtimeSync.broadcast({
        type: 'DRIVER_LOCATION_UPDATE',
        orderId,
        location: (updatedOrderData as Order).driverPosition!,
      });
    }

    if (clientNotificationObj) {
      addNotification(clientNotificationObj);
      realtimeSync.broadcast({
        type: 'NOTIFICATION_DISPATCH',
        notification: clientNotificationObj,
      });
    }
  };

  const rejectIncomingOrder = (_orderId: string) => {
    setIncomingOrderAlert(null);
    playAlertChime('tap');
  };

  // Step-by-step state machine for driver with real-time synchronization
  const advanceOrderStatus = (orderId: string, nextStatus: OrderStatus) => {
    let updatedOrderObj: Order | null = null;
    let transitionNotif: AppNotification | null = null;

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          const isCompleted = nextStatus === 'Entregado';
          if (isCompleted) {
            clearActiveOrderState();
            setDriverDailyEarningsUSD((e) => Math.round((e + ord.driverNetEarningsUSD) * 100) / 100);
            setDriverCompletedTrips((t) => t + 1);

            // Accumulate driver statistics (km, weekly trips, weekly & monthly earnings)
            setDriverStats((prevStats) => {
              const updated = {
                ...prevStats,
                accumulatedKm: Math.round((prevStats.accumulatedKm + ord.distanceKm) * 10) / 10,
                weeklyCompletedTrips: prevStats.weeklyCompletedTrips + 1,
                weeklyEarningsUSD: Math.round((prevStats.weeklyEarningsUSD + ord.driverNetEarningsUSD) * 100) / 100,
                monthlyEarningsUSD: Math.round((prevStats.monthlyEarningsUSD + ord.driverNetEarningsUSD) * 100) / 100,
              };
              return updated;
            });

            // Also update driver in allUsers if known
            if (ord.driverId) {
              setAllUsers((users) =>
                users.map((u) => {
                  if (u.id === ord.driverId) {
                    const currentUStats = u.driverStats || ZERO_DRIVER_STATS;
                    return {
                      ...u,
                      driverStats: {
                        ...currentUStats,
                        accumulatedKm: Math.round((currentUStats.accumulatedKm + ord.distanceKm) * 10) / 10,
                        weeklyCompletedTrips: currentUStats.weeklyCompletedTrips + 1,
                        weeklyEarningsUSD: Math.round((currentUStats.weeklyEarningsUSD + ord.driverNetEarningsUSD) * 100) / 100,
                        monthlyEarningsUSD: Math.round((currentUStats.monthlyEarningsUSD + ord.driverNetEarningsUSD) * 100) / 100,
                      },
                    };
                  }
                  return u;
                })
              );
            }

            transitionNotif = {
              id: `notif-delivered-${Date.now()}`,
              userId: ord.clientId,
              title: '🎉 ¡Servicio Entregado!',
              body: `Tu orden #${ord.id} ha sido completada con éxito en Valle de la Pascua.`,
              type: 'order_status',
              orderId: ord.id,
              timestamp: Date.now(),
              read: false,
            };

            playAlertChime('delivered');
          } else {
            playAlertChime('tap');

            if (nextStatus === 'Llegué al comercio') {
              transitionNotif = {
                id: `notif-shop-${Date.now()}`,
                userId: ord.clientId,
                title: '📍 ¡Repartidor en el Punto de Recogida!',
                body: `${ord.driverName || 'Tu repartidor'} ha llegado al lugar de recogida y espera tu paquete.`,
                type: 'order_status',
                orderId: ord.id,
                timestamp: Date.now(),
                read: false,
              };
            } else if (nextStatus === 'Pedido recogido') {
              transitionNotif = {
                id: `notif-picked-${Date.now()}`,
                userId: ord.clientId,
                title: '📦 ¡Pedido Recogido por el Repartidor!',
                body: 'El repartidor confirmó la recogida de tu paquete e inició el traslado.',
                type: 'order_status',
                orderId: ord.id,
                timestamp: Date.now(),
                read: false,
              };
            } else if (nextStatus === 'En camino') {
              transitionNotif = {
                id: `notif-way-${Date.now()}`,
                userId: ord.clientId,
                title: '🛵 ¡Repartidor en Camino!',
                body: 'El repartidor ya va en ruta directa hacia la dirección de entrega.',
                type: 'order_status',
                orderId: ord.id,
                timestamp: Date.now(),
                read: false,
              };
            }
          }

          const newPosition =
            nextStatus === 'Llegué al comercio'
              ? { lat: ord.origin.lat, lng: ord.origin.lng, name: 'Repartidor en comercio', address: ord.origin.address || 'Punto de recogida' }
              : nextStatus === 'Pedido recogido'
              ? { lat: ord.origin.lat + 0.001, lng: ord.origin.lng + 0.001, name: 'Repartidor recogió pedido', address: 'En traslado' }
              : nextStatus === 'En camino'
              ? {
                  lat: (ord.origin.lat + ord.destination.lat) / 2,
                  lng: (ord.origin.lng + ord.destination.lng) / 2,
                  name: 'Repartidor en ruta',
                  address: 'En ruta a entrega',
                }
              : { lat: ord.destination.lat, lng: ord.destination.lng, name: 'Repartidor en destino', address: ord.destination.address || 'Punto de entrega' };

          const updated: Order = {
            ...ord,
            status: nextStatus,
            completedAt: isCompleted ? Date.now() : (ord.completedAt ?? null as any),
            driverPosition: newPosition,
          };

          updatedOrderObj = updated;
          return updated;
        }
        return ord;
      })
    );

    // Sincronizar en tiempo real y emitir notificación push
    if (updatedOrderObj) {
      saveFirestoreOrder(updatedOrderObj).catch((e) =>
        console.warn('Error guardando avance de estado en Firestore:', e)
      );
      realtimeSync.broadcast({
        type: 'ORDER_UPSERT',
        order: updatedOrderObj,
      });
      if ((updatedOrderObj as Order).driverPosition) {
        realtimeSync.broadcast({
          type: 'DRIVER_LOCATION_UPDATE',
          orderId,
          location: (updatedOrderObj as Order).driverPosition!,
        });
      }
    }

    if (transitionNotif) {
      addNotification(transitionNotif);
      realtimeSync.broadcast({
        type: 'NOTIFICATION_DISPATCH',
        notification: transitionNotif,
      });
    }
  };

  const cancelOrder = (
    orderId: string,
    cancelledByRole: 'Cliente' | 'Repartidor' | 'Moderador' = 'Cliente',
    reason?: string
  ) => {
    const target = orders.find((o) => o.id === orderId);
    const now = Date.now();
    let cancelledOrderObj: Order | null = null;

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          const updated: Order = {
            ...ord,
            status: 'Cancelado',
            cancelledAt: now,
            cancelledBy: cancelledByRole,
            cancelReason: reason || 'Servicio cancelado por el usuario',
          };
          cancelledOrderObj = updated;
          return updated;
        }
        return ord;
      })
    );

    if (activeOrderId === orderId) {
      setActiveOrderId(null);
    }
    setIncomingOrderAlert(null);

    // Sincronizar en tiempo real
    if (cancelledOrderObj) {
      saveFirestoreOrder(cancelledOrderObj).catch((e) =>
        console.warn('Error cancelando orden en Firestore:', e)
      );
      realtimeSync.broadcast({
        type: 'ORDER_UPSERT',
        order: cancelledOrderObj,
      });
    }

    // Notify counterpart immediately
    if (target) {
      if (cancelledByRole === 'Cliente') {
        if (target.driverId) {
          addNotification({
            userId: target.driverId,
            title: '❌ Servicio Cancelado por el Cliente',
            body: `El cliente ${target.clientName} canceló la orden #${target.id}.${reason ? ` Motivo: ${reason}` : ''}`,
            type: 'order_cancelled',
            orderId: target.id,
          });
        }
        addNotification({
          userId: target.clientId,
          title: 'Servicio Cancelado',
          body: `Has cancelado el servicio #${target.id}. El monitoreo en vivo ha sido cerrado.`,
          type: 'order_cancelled',
          orderId: target.id,
        });
      } else if (cancelledByRole === 'Repartidor') {
        addNotification({
          userId: target.clientId,
          title: '❌ Servicio Cancelado por el Repartidor',
          body: `El repartidor ${target.driverName || 'asignado'} no pudo continuar con el servicio #${target.id}.${reason ? ` Motivo: ${reason}` : ''}`,
          type: 'order_cancelled',
          orderId: target.id,
        });
        if (target.driverId) {
          addNotification({
            userId: target.driverId,
            title: 'Servicio Cancelado',
            body: `Cancelaste la orden #${target.id}. Has vuelto al radar de disponibilidad.`,
            type: 'order_cancelled',
            orderId: target.id,
          });
        }
      } else {
        addNotification({
          userId: target.clientId,
          title: 'Servicio Cancelado por Moderación',
          body: `El servicio #${target.id} fue cancelado por el administrador.`,
          type: 'order_cancelled',
          orderId: target.id,
        });
      }
    }

    playAlertChime('tap');
  };

  // Submit client rating & update driver performance rating average
  const submitRating = (
    orderId: string,
    stars: number,
    tags: string[],
    comment?: string
  ) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    let updatedOrderWithRating: Order | null = null;

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          const updated = {
            ...ord,
            ratingGiven: { stars, tags, comment: comment || undefined },
          };
          updatedOrderWithRating = updated;
          return updated;
        }
        return ord;
      })
    );

    if (updatedOrderWithRating) {
      saveFirestoreOrder(updatedOrderWithRating).catch((e) =>
        console.warn('Error guardando rating en Firestore:', e)
      );
      realtimeSync.broadcast({
        type: 'ORDER_UPSERT',
        order: updatedOrderWithRating,
      });
    }

    // Update driver's rating average and count
    const driverId = targetOrder?.driverId || 'repartidor';
    setAllUsers((prevUsers) =>
      prevUsers.map((u) => {
        if (u.id === driverId) {
          const oldCount = u.ratingsCount || u.driverStats?.ratingsCount || 10;
          const oldSum = u.ratingSum || u.driverStats?.ratingSum || (u.rating ? u.rating * oldCount : 49);
          const newCount = oldCount + 1;
          const newSum = oldSum + stars;
          const newRating = Math.round((newSum / newCount) * 10) / 10;

          const updatedUser: User = {
            ...u,
            rating: newRating,
            ratingsCount: newCount,
            ratingSum: newSum,
            driverStats: {
              ...(u.driverStats || ZERO_DRIVER_STATS),
              ratingsCount: newCount,
              ratingSum: newSum,
            },
          };

          saveFirestoreUser(driverId, updatedUser).catch((e) =>
            console.warn('Error actualizando rating de repartidor en Firestore:', e)
          );

          if (currentUser?.id === driverId) {
            setCurrentUser(updatedUser);
          }
          return updatedUser;
        }
        return u;
      })
    );

    playAlertChime('delivered');
  };

  // Real-time Chat
  const sendChatMessage = (orderId: string, text: string) => {
    if (!text.trim() || !currentUser) return;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      orderId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      text: text.trim(),
      timestamp: Date.now(),
    };

    setChatMessages((prev) => [...prev, newMsg]);
    playAlertChime('tap');
  };

  // Driver requests cancellation after pickup
  const requestDriverCancellation = (orderId: string, reason: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const cancellationReq: DriverCancellationRequest = {
      requestedBy: 'Repartidor',
      reason: reason.trim() || 'Avería o imprevisto mecánico en ruta',
      timestamp: Date.now(),
      status: 'pending',
    };

    let updatedOrderTarget: Order | null = null;
    const clientAlertNotif: AppNotification = {
      id: `notif-cancel-req-${Date.now()}`,
      userId: targetOrder.clientId,
      title: '⚠️ Solicitud de Cancelación de tu Repartidor',
      body: `Tu repartidor solicita cancelar el pedido tras la recogida por: "${cancellationReq.reason}". Como ya fue recogido, debes autorizar o rechazar esta solicitud.`,
      type: 'order_status',
      orderId: targetOrder.id,
      timestamp: Date.now(),
      read: false,
    };

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          const updated = {
            ...ord,
            cancellationRequest: cancellationReq,
          };
          updatedOrderTarget = updated;
          return updated;
        }
        return ord;
      })
    );

    // Notify client with high priority
    addNotification(clientAlertNotif);
    playAlertChime('tap');

    if (updatedOrderTarget) {
      realtimeSync.broadcast({
        type: 'ORDER_UPSERT',
        order: updatedOrderTarget,
      });
    }
    realtimeSync.broadcast({
      type: 'NOTIFICATION_DISPATCH',
      notification: clientAlertNotif,
    });
  };

  // Client responds to driver's cancellation request
  const respondToCancellationRequest = (orderId: string, accepted: boolean) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder || !targetOrder.cancellationRequest) return;

    if (accepted) {
      cancelOrder(
        orderId,
        'Repartidor',
        `Cancelación autorizada por el cliente tras recogida. Motivo: ${targetOrder.cancellationRequest.reason}`
      );
      playAlertChime('tap');
    } else {
      let rejectedOrderObj: Order | null = null;
      let driverRejectionNotif: AppNotification | null = null;

      setOrders((prev) =>
        prev.map((ord) => {
          if (ord.id === orderId) {
            const updated = {
              ...ord,
              cancellationRequest: {
                ...ord.cancellationRequest!,
                status: 'rejected' as const,
              },
            };
            rejectedOrderObj = updated;
            return updated;
          }
          return ord;
        })
      );

      if (targetOrder.driverId) {
        driverRejectionNotif = {
          id: `notif-cancel-rej-${Date.now()}`,
          userId: targetOrder.driverId,
          title: '⛔ Cancelación No Autorizada por el Cliente',
          body: `El cliente no autorizó la cancelación del pedido #${targetOrder.id}. Por favor continúa con la entrega del paquete/servicio.`,
          type: 'order_status',
          orderId: targetOrder.id,
          timestamp: Date.now(),
          read: false,
        };
        addNotification(driverRejectionNotif);
        realtimeSync.broadcast({
          type: 'NOTIFICATION_DISPATCH',
          notification: driverRejectionNotif,
        });
      }

      if (rejectedOrderObj) {
        realtimeSync.broadcast({
          type: 'ORDER_UPSERT',
          order: rejectedOrderObj,
        });
      }
      playAlertChime('tap');
    }
  };

  // Client reports driver for false pickup or non-delivery
  const reportDriverIncident = (
    orderId: string,
    reason: string,
    details: string
  ): ModeratorIncidentReport => {
    const targetOrder = orders.find((o) => o.id === orderId);
    const incident: ModeratorIncidentReport = {
      id: `INC-${Date.now().toString().slice(-5)}`,
      orderId,
      clientId: targetOrder?.clientId || currentUser?.id || 'cliente',
      clientName: targetOrder?.clientName || currentUser?.name || 'Cliente',
      clientPhone: targetOrder?.clientPhone || currentUser?.phone || 'Sin teléfono',
      driverId: targetOrder?.driverId || 'user-carlos-repartidor',
      driverName: targetOrder?.driverName || 'Repartidor',
      driverPhone: targetOrder?.driverPhone,
      serviceType: targetOrder?.serviceType || 'Servicio',
      reason: reason.trim(),
      details: details.trim(),
      timestamp: Date.now(),
      status: 'Abierto',
      orderTotalUSD: targetOrder?.totalCostUSD || 0,
    };

    setIncidentReports((prev) => [incident, ...prev]);

    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? {
              ...ord,
              reportIncident: incident,
            }
          : ord
      )
    );

    const modAlertNotif: AppNotification = {
      id: `notif-inc-${Date.now()}`,
      userId: 'ALL',
      title: '🚨 ALERTA PRIORITARIA: Reporte de Repartidor',
      body: `El cliente ${incident.clientName} ha reportado irregularidad en la orden #${orderId}: "${reason}". Requiere revisión y sanción inmediata en el panel moderador.`,
      type: 'system',
      orderId,
      timestamp: Date.now(),
      read: false,
    };

    // Notify Moderator with high priority
    addNotification(modAlertNotif);
    playAlertChime('incoming_order');

    // Broadcast incident report and alert to moderator in real time
    realtimeSync.broadcast({
      type: 'INCIDENT_NEW',
      incident,
    });
    realtimeSync.broadcast({
      type: 'NOTIFICATION_DISPATCH',
      notification: modAlertNotif,
    });

    return incident;
  };

  const updateIncidentStatus = (
    incidentId: string,
    newStatus: 'Abierto' | 'Investigando' | 'Sancionado' | 'Resuelto'
  ) => {
    setIncidentReports((prev) =>
      prev.map((inc) => {
        if (inc.id === incidentId) {
          if (newStatus === 'Sancionado' && inc.driverId) {
            setUserStatus(
              inc.driverId,
              'Suspendido',
              `Sanción por reporte de cliente #${inc.id}: ${inc.reason}`
            );
          }
          return { ...inc, status: newStatus };
        }
        return inc;
      })
    );
    playAlertChime('tap');
  };

  const activeOrder = orders.find((o) => o.id === activeOrderId) || null;
  const unreadNotificationsCount = notifications.filter(
    (n) => !n.read && (n.userId === 'ALL' || n.userId === currentUser?.id)
  ).length;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        allUsers,
        isModerator,
        isAdmin,
        pricingConfig,
        updatePricingConfig,
        announcement,
        updateAnnouncement,
        setUserStatus,
        deleteUser,
        login,
        register,
        logout,
        switchUserRole,
        changeUserRoleInFirestore,
        updateUserProfile,
        notifications,
        unreadNotificationsCount,
        addNotification,
        markNotificationAsRead,
        clearAllNotifications,
        clearReadNotifications,
        pushPermissionStatus,
        requestPushPermission,
        isDriverOnline,
        setIsDriverOnline,
        driverDailyEarningsUSD,
        driverCompletedTrips,
        driverStats,
        incomingOrderAlert,
        acceptIncomingOrder,
        rejectIncomingOrder,
        orders,
        activeOrder,
        setActiveOrderId,
        clearActiveOrderState,
        createOrder,
        advanceOrderStatus,
        cancelOrder,
        submitRating,
        chatMessages,
        sendChatMessage,
        requestDriverCancellation,
        respondToCancellationRequest,
        incidentReports,
        reportDriverIncident,
        updateIncidentStatus,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
