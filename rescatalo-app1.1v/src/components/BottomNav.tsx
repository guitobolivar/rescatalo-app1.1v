import React, { useState } from 'react';
import { Home, User, X, Sparkles } from 'lucide-react';
import { RescataloLogo } from './RescataloLogo';
import { MotoPassengerIcon, MotoDeliveryIcon } from './ServiceIcons';

interface BottomNavProps {
  currentView: 'home' | 'service' | 'profile' | 'tracking';
  onNavigate: (view: 'home' | 'profile') => void;
  onSelectService: (serviceId: 'rescate_moto' | 'rescate_delivery') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  onNavigate,
  onSelectService,
}) => {
  const [isFanOpen, setIsFanOpen] = useState(false);

  const handleToggleFan = () => {
    setIsFanOpen((prev) => !prev);
  };

  const handleSelect = (serviceId: 'rescate_moto' | 'rescate_delivery') => {
    setIsFanOpen(false);
    onSelectService(serviceId);
  };

  return (
    <>
      {/* Backdrop listener to close fan menu when tapping outside */}
      {isFanOpen && (
        <div
          onClick={() => setIsFanOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* FLOATING FAN-OUT MENU (SIN TARIFAS NI DISTANCIAS PREVIAS SEGÚN REQUERIMIENTO) */}
      <div
        className={`fixed bottom-24 left-0 right-0 z-50 w-full max-w-md mx-auto px-4 transition-all duration-300 transform ${
          isFanOpen
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto visible'
            : 'opacity-0 translate-y-6 scale-95 pointer-events-none invisible'
        }`}
      >
        <div className="bg-gradient-to-b from-slate-900/95 via-[#0b111e]/98 to-slate-950/98 backdrop-blur-2xl border border-cyan-500/35 rounded-3xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85)] shadow-cyan-950/70 space-y-3">
          {/* Header pill with visible 'X' close button */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              Selecciona tu Categoría
            </span>
            <button
              type="button"
              onClick={() => setIsFanOpen(false)}
              aria-label="Cerrar menú"
              className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 2 Shortcuts: Moto & Delivery (ÚNICAMENTE botones/nombres, SIN precios previos) */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* 1. Rescátalo Moto */}
            <button
              type="button"
              onClick={() => handleSelect('rescate_moto')}
              className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/50 hover:border-emerald-400 text-left transition-all duration-200 cursor-pointer active:scale-95 group relative overflow-hidden shadow-lg shadow-emerald-950/30"
            >
              <div className="flex items-start justify-between gap-1 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500/30 to-teal-400/20 text-emerald-300 border border-emerald-400/40 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <MotoPassengerIcon size={22} />
                </div>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                  10-15 min
                </span>
              </div>

              <div>
                <h4 className="text-sm font-black text-white group-hover:text-emerald-300 transition-colors leading-tight">
                  Rescátalo Moto
                </h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                  Transporte & Taxi rápido (1 pasajero)
                </p>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center text-[10px] font-bold text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                <span>Trazar ruta en mapa →</span>
              </div>
            </button>

            {/* 2. Rescátalo Delivery */}
            <button
              type="button"
              onClick={() => handleSelect('rescate_delivery')}
              className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-950/60 via-slate-900 to-slate-950 border border-cyan-500/50 hover:border-cyan-400 text-left transition-all duration-200 cursor-pointer active:scale-95 group relative overflow-hidden shadow-lg shadow-cyan-950/30"
            >
              <div className="flex items-start justify-between gap-1 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/30 to-blue-500/20 text-cyan-300 border border-cyan-400/40 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <MotoDeliveryIcon size={22} />
                </div>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                  10-15 min
                </span>
              </div>

              <div>
                <h4 className="text-sm font-black text-white group-hover:text-cyan-300 transition-colors leading-tight">
                  Rescátalo Delivery
                </h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                  Envíos, Compras y Encomiendas
                </p>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center text-[10px] font-bold text-cyan-400 group-hover:translate-x-0.5 transition-transform">
                <span>Trazar ruta en mapa →</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* FLOATING GLASSMORPHISM BOTTOM NAVIGATION BAR */}
      <div className="fixed bottom-3 left-0 right-0 z-40 w-full max-w-md mx-auto px-4 pointer-events-none">
        <nav className="pointer-events-auto bg-[#0b111e]/90 backdrop-blur-2xl border border-cyan-500/30 rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.75)] shadow-cyan-950/40 px-6 py-2 flex items-center justify-between relative">
          {/* LADO IZQUIERDO: Ícono de 'Casita' (Home) */}
          <button
            type="button"
            onClick={() => {
              setIsFanOpen(false);
              onNavigate('home');
            }}
            className="flex flex-col items-center justify-center py-1 px-3 group cursor-pointer transition-all active:scale-90"
            title="Pantalla de Inicio"
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                currentView === 'home'
                  ? 'text-cyan-400 bg-cyan-500/15'
                  : 'text-slate-400 group-hover:text-white'
              }`}
            >
              <Home className="w-5 h-5" />
            </div>
            <span
              className={`text-[10px] font-bold mt-0.5 tracking-tight transition-colors ${
                currentView === 'home' ? 'text-cyan-400' : 'text-slate-400'
              }`}
            >
              Inicio
            </span>
            {/* Indicador activo */}
            {currentView === 'home' && (
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] mt-0.5" />
            )}
          </button>

          {/* CENTRO: Botón circular prominente y flotante con el logo oficial de Rescátalo */}
          <div className="relative -top-5 flex flex-col items-center">
            {/* Animated neon ring / glow */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500 via-teal-400 to-emerald-400 blur-md opacity-75 animate-pulse" />

            <button
              type="button"
              onClick={handleToggleFan}
              aria-expanded={isFanOpen}
              aria-label="Abrir menú de servicios Rescátalo"
              className={`relative w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-500 via-teal-400 to-emerald-400 p-[2.5px] shadow-[0_0_25px_rgba(6,182,212,0.65)] hover:shadow-[0_0_35px_rgba(6,182,212,0.9)] transition-all duration-300 cursor-pointer active:scale-95 flex items-center justify-center ${
                isFanOpen ? 'rotate-45 scale-105' : 'hover:scale-105'
              }`}
            >
              <div className="w-full h-full bg-[#070b14] rounded-full flex items-center justify-center overflow-hidden">
                {isFanOpen ? (
                  <X className="w-7 h-7 text-cyan-300 -rotate-45 transition-transform" />
                ) : (
                  <RescataloLogo size="sm" />
                )}
              </div>
            </button>

            <span className="text-[9px] font-black uppercase tracking-wider text-cyan-300 mt-1 drop-shadow-sm font-mono">
              {isFanOpen ? 'Cerrar' : 'Pedir'}
            </span>
          </div>

          {/* LADO DERECHO: Ícono de 'Silueta de persona' (Perfil) */}
          <button
            type="button"
            onClick={() => {
              setIsFanOpen(false);
              onNavigate('profile');
            }}
            className="flex flex-col items-center justify-center py-1 px-3 group cursor-pointer transition-all active:scale-90"
            title="Mi Perfil"
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                currentView === 'profile'
                  ? 'text-cyan-400 bg-cyan-500/15'
                  : 'text-slate-400 group-hover:text-white group-hover:bg-slate-800/60'
              }`}
            >
              <User className="w-5 h-5" />
            </div>
            <span
              className={`text-[10px] font-bold mt-0.5 tracking-tight transition-colors ${
                currentView === 'profile' ? 'text-cyan-400' : 'text-slate-400'
              }`}
            >
              Perfil
            </span>
            {/* Indicador activo */}
            {currentView === 'profile' && (
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] mt-0.5" />
            )}
          </button>
        </nav>
      </div>
    </>
  );
};
