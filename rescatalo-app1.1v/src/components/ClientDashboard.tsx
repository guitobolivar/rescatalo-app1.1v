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
import { CancelOrderModal } from './CancelOrderModal';
import { ReportDriverModal } from './ReportDriverModal';
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
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);

  // Real-time step change notification toast for client
  const [stepNotification, setStepNotification] = useState<{
    title: string;
    description: string;
    type: 'assigned' | 'shop' | 'picked' | 'way' | 'delivered';
  } | null>(null);

  const prevStatusRef = useRef<string | null>(null);

  // Filter client orders strictly for current user or current active device session
  const clientActiveOrderId = typeof window !== 'undefined' ? localStorage.getItem('rescatalo_client_active_order_id') : null;
  const clientOrders = orders.filter((o) => o.clientId === currentUser?.id || o.id === clientActiveOrderId);

  const clientActiveOrder =
    (clientActiveOrderId
      ? orders.find((o) => o.id === clientActiveOrderId && o.status !== 'Entregado' && o.status !== 'Cancelado')
      : null) ||
    (activeOrder && (activeOrder.clientId === currentUser?.id || activeOrder.id === clientActiveOrderId) && activeOrder.status !== 'Entregado' && activeOrder.status !== 'Cancelado'
      ? activeOrder
      : null) ||
    clientOrders.find((o) => o.status !== 'Entregado' && o.status !== 'Cancelado') ||
    null;

  // Clean active order state when order is delivered or finished
  useEffect(() => {
    if (clientActiveOrder && clientActiveOrder.status === 'Entregado') {
      clearActiveOrderState();
      setStepNotification(null);
    }
  }, [clientActiveOrder?.status, clearActiveOrderState]);

  // Listen for real-time status transitions made by driver
  useEffect(() => {
    if (!clientActiveOrder) {
      prevStatusRef.current = null;
      return;
    }

    const currentStatus = clientActiveOrder.status;
    const prevStatus = prevStatusRef.current;

    if (prevStatus && prevStatus !== currentStatus) {
      if (currentStatus === 'Repartidor asignado') {
        setStepNotification({
          title: '¡Repartidor Asignado!',
          description: `${clientActiveOrder.driverName || 'Tu repartidor'} ha aceptado tu servicio y viene en camino.`,
          type: 'assigned',
        });
        playAlertChime('accepted');
      } else if (currentStatus === 'Llegué al comercio') {
        setStepNotification({
          title: '📍 ¡Repartidor en el Comercio / Punto!',
          description: `${clientActiveOrder.driverName || 'El repartidor'} ha llegado al lugar de recogida.`,
          type: 'shop',
        });
        playAlertChime('tap');
      } else if (currentStatus === 'Pedido recogido') {
        setStepNotification({
          title: '📦 ¡Pedido Recogido!',
          description: 'Tu pedido ya fue recogido e introducido en la maleta.',
          type: 'picked',
        });
        playAlertChime('tap');
      } else if (currentStatus === 'En camino') {
        setStepNotification({
          title: '🛵 ¡Repartidor en Camino!',
          description: 'El repartidor ya va en ruta directa hacia tu ubicación de entrega.',
          type: 'way',
        });
        playAlertChime('tap');
      } else if (currentStatus === 'Entregado') {
        setStepNotification({
          title: '🎉 ¡Servicio Entregado con Éxito!',
          description: 'Tu pedido ha llegado a su destino final.',
          type: 'delivered',
        });
        playAlertChime('delivered');
      }

      const timer = setTimeout(() => {
        setStepNotification(null);
      }, 7000);

      prevStatusRef.current = currentStatus;
      return () => clearTimeout(timer);
    }

    prevStatusRef.current = currentStatus;
  }, [clientActiveOrder?.status, clientActiveOrder?.driverName]);

  // Rating modal upon delivery: check current active order or any unrated delivered order
  const orderNeedingRating =
    clientActiveOrder &&
    clientActiveOrder.status === 'Entregado' &&
    !clientActiveOrder.ratingGiven
      ? clientActiveOrder
      : orders.find(
          (o) =>
            o.clientId === currentUser?.id &&
            o.status === 'Entregado' &&
            !o.ratingGiven
        ) || null;

  useEffect(() => {
    if (orderNeedingRating) {
      setIsRatingModalOpen(true);
    }
  }, [orderNeedingRating?.id, orderNeedingRating?.status, orderNeedingRating?.ratingGiven]);

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
                      {clientActiveOrder.status}
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-mono text-xs font-black">
                    #{clientActiveOrder.id}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 transition-all duration-500"
                    style={{
                      width:
                        clientActiveOrder.status === 'Buscando repartidor'
                          ? '20%'
                          : clientActiveOrder.status === 'Repartidor asignado'
                          ? '40%'
                          : clientActiveOrder.status === 'Llegué al comercio'
                          ? '60%'
                          : clientActiveOrder.status === 'Pedido recogido'
                          ? '75%'
                          : clientActiveOrder.status === 'En camino'
                          ? '90%'
                          : '100%',
                    }}
                  />
                </div>
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
                      onClick={() => {
                        setChatInitialTab('call');
                        setIsChatOpen(true);
                      }}
                      className="py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95 transition-all"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Llamar Repartidor</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setChatInitialTab('chat');
                        setIsChatOpen(true);
                      }}
                      className="py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all border border-slate-700"
                    >
                      <MessageSquare className="w-4 h-4 text-cyan-400" />
                      <span>Abrir Chat</span>
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
        />
      )}

      {/* RATING MODAL */}
      {orderNeedingRating && (
        <RatingModal
          isOpen={isRatingModalOpen}
          order={orderNeedingRating}
          onClose={() => {
            setIsRatingModalOpen(false);
            clearActiveOrderState();
            setClientView('home');
          }}
        />
      )}

      {/* CANCEL ORDER CONFIRMATION MODAL */}
      {clientActiveOrder && (
        <CancelOrderModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          onConfirmCancel={(reason) => {
            cancelOrder(clientActiveOrder.id, 'Cliente', reason);
            clearActiveOrderState();
            setClientView('home');
            setIsCancelModalOpen(false);
          }}
          orderId={clientActiveOrder.id}
          userRole="Cliente"
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
