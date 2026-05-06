import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVehiculosStore } from '../../store/vehiculosStore'
import { supabase } from '../../lib/supabase'
import { BRAND_LOGOS } from '../Inventario/CargarVehiculoSheet'
import type { GastoGeneral } from '../../types'
import { useCountUp } from '../../hooks/animations/useCountUp'
import { diasEnLote, alertaLote } from '../../lib/utils'
import { useHeroEntrance } from '../../hooks/animations/useHeroEntrance'
import { useBarGrow } from '../../hooks/animations/useBarGrow'

const fmtShort = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

type BarItem = { dia: string; ganancia: number; isFuture?: boolean; autos: { marca: string; modelo: string; ganancia: number }[] }

const LABEL_H = 22

function BarChart({ data, color = '#141413', height = 96, onSelect, selected }: {
  data: BarItem[]; color?: string; height?: number
  onSelect: (i: number) => void; selected: number | null
}) {
  const max = Math.max(...data.map((d) => d.ganancia), 1)
  const barZoneH = height - LABEL_H - 20
  return (
    <div style={{ display: 'flex', gap: 4, height: height + LABEL_H, alignItems: 'stretch' }}>
      {data.map((item, i) => {
        const h = item.ganancia > 0 ? Math.max(8, Math.round((item.ganancia / max) * barZoneH)) : 4
        const isMax = item.ganancia === Math.max(...data.map((d) => d.ganancia)) && item.ganancia > 0
        const isSel = selected === i
        const isFuture = item.isFuture ?? false
        const showLabel = isSel || (isMax && !isSel)
        return (
          <div
            key={i}
            onClick={() => !isFuture && onSelect(i)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: isFuture ? 'default' : 'pointer' }}
          >
            <div style={{ height: LABEL_H, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4 }}>
              {showLabel && (
                <div style={{
                  background: isSel ? '#141413' : 'rgba(20,20,19,0.72)',
                  color: '#F3F0EE', fontSize: 9, fontWeight: 700,
                  padding: '3px 6px', borderRadius: 6, whiteSpace: 'nowrap',
                }}>{fmtShort(item.ganancia)}</div>
              )}
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
              <div
                data-bar=""
                style={{
                  width: '100%', height: h, borderRadius: 7, transition: 'all .18s',
                  background: isSel ? '#141413' : isFuture ? 'rgba(20,20,19,0.10)' : isMax ? color : 'rgba(20,20,19,0.26)',
                  outline: isSel ? '2px solid rgba(20,20,19,0.45)' : 'none',
                  outlineOffset: 2,
                }}
              />
            </div>
            <span style={{ fontSize: 10, color: isSel ? 'rgba(20,20,19,0.8)' : 'rgba(20,20,19,0.45)', fontWeight: isSel ? 700 : 500, marginTop: 5 }}>
              {item.dia}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function DonutChart({ pct, size = 90, stroke = 11, colors }: {
  pct: { stock: number; vendido: number; reparacion: number }
  size?: number; stroke?: number; colors: string[]
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const cx = size / 2, cy = size / 2
  const entries = [
    { key: 'stock', v: pct.stock },
    { key: 'vendido', v: pct.vendido },
    { key: 'reparacion', v: pct.reparacion },
  ]
  let offset = 0
  const segments = entries.map(({ key, v }, i) => {
    const dash = (v / 100) * circ
    const gap = circ - dash
    const seg = { key, dash, gap, offset, color: colors[i] }
    offset += dash
    return seg
  })
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(20,20,19,0.06)" strokeWidth={stroke} />
      {segments.map((s) => (
        <circle key={s.key} cx={cx} cy={cy} r={r} fill="none"
          stroke={s.color} strokeWidth={stroke}
          strokeDasharray={`${s.dash} ${s.gap}`}
          strokeDashoffset={-s.offset}
          strokeLinecap="round"
        />
      ))}
    </svg>
  )
}

function SunDecoration({ isDia }: { isDia: boolean }) {
  const rayColor = isDia ? 'rgba(180,140,0,0.35)' : 'rgba(180,80,0,0.35)'
  return (
    <svg width="140" height="140" viewBox="0 0 140 140"
      style={{ position: 'absolute', right: -22, top: -22, pointerEvents: 'none', opacity: 0.6 }}>
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30) * Math.PI / 180
        const len = i % 2 === 0 ? 14 : 9
        const x1 = 70 + Math.cos(angle) * 52, y1 = 70 + Math.sin(angle) * 52
        const x2 = 70 + Math.cos(angle) * (52 + len), y2 = 70 + Math.sin(angle) * (52 + len)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={rayColor} strokeWidth={i % 2 === 0 ? 2 : 1.2} strokeLinecap="round" />
      })}
      <circle cx="70" cy="70" r="48" fill={isDia ? 'rgba(220,180,0,0.22)' : 'rgba(200,100,0,0.22)'} />
      <circle cx="70" cy="70" r="48" fill="none" stroke={rayColor} strokeWidth="1.5" />
    </svg>
  )
}

function MoonDecoration() {
  return (
    <svg width="130" height="130" viewBox="0 0 130 130"
      style={{ position: 'absolute', right: -18, top: -18, pointerEvents: 'none', opacity: 0.55 }}>
      <circle cx="65" cy="65" r="58" fill="rgba(120,100,180,0.28)" />
      <circle cx="65" cy="65" r="58" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
      <circle cx="48" cy="44" r="10" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      <circle cx="48" cy="44" r="4" fill="rgba(255,255,255,0.10)" />
      <circle cx="78" cy="72" r="7" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" />
      <circle cx="78" cy="72" r="2.5" fill="rgba(255,255,255,0.08)" />
      <circle cx="55" cy="82" r="5" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <circle cx="88" cy="42" r="4" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
    </svg>
  )
}

export default function Dashboard() {
  const { vehiculos, loading, fetchVehiculos } = useVehiculosStore()
  const navigate = useNavigate()
  const [repTotals, setRepTotals] = useState<Record<string, number>>({})
  const [gastos, setGastos] = useState<GastoGeneral[]>([])
  const [auxReady, setAuxReady] = useState(false)
  const [chartMode, setChartMode] = useState<'semana' | 'anio'>('semana')
  const [selectedBar, setSelectedBar] = useState<number | null>(null)

  const heroRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchVehiculos() }, [fetchVehiculos])

  useEffect(() => {
    setAuxReady(false)
    Promise.all([
      supabase.from('reparaciones').select('vehiculo_id, costo'),
      supabase.from('gastos_generales').select('*'),
    ]).then(([reps, gts]) => {
      const totals: Record<string, number> = {}
      reps.data?.forEach((r) => { totals[r.vehiculo_id] = (totals[r.vehiculo_id] ?? 0) + r.costo })
      setRepTotals(totals)
      setGastos(gts.data ?? [])
      setAuxReady(true)
    })
  }, [])

  const h = new Date().getHours()
  const isDia = h >= 6 && h < 12
  const isTarde = h >= 12 && h < 20
  const accentBg = isDia ? '#E8D97A' : isTarde ? '#F0B57A' : '#7B6FAD'

  const greeting = isDia ? 'Buenos días' : isTarde ? 'Buenas tardes' : 'Buenas noches'

  const mes = new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    .replace(/^\w/, (c) => c.toUpperCase())
  const fechaCorta = new Date().toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(/^\w/, (c) => c.toUpperCase())

  const mesActual = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

  const enStock = useMemo(() => vehiculos.filter((v) => v.estado === 'en_stock'), [vehiculos])
  const enReparacion = useMemo(() => vehiculos.filter((v) => v.estado === 'en_reparacion'), [vehiculos])
  const vendidosMes = useMemo(() => vehiculos.filter((v) => v.estado === 'vendido' && v.fecha_venta?.startsWith(mesActual)), [vehiculos, mesActual])
  const todosVendidos = useMemo(() => vehiculos.filter((v) => v.estado === 'vendido'), [vehiculos])

  const costoVehiculo = (v: typeof vehiculos[number]) =>
    v.precio_compra + (v.gastos_adicionales ?? 0) + (repTotals[v.id] ?? 0)

  const inversionTotal = useMemo(() => vehiculos.reduce((s, v) => s + costoVehiculo(v), 0), [vehiculos, repTotals])

  // Gastos generales del mes actual
  const gastosMes = useMemo(() =>
    gastos.filter((g) => g.fecha.startsWith(mesActual)).reduce((s, g) => s + g.monto, 0),
    [gastos, mesActual]
  )

  // Ganancia neta = ingresos ventas del mes − costos vehículos − gastos generales del mes
  const gananciaBrutaMes = useMemo(() =>
    vendidosMes.reduce((s, v) => v.precio_venta ? s + v.precio_venta - costoVehiculo(v) : s, 0),
    [vendidosMes, repTotals]
  )
  const gananciaMes = gananciaBrutaMes - gastosMes

  const gananciaTotal = useMemo(() =>
    todosVendidos.reduce((s, v) => v.precio_venta ? s + v.precio_venta - costoVehiculo(v) : s, 0),
    [todosVendidos, repTotals]
  )
  const roi = inversionTotal > 0 ? Math.round((gananciaTotal / inversionTotal) * 100) : 0

  const total = vehiculos.length
  const inventarioPct = {
    stock: total > 0 ? Math.round((enStock.length / total) * 100) : 0,
    vendido: total > 0 ? Math.round((todosVendidos.length / total) * 100) : 0,
    reparacion: total > 0 ? Math.round((enReparacion.length / total) * 100) : 0,
  }

  const weeklyDataFull = useMemo((): BarItem[] => {
    const today = new Date()
    const diasCortos = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    // Lunes de la semana actual
    const dow = today.getDay() // 0=Dom … 6=Sáb
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
    const isoToday = today.toISOString().slice(0, 10)
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const iso = d.toISOString().slice(0, 10)
      const isFuture = iso > isoToday
      const vs = isFuture ? [] : vehiculos.filter((v) => v.estado === 'vendido' && v.fecha_venta === iso)
      const ganancia = vs.reduce((s, v) => v.precio_venta ? s + v.precio_venta - costoVehiculo(v) : s, 0)
      return {
        dia: diasCortos[d.getDay()],
        ganancia,
        isFuture,
        autos: vs.map((v) => ({ marca: v.marca, modelo: v.modelo, ganancia: v.precio_venta ? v.precio_venta - costoVehiculo(v) : 0 })),
      }
    })
  }, [vehiculos, repTotals])

  const anualDataFull = useMemo((): BarItem[] => {
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    const y = new Date().getFullYear()
    const isoToday = new Date().toISOString().slice(0, 7)
    return Array.from({ length: 12 }).map((_, i) => {
      const key = `${y}-${String(i + 1).padStart(2, '0')}`
      const isFuture = key > isoToday
      const vs = isFuture ? [] : vehiculos.filter((v) => v.estado === 'vendido' && v.fecha_venta?.startsWith(key))
      const ganancia = vs.reduce((s, v) => v.precio_venta ? s + v.precio_venta - costoVehiculo(v) : s, 0)
      return {
        dia: meses[i],
        ganancia,
        isFuture,
        autos: vs.map((v) => ({ marca: v.marca, modelo: v.modelo, ganancia: v.precio_venta ? v.precio_venta - costoVehiculo(v) : 0 })),
      }
    })
  }, [vehiculos, repTotals])

  const chartData = chartMode === 'semana' ? weeklyDataFull : anualDataFull
  const selectedItem = selectedBar !== null ? chartData[selectedBar] : null

  useHeroEntrance(heroRef)
  useBarGrow(chartRef, [chartMode, chartData])
  const gananciaMesDisplay = useCountUp(gananciaMes, auxReady)

  const autosSinVender = useMemo(() =>
    vehiculos
      .filter((v) => v.estado !== 'vendido')
      .map((v) => ({ ...v, dias: diasEnLote(v.fecha_compra) }))
      .filter((v) => v.dias >= 30)
      .sort((a, b) => b.dias - a.dias)
      .slice(0, 3),
    [vehiculos]
  )

  const recientes = vehiculos.slice(0, 4)
  const donutColors = ['#7A96B8', '#7AAB8E', '#B89870']

  return (
    <div className="scrollable" style={{
      height: '100svh',
      background: 'radial-gradient(ellipse 120% 60% at 60% 0%, #EDE8E0 0%, #F3F0EE 55%, #F7F4F0 100%)',
      paddingBottom: 120,
      position: 'relative',
    }}>
      {/* Ghost watermark */}
      <div style={{
        position: 'absolute', top: 110, left: -10, right: 0,
        fontSize: 96, fontWeight: 800, color: 'rgba(20,20,19,0.04)',
        letterSpacing: '-4px', lineHeight: 1, pointerEvents: 'none',
        userSelect: 'none', zIndex: 0, overflow: 'hidden', whiteSpace: 'nowrap',
        fontFamily: 'var(--font)',
      }}>LOTE</div>

      {/* Header */}
      <div style={{ padding: 'calc(env(safe-area-inset-top) + 16px) 22px 20px', position: 'relative', zIndex: 1 }}>
        {/* Row 1: logo + actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="40" height="26" viewBox="0 0 52 34" fill="none">
              <path d="M4 30 A22 22 0 0 1 48 30" stroke="rgba(20,20,19,0.12)" strokeWidth="4" strokeLinecap="round"/>
              <path d="M4 30 A22 22 0 0 1 38 8" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round"/>
              <line x1="26" y1="30" x2="35" y2="10" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="26" cy="30" r="4" fill="var(--ink)"/>
              <circle cx="26" cy="30" r="2" fill="var(--cream)"/>
            </svg>
            <div style={{ lineHeight: 1 }}>
              <span style={{ fontSize: 26, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-1.2px', fontFamily: 'var(--font)' }}>Motor</span>
              <span style={{ fontSize: 26, fontWeight: 300, color: 'var(--ink)', letterSpacing: '-1.2px', fontFamily: 'var(--font)' }}>Hub</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => navigate('/inventario')}
              style={{
                width: 40, height: 40, borderRadius: 14,
                background: 'rgba(20,20,19,0.07)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer',
              }}
            >
              <svg width="17" height="17" fill="none" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" stroke="var(--ink2)" strokeWidth="1.9"/>
                <path d="M16.5 16.5L21 21" stroke="var(--ink2)" strokeWidth="1.9" strokeLinecap="round"/>
              </svg>
            </button>
            <button
              onClick={() => navigate('/inventario')}
              style={{
                width: 40, height: 40, borderRadius: 14,
                background: 'var(--ink)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(20,20,19,0.18)',
              }}
            >
              <svg width="17" height="17" fill="none" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" stroke="#F3F0EE" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Row 2: greeting + date */}
        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)', letterSpacing: 0.2, marginBottom: 3 }}>
              {greeting}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.8px', lineHeight: 1.1, fontFamily: 'var(--font)' }}>
              {mes}
            </div>
          </div>
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--muted)',
            background: 'rgba(20,20,19,0.06)', padding: '5px 12px',
            borderRadius: 999, letterSpacing: 0.2,
          }}>
            {fechaCorta}
          </div>
        </div>
      </div>

      {/* Hero KPI card */}
      <div style={{ padding: '4px 20px 0', position: 'relative', zIndex: 1 }}>
        <div ref={heroRef} style={{
          background: accentBg,
          borderRadius: 'var(--r-hero)',
          padding: '22px 22px 24px',
          position: 'relative', overflow: 'hidden',
        }}>
          {isDia || isTarde ? <SunDecoration isDia={isDia} /> : <MoonDecoration />}

          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(20,20,19,0.45)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>
            Ganancia neta · {mes.split(' ')[0]}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontSize: 52, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-2.5px', lineHeight: 1 }}>
              {loading || !auxReady ? '—' : gananciaMesDisplay}
            </div>
            {roi > 0 && (
              <div style={{
                marginTop: 6,
                background: 'rgba(20,20,19,0.14)', borderRadius: 999,
                padding: '5px 12px', fontSize: 12, fontWeight: 800, color: 'rgba(20,20,19,0.65)',
              }}>
                ROI {roi}%
              </div>
            )}
          </div>

          {/* Subtitle + Toggle inline */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(20,20,19,0.45)' }}>
              {auxReady ? `${roi}% ROI · ${vendidosMes.length} autos vendidos este mes` : '···'}
            </div>
            <div style={{ display: 'flex', background: 'rgba(20,20,19,0.12)', borderRadius: 999, padding: 2, flexShrink: 0 }}>
              {([{ id: 'semana', label: 'Semana' }, { id: 'anio', label: 'Año' }] as { id: 'semana'|'anio'; label: string }[]).map((o) => (
                <button key={o.id} onClick={() => { setChartMode(o.id); setSelectedBar(null) }} style={{
                  padding: '4px 12px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: chartMode === o.id ? 'rgba(20,20,19,0.75)' : 'transparent',
                  color: chartMode === o.id ? '#F3F0EE' : 'rgba(20,20,19,0.55)',
                  fontSize: 10, fontWeight: 700, fontFamily: 'var(--font)', transition: 'all .15s',
                }}>{o.label}</button>
              ))}
            </div>
          </div>

          <div ref={chartRef}>
            <BarChart
              data={chartData}
              color="rgba(20,20,19,0.85)"
              height={96}
              onSelect={(i) => setSelectedBar(selectedBar === i ? null : i)}
              selected={selectedBar}
            />
          </div>

          {/* Panel autos del período seleccionado */}
          {selectedItem && (
            <div style={{
              marginTop: 10, background: 'rgba(20,20,19,0.12)',
              borderRadius: 16, padding: '10px 12px',
              animation: 'fadeInUp .18s ease',
            }}>
              <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:translateY(0) } }`}</style>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(20,20,19,0.55)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 7 }}>
                {selectedItem.dia} · {selectedItem.autos.length} {selectedItem.autos.length === 1 ? 'auto vendido' : 'autos vendidos'}
              </div>
              {selectedItem.autos.length === 0 ? (
                <div style={{ fontSize: 11, color: 'rgba(20,20,19,0.45)', fontStyle: 'italic' }}>Sin ventas este período</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {selectedItem.autos.map((a, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: 'rgba(255,255,255,0.45)', borderRadius: 10, padding: '6px 10px',
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{a.marca} {a.modelo}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#4A7A5A' }}>+{fmtShort(a.ganancia)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Autos sin vender */}
      {autosSinVender.length > 0 && (
        <div style={{ padding: '14px 20px 0', position: 'relative', zIndex: 1 }}>
          <div style={{
            background: 'rgba(255,255,255,0.85)', borderRadius: 24,
            padding: '16px 16px', boxShadow: '0 2px 16px rgba(20,20,19,0.06)',
            border: '0.5px solid rgba(20,20,19,0.06)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>Autos en lote</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#C07070', background: 'rgba(192,112,112,0.10)', padding: '3px 10px', borderRadius: 999 }}>
                Requieren atención
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {autosSinVender.map((v) => {
                const alerta = alertaLote(v.dias)
                return (
                  <button
                    key={v.id}
                    onClick={() => navigate(`/vehiculo/${v.id}`)}
                    style={{
                      width: '100%', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 10px', borderRadius: 14,
                      background: alerta.bg,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                      {v.marca} {v.modelo} {v.anio}
                    </span>
                    <span style={{
                      fontSize: 12, fontWeight: 800,
                      color: alerta.color,
                      background: `${alerta.color}18`,
                      padding: '3px 10px', borderRadius: 999,
                    }}>
                      {v.dias}d
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Inventario breakdown */}
      {total > 0 && (
        <div style={{ padding: '16px 20px 0' }}>
          <div style={{
            background: '#fff', borderRadius: 'var(--r-card)',
            padding: '18px 18px 16px',
            boxShadow: '0 2px 20px rgba(20,20,19,0.06)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>Inventario</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, marginTop: 1 }}>Distribución por estado</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#7A96B8', background: 'rgba(122,150,184,0.1)', padding: '4px 10px', borderRadius: 999 }}>
                {total} total
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <DonutChart pct={inventarioPct} size={90} stroke={11} colors={donutColors} />
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%,-50%)',
                  fontSize: 18, fontWeight: 800, color: 'var(--ink)',
                }}>{total}</div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'En stock', pct: inventarioPct.stock, color: '#7A96B8' },
                  { label: 'Vendidos', pct: inventarioPct.vendido, color: '#7AAB8E' },
                  { label: 'Reparación', pct: inventarioPct.reparacion, color: '#B89870' },
                ].map((item) => (
                  <div key={item.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)' }}>{item.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink)' }}>{item.pct}%</span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(20,20,19,0.07)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${item.pct}%`, height: '100%', background: item.color, borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gastos/Capital card */}
      <div style={{ padding: '12px 20px 0', position: 'relative', zIndex: 1 }}>
        <button
          onClick={() => navigate('/dashboard/resumen')}
          style={{
            width: '100%', background: '#1E2B38', borderRadius: 'var(--r-card)',
            padding: '18px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            boxShadow: '0 4px 24px rgba(20,20,19,0.14)',
            border: '0.5px solid rgba(255,255,255,0.06)',
            cursor: 'pointer', textAlign: 'left',
          }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(243,240,238,0.5)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Capital invertido</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#F3F0EE', letterSpacing: '-0.8px', marginTop: 4 }}>{fmtShort(inversionTotal)}</div>
            <div style={{ fontSize: 11, color: 'rgba(243,240,238,0.45)', marginTop: 2 }}>en {vehiculos.length} vehículos</div>
          </div>
          <div style={{
            width: 48, height: 48, borderRadius: 16,
            background: 'rgba(243,240,238,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="rgba(243,240,238,0.8)" strokeWidth="1.5"/>
              <path d="M12 6v6l4 2" stroke="rgba(243,240,238,0.8)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>
      </div>

      {/* Actividad reciente */}
      {recientes.length > 0 && (
        <div style={{ padding: '18px 20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>Actividad reciente</span>
            <button
              onClick={() => navigate('/inventario')}
              style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Ver todo →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recientes.map((v) => {
              const isVendido = v.estado === 'vendido'
              const isRep = v.estado === 'en_reparacion'
              const colorIcon = isVendido ? '#7AAB8E' : isRep ? '#B89870' : '#7A96B8'

              const estadoLabel = isVendido ? 'Vendido' : isRep ? 'Reparación' : 'En stock'
              const estadoBg = isVendido ? 'rgba(122,171,142,0.12)' : isRep ? 'rgba(184,152,112,0.12)' : 'rgba(122,150,184,0.12)'
              const ganancia = v.precio_venta ? v.precio_venta - costoVehiculo(v) : null

              return (
                <button
                  key={v.id}
                  onClick={() => navigate(`/vehiculo/${v.id}`)}
                  style={{
                    background: '#fff', borderRadius: 20,
                    padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: 14,
                    boxShadow: '0 1px 12px rgba(20,20,19,0.05)',
                    border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  <div style={{
                    width: 54, height: 44, borderRadius: 14, flexShrink: 0,
                    background: '#fff',
                    boxShadow: '0 1px 6px rgba(20,20,19,0.10)',
                    border: `1.5px solid ${colorIcon}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '8px 10px',
                  }}>
                    {BRAND_LOGOS[v.marca] ? (
                      <img
                        src={BRAND_LOGOS[v.marca]}
                        alt={v.marca}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'brightness(0)', opacity: 0.88 }}
                      />
                    ) : (
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                        <path d="M5 11l2-5h10l2 5" stroke={colorIcon} strokeWidth="1.8" strokeLinecap="round"/>
                        <rect x="2" y="11" width="20" height="7" rx="3" stroke={colorIcon} strokeWidth="1.8"/>
                        <circle cx="7" cy="18" r="2" fill={colorIcon}/>
                        <circle cx="17" cy="18" r="2" fill={colorIcon}/>
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {v.marca} {v.modelo}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{v.anio}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                      background: estadoBg, color: colorIcon, letterSpacing: 0.2,
                    }}>{estadoLabel}</span>
                    {ganancia != null ? (
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#7AAB8E' }}>+{fmtShort(ganancia)}</span>
                    ) : (
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>{fmtShort(v.precio_compra)}</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && vehiculos.length === 0 && (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', background: '#141413',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="36" height="36" fill="none" viewBox="0 0 24 24">
              <path d="M5 11l2-5h10l2 5" stroke="#F3F0EE" strokeWidth="1.8" strokeLinecap="round"/>
              <rect x="2" y="11" width="20" height="7" rx="3" stroke="#F3F0EE" strokeWidth="1.8"/>
              <circle cx="7" cy="18" r="2" fill="#F3F0EE"/>
              <circle cx="17" cy="18" r="2" fill="#F3F0EE"/>
            </svg>
          </div>
          <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.5px', marginBottom: 8 }}>Sin vehículos aún</p>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>Cargá tu primer auto para empezar</p>
          <button
            onClick={() => navigate('/inventario')}
            style={{
              padding: '12px 28px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: 'var(--ink)', color: '#F3F0EE',
              fontSize: 15, fontWeight: 700, fontFamily: 'var(--font)',
            }}
          >
            Ir a Inventario
          </button>
        </div>
      )}
    </div>
  )
}
