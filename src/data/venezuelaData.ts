import { LocationPoint, ServiceType } from '../types';

// Default centered on Valle de la Pascua, Estado Guárico, Venezuela
export const DEFAULT_VENEZUELA_CENTER = {
  lat: 9.2155,
  lng: -66.0108,
  zoom: 14,
};

export const POPULAR_LOCATIONS: LocationPoint[] = [
  {
    name: 'Plaza Bolívar (Valle de la Pascua)',
    address: 'Calle Real con Calle González Padrón, Centro',
    lat: 9.2163,
    lng: -66.0092,
  },
  {
    name: 'Catedral Nuestra Señora de la Candelaria',
    address: 'Frente a la Plaza Bolívar, Centro, Valle de la Pascua',
    lat: 9.2168,
    lng: -66.0089,
  },
  {
    name: 'Av. Rómulo Gallegos',
    address: 'Av. Rómulo Gallegos con Calle Atarraya',
    lat: 9.2185,
    lng: -66.0120,
  },
  {
    name: 'Terminal de Pasajeros de La Pascua',
    address: 'Av. Las Industrias, Valle de la Pascua',
    lat: 9.2241,
    lng: -66.0045,
  },
  {
    name: 'Hospital Rafael Zamora Arévalo',
    address: 'Av. Las Garcitas, Valle de la Pascua',
    lat: 9.2110,
    lng: -66.0185,
  },
  {
    name: 'Urb. Las Garcitas (Sector 2)',
    address: 'Sector 2, Las Garcitas, Valle de la Pascua',
    lat: 9.2080,
    lng: -66.0010,
  },
  {
    name: 'Urb. Las Garcitas (Sector 1)',
    address: 'Sector 1, Las Garcitas, Valle de la Pascua',
    lat: 9.2095,
    lng: -66.0025,
  },
  {
    name: 'Av. Manapire / CC Galerías',
    address: 'Av. Manapire con Calle Guafillas',
    lat: 9.2140,
    lng: -66.0150,
  },
  {
    name: 'Farmatodo Valle de la Pascua',
    address: 'Av. Rómulo Gallegos cruce con Calle Retumbo',
    lat: 9.2190,
    lng: -66.0115,
  },
  {
    name: 'Supermercado Unicasa',
    address: 'Av. Las Industrias, Sector Centro Norte',
    lat: 9.2215,
    lng: -66.0070,
  },
  {
    name: 'Calle Real (Casco Central)',
    address: 'Calle Real entre Atarraya y Deleite, Centro',
    lat: 9.2172,
    lng: -66.0102,
  },
  {
    name: 'Calle Atarraya Norte',
    address: 'Calle Atarraya con Av. Rómulo Gallegos',
    lat: 9.2205,
    lng: -66.0125,
  },
  {
    name: 'Calle Atarraya Sur',
    address: 'Calle Atarraya cruce con Calle Camaleones',
    lat: 9.2135,
    lng: -66.0118,
  },
  {
    name: 'Calle Retumbo',
    address: 'Calle Retumbo con Av. Libertador',
    lat: 9.2155,
    lng: -66.0080,
  },
  {
    name: 'Calle Guafillas',
    address: 'Calle Guafillas, Sector San Antonio',
    lat: 9.2125,
    lng: -66.0160,
  },
  {
    name: 'Calle González Padrón',
    address: 'Calle González Padrón con Calle Real',
    lat: 9.2160,
    lng: -66.0090,
  },
  {
    name: 'Sector Guamachal',
    address: 'Sector Guamachal, Oeste de Valle de la Pascua',
    lat: 9.2130,
    lng: -66.0220,
  },
  {
    name: 'Urb. Banco Obrero',
    address: 'Urbanización Banco Obrero, Valle de la Pascua',
    lat: 9.2220,
    lng: -66.0170,
  },
  {
    name: 'Urb. Vipedi',
    address: 'Urbanización Vipedi, Valle de la Pascua',
    lat: 9.2250,
    lng: -66.0130,
  },
  {
    name: 'Sector Carlos Pérez',
    address: 'Sector Carlos Pérez, Este de La Pascua',
    lat: 9.2100,
    lng: -65.9960,
  },
  {
    name: 'Sector Los Olivos',
    address: 'Sector Los Olivos, Valle de la Pascua',
    lat: 9.2180,
    lng: -66.0020,
  },
  {
    name: 'Polideportivo Adriano Mancini',
    address: 'Av. Las Industrias, Sector Deportivo',
    lat: 9.2270,
    lng: -66.0090,
  },
  {
    name: 'UNERG (Núcleo Valle de la Pascua)',
    address: 'Av. Rómulo Gallegos, Campus Universitario',
    lat: 9.2290,
    lng: -66.0190,
  },
  {
    name: 'Redoma salida a Chaguaramas',
    address: 'Troncal 13, Salida Oeste, Valle de la Pascua',
    lat: 9.2310,
    lng: -66.0280,
  },
  {
    name: 'Redoma salida a El Socorro',
    address: 'Troncal 13, Salida Este, Valle de la Pascua',
    lat: 9.2050,
    lng: -65.9920,
  },
];

