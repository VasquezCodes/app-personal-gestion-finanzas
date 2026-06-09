import { useState, useMemo, useEffect } from 'react'
import { BackHeader } from '../../components/ios/BackHeader'
import { supabase } from '../../lib/supabase'

interface VentaRow {
  id: string
  marca: string
  modelo: string
  anio: number
  ganancia: number
  roi: number
  dias: number
  fecha: string
}

interface VehiculoVendidoRow {
  id: string
  marca: string
  modelo: string
  anio: number
  precio_compra: number
  precio_venta: number | null
  gastos_adicionales: number | null
  fecha_compra: string
  fecha_venta: string | null
  reparaciones: { costo: number }[] | null
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

function diasEntre(desde: string, hasta: string): number {
  const ms = new Date(hasta).getTime() - new Date(desde).getTime()
  return Math.max(0, Math.round(ms / 86_400_000))
}

function toVenta(v: VehiculoVendidoRow): VentaRow | null {
  if (v.precio_venta == null || v.fecha_venta == null) return null
  const repTotal = (v.reparaciones ?? []).reduce((s, r) => s + (r.costo ?? 0), 0)
  const costoTotal = v.precio_compra + (v.gastos_adicionales ?? 0) + repTotal
  const ganancia = v.precio_venta - costoTotal
  const roi = costoTotal > 0 ? (ganancia / costoTotal) * 100 : 0
  return {
    id: v.id,
    marca: v.marca,
    modelo: v.modelo,
    anio: v.anio,
    ganancia,
    roi,
    dias: diasEntre(v.fecha_compra, v.fecha_venta),
    fecha: v.fecha_venta,
  }
}

function Sparkline({ ventas }: { ventas: VentaRow[] }) {
  const now = new Date()
  const meses = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const total = ventas.filter((v) => v.fecha.startsWith(key)).reduce((s, v) => s + v.ganancia, 0)
    return total
  })
  const max = Math.max(...meses, 1)
  const W = 120, H = 32
  const pts = meses.map((v, i) => `${(i / 5) * W},${H - (v / max) * H}`)
  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke="rgba(243,240,238,0.6)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {meses.map((v, i) => (
        <circle
          key={i}
          cx={(i / 5) * W}
          cy={H - (v / max) * H}
          r="2.5"
          fill={v > 0 ? 'rgba(243,240,238,0.8)' : 'rgba(243,240,238,0.2)'}
        />
      ))}
    </svg>
  )
}

