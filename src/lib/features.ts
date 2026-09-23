/**
 * Banderas de UI (bloque 2026-09-23).
 *
 * D7: Ingrid pidió desactivar las requisiciones/OC propias de la plataforma
 * ("no la vamos a ocupar": todo se gestiona en SAP y Maximo). Se OCULTAN en
 * la UI sin borrar backend ni rutas; para volver a mostrarlas basta con
 * NEXT_PUBLIC_SHOW_INTERNAL_REQUISITIONS=true en el build.
 */
export const SHOW_INTERNAL_REQUISITIONS =
  process.env.NEXT_PUBLIC_SHOW_INTERNAL_REQUISITIONS === 'true';