export const SERVICE_TYPES: ServiceType[] = [
  {
    id: 'rescate_moto',
    name: 'Rescátalo Moto Taxi',
    description: 'Transporte personal en moto taxi con casco incluido. Rápido, divertido y directo a tu destino.',
    iconName: 'YellowMotoTaxi',
    baseMultiplier: 1.0,
    estimatedMinutes: 12,
    estimatedTimeText: '10 a 15 min',
  },
  {
    id: 'rescate_delivery',
    name: 'Rescátalo Mandados',
    description: 'Envíos de compras, encomiendas, comida, farmacia y mandados rápidos y seguros.',
    iconName: 'MotoDelivery',
    baseMultiplier: 1.0,
    estimatedMinutes: 12,
    estimatedTimeText: '10 a 15 min',
  },
];

// Helper to determine Driver Performance Tier according to average star rating
export function getDriverPerformance(rating: number = 5.0): {
  tier: 'green' | 'yellow' | 'red';
  label: string;
  colorClass: string;
  borderClass: string;
  badgeClass: string;
  dotClass: string;
  delaySeconds: number;
  description: string;
} {
  const rounded = Math.round(rating * 100) / 100;
  if (rounded >= 4.5) {
    return {
      tier: 'green',
      label: 'Excelente rendimiento',
      colorClass: 'text-emerald-400',
      borderClass: 'border-emerald-500/40',
      badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50',
      dotClass: 'bg-emerald-400 shadow-emerald-400/50',
      delaySeconds: 0,
      description: 'Prioridad máxima: Despacho instantáneo (0s de retraso)',
    };
  } else if (rounded >= 3.5) {
    return {
      tier: 'yellow',
      label: 'Rendimiento regular',
      colorClass: 'text-amber-400',
      borderClass: 'border-amber-500/40',
      badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-500/50',
      dotClass: 'bg-amber-400 shadow-amber-400/50',
      delaySeconds: 3,
      description: 'Prioridad estándar: Despacho con 3 segundos de retraso',
    };
  } else {
    return {
      tier: 'red',
      label: 'Falta de rendimiento',
      colorClass: 'text-rose-400',
      borderClass: 'border-rose-500/40',
      badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-500/50',
      dotClass: 'bg-rose-400 shadow-rose-400/50',
      delaySeconds: 6,
      description: 'Prioridad reducida: Despacho con 6 segundos de retraso',
    };
  }
}

