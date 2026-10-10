import React, { useState } from 'react';
import { X, AlertTriangle, Send, ShieldAlert, Wrench, Siren } from 'lucide-react';

interface DriverCancellationRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  clientName: string;
  onRequestSubmit: (reason: string) => void;
}

export const DriverCancellationRequestModal: React.FC<DriverCancellationRequestModalProps> = ({
  isOpen,
  onClose,
  orderId,
  clientName,
  onRequestSubmit,
}) => {
  const [selectedReason, setSelectedReason] = useState('Avería mecánica grave en el vehículo');
  const [details, setDetails] = useState('');

  if (!isOpen) return null;

  const reasons = [
    {
      id: 'Avería mecánica grave en el vehículo',
      label: 'Avería mecánica en moto (caucho espichado, motor)',
      icon: <Wrench className="w-4 h-4 text-amber-400" />,
    },
    {
      id: 'Accidente vial o incidente de fuerza mayor',
      label: 'Accidente de tránsito / Situación de riesgo vial',
      icon: <Siren className="w-4 h-4 text-rose-400" />,
    },
    {
      id: 'Problema crítico de salud o emergencia personal',
      label: 'Emergencia médica o de salud súbita',
      icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    },
    {
      id: 'Otro motivo justificado',
      label: 'Otro imprevisto justificado tras la recogida',
      icon: <ShieldAlert className="w-4 h-4 text-cyan-400" />,
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = details.trim()
      ? `${selectedReason}: ${details.trim()}`
      : selectedReason;
    onRequestSubmit(finalReason);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-5 shadow-2xl shadow-amber-950/60 space-y-4 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white leading-tight">
                Solicitud de Cancelación
              </h3>
              <p className="text-[11px] text-slate-400">
                Orden #{orderId} · Ya recogida
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-xs text-slate-300 leading-snug space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Regla Estricta: Pedido en Posesión</span>
          </div>
          <p className="text-[11px] text-slate-300">
            Como ya marcaste el pedido como recogido, no puedes cancelar de forma unilateral. Esta solicitud será enviada al cliente (<strong>{clientName}</strong>), quien deberá autorizarla o rechazarla.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-300 uppercase tracking-wider block">
              Motivo de la solicitud:
            </label>
            <div className="space-y-1.5">
              {reasons.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedReason(r.id)}
                  className={`w-full p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                    selectedReason === r.id
                      ? 'bg-amber-950/60 border-amber-400 text-white font-bold ring-1 ring-amber-400/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="shrink-0">{r.icon}</div>
                  <span className="text-xs leading-tight flex-1">{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 block">
              Detalle adicional para el cliente (Opcional):
            </label>
            <textarea
              rows={2}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Explica brevemente la avería o situación..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-2xl p-3 text-xs text-white outline-none resize-none placeholder:text-slate-600"
            />
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-2xl cursor-pointer transition-colors"
            >
              Cerrar / Continuar Viaje
            </button>
            <button
              type="submit"
              className="py-3 px-3 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950/50 active:scale-95 cursor-pointer transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Enviar al Cliente</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
