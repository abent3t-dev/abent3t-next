/**
 * Almacén (0026 y 0027) — lo que regresa el API del reporte de inventario al corte.
 * Las fechas vienen sin zona ('AAAA-MM-DDTHH:MM:SS'), en hora de México, como
 * Maximo: se muestran tal cual (ver lib/almacen-format.ts).
 */

export interface AlmacenTotales {
  /** Con el tipo de cambio del día de cada entrada. */
  pesos: number;
  /** Con el tipo de cambio de la orden de compra. */
  pesosOc: number;
  /** Artículos distintos. */
  articulos: number;
  unidades: number;
  sinValuarArticulos: number;
  sinValuarUnidades: number;
}

/** Una ubicación del corte: clave y descripción de Maximo, su tipo y el grupo del reporte. */
export interface AlmacenUbicacion {
  clave: string;
  descripcion: string;
  tipo: string;
  grupo: string;
}

/** Los grupos de ubicaciones, en el orden del reporte. */
export const GRUPOS_ALMACEN = ['CENTRAL', 'Almacenes y contenedores', 'Cajas de herramientas', 'Zona de recepción'];

export interface AlmacenCorte {
  id: string;
  /** El alcance: CENTRAL (versión 1) o TODOS (versión 2). */
  almacen: string;
  fechaCorte: string;
  /** Las cargas de la misma fecha de corte. */
  version: number;
  /** La versión del reporte que se entregó (la del Excel). */
  versionReporte: number;
  estado: 'publicado' | 'reemplazado';
  revision: 'en_revision' | 'aceptado';
  aceptadoEn: string | null;
  titulo: string;
  fuente: string;
  totales: AlmacenTotales;
  ubicaciones: AlmacenUbicacion[];
  archivo: { nombre: string; sha256: string };
  cargadoEn: string;
  reemplazadoEn: string | null;
}

export interface AlmacenGrupo {
  clave: string;
  importe: number;
  importeOc: number;
  unidades: number;
  unidadesSinCosto: number;
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
  /** Por almacén. */
  ubicacion: AlmacenGrupo[];
  /** Los de mayor importe con el tipo de cambio del día de la entrada… */
  mayores: AlmacenArticuloMayor[];
  /** …y con el de la OC. */
  mayoresOc: AlmacenArticuloMayor[];
}

export interface AlmacenCorteDetalle extends AlmacenCorte {
  /** El filtro aplicado (clave de una ubicación o nombre de un grupo), o null. */
  filtro: string | null;
  /** Los almacenes que entran en el filtro. */
  almacenes: string[];
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
  /** Solo en CENTRAL (su reporte de inventario solo trae CENTRAL); fuera, null. */
  enSuInventario: boolean | null;
  unidadEntrada: string | null;
  nota: string | null;
  /** Lo que va sin costo: por qué y cómo llegó el saldo a ese almacén. */
  motivo: string | null;
  comoLlego: string | null;
}

export const SIN_COSTO = 'Sin entrada con costo';

export interface AlmacenDevolucion {
  orden: number;
  fecha: string;
  fechaCaptura: string | null;
  documento: string | null;
  documentoDescripcion: string | null;
  almacen: string;
  anaquel: string | null;
  parte: string;
  descripcion: string;
  cantidad: number;
  unidad: string | null;
  costoMaximoUsd: number;
  costo: number | null;
  moneda: string | null;
  tipoCambio: number | null;
  importePesos: number | null;
  tipoCambioOc: number | null;
  importePesosOc: number | null;
  valuacion: string | null;
  oc: string | null;
  observacion: string | null;
  marcas: string[];
  salioAntes: number | null;
  salio12m: number | null;
  ultimaSalida: string | null;
  otUltimaSalida: string | null;
  saldoAlmacen: number | null;
  saldoOtras: number | null;
}

export interface AlmacenDevolucionesResumen {
  totales: {
    lineas: number;
    unidades: number;
    articulos: number;
    documentos: number;
    centralLineas: number;
    centralUnidades: number;
    costoCero: number;
    sinValuar: number;
    pesos: number;
    pesosOc: number;
    /** De ese valor, lo de las líneas que Maximo tiene en 0 (valuadas con una recepción del artículo). */
    pesosCostoCero: number;
    usdMaximo: number;
  };
  porDia: { dia: string; lineas: number; unidades: number; documentos: number }[];
  porDocumento: { documento: string; descripcion: string | null; fecha: string; lineas: number; unidades: number; almacenes: string[] }[];
  /** Todas las ubicaciones, desde 2019. */
  porMes: { mes: string; lineas: number; unidades: number }[];
  porMarca: { marca: string; articulos: number; lineas: number }[];
}

export interface AlmacenDevoluciones {
  lineas: AlmacenDevolucion[];
  resumen: AlmacenDevolucionesResumen;
}
