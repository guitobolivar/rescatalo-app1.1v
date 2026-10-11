import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LocationPoint } from '../types';
import {
  SERVICE_TYPES,
  calculateDistanceKm,
  searchValleDeLaPascuaPlaces,
  searchNominatimVenezuela,
  resolveValleDeLaPascuaAddress,
  POPULAR_LOCATIONS,
  PlaceSuggestion,
  playAlertChime,
} from '../data/venezuelaData';
import { InteractiveMap } from './InteractiveMap';
import { YellowMotoTaxiIcon, DeliveryBagIcon, MotoPassengerIcon, MotoDeliveryIcon } from './ServiceIcons';
import {
  ArrowLeft,
  X,
  MapPin,
  Search,
  Clock,
  Sparkles,
  Check,
  RotateCcw,
  Loader2,
  ArrowRight,
} from 'lucide-react';

interface ServiceRequestViewProps {
  serviceId: 'rescate_moto' | 'rescate_delivery';
  onBackToHome: () => void;
  onOrderCreated: (orderId: string) => void;
}

export const ServiceRequestView: React.FC<ServiceRequestViewProps> = ({
  serviceId,
  onBackToHome,
  onOrderCreated,
}) => {
  const { pricingConfig, currentUser, createOrder } = useApp();

  // Selected Service Type
  const [currentServiceId, setCurrentServiceId] = useState<'rescate_moto' | 'rescate_delivery'>(serviceId);

  React.useEffect(() => {
    setCurrentServiceId(serviceId);
  }, [serviceId]);

  // 1. El mapa se abre sin ningún punto ni precio predeterminado (origen = null, destino = null)
  const [originPoint, setOriginPoint] = useState<LocationPoint | null>(null);
  const [isOriginConfirmed, setIsOriginConfirmed] = useState(false);

  const [destinationPoint, setDestinationPoint] = useState<LocationPoint | null>(null);
  const [isDestConfirmed, setIsDestConfirmed] = useState(false);

  // Active step in UI: 'origin' | 'destination' | 'review'
  const [currentStep, setCurrentStep] = useState<'origin' | 'destination' | 'review'>('origin');

  // Text inputs
  const [originInputText, setOriginInputText] = useState('');
  const [destinationInputText, setDestinationInputText] = useState('');

  // Dropdowns
  const [originSuggestions, setOriginSuggestions] = useState<PlaceSuggestion[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  // Notes & Submission
  const [itemDescription, setItemDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const serviceConfig =
    SERVICE_TYPES.find((s) => s.id === currentServiceId) || SERVICE_TYPES[0];
  const isMoto = currentServiceId === 'rescate_moto';

  // Only calculate distance & fare when BOTH points are confirmed with [✓]
  const hasBothConfirmed = isOriginConfirmed && isDestConfirmed && Boolean(originPoint && destinationPoint);

  const distanceKm =
    hasBothConfirmed && originPoint && destinationPoint
      ? calculateDistanceKm(
          originPoint.lat,
          originPoint.lng,
          destinationPoint.lat,
          destinationPoint.lng
        )
      : 0;

  const ratePerKm =
    pricingConfig.serviceRatesUSD?.[currentServiceId] ??
    pricingConfig.costPerKmUSD;

  const calculatedFare =
    hasBothConfirmed
      ? Math.max(
          pricingConfig.minimumFareUSD,
          Math.round((pricingConfig.baseFeeUSD + distanceKm * ratePerKm) * 100) /
            100
        )
      : 0;

  // Pending Point for floating card above the pin on the map
  const pendingPoint: { point: LocationPoint; type: 'origin' | 'destination' } | null =
    !isOriginConfirmed && originPoint
      ? { point: originPoint, type: 'origin' }
      : isOriginConfirmed && !isDestConfirmed && destinationPoint
      ? { point: destinationPoint, type: 'destination' }
      : null;

  // Search Origin
  const handleOriginSearch = (query: string) => {
    setOriginInputText(query);
    if (!query.trim()) {
      setOriginSuggestions([]);
      setShowOriginDropdown(false);
      return;
    }
    const local = searchValleDeLaPascuaPlaces(query);
    setOriginSuggestions(local);
    setShowOriginDropdown(true);

    if (query.trim().length >= 3) {
      searchNominatimVenezuela(query).then((remote) => {
        if (remote.length > 0) {
          setOriginSuggestions((prev) => {
            const names = new Set(prev.map((p) => p.name.toLowerCase()));
            const filtered = remote.filter((r) => !names.has(r.name.toLowerCase()));
            return [...prev, ...filtered];
          });
        }
      });
    }
  };

  // Search Destination
  const handleDestinationSearch = (query: string) => {
    setDestinationInputText(query);
    if (!query.trim()) {
      setDestinationSuggestions([]);
      setShowDestDropdown(false);
      return;
    }
    const local = searchValleDeLaPascuaPlaces(query);
    setDestinationSuggestions(local);
    setShowDestDropdown(true);

    if (query.trim().length >= 3) {
      searchNominatimVenezuela(query).then((remote) => {
        if (remote.length > 0) {
          setDestinationSuggestions((prev) => {
            const names = new Set(prev.map((p) => p.name.toLowerCase()));
            const filtered = remote.filter((r) => !names.has(r.name.toLowerCase()));
            return [...prev, ...filtered];
          });
        }
      });
    }
  };

  // Map tap handler
  const handleMapClick = (lat: number, lng: number) => {
    const resolved = resolveValleDeLaPascuaAddress(lat, lng);
    const newPoint: LocationPoint = {
      name: resolved.name,
      address: resolved.address,
      lat,
      lng,
    };

    if (!isOriginConfirmed) {
      // Placing candidate for Point A
      setOriginPoint(newPoint);
      setOriginInputText(resolved.name);
      setShowOriginDropdown(false);
      playAlertChime('tap');
    } else if (!isDestConfirmed) {
      // Placing candidate for Point B
      setDestinationPoint(newPoint);
      setDestinationInputText(resolved.name);
      setShowDestDropdown(false);
      playAlertChime('tap');
    }
  };

  // [✓] Palomita Verde: Confirma y fija el punto (desde el mapa o panel)
  const handleConfirmPoint = (type: 'origin' | 'destination') => {
    if (type === 'origin') {
      if (!originPoint) return;
      setIsOriginConfirmed(true);
      setCurrentStep('destination');
      playAlertChime('accepted');
    } else {
      if (!destinationPoint) return;
      setIsDestConfirmed(true);
      setCurrentStep('review');
      playAlertChime('accepted');
    }
  };

  // [X] Cruz Roja: Cancela / Rechaza la selección para volver a ubicarlo en el mapa
  const handleCancelPoint = (type: 'origin' | 'destination') => {
    if (type === 'origin') {
      setOriginPoint(null);
      setIsOriginConfirmed(false);
      setOriginInputText('');
      playAlertChime('tap');
    } else {
      setDestinationPoint(null);
      setIsDestConfirmed(false);
      setDestinationInputText('');
      playAlertChime('tap');
    }
  };

  // Modify route after review
  const handleResetDestination = () => {
    setDestinationPoint(null);
    setIsDestConfirmed(false);
    setDestinationInputText('');
    setCurrentStep('destination');
  };

  const handleFullReset = () => {
    setOriginPoint(null);
    setIsOriginConfirmed(false);
    setDestinationPoint(null);
    setIsDestConfirmed(false);
    setOriginInputText('');
    setDestinationInputText('');
    setCurrentStep('origin');
  };

  // Final Order Submission
  const handleConfirmAndOrder = () => {
    if (!originPoint || !destinationPoint || !hasBothConfirmed) return;

    if (currentUser?.status === 'Suspendido') {
      alert('Tu cuenta se encuentra suspendida por moderación.');
      return;
    }

    setIsSubmitting(true);
    playAlertChime('tap');

    setTimeout(() => {
      const order = createOrder({
        origin: originPoint,
        destination: destinationPoint,
        serviceTypeId: currentServiceId,
        itemDescription:
          itemDescription.trim() ||
          (isMoto
            ? 'Traslado en moto (1 Pasajero)'
            : 'Envío / Delivery de encomienda'),
      });

      playAlertChime('accepted');
      setIsSubmitting(false);
      onOrderCreated(order.id);
    }, 800);
  };

  return (
    <div className="w-full flex-1 flex flex-col space-y-3.5 pb-24 animate-in fade-in duration-200">
      {/* 1. TOP HEADER WITH SERVICE TITLE, SWITCH CATEGORY AND CLOSE 'X' */}
      <div className="flex items-center justify-between p-3.5 bg-slate-900/90 rounded-3xl border border-cyan-500/25 shadow-lg">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBackToHome}
            aria-label="Volver a Inicio"
            className="w-8 h-8 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 flex items-center justify-center transition-colors cursor-pointer active:scale-95 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                isMoto
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              }`}
            >
              {isMoto ? <MotoPassengerIcon size={18} /> : <MotoDeliveryIcon size={18} />}
            </div>
            <div>
              <h2 className="text-sm font-black text-white leading-tight">
                {isMoto ? 'Rescátalo Moto' : 'Rescátalo Delivery'}
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">
                Valle de la Pascua
              </span>
            </div>
          </div>
        </div>

        {/* Category Switcher Pill & Visible Close Button */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setCurrentServiceId(isMoto ? 'rescate_delivery' : 'rescate_moto');
            }}
            className="px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 text-[10px] font-black text-cyan-300 border border-slate-800 transition-colors cursor-pointer"
            title="Cambiar categoría"
          >
            {isMoto ? 'A Delivery' : 'A Moto'}
          </button>
          <button
            type="button"
            onClick={onBackToHome}
            aria-label="Cerrar y volver al inicio"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. PROGRESS STEP BAR */}
      <div className="grid grid-cols-3 gap-2 px-1">
        <div
          className={`p-2 rounded-2xl border text-center transition-all ${
            !isOriginConfirmed
              ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-950/50'
              : 'bg-slate-900 border-emerald-500/40 text-emerald-400'
          }`}
        >
          <span className="text-[9px] font-black uppercase tracking-wider block font-mono">
            1. Salida (A)
          </span>
          <span className="text-[10px] font-bold truncate block mt-0.5">
            {isOriginConfirmed ? '✓ Confirmado' : originPoint ? '⚠️ Por confirmar' : 'Pendiente'}
          </span>
        </div>

        <div
          className={`p-2 rounded-2xl border text-center transition-all ${
            isOriginConfirmed && !isDestConfirmed
              ? 'bg-blue-950/70 border-blue-400 text-blue-300 shadow-md shadow-blue-950/50'
              : isDestConfirmed
              ? 'bg-slate-900 border-emerald-500/40 text-emerald-400'
              : 'bg-slate-950/60 border-slate-800 text-slate-500'
          }`}
        >
          <span className="text-[9px] font-black uppercase tracking-wider block font-mono">
            2. Llegada (B)
          </span>
          <span className="text-[10px] font-bold truncate block mt-0.5">
            {isDestConfirmed ? '✓ Confirmado' : destinationPoint ? '⚠️ Por confirmar' : 'Pendiente'}
          </span>
        </div>

        <div
          className={`p-2 rounded-2xl border text-center transition-all ${
            hasBothConfirmed
              ? 'bg-emerald-950/70 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-950/50'
              : 'bg-slate-950/60 border-slate-800 text-slate-500'
          }`}
        >
          <span className="text-[9px] font-black uppercase tracking-wider block font-mono">
            3. Tarifa
          </span>
          <span className="text-[10px] font-bold truncate block mt-0.5">
            {hasBothConfirmed ? `$${calculatedFare.toFixed(2)} USD` : 'Al fijar A y B'}
          </span>
        </div>
      </div>

      {/* 3. INTERACTIVE MAP: WITH MINI-CARD FLOTANTE SOBRE EL PIN CON [✓] Y [X] */}
      <div className="relative rounded-3xl overflow-hidden border border-cyan-500/30 shadow-2xl">
        <InteractiveMap
          origin={originPoint}
          destination={destinationPoint}
          onMapClick={handleMapClick}
          selectionMode={!isOriginConfirmed ? 'origin' : !isDestConfirmed ? 'destination' : null}
          pendingPoint={pendingPoint}
          onConfirmPoint={handleConfirmPoint}
          onCancelPoint={handleCancelPoint}
          showRouteLine={hasBothConfirmed}
          heightClass="h-64 sm:h-72"
        />

        {/* Map Top Notification Bar */}
        <div className="absolute top-2.5 left-2.5 right-2.5 pointer-events-none">
          <div className="bg-slate-950/90 backdrop-blur-md border border-cyan-500/30 rounded-2xl px-3 py-1.5 flex items-center justify-between text-xs font-bold text-white shadow-lg">
            <span className="flex items-center gap-1.5 text-cyan-300 truncate">
              <Sparkles className="w-3.5 h-3.5 animate-spin text-cyan-400 shrink-0" />
              <span className="truncate">
                {!isOriginConfirmed
                  ? originPoint
                    ? 'Toca [✓] en el pin para fijar Salida'
                    : 'Paso 1: Toca el mapa para marcar Salida (A)'
                  : !isDestConfirmed
                  ? destinationPoint
                    ? 'Toca [✓] en el pin para fijar Llegada'
                    : 'Paso 2: Toca el mapa para marcar Llegada (B)'
                  : 'Ruta trazada con éxito · Tarifa calculada'}
              </span>
            </span>
            {hasBothConfirmed && (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-500/40 shrink-0 ml-2">
                {distanceKm.toFixed(1)} km
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 4. PASO 1: SELECCIONAR Y CONFIRMAR PUNTO A (SALIDA) */}
      {!isOriginConfirmed && (
        <div className="bg-slate-900/90 rounded-3xl p-4 border border-cyan-500/25 shadow-xl space-y-3 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-cyan-400 uppercase tracking-wide flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center text-xs font-black">
                A
              </span>
              Paso 1: Punto de Salida / Recogida
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              Obligatorio
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              value={originInputText}
              onChange={(e) => handleOriginSearch(e.target.value)}
              onFocus={() => {
                if (originInputText.trim().length >= 1) {
                  setOriginSuggestions(searchValleDeLaPascuaPlaces(originInputText));
                  setShowOriginDropdown(true);
                }
              }}
              placeholder="Escribe lugar de salida (ej. Plaza Bolívar, Casco Central)"
              className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-2xl pl-10 pr-3.5 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/80 pointer-events-none" />

            {/* Suggestions dropdown */}
            {showOriginDropdown && originSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-30 mt-1.5 bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden divide-y divide-slate-800 max-h-52 overflow-y-auto">
                <div className="px-3 py-1.5 bg-slate-950 text-[10px] font-bold text-cyan-400 flex items-center justify-between">
                  <span>Lugares de Valle de la Pascua</span>
                  <span className="text-[9px] text-slate-500 font-mono">Toca para seleccionar</span>
                </div>
                {originSuggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setOriginPoint({
                        name: sug.name,
                        address: sug.address,
                        lat: sug.lat,
                        lng: sug.lng,
                      });
                      setOriginInputText(sug.name);
                      setShowOriginDropdown(false);
                    }}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-slate-800 flex items-start gap-2.5 cursor-pointer transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-white truncate block">
                        {sug.name}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate block mt-0.5">
                        {sug.address}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Pickup Location Chips */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
              Puntos frecuentes de salida:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_LOCATIONS.slice(0, 4).map((loc) => (
                <button
                  key={loc.name}
                  type="button"
                  onClick={() => {
                    setOriginPoint(loc);
                    setOriginInputText(loc.name);
                    setShowOriginDropdown(false);
                  }}
                  className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition-colors"
                >
                  {loc.name.split('(')[0].trim()}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Card with [✓] and [X] for Point A */}
          {originPoint && (
            <div className="p-3.5 rounded-2xl bg-slate-950 border-2 border-cyan-400/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="truncate">
                  <span className="text-cyan-400 font-bold mr-1">Ubicación marcada:</span>
                  <span className="text-white font-black">{originPoint.name}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Verifica la posición sobre el mapa. Puedes usar los botones del pin flotante o confirmar aquí:
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {/* [✓] Palomita Verde */}
                <button
                  type="button"
                  onClick={() => handleConfirmPoint('origin')}
                  className="py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/25 active:scale-95 cursor-pointer transition-all"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Confirmar Punto A</span>
                </button>

                {/* [X] Cruz Roja */}
                <button
                  type="button"
                  onClick={() => handleCancelPoint('origin')}
                  className="py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/40 active:scale-95 cursor-pointer transition-all"
                >
                  <X className="w-4 h-4 stroke-[3]" />
                  <span>Rechazar / Reubicar</span>
                </button>
              </div>
            </div>
          )}

          {!originPoint && (
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
              👆 Toca cualquier punto en el mapa interactivo o busca una dirección arriba para marcar el Punto A.
            </div>
          )}
        </div>
      )}

      {/* 5. PASO 2: SELECCIONAR Y CONFIRMAR PUNTO B (LLEGADA) */}
      {isOriginConfirmed && !isDestConfirmed && (
        <div className="bg-slate-900/90 rounded-3xl p-4 border border-blue-500/25 shadow-xl space-y-3 animate-in slide-in-from-bottom duration-200">
          {/* Confirmed Point A Badge with edit option */}
          <div className="p-2.5 rounded-2xl bg-slate-950 border border-emerald-500/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate">
              <span className="w-4 h-4 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center text-[10px] font-black shrink-0">
                ✓
              </span>
              <span className="text-cyan-400 font-bold">Punto A Confirmado:</span>
              <span className="text-white truncate">{originPoint?.name}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOriginConfirmed(false);
                setCurrentStep('origin');
              }}
              className="text-[11px] text-cyan-300 hover:underline font-bold shrink-0 ml-2"
            >
              Modificar A
            </button>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-blue-400 uppercase tracking-wide flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-black">
                B
              </span>
              Paso 2: Punto de Entrega / Destino
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              Obligatorio
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              value={destinationInputText}
              onChange={(e) => handleDestinationSearch(e.target.value)}
              onFocus={() => {
                if (destinationInputText.trim().length >= 1) {
                  setDestinationSuggestions(searchValleDeLaPascuaPlaces(destinationInputText));
                  setShowDestDropdown(true);
                }
              }}
              placeholder="Escribe lugar de destino (ej. Urb. Las Garcitas, Sector 2)"
              className="w-full bg-slate-950 border border-slate-700 focus:border-blue-400 rounded-2xl pl-10 pr-3.5 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400/80 pointer-events-none" />

            {/* Suggestions dropdown */}
            {showDestDropdown && destinationSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-30 mt-1.5 bg-slate-900 border border-blue-500/40 rounded-2xl shadow-2xl overflow-hidden divide-y divide-slate-800 max-h-52 overflow-y-auto">
                <div className="px-3 py-1.5 bg-slate-950 text-[10px] font-bold text-blue-400 flex items-center justify-between">
                  <span>Lugares de Valle de la Pascua</span>
                  <span className="text-[9px] text-slate-500 font-mono">Toca para seleccionar</span>
                </div>
                {destinationSuggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setDestinationPoint({
                        name: sug.name,
                        address: sug.address,
                        lat: sug.lat,
                        lng: sug.lng,
                      });
                      setDestinationInputText(sug.name);
                      setShowDestDropdown(false);
                    }}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-slate-800 flex items-start gap-2.5 cursor-pointer transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-white truncate block">
                        {sug.name}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate block mt-0.5">
                        {sug.address}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Destination Location Chips */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
              Destinos frecuentes en La Pascua:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_LOCATIONS.slice(4, 8).map((loc) => (
                <button
                  key={loc.name}
                  type="button"
                  onClick={() => {
                    setDestinationPoint(loc);
                    setDestinationInputText(loc.name);
                    setShowDestDropdown(false);
                  }}
                  className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition-colors"
                >
                  {loc.name.split('(')[0].trim()}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Card with [✓] and [X] for Point B */}
          {destinationPoint && (
            <div className="p-3.5 rounded-2xl bg-slate-950 border-2 border-blue-400/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="truncate">
                  <span className="text-blue-400 font-bold mr-1">Destino marcado:</span>
                  <span className="text-white font-black">{destinationPoint.name}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Verifica la posición sobre el mapa. Puedes pulsar la palomita verde sobre el pin o confirmar aquí:
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {/* [✓] Palomita Verde */}
                <button
                  type="button"
                  onClick={() => handleConfirmPoint('destination')}
                  className="py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/25 active:scale-95 cursor-pointer transition-all"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Confirmar Punto B</span>
                </button>

                {/* [X] Cruz Roja */}
                <button
                  type="button"
                  onClick={() => handleCancelPoint('destination')}
                  className="py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/40 active:scale-95 cursor-pointer transition-all"
                >
                  <X className="w-4 h-4 stroke-[3]" />
                  <span>Rechazar / Reubicar</span>
                </button>
              </div>
            </div>
          )}

          {!destinationPoint && (
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
              👆 Toca el mapa interactivo o busca arriba para marcar tu ubicación de entrega (Punto B).
            </div>
          )}
        </div>
      )}

      {/* 6. PASO 3: AMBOS PUNTOS CONFIRMADOS -> RUTA TRAZADA & TARIFA FINAL */}
      {hasBothConfirmed && (
        <div className="bg-slate-900/90 rounded-3xl p-4 border border-cyan-500/35 shadow-2xl space-y-3.5 animate-in slide-in-from-bottom duration-200">
          {/* Header of review */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" />
              Ruta Confirmada con Éxito
            </span>
            <button
              type="button"
              onClick={handleResetDestination}
              className="text-[11px] text-cyan-300 hover:underline font-bold flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Modificar ruta
            </button>
          </div>

          {/* REDISEÑADA TARJETA DE SERVICIO SEGÚN ESPECIFICACIONES EXACTAS */}
          <div className="p-4 rounded-3xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-emerald-500/50 shadow-xl space-y-3">
            {/* Insignia de tiempo estimada compacta y limpia */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[11px] font-black tracking-wide shadow-xs">
                <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                <span>10 a 15 min</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">
                {isMoto ? '⚡ Transporte Taxi' : '📦 Delivery Express'}
              </span>
            </div>

            {/* Nombre del servicio completo en bloque vertical limpio y divertido */}
            <div className="flex items-center gap-3.5">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 shadow-lg transition-transform hover:scale-105 ${
                  isMoto
                    ? 'bg-gradient-to-tr from-amber-500/25 via-yellow-500/20 to-amber-400/10 text-yellow-300 border-yellow-400/60 shadow-yellow-500/20'
                    : 'bg-gradient-to-tr from-emerald-500/25 via-teal-500/20 to-emerald-400/10 text-emerald-300 border-emerald-400/60 shadow-emerald-500/20'
                }`}
              >
                {isMoto ? <YellowMotoTaxiIcon size={34} /> : <DeliveryBagIcon size={34} />}
              </div>

              <div className="flex flex-col min-w-0 flex-1 whitespace-normal">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black tracking-tight leading-tight bg-gradient-to-r from-yellow-300 via-amber-200 to-emerald-300 bg-clip-text text-transparent break-words">
                    {serviceConfig.name}
                  </h3>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                    {isMoto ? '🛵 Taxi' : '🛍️ Mandados'}
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-300 mt-1">
                  {isMoto
                    ? 'Transporte rápido con casco en Valle de la Pascua'
                    : 'Compras, encomiendas y paquetes a tu puerta'}
                </span>
              </div>
            </div>

            {/* Monto total en letras grandes y color verde divertido */}
            <div className="bg-gradient-to-r from-emerald-950/70 via-slate-950 to-teal-950/70 rounded-2xl p-4 border-2 border-emerald-400/60 shadow-lg shadow-emerald-950/40 flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-emerald-300 uppercase tracking-wider block">
                  Total a Pagar:
                </span>
                <div className="text-4xl font-black font-mono text-emerald-400 tracking-tight drop-shadow-[0_2px_12px_rgba(52,211,153,0.5)] flex items-baseline gap-1.5 mt-1">
                  ${calculatedFare.toFixed(2)}
                  <span className="text-base font-black text-emerald-300 font-sans">USD</span>
                </div>
              </div>

              <div className="text-right space-y-1">
                <span className="text-xs font-mono text-emerald-300/80 font-bold block bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  ${ratePerKm.toFixed(2)} / km
                </span>
                <span className="text-[11px] text-cyan-300 font-mono font-bold block">
                  {distanceKm.toFixed(1)} km calculados
                </span>
              </div>
            </div>
          </div>

          {/* Route Summary Box */}
          <div className="bg-slate-950 rounded-2xl p-3 border border-slate-800 text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-slate-300 truncate">
              <span className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center text-[10px] font-black shrink-0">
                A
              </span>
              <span className="text-cyan-300 font-bold">Salida:</span>
              <span className="truncate">{originPoint?.name}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300 truncate">
              <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                B
              </span>
              <span className="text-blue-300 font-bold">Llegada:</span>
              <span className="truncate">{destinationPoint?.name}</span>
            </div>
          </div>

          {/* Optional item/note description */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-300">
              ¿Qué deseas trasladar o enviar? (Opcional)
            </label>
            <input
              type="text"
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              placeholder={
                isMoto
                  ? 'Ej. Voy al centro / traslado personal'
                  : 'Ej. Compra de farmacia, almuerzo, paquete cerrado...'
              }
              className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-2xl px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>

          {/* Launch CTA */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirmAndOrder}
            className={`w-full py-4 px-4 rounded-2xl flex items-center justify-center gap-2 font-black text-sm shadow-xl transition-all cursor-pointer ${
              isSubmitting
                ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 ring-2 ring-emerald-300'
                : 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 active:scale-98 text-slate-950 shadow-emerald-500/25'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Despachando servicio en tiempo real...</span>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <span>Confirmar y Pedir {serviceConfig.name}</span>
                <span className="font-mono text-base font-black">
                  ${calculatedFare.toFixed(2)} USD
                </span>
              </div>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
