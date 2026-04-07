/**
 * A3T Visual Identity - Color System
 *
 * Basado en el Manual de Identidad Visual A3T
 * Colores corporativos y secundarios para uso en toda la aplicación
 */

// Colores Corporativos A3T
export const COLORS_A3T = {
  // Gris Oscuro (Primary)
  grayDark: '#424846',

  // Verde (Primary)
  greenPrimary: '#52AF32',
  greenSecondary1: '#67B52E',
  greenSecondary2: '#74B82B',

  // Azul Marino
  blueNavy: '#222D59',

  // Dorado
  gold: '#DFA922',
} as const;

// Colores de Estado (para UI feedback)
export const STATUS_COLORS = {
  success: '#10b981',    // Verde éxito
  warning: '#f59e0b',    // Amarillo advertencia
  error: '#ef4444',      // Rojo error
  info: '#3b82f6',       // Azul información
  pending: '#f97316',    // Naranja pendiente
} as const;

// Paleta completa para gráficas y visualizaciones
export const CHART_COLORS = {
  primary: [
    COLORS_A3T.greenPrimary,
    COLORS_A3T.greenSecondary1,
    COLORS_A3T.greenSecondary2,
  ],
  secondary: [
    COLORS_A3T.blueNavy,
    COLORS_A3T.grayDark,
    COLORS_A3T.gold,
  ],
  full: [
    COLORS_A3T.greenPrimary,   // Verde principal
    COLORS_A3T.blueNavy,        // Azul marino
    COLORS_A3T.gold,            // Dorado
    COLORS_A3T.greenSecondary1, // Verde claro
    STATUS_COLORS.info,         // Azul info
    STATUS_COLORS.warning,      // Naranja
    COLORS_A3T.greenSecondary2, // Verde más claro
    STATUS_COLORS.pending,      // Naranja pendiente
    COLORS_A3T.grayDark,        // Gris oscuro
    STATUS_COLORS.success,      // Verde éxito
  ],
} as const;

// Export default para fácil importación
export default {
  colors: COLORS_A3T,
  status: STATUS_COLORS,
  chart: CHART_COLORS,
};