// Resolves a human-readable address based on coordinates in Valle de la Pascua
export function resolveValleDeLaPascuaAddress(lat: number, lng: number): { name: string; address: string } {
  let closest = POPULAR_LOCATIONS[0];
  let minDistance = 999999;

  for (const loc of POPULAR_LOCATIONS) {
    const d = calculateDistanceKm(lat, lng, loc.lat, loc.lng);
    if (d < minDistance) {
      minDistance = d;
      closest = loc;
    }
  }

  if (minDistance < 0.35) {
    return {
      name: closest.name,
      address: closest.address,
    };
  }

  if (lat > 9.222) {
    return {
      name: `Zona Norte / Av. Las Industrias (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      address: `Cerca de Av. Las Industrias, Valle de la Pascua`,
    };
  } else if (lat < 9.210 && lng > -66.008) {
    return {
      name: `Sector Las Garcitas (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      address: `Las Garcitas, Valle de la Pascua, Guárico`,
    };
  } else if (lng < -66.016) {
    return {
      name: `Sector Hospital / Guamachal (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      address: `Zona Oeste, Valle de la Pascua, Guárico`,
    };
  } else if (lat > 9.214 && lat < 9.220) {
    return {
      name: `Casco Central (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      address: `Calle Real / Av. Rómulo Gallegos, Valle de la Pascua`,
    };
  }

  return {
    name: `Ubicación en La Pascua (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    address: `Valle de la Pascua, Estado Guárico`,
  };
}

export interface PlaceSuggestion {
  name: string;
  address: string;
  category: 'avenida' | 'calle' | 'sector' | 'comercio' | 'lugar';
  lat: number;
  lng: number;
}

// Places autocomplete search for Valle de la Pascua matching from 1st letter
export function searchValleDeLaPascuaPlaces(query: string): PlaceSuggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: PlaceSuggestion[] = [];

  for (const loc of POPULAR_LOCATIONS) {
    const nameLower = loc.name.toLowerCase();
    const addrLower = loc.address.toLowerCase();

    if (nameLower.includes(q) || addrLower.includes(q)) {
      let category: PlaceSuggestion['category'] = 'lugar';
      if (nameLower.startsWith('av.') || addrLower.includes('av.')) category = 'avenida';
      else if (nameLower.startsWith('calle') || addrLower.includes('calle')) category = 'calle';
      else if (nameLower.startsWith('sector') || nameLower.startsWith('urb.')) category = 'sector';
      else if (
        nameLower.includes('farmacia') ||
        nameLower.includes('farmatodo') ||
        nameLower.includes('supermercado') ||
        nameLower.includes('unicasa')
      )
        category = 'comercio';

      results.push({
        name: loc.name,
        address: loc.address,
        category,
        lat: loc.lat,
        lng: loc.lng,
      });
    }
  }

  // If query is at least 3 letters and has no direct database matches, create localized suggestion
  if (results.length === 0 && q.length >= 3) {
    results.push({
      name: `${query.trim()}, Valle de la Pascua`,
      address: `Valle de la Pascua, Estado Guárico`,
      category: 'calle',
      lat: DEFAULT_VENEZUELA_CENTER.lat,
      lng: DEFAULT_VENEZUELA_CENTER.lng,
    });
  }

  return results.slice(0, 6);
}

// OpenStreetMap Nominatim search API for Venezuela addresses (Free, no API key required)
export async function searchNominatimVenezuela(query: string): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  // Get local Valle de la Pascua suggestions first
  const localResults = searchValleDeLaPascuaPlaces(trimmed);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    // Prioritize Venezuelan addresses via Nominatim
    const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      trimmed + ' Venezuela'
    )}&countrycodes=ve&limit=5&addressdetails=1`;

    const response = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'es',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return localResults;
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      return localResults;
    }

    interface NominatimItem {
      display_name: string;
      name?: string;
      lat: string;
      lon: string;
      type?: string;
      class?: string;
    }

    const nominatimResults: PlaceSuggestion[] = data.map((item: NominatimItem) => {
      const parts = item.display_name.split(',');
      const shortName = item.name || parts[0].trim();
      const cleanAddress = parts.slice(0, 3).join(', ').trim();

      let category: PlaceSuggestion['category'] = 'lugar';
      if (item.type === 'residential' || item.type === 'suburb') category = 'sector';
      else if (item.type === 'primary' || item.type === 'secondary' || item.type === 'highway') category = 'avenida';
      else if (item.type === 'street' || item.type === 'road') category = 'calle';
      else if (item.class === 'shop' || item.class === 'amenity') category = 'comercio';

      return {
        name: shortName,
        address: cleanAddress,
        category,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      };
    });

    // Combine local results and Nominatim results, avoiding duplicate names
    const combined: PlaceSuggestion[] = [...localResults];
    for (const nom of nominatimResults) {
      if (!combined.some((c) => c.name.toLowerCase() === nom.name.toLowerCase())) {
        combined.push(nom);
      }
    }

    return combined.slice(0, 6);
  } catch {
    // If network fails or times out, seamlessly return local data
    return localResults;
  }
}

// WhatsApp link generator
export function buildWhatsAppLink(phone: string, text: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('04')) {
    cleaned = '58' + cleaned.substring(1);
  } else if (cleaned.startsWith('4')) {
    cleaned = '58' + cleaned;
  }
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
}

// Detect city or zone in Venezuela
export function detectVenezuelanCityOrZone(lat: number, lng: number): string {
  const distToPascua = calculateDistanceKm(lat, lng, 9.2155, -66.0108);
  if (distToPascua < 25) {
    if (lat > 9.22) return 'Norte, Valle de la Pascua';
    if (lat < 9.21) return 'Las Garcitas, Valle de la Pascua';
    return 'Valle de la Pascua, Guárico';
  }

  const distToSanJuan = calculateDistanceKm(lat, lng, 9.9115, -67.3538);
  if (distToSanJuan < 30) return 'San Juan de los Morros, Guárico';

  const distToCalabozo = calculateDistanceKm(lat, lng, 8.9242, -67.4293);
  if (distToCalabozo < 30) return 'Calabozo, Guárico';

  return 'Valle de la Pascua, Guárico';
}

// Haversine formula to compute distance in km
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.max(0.8, Math.round(d * 10) / 10);
}

// Web Audio sound synthesizer for alerts
export function playAlertChime(type: 'incoming_order' | 'delivered' | 'accepted' | 'tap' | 'motorcycle_rev') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'motorcycle_rev') {
      const now = ctx.currentTime;
      // Synthesize motorcycle acceleration zoom
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(380, now + 0.35);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.55);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.65);
    } else if (type === 'incoming_order') {
      const now = ctx.currentTime;
      [0, 0.25, 0.5, 0.75].forEach((offset, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(idx % 2 === 0 ? 587.33 : 880, now + offset);
        gain.gain.setValueAtTime(0.2, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.2);
      });
    } else if (type === 'delivered') {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        gain.gain.setValueAtTime(0.25, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.4);
      });
    } else if (type === 'accepted') {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } else {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch {
    // Audio restricted
  }
}
