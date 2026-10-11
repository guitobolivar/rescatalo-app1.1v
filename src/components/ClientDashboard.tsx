import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { playAlertChime } from '../data/venezuelaData';
import { BottomNav } from './BottomNav';
import { ClientHomeView } from './ClientHomeView';
import { ServiceRequestView } from './ServiceRequestView';
import { UserProfileView } from './UserProfileView';
import { InteractiveMap } from './InteractiveMap';
import { ChatDrawer } from './ChatDrawer';
import { RatingModal } from './RatingModal';
import { DeliveryConfirmationModal } from './DeliveryConfirmationModal';
import { CancelOrderModal } from './CancelOrderModal';
import { ReportDriverModal } from './ReportDriverModal';
import { normalizeOrderStatus, getOrderStatusText, Order } from '../types';
import { subscribeToSingleFirestoreOrder } from '../services/firebase';
import {
  MapPin,
  Package,
  Phone,
  MessageSquare,
  Navigation,
  X,
  XCircle,
  CheckCircle2,
  Bike,
  ArrowLeft,
  Siren,
  AlertTriangle,
  Check,
  ShieldAlert,
} from 'lucide-react';

interface ClientDashboardProps {
  currentView?: 'home' | 'service' | 'profile' | 'tracking';
  onNavigateView?: (view: 'home' | 'service' | 'profile' | 'tracking') => void;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  currentView: controlledView,
  onNavigateView: controlledNavigate,
}) => {
  const {
    activeOrder,
    setActiveOrderId,
    clearActiveOrderState,
    cancelOrder,
    orders,
    currentUser,
    respondToCancellationRequest,
    reportDriverIncident,
  } = useApp();

  // Decoupled independent view architecture: 'home' | 'service' | 'profile' | 'tracking'
  const [internalView, setInternalView] = useState<'home' | 'service' | 'profile' | 'tracking'>('home');
  const clientView = controlledView ?? internalView;
  const setClientView = controlledNavigate ?? setInternalView;
  const [selectedServiceId, setSelectedServiceId] = useState<'rescate_moto' | 'rescate_delivery'>('rescate_moto');

  // Modals & Drawers
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitialTab, setChatInitialTab] = useState<'chat' | 'call'>('chat');
  const [isDeliveryConfirmOpen, setIsDeliveryConfirmOpen] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [orderToConfirm, setOrderToConfirm] = useState<Order | null>(null);

  // Real-time step change notification toast for client
  const [stepNotification, setStepNotification] = useState<{
    title: string;
    description: string;
    type: 'assigned' | 'shop' | 'picked' | 'way' | 'delivered';
  } | null>(null);

  // Unread messages count for active order
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  // Listener para mensajes no leídos del pedido activo
  useEffect(() => {
    if (!clientActiveOrder?.id) {
      setUnreadChatCount(0);
      return;
    }

    const unsub = subscribeToFirestoreOrderMessages(clientActiveOrder.id, (msgs) => {
      if (isChatOpen) {
        setUnreadChatCount(0);
      } else {
        // Contar mensajes enviados por el repartidor/contraparte
        const incoming = msgs.filter((m) => m.senderId !== currentUser?.id);
        const lastReadTimestamp = parseInt(localStorage.getItem(`rescatalo_chat_read_${clientActiveOrder.id}`) || '0', 10);
        const unread = incoming.filter((m) => (m.timestamp || 0) > lastReadTimestamp).length;
        setUnreadChatCount(unread);
      }
    });

    return () => {
      unsub?.();
    };
  }, [clientActiveOrder?.id, isChatOpen, currentUser?.id]);

  const handleOpenClientChat = (tab: 'chat' | 'call' = 'chat') => {
    if (clientActiveOrder?.id) {
      localStorage.setItem(`rescatalo_chat_read_${clientActiveOrder.id}`, Date.now().toString());
    }
    setUnreadChatCount(0);
    setChatInitialTab(tab);
    setIsChatOpen(true);
  };

  const prevStatusRef = useRef<string | null>(null);

  // Filter client orders strictly for current user or current active device session
  const clientActiveOrderId = typeof window !== 'undefined' ? localStorage.getItem('rescatalo_client_active_order_id') : null;
  const clientOrders = orders.filter((o) => o.clientId === currentUser?.id || o.id === clientActiveOrderId);

  // Identificación del pedido activo del cliente (incluyendo entregado si aún no está valorado)
  const clientActiveOrder =
    (clientActiveOrderId
      ? orders.find(
          (o) =>
            o.id === clientActiveOrderId &&
            normalizeOrderStatus(o.status) !== 'CANCELLED' &&
            (!o.ratingGiven || normalizeOrderStatus(o.status) !== 'DELIVERED')
        )
      : null) ||
    (activeOrder &&
    (activeOrder.clientId === currentUser?.id || activeOrder.id === clientActiveOrderId) &&
    normalizeOrderStatus(activeOrder.status) !== 'CANCELLED' &&
    (!activeOrder.ratingGiven || normalizeOrderStatus(activeOrder.status) !== 'DELIVERED')
      ? activeOrder
      : null) ||
    clientOrders.find(
      (o) =>
        normalizeOrderStatus(o.status) !== 'CANCELLED' &&
        (!o.ratingGiven || normalizeOrderStatus(o.status) !== 'DELIVERED')
    ) ||
    null;

  // Listener onSnapshot en tiempo real del pedido en Firestore (actualización dinámica sin recargar)
  useEffect(() => {
    if (!clientActiveOrder?.id) return;

    const unsub = subscribeToSingleFirestoreOrder(clientActiveOrder.id, (orderSnap) => {
      if (orderSnap && orderSnap.status) {
        const norm = normalizeOrderStatus(orderSnap.status);
        if (norm === 'DELIVERED' && !orderSnap.ratingGiven) {
          setOrderToConfirm(orderSnap);
          setIsDeliveryConfirmOpen(true);
        }
      }
    });

    return () => {
      unsub?.();
    };
  }, [clientActiveOrder?.id]);

  // Activación automática del modal de confirmación cuando el repartidor marca DELIVERED
  useEffect(() => {
    if (!clientActiveOrder) return;
    const norm = normalizeOrderStatus(clientActiveOrder.status);

    if (norm === 'DELIVERED' && !clientActiveOrder.ratingGiven) {
      setOrderToConfirm(clientActiveOrder);
      setIsDeliveryConfirmOpen(true);
    }
  }, [clientActiveOrder?.status, clientActiveOrder?.ratingGiven]);

  // Monitoreo de transiciones de estado para alertas instantáneas (con sonido e icono)
  useEffect(() => {
    if (!clientActiveOrder) {
      prevStatusRef.current = null;
      return;
    }

    const currentStatus = clientActiveOrder.status;
    const prevStatus = prevStatusRef.current;
    const currentNorm = normalizeOrderStatus(currentStatus);
    const prevNorm = prevStatus ? normalizeOrderStatus(prevStatus) : null;

    if (prevNorm && prevNorm !== currentNorm) {
      if (currentNorm === 'ACCEPTED') {
        setStepNotification({
          title: '🛵 ¡Repartidor Asignado!',
          description: `${clientActiveOrder.driverName || 'Tu repartidor'} ha aceptado tu servicio y viene en camino.`,
          type: 'assigned',
        });
        playAlertChime('accepted');
      } else if (currentNorm === 'ARRIVED_AT_STORE') {
        setStepNotification({
          title: '📍 ¡Repartidor en la Tienda / Comercio!',
          description: `${clientActiveOrder.driverName || 'El repartidor'} ha llegado al lugar de recogida.`,
          type: 'shop',
        });
        playAlertChime('tap');
      } else if (currentNorm === 'PICKED_UP') {
        setStepNotification({
          title: '📦 ¡Pedido Recogido!',
          description: 'Tu pedido ya fue recogido e inició el traslado hacia tu destino.',
          type: 'picked',
        });
        playAlertChime('tap');
      } else if (currentNorm === 'ARRIVED_AT_DESTINATION') {
        // Alerta mandatoria visual y sonora al llegar a la puerta
        setStepNotification({
          title: '¡El Delivery ha llegado!',
          description: 'El repartidor esta esperando, ve a recibir el pedido.',
          type: 'way',
        });
        playAlertChime('incoming_order');
      } else if (currentNorm === 'DELIVERED') {
        setStepNotification({
          title: '🎉 ¡Servicio Entregado!',
          description: 'Tu pedido ha llegado. Por favor confirma la recepción en pantalla.',
          type: 'delivered',
        });
        playAlertChime('delivered');
        setOrderToConfirm(clientActiveOrder);
        setIsDeliveryConfirmOpen(true);
      }

      const timer = setTimeout(() => {
        setStepNotification(null);
      }, 7000);

      prevStatusRef.current = currentStatus;
      return () => clearTimeout(timer);
    }

    prevStatusRef.current = currentStatus;
  }, [clientActiveOrder?.status, clientActiveOrder?.driverName]);

  // Si existe un pedido que necesita valoración pendiente
  const orderNeedingRating =
    (orderToConfirm && normalizeOrderStatus(orderToConfirm.status) === 'DELIVERED' && !orderToConfirm.ratingGiven ? orderToConfirm : null) ||
    (clientActiveOrder && normalizeOrderStatus(clientActiveOrder.status) === 'DELIVERED' && !clientActiveOrder.ratingGiven ? clientActiveOrder : null) ||
    orders.find(
      (o) =>
        o.clientId === currentUser?.id &&
        normalizeOrderStatus(o.status) === 'DELIVERED' &&
        !o.ratingGiven
    ) ||
    null;

  return (
    <div className="w-full max-w-full overflow-x-hidden flex-1 flex flex-col p-4 pb-28 space-y-4">
      {/* REAL-TIME NOTIFICATION TOAST FOR CLIENT */}
      {stepNotification && (
        <div className="fixed top-16 left-4 right-4 z-50 max-w-sm mx-auto bg-slate-900 border-2 border-cyan-400 rounded-3xl p-4 shadow-2xl shadow-cyan-950/80 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/40">
                {stepNotification.type === 'assigned' && <Bike className="w-5 h-5 text-cyan-400" />}
                {stepNotification.type === 'shop' && <MapPin className="w-5 h-5 text-amber-400" />}
                {stepNotification.type === 'picked' && <Package className="w-5 h-5 text-blue-400" />}
                {stepNotification.type === 'way' && <Navigation className="w-5 h-5 text-emerald-400 animate-spin" />}
                {stepNotification.type === 'delivered' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              </div>
              <div>
                <h4 className="text-sm font-black text-white leading-tight">
                  {stepNotification.title}
                </h4>
                <p className="text-xs text-slate-300 mt-0.5 leading-snug">
                  {stepNotification.description}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStepNotification(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. INDEPENDENT VIEW: HOME (TOTALMENTE LIMPIO Y SEPARADO)                   */}
      {/* ========================================================================= */}
      {clientView === 'home' && (
        <ClientHomeView
          onSelectService={(serviceId) => {
            setSelectedServiceId(serviceId);
            setClientView('service');
          }}
          onGoToTracking={() => setClientView('tracking')}
        />
      )}

      {/* ========================================================================= */}
      {/* 2. INDEPENDENT VIEW: SERVICIO CON MAPA PASO A PASO (SALIDA -> LLEGADA)     */}
      {/* ========================================================================= */}
      {clientView === 'service' && (
        <ServiceRequestView
          key={selectedServiceId}
          serviceId={selectedServiceId}
          onBackToHome={() => setClientView('home')}
          onOrderCreated={(orderId) => {
            setActiveOrderId(orderId);
            setClientView('tracking');
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* 3. INDEPENDENT VIEW: PERFIL DEDICADO POR REDIRECCIÓN                      */}
      {/* ========================================================================= */}
      {clientView === 'profile' && (
        <UserProfileView onBackToHome={() => setClientView('home')} />
      )}

      {/* ========================================================================= */}
      {/* 4. INDEPENDENT VIEW: TRACKING / SEGUIMIENTO EN VIVO                       */}
      {/* ========================================================================= */}
      {clientView === 'tracking' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Header back to Home */}
          <div className="flex items-center justify-between p-3.5 bg-slate-900/90 rounded-3xl border border-cyan-500/25 shadow-lg">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setClientView('home')}
                aria-label="Volver al inicio"
                className="w-8 h-8 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-cyan-400 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h3 className="text-sm font-black text-white leading-tight">
                  Seguimiento en Vivo
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  Valle de la Pascua
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setClientView('home')}
              className="text-xs text-cyan-400 hover:underline font-bold"
            >
              Ir a Inicio
            </button>
          </div>

          {clientActiveOrder ? (
            <>
              {/* Status card */}
              <div className="bg-slate-900/90 rounded-3xl p-5 border border-cyan-500/25 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-cyan-400 block font-mono">
                      Estado del Servicio
                    </span>
                    <h3 className="text-lg font-black text-white mt-0.5">
                      {getOrderStatusText(clientActiveOrder.status)}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      Código Firestore: <strong className="text-cyan-400">{clientActiveOrder.status}</strong>
                    </span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-mono text-xs font-black">
                    #{clientActiveOrder.id}
                  </span>
                </div>

                {/* Banner especial cuando el repartidor está afuera */}
                {normalizeOrderStatus(clientActiveOrder.status) === 'ARRIVED_AT_DESTINATION' && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-yellow-500/20 border-2 border-amber-400 text-amber-200 flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 font-black">
                      <Bike className="w-6 h-6 animate-bounce" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white leading-tight">
                        ¡Tu repartidor está afuera en la puerta!
                      </h4>
                      <p className="text-xs text-amber-300 mt-0.5">
                        El conductor ha llegado al punto de entrega en Valle de la Pascua.
                      </p>
                    </div>
                  </div>
                )}

                {/* Creative Dynamic Status Bar - Changes Color on each status up to bright Emerald Green */}
                {(() => {
                  const s = normalizeOrderStatus(clientActiveOrder.status);
                  const statusConfig = (() => {
                    switch (s) {
                      case 'SEARCHING':
                        return {
                          width: '18%',
                          label: 'Radar Activo',
                          barColor: 'from-sky-500 to-cyan-400',
                          shadow: 'shadow-cyan-500/25',
                          dotColor: 'bg-cyan-400',
                          step: 1,
                        };
                      case 'ACCEPTED':
                        return {
                          width: '38%',
                          label: 'Repartidor Asignado',
                          barColor: 'from-cyan-500 via-teal-400 to-teal-300',
                          shadow: 'shadow-teal-500/30',
                          dotColor: 'bg-teal-400',
                          step: 2,
                        };
                      case 'ARRIVED_AT_STORE':
                        return {
                          width: '58%',
                          label: 'En Comercio / Recogida',
                          barColor: 'from-teal-400 via-amber-400 to-amber-300',
                          shadow: 'shadow-amber-500/30',
                          dotColor: 'bg-amber-400',
                          step: 3,
                        };
                      case 'PICKED_UP':
                        return {
                          width: '78%',
                          label: 'En Camino a tu Destino',
                          barColor: 'from-amber-400 via-emerald-400 to-teal-400',
                          shadow: 'shadow-emerald-500/35',
                          dotColor: 'bg-emerald-400',
                          step: 4,
                        };
                      case 'ARRIVED_AT_DESTINATION':
                        return {
                          width: '92%',
                          label: '¡Afuera en la Puerta!',
                          barColor: 'from-emerald-400 via-lime-400 to-emerald-300',
                          shadow: 'shadow-emerald-400/40',
                          dotColor: 'bg-lime-400',
                          step: 5,
                        };
                      case 'DELIVERED':
                        return {
                          width: '100%',
                          label: '¡Entregado!',
                          barColor: 'from-emerald-400 to-green-500',
                          shadow: 'shadow-green-500/50',
                          dotColor: 'bg-emerald-400',
                          step: 6,
                        };
                      default:
                        return {
                          width: '30%',
                          label: 'En Proceso',
                          barColor: 'from-cyan-400 to-emerald-400',
                          shadow: 'shadow-cyan-500/20',
                          dotColor: 'bg-cyan-400',
                          step: 2,
                        };
                    }
                  })();

                  return (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="flex items-center gap-1.5 font-bold text-white">
                          <span className={`w-2 h-2 rounded-full ${statusConfig.dotColor} animate-pulse`} />
                          {statusConfig.label}
                        </span>
                        <span className="font-bold text-slate-400">
                          Paso {statusConfig.step} de 6
                        </span>
                      </div>

                      <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800/80 p-0.5 shadow-inner">
                        <div
                          className={`h-full bg-gradient-to-r ${statusConfig.barColor} rounded-full transition-all duration-700 ease-out shadow-lg ${statusConfig.shadow} relative overflow-hidden`}
                          style={{ width: statusConfig.width }}
                        >
                          <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Driver info card */}
              {clientActiveOrder.driverId ? (
                <div className="bg-slate-900/90 rounded-3xl p-4 border border-cyan-500/20 shadow-md space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        clientActiveOrder.driverAvatar ||
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
                      }
                      alt={clientActiveOrder.driverName || 'Repartidor'}
                      className="w-12 h-12 rounded-2xl object-cover border border-cyan-500/40"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-black text-white truncate">
                          {clientActiveOrder.driverName}
                        </h4>
                        <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-500/30">
                          ★ {clientActiveOrder.driverRating || 5.0}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 block truncate">
                        {clientActiveOrder.driverVehicle
                          ? `${clientActiveOrder.driverVehicle.model} · ${clientActiveOrder.driverVehicle.plate}`
                          : 'Bera Socialista 150'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleOpenClientChat('call')}
                      className="py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 hover:scale-[1.02] active:scale-95 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-cyan-500/20 transition-all"
                    >
                      <Phone className="w-4 h-4 stroke-[2.5]" />
                      <span>Llamar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenClientChat('chat')}
                      className="relative py-2.5 bg-slate-800 hover:bg-slate-700 hover:scale-[1.02] active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-700 shadow-md"
                    >
                      <MessageSquare className="w-4 h-4 text-cyan-400" />
                      <span>Chat</span>
                      {unreadChatCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-rose-600 text-white font-mono font-black text-[10px] flex items-center justify-center shadow-lg shadow-rose-600/50 border-2 border-slate-900 animate-bounce">
                          {unreadChatCount > 9 ? '9+' : unreadChatCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-3xl bg-slate-900 border border-cyan-500/20 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mx-auto animate-pulse">
                    <Navigation className="w-5 h-5 animate-spin" />
                  </div>
                  <h4 className="text-sm font-black text-white">Buscando Repartidor Cercano...</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Los conductores en Valle de la Pascua están recibiendo la solicitud en su radar.
                  </p>
                </div>
              )}

              {/* Live Interactive Map */}
              <div className="w-full rounded-3xl overflow-hidden border border-cyan-500/25 shadow-xl">
                <InteractiveMap
                  origin={clientActiveOrder.origin}
                  destination={clientActiveOrder.destination}
                  driverPosition={clientActiveOrder.driverPosition}
                  heightClass="h-64 sm:h-72"
                />
              </div>

              {/* Order details summary */}
              <div className="bg-slate-900/90 rounded-3xl p-4 border border-slate-800 space-y-2 text-xs">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                  Detalles del Envío:
                </span>
                <div className="truncate">
                  <span className="text-cyan-400 font-bold mr-1">Recogida:</span>
                  <span className="text-white">{clientActiveOrder.origin.name}</span>
                </div>
                <div className="truncate">
                  <span className="text-blue-400 font-bold mr-1">Entrega:</span>
                  <span className="text-white">{clientActiveOrder.destination.name}</span>
                </div>
                <div className="text-slate-300">
                  <span className="text-slate-400 font-medium mr-1">Contenido:</span>
                  {clientActiveOrder.itemDescription}
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-sm font-bold">
                  <span className="text-slate-400">Total a Pagar:</span>
                  <span className="text-emerald-400 font-mono font-black text-base">
                    ${clientActiveOrder.totalCostUSD.toFixed(2)} USD
                  </span>
                </div>
              </div>

              {/* SOLICITUD DE CANCELACIÓN DEL REPARTIDOR (AUTORIZACIÓN / RECHAZO DEL CLIENTE) */}
              {clientActiveOrder.cancellationRequest?.status === 'pending' && (
                <div className="bg-amber-950/80 border-2 border-amber-400 rounded-3xl p-4 shadow-2xl space-y-3 animate-in zoom-in-95">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/50">
                      <AlertTriangle className="w-5 h-5 text-amber-400 animate-bounce" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">Solicitud de Cancelación del Repartidor</h4>
                      <span className="text-[10px] text-amber-300 font-mono">El pedido ya fue recogido</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
                    <span className="text-amber-400 font-bold block mb-0.5">Motivo presentado por el repartidor:</span>
                    "{clientActiveOrder.cancellationRequest.reason}"
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Debes autorizar o rechazar esta solicitud para que el sistema proceda:
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => respondToCancellationRequest(clientActiveOrder.id, true)}
                      className="py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Autorizar Cancelación</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => respondToCancellationRequest(clientActiveOrder.id, false)}
                      className="py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all"
                    >
                      <X className="w-4 h-4 stroke-[3]" />
                      <span>Rechazar y Continuar</span>
                    </button>
                  </div>
                </div>
              )}

              {/* VERIFICACIÓN DEL PEDIDO Y BOTÓN PROMINENTE DE REPORTAR REPARTIDOR (Únicamente visible cuando el repartidor ya confirmó que recogió el paquete) */}
              {(clientActiveOrder.status === 'Pedido recogido' ||
                clientActiveOrder.status === 'En camino') && (
                <div className="bg-slate-900/90 border-2 border-rose-500/40 rounded-3xl p-4 space-y-2.5 shadow-lg shadow-rose-950/20 animate-in fade-in-50 duration-300">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-black text-rose-300 uppercase tracking-wide flex items-center gap-1.5">
                        <Siren className="w-4 h-4 text-rose-400 animate-pulse" />
                        Verificación de Entrega / Seguridad
                      </span>
                      <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                        ¿El repartidor marcó recogido pero el artículo NO está en el sitio, o no te fue entregado?
                      </p>
                    </div>
                  </div>

                  {clientActiveOrder.reportIncident ? (
                    <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-500/60 text-xs text-rose-200 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>
                        Alerta prioritaria #{clientActiveOrder.reportIncident.id} enviada al Moderador. En revisión activa.
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsReportModalOpen(true)}
                      className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-950/60 active:scale-98 transition-all border border-rose-400/50"
                    >
                      <Siren className="w-4 h-4 animate-pulse" />
                      <span>Reportar Repartidor</span>
                    </button>
                  )}
                </div>
              )}

              {/* Visible Cancel Service button (Client standard cancellation) */}
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                className="w-full py-3.5 px-4 bg-slate-950/80 hover:bg-rose-950/80 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-200 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-98"
              >
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>Cancelar servicio como cliente</span>
              </button>
            </>
          ) : (
            <div className="p-8 text-center bg-slate-900/90 rounded-3xl border border-slate-800 space-y-3">
              <Package className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="text-base font-black text-white">No tienes pedidos activos</h3>
              <p className="text-xs text-slate-400">
                Selecciona un servicio en la barra inferior para solicitar tu delivery o transporte en Valle de la Pascua.
              </p>
              <button
                type="button"
                onClick={() => setClientView('home')}
                className="mt-2 px-5 py-2.5 bg-cyan-500 text-slate-950 font-black text-xs rounded-xl cursor-pointer"
              >
                Ir a la Pantalla de Inicio
              </button>
            </div>
          )}

          {/* Client Order History */}
          {clientOrders.length > 0 && (
            <div className="bg-slate-900/90 rounded-3xl p-4 border border-slate-800 space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                Mi Historial de Pedidos ({clientOrders.length})
              </span>
              <div className="space-y-2">
                {clientOrders.slice(0, 5).map((ord) => (
                  <div
                    key={ord.id}
                    className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-black text-white block font-mono">#{ord.id}</span>
                      <span className="text-[11px] text-slate-400 block truncate max-w-[180px]">
                        {ord.destination.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-400 font-mono font-bold block">
                        ${ord.totalCostUSD.toFixed(2)} USD
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          ord.status === 'Entregado'
                            ? 'text-emerald-400'
                            : ord.status === 'Cancelado'
                            ? 'text-rose-400'
                            : 'text-cyan-400'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FLOATING GLASSMORPHISM BOTTOM NAVIGATION BAR */}
      <BottomNav
        currentView={clientView}
        onNavigate={(view) => setClientView(view)}
        onSelectService={(serviceId) => {
          setSelectedServiceId(serviceId);
          setClientView('service');
        }}
      />

      {/* CHAT DRAWER */}
      {clientActiveOrder && (
        <ChatDrawer
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          order={clientActiveOrder}
          initialTab={chatInitialTab}
          onMessagesRead={() => {
            if (clientActiveOrder?.id) {
              localStorage.setItem(`rescatalo_chat_read_${clientActiveOrder.id}`, Date.now().toString());
            }
            setUnreadChatCount(0);
          }}
        />
      )}

      {/* DELIVERY CONFIRMATION MODAL (MANDATORIO FASE 2) */}
      {(orderToConfirm || (clientActiveOrder && normalizeOrderStatus(clientActiveOrder.status) === 'DELIVERED')) && (
        <DeliveryConfirmationModal
          isOpen={isDeliveryConfirmOpen}
          order={orderToConfirm || clientActiveOrder!}
          onConfirmReception={() => {
            setIsDeliveryConfirmOpen(false);
            setIsRatingModalOpen(true);
          }}
          onReportProblem={() => {
            setIsDeliveryConfirmOpen(false);
            setIsReportModalOpen(true);
          }}
        />
      )}

      {/* RATING MODAL (VALORACIÓN Y PRIORIDAD DEL REPARTIDOR) */}
      {(orderNeedingRating || orderToConfirm) && (
        <RatingModal
          isOpen={isRatingModalOpen}
          order={orderNeedingRating || orderToConfirm!}
          onClose={() => {
            setIsRatingModalOpen(false);
            setOrderToConfirm(null);
            clearActiveOrderState();
            localStorage.removeItem('rescatalo_client_active_order_id');
            setClientView('home');
          }}
        />
      )}

      {/* CANCEL ORDER CONFIRMATION MODAL */}
      {clientActiveOrder && (
        <CancelOrderModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          orderId={clientActiveOrder.id}
          userRole="Cliente"
          onConfirmCancel={(reason) => {
            cancelOrder(clientActiveOrder.id, 'Cliente', reason);
            setIsCancelModalOpen(false);
            setClientView('home');
          }}
        />
      )}
  
      {/* REPORT DRIVER MODAL (VERIFICACIÓN DE PEDIDO / NO RECIBIDO O NO EN SITIO) */}
      {clientActiveOrder && (
        <ReportDriverModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          orderId={clientActiveOrder.id}
          driverName={clientActiveOrder.driverName || 'Repartidor'}
          onConfirmReport={(reason, details) => {
            reportDriverIncident(clientActiveOrder.id, reason, details);
          }}
        />
      )}
    </div>
  );
};
