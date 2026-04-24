// ============================================
// AutoDealer PWA — Types & Interfaces
// ============================================

// ---- ENUMS ----

export type EstadoVehiculo = 'en_stock' | 'vendido' | 'en_reparacion' | 'reservado'

export type CategoriaReparacion =
  | 'mecanica'
  | 'carroceria'
  | 'electricidad'
  | 'interior'
  | 'neumaticos'
  | 'otro'

export type CategoriaGasto =
  | 'alquiler'
  | 'servicios'
  | 'marketing'
  | 'personal'
  | 'impuestos'
  | 'seguros'
  | 'otro'

// ---- MODELOS BASE ----

export interface Vehiculo {
  id: string
  created_at: string
  updated_at: string
  marca: string
  modelo: string
  anio: number
  vin?: string
  color?: string
  kilometraje: number
  precio_compra: number
  precio_venta?: number
  gastos_adicionales: number
  fecha_compra: string
  fecha_venta?: string
  estado: EstadoVehiculo
  notas?: string
  imagen_url?: string
  user_id: string
}

export interface Reparacion {
  id: string
  created_at: string
  updated_at: string
  vehiculo_id: string
  descripcion: string
  costo: number
  fecha: string
  proveedor?: string
  categoria: CategoriaReparacion
  comprobante_url?: string
  notas?: string
  user_id: string
}

export interface GastoGeneral {
  id: string
  created_at: string
  updated_at: string
  descripcion: string
  monto: number
  fecha: string
  categoria: CategoriaGasto
  recurrente: boolean
  comprobante_url?: string
  notas?: string
  user_id: string
}

// ---- VISTAS / CALCULADOS ----

export interface VehiculoFinanciero extends Vehiculo {
  total_reparaciones: number
  costo_total: number
  ganancia_bruta?: number
  margen_porcentaje?: number
  reparaciones?: Reparacion[]
}

// ---- FORMS ----

export interface VehiculoForm {
  marca: string
  modelo: string
  anio: number
  vin?: string
  color?: string
  kilometraje?: number
  precio_compra: number
  gastos_adicionales?: number
  fecha_compra: string
  estado: EstadoVehiculo
  notas?: string
}

export interface ReparacionForm {
  vehiculo_id: string
  descripcion: string
  costo: number
  fecha: string
  proveedor?: string
  categoria: CategoriaReparacion
  notas?: string
}

export interface GastoGeneralForm {
  descripcion: string
  monto: number
  fecha: string
  categoria: CategoriaGasto
  recurrente?: boolean
  notas?: string
}

export interface VentaForm {
  precio_venta: number
  fecha_venta: string
  notas?: string
}

// ---- DASHBOARD / REPORTES ----

export interface KPIDashboard {
  vehiculos_en_stock: number
  vehiculos_vendidos_mes: number
  ganancia_mes: number
  ganancia_total: number
  costo_reparaciones_mes: number
  gastos_generales_mes: number
  margen_promedio: number
}

export interface ReporteVentas {
  mes: string
  unidades_vendidas: number
  ingresos: number
  costos: number
  ganancia: number
  margen: number
}

// ---- EXCEL IMPORT ----

export interface ExcelVehiculoRow {
  marca?: string
  modelo?: string
  anio?: string | number
  vin?: string
  color?: string
  precio_compra?: string | number
  fecha_compra?: string
  notas?: string
  [key: string]: unknown
}

export interface ImportResult {
  exitosos: number
  fallidos: number
  errores: string[]
}

// ---- SUPABASE ----

export type TablesInsert<T> = Omit<T, 'id' | 'created_at' | 'updated_at' | 'user_id'>
export type TablesUpdate<T> = Partial<TablesInsert<T>>

// ---- HISTORIAL LOCAL ----

export interface GastoHistorial {
  id: string
  descripcion: string
  monto: number
  categoria: 'alquiler' | 'servicios' | 'marketing' | 'personal' | 'otro'
  fecha: string  // ISO date YYYY-MM-DD
}

export interface VentaHistorial {
  id: string
  marca: string
  modelo: string
  anio: number
  ganancia: number
  roi: number    // percentage e.g. 18.5
  dias: number   // días en lote
  fecha: string  // fecha de venta, ISO date YYYY-MM-DD
}
