import React from 'react';

interface ServiceIconProps {
  className?: string;
  size?: number;
}

/**
 * Rescátalo Moto: Sleek Motorcycle with rider icon
 * Condición: 1 Solo pasajero
 */
export const MotoPassengerIcon: React.FC<ServiceIconProps> = ({ className = '', size = 28 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Front wheel */}
      <circle cx="37" cy="33" r="8" stroke="currentColor" strokeWidth="3" fill="none" />
      <circle cx="37" cy="33" r="3" fill="currentColor" />
      
      {/* Rear wheel */}
      <circle cx="11" cy="33" r="8" stroke="currentColor" strokeWidth="3" fill="none" />
      <circle cx="11" cy="33" r="3" fill="currentColor" />

      {/* Frame / Chassis */}
      <path
        d="M11 33L21 27L29 27L37 33"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 27L25 18L34 18"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M25 18L32 30"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Motorcycle Seat (Single passenger) */}
      <path
        d="M16 23C18 23 21 24 23 24"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Handlebars */}
      <path
        d="M32 15L35 12"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Headlight beam */}
      <path
        d="M36 21L43 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* Rider Helmet / Head */}
      <circle cx="23" cy="11" r="4.5" fill="currentColor" />
      {/* Rider Body leaning into handlebar */}
      <path
        d="M21 16L24 24M24 16L32 17"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

/**
 * Rescátalo Delivery: Motorcycle with delivery thermal box / backpack on the rear
 */
export const MotoDeliveryIcon: React.FC<ServiceIconProps> = ({ className = '', size = 28 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Front wheel */}
      <circle cx="37" cy="33" r="8" stroke="currentColor" strokeWidth="3" fill="none" />
      <circle cx="37" cy="33" r="3" fill="currentColor" />

      {/* Rear wheel */}
      <circle cx="11" cy="33" r="8" stroke="currentColor" strokeWidth="3" fill="none" />
      <circle cx="11" cy="33" r="3" fill="currentColor" />

      {/* Frame & Fork */}
      <path
        d="M11 33L20 28L28 28L37 33"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M28 28L32 19L36 19"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 28L31 31"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Handlebars */}
      <path
        d="M34 16L37 14"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* DELIVERY BOX / THERMAL BACKPACK ON THE REAR RACK */}
      <rect
        x="6"
        y="12"
        width="13"
        height="14"
        rx="2.5"
        fill="currentColor"
        fillOpacity="0.25"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      {/* Delivery Box Straps & reflective stripe */}
      <path
        d="M6 19H19"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12.5" cy="15.5" r="1.5" fill="currentColor" />

      {/* Driver Helmet */}
      <circle cx="26" cy="11" r="4" fill="currentColor" />
      {/* Driver Body */}
      <path
        d="M25 15L27 24M27 16L33 18"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

/**
 * Rescátalo Moto Taxi: Icono de Moto en color amarillo divertido
 */
export const YellowMotoTaxiIcon: React.FC<ServiceIconProps> = ({ className = '', size = 28 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="moto_yellow_grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FACC15" />
          <stop offset="50%" stopColor="#EAB308" />
          <stop offset="100%" stopColor="#CA8A04" />
        </linearGradient>
      </defs>
      {/* Front wheel */}
      <circle cx="37" cy="33" r="8" stroke="#FACC15" strokeWidth="3" fill="#1E293B" />
      <circle cx="37" cy="33" r="3" fill="#FDE047" />
      
      {/* Rear wheel */}
      <circle cx="11" cy="33" r="8" stroke="#FACC15" strokeWidth="3" fill="#1E293B" />
      <circle cx="11" cy="33" r="3" fill="#FDE047" />

      {/* Frame / Chassis in vibrant Yellow */}
      <path
        d="M11 33L21 27L29 27L37 33"
        stroke="url(#moto_yellow_grad)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 27L25 18L34 18"
        stroke="url(#moto_yellow_grad)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M25 18L32 30"
        stroke="#FDE047"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Taxi Seat with taxi checker pattern/accent */}
      <path
        d="M16 23C18 23 21 24 23 24"
        stroke="#FACC15"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Handlebars */}
      <path
        d="M32 15L36 12"
        stroke="#FEF08A"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Headlight beam */}
      <path
        d="M36 21L44 20"
        stroke="#FACC15"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Driver Helmet with Taxi Badge */}
      <circle cx="23" cy="11" r="5" fill="#EAB308" stroke="#FEF08A" strokeWidth="1" />
      <path
        d="M21 16L24 24M24 16L32 17"
        stroke="#FDE047"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Fun Taxi mini-badge */}
      <rect x="29" y="8" width="10" height="5" rx="1.5" fill="#FACC15" />
      <text x="30" y="12" fill="#0F172A" fontSize="4" fontWeight="900" fontFamily="sans-serif">TAXI</text>
    </svg>
  );
};

/**
 * Rescátalo Mandados: Icono de Bolsa de Delivery con compras/mandados
 */
export const DeliveryBagIcon: React.FC<ServiceIconProps> = ({ className = '', size = 28 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="bag_grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="50%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>

      {/* Handles */}
      <path
        d="M17 17V12C17 8.5 20 6 24 6C28 6 31 8.5 31 12V17"
        stroke="#34D399"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Bag Body */}
      <path
        d="M9 16L12 40C12.3 41.5 13.5 42 15 42H33C34.5 42 35.7 41.5 36 40L39 16C39.5 14.5 38.5 14 37 14H11C9.5 14 8.5 14.5 9 16Z"
        fill="url(#bag_grad)"
        stroke="#6EE7B7"
        strokeWidth="2"
      />

      {/* Bag Folding & Details */}
      <path
        d="M11 19H37"
        stroke="#A7F3D0"
        strokeWidth="1.5"
        strokeDasharray="2 2"
      />

      {/* Delivery Sparkle / Smile / Heart / Checkmark for Fun look */}
      <path
        d="M19 27L22.5 30.5L29 24"
        stroke="#064E3B"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Fun Apple/Bread peeking or Delivery badge */}
      <circle cx="34" cy="14" r="3.5" fill="#F87171" stroke="#FEF2F2" strokeWidth="1" />
      <path d="M34 10.5C34 10.5 35 9 36 9" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};
