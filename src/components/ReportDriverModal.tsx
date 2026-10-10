import React, { useState } from 'react';
import { X, Siren, AlertOctagon, Send, ShieldAlert, Check } from 'lucide-react';

interface ReportDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  driverName?: string;
  onConfirmReport: (reason: string, details: string) => void;
}

export const ReportDriverModal: React.FC<ReportDriverModalProps> = ({
  isOpen,
  onClose,
  orderId,
  driverName = 'Repartidor',
  onConfirmReport,
}) => {
  const [selectedReason, setSelectedReason] = useState(
    'El repartidor marcó recogido pero el artículo NO está en el sitio'
  );
  const [details, setDetails] = useState('');
  const [isSent, setIsSent] = useState(false);

  if (!isOpen) return null;

  const presetReasons = [
    {
      id: 'El repartidor marcó recogido pero el artículo NO está en el sitio',
      title: 'Artículo NO está en el sitio o comercio',
      desc: 'El repartidor marcó que ya recogió el paquete, pero se verificó que no estaba o fue una marcación falsa.',
    },
    {
      id: 'El repartidor marcó entregado pero NO fue recibido',
      title: 'Entrega falsa / No recibido',
      desc: 'El repartidor finalizó el viaje sin entregarme el paquete o sin completar el traslado.',
    },
    {
      id: 'Repartidor incomunicado o desvío no autorizado',
      title: 'Incomunicado / Desvío de ruta',
      desc: 'No responde llamadas ni mensajes y su posición en el mapa no avanza o se desvió deliberadamente.',
    },
    {
      id: 'Conducta indebida o cobro indebido',
      title: 'Conducta indebida / Intento de sobrecargo',
      desc: 'Exigió montos distintos a la tarifa oficial de la app o trato inadecuado.',
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmReport(selectedReason, details.trim());
    setIsSent(true);
    setTimeout(() => {
      setIsSent(false);
      onClose();
    }, 1200);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-slate-900 border-2 border-rose-500/70 rounded-3xl p-5 shadow-2xl shadow-rose-950/80 space-y-4 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
              <Siren className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white leading-tight">
                Reportar Repartidor
              </h3>
              <p className="text-[11px] text-slate-400">
                Alerta prioritaria a moderación · Orden #{orderId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar reporte"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSent ? (
          <div className="p-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
              <Check className="w-7 h-7 stroke-[3]" />
            </div>
            <h4 className="text-base font-black text-white">
              ¡Reporte Enviado al Moderador!
            </h4>
            <p className="text-xs text-slate-300">
              La incidencia se ha transmitido de inmediato al panel de administración para su revisión y sanción.
            </p>
          </div>
        ) : (
          <>
            {/* Info Notice */}
            <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-xs text-slate-300 leading-snug space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-300">
                <AlertOctagon className="w-4 h-4 shrink-0 text-rose-400" />
                <span>Verificación de Entrega y Seguridad</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Si verificaste que tu repartidor ({driverName}) no está realmente en el sitio, no entregó el artículo o hubo una irregularidad, este reporte generará una alerta inmediata en el panel del Moderador.
              </p>
            </div>

            {/* Reasons Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-300 uppercase tracking-wider block">
                  Selecciona la irregularidad:
                </label>
                <div className="space-y-1.5">
                  {presetReasons.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedReason(r.id)}
                      className={`w-full p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        selectedReason === r.id
                          ? 'bg-rose-950/60 border-rose-400 text-white font-bold ring-1 ring-rose-400/50'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xs font-black block leading-tight text-rose-200">
                        {r.title}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 leading-snug">
                        {r.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  Descripción o evidencia (Opcional):
                </label>
                <textarea
                  rows={2}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Ej. Llamé al comercio y me confirmaron que nadie ha retirado la comida..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-rose-400 rounded-2xl p-3 text-xs text-white outline-none resize-none placeholder:text-slate-600"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-2xl cursor-pointer transition-colors"
                >
                  Volver / Cancelar
                </button>
                <button
                  type="submit"
                  className="py-3 px-3 bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/60 active:scale-95 cursor-pointer transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar Alerta Mod</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
