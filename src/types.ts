export type UserRole = 'client' | 'driver' | 'admin' | 'Usuario Normal' | 'Repartidor' | 'Moderador';

export const isClientRole = (role?: string | null): boolean => {
  if (!role) return true;
  const r = role.toLowerCase().trim();
  return r === 'client' || r === 'usuario normal' || r === 'cliente';
};

export const isDriverRole = (role?: string | null): boolean => {
  if (!role) return false;
  const r = role.toLowerCase().trim();
  return r === 'driver' || r === 'repartidor';
};

export const isAdminRole = (role?: string | null): boolean => {
  if (!role) return false;
  const r = role.toLowerCase().trim();
  return r === 'admin' || r === 'moderador';
};

export const normalizeRole = (role?: string | null): 'client' | 'driver' | 'admin' => {
  if (!role) return 'client';
  if (isAdminRole(role)) return 'admin';
  if (isDriverRole(role)) return 'driver';
  return 'client';
};

export type UserStatus = 'Activo' | 'Suspendido';

export type PerformanceTier = 'green' | 'yellow' | 'red';

export interface DriverStats {
  accumulatedKm: number;
  weeklyCompletedTrips: number;
  weeklyEarningsUSD: number;
  monthlyEarningsUSD: number;
  ratingsCount: number;
  ratingSum: number;
}

export interface User {
  id: string;
  name: string;
  cedula?: string | null;
  phone: string;
  email: string;
  password?: string;
  role: UserRole;
  status?: UserStatus;
  suspendedReason?: string | null;
  avatar?: string | null;
  rating?: number | null;
  ratingsCount?: number | null;
  ratingSum?: number | null;
  driverStats?: DriverStats | null;
  lastProfileUpdate?: number | null;
  vehicle?: {
    model: string;
    plate: string;
    color: string;
    type: 'Moto' | 'Auto';
  } | null;
}

export interface LocationPoint {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export type OrderStatus =
  | 'Buscando repartidor'
  | 'Repartidor asignado'
  | 'Llegué al comercio'
  | 'Pedido recogido'
  | 'En camino'
  | 'Entregado'
  | 'Cancelado';

export interface ServiceType {
  id: string;
  name: string;
  description: string;
  iconName: string;
  baseMultiplier: number;
  estimatedMinutes: number;
  estimatedTimeText?: string;
  conditionText?: string;
}

export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  driverId?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  driverVehicle?: {
    model?: string | null;
    plate?: string | null;
    color?: string | null;
    type?: string | null;
  } | null;
  driverAvatar?: string | null;
  driverRating?: number | null;
  origin: LocationPoint;
  destination: LocationPoint;
  distanceKm: number;
  serviceType: string;
  itemDescription: string;
  baseFeeUSD: number;
  costPerKmUSD: number;
  totalCostUSD: number;
  driverNetEarningsUSD: number;
  status: OrderStatus;
  createdAt: number;
  acceptedAt?: number | null;
  completedAt?: number | null;
  cancelledAt?: number | null;
  cancelledBy?: ('Cliente' | 'Repartidor' | 'Moderador') | null;
  cancelReason?: string | null;
  driverPosition?: {
    lat: number;
    lng: number;
    name?: string | null;
    address?: string | null;
  } | null;
  ratingGiven?: {
    stars: number;
    tags: string[];
    comment?: string | null;
  } | null;
  cancellationRequest?: DriverCancellationRequest | null;
  reportIncident?: ModeratorIncidentReport | null;
}

export interface DriverCancellationRequest {
  requestedBy: 'Repartidor';
  reason: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface ModeratorIncidentReport {
  id: string;
  orderId: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  driverId: string;
  driverName: string;
  driverPhone?: string | null;
  serviceType: string;
  reason: string;
  details: string;
  timestamp: number;
  status: 'Abierto' | 'Investigando' | 'Sancionado' | 'Resuelto';
  orderTotalUSD: number;
}

export interface IncomingAlert {
  order: Order;
  tier: PerformanceTier;
  tierLabel: string;
  delaySeconds: number;
  dispatchedAt: number;
}

export interface ChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  timestamp: number;
}

export interface AppNotification {
  id: string;
  userId: string; // Target user id or 'ALL'
  title: string;
  body: string;
  type: 'order_status' | 'order_cancelled' | 'order_assigned' | 'system' | 'profile';
  timestamp: number;
  read: boolean;
  orderId?: string;
}

export interface PricingConfig {
  baseFeeUSD: number;
  costPerKmUSD: number;
  driverCommissionRate: number; // e.g. 0.82 (driver gets 82% of total)
  minimumFareUSD: number;
  serviceRatesUSD: {
    rescate_moto: number;
    rescate_delivery: number;
    rescate_flash?: number;
    rescate_auto?: number;
    rescate_encargos?: number;
    rescate_taxi?: number;
  };
}

export interface AnnouncementBanner {
  enabled: boolean;
  title: string;
  message: string;
  badge?: string;
}

