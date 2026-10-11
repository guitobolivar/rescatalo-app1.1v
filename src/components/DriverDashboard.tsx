import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { InteractiveMap } from './InteractiveMap';
import { ChatDrawer } from './ChatDrawer';
import { Order, OrderStatus, isDriverRole, normalizeOrderStatus, getOrderStatusText } from '../types';
import { buildWhatsAppLink, getDriverPerformance } from '../data/venezuelaData';
import { MotoPassengerIcon, MotoDeliveryIcon } from './ServiceIcons';
import { CancelOrderModal } from './CancelOrderModal';
import { DriverCancellationRequestModal } from './DriverCancellationRequestModal';
import { subscribeToFirestoreOrderMessages } from '../services/firebase';
import {
  Power,
  DollarSign,
  CheckCircle2,
  Bike,
  Navigation,
  Phone,
  MessageSquare,
  TrendingUp,
  MapPin,
  Package,
  ExternalLink,
  AlertTriangle,
  Star,
  Award,
  Milestone,
  Check,
  X,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

interface StepConfirmState {
  nextStatus: OrderStatus;
  title: string;
  description: string;
  badge: string;
  iconType: 'shop' | 'pickup' | 'way' | 'delivered';
}

export const DriverDashboard: React.FC = () => {
  const {
    currentUser,
    isDriverOnline,
    setIsDriverOnline,
    driverDailyEarningsUSD,
    driverCompletedTrips,
    driverStats,
    incomingOrderAlert,
    acceptIncomingOrder,
    rejectIncomingOrder,
    orders,
    advanceOrderStatus,
    cancelOrder,
    requestDriverCancellation,
  } = useApp();

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancellationRequestModalOpen, setIsCancellationRequestModalOpen] = useState(false);

  // Incoming alert countdown timer (strictly 10 seconds)
  const [alertSecondsLeft, setAlertSecondsLeft] = useState(10);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitialTab, setChatInitialTab] = useState<'chat' | 'call'>('chat');

  // Confirmation modal state for sequential steps
  const [stepConfirmModal, setStepConfirmModal] = useState<StepConfirmState | null>(null);

  // Driver rating and performance tier calculations
  const driverRating = currentUser?.rating ?? 4.9;
  const perfInfo = getDriverPerformance(driverRating);

  // Strictly driver's own ongoing active order (RBAC Isolation)
  const myActiveOrder =
    orders.find(
      (o) =>
        (o.driverId === currentUser?.id ||
          (!currentUser?.id && o.driverId === 'user-carlos-repartidor') ||
          (isDriverRole(currentUser?.role) && o.driverId === currentUser?.id)) &&
        o.status !== 'Buscando repartidor' &&
        o.status !== 'Entregado' &&
        o.status !== 'Cancelado'
    ) || null;

  // Contador dinámico de mensajes no leídos del cliente para el repartidor
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  useEffect(() => {
    if (!myActiveOrder?.id) {
      setUnreadChatCount(0);
      return;
    }

    const unsub = subscribeToFirestoreOrderMessages(myActiveOrder.id, (msgs) => {
      if (isChatOpen) {
        setUnreadChatCount(0);
      } else {
        const incoming = msgs.filter((m) => m.senderId !== currentUser?.id);
        const lastReadTimestamp = parseInt(
          localStorage.getItem(`rescatalo_chat_driver_read_${myActiveOrder.id}`) || '0',
          10
        );
        const unread = incoming.filter((m) => (m.timestamp || 0) > lastReadTimestamp).length;
        setUnreadChatCount(unread);
      }
    });

    return () => {
      unsub?.();
    };
  }, [myActiveOrder?.id, isChatOpen, currentUser?.id]);

  const handleOpenDriverChat = (tab: 'chat' | 'call' = 'chat') => {
    if (myActiveOrder?.id) {
      localStorage.setItem(`rescatalo_chat_driver_read_${myActiveOrder.id}`, Date.now().toString());
    }
    setUnreadChatCount(0);
    setChatInitialTab(tab);
    setIsChatOpen(true);
  };

  // Unassigned pending orders looking for a driver in Valle de la Pascua
  const pendingOrders = orders.filter((o) => o.status === 'Buscando repartidor');

  // Strictly driver's own delivered orders history
  const myCompletedOrders = orders.filter(
    (o) => o.driverId === currentUser?.id && o.status === 'Entregado'
  );

  // Countdown timer for incoming alert: exactly 10 seconds
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (incomingOrderAlert) {
      setAlertSecondsLeft(10);
      interval = setInterval(() => {
        setAlertSecondsLeft((prev) => {
          if (prev <= 1) {
            rejectIncomingOrder(incomingOrderAlert.order.id);
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [incomingOrderAlert, rejectIncomingOrder]);

  // Request confirmation modal before advancing any step with standard Firebase statuses
  const handleInitiateStepTransition = (targetNextStatus: OrderStatus) => {
    if (!myActiveOrder) return;

    if (targetNextStatus === 'ARRIVED_AT_STORE') {
      setStepConfirmModal({
        nextStatus: 'ARRIVED_AT_STORE',
        title: '¿Confirmas tu llegada al punto de recogida / tienda?',
        description:
          'Se le notificará al cliente en tiempo real que estás en el lugar esperando el pedido.',
        badge: 'Paso 1: Llegada a Tienda',
        iconType: 'shop',
      });
    } else if (targetNextStatus === 'PICKED_UP') {
      setStepConfirmModal({
        nextStatus: 'PICKED_UP',
        title: '¿Confirmas que ya tienes el pedido en mano?',
        description:
          'Verifica que todos los artículos estén completos e introducidos en la maleta antes de avanzar.',
        badge: 'Paso 2: Pedido Recogido',
        iconType: 'pickup',
      });
    } else if (targetNextStatus === 'ARRIVED_AT_DESTINATION') {
      setStepConfirmModal({
        nextStatus: 'ARRIVED_AT_DESTINATION',
        title: '¿Confirmas tu llegada afuera en el punto de entrega?',
        description:
          'Se disparará automáticamente una alerta sonora y visual al cliente avisando que estás afuera.',
        badge: 'Paso 3: Afuera en Destino',
        iconType: 'way',
      });
    } else if (targetNextStatus === 'DELIVERED') {
      setStepConfirmModal({
        nextStatus: 'DELIVERED',
        title: '¿Confirmas que la entrega fue completada?',
        description:
          'Se activará automáticamente el modal en el cliente para confirmar la recepción y calificarte.',
        badge: 'Paso 4: Entrega Finalizada',
        iconType: 'delivered',
      });
    }
  };

  // Execute confirmed status change
  const handleConfirmStepExecution = () => {
    if (!myActiveOrder || !stepConfirmModal) return;
    advanceOrderStatus(myActiveOrder.id, stepConfirmModal.nextStatus);
    setStepConfirmModal(null);
  };

  // WhatsApp click handler
  const handleOpenWhatsApp = () => {
    if (!myActiveOrder || !myActiveOrder.clientPhone) return;
    const msg = `¡Hola ${myActiveOrder.clientName}! Te saluda tu repartidor de Rescátalo en Valle de la Pascua sobre tu orden #${myActiveOrder.id}.`;
    const waUrl = buildWhatsAppLink(myActiveOrder.clientPhone, msg);
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Direct phone call handler
  const handleDirectPhoneCall = () => {
    if (!myActiveOrder || !myActiveOrder.clientPhone) return;
    const cleanPhone = myActiveOrder.clientPhone.replace(/\s+/g, '');
    window.location.href = `tel:${cleanPhone}`;
  };

  const isDriverSuspended = currentUser?.status === 'Suspendido';

  return (
    <div className="w-full max-w-full overflow-x-hidden flex-1 flex flex-col p-4 pb-12 space-y-4">
      {/* Account suspension alert banner */}
      {isDriverSuspended && (
        <div className="w-full bg-rose-950/80 border border-rose-500/50 p-4 rounded-3xl flex items-start gap-3 text-rose-200 text-xs shadow-lg">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm text-white">Cuenta de Repartidor Suspendida</h3>
            <p className="mt-0.5 text-rose-300">
              Tu cuenta ha sido suspendida o penalizada por moderación. No puedes conectarte al radar ni aceptar solicitudes.
              {currentUser?.suspendedReason ? ` Motivo: ${currentUser.suspendedReason}` : ''}
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONDITIONAL RENDERING: IF DRIVER HAS AN ACTIVE ORDER, SHOW DEDICATED SCREEN */}
      {/* ========================================================================= */}
      {myActiveOrder ? (
        /* VENTANA DE SERVICIO ACTIVO (Misión en Curso Redireccionada) */
        <div className="w-full space-y-4 animate-in fade-in zoom-in-98 duration-300">
          {/* TOP BAR DE MISIÓN ACTIVA */}
          <div className="bg-gradient-to-r from-emerald-950/90 via-slate-900 to-cyan-950/90 border border-emerald-500/40 rounded-3xl p-4 shadow-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
              </span>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400 block">
                  Servicio Activo en Curso
                </span>
                <span className="text-sm font-mono font-bold text-white block">
                  #{myActiveOrder.id}
                </span>
              </div>
            </div>

            {/* Ganancia del viaje */}
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Tu Ganancia Neta
              </span>
              <div className="text-2xl font-black font-mono text-emerald-400 drop-shadow-[0_2px_8px_rgba(52,211,153,0.4)]">
                ${myActiveOrder.driverNetEarningsUSD.toFixed(2)}{' '}
                <span className="text-xs font-sans text-emerald-300">USD</span>
              </div>
            </div>
          </div>

          {/* DATOS DEL CLIENTE Y CONTACTO RÁPIDO */}
          <div className="bg-slate-900/95 border border-cyan-500/30 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                Datos del Cliente
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-950 text-cyan-300 border border-cyan-500/30">
                Cliente Verificado
              </span>
            </div>

            {/* Client Card */}
            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 font-black text-lg flex items-center justify-center shrink-0 shadow-md">
                {myActiveOrder.clientName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-base font-black text-white truncate leading-tight">
                  {myActiveOrder.clientName}
                </h4>
                <p className="text-xs text-cyan-300 font-mono font-bold mt-1">
                  {myActiveOrder.clientPhone}
                </p>
              </div>
            </div>

            {/* Direct Contact Buttons (WhatsApp, Llamada, Chat) */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {/* WhatsApp Button */}
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="py-3 px-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer shadow-md shadow-emerald-950/40 active:scale-95 transition-all"
                title="Abrir WhatsApp oficial"
              >
                <div className="flex items-center gap-1">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </div>
                <span className="text-[10px] opacity-85">1 Tap</span>
              </button>

              {/* Direct Phone Call Button */}
              <button
                type="button"
                onClick={handleDirectPhoneCall}
                className="py-3 px-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-slate-950 font-black text-xs rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer shadow-md shadow-cyan-950/40 active:scale-95 transition-all"
                title="Llamar directamente al cliente"
              >
                <div className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  <span>Llamar</span>
                </div>
                <span className="text-[10px] opacity-85">Llamada</span>
              </button>

              {/* Chat In-App */}
              <button
                type="button"
                onClick={() => handleOpenDriverChat('chat')}
                className="relative py-3 px-2 bg-slate-800 hover:bg-slate-700 hover:scale-[1.02] text-white font-bold text-xs rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all border border-slate-700 shadow-md"
                title="Abrir chat del servicio"
              >
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Chat</span>
                </div>
                <span className="text-[10px] text-slate-400">Mensajes</span>
                {unreadChatCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-rose-600 text-white font-mono font-black text-[10px] flex items-center justify-center shadow-lg shadow-rose-600/50 border-2 border-slate-900 animate-bounce">
                    {unreadChatCount > 9 ? '9+' : unreadChatCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* UBICACIÓN EN EL MAPA (Interactivo con ruta y posición en tiempo real) */}
          <div className="bg-slate-900/95 border border-cyan-500/25 rounded-3xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-400" />
                Ubicación en el Mapa
              </span>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {myActiveOrder.distanceKm.toFixed(1)} km de recorrido
              </span>
            </div>

            <InteractiveMap
              origin={myActiveOrder.origin}
              destination={myActiveOrder.destination}
              driverPosition={myActiveOrder.driverPosition}
              heightClass="h-64 sm:h-72"
            />

            {/* Puntos A & B */}
            <div className="space-y-1.5 text-xs p-3 bg-slate-950 rounded-2xl border border-slate-800">
              <div className="truncate flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-black flex items-center justify-center shrink-0">
                  A
                </span>
                <div className="truncate">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Recogida:</span>
                  <span className="text-white font-bold">{myActiveOrder.origin.name}</span>
                </div>
              </div>
              <div className="truncate flex items-center gap-2 border-t border-slate-800/80 pt-1.5">
                <span className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black flex items-center justify-center shrink-0">
                  B
                </span>
                <div className="truncate">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Entrega:</span>
                  <span className="text-white font-bold">{myActiveOrder.destination.name}</span>
                </div>
              </div>
              <div className="text-slate-300 border-t border-slate-800/80 pt-1.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold mr-1">Detalle:</span>
                {myActiveOrder.itemDescription}
              </div>
            </div>
          </div>

          {/* CONTROL DE RUTA PASO A PASO (CON VENTANA DE CONFIRMACIÓN) */}
          <div className="bg-slate-900/95 border border-cyan-500/30 rounded-3xl p-5 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-cyan-400 block">
                Control de Ruta Paso a Paso:
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Toca para avanzar
              </span>
            </div>

            {/* 4 BOTONES DE ACCIÓN SECUENCIAL DEL REPARTIDOR (ESTADOS ESTÁNDAR FIRESTORE) */}
            {(() => {
              const normStatus = normalizeOrderStatus(myActiveOrder.status);

              return (
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Paso 1: ARRIVED_AT_STORE */}
                  <button
                    type="button"
                    disabled={normStatus !== 'ACCEPTED'}
                    onClick={() => handleInitiateStepTransition('ARRIVED_AT_STORE')}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                      normStatus === 'ACCEPTED'
                        ? 'border-cyan-400 bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-black shadow-lg shadow-cyan-500/30 active:scale-95 cursor-pointer ring-2 ring-cyan-300 animate-pulse'
                        : normStatus !== 'SEARCHING'
                        ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300 opacity-80'
                        : 'opacity-40 border-slate-800 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider block opacity-90 font-mono">Paso 1</span>
                      {normStatus !== 'ACCEPTED' && normStatus !== 'SEARCHING' && (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </div>
                    <span className="text-xs font-bold block leading-tight mt-1">Llegué a la tienda</span>
                  </button>

                  {/* Paso 2: PICKED_UP */}
                  <button
                    type="button"
                    disabled={normStatus !== 'ARRIVED_AT_STORE'}
                    onClick={() => handleInitiateStepTransition('PICKED_UP')}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                      normStatus === 'ARRIVED_AT_STORE'
                        ? 'border-cyan-400 bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-black shadow-lg shadow-cyan-500/30 active:scale-95 cursor-pointer ring-2 ring-cyan-300 animate-pulse'
                        : normStatus === 'PICKED_UP' ||
                          normStatus === 'ARRIVED_AT_DESTINATION' ||
                          normStatus === 'DELIVERED'
                        ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300 opacity-80'
                        : 'opacity-40 border-slate-800 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider block opacity-90 font-mono">Paso 2</span>
                      {(normStatus === 'PICKED_UP' ||
                        normStatus === 'ARRIVED_AT_DESTINATION' ||
                        normStatus === 'DELIVERED') && (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </div>
                    <span className="text-xs font-bold block leading-tight mt-1">Pedido recogido</span>
                  </button>

                  {/* Paso 3: ARRIVED_AT_DESTINATION */}
                  <button
                    type="button"
                    disabled={normStatus !== 'PICKED_UP'}
                    onClick={() => handleInitiateStepTransition('ARRIVED_AT_DESTINATION')}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                      normStatus === 'PICKED_UP'
                        ? 'border-amber-400 bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-400 text-slate-950 font-black shadow-lg shadow-amber-500/30 active:scale-95 cursor-pointer ring-2 ring-amber-300 animate-pulse'
                        : normStatus === 'ARRIVED_AT_DESTINATION' || normStatus === 'DELIVERED'
                        ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300 opacity-80'
                        : 'opacity-40 border-slate-800 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider block opacity-90 font-mono">Paso 3</span>
                      {(normStatus === 'ARRIVED_AT_DESTINATION' || normStatus === 'DELIVERED') && (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </div>
                    <span className="text-xs font-bold block leading-tight mt-1">Afuera en destino</span>
                  </button>

                  {/* Paso 4: DELIVERED */}
                  <button
                    type="button"
                    disabled={normStatus !== 'ARRIVED_AT_DESTINATION'}
                    onClick={() => handleInitiateStepTransition('DELIVERED')}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                      normStatus === 'ARRIVED_AT_DESTINATION'
                        ? 'border-emerald-400 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 font-black shadow-xl shadow-emerald-500/40 active:scale-95 cursor-pointer ring-2 ring-emerald-300 animate-pulse'
                        : normStatus === 'DELIVERED'
                        ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300 opacity-80'
                        : 'opacity-40 border-slate-800 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider block opacity-90 font-mono">Paso 4</span>
                      {normStatus === 'DELIVERED' && (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </div>
                    <span className="text-xs font-bold block leading-tight mt-1">Marcar Entregado</span>
                  </button>
                </div>
              );
            })()}
          </div>

          {/* MENSAJE DE ESPERA DE CONFIRMACIÓN SI YA SE MARCÓ DELIVERED */}
          {normalizeOrderStatus(myActiveOrder.status) === 'DELIVERED' && (
            <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-950/90 to-teal-950/90 border border-emerald-500/50 text-center space-y-2 shadow-xl animate-in zoom-in-95">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-white">¡Entrega Marcada como Completada!</h4>
              <p className="text-xs text-slate-300 max-w-xs mx-auto">
                El cliente ha recibido en su pantalla el modal de confirmación de recepción y valoración.
              </p>
            </div>
          )}

          {/* REGLAS ESTRICTAS DE CANCELACIÓN DE VIAJE PARA EL REPARTIDOR */}
          {(() => {
            const normStatus = normalizeOrderStatus(myActiveOrder.status);
            const isAfterPickup =
              normStatus === 'PICKED_UP' ||
              normStatus === 'ARRIVED_AT_DESTINATION';
            const isPendingRequest =
              myActiveOrder.cancellationRequest?.status === 'pending';
            const isRejectedRequest =
              myActiveOrder.cancellationRequest?.status === 'rejected';

            return (
              <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-4 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-300 block">
                      {isAfterPickup
                        ? 'Cancelación tras recogida (Regla Estricta)'
                        : '¿Inconveniente antes de recoger?'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {isAfterPickup
                        ? 'No puedes cancelar unilateralmente. Debes enviar solicitud al cliente.'
                        : 'Puedes cancelar libremente antes de retirar el pedido del comercio.'}
                    </span>
                  </div>

                  {isAfterPickup ? (
                    <button
                      type="button"
                      disabled={isPendingRequest}
                      onClick={() => setIsCancellationRequestModalOpen(true)}
                      className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md ${
                        isPendingRequest
                          ? 'bg-amber-950/60 border border-amber-500/40 text-amber-300 cursor-not-allowed opacity-80'
                          : 'bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300'
                      }`}
                    >
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      <span>
                        {isPendingRequest ? 'Solicitud Enviada' : 'Pedir Cancelación'}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsCancelModalOpen(true)}
                      className="py-2 px-3.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-300 hover:text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md shadow-rose-950/30"
                    >
                      <XCircle className="w-4 h-4 text-rose-400" />
                      <span>Cancelar servicio</span>
                    </button>
                  )}
                </div>

                {/* Status banner if cancellation request exists */}
                {isAfterPickup && isPendingRequest && (
                  <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 animate-spin shrink-0 text-amber-400" />
                    <span>
                      Solicitud enviada al cliente ({myActiveOrder.clientName}). Esperando que el cliente la autorice o rechace.
                    </span>
                  </div>
                )}

                {isAfterPickup && isRejectedRequest && (
                  <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                    <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>
                      El cliente rechazó la cancelación. Debes continuar con la entrega del pedido hacia el destino.
                    </span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ) : (
        /* ========================================================================= */
        /* RADAR & STANDBY SCREEN (WHEN NO ACTIVE ORDER)                             */
        /* ========================================================================= */
        <>
          {/* STATUS SWITCH */}
          <div className="w-full bg-slate-900/95 rounded-3xl p-5 border border-cyan-500/25 shadow-lg shadow-cyan-950/30 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-cyan-400 block">
                  Valle de la Pascua · Repartidor
                </span>
                <h2 className="text-lg font-black text-white mt-0.5">
                  {isDriverSuspended
                    ? 'CUENTA SUSPENDIDA'
                    : isDriverOnline
                    ? 'DISPONIBLE para servicios'
                    : 'DESCONECTADO'}
                </h2>
              </div>
              <div className="relative flex items-center justify-center">
                {isDriverOnline && !isDriverSuspended && (
                  <span className="absolute w-6 h-6 rounded-full bg-cyan-400/40 animate-ping" />
                )}
                <span
                  className={`w-4 h-4 rounded-full ${
                    isDriverSuspended
                      ? 'bg-rose-500'
                      : isDriverOnline
                      ? 'bg-cyan-400'
                      : 'bg-slate-700'
                  }`}
                />
              </div>
            </div>

            {/* Tactile Switch Button */}
            <button
              type="button"
              disabled={isDriverSuspended}
              onClick={() => {
                if (isDriverSuspended) {
                  alert('Tu cuenta se encuentra suspendida por la administración.');
                  return;
                }
                setIsDriverOnline(!isDriverOnline);
              }}
              className={`w-full py-4 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-md ${
                isDriverSuspended
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700 opacity-60'
                  : isDriverOnline
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 shadow-cyan-500/25 active:scale-98'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 active:scale-98 border border-slate-700'
              }`}
            >
              <Power className="w-5 h-5" />
              <span>
                {isDriverSuspended
                  ? 'CUENTA INHABILITADA'
                  : isDriverOnline
                  ? 'Toca para DESCONECTARSE'
                  : 'Toca para ACTIVARSE (DISPONIBLE)'}
              </span>
            </button>
          </div>

          {/* REAL PENDING ORDERS IN RADAR (DIRECT ACCEPTANCE WITHOUT SIMULATION) */}
          {isDriverOnline && !isDriverSuspended && pendingOrders.length > 0 && (
            <div className="space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
                ¡Solicitudes Disponibles en Radar ({pendingOrders.length})!
              </span>

              {pendingOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-4 bg-gradient-to-r from-slate-950 to-slate-900 border-2 border-emerald-400/60 rounded-3xl shadow-xl space-y-3 animate-in fade-in zoom-in-95"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-black text-white bg-emerald-950 px-2.5 py-1 rounded-xl border border-emerald-500/40">
                      #{ord.id}
                    </span>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Ganancia
                      </span>
                      <span className="text-xl font-black font-mono text-emerald-400">
                        ${ord.driverNetEarningsUSD.toFixed(2)} USD
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-300">
                    <div className="truncate">
                      <span className="text-cyan-400 font-bold mr-1">Recogida:</span>
                      {ord.origin.name}
                    </div>
                    <div className="truncate">
                      <span className="text-blue-400 font-bold mr-1">Entrega:</span>
                      {ord.destination.name}
                    </div>
                    <div className="truncate text-slate-400 text-[11px]">
                      {ord.itemDescription} · {ord.distanceKm.toFixed(1)} km
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => acceptIncomingOrder(ord.id)}
                    className="w-full py-3 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-black text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/30 active:scale-95 transition-all"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>¡Aceptar Servicio Ahora!</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* RADAR SCREEN VISUAL */}
          {(!isDriverOnline || pendingOrders.length === 0) && (
            <div className="bg-slate-900/90 rounded-3xl p-6 border border-cyan-500/20 text-center space-y-4 shadow-lg shadow-cyan-950/20">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                {isDriverOnline && (
                  <span className="absolute inset-0 rounded-full border-2 border-cyan-400/40 animate-ping" />
                )}
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                    isDriverOnline
                      ? 'bg-cyan-950/70 text-cyan-400 border border-cyan-500/40'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  <Navigation className="w-8 h-8" />
                </div>
              </div>

              <div>
                <h3 className="text-base font-black text-white">
                  {isDriverOnline ? 'Radar Activo en Valle de la Pascua' : 'Repartidor Desconectado'}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                  {isDriverOnline
                    ? `Prioridad actual: ${perfInfo.label} (${perfInfo.delaySeconds}s de retraso de alerta). El radar sonará automáticamente cuando un cliente solicite un servicio.`
                    : 'Activa el interruptor superior para comenzar a recibir solicitudes en tu zona.'}
                </p>
              </div>
            </div>
          )}

          {/* RENDIMIENTO DEL REPARTIDOR Y ESTADÍSTICAS REALES */}
          <div className="bg-slate-900/95 rounded-3xl p-5 border border-cyan-500/25 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                  Rendimiento y Calificación
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-3.5 h-3.5 rounded-full ${perfInfo.dotClass} animate-pulse`} />
                  <h3 className="text-base font-black text-white">{perfInfo.label}</h3>
                  <span className="text-xs font-mono font-black text-amber-400 bg-amber-950/70 border border-amber-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {driverRating.toFixed(1)} ★
                  </span>
                </div>
              </div>

              {/* Tier Badge */}
              <div className={`px-3 py-1.5 rounded-2xl border text-xs font-black flex items-center gap-1.5 ${perfInfo.badgeClass}`}>
                <span>
                  {perfInfo.tier === 'green'
                    ? '🟢 Tier Verde'
                    : perfInfo.tier === 'yellow'
                    ? '🟡 Tier Amarillo'
                    : '🔴 Tier Rojo'}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs flex items-start gap-2.5">
              <Award className={`w-4 h-4 shrink-0 mt-0.5 ${perfInfo.colorClass}`} />
              <div className="text-slate-300 space-y-0.5">
                <span className="font-bold text-white block">{perfInfo.description}</span>
                <span className="text-[11px] text-slate-400">
                  {perfInfo.tier === 'green'
                    ? 'Calificación 4.5 a 5.0 ★: Alertas instantáneas (0s de retraso).'
                    : perfInfo.tier === 'yellow'
                    ? 'Calificación 3.5 a 4.4 ★: Alertas con retraso (+3s).'
                    : 'Calificación menor a 3.5 ★: Alertas con retraso (+6s).'}
                </span>
              </div>
            </div>

            {/* 4 ACCUMULATED DRIVER METRICS */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {/* Km Acumulados */}
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Km Acumulados
                  </span>
                  <Milestone className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-xl font-black text-white font-mono tabular-nums">
                  {driverStats.accumulatedKm.toFixed(1)} <span className="text-xs font-normal text-slate-400">km</span>
                </div>
                <span className="text-[10px] text-cyan-400 font-bold block">
                  Recorrido total
                </span>
              </div>

              {/* Viajes Semana */}
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Viajes Semana
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="text-xl font-black text-white font-mono tabular-nums">
                  {driverStats.weeklyCompletedTrips} <span className="text-xs font-normal text-slate-400">viajes</span>
                </div>
                <span className="text-[10px] text-blue-400 font-bold block">
                  Concretados semana
                </span>
              </div>

              {/* Ganancias Semana */}
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Ganancias Semana
                  </span>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-xl font-black text-emerald-400 font-mono tabular-nums">
                  ${driverStats.weeklyEarningsUSD.toFixed(2)}
                </div>
                <span className="text-[10px] text-slate-400 font-medium block">
                  Semana en curso
                </span>
              </div>

              {/* Ganancias del Mes */}
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Ganancias Mes
                  </span>
                  <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-xl font-black text-cyan-300 font-mono tabular-nums">
                  ${driverStats.monthlyEarningsUSD.toFixed(2)}
                </div>
                <span className="text-[10px] text-slate-400 font-medium block">
                  Total mes
                </span>
              </div>
            </div>
          </div>

          {/* HISTORIAL DE ENTREGAS COMPLETADAS DEL REPARTIDOR */}
          {myCompletedOrders.length > 0 && (
            <div className="bg-slate-900/90 rounded-3xl p-4 border border-slate-800 space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                Mis Entregas Concretadas ({myCompletedOrders.length})
              </span>
              <div className="space-y-2">
                {myCompletedOrders.slice(0, 5).map((ord) => (
                  <div
                    key={ord.id}
                    className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-black text-white block">#{ord.id}</span>
                      <span className="text-[11px] text-slate-400 block truncate max-w-[180px]">
                        {ord.destination.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-emerald-400 block">
                        +${ord.driverNetEarningsUSD.toFixed(2)} USD
                      </span>
                      <span className="text-[10px] font-bold text-emerald-300">Entregado</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* VENTANA MODAL DE CONFIRMACIÓN DE PASO (RECOGIDA, EN CAMINO, LLEGADA)      */}
      {/* ========================================================================= */}
      {stepConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-[94%] max-w-sm mx-auto bg-slate-900 rounded-3xl shadow-2xl border-2 border-cyan-400/80 overflow-hidden space-y-4 p-5 animate-in zoom-in-95 duration-200">
            {/* Header Badge */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-xl bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                {stepConfirmModal.badge}
              </span>
              <button
                type="button"
                onClick={() => setStepConfirmModal(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Icon & Title */}
            <div className="text-center space-y-2 py-1">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-teal-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center mx-auto shadow-lg shadow-cyan-950/50">
                {stepConfirmModal.iconType === 'shop' ? (
                  <MapPin className="w-8 h-8 text-cyan-400" />
                ) : stepConfirmModal.iconType === 'pickup' ? (
                  <Package className="w-8 h-8 text-teal-400" />
                ) : stepConfirmModal.iconType === 'way' ? (
                  <Navigation className="w-8 h-8 text-blue-400" />
                ) : (
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                )}
              </div>

              <h3 className="text-base font-black text-white px-2">
                {stepConfirmModal.title}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed px-2">
                {stepConfirmModal.description}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStepConfirmModal(null)}
                className="py-3 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-2xl cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmStepExecution}
                className="py-3 px-3 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-black text-xs rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Confirmar Acción</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL ALERTA DE PEDIDO ENTRANTE CON TIEMPO EXACTO DE 10 SEGUNDOS          */}
      {/* ========================================================================= */}
      {incomingOrderAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-sm animate-in zoom-in-95 duration-200">
          <div className="w-[94%] max-w-sm mx-auto bg-slate-900 rounded-3xl shadow-2xl border-2 border-cyan-400 overflow-hidden">
            {/* Header with 10s countdown */}
            <div className="bg-cyan-500 p-4 text-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-950 animate-ping" />
                <h3 className="text-sm font-black tracking-tight">¡Nueva Solicitud en Radar!</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase">Límite:</span>
                <div className="w-8 h-8 rounded-full bg-slate-950 text-cyan-300 flex items-center justify-center font-mono font-black text-xs ring-2 ring-slate-950">
                  {alertSecondsLeft}s
                </div>
              </div>
            </div>

            {/* Countdown animated progress bar */}
            <div className="w-full bg-slate-950 h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all duration-1000 ease-linear"
                style={{ width: `${(alertSecondsLeft / 10) * 100}%` }}
              />
            </div>

            <div className="p-4 space-y-4">
              {/* Priority Tier Indicator Badge */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      incomingOrderAlert.tier === 'green'
                        ? 'bg-emerald-400'
                        : incomingOrderAlert.tier === 'yellow'
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                    }`}
                  />
                  <span className="text-[11px] font-bold text-white">
                    {incomingOrderAlert.tier === 'green'
                      ? 'Despacho Inmediato (0s desfase)'
                      : incomingOrderAlert.tier === 'yellow'
                      ? 'Despacho Regular (+3s desfase)'
                      : 'Despacho con Desfase (+6s)'}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-md ${
                    incomingOrderAlert.tier === 'green'
                      ? 'bg-emerald-950 text-emerald-300'
                      : incomingOrderAlert.tier === 'yellow'
                      ? 'bg-amber-950 text-amber-300'
                      : 'bg-rose-950 text-rose-300'
                  }`}
                >
                  {incomingOrderAlert.tierLabel}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-center">
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Distancia</span>
                  <div className="text-xl font-black text-white font-mono mt-0.5">
                    {incomingOrderAlert.order.distanceKm.toFixed(1)} km
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-cyan-950/70 border border-cyan-500/40">
                  <span className="text-[10px] font-bold text-cyan-300 uppercase block">Ganancia Neta</span>
                  <div className="text-xl font-black text-cyan-400 font-mono tabular-nums mt-0.5">
                    ${incomingOrderAlert.order.driverNetEarningsUSD.toFixed(2)} USD
                  </div>
                </div>
              </div>

              {/* Route details */}
              <div className="space-y-1.5 text-xs p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <div className="truncate">
                  <span className="text-cyan-400 font-black mr-1">Recogida:</span>
                  <span className="font-bold text-white">{incomingOrderAlert.order.origin.name}</span>
                </div>
                <div className="truncate border-t border-slate-800 pt-1.5">
                  <span className="text-blue-400 font-black mr-1">Entrega:</span>
                  <span className="font-bold text-white">{incomingOrderAlert.order.destination.name}</span>
                </div>
                <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-1.5 truncate">
                  Contenido: {incomingOrderAlert.order.itemDescription}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => rejectIncomingOrder(incomingOrderAlert.order.id)}
                  className="py-3 bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Rechazar</span>
                </button>
                <button
                  type="button"
                  onClick={() => acceptIncomingOrder(incomingOrderAlert.order.id)}
                  className="py-3 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-black rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Aceptar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MINICHAT DRAWER */}
      {myActiveOrder && (
        <ChatDrawer
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          order={myActiveOrder}
          initialTab={chatInitialTab}
        />
      )}

      {/* CANCEL SERVICE MODAL FOR DRIVER (PRE-PICKUP DIRECT CANCELLATION) */}
      {myActiveOrder && (
        <CancelOrderModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          onConfirmCancel={(reason) => {
            cancelOrder(myActiveOrder.id, 'Repartidor', reason);
            setIsCancelModalOpen(false);
          }}
          orderId={myActiveOrder.id}
          userRole="Repartidor"
        />
      )}

      {/* REQUEST CANCELLATION TO CLIENT (POST-PICKUP STRICT RULE) */}
      {myActiveOrder && (
        <DriverCancellationRequestModal
          isOpen={isCancellationRequestModalOpen}
          onClose={() => setIsCancellationRequestModalOpen(false)}
          orderId={myActiveOrder.id}
          clientName={myActiveOrder.clientName}
          onRequestSubmit={(reason) => {
            requestDriverCancellation(myActiveOrder.id, reason);
          }}
        />
      )}
    </div>
  );
};
