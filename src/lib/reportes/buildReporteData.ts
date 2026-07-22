import { supabase } from '../supabase'
import type { GastoGeneral, Reparacion, Vehiculo } from '../../types'

const MESES_LARGOS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const MESES_SLUG = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
]

export interface ReportePeriodo {
  tipo: 'mes' | 'anio'
  label: string
  key: string
  filenameSlug: string
}

export interface ReporteKpis {
  gananciaNeta: number
  ventas: number
  ingresos: number
  inversion: number
  gastosGenerales: number
  roiPromedio: number
}

export interface ReporteMarca {
  marca: string
  unidades: number
  ingresos: number
  costo: number
  ganancia: number
  roi: number
}

export interface ReporteVendido {
  marca: string
  modelo: string
  anio: number
  fechaVenta: string
  precioCompra: number
  gastosAdic: number
  reparaciones: number
  precioVenta: number
  ganancia: number
  roi: number
}

export interface ReporteReparacion extends Reparacion {
  vehiculo: { marca: string; modelo: string; anio: number } | null
}

export interface ReporteData {
  periodo: ReportePeriodo
  generadoEn: string
  kpis: ReporteKpis
  porMarca: ReporteMarca[]
  vendidos: ReporteVendido[]
  gastos: GastoGeneral[]
  reparaciones: ReporteReparacion[]
}

function buildPeriodo(tipo: 'mes' | 'anio', anio: number, mes: number | null): ReportePeriodo {
  if (tipo === 'mes' && mes !== null) {
    const mm = String(mes + 1).padStart(2, '0')
    return {
      tipo: 'mes',
      label: `${MESES_LARGOS[mes]} ${anio}`,
      key: `${anio}-${mm}`,
      filenameSlug: `${MESES_SLUG[mes]}-${anio}`,
    }
  }
  return {
    tipo: 'anio',
    label: `Año ${anio}`,
    key: String(anio),
    filenameSlug: String(anio),
  }
}

