import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { LocationPoint } from '../types';
import { DEFAULT_VENEZUELA_CENTER } from '../data/venezuelaData';
import { Check, X } from 'lucide-react';

interface InteractiveMapProps {
  origin?: LocationPoint | null;
  destination?: LocationPoint | null;
  driverPosition?: { lat: number; lng: number } | null;
  onMapClick?: (lat: number, lng: number) => void;
  selectionMode?: 'origin' | 'destination' | null;
  heightClass?: string;
  interactive?: boolean;
  pendingPoint?: { point: LocationPoint; type: 'origin' | 'destination' } | null;
  onConfirmPoint?: (type: 'origin' | 'destination') => void;
  onCancelPoint?: (type: 'origin' | 'destination') => void;
  showRouteLine?: boolean;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  origin,
  destination,
  driverPosition,
  onMapClick,
  selectionMode = null,
  heightClass = 'h-60 sm:h-64',
  interactive = true,
  pendingPoint = null,
  onConfirmPoint,
  onCancelPoint,
  showRouteLine = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const onMapClickRef = useRef(onMapClick);
  const markersRef = useRef<{
    originMarker?: L.Marker;
    destinationMarker?: L.Marker;
    driverMarker?: L.Marker;
    routeLine?: L.Polyline;
  }>({});

  // Keep latest onMapClick in ref without triggering map re-creation
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // Initialize Map ONCE on mount
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    // Guard: Prevent double-initialization in React strict mode
    if ((container as unknown as { _leaflet_id?: number })._leaflet_id) {
      return;
    }

