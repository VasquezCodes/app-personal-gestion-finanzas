import { memo, startTransition, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'
import { useVehiculosStore } from '../../store/vehiculosStore'
import { BRAND_LOGOS } from '../Inventario/CargarVehiculoSheet'
import { supabase } from '../../lib/supabase'
import type { GastoGeneral } from '../../types'
import { useCountUp } from '../../hooks/animations/useCountUp'
import { useStaggerIn } from '../../hooks/animations/useStaggerIn'

const fmtN = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

type Periodo = 'mes' | 'trim' | 'anio'
type MetricaMarca = 'ganancia' | 'roi' | 'unidades' | 'dias'

const MESES_LARGOS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// Genera N colores únicos con hues equidistantes — sin colisiones para cualquier cantidad de marcas
function indexColor(i: number, total: number) {
  const hue = Math.round((i * 360) / Math.max(total, 1))
  return {
    color: `hsl(${hue}, 30%, 58%)`,
    bg:    `hsla(${hue}, 30%, 58%, 0.12)`,
  }
}

const RADIAN = Math.PI / 180

interface PieLabelProps {
  cx?: number
  cy?: number
  midAngle?: number
  outerRadius?: number
  percent?: number
  name?: string
  fill?: string
  [key: string]: unknown
}

function PieLabel(props: PieLabelProps): React.ReactElement | null {
  const { cx = 0, cy = 0, midAngle = 0, outerRadius = 0, percent = 0, name = '', fill = '#141413' } = props
  if (percent < 0.04) return null
  const radius = outerRadius + 30
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  const anchor = x > cx ? 'start' : 'end'
  // Two lines stacked: name above, % below — avoids horizontal overlap on both sides
  return (
    <text x={x} y={y} textAnchor={anchor} style={{ pointerEvents: 'none' }}>
      <tspan x={x} dy="-7" style={{ fontSize: 11, fontWeight: 700, fill: '#141413', fontFamily: 'var(--font)' }}>
        {name}
      </tspan>
      <tspan x={x} dy="15" style={{ fontSize: 10, fontWeight: 600, fill }}>
        {Math.round(percent * 100)}%
      </tspan>
    </text>
  )
}

interface PieEntry { name: string; value: number; fill: string }

const PieDistribution = memo(function PieDistribution({ data }: { data: PieEntry[] }) {
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={88}
            strokeWidth={2}
            stroke="#F7F5F2"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            label={PieLabel as any}
            labelLine={{ stroke: 'rgba(20,20,19,0.18)', strokeWidth: 1 }}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as PieEntry
              return (
                <div style={{
                  background: 'var(--card-glass)', borderRadius: 14, padding: '10px 14px',
                  boxShadow: '0 4px 20px rgba(20,20,19,0.12)',
                  border: '0.5px solid var(--separator)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.fill }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#141413' }}>{d.name}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#141413', marginTop: 4 }}>
                    {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(d.value)}
                  </div>
                </div>
              )
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
})

export default function Reportes() {
  const navigate = useNavigate()
  const { vehiculos, fetchVehiculos } = useVehiculosStore()
  const [gastos, setGastos] = useState<GastoGeneral[]>([])
  const [repTotals, setRepTotals] = useState<Record<string, number>>({})
  const [auxReady, setAuxReady] = useState(false)
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [metricaMarca, setMetricaMarca] = useState<MetricaMarca>('ganancia')
  const [mesIdx, setMesIdx] = useState(() => new Date().getMonth())
  const [anioNav, setAnioNav] = useState(() => new Date().getFullYear())
  const [selectedBar, setSelectedBar] = useState<number | null>(null)

  useEffect(() => {
    fetchVehiculos()
    setAuxReady(false)
    Promise.all([
      supabase.from('gastos_generales').select('*'),
      supabase.from('reparaciones').select('vehiculo_id, costo'),
    ]).then(([gts, reps]) => {
      setGastos(gts.data ?? [])
      const totals: Record<string, number> = {}
      reps.data?.forEach((r) => { totals[r.vehiculo_id] = (totals[r.vehiculo_id] ?? 0) + r.costo })
      setRepTotals(totals)
      setAuxReady(true)
    })
  }, [fetchVehiculos])

  const costoVehiculo = (v: typeof vehiculos[number]) =>
    v.precio_compra + (v.gastos_adicionales ?? 0) + (repTotals[v.id] ?? 0)

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()
  const atCurrentMonth = periodo === 'mes' && anioNav === currentYear && mesIdx === currentMonth
  const atCurrentYear  = periodo === 'anio' && anioNav === currentYear

  // Navigator handlers — mes wraps into adjacent years
  const prevNav = () => startTransition(() => {
    setSelectedBar(null)
    if (periodo === 'mes') {
      if (mesIdx === 0) { setMesIdx(11); setAnioNav(a => a - 1) }
      else setMesIdx(m => m - 1)
    } else {
      setAnioNav(a => a - 1)
    }
  })
  const nextNav = () => startTransition(() => {
    if (atCurrentMonth || atCurrentYear) return
    setSelectedBar(null)
    if (periodo === 'mes') {
      if (mesIdx === 11) { setMesIdx(0); setAnioNav(a => a + 1) }
      else setMesIdx(m => m + 1)
    } else {
      setAnioNav(a => Math.min(a + 1, currentYear))
    }
  })

  const navLabel = periodo === 'mes'
    ? `${MESES_LARGOS[mesIdx]} ${anioNav}`
    : String(anioNav)

  const year = anioNav

  const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`

  const mesesData = useMemo(() => {
    if (periodo === 'anio') {
      return Array.from({ length: 12 }).map((_, i) => {
        const key = `${anioNav}-${String(i + 1).padStart(2, '0')}`
        const isFuture = anioNav === currentYear && key > currentMonthKey
        const mes = new Date(anioNav, i, 1).toLocaleDateString('es-AR', { month: 'short' }).replace(/^\w/, (c) => c.toUpperCase()).slice(0, 3)
        const vendidos = isFuture ? [] : vehiculos.filter((v) => v.estado === 'vendido' && v.fecha_venta?.startsWith(key))
        const brutaMes = vendidos.reduce((s, v) => v.precio_venta ? s + v.precio_venta - costoVehiculo(v) : s, 0)
        const gastosMes = gastos.filter((g) => g.fecha.startsWith(key)).reduce((s, g) => s + g.monto, 0)
        const autos = vendidos.map((v) => ({ marca: v.marca, modelo: v.modelo, ganancia: v.precio_venta ? v.precio_venta - costoVehiculo(v) : 0 }))
        return { mes, ganancia: brutaMes - gastosMes, ventas: vendidos.length, key, isFuture, autos }
      })
    }
    return Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(anioNav, mesIdx - 5 + i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const mes = d.toLocaleDateString('es-AR', { month: 'short' }).replace(/^\w/, (c) => c.toUpperCase()).slice(0, 3)
      const vendidos = vehiculos.filter((v) => v.estado === 'vendido' && v.fecha_venta?.startsWith(key))
      const brutaMes = vendidos.reduce((s, v) => v.precio_venta ? s + v.precio_venta - costoVehiculo(v) : s, 0)
      const gastosMes = gastos.filter((g) => g.fecha.startsWith(key)).reduce((s, g) => s + g.monto, 0)
      const autos = vendidos.map((v) => ({ marca: v.marca, modelo: v.modelo, ganancia: v.precio_venta ? v.precio_venta - costoVehiculo(v) : 0 }))
      return { mes, ganancia: brutaMes - gastosMes, ventas: vendidos.length, key, isFuture: false, autos }
    })
  }, [vehiculos, gastos, anioNav, mesIdx, periodo, repTotals])

  // Datos Ingresos vs Inversión por mes
  const invVsIngData = useMemo(() => {
    const meses = periodo === 'anio'
      ? Array.from({ length: 12 }, (_, i) => {
          const key = `${anioNav}-${String(i + 1).padStart(2, '0')}`
          const isFuture = anioNav === currentYear && key > currentMonthKey
          return { key, isFuture }
        })
      : Array.from({ length: 6 }, (_, i) => {
          const d = new Date(anioNav, mesIdx - 5 + i, 1)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          return { key, isFuture: false }
        })

    return meses
      .map(({ key, isFuture }) => {
        const label = new Date(key + '-01').toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
          .replace(/^\w/, c => c.toUpperCase()).replace(' ', ' ')
        if (isFuture) return { mes: label, inversion: 0, ingresos: 0, key, isFuture: true }
        const comprados = vehiculos.filter(v => v.fecha_compra?.startsWith(key))
        const vendidos  = vehiculos.filter(v => v.estado === 'vendido' && v.fecha_venta?.startsWith(key))
        const inversion = comprados.reduce((s, v) => s + v.precio_compra + (v.gastos_adicionales ?? 0), 0)
        const ingresos  = vendidos.reduce((s, v) => s + (v.precio_venta ?? 0), 0)
        return { mes: label, inversion, ingresos, key, isFuture: false }
      })
      .filter(m => !m.isFuture && (m.inversion > 0 || m.ingresos > 0))
  }, [vehiculos, anioNav, mesIdx, periodo, currentYear, currentMonthKey])

  // Para el gráfico solo usamos valores positivos como referencia de altura
  const maxGanancia = Math.max(...mesesData.map((m) => m.ganancia), 1)

  // Ganancia del mes seleccionado (último elemento de mesesData en modo mes, o suma del año en modo año)
  const mesKey = `${anioNav}-${String(mesIdx + 1).padStart(2, '0')}`
  const gananciaMesSeleccionado = useMemo(() =>
    mesesData.find(m => m.key === mesKey)?.ganancia ?? 0,
    [mesesData, mesKey]
  )

  // Ganancia del año completo (anioNav) — suma neta de todos los meses
  const gananciaAnual = useMemo(() => {
    let total = 0
    for (let i = 0; i < 12; i++) {
      const key = `${anioNav}-${String(i + 1).padStart(2, '0')}`
      const vendidos = vehiculos.filter(v => v.estado === 'vendido' && v.fecha_venta?.startsWith(key) && v.precio_venta)
      const bruta = vendidos.reduce((s, v) => s + v.precio_venta! - costoVehiculo(v), 0)
      const gastosM = gastos.filter(g => g.fecha.startsWith(key)).reduce((s, g) => s + g.monto, 0)
      total += bruta - gastosM
    }
    return total
  }, [vehiculos, gastos, anioNav, repTotals])

  const topVehiculos = useMemo(() =>
    vehiculos
      .filter((v) => v.estado === 'vendido' && v.precio_venta)
      .map((v) => {
        const costo = costoVehiculo(v)
        const ganancia = v.precio_venta! - costo
        return {
          nombre: `${v.marca} ${v.modelo} ${v.anio}`,
          marca: v.marca,
          ganancia,
          roi: costo > 0 ? Math.round((ganancia / costo) * 100) : 0,
        }
      })
      .sort((a, b) => b.ganancia - a.ganancia)
      .slice(0, 3),
    [vehiculos, repTotals]
  )

  const proyeccionData = useMemo(() => {
    const conDatos = mesesData.filter((m) => m.ganancia > 0)
    const avg = conDatos.length ? conDatos.reduce((a, m) => a + m.ganancia, 0) / conDatos.length : 0
    const recientes = mesesData.slice(-3).filter((m) => m.ganancia > 0)
    const anteriores = mesesData.slice(0, 3).filter((m) => m.ganancia > 0)
    const avgRec = recientes.length ? recientes.reduce((a, m) => a + m.ganancia, 0) / recientes.length : avg
    const avgAnt = anteriores.length ? anteriores.reduce((a, m) => a + m.ganancia, 0) / anteriores.length : avg
    const crecimiento = avgAnt > 0 ? (avgRec - avgAnt) / avgAnt : 0
    const proyeccion = avg * (1 + crecimiento * 0.6)
    const min = proyeccion * 0.82
    const max = proyeccion * 1.18
    const tendencia: 'alza' | 'baja' | 'estable' = crecimiento > 0.05 ? 'alza' : crecimiento < -0.05 ? 'baja' : 'estable'
    return { proyeccion, min, max, tendencia, last3: mesesData.slice(-3) }
  }, [mesesData])

  // Clave del período seleccionado para filtrar vehículos
  const filterKey = periodo === 'mes'
    ? `${anioNav}-${String(mesIdx + 1).padStart(2, '0')}`
    : String(anioNav)

  const marcasData = useMemo(() => {
    const vendidos = vehiculos.filter((v) =>
      v.estado === 'vendido' && v.precio_venta && v.fecha_venta?.startsWith(filterKey)
    )
    const brands: Record<string, { ganancia: number; costo: number; unidades: number; diasSum: number; diasCount: number }> = {}
    vendidos.forEach((v) => {
      const costo = costoVehiculo(v)
      const gan = v.precio_venta! - costo
      const dias = v.fecha_venta
        ? Math.floor((new Date(v.fecha_venta + 'T00:00:00').getTime() - new Date(v.fecha_compra + 'T00:00:00').getTime()) / 86_400_000)
        : 0
      if (!brands[v.marca]) brands[v.marca] = { ganancia: 0, costo: 0, unidades: 0, diasSum: 0, diasCount: 0 }
      brands[v.marca].ganancia += gan
      brands[v.marca].costo += costo
      brands[v.marca].unidades++
      if (dias > 0) { brands[v.marca].diasSum += dias; brands[v.marca].diasCount++ }
    })
    // ROI ponderado: ganancia total / costo total. Evita explosiones de outliers
    // y maneja correctamente pérdidas (margen negativo legítimo).
    const sorted = Object.entries(brands)
      .map(([marca, d]) => ({
        marca,
        ganancia: d.ganancia,
        costo: d.costo,
        roi: d.costo > 0 ? (d.ganancia / d.costo) * 100 : 0,
        unidades: d.unidades,
        dias: d.diasCount > 0 ? d.diasSum / d.diasCount : 0,
        isLoss: d.ganancia < 0,
      }))
      .sort((a, b) => b.ganancia - a.ganancia)

    const total = sorted.length
    return sorted.map((item, i) => ({ ...item, ...indexColor(i, total) }))
  }, [vehiculos, repTotals, filterKey])

  const topListRef = useRef<HTMLDivElement>(null)
  useStaggerIn(topListRef, [topVehiculos.length, periodo])
  const gananciaMesDisplay = useCountUp(gananciaMesSeleccionado, auxReady)
  const gananciaAnualDisplay = useCountUp(gananciaAnual, auxReady)

  const handleExport = () => {
    const rows = [
      ['Marca', 'Modelo', 'Año', 'Estado', 'Compra', 'Venta', 'Ganancia'],
      ...vehiculos.map((v) => [
        v.marca, v.modelo, v.anio, v.estado,
        v.precio_compra, v.precio_venta ?? '', v.precio_venta ? v.precio_venta - v.precio_compra : '',
      ]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `motohub-reporte-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const marcaSegments = [...marcasData]
    .sort((a, b) => b.ganancia - a.ganancia)
    .map((m) => ({
      marca: m.marca,
      color: m.isLoss ? 'var(--red)' : m.color,
      bg: m.isLoss ? 'var(--red-bg)' : m.bg,
      roi: m.roi,
      ganancia: m.ganancia,
      unidades: m.unidades,
      isLoss: m.isLoss,
    }))

  return (
    <div style={{ height: '100svh', overflow: 'hidden' }}>
      <div className="scrollable" style={{
        height: '100%',
        background: 'var(--bg-gradient)',
        paddingBottom: 120,
      }}>
        {/* Header */}
        <div style={{ padding: 'calc(env(safe-area-inset-top) + 16px) 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.8px', fontFamily: 'var(--font)' }}>
            Ganancia por marca
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/reportes/historial')} style={{
              width: 38, height: 38, borderRadius: 12, background: 'var(--btn-ghost-bg)',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                <path d="M12 8v4l3 3" stroke="var(--ink2)" strokeWidth="1.8" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="9" stroke="var(--ink2)" strokeWidth="1.8"/>
              </svg>
            </button>
            <button onClick={handleExport} style={{
              width: 38, height: 38, borderRadius: 12, background: 'var(--ink)',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(20,20,19,0.18)',
            }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="#F3F0EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Pie chart — solo marcas con ganancia positiva.
            Las pérdidas se reportan en los cards de abajo, no en el chart. */}
        <div style={{ padding: '8px 8px 0' }}>
          {!auxReady ? (
            <div style={{ height: 300, borderRadius: 24, background: 'var(--btn-ghost-bg)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ) : marcaSegments.length === 0 ? (
            <div style={{
              height: 200, margin: '0 8px',
              background: 'rgba(255,255,255,0.7)', borderRadius: 24,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" style={{ opacity: 0.25 }}>
                <path d="M21.21 15.89A9 9 0 118 2.83M22 12A10 10 0 0012 2v10z" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>Sin ventas en {navLabel}</span>
            </div>
          ) : marcaSegments.every((m) => m.isLoss) ? (
            <div style={{
              height: 200, margin: '0 8px',
              background: 'var(--red-bg)', borderRadius: 24,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
                <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="var(--red)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--red)' }}>Sin ganancias en {navLabel}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Todas las marcas en pérdida</span>
            </div>
          ) : (
            <PieDistribution
              data={marcaSegments
                .filter((m) => !m.isLoss)
                .map((m) => ({ name: m.marca, value: m.ganancia, fill: m.color }))}
            />
          )}
        </div>

        {/* Navigator + period toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 20 }}>
          {/* Mes / Año pills */}
          <div style={{ display: 'flex', gap: 6 }}>
            {([{ id: 'mes', label: 'Mes' }, { id: 'anio', label: 'Año' }] as { id: Periodo; label: string }[]).map((p) => (
              <button key={p.id} onClick={() => startTransition(() => setPeriodo(p.id))} style={{
                padding: '8px 22px', borderRadius: 999, border: 'none', cursor: 'pointer',
                background: periodo === p.id ? 'var(--ink)' : 'var(--btn-ghost-bg)',
                color: periodo === p.id ? 'var(--bg)' : 'var(--ink2)',
                fontSize: 13, fontWeight: 700, fontFamily: 'var(--font)', transition: 'all .15s',
              }}>{p.label}</button>
            ))}
          </div>

          {/* Unified navigator — navigates month or year */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <button onClick={prevNav} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
              <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
                <path d="M7 1L1 6.5l6 5.5" stroke="rgba(20,20,19,0.35)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink2)', minWidth: 140, textAlign: 'center' }}>
              {navLabel}
            </span>
            <button onClick={nextNav} disabled={atCurrentMonth || atCurrentYear}
              style={{ background: 'none', border: 'none', padding: 8, cursor: atCurrentMonth || atCurrentYear ? 'default' : 'pointer', opacity: atCurrentMonth || atCurrentYear ? 0.25 : 1 }}>
              <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
                <path d="M1 1l6 5.5L1 12" stroke="rgba(20,20,19,0.35)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Brand distribution list */}
        {marcaSegments.length > 0 && (
          <div style={{ padding: '18px 16px 0', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {marcaSegments.map((m) => (
              <div key={m.marca} style={{
                background: 'var(--card-glass)', borderRadius: 18, padding: '13px 16px',
                display: 'flex', alignItems: 'center', gap: 14,
                boxShadow: '0 1px 8px var(--btn-ghost-bg)',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 15, flexShrink: 0,
                  background: BRAND_LOGOS[m.marca] ? 'var(--bg-card)' : m.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: BRAND_LOGOS[m.marca] ? 10 : 0,
                  border: BRAND_LOGOS[m.marca] ? `1.5px solid ${m.color}22` : 'none',
                }}>
                  {BRAND_LOGOS[m.marca] ? (
                    <img
                      src={BRAND_LOGOS[m.marca]}
                      alt={m.marca}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'var(--logo-filter)', opacity: 0.85 }}
                    />
                  ) : (
                    <span style={{ fontSize: 14, fontWeight: 900, color: m.color, letterSpacing: '-0.3px' }}>
                      {m.marca.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{m.marca}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{fmtN(m.ganancia)} · {m.unidades} unid</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <span style={{ fontSize: 17, fontWeight: 800, color: m.isLoss ? 'var(--red)' : 'var(--green)', letterSpacing: '-0.3px' }}>
                    {m.roi >= 0 ? '+' : ''}{m.roi.toFixed(1)}%
                  </span>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: m.color }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dos KPIs claros */}
        <div style={{ padding: '14px 16px 0', display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, background: 'var(--ink)', borderRadius: 18, padding: '14px 16px', boxShadow: '0 4px 14px rgba(20,20,19,0.15)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'rgba(243,240,238,0.45)', marginBottom: 4 }}>
              {MESES_LARGOS[mesIdx].slice(0, 3)} {anioNav}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#F3F0EE', letterSpacing: '-0.8px', lineHeight: 1 }}>
              {auxReady ? gananciaMesDisplay : '—'}
            </div>
          </div>
          <div style={{ flex: 1, background: 'var(--card-glass)', borderRadius: 18, padding: '14px 16px', boxShadow: '0 1px 8px var(--btn-ghost-bg)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--muted)', marginBottom: 4 }}>
              Ganancia {anioNav}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#141413', letterSpacing: '-0.8px', lineHeight: 1 }}>
              {auxReady ? gananciaAnualDisplay : '—'}
            </div>
          </div>
        </div>

        {/* Monthly bar chart */}
        <div style={{ padding: '12px 22px 0' }}>
          <div style={{ background: 'var(--card-glass)', borderRadius: 24, padding: '18px 16px', boxShadow: '0 1px 12px var(--btn-ghost-bg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>Ganancia mensual</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>{year}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
              {mesesData.map((m, i) => {
                const isNegative = m.ganancia < 0
                const isFuture = m.isFuture
                const barH = m.ganancia > 0 ? Math.max(10, Math.round((m.ganancia / maxGanancia) * 80)) : 4
                const isMax = m.ganancia === maxGanancia && m.ganancia > 0
                const isSel = selectedBar === i
                const showLabel = isSel || (isMax && !isSel && !isFuture)
                const barColor = isSel ? '#141413' : isNegative ? 'var(--red)' : isFuture ? 'var(--separator)' : isMax ? 'rgba(20,20,19,0.85)' : 'rgba(20,20,19,0.18)'
                return (
                  <div
                    key={i}
                    onClick={() => !isFuture && setSelectedBar(selectedBar === i ? null : i)}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: isFuture ? 'default' : 'pointer' }}
                  >
                    <div style={{ height: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                      {showLabel && (
                        <div style={{ background: isNegative ? 'var(--red)' : '#141413', color: '#F3F0EE', fontSize: 8, fontWeight: 700, padding: '2px 4px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                          {fmtN(m.ganancia)}
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                      <div style={{
                        width: '100%', height: barH, borderRadius: 6, background: barColor, transition: 'all .18s',
                        outline: isSel ? '2px solid rgba(20,20,19,0.35)' : 'none', outlineOffset: 2,
                      }} />
                    </div>
                    <span style={{ fontSize: 9, color: isSel ? 'rgba(20,20,19,0.8)' : isFuture ? 'rgba(20,20,19,0.2)' : 'var(--muted)', fontWeight: isSel ? 700 : 500 }}>{m.mes}</span>
                  </div>
                )
              })}
            </div>

            {/* Panel detalle del mes seleccionado */}
            {selectedBar !== null && mesesData[selectedBar] && (() => {
              const sel = mesesData[selectedBar]
              return (
                <div style={{
                  marginTop: 12, background: 'var(--separator)',
                  borderRadius: 14, padding: '10px 12px',
                  animation: 'fadeInUp .18s ease',
                }}>
                  <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:translateY(0) } }`}</style>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(20,20,19,0.5)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 7 }}>
                    {sel.mes} · {sel.autos.length} {sel.autos.length === 1 ? 'auto vendido' : 'autos vendidos'}
                  </div>
                  {sel.autos.length === 0 ? (
                    <div style={{ fontSize: 11, color: 'rgba(20,20,19,0.4)', fontStyle: 'italic' }}>Sin ventas este mes</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {sel.autos.map((a, j) => (
                        <div key={j} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          background: 'rgba(255,255,255,0.6)', borderRadius: 10, padding: '6px 10px',
                        }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{a.marca} {a.modelo}</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#4A7A5A' }}>+{fmtN(a.ganancia)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>

        {/* Ingresos vs Inversión */}
        {invVsIngData.length > 0 && (
          <div style={{ padding: '12px 22px 0' }}>
            <div style={{
              background: '#1E2B38', borderRadius: 24,
              padding: '20px 16px 16px',
              boxShadow: '0 4px 24px rgba(20,20,19,0.14)',
            }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#F3F0EE', marginBottom: 4 }}>
                Ingresos vs Inversión
              </div>
              <div style={{ fontSize: 11, color: 'rgba(243,240,238,0.4)', marginBottom: 16 }}>
                Por mes · {anioNav}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={invVsIngData} barCategoryGap="30%" barGap={3}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 10, fill: 'rgba(243,240,238,0.45)', fontFamily: 'var(--font)', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: number) => v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`}
                    tick={{ fontSize: 9, fill: 'rgba(243,240,238,0.35)', fontFamily: 'var(--font)' }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div style={{
                          background: '#29394A', borderRadius: 14, padding: '10px 14px',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                          border: '0.5px solid rgba(255,255,255,0.1)',
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(243,240,238,0.6)', marginBottom: 6 }}>{label}</div>
                          {payload.map((p, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                              <div style={{ width: 8, height: 8, borderRadius: 2, background: p.fill as string }} />
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#F3F0EE' }}>
                                {p.dataKey === 'inversion' ? 'Inversión' : 'Ingresos'}: {fmtN(p.value as number)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: 12, fontSize: 11, color: 'rgba(243,240,238,0.55)' }}
                    formatter={(value) => value === 'inversion' ? 'Inversión' : 'Ingresos'}
                    iconType="circle"
                    iconSize={7}
                  />
                  <Bar dataKey="inversion" fill="#7A96B8" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="ingresos"  fill="#7AAB8E" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Top vehículos */}
        {topVehiculos.length > 0 && (
          <div style={{ padding: '12px 22px 0' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', marginBottom: 10 }}>
              Top vehículos · Rentabilidad
            </div>
            <div ref={topListRef} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {topVehiculos.map((v, i) => (
                <div key={i} style={{
                  background: 'var(--card-glass)', borderRadius: 18, padding: '13px 16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  boxShadow: '0 1px 8px rgba(20,20,19,0.04)',
                  border: '0.5px solid var(--separator)',
                }}>
                  {/* Logo con badge de ranking */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 14,
                      background: BRAND_LOGOS[v.marca] ? 'var(--bg-card)' : 'var(--btn-ghost-bg)',
                      border: '1.5px solid rgba(20,20,19,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: BRAND_LOGOS[v.marca] ? 9 : 0,
                    }}>
                      {BRAND_LOGOS[v.marca] ? (
                        <img
                          src={BRAND_LOGOS[v.marca]}
                          alt={v.marca}
                          style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'var(--logo-filter)', opacity: 0.85 }}
                        />
                      ) : (
                        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>
                          {v.marca.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div style={{
                      position: 'absolute', bottom: -4, right: -4,
                      width: 18, height: 18, borderRadius: 6,
                      background: i === 0 ? '#141413' : 'rgba(20,20,19,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 800,
                      color: i === 0 ? 'var(--bg)' : 'var(--ink)',
                      border: '1.5px solid #fff',
                    }}>#{i + 1}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.nombre}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--green)' }}>+{fmtN(v.ganancia)}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>ROI {v.roi}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Proyección del próximo mes */}
        {proyeccionData.proyeccion > 0 && (
          <div style={{ padding: '12px 22px 0' }}>
            <div style={{ background: 'var(--card-glass)', borderRadius: 24, padding: '18px 16px', boxShadow: '0 1px 12px var(--btn-ghost-bg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>Próximo mes (est.)</div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: proyeccionData.tendencia === 'alza' ? 'rgba(122,171,142,0.14)' : proyeccionData.tendencia === 'baja' ? 'rgba(192,112,112,0.14)' : 'var(--btn-ghost-bg)',
                  padding: '4px 10px', borderRadius: 999,
                }}>
                  <span style={{ fontSize: 14 }}>
                    {proyeccionData.tendencia === 'alza' ? '↑' : proyeccionData.tendencia === 'baja' ? '↓' : '→'}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: proyeccionData.tendencia === 'alza' ? 'var(--green)' : proyeccionData.tendencia === 'baja' ? 'var(--red)' : 'var(--ink2)',
                  }}>
                    {proyeccionData.tendencia === 'alza' ? 'En alza' : proyeccionData.tendencia === 'baja' ? 'En baja' : 'Estable'}
                  </span>
                </div>
              </div>

              {/* Min / Proyectado / Max */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'Mínimo', value: proyeccionData.min, dim: true },
                  { label: 'Proyectado', value: proyeccionData.proyeccion, dim: false },
                  { label: 'Máximo', value: proyeccionData.max, dim: true },
                ].map((col) => (
                  <div key={col.label} style={{
                    flex: 1, textAlign: 'center',
                    background: col.dim ? 'transparent' : 'var(--btn-ghost-bg)',
                    borderRadius: 14, padding: '10px 6px',
                  }}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--muted)', marginBottom: 4 }}>{col.label}</div>
                    <div style={{ fontSize: col.dim ? 14 : 18, fontWeight: 800, color: col.dim ? 'var(--ink2)' : 'var(--ink)', letterSpacing: '-0.5px' }}>{fmtN(col.value)}</div>
                  </div>
                ))}
              </div>

              {/* Mini bar chart: last 3 months + projection */}
              {(() => {
                const allVals = [...proyeccionData.last3.map((m) => m.ganancia), proyeccionData.proyeccion]
                const maxVal = Math.max(...allVals, 1)
                const barH = 52
                return (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                    {proyeccionData.last3.map((m) => {
                      const h = m.ganancia > 0 ? Math.max(6, Math.round((m.ganancia / maxVal) * barH)) : 4
                      return (
                        <div key={m.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                          <div style={{ width: '100%', height: h, borderRadius: 6, background: 'rgba(20,20,19,0.22)' }} />
                          <span style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 500 }}>{m.mes}</span>
                        </div>
                      )
                    })}
                    {/* Projection bar (dashed) */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                      <div style={{
                        width: '100%',
                        height: Math.max(6, Math.round((proyeccionData.proyeccion / maxVal) * barH)),
                        borderRadius: 6,
                        background: 'transparent',
                        border: '2px dashed rgba(20,20,19,0.35)',
                      }} />
                      <span style={{ fontSize: 9, color: 'var(--ink)', fontWeight: 700 }}>Est.</span>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Análisis por marca */}
        {marcasData.length > 0 && (
          <div style={{ padding: '12px 22px 0' }}>
            <div style={{ background: 'var(--card-glass)', borderRadius: 24, padding: '18px 16px', boxShadow: '0 1px 12px var(--btn-ghost-bg)' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', marginBottom: 12 }}>Análisis por marca</div>

              {/* Metric pills */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                {([
                  { id: 'ganancia', label: 'Ganancia' },
                  { id: 'roi', label: 'ROI %' },
                  { id: 'unidades', label: 'Unidades' },
                  { id: 'dias', label: 'Días' },
                ] as { id: MetricaMarca; label: string }[]).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => startTransition(() => setMetricaMarca(m.id))}
                    style={{
                      padding: '5px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                      background: metricaMarca === m.id ? 'var(--ink)' : 'var(--btn-ghost-bg)',
                      color: metricaMarca === m.id ? 'var(--bg)' : 'var(--ink2)',
                      fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)', transition: 'all .15s',
                    }}
                  >{m.label}</button>
                ))}
              </div>

              {/* Ranked brand list */}
              {(() => {
                const sorted = [...marcasData].sort((a, b) => {
                  if (metricaMarca === 'dias') return a[metricaMarca] - b[metricaMarca]
                  return b[metricaMarca] - a[metricaMarca]
                })
                const maxVal = Math.max(...sorted.map((d) => d[metricaMarca]), 1)
                const fmtMetric = (d: typeof sorted[number]) => {
                  if (metricaMarca === 'ganancia') return fmtN(d.ganancia)
                  if (metricaMarca === 'roi') return `${Math.round(d.roi)}%`
                  if (metricaMarca === 'unidades') return `${d.unidades}`
                  return `${Math.round(d.dias)}d`
                }
                const bestRoi = [...marcasData].sort((a, b) => b.roi - a.roi)[0]
                const masRapida = [...marcasData].filter((d) => d.dias > 0).sort((a, b) => a.dias - b.dias)[0]
                return (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                      {sorted.map((d) => {
                        const pct = (d[metricaMarca] / maxVal) * 100
                        const color = d.color
                        return (
                          <div key={d.marca}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{d.marca}</span>
                              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink)' }}>{fmtMetric(d)}</span>
                            </div>
                            <div style={{ height: 6, background: 'var(--btn-ghost-bg)', borderRadius: 999 }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width .3s ease' }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {/* Summary chips */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {bestRoi && (
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)', background: 'var(--separator)', padding: '4px 12px', borderRadius: 999 }}>
                          Mejor ROI: <strong style={{ color: 'var(--ink)' }}>{bestRoi.marca}</strong> {Math.round(bestRoi.roi)}%
                        </div>
                      )}
                      {masRapida && (
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)', background: 'var(--separator)', padding: '4px 12px', borderRadius: 999 }}>
                          Más rápida: <strong style={{ color: 'var(--ink)' }}>{masRapida.marca}</strong> {Math.round(masRapida.dias)}d
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        )}

        {/* Empty state */}
        {vehiculos.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
            Sin datos para mostrar aún
          </div>
        )}
      </div>
    </div>
  )
}
