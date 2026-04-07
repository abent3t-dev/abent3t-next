'use client';

import { useState } from 'react';

export interface LogoProps {
  variant?: 'default' | 'white' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showSubtitle?: boolean;
}

const LOGO_PATHS = {
  default: '/logos/logo-a3t.png',
  white: '/logos/logo-a3t.png', // Usando el mismo logo (asegurar que tenga fondo transparente)
  icon: '/logos/logo-icon.png',
};

const SIZES = {
  sm: { width: 80, height: 28 },
  md: { width: 120, height: 40 },
  lg: { width: 180, height: 60 },
  xl: { width: 240, height: 80 },
};

const ICON_SIZES = {
  sm: { width: 28, height: 28 },
  md: { width: 40, height: 40 },
  lg: { width: 60, height: 60 },
  xl: { width: 80, height: 80 },
};

// Fallback component when logo image is not available
function LogoFallback({
  size,
  variant,
  className,
  showSubtitle,
}: {
  size: 'sm' | 'md' | 'lg' | 'xl';
  variant: 'default' | 'white' | 'icon';
  className?: string;
  showSubtitle?: boolean;
}) {
  const isWhite = variant === 'white';
  const isIcon = variant === 'icon';

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  };

  const subtitleSizes = {
    sm: 'text-[8px]',
    md: 'text-xs',
    lg: 'text-sm',
    xl: 'text-base',
  };

  if (isIcon) {
    const iconDimensions = ICON_SIZES[size];
    return (
      <div
        className={`flex items-center justify-center bg-[#52AF32] rounded-lg ${className || ''}`}
        style={{ width: iconDimensions.width, height: iconDimensions.height }}
      >
        <span className={`font-bold text-white ${size === 'sm' ? 'text-sm' : size === 'md' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-3xl'}`}>
          A3T
        </span>
      </div>
    );
  }

  return (
    <div className={`text-center ${className || ''}`}>
      <h1 className={`font-bold tracking-tight ${textSizes[size]} ${isWhite ? 'text-white' : 'text-gray-900'}`}>
        Abent <span className="text-[#52AF32]">3T</span>
      </h1>
      {showSubtitle && (
        <p className={`font-medium mt-0.5 ${subtitleSizes[size]} ${isWhite ? 'text-gray-300' : 'text-gray-500'}`}>
          Sistema de Capacitacion
        </p>
      )}
    </div>
  );
}

export function Logo({
  variant = 'default',
  size = 'md',
  className,
  showSubtitle = false,
}: LogoProps) {
  const [imageError, setImageError] = useState(false);

  const dimensions = variant === 'icon' ? ICON_SIZES[size] : SIZES[size];
  const logoPath = LOGO_PATHS[variant];

  if (imageError) {
    return (
      <LogoFallback
        size={size}
        variant={variant}
        className={className}
        showSubtitle={showSubtitle}
      />
    );
  }

  return (
    <div className={`flex flex-col items-center ${className || ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoPath}
        alt="Abent 3T"
        width={dimensions.width}
        height={dimensions.height}
        className="object-contain"
        onError={() => setImageError(true)}
      />
      {showSubtitle && (
        <p className={`font-medium mt-1 ${
          size === 'sm' ? 'text-[8px]' : size === 'md' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-base'
        } ${variant === 'white' ? 'text-gray-300' : 'text-gray-500'}`}>
          Sistema de Capacitacion
        </p>
      )}
    </div>
  );
}

export default Logo;