    const map = L.map(container, {
      center: [DEFAULT_VENEZUELA_CENTER.lat, DEFAULT_VENEZUELA_CENTER.lng],
      zoom: DEFAULT_VENEZUELA_CENTER.zoom,
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap · Valle de la Pascua',
    }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClickRef.current) {
        onMapClickRef.current(e.latlng.lat, e.latlng.lng);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      try {
        map.stop();
        map.off();
        map.remove();
      } catch {
        // Safe catch
      }
      mapInstanceRef.current = null;
    };
  }, [interactive]);

  // Update Markers, Route, and View safely without triggering zoom transition errors
  useEffect(() => {
    const map = mapInstanceRef.current;
    const container = mapContainerRef.current;
    // Ensure map and DOM pane are still alive
    if (!map || !container || !(map as unknown as { _mapPane?: HTMLElement })._mapPane) {
      return;
    }

    const markers = markersRef.current;

    // Helper: custom HTML icon for Origin (A) - Cyan Green
    const createOriginIcon = () =>
      L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-8 h-8 rounded-full bg-cyan-400/40 animate-ping"></span>
            <div class="w-8 h-8 rounded-2xl bg-cyan-500 border-2 border-slate-900 shadow-xl flex items-center justify-center text-slate-950 font-black text-xs">
              A
            </div>
            <div class="absolute -bottom-5 whitespace-nowrap bg-slate-950/90 text-cyan-300 border border-cyan-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full shadow backdrop-blur-xs">
              Salida
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

    // Helper: custom HTML icon for Destination (B) - Electric Blue Cyan
    const createDestIcon = () =>
      L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-8 h-8 rounded-full bg-blue-500/40 animate-ping"></span>
            <div class="w-8 h-8 rounded-2xl bg-blue-600 border-2 border-slate-900 shadow-xl flex items-center justify-center text-white font-black text-xs">
              B
            </div>
            <div class="absolute -bottom-5 whitespace-nowrap bg-slate-950/90 text-blue-300 border border-blue-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full shadow backdrop-blur-xs">
              Entrega
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

    // Helper: custom HTML icon for Driver (Moto) - Electric Cyan
    const createDriverIcon = () =>
      L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="w-10 h-10 rounded-2xl bg-cyan-400 border-2 border-slate-950 shadow-2xl flex items-center justify-center text-slate-950 font-black text-xs transform transition-transform hover:scale-110">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 fill-current text-slate-950" viewBox="0 0 24 24">
                <path d="M5 11c0-1.657 1.343-3 3-3 .552 0 1 .448 1 1s-.448 1-1 1c-.552 0-1 .448-1 1s.448 1 1 1h.5c.276 0 .5.224.5.5s-.224.5-.5.5H8c-1.657 0-3-1.343-3-3zm14 0c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3zm-3-1c-.552 0-1 .448-1 1s.448 1 1 1 1-.448 1-1-.448-1-1-1zm3.7-4.1l-1.9-2.5c-.3-.4-.8-.6-1.3-.6h-3c-.6 0-1 .4-1 1s.4 1 1 1h2.5l1.4 1.8-3.4 3.4h-2.5c-.4-.6-1.1-1-1.8-1-1.2 0-2.2 1-2.2 2.2 0 .5.2.9.5 1.3l-2.9 2c-.4.3-.6.7-.6 1.2 0 .8.7 1.5 1.5 1.5.3 0 .7-.1 1-.3l2.8-1.9c.5.4 1.1.7 1.7.7 1.4 0 2.6-.9 2.9-2.2l3.4-1.1c.4.7 1.1 1.3 2 1.3 1.4 0 2.5-1.1 2.5-2.5 0-.7-.3-1.3-.8-1.8l1.3-1.3c.4-.4.4-1.1 0-1.5z"/>
              </svg>
            </div>
            <div class="absolute -top-6 whitespace-nowrap bg-cyan-400 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-full shadow">
              En Camino
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

    // 1. Origin Marker
    if (origin) {
      if (markers.originMarker) {
        markers.originMarker.setLatLng([origin.lat, origin.lng]);
      } else {
        markers.originMarker = L.marker([origin.lat, origin.lng], {
          icon: createOriginIcon(),
        }).addTo(map);
      }
    } else if (markers.originMarker) {
      markers.originMarker.remove();
      delete markers.originMarker;
    }

    // 2. Destination Marker
    if (destination) {
      if (markers.destinationMarker) {
        markers.destinationMarker.setLatLng([destination.lat, destination.lng]);
      } else {
        markers.destinationMarker = L.marker([destination.lat, destination.lng], {
          icon: createDestIcon(),
        }).addTo(map);
      }
    } else if (markers.destinationMarker) {
      markers.destinationMarker.remove();
      delete markers.destinationMarker;
    }

    // 3. Driver Marker
    if (driverPosition) {
      if (markers.driverMarker) {
        markers.driverMarker.setLatLng([driverPosition.lat, driverPosition.lng]);
      } else {
        markers.driverMarker = L.marker([driverPosition.lat, driverPosition.lng], {
          icon: createDriverIcon(),
        }).addTo(map);
      }
    } else if (markers.driverMarker) {
      markers.driverMarker.remove();
      delete markers.driverMarker;
    }

    // 4. Route line (cyan neon glow) - strictly drawn when both points exist AND showRouteLine is true
    if (origin && destination && showRouteLine !== false) {
      const latlngs: [number, number][] = [
        [origin.lat, origin.lng],
        ...(driverPosition
          ? ([[driverPosition.lat, driverPosition.lng]] as [number, number][])
          : []),
        [destination.lat, destination.lng],
      ];

      if (markers.routeLine) {
        markers.routeLine.setLatLngs(latlngs);
      } else {
        markers.routeLine = L.polyline(latlngs, {
          color: '#06b6d4',
          weight: 4,
          opacity: 0.9,
          dashArray: '6, 6',
          lineCap: 'round',
        }).addTo(map);
      }

      try {
        const bounds = L.latLngBounds([
          [origin.lat, origin.lng],
          [destination.lat, destination.lng],
          ...(driverPosition ? [[driverPosition.lat, driverPosition.lng] as [number, number]] : []),
        ]);
        // Use animate: false to completely prevent _onZoomTransitionEnd unhandled errors
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 16, animate: false });
      } catch {
        // Fallback
      }
    } else if (markers.routeLine) {
      markers.routeLine.remove();
      delete markers.routeLine;
    } else if (origin) {
      try {
        map.setView([origin.lat, origin.lng], 14, { animate: false });
      } catch {
        // Fallback
      }
    }
  }, [origin, destination, driverPosition, showRouteLine]);

  // Track container pixel coordinates for pending point mini-card
  const [pinPixelPos, setPinPixelPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !pendingPoint) {
      setPinPixelPos(null);
      return;
    }

    const updatePos = () => {
      if (!map || !pendingPoint) return;
      try {
        const pt = map.latLngToContainerPoint([
          pendingPoint.point.lat,
          pendingPoint.point.lng,
        ]);
        setPinPixelPos({ x: pt.x, y: pt.y });
      } catch {
        // Safe catch
      }
    };

    updatePos();
    map.on('move', updatePos);
    map.on('zoom', updatePos);

    return () => {
      map.off('move', updatePos);
      map.off('zoom', updatePos);
    };
  }, [pendingPoint]);

  return (
    <div className={`relative w-full max-w-full ${heightClass} rounded-3xl overflow-hidden border border-cyan-500/25 bg-slate-950 shadow-lg shadow-cyan-950/30`}>
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* MINI-TARJETA FLOTANTE DIRECTAMENTE SOBRE EL PIN CON [✓] Y [X] */}
      {pinPixelPos && pendingPoint && (() => {
        const isFlippedBelow = pinPixelPos.y < 140;
        return (
          <div
            style={{
              position: 'absolute',
              left: `${pinPixelPos.x}px`,
              top: isFlippedBelow ? `${pinPixelPos.y + 24}px` : `${pinPixelPos.y - 24}px`,
              transform: isFlippedBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
              zIndex: 1000,
              pointerEvents: 'auto',
            }}
            className="animate-in zoom-in-95 duration-150"
          >
            <div className="bg-slate-950/95 backdrop-blur-md border-2 border-cyan-400 rounded-2xl p-2.5 shadow-[0_12px_35px_rgba(0,0,0,0.95)] shadow-cyan-950/90 flex flex-col items-center min-w-[210px] max-w-[260px] text-center space-y-1.5">
              {/* Header pill indicating Point A or B */}
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                    pendingPoint.type === 'origin'
                      ? 'bg-cyan-400 text-slate-950'
                      : 'bg-blue-500 text-white'
                  }`}
                >
                  {pendingPoint.type === 'origin' ? 'A' : 'B'}
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 font-mono">
                  {pendingPoint.type === 'origin' ? 'Punto A (Salida / Origen)' : 'Punto B (Llegada / Destino)'}
                </span>
              </div>

              <div className="text-xs font-black text-white truncate max-w-[220px] leading-tight">
                {pendingPoint.point.name}
              </div>

              <div className="text-[10px] text-slate-400 truncate max-w-[220px]">
                {pendingPoint.point.address}
              </div>

              {/* 2 Interactive Buttons: Green Checkmark & Red Cross */}
              <div className="flex items-center justify-center gap-2 w-full pt-1.5 border-t border-slate-800">
                {/* [✓] Palomita Verde: Confirma y fija el punto */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfirmPoint?.(pendingPoint.type);
                  }}
                  className="flex-1 py-1.5 px-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/30 border border-emerald-300/40 transition-all"
                  title={`Confirmar y Fijar Punto ${pendingPoint.type === 'origin' ? 'A' : 'B'}`}
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Confirmar</span>
                </button>

                {/* [X] Cruz Roja: Cancela / Rechaza la selección para reubicar */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancelPoint?.(pendingPoint.type);
                  }}
                  className="flex-1 py-1.5 px-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-95 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-rose-950/50 border border-rose-400/40 transition-all"
                  title="Cancelar y Reubicar"
                >
                  <X className="w-4 h-4 stroke-[3]" />
                  <span>Reubicar</span>
                </button>
              </div>

              {/* Triangle pointer */}
              {isFlippedBelow ? (
                <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[8px] border-b-cyan-400 absolute -top-2 left-1/2 -translate-x-1/2 pointer-events-none" />
              ) : (
                <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[8px] border-t-cyan-400 absolute -bottom-2 left-1/2 -translate-x-1/2 pointer-events-none" />
              )}
            </div>
          </div>
        );
      })()}

      {/* Floating Mode Indicator if picking point */}
      {selectionMode && !pendingPoint && (
        <div className="absolute top-2.5 inset-x-3 z-20 pointer-events-none">
          <div className="w-full max-w-xs mx-auto bg-slate-950/90 text-white backdrop-blur-md px-3 py-1.5 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-2 shadow-lg border border-cyan-500/40">
            <span className={`w-2 h-2 rounded-full ${selectionMode === 'origin' ? 'bg-cyan-400' : 'bg-blue-400'} animate-ping`} />
            <span className="truncate">
              Toca el mapa para ubicar {selectionMode === 'origin' ? 'Punto A (Salida)' : 'Punto B (Destino)'}
            </span>
          </div>
        </div>
      )}

      {/* Recenter Button (Always Valle de la Pascua) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          const map = mapInstanceRef.current;
          if (map && (map as unknown as { _mapPane?: HTMLElement })._mapPane) {
            try {
              map.setView([DEFAULT_VENEZUELA_CENTER.lat, DEFAULT_VENEZUELA_CENTER.lng], 14, { animate: false });
            } catch {
              // Ignore
            }
          }
        }}
        className="absolute bottom-2.5 right-2.5 z-20 bg-slate-900/90 backdrop-blur-md hover:bg-slate-800 text-cyan-300 text-[10px] font-bold px-2.5 py-1.5 rounded-xl shadow-md border border-cyan-500/30 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
        title="Centrar en Valle de la Pascua, Guárico"
      >
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        V. de la Pascua
      </button>
    </div>
  );
};
