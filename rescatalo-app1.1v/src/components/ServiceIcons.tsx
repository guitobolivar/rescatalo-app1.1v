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
