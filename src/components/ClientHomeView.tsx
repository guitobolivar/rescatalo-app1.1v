import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  MapPin,
  Sparkles,
  HelpCircle,
  Megaphone,
  ArrowRight,
  ShieldCheck,
  Bike,
  Package,
  Navigation,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { YellowMotoTaxiIcon, DeliveryBagIcon, MotoPassengerIcon, MotoDeliveryIcon } from './ServiceIcons';
import { GuideModal } from './GuideModal';

interface ClientHomeViewProps {
  onSelectService: (serviceId: 'rescate_moto' | 'rescate_delivery') => void;
  onGoToTracking: () => void;
}

export const ClientHomeView: React.FC<ClientHomeViewProps> = ({
  onSelectService,
  onGoToTracking,
}) => {
  const { currentUser, announcement, activeOrder, orders } = useApp();
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Check if current user has an active ongoing order
  const clientOrders = orders.filter((o) => o.clientId === currentUser?.id);
  const clientActiveOrder =
    activeOrder && activeOrder.clientId === currentUser?.id
      ? activeOrder
      : clientOrders.find(
          (o) => o.status !== 'Entregado' && o.status !== 'Cancelado'
        ) || null;

  return (
    <div className="w-full flex-1 flex flex-col space-y-4 pb-24 animate-in fade-in duration-200">
      {/* 1. TOP ELEGANT WELCOME CARD (PERSONALIZED WITH USER NAME) */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-slate-900/90 via-[#0b111e]/95 to-slate-900/90 border border-cyan-500/25 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-emerald-400 p-[2px] shadow-lg shadow-cyan-500/25 shrink-0">
            <div className="w-full h-full bg-[#070b14] rounded-[14px] flex items-center justify-center font-black text-lg text-cyan-300 font-mono">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'R'}
            </div>
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 block font-mono">
              ¡Bienvenido a Rescátalo!
            </span>
            <h2 className="text-base font-black text-white truncate leading-tight">
              {currentUser?.name || 'Usuario'}
            </h2>
            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
              Valle de la Pascua, Guárico
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            En Línea
          </span>
        </div>
      </div>

      {/* 2. ONGOING ORDER QUICK ACCESS BANNER (IF ACTIVE ORDER EXISTS) */}
      {clientActiveOrder && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 border border-emerald-500/40 shadow-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <Navigation className="w-5 h-5 animate-spin" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 font-mono">
                  Servicio Activo #{clientActiveOrder.id}
                </span>
              </div>
              <h4 className="text-xs font-black text-white truncate mt-0.5">
                {clientActiveOrder.status}
              </h4>
              <p className="text-[11px] text-slate-300 truncate">
                Destino: {clientActiveOrder.destination.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onGoToTracking}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shrink-0 flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/25 transition-all active:scale-95"
          >
            <span>Ver Mapa</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. EDITABLE INFORMATIONAL / PROMOTIONAL BANNER (FROM MODERATOR PANEL) */}
      {announcement?.enabled && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-cyan-950/60 via-slate-900/90 to-blue-950/60 border border-cyan-500/35 shadow-xl space-y-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/35 font-mono">
                {announcement.badge || 'COMUNICADO'}
              </span>
              <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Aviso Oficial de Moderación
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black text-white leading-tight">
              {announcement.title}
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {announcement.message}
            </p>
          </div>
        </div>
      )}

      {/* 4. CREATIVE BUTTON: "GUÍA DE USO / ¿CÓMO USAR LA APP?" */}
      <button
        type="button"
        onClick={() => setIsGuideOpen(true)}
        className="w-full p-4 rounded-3xl bg-gradient-to-r from-slate-900 via-[#0e1628] to-slate-900 hover:from-slate-800 hover:to-slate-850 border border-cyan-500/40 hover:border-cyan-400 text-left transition-all cursor-pointer group shadow-xl shadow-cyan-950/40 active:scale-[0.99] relative overflow-hidden"
      >
        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-cyan-500/20 transition-colors" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500/25 to-blue-500/20 text-cyan-300 border border-cyan-400/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-md">
              <HelpCircle className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 block font-mono">
                Instructivo Interactivo
              </span>
              <h3 className="text-sm font-black text-white group-hover:text-cyan-300 transition-colors leading-tight">
                Guía de uso / ¿Cómo usar la app?
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Aprende el paso a paso para viajes, envíos y tarifas en tiempo real
              </p>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-slate-950 border border-slate-800 text-slate-400 group-hover:text-cyan-300 group-hover:border-cyan-500/40 flex items-center justify-center shrink-0 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </button>

      {/* 5. HERO CALL TO ACTION / HOW TO START SERVICE */}
      <div className="p-5 rounded-3xl bg-gradient-to-b from-slate-900/90 to-[#0b111e]/90 border border-slate-800 shadow-xl space-y-3.5 text-center">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto shadow-md">
          <Sparkles className="w-6 h-6 text-cyan-400" />
        </div>

        <div>
          <h3 className="text-sm font-black text-white">
            ¿A dónde deseas ir o qué deseas enviar?
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            Inicia tu solicitud tocando el botón central de <strong>Rescátalo</strong> en la barra inferior o elige una categoría directa abajo:
          </p>
        </div>

        {/* 2 Quick Direct Shortcuts */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => onSelectService('rescate_moto')}
            className="p-3.5 rounded-2xl bg-slate-950 hover:bg-slate-900 border border-yellow-400/50 hover:border-yellow-300 text-left transition-all cursor-pointer group active:scale-95 shadow-md shadow-yellow-950/20"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-yellow-300 flex items-center justify-center p-1 border border-yellow-500/30">
                <YellowMotoTaxiIcon size={24} />
              </div>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-yellow-950 text-yellow-300 border border-yellow-500/30">
                10-15 min
              </span>
            </div>
            <h4 className="text-xs font-black text-white group-hover:text-yellow-300 transition-colors">
              Rescátalo Moto Taxi
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Moto Taxi divertido & rápido
            </p>
          </button>

          <button
            type="button"
            onClick={() => onSelectService('rescate_delivery')}
            className="p-3.5 rounded-2xl bg-slate-950 hover:bg-slate-900 border border-emerald-500/50 hover:border-emerald-300 text-left transition-all cursor-pointer group active:scale-95 shadow-md shadow-emerald-950/20"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center p-1 border border-emerald-500/30">
                <DeliveryBagIcon size={24} />
              </div>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                10-15 min
              </span>
            </div>
            <h4 className="text-xs font-black text-white group-hover:text-emerald-300 transition-colors">
              Rescátalo Mandados
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Compras & Mandados seguros
            </p>
          </button>
        </div>
      </div>

      {/* 6. TRUST & COVERAGE BADGE */}
      <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Cobertura Total Valle de la Pascua</span>
        </span>
        <span className="text-[10px] font-mono text-cyan-400 font-bold">
          Guárico, VE
        </span>
      </div>

      {/* Guide Modal */}
      <GuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onStartService={(id) => {
          setIsGuideOpen(false);
          onSelectService(id);
        }}
      />
    </div>
  );
};
