/**
 * Almacén (0026) — lo que regresa el API del reporte de inventario al corte.
 * Las fechas vienen sin zona ('AAAA-MM-DDTHH:MM:SS'), en hora de México, como
 * Maximo: se muestran tal cual (ver lib/almacen-format.ts).
 */

export interface AlmacenTotales {
  /** Con el tipo de cambio del día de cada entrada. */
  pesos: number;
  /** Con el tipo de cambio de la orden de compra. */
  pesosOc: number;
  articulos: number;
  unidades: number;
  sinValuarArticulos: number;
  sinValuarUnidades: number;
}

export interface AlmacenCorte {
  id: string;
  almacen: string;
  fechaCorte: string;
  version: number;
  estado: 'publicado' | 'reemplazado';
  titulo: string;
  fuente: string;
  totales: AlmacenTotales;
  archivo: { nombre: string; sha256: string };
  cargadoEn: string;
  reemplazadoEn: string | null;
}

export interface AlmacenGrupo {
  clave: string;
  importe: number;
  importeOc: number;
  unidades: number;
  filas: number;
  articulos: number;
}

export interface AlmacenArticuloMayor {
  parte: string;
  descripcion: string;
  importe: number;
  importeOc: number;
  cantidad: number;
  unidad: string | null;
}

export interface AlmacenResumen {
  clasificacion: AlmacenGrupo[];
  subclasificacion: AlmacenGrupo[];
  antiguedad: AlmacenGrupo[];
  moneda: AlmacenGrupo[];
  origen: AlmacenGrupo[];
  /** Los de mayor importe con el tipo de cambio del día de la entrada… */
  mayores: AlmacenArticuloMayor[];
  /** …y con el de la OC. */
  mayoresOc: AlmacenArticuloMayor[];
}

export interface AlmacenCorteDetalle extends AlmacenCorte {
  /** La hoja "Notas" del Excel: [título, texto]; un título sin texto es un encabezado. */
  notas: [string, string][];
  resumen: AlmacenResumen;
}

export interface AlmacenExistencia {
  orden: number;
  parte: string;
  descripcion: string;
  almacen: string;
  almacenFisico: string | null;
  clasificacion: string | null;
  costo: number | null;
  moneda: string | null;
  cantidad: number;
  unidad: string | null;
  fechaEntrada: string | null;
  fechaCaptura: string | null;
  tipoCambio: number | null;
  importePesos: number | null;
  tipoCambioOc: number | null;
  importePesosOc: number | null;
  origen: string;
  oc: string | null;
  fuenteTc: string | null;
  fuenteTcOc: string | null;
  saldoArticulo: number;
  regresaronRecientes: number | null;
  herramienta: boolean;
  enSuInventario: boolean;
  unidadEntrada: string | null;
  nota: string | null;
}

/**
 * Qué tipo de cambio se usa para los importes: el del día de la entrada o el
 * de la OC. El selector se queda mientras Contabilidad decide (pregunta 2 a
 * Mariana; documentation/INVENTARIO_HENRY.md).
 */
export type AlmacenTipoCambio = 'dia' | 'oc';

export const TIPO_CAMBIO_LABELS: Record<AlmacenTipoCambio, string> = {
  dia: 'Del día de la entrada',
  oc: 'De la orden de compra',
};
