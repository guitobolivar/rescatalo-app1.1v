import React from 'react';
import {
  X,
  Compass,
  MapPin,
  Calculator,
  Bike,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { RescataloLogo } from './RescataloLogo';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartService?: (serviceId: 'rescate_moto' | 'rescate_delivery') => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({
  isOpen,
  onClose,
  onStartService,
}) => {
  if (!isOpen) return null;

  const steps = [
    {
      step: '01',
      title: 'Elige tu servicio desde la barra inferior',
      description:
        'Toca el logo central de Rescátalo en la barra de navegación para abrir el abanico y escoger entre Rescátalo Moto (transporte) o Rescátalo Delivery (envíos y compras).',
      icon: <Sparkles className="w-5 h-5 text-cyan-400" />,
      tag: 'Acceso Central',
      badgeColor: 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300',
    },
    {
      step: '02',
      title: 'Define tu Punto de Salida (Origen)',
      description:
        'El mapa se abrirá limpio. Escribe la dirección o lugar de recogida en Valle de la Pascua (con autocompletado en vivo) o toca directamente en el mapa.',
      icon: <MapPin className="w-5 h-5 text-emerald-400" />,
      tag: 'Paso 1: Salida',
      badgeColor: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300',
    },
    {
      step: '03',
      title: 'Selecciona tu Punto de Llegada (Destino)',
      description:
        'Una vez confirmada la salida, se activará el selector del destino. Busca tu punto de entrega o márcalo en el mapa interactivo.',
      icon: <Compass className="w-5 h-5 text-blue-400" />,
      tag: 'Paso 2: Llegada',
      badgeColor: 'border-blue-500/40 bg-blue-950/40 text-blue-300',
    },
    {
      step: '04',
      title: 'Cálculo de kilómetros y tarifa en tiempo real',
      description:
        'Con ambos puntos definidos, el mapa traza la ruta exacta y calcula la tarifa transparente fijada por el moderador en USD sin sorpresas.',
      icon: <Calculator className="w-5 h-5 text-amber-400" />,
      tag: 'Tarifa Justa',
      badgeColor: 'border-amber-500/40 bg-amber-950/40 text-amber-300',
    },
    {
      step: '05',
      title: 'Seguimiento en vivo y comunicación directa',
      description:
        'Sigue la ubicación de tu conductor en tiempo real mientras va en camino. Chatea por mensajería interna o llámale con un solo toque.',
      icon: <Bike className="w-5 h-5 text-teal-400" />,
      tag: 'En Vivo',
      badgeColor: 'border-teal-500/40 bg-teal-950/40 text-teal-300',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-[#0b111e] border border-cyan-500/35 rounded-3xl p-5 shadow-2xl shadow-cyan-950/80 max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header with Title and Visible Close Button */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="guide-modal-title"
                className="text-base font-black text-white leading-tight"
              >
                Guía de Uso Rápida
              </h3>
              <p className="text-[11px] text-slate-400">
                Aprende a pedir viajes y deliveries en Rescátalo
              </p>
            </div>
          </div>
          {/* Visible 'X' Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar Guía"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Step Cards */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 divide-y divide-slate-800/60">
          {steps.map((item) => (
            <div key={item.step} className="pt-3 first:pt-0 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
                    {item.icon}
                  </div>
                  <span className="text-[10px] font-black font-mono text-cyan-400">
                    PASO {item.step}
                  </span>
                </div>
                <span
                  className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${item.badgeColor} shrink-0`}
                >
                  {item.tag}
                </span>
              </div>
              <h4 className="text-xs font-black text-white leading-snug">
                {item.title}
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}

          {/* Safety & Moderation Note */}
          <div className="pt-3">
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-300">
                <span className="font-bold text-white block">
                  Seguridad y Moderación 24/7
                </span>
                Todos los viajes y servicios cuentan con supervisión activa y tarifas reguladas para Valle de la Pascua.
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions with Visible Close Button */}
        <div className="pt-3 border-t border-slate-800 shrink-0 space-y-2">
          {onStartService && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartService('rescate_moto');
                }}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 border border-yellow-500/40 text-yellow-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <span>Moto Taxi</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartService('rescate_delivery');
                }}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <span>Mandados</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Entendido, Cerrar Guía
          </button>
        </div>
      </div>
    </div>
  );
};