export default function HistorialGanancias() {
  const [ventas, setVentas] = useState<VentaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [anioFiltro, setAnioFiltro] = useState('todos')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data, error } = await supabase
        .from('vehiculos')
        .select('id, marca, modelo, anio, precio_compra, precio_venta, gastos_adicionales, fecha_compra, fecha_venta, reparaciones(costo)')
        .eq('estado', 'vendido')
      if (!active) return
      if (!error && data) {
        const rows = (data as VehiculoVendidoRow[])
          .map(toVenta)
          .filter((x): x is VentaRow => x !== null)
        setVentas(rows)
      }
      setLoading(false)
    })()
    return () => { active = false }
  }, [])

  const anios = useMemo(() => {
    const set = new Set(ventas.map((v) => v.fecha.slice(0, 4)))
    return Array.from(set).sort((a, b) => b.localeCompare(a))
  }, [ventas])

  const filtradas = useMemo(() =>
    ventas
      .filter((v) => anioFiltro === 'todos' || v.fecha.startsWith(anioFiltro))
      .filter((v) => !busqueda || `${v.marca} ${v.modelo}`.toLowerCase().includes(busqueda.toLowerCase()))
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [ventas, anioFiltro, busqueda]
  )

  const porMes = useMemo(() => {
    const map = new Map<string, VentaRow[]>()
    filtradas.forEach((v) => {
      const key = v.fecha.slice(0, 7)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(v)
    })
    return Array.from(map.entries()).map(([key, items]) => {
      const [y, m] = key.split('-').map(Number)
      const label = new Date(y, m - 1, 1)
        .toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
        .replace(/^\w/, (c) => c.toUpperCase())
      const totalGanancia = items.reduce((s, v) => s + v.ganancia, 0)
      const roiProm = items.length > 0 ? items.reduce((s, v) => s + v.roi, 0) / items.length : 0
      return { key, label, items, totalGanancia, roiProm }
    })
  }, [filtradas])

  const totalGeneral = filtradas.reduce((s, v) => s + v.ganancia, 0)
  const roiGlobal = filtradas.length > 0 ? filtradas.reduce((s, v) => s + v.roi, 0) / filtradas.length : 0

  function handleExport() {
    const rows = [
      ['ID', 'Marca', 'Modelo', 'Anio', 'Ganancia', 'ROI', 'Dias', 'Fecha'],
      ...filtradas.map((v) => [v.id, v.marca, v.modelo, v.anio, v.ganancia, v.roi.toFixed(2), v.dias, v.fecha]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'historial_ganancias.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const actionButtons = (
    <button onClick={handleExport} style={iconBtn}>
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
          stroke="var(--ink2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )

  return (
    <div style={{ height: '100svh', position: 'relative', overflow: 'hidden' }}>
      <div className="scrollable" style={{
        height: '100%',
        background: 'var(--bg-gradient)',
        paddingBottom: 40,
      }}>
        <BackHeader title="Historial de Ganancias" action={actionButtons} />

        {/* Hero */}
        <div style={{ padding: '0 22px 0' }}>
          <div style={{
            background: 'var(--surface-deep)', borderRadius: 28,
            padding: '20px 20px', boxShadow: '0 4px 24px rgba(20,20,19,0.14)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(243,240,238,0.4)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>
                  Ganancia acumulada
                </div>
                <div style={{ fontSize: 42, fontWeight: 900, color: '#F3F0EE', letterSpacing: '-2px', lineHeight: 1 }}>
                  {fmt(totalGeneral)}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(243,240,238,0.4)', marginTop: 6 }}>
                  ROI prom. {roiGlobal.toFixed(1)}% · {filtradas.length} ventas
                </div>
              </div>
              <div style={{ paddingTop: 6 }}>
                <Sparkline ventas={ventas} />
              </div>
            </div>
          </div>
        </div>

        {/* Year filter */}
        {anios.length > 0 && (
          <div style={{ padding: '12px 22px 0', display: 'flex', gap: 8, overflowX: 'auto' }} className="scrollbar-none">
            {['todos', ...anios].map((a) => (
              <button key={a} onClick={() => setAnioFiltro(a)} style={{
                padding: '7px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0,
                background: anioFiltro === a ? 'var(--ink)' : 'var(--btn-ghost-bg)',
                color: anioFiltro === a ? 'var(--bg)' : 'var(--ink2)',
                fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)',
              }}>{a === 'todos' ? 'Todos' : a}</button>
            ))}
          </div>
        )}

        {/* Search */}
        <div style={{ padding: '10px 22px 0' }}>
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por marca o modelo…"
            style={{
              width: '100%', height: 42, borderRadius: 14,
              border: '1.5px solid var(--separator)',
              background: 'var(--bg-input)',
              padding: '0 14px', fontSize: 14, fontFamily: 'var(--font)',
              color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Grouped list */}
        <div style={{ padding: '12px 22px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
              Cargando…
            </div>
          ) : porMes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
              {ventas.length === 0 ? 'Sin ventas registradas' : 'Sin resultados'}
            </div>
          ) : (
            porMes.map(({ key, label, items, totalGanancia, roiProm }) => (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>{label}</div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>ROI {roiProm.toFixed(1)}%</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)' }}>{fmt(totalGanancia)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map((v) => {
                    const fecha = new Date(v.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
                    return (
                      <div key={v.id} style={{
                        background: 'var(--card-glass)', borderRadius: 18, padding: '13px 16px',
                        display: 'flex', alignItems: 'center', gap: 13,
                        boxShadow: '0 1px 8px rgba(20,20,19,0.04)',
                        border: '0.5px solid var(--separator)',
                      }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 13, flexShrink: 0,
                          background: 'rgba(122,171,142,0.12)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 800, color: 'var(--green)',
                        }}>
                          {v.marca.slice(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {v.marca} {v.modelo} {v.anio}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                            {fecha} · {v.dias}d en lote
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: v.ganancia >= 0 ? 'var(--green)' : 'var(--red)' }}>
                              {v.ganancia >= 0 ? '+' : '−'}{fmt(Math.abs(v.ganancia))}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'right' }}>ROI {v.roi.toFixed(1)}%</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 14, border: 'none', cursor: 'pointer',
  background: 'var(--btn-ghost-bg)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
