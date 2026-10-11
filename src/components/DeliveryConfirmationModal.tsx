import React, { useState, useEffect } from 'react';
import { Order } from '../types';
import { CheckCircle2, AlertCircle, PackageCheck, Check, X } from 'lucide-react';

interface DeliveryConfirmationModalProps {
  order: Order;
  isOpen: boolean;
  onConfirmReception: () => void;
  onReportProblem?: () => void;
}

export const DeliveryConfirmationModal: React.FC<DeliveryConfirmationModalProps> = ({
  order,
  isOpen,
  onConfirmReception,
  onReportProblem,
}) => {
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showSuccessModal) {
      setCountdown(5);
      timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            onConfirmReception();
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showSuccessModal, onConfirmReception]);

  if (!isOpen) return null;

  const handleInitialConfirm = () => {
    setShowSuccessModal(true);
  };

  const handleFinishEarly = () => {
    setShowSuccessModal(false);
    onConfirmReception();
  };

  if (showSuccessModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
        <div className="w-[92%] max-w-sm mx-auto bg-slate-900 border-2 border-emerald-400 rounded-3xl p-6 text-center shadow-2xl shadow-emerald-500/30 space-y-4 animate-in zoom-in-95 duration-200 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Close early button */}
          <button
            type="button"
            onClick={handleFinishEarly}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-950 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Cerrar ahora"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Large Green Checkmark */}
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30 animate-in zoom-in-50 duration-300">
            <Check className="w-12 h-12 stroke-[3.5] animate-bounce" />
          </div>

          <div>
            <span className="text-[10px] font-mono font-black uppercase tracking-widest text-emerald-400 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40">
              ¡Recepción Confirmada!
            </span>
            <h3 className="text-xl font-black text-white mt-2 leading-tight">
              ¡Entrega Confirmada con Éxito!
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Has verificado la recepción de tu servicio correctamente.
            </p>
          </div>

          {/* 5-second countdown progress bar */}
          <div className="space-y-1.5 pt-2">
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-emerald-400 transition-all duration-1000 ease-linear"
                style={{ width: `${(countdown / 5) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Se cerrará automáticamente en:</span>
              <strong className="text-emerald-400 font-bold">{countdown}s</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFinishEarly}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-2xl cursor-pointer shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
          >
            Continuar a Calificar Ahora
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-[94%] max-w-sm mx-auto bg-slate-900 border-2 border-emerald-500/50 rounded-3xl shadow-2xl shadow-emerald-950/60 overflow-hidden transform animate-in zoom-in-95 duration-200">
        {/* Luminous Header */}
        <div className="bg-gradient-to-r from-emerald-950/90 via-slate-900 to-teal-950/90 p-5 text-center relative border-b border-emerald-500/30">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 mx-auto mb-3 shadow-lg shadow-emerald-500/30">
            <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center text-emerald-400">
              <PackageCheck className="w-9 h-9" />
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-widest font-mono font-bold text-emerald-400 bg-emerald-950/90 px-3 py-1 rounded-full border border-emerald-500/40">
            Llegada Confirmada por Repartidor
          </span>
          <h3 className="text-lg font-black text-white mt-2 leading-tight">
            ¿Recibiste tu pedido correctamente?
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            Tu repartidor ha marcado la orden <span className="font-mono font-bold text-emerald-400">#{order.id}</span> como entregada en tu destino.
          </p>
        </div>

        {/* Content Details */}
        <div className="p-5 space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
            <img
              src={
                order.driverAvatar ||
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
              }
              alt={order.driverName || 'Repartidor'}
              className="w-12 h-12 rounded-xl object-cover border border-emerald-500/40 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-slate-400 font-mono block">Repartidor Asignado:</span>
              <h4 className="text-sm font-black text-white truncate">
                {order.driverName || 'Repartidor Rescátalo'}
              </h4>
              <span className="text-xs text-emerald-400 font-mono font-bold">
                {order.serviceType || 'Rescátalo Express'} · Valle de la Pascua
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 space-y-1">
            <div className="flex justify-between">
              <span>Entrega en:</span>
              <span className="text-slate-200 font-medium truncate max-w-[190px]">
                {order.destination.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Monto total:</span>
              <span className="text-emerald-400 font-bold font-mono">
                ${order.totalCostUSD.toFixed(2)} USD
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleInitialConfirm}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 hover:from-emerald-400 hover:to-cyan-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/30 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all ring-2 ring-emerald-300"
            >
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
              <span>Confirmar recepción</span>
            </button>

            {onReportProblem && (
              <button
                type="button"
                onClick={onReportProblem}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-950/80 hover:bg-rose-950/50 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>No lo he recibido / Reportar problema</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
