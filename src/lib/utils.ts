// ============================================
// AutoDealer PWA — Utilidades Generales
// ============================================

// ---- MONEDA ----

/**
 * Formatea un número como moneda (USD por defecto)
 */
export function formatearMoneda(
  valor: number,
  moneda = 'USD',
  locale = 'es-AR'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor)
}

/**
 * Formatea un número como porcentaje
 */
export function formatearPorcentaje(valor: number, decimales = 1): string {
  return `${valor.toFixed(decimales)}%`
}

// ---- FECHAS ----

/**
 * Formatea una fecha ISO a formato legible en español
 */
export function formatearFecha(fecha: string, formato: 'corto' | 'largo' | 'relativo' = 'corto'): string {
  const date = new Date(fecha + 'T00:00:00') // evitar offset de timezone

  if (formato === 'relativo') {
    const ahora = new Date()
    const diff = ahora.getTime() - date.getTime()
    const dias = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (dias === 0) return 'Hoy'
    if (dias === 1) return 'Ayer'
    if (dias < 7) return `Hace ${dias} días`
    if (dias < 30) return `Hace ${Math.floor(dias / 7)} semanas`
    if (dias < 365) return `Hace ${Math.floor(dias / 30)} meses`
    return `Hace ${Math.floor(dias / 365)} años`
  }

  return date.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: formato === 'largo' ? 'long' : 'short',
    year: 'numeric',
  })
}

/**
 * Retorna el mes y año actual en formato YYYY-MM
 */
export function getMesActual(): string {
  const ahora = new Date()
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Retorna array de los últimos N meses en formato YYYY-MM
 */
export function getUltimosMeses(n: number): string[] {
  const meses: string[] = []
  const ahora = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
    meses.push(`${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`)
  }
  return meses
}

/**
 * Nombre del mes en español
 */
export function getNombreMes(mesYYYYMM: string): string {
  const [anio, mes] = mesYYYYMM.split('-').map(Number)
  return new Date(anio, mes - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

// ---- CÁLCULOS FINANCIEROS ----

/**
 * Calcula el costo total de un vehículo
 */
export function calcularCostoTotal(
  precioCompra: number,
  gastosAdicionales: number,
  totalReparaciones: number
): number {
  return precioCompra + gastosAdicionales + totalReparaciones
}

/**
 * Calcula la ganancia bruta
 */
export function calcularGanancia(precioVenta: number, costoTotal: number): number {
  return precioVenta - costoTotal
}

/**
 * Calcula el margen de ganancia en porcentaje
 */
export function calcularMargen(ganancia: number, precioVenta: number): number {
  if (precioVenta === 0) return 0
  return (ganancia / precioVenta) * 100
}

/**
 * Calcula el ROI (Return on Investment)
 */
export function calcularROI(ganancia: number, costoTotal: number): number {
  if (costoTotal === 0) return 0
  return (ganancia / costoTotal) * 100
}

// ---- COLORES SEMÁNTICOS ----

/**
 * Retorna color iOS según si un valor es positivo o negativo
 */
export function colorPorValor(valor: number): string {
  if (valor > 0) return 'var(--ios-green)'
  if (valor < 0) return 'var(--ios-red)'
  return 'var(--ios-label-secondary)'
}

/**
 * Color por estado de vehículo
 */
export function colorPorEstado(estado: string): string {
  const colores: Record<string, string> = {
    en_stock:       'var(--ios-blue)',
    vendido:        'var(--ios-green)',
    en_reparacion:  'var(--ios-orange)',
    reservado:      'var(--ios-purple)',
  }
  return colores[estado] ?? 'var(--ios-label-secondary)'
}

/**
 * Label legible por estado de vehículo
 */
export function labelPorEstado(estado: string): string {
  const labels: Record<string, string> = {
    en_stock:       'En Stock',
    vendido:        'Vendido',
    en_reparacion:  'En Reparación',
    reservado:      'Reservado',
  }
  return labels[estado] ?? estado
}

// ---- HELPERS ----

/**
 * Nombre completo del vehículo
 */
export function nombreVehiculo(v: { marca: string; modelo: string; anio: number }): string {
  return `${v.marca} ${v.modelo} ${v.anio}`
}

/**
 * Genera un ID único simple (para uso en frontend)
 */
export function generarId(): string {
  return Math.random().toString(36).substring(2, 9)
}

/**
 * Agrupa un array por una clave
 */
export function agruparPor<T>(array: T[], clave: keyof T): Record<string, T[]> {
  return array.reduce((acc, item) => {
    const key = String(item[clave])
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

/**
 * Suma una propiedad numérica de un array
 */
export function sumar<T>(array: T[], clave: keyof T): number {
  return array.reduce((acc, item) => acc + (Number(item[clave]) || 0), 0)
}

// ---- SHADCN UTILITY ----

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ---- DÍAS EN LOTE ----

/**
 * Días transcurridos desde fecha_compra hasta hoy
 */
export function diasEnLote(fechaCompra: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - new Date(fechaCompra + 'T00:00:00').getTime()) / 86_400_000)
}

/**
 * Nivel de alerta semáforo para días en lote
 */
export function alertaLote(dias: number): {
  color: string
  bg: string
  nivel: 'verde' | 'amarillo' | 'rojo'
} {
  if (dias < 30) return { color: '#7AAB8E', bg: 'rgba(122,171,142,0.12)', nivel: 'verde' }
  if (dias < 60) return { color: '#B89870', bg: 'rgba(184,152,112,0.12)', nivel: 'amarillo' }
  return { color: '#C07070', bg: 'rgba(192,112,112,0.12)', nivel: 'rojo' }
}