function periodoRange(tipo: 'mes' | 'anio', anio: number, mes: number | null): { gte: string; lt: string } {
  // Rango [gte, lt) sobre columnas DATE (Postgres no acepta LIKE en date).
  if (tipo === 'mes' && mes !== null) {
    const start = new Date(anio, mes, 1)
    const end = new Date(anio, mes + 1, 1)
    return { gte: toISODate(start), lt: toISODate(end) }
  }
  return { gte: `${anio}-01-01`, lt: `${anio + 1}-01-01` }
}

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function buildReporteData(
  tipo: 'mes' | 'anio',
  anio: number,
  mes: number | null,
): Promise<ReporteData> {
  const periodo = buildPeriodo(tipo, anio, mes)
  const { gte, lt } = periodoRange(tipo, anio, mes)

  const [vehiculosRes, gastosRes, reparacionesRes, repAggRes] = await Promise.all([
    supabase.from('vehiculos').select('*'),
    supabase.from('gastos_generales').select('*').gte('fecha', gte).lt('fecha', lt).order('fecha', { ascending: true }),
    supabase
      .from('reparaciones')
      .select('*, vehiculos(marca, modelo, anio)')
      .gte('fecha', gte).lt('fecha', lt)
      .order('fecha', { ascending: true }),
    supabase.from('reparaciones').select('vehiculo_id, costo'),
  ])

  if (vehiculosRes.error) throw new Error(`vehículos: ${vehiculosRes.error.message}`)
  if (gastosRes.error) throw new Error(`gastos: ${gastosRes.error.message}`)
  if (reparacionesRes.error) throw new Error(`reparaciones: ${reparacionesRes.error.message}`)
  if (repAggRes.error) throw new Error(`reparaciones agg: ${repAggRes.error.message}`)

  const vehiculos = (vehiculosRes.data ?? []) as Vehiculo[]
  const gastos = (gastosRes.data ?? []) as GastoGeneral[]
  const reparaciones = (reparacionesRes.data ?? []) as unknown as ReporteReparacion[]

  // Mapa de reparaciones totales por vehículo (todas, no solo del período) —
  // necesario para calcular costo_total de cada vehículo vendido.
  const repTotalsByVehiculo: Record<string, number> = {}
  ;(repAggRes.data ?? []).forEach((r) => {
    repTotalsByVehiculo[r.vehiculo_id] = (repTotalsByVehiculo[r.vehiculo_id] ?? 0) + r.costo
  })

  const costoVehiculo = (v: Vehiculo) =>
    v.precio_compra + (v.gastos_adicionales ?? 0) + (repTotalsByVehiculo[v.id] ?? 0)

  // Vendidos del período
  const vendidosVehiculos = vehiculos.filter((v) =>
    v.estado === 'vendido' && v.precio_venta != null && v.fecha_venta?.startsWith(periodo.key),
  )

  const vendidos: ReporteVendido[] = vendidosVehiculos.map((v) => {
    const reparacionesCosto = repTotalsByVehiculo[v.id] ?? 0
    const costo = costoVehiculo(v)
    const ganancia = v.precio_venta! - costo
    return {
      marca: v.marca,
      modelo: v.modelo,
      anio: v.anio,
      fechaVenta: v.fecha_venta ?? '',
      precioCompra: v.precio_compra,
      gastosAdic: v.gastos_adicionales ?? 0,
      reparaciones: reparacionesCosto,
      precioVenta: v.precio_venta!,
      ganancia,
      roi: costo > 0 ? (ganancia / costo) * 100 : 0,
    }
  }).sort((a, b) => b.ganancia - a.ganancia)

  // Agregación por marca (sobre vendidos del período)
  const marcaAgg: Record<string, { unidades: number; ingresos: number; costo: number; ganancia: number }> = {}
  vendidosVehiculos.forEach((v) => {
    const costo = costoVehiculo(v)
    const ganancia = v.precio_venta! - costo
    if (!marcaAgg[v.marca]) marcaAgg[v.marca] = { unidades: 0, ingresos: 0, costo: 0, ganancia: 0 }
    marcaAgg[v.marca].unidades++
    marcaAgg[v.marca].ingresos += v.precio_venta!
    marcaAgg[v.marca].costo += costo
    marcaAgg[v.marca].ganancia += ganancia
  })

  const porMarca: ReporteMarca[] = Object.entries(marcaAgg)
    .map(([marca, d]) => ({
      marca,
      unidades: d.unidades,
      ingresos: d.ingresos,
      costo: d.costo,
      ganancia: d.ganancia,
      roi: d.costo > 0 ? (d.ganancia / d.costo) * 100 : 0,
    }))
    .sort((a, b) => b.ganancia - a.ganancia)

  // KPIs
  const ingresos = vendidosVehiculos.reduce((s, v) => s + (v.precio_venta ?? 0), 0)
  const compradosPeriodo = vehiculos.filter((v) => v.fecha_compra?.startsWith(periodo.key))
  const inversion = compradosPeriodo.reduce((s, v) => s + v.precio_compra + (v.gastos_adicionales ?? 0), 0)
  const gastosGenerales = gastos.reduce((s, g) => s + g.monto, 0)
  const gananciaBruta = vendidosVehiculos.reduce((s, v) => s + (v.precio_venta! - costoVehiculo(v)), 0)
  const gananciaNeta = gananciaBruta - gastosGenerales
  const costoTotalVendidos = vendidosVehiculos.reduce((s, v) => s + costoVehiculo(v), 0)
  const roiPromedio = costoTotalVendidos > 0 ? (gananciaBruta / costoTotalVendidos) * 100 : 0

  return {
    periodo,
    generadoEn: new Date().toISOString(),
    kpis: {
      gananciaNeta,
      ventas: vendidosVehiculos.length,
      ingresos,
      inversion,
      gastosGenerales,
      roiPromedio,
    },
    porMarca,
    vendidos,
    gastos,
    reparaciones,
  }
}
