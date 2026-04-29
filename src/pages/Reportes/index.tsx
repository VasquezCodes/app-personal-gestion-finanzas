import { memo, startTransition, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
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
                  background: '#fff', borderRadius: 14, padding: '10px 14px',
                  boxShadow: '0 4px 20px rgba(20,20,19,0.12)',
                  border: '0.5px solid rgba(20,20,19,0.06)',
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
    if (periodo === 'mes') {
      if (mesIdx === 0) { setMesIdx(11); setAnioNav(a => a - 1) }
      else setMesIdx(m => m - 1)
    } else {
      setAnioNav(a => a - 1)
    }
  })
  const nextNav = () => startTransition(() => {
    if (atCurrentMonth || atCurrentYear) return
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

  const mesesData = useMemo(() => {
    if (periodo === 'anio') {
      // 12 meses del año seleccionado
      return Array.from({ length: 12 }).map((_, i) => {
        const key = `${anioNav}-${String(i + 1).padStart(2, '0')}`
        const mes = new Date(anioNav, i, 1).toLocaleDateString('es-AR', { month: 'short' }).replace(/^\w/, (c) => c.toUpperCase()).slice(0, 3)
        const vendidos = vehiculos.filter((v) => v.estado === 'vendido' && v.fecha_venta?.startsWith(key))
        const brutaMes = vendidos.reduce((s, v) => v.precio_venta ? s + v.precio_venta - costoVehiculo(v) : s, 0)
        const gastosMes = gastos.filter((g) => g.fecha.startsWith(key)).reduce((s, g) => s + g.monto, 0)
        return { mes, ganancia: brutaMes - gastosMes, ventas: vendidos.length, key }
      })
    }
    // 6 meses terminando en el mes seleccionado
    return Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(anioNav, mesIdx - 5 + i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const mes = d.toLocaleDateString('es-AR', { month: 'short' }).replace(/^\w/, (c) => c.toUpperCase()).slice(0, 3)
      const vendidos = vehiculos.filter((v) => v.estado === 'vendido' && v.fecha_venta?.startsWith(key))
      const brutaMes = vendidos.reduce((s, v) => v.precio_venta ? s + v.precio_venta - costoVehiculo(v) : s, 0)
      const gastosMes = gastos.filter((g) => g.fecha.startsWith(key)).reduce((s, g) => s + g.monto, 0)
      return { mes, ganancia: brutaMes - gastosMes, ventas: vendidos.length, key }
    })
  }, [vehiculos, gastos, anioNav, mesIdx, periodo, repTotals])

  const totalGanancia = mesesData.reduce((a, m) => a + m.ganancia, 0)
  // Para el gráfico solo usamos valores positivos como referencia de altura
  const maxGanancia = Math.max(...mesesData.map((m) => m.ganancia), 1)

  const gastosAnuales = gastos.filter((g) => g.fecha.startsWith(String(year))).reduce((a, g) => a + g.monto, 0)

  // Ganancia bruta = lo que generaron los autos vendidos este año (sin descontar gastos generales)
  const gananciaBrutaAnual = vehiculos
    .filter((v) => v.estado === 'vendido' && v.fecha_venta?.startsWith(String(year)) && v.precio_venta)
    .reduce((s, v) => s + v.precio_venta! - costoVehiculo(v), 0)

  // Margen neto = ganancia neta (ya con gastos descontados) / ingresos por ventas del período
  const ingresos6meses = useMemo(() =>
    mesesData.reduce((a, m) =>
      a + vehiculos
        .filter((v) => v.estado === 'vendido' && v.fecha_venta?.startsWith(m.key))
        .reduce((s, v) => s + (v.precio_venta ?? 0), 0),
      0),
    [mesesData, vehiculos]
  )
  const margen = ingresos6meses > 0 ? Math.round((totalGanancia / ingresos6meses) * 100) : 0

  const topVehiculos = useMemo(() =>
    vehiculos
      .filter((v) => v.estado === 'vendido' && v.precio_venta)
      .map((v) => {
        const costo = costoVehiculo(v)
        const ganancia = v.precio_venta! - costo
        return {
          nombre: `${v.marca} ${v.modelo} ${v.anio}`,
          ganancia,
          roi: Math.round((ganancia / costo) * 100),
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

  const marcasData = useMemo(() => {
    const vendidos = vehiculos.filter((v) => v.estado === 'vendido' && v.precio_venta)
    const brands: Record<string, { ganancia: number; roiSum: number; roiCount: number; unidades: number; diasSum: number; diasCount: number }> = {}
    vendidos.forEach((v) => {
      const costo = costoVehiculo(v)
      const gan = v.precio_venta! - costo
      const roi = costo > 0 ? (gan / costo) * 100 : 0
      const dias = v.fecha_venta
        ? Math.floor((new Date(v.fecha_venta + 'T00:00:00').getTime() - new Date(v.fecha_compra + 'T00:00:00').getTime()) / 86_400_000)
        : 0
      if (!brands[v.marca]) brands[v.marca] = { ganancia: 0, roiSum: 0, roiCount: 0, unidades: 0, diasSum: 0, diasCount: 0 }
      brands[v.marca].ganancia += gan
      brands[v.marca].roiSum += roi
      brands[v.marca].roiCount++
      brands[v.marca].unidades++
      if (dias > 0) { brands[v.marca].diasSum += dias; brands[v.marca].diasCount++ }
    })
    // Sort by ganancia descending first, then assign colors by stable position
    const sorted = Object.entries(brands)
      .map(([marca, d]) => ({
        marca,
        ganancia: d.ganancia,
        roi: d.roiCount > 0 ? d.roiSum / d.roiCount : 0,
        unidades: d.unidades,
        dias: d.diasCount > 0 ? d.diasSum / d.diasCount : 0,
      }))
      .sort((a, b) => b.ganancia - a.ganancia)

    const total = sorted.length
    return sorted.map((item, i) => ({ ...item, ...indexColor(i, total) }))
  }, [vehiculos, repTotals])

  const topListRef = useRef<HTMLDivElement>(null)
  useStaggerIn(topListRef, [topVehiculos.length, periodo])
  const totalGananciaDisplay = useCountUp(totalGanancia, auxReady)
  const margenDisplay = auxReady ? `${margen}%` : '—'

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

  const totalMarcaGanancia = marcasData.reduce((a, m) => a + m.ganancia, 0)
  const marcaSegments = [...marcasData]
    .sort((a, b) => b.ganancia - a.ganancia)
    .map((m) => ({
      marca: m.marca,
      color: m.color,
      bg: m.bg,
      pct: totalMarcaGanancia > 0 ? Math.round((m.ganancia / totalMarcaGanancia) * 100) : 0,
      ganancia: m.ganancia,
      unidades: m.unidades,
    }))

  return (
    <div style={{ height: '100svh', overflow: 'hidden' }}>
      <div className="scrollable" style={{
        height: '100%',
        background: '#F7F5F2',
        paddingBottom: 120,
      }}>
        {/* Header */}
        <div style={{ padding: 'calc(env(safe-area-inset-top) + 16px) 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.8px', fontFamily: 'var(--font)' }}>
            Distribución
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/reportes/historial')} style={{
              width: 38, height: 38, borderRadius: 12, background: 'rgba(20,20,19,0.07)',
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

        {/* Pie chart — brand ganancia distribution */}
        <div style={{ padding: '8px 8px 0' }}>
          {!auxReady ? (
            <div style={{ height: 300, borderRadius: 24, background: 'rgba(20,20,19,0.05)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ) : marcaSegments.length === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Sin ventas registradas</span>
            </div>
          ) : (
            <PieDistribution
              data={marcaSegments.map((m) => ({ name: m.marca, value: m.ganancia, fill: m.color }))}
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
                background: periodo === p.id ? 'var(--ink)' : 'rgba(20,20,19,0.07)',
                color: periodo === p.id ? '#F3F0EE' : 'var(--ink2)',
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
                background: '#fff', borderRadius: 18, padding: '13px 16px',
                display: 'flex', alignItems: 'center', gap: 14,
                boxShadow: '0 1px 8px rgba(20,20,19,0.05)',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 15, flexShrink: 0,
                  background: BRAND_LOGOS[m.marca] ? '#fff' : m.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: BRAND_LOGOS[m.marca] ? 10 : 0,
                  border: BRAND_LOGOS[m.marca] ? `1.5px solid ${m.color}22` : 'none',
                }}>
                  {BRAND_LOGOS[m.marca] ? (
                    <img
                      src={BRAND_LOGOS[m.marca]}
                      alt={m.marca}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'brightness(0)', opacity: 0.85 }}
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
                  <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.3px' }}>{m.pct}%</span>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: m.color }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* KPI strip */}
        <div style={{ padding: '14px 16px 0', display: 'flex', gap: 8 }}>
          {[
            { label: 'Ganancia total', value: auxReady ? totalGananciaDisplay : '—', color: '#F3F0EE', bg: 'var(--ink)', dark: true },
            { label: 'Margen neto', value: margenDisplay, color: '#7AAB8E', bg: '#fff', dark: false },
            { label: 'Mejor ROI', value: marcasData.length ? `${Math.round(Math.max(...marcasData.map((m) => m.roi)))}%` : '—', color: 'var(--ink)', bg: '#fff', dark: false },
          ].map((k) => (
            <div key={k.label} style={{
              flex: 1, background: k.bg, borderRadius: 16, padding: '12px 12px',
              boxShadow: k.dark ? '0 4px 14px rgba(20,20,19,0.15)' : '0 1px 8px rgba(20,20,19,0.05)',
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.7,
                color: k.dark ? 'rgba(243,240,238,0.45)' : 'var(--muted)', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: k.color, letterSpacing: '-0.5px', lineHeight: 1 }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Monthly bar chart */}
        <div style={{ padding: '12px 22px 0' }}>
          <div style={{ background: 'rgba(255,255,255,0.8)', borderRadius: 24, padding: '18px 16px', boxShadow: '0 1px 12px rgba(20,20,19,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>Ganancia mensual</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>{year}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
              {mesesData.map((m, i) => {
                const isNegative = m.ganancia < 0
                const isEmpty = m.ganancia === 0
                const barH = m.ganancia > 0 ? Math.max(10, Math.round((m.ganancia / maxGanancia) * 80)) : 4
                const isActive = m.ganancia === maxGanancia && m.ganancia > 0
                const barColor = isNegative ? '#C07070' : isEmpty ? 'rgba(20,20,19,0.06)' : isActive ? 'var(--ink)' : 'rgba(20,20,19,0.18)'
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    {(isActive || isNegative) && (
                      <div style={{ background: isNegative ? '#C07070' : 'var(--ink)', color: '#F3F0EE', fontSize: 8, fontWeight: 700, padding: '2px 4px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                        {fmtN(m.ganancia)}
                      </div>
                    )}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                      <div style={{ width: '100%', height: barH, borderRadius: 6, background: barColor }} />
                    </div>
                    <span style={{ fontSize: 9, color: isEmpty ? 'rgba(20,20,19,0.25)' : 'var(--muted)', fontWeight: 500 }}>{m.mes}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Top vehículos */}
        {topVehiculos.length > 0 && (
          <div style={{ padding: '12px 22px 0' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', marginBottom: 10 }}>
              Top vehículos · Rentabilidad
            </div>
            <div ref={topListRef} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {topVehiculos.map((v, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.82)', borderRadius: 18, padding: '13px 16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  boxShadow: '0 1px 8px rgba(20,20,19,0.04)',
                  border: '0.5px solid rgba(20,20,19,0.06)',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, background: 'rgba(20,20,19,0.07)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, color: 'var(--ink)',
                  }}>#{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.nombre}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#7AAB8E' }}>+{fmtN(v.ganancia)}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>ROI {v.roi}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bruto vs Gastos */}
        {(gananciaBrutaAnual > 0 || gastosAnuales > 0) && (
          <div style={{ padding: '12px 22px 0' }}>
            <div style={{ background: 'rgba(255,255,255,0.8)', borderRadius: 24, padding: '16px 16px', boxShadow: '0 1px 12px rgba(20,20,19,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>Bruto vs Gastos</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  Neto: <span style={{ fontWeight: 800, color: gananciaBrutaAnual - gastosAnuales >= 0 ? '#7AAB8E' : '#C07070' }}>
                    {fmtN(gananciaBrutaAnual - gastosAnuales)}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14 }}>Ganancia de autos vendidos vs gastos operativos</div>
              {[
                { label: 'Ganancia bruta', value: gananciaBrutaAnual, color: '#7AAB8E' },
                { label: 'Gastos operativos', value: gastosAnuales, color: '#C07070' },
              ].map((item) => {
                const total = gananciaBrutaAnual + gastosAnuales
                const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
                return (
                  <div key={item.label} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink2)' }}>{item.label}</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{pct}%</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink)' }}>{fmtN(item.value)}</span>
                      </div>
                    </div>
                    <div style={{ height: 6, background: 'rgba(20,20,19,0.06)', borderRadius: 999 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: item.color, borderRadius: 999 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Proyección del próximo mes */}
        {proyeccionData.proyeccion > 0 && (
          <div style={{ padding: '12px 22px 0' }}>
            <div style={{ background: 'rgba(255,255,255,0.8)', borderRadius: 24, padding: '18px 16px', boxShadow: '0 1px 12px rgba(20,20,19,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>Próximo mes (est.)</div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: proyeccionData.tendencia === 'alza' ? 'rgba(122,171,142,0.14)' : proyeccionData.tendencia === 'baja' ? 'rgba(192,112,112,0.14)' : 'rgba(20,20,19,0.07)',
                  padding: '4px 10px', borderRadius: 999,
                }}>
                  <span style={{ fontSize: 14 }}>
                    {proyeccionData.tendencia === 'alza' ? '↑' : proyeccionData.tendencia === 'baja' ? '↓' : '→'}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: proyeccionData.tendencia === 'alza' ? '#7AAB8E' : proyeccionData.tendencia === 'baja' ? '#C07070' : 'var(--ink2)',
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
                    background: col.dim ? 'transparent' : 'rgba(20,20,19,0.05)',
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
            <div style={{ background: 'rgba(255,255,255,0.8)', borderRadius: 24, padding: '18px 16px', boxShadow: '0 1px 12px rgba(20,20,19,0.05)' }}>
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
                      background: metricaMarca === m.id ? 'var(--ink)' : 'rgba(20,20,19,0.07)',
                      color: metricaMarca === m.id ? '#F3F0EE' : 'var(--ink2)',
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
                            <div style={{ height: 6, background: 'rgba(20,20,19,0.07)', borderRadius: 999 }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width .3s ease' }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {/* Summary chips */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {bestRoi && (
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)', background: 'rgba(20,20,19,0.06)', padding: '4px 12px', borderRadius: 999 }}>
                          Mejor ROI: <strong style={{ color: 'var(--ink)' }}>{bestRoi.marca}</strong> {Math.round(bestRoi.roi)}%
                        </div>
                      )}
                      {masRapida && (
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)', background: 'rgba(20,20,19,0.06)', padding: '4px 12px', borderRadius: 999 }}>
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
