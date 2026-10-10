export type UserRole = 'Usuario Normal' | 'Repartidor';
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
  cedula?: string;
  phone: string;
  email: string;
  password?: string;
  role: UserRole;
  status?: UserStatus;
  suspendedReason?: string;
  avatar?: string;
  rating?: number;
  ratingsCount?: number;
  ratingSum?: number;
  driverStats?: DriverStats;
  lastProfileUpdate?: number;
  vehicle?: {
    model: string;
    plate: string;
    color: string;
    type: 'Moto' | 'Auto';
  };
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
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverVehicle?: {
    model: string;
    plate: string;
    color: string;
  };
  driverAvatar?: string;
  driverRating?: number;
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
  acceptedAt?: number;
  completedAt?: number;
  cancelledAt?: number;
  cancelledBy?: 'Cliente' | 'Repartidor' | 'Moderador';
  cancelReason?: string;
  driverPosition?: {
    lat: number;
    lng: number;
  };
  ratingGiven?: {
    stars: number;
    tags: string[];
    comment?: string;
  };
  cancellationRequest?: DriverCancellationRequest;
  reportIncident?: ModeratorIncidentReport;
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
  driverPhone?: string;
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

