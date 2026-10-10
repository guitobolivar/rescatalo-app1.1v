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
import { isFirebaseConfigured, registerWithFirebase } from '../firebaseConfig';

interface AppContextType {
  currentUser: User | null;
  allUsers: User[];
  isModerator: boolean;
  pricingConfig: PricingConfig;
  updatePricingConfig: (config: Partial<PricingConfig>) => void;
  announcement: AnnouncementBanner;
  updateAnnouncement: (data: Partial<AnnouncementBanner>) => void;
  setUserStatus: (userId: string, status: UserStatus, reason?: string) => void;
  deleteUser: (userId: string) => void;
  // Auth
  login: (email: string, password?: string) => { success: boolean; message?: string };
  register: (user: Omit<User, 'id'>) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  switchUserRole: (newRole: UserRole) => void;
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

const SEED_USERS: User[] = [
  {
    id: 'user-julio-mod',
    name: 'Julio Montero (Moderador)',
    email: 'julio.c.montero01@gmail.com',
    cedula: 'V-15.342.980',
    password: 'Hola123321*',
    phone: '+58 412 998 7766',
    role: 'Usuario Normal',
    status: 'Activo',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    rating: 5.0,
  },
  {
    id: 'user-guito-mod',
    name: 'Guito Bolívar (Moderador)',
    email: 'guitobolivar@gmail.com',
    cedula: 'V-14.892.110',
    password: '123',
    phone: '+58 412 555 0199',
    role: 'Usuario Normal',
    status: 'Activo',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    rating: 5.0,
  },
  {
    id: 'user-maria-cliente',
    name: 'María Rodríguez',
    email: 'maria.cliente@rescatalo.com',
    cedula: 'V-20.145.987',
    password: '123',
    phone: '+58 412 876 5432',
    role: 'Usuario Normal',
    status: 'Activo',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    rating: 5.0,
  },
  {
    id: 'user-carlos-repartidor',
    name: 'Carlos Mendoza',
    email: 'carlos.repartidor@rescatalo.com',
    cedula: 'V-18.765.432',
    password: '123',
    phone: '+58 414 123 9876',
    role: 'Repartidor',
    status: 'Activo',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    rating: 4.9,
    ratingsCount: 24,
    ratingSum: 118,
    driverStats: {
      accumulatedKm: 89.4,
      weeklyCompletedTrips: 18,
      weeklyEarningsUSD: 68.20,
      monthlyEarningsUSD: 245.50,
      ratingsCount: 24,
      ratingSum: 118,
    },
    vehicle: {
      type: 'Moto',
      model: 'Empire Keeway Horse 150',
      plate: 'AC5-49X',
      color: 'Azul Eléctrico',
    },
  },
  {
    id: 'user-jose-repartidor',
    name: 'José Hernández',
    email: 'jose.repartidor@rescatalo.com',
    cedula: 'V-22.456.789',
    password: '123',
    phone: '+58 412 345 6789',
    role: 'Repartidor',
    status: 'Activo',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    rating: 4.8,
    ratingsCount: 15,
    ratingSum: 72,
    driverStats: {
      accumulatedKm: 58.2,
      weeklyCompletedTrips: 11,
      weeklyEarningsUSD: 44.80,
      monthlyEarningsUSD: 186.00,
      ratingsCount: 15,
      ratingSum: 72,
    },
    vehicle: {
      type: 'Moto',
      model: 'Bera Socialista 150',
      plate: 'AD8-22K',
      color: 'Rojo Carmesí',
    },
  },
];

const NOW = Date.now();
const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

const INITIAL_ORDERS: Order[] = [
  // Today (Diario)
  {
    id: 'ORD-VEN-8421',
    clientId: 'user-maria-cliente',
    clientName: 'María Rodríguez',
    clientPhone: '+58 412 876 5432',
    driverId: 'user-carlos-repartidor',
    driverName: 'Carlos Mendoza',
    driverPhone: '+58 414 123 9876',
    driverVehicle: {
      model: 'Empire Keeway Horse 150',
      plate: 'AC5-49X',
      color: 'Azul Eléctrico',
    },
    driverAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    driverRating: 4.9,
    origin: POPULAR_LOCATIONS[0],
    destination: POPULAR_LOCATIONS[5],
    distanceKm: 2.8,
    serviceType: 'rescate_moto',
    itemDescription: 'Traslado al Casco Central',
    baseFeeUSD: 2.0,
    costPerKmUSD: 0.8,
    totalCostUSD: 4.24,
    driverNetEarningsUSD: 3.60,
    status: 'Entregado',
    createdAt: NOW - 3 * ONE_HOUR,
    acceptedAt: NOW - 3 * ONE_HOUR + 60000,
    completedAt: NOW - 2 * ONE_HOUR,
  },
  {
    id: 'ORD-VEN-7712',
    clientId: 'user-maria-cliente',
    clientName: 'María Rodríguez',
    clientPhone: '+58 412 876 5432',
    driverId: 'user-carlos-repartidor',
    driverName: 'Carlos Mendoza',
    driverPhone: '+58 414 123 9876',
    driverVehicle: {
      model: 'Empire Keeway Horse 150',
      plate: 'AC5-49X',
      color: 'Azul Eléctrico',
    },
    driverAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    driverRating: 4.9,
    origin: POPULAR_LOCATIONS[1],
    destination: POPULAR_LOCATIONS[4],
    distanceKm: 3.5,
    serviceType: 'rescate_delivery',
    itemDescription: 'Entrega de medicinas de farmacia',
    baseFeeUSD: 2.0,
    costPerKmUSD: 0.95,
    totalCostUSD: 5.33,
    driverNetEarningsUSD: 4.53,
    status: 'Entregado',
    createdAt: NOW - 5 * ONE_HOUR,
    acceptedAt: NOW - 5 * ONE_HOUR + 120000,
    completedAt: NOW - 4 * ONE_HOUR,
  },
  {
    id: 'ORD-VEN-6105',
    clientId: 'user-maria-cliente',
    clientName: 'María Rodríguez',
    clientPhone: '+58 412 876 5432',
    driverId: 'user-jose-repartidor',
    driverName: 'José Hernández',
    driverPhone: '+58 412 345 6789',
    driverVehicle: {
      model: 'Bera Socialista 150',
      plate: 'AD8-22K',
      color: 'Rojo Carmesí',
    },
    driverAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    driverRating: 4.8,
    origin: POPULAR_LOCATIONS[2],
    destination: POPULAR_LOCATIONS[3],
    distanceKm: 2.4,
    serviceType: 'rescate_moto',
    itemDescription: 'Carrera corta Plaza - Hospital',
    baseFeeUSD: 2.0,
    costPerKmUSD: 0.8,
    totalCostUSD: 3.92,
    driverNetEarningsUSD: 3.33,
    status: 'Entregado',
    createdAt: NOW - 6 * ONE_HOUR,
    acceptedAt: NOW - 6 * ONE_HOUR + 80000,
    completedAt: NOW - 5 * ONE_HOUR,
  },
  // Earlier this week (Semanal: 2-4 days ago)
  {
    id: 'ORD-VEN-5231',
    clientId: 'user-maria-cliente',
    clientName: 'María Rodríguez',
    clientPhone: '+58 412 876 5432',
    driverId: 'user-carlos-repartidor',
    driverName: 'Carlos Mendoza',
    driverPhone: '+58 414 123 9876',
    driverVehicle: {
      model: 'Empire Keeway Horse 150',
      plate: 'AC5-49X',
      color: 'Azul Eléctrico',
    },
    driverAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    driverRating: 4.9,
    origin: POPULAR_LOCATIONS[0],
    destination: POPULAR_LOCATIONS[2],
    distanceKm: 4.0,
    serviceType: 'rescate_delivery',
    itemDescription: 'Almuerzos y bebidas',
    baseFeeUSD: 2.0,
    costPerKmUSD: 0.95,
    totalCostUSD: 5.80,
    driverNetEarningsUSD: 4.93,
    status: 'Entregado',
    createdAt: NOW - 2 * ONE_DAY,
    acceptedAt: NOW - 2 * ONE_DAY + 60000,
    completedAt: NOW - 2 * ONE_DAY + 1800000,
  },
  {
    id: 'ORD-VEN-4190',
    clientId: 'user-maria-cliente',
    clientName: 'María Rodríguez',
    clientPhone: '+58 412 876 5432',
    driverId: 'user-jose-repartidor',
    driverName: 'José Hernández',
    driverPhone: '+58 412 345 6789',
    driverVehicle: {
      model: 'Bera Socialista 150',
      plate: 'AD8-22K',
      color: 'Rojo Carmesí',
    },
    driverAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    driverRating: 4.8,
    origin: POPULAR_LOCATIONS[4],
    destination: POPULAR_LOCATIONS[5],
    distanceKm: 4.8,
    serviceType: 'rescate_moto',
    itemDescription: 'Traslado terminal a las Garcitas',
    baseFeeUSD: 2.0,
    costPerKmUSD: 0.8,
    totalCostUSD: 5.84,
    driverNetEarningsUSD: 4.96,
    status: 'Entregado',
    createdAt: NOW - 4 * ONE_DAY,
    acceptedAt: NOW - 4 * ONE_DAY + 90000,
    completedAt: NOW - 4 * ONE_DAY + 1900000,
  },
  // Earlier this month (Mensual: 12 days ago)
  {
    id: 'ORD-VEN-3012',
    clientId: 'user-maria-cliente',
    clientName: 'María Rodríguez',
    clientPhone: '+58 412 876 5432',
    driverId: 'user-carlos-repartidor',
    driverName: 'Carlos Mendoza',
    driverPhone: '+58 414 123 9876',
    driverVehicle: {
      model: 'Empire Keeway Horse 150',
      plate: 'AC5-49X',
      color: 'Azul Eléctrico',
    },
    driverAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    driverRating: 4.9,
    origin: POPULAR_LOCATIONS[0],
    destination: POPULAR_LOCATIONS[4],
    distanceKm: 3.2,
    serviceType: 'rescate_delivery',
    itemDescription: 'Repuestos de moto',
    baseFeeUSD: 2.0,
    costPerKmUSD: 0.95,
    totalCostUSD: 5.04,
    driverNetEarningsUSD: 4.28,
    status: 'Entregado',
    createdAt: NOW - 12 * ONE_DAY,
    acceptedAt: NOW - 12 * ONE_DAY + 60000,
    completedAt: NOW - 12 * ONE_DAY + 1500000,
  },
];

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-seed-1',
    userId: 'ALL',
    title: '¡Bienvenido a Rescátalo Venezuela!',
    body: 'Servicio de traslados en moto y delivery en Valle de la Pascua con tarifas transparentes en USD.',
    type: 'system',
    timestamp: NOW - 3600000,
    read: false,
  },
  {
    id: 'notif-seed-2',
    userId: 'user-maria-cliente',
    title: '✅ Entrega Finalizada con Éxito',
    body: 'Tu servicio #ORD-VEN-8421 fue completado por Carlos Mendoza. Gracias por usar Rescátalo.',
    type: 'order_status',
    timestamp: NOW - 7200000,
    read: true,
    orderId: 'ORD-VEN-8421',
  },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. Users state - Sync with seeds to ensure default moderators exist
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('rescatalo_users');
    let users: User[] = saved ? JSON.parse(saved) : SEED_USERS;
    for (const seed of SEED_USERS) {
      const idx = users.findIndex(
        (u) => u.email.toLowerCase() === seed.email.toLowerCase()
      );
      if (idx === -1) {
        users.push(seed);
      } else {
        users[idx] = { ...users[idx], ...seed };
      }
    }
    return users;
  });

  // Current logged in user (starts null unless valid session exists)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('rescatalo_active_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

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

  // 4. Orders state
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('rescatalo_orders_clean');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  // 5. Chat messages
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('rescatalo_chat_messages');
    return saved ? JSON.parse(saved) : [];
  });

  // 6. In-App & Push Notifications
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('rescatalo_notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

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

  // Sync with localStorage
  useEffect(() => {
    localStorage.setItem('rescatalo_users', JSON.stringify(allUsers));
  }, [allUsers]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('rescatalo_active_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('rescatalo_active_user');
    }
  }, [currentUser]);

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
    localStorage.setItem('rescatalo_orders_clean', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('rescatalo_chat_messages', JSON.stringify(chatMessages));
  }, [chatMessages]);

  useEffect(() => {
    localStorage.setItem('rescatalo_notifications', JSON.stringify(notifications));
  }, [notifications]);

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
    const targetUser = allUsers.find((u) => u.id === userId);
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

  const isModerator =
    currentUser?.email.toLowerCase() === 'julio.c.montero01@gmail.com' ||
    currentUser?.email.toLowerCase() === 'guitobolivar@gmail.com';

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
    setAllUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated: User = {
            ...u,
            status: newStatus,
            suspendedReason: newStatus === 'Suspendido' ? reason || 'Penalización administrativa de moderación' : undefined,
          };
          // If this user is currently active in session, update session as well
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
    setAllUsers((prev) => prev.filter((u) => u.id !== userId));
    if (currentUser?.id === userId) {
      setCurrentUser(null);
    }
    playAlertChime('tap');
  };

  // Auth: Login
  const login = (email: string, password?: string) => {
    const trimmed = email.trim().toLowerCase();
    const user = allUsers.find((u) => u.email.toLowerCase() === trimmed);
    if (!user) {
      return {
        success: false,
        message: 'No se encontró un usuario con este correo. Por favor regístrate primero.',
      };
    }
    if (user.password && password && user.password !== password) {
      return { success: false, message: 'Contraseña incorrecta. Inténtalo de nuevo.' };
    }
    if (user.status === 'Suspendido') {
      return {
        success: false,
        message: `Esta cuenta se encuentra SUSPENDIDA / PENALIZADA por la administración.${
          user.suspendedReason ? ' Motivo: ' + user.suspendedReason : ' Contacte a soporte o moderación para más información.'
        }`,
      };
    }
    setCurrentUser(user);
    playAlertChime('tap');
    return { success: true };
  };

  // Auth: Register with Anti-Multi-Account Validation per Role and Firebase Integration
  const register = async (data: Omit<User, 'id'>): Promise<{ success: boolean; message?: string }> => {
    const trimmedEmail = data.email.trim().toLowerCase();
    const cleanCedula = (data.cedula || '').replace(/[\.\s]/g, '').toLowerCase();
    const targetRole = data.role;

    // 1. Validar Correo Electrónico único por rol
    const emailExists = allUsers.some(
      (u) => u.role === targetRole && u.email.trim().toLowerCase() === trimmedEmail
    );
    if (emailExists) {
      return {
        success: false,
        message: `El correo "${data.email}" ya se encuentra registrado para el rol de ${targetRole}. Solo se permite una cuenta por rol.`,
      };
    }

    // 2. Validar Cédula de Identidad única por rol
    if (cleanCedula) {
      const cedulaExists = allUsers.some(
        (u) =>
          u.role === targetRole &&
          (u.cedula || '').replace(/[\.\s]/g, '').toLowerCase() === cleanCedula
      );
      if (cedulaExists) {
        return {
          success: false,
          message: `La Cédula de Identidad "${data.cedula}" ya está registrada para el rol de ${targetRole}.`,
        };
      }
    }

    // 3. Validar Placa del Vehículo única si es Repartidor
    if (targetRole === 'Repartidor' && data.vehicle?.plate) {
      const cleanPlate = data.vehicle.plate.replace(/[\-\s]/g, '').toUpperCase();
      const plateExists = allUsers.some(
        (u) =>
          u.role === 'Repartidor' &&
          u.vehicle?.plate &&
          u.vehicle.plate.replace(/[\-\s]/g, '').toUpperCase() === cleanPlate
      );
      if (plateExists) {
        return {
          success: false,
          message: `La placa de vehículo "${data.vehicle.plate}" ya está registrada por otro repartidor en el sistema.`,
        };
      }
    }

    // 4. Registrar en Firebase Authentication y Firestore si está configurado
    let firebaseUid: string | undefined = undefined;
    if (data.password) {
      const fbRes = await registerWithFirebase({
        name: data.name,
        email: trimmedEmail,
        password: data.password,
        role: data.role,
        cedula: data.cedula,
        phone: data.phone,
        vehicle: data.vehicle,
      });

      if (!fbRes.success) {
        return {
          success: false,
          message: fbRes.message || 'Error al registrar en Firebase Authentication / Firestore.',
        };
      }
      firebaseUid = fbRes.uid;
    }

    const newUser: User = {
      ...data,
      id: firebaseUid || `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      status: 'Activo',
      rating: 5.0,
      ratingsCount: 0,
      ratingSum: 0,
      driverStats:
        data.role === 'Repartidor'
          ? {
              accumulatedKm: 0,
              weeklyCompletedTrips: 0,
              weeklyEarningsUSD: 0,
              monthlyEarningsUSD: 0,
              ratingsCount: 0,
              ratingSum: 0,
            }
          : undefined,
      avatar:
        data.role === 'Repartidor'
          ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      vehicle:
        data.role === 'Repartidor'
          ? data.vehicle || {
              type: 'Moto',
              model: 'Bera Socialista 150',
              plate: 'AB1-88K',
              color: 'Rojo',
            }
          : undefined,
    };
    setAllUsers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    playAlertChime('accepted');
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    playAlertChime('tap');
  };

  // Switch role between the two permitted roles for convenience
  const switchUserRole = (newRole: UserRole) => {
    if (!currentUser) return;
    const updated = {
      ...currentUser,
      role: newRole,
      vehicle:
        newRole === 'Repartidor' && !currentUser.vehicle
          ? {
              type: 'Moto' as const,
              model: 'Empire Keeway Express 150',
              plate: 'AE9-11M',
              color: 'Negro',
            }
          : currentUser.vehicle,
    };
    setCurrentUser(updated);
    setAllUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    playAlertChime('tap');
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

    // Transmitir inmediatamente en tiempo real a Firebase y otros dispositivos/pestañas
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

    let updatedOrderData: Order | null = null;
    let clientNotificationObj: AppNotification | null = null;

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          const driverName = currentUser?.name || 'Carlos Mendoza';
          const driverPhone = currentUser?.phone || '+58 414 123 9876';
          const driverAvatar = currentUser?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80';
          const driverRating = currentUser?.rating || 4.9;
          const driverVehicle = currentUser?.vehicle || {
            model: 'Empire Keeway Horse 150',
            plate: 'AC5-49X',
            color: 'Azul Eléctrico',
          };
          const driverPosition = {
            lat: ord.origin.lat + 0.004,
            lng: ord.origin.lng - 0.004,
            name: 'Ubicación actual del repartidor',
            address: 'En camino a recogida',
          };

          const updated: Order = {
            ...ord,
            status: 'Repartidor asignado',
            driverId: currentUser?.id || 'user-carlos-repartidor',
            driverName,
            driverPhone,
            driverAvatar,
            driverRating,
            driverVehicle: driverVehicle || null as any,
            acceptedAt: Date.now(),
            completedAt: ord.completedAt ?? null as any,
            cancelledAt: ord.cancelledAt ?? null as any,
            cancelledBy: ord.cancelledBy ?? null as any,
            cancelReason: ord.cancelReason ?? null as any,
            ratingGiven: ord.ratingGiven ?? null as any,
            cancellationRequest: ord.cancellationRequest ?? null as any,
            reportIncident: ord.reportIncident ?? null as any,
            driverPosition,
          };

          updatedOrderData = updated;

          clientNotificationObj = {
            id: `notif-accepted-${Date.now()}`,
            userId: ord.clientId,
            title: '🛵 ¡Servicio Aceptado por Repartidor!',
            body: `${driverName} aceptó tu servicio #${ord.id}. Tu repartidor va en camino al punto de recogida.`,
            type: 'order_status',
            orderId: ord.id,
            timestamp: Date.now(),
            read: false,
          };

          return updated;
        }
        return ord;
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

    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? {
              ...ord,
              ratingGiven: { stars, tags, comment },
            }
          : ord
      )
    );

    // Update driver's rating average and count
    const driverId = targetOrder?.driverId || 'user-carlos-repartidor';
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
