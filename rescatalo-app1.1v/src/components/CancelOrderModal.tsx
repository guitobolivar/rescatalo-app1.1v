import React, { useState } from 'react';
import { AlertTriangle, X, Check, XCircle } from 'lucide-react';

interface CancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmCancel: (reason?: string) => void;
  orderId: string;
  userRole: 'Cliente' | 'Repartidor' | 'Moderador';
}

const PRESET_REASONS = [
  'Demora excesiva en la atención',
  'Cambio de planes / Ya no lo necesito',
  'Error al fijar la dirección o servicio',
  'Inconveniente personal / Emergencia',
  'Problema mecánico con el vehículo',
  'Otro motivo',
];

export const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  isOpen,
  onClose,
  onConfirmCancel,
  orderId,
  userRole,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    const finalReason = selectedReason === 'Otro motivo' && customReason.trim()
      ? customReason.trim()
      : selectedReason;
    onConfirmCancel(finalReason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-900 border border-rose-500/40 rounded-3xl p-5 shadow-2xl space-y-4 text-white">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white leading-tight">
                ¿Cancelar servicio?
              </h3>
              <span className="text-xs font-mono text-rose-300">#{orderId}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning text */}
        <p className="text-xs text-slate-300 leading-relaxed">
          {userRole === 'Cliente'
            ? '¿Estás seguro de que deseas cancelar este servicio? Se cerrará el monitoreo y se le notificará de inmediato al repartidor.'
            : '¿Estás seguro de que deseas cancelar este servicio en curso? El cliente será informado al instante y el pedido volverá a quedar disponible.'}
        </p>

        {/* Reason selection */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wide block">
            Motivo de cancelación:
          </label>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {PRESET_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => setSelectedReason(reason)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer border ${
                  selectedReason === reason
                    ? 'bg-rose-950/60 border-rose-500/60 text-rose-200 font-bold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span className="truncate">{reason}</span>
                {selectedReason === reason && <Check className="w-3.5 h-3.5 text-rose-400 shrink-0 ml-1" />}
              </button>
            ))}
          </div>

          {selectedReason === 'Otro motivo' && (
            <input
              type="text"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Explica brevemente el motivo..."
              className="w-full bg-slate-950 border border-slate-700 focus:border-rose-400 rounded-xl px-3 py-2 text-xs text-white outline-none mt-2"
            />
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            No, mantener
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl shadow-lg shadow-rose-950/50 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <XCircle className="w-4 h-4" />
            <span>Sí, cancelar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
