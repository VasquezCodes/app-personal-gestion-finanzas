import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useVehiculosStore } from '../../store/vehiculosStore'
import { diasEnLote, alertaLote } from '../../lib/utils'
import type { Vehiculo } from '../../types'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const fmtShort = (n: number) => `$${Math.round(Math.abs(n)).toLocaleString('es-AR')}`

type Periodo = 'mes' | 'anio'

interface VehiculoRow {
  v: Vehiculo
  costo: number
  ganancia: number
  roi: number
  dias: number
  reparaciones: number
  adicionales: number
}

export default function EstadoResultados() {
  const navigate = useNavigate()
  const { vehiculos, fetchVehiculos } = useVehiculosStore()
  const [repTotals, setRepTotals] = useState<Record<string, number>>({})
  const [ready, setReady] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [mesIdx, setMesIdx] = useState(() => new Date().getMonth())
  const [anioNav, setAnioNav] = useState(() => new Date().getFullYear())

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()
  const atLimit = periodo === 'mes'
    ? anioNav === currentYear && mesIdx === currentMonth
    : anioNav === currentYear

  useEffect(() => {
    fetchVehiculos()
    supabase.from('reparaciones').select('vehiculo_id, costo').then(({ data }) => {
      const totals: Record<string, number> = {}
      data?.forEach(r => { totals[r.vehiculo_id] = (totals[r.vehiculo_id] ?? 0) + r.costo })
      setRepTotals(totals)
      setReady(true)
    })
  }, [fetchVehiculos])

  const prevNav = () => {
    if (periodo === 'mes') {
      if (mesIdx === 0) { setMesIdx(11); setAnioNav(a => a - 1) }
      else setMesIdx(m => m - 1)
    } else setAnioNav(a => a - 1)
  }
  const nextNav = () => {
    if (atLimit) return
    if (periodo === 'mes') {
      if (mesIdx === 11) { setMesIdx(0); setAnioNav(a => a + 1) }
      else setMesIdx(m => m + 1)
    } else setAnioNav(a => Math.min(a + 1, currentYear))
  }

  const navLabel = periodo === 'mes' ? `${MESES[mesIdx]} ${anioNav}` : String(anioNav)
  const filterKey = periodo === 'mes'
    ? `${anioNav}-${String(mesIdx + 1).padStart(2, '0')}`
    : String(anioNav)

  const costoVehiculo = (v: Vehiculo) =>
    v.precio_compra + (v.gastos_adicionales ?? 0) + (repTotals[v.id] ?? 0)

  const vendidos: VehiculoRow[] = useMemo(() =>
    vehiculos
      .filter(v => v.estado === 'vendido' && v.precio_venta && v.fecha_venta?.startsWith(filterKey))
      .map(v => {
        const reparaciones = repTotals[v.id] ?? 0
        const adicionales = v.gastos_adicionales ?? 0
        const costo = v.precio_compra + reparaciones + adicionales
        const ganancia = v.precio_venta! - costo
        const roi = costo > 0 ? (ganancia / costo) * 100 : 0
        const dias = v.fecha_venta
          ? Math.floor((new Date(v.fecha_venta + 'T00:00:00').getTime() - new Date(v.fecha_compra + 'T00:00:00').getTime()) / 86_400_000)
          : 0
        return { v, costo, ganancia, roi, dias, reparaciones, adicionales }
      })
      .sort((a, b) => b.ganancia - a.ganancia),
    [vehiculos, repTotals, filterKey]
  )

  const enLote: (Vehiculo & { dias: number })[] = useMemo(() =>
    vehiculos
      .filter(v => v.estado !== 'vendido')
      .map(v => ({ ...v, dias: diasEnLote(v.fecha_compra) }))
      .sort((a, b) => b.dias - a.dias),
    [vehiculos]
  )

  const totalGanancia = vendidos.reduce((a, r) => a + r.ganancia, 0)
  const totalInvertido = vendidos.reduce((a, r) => a + r.costo, 0)
  const totalVenta = vendidos.reduce((a, r) => a + (r.v.precio_venta ?? 0), 0)
  const capitalEnLote = enLote.reduce((a, v) => a + costoVehiculo(v), 0)
  const roiGlobal = totalInvertido > 0 ? Math.round((totalGanancia / totalInvertido) * 100) : 0

  return (
    <div style={{ height: '100svh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        background: 'var(--surface-deep)',
        padding: 'calc(env(safe-area-inset-top) + 16px) 22px 28px',
        flexShrink: 0,
      }}>
        {/* Nav row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <button onClick={() => navigate(-1)} style={{
            width: 36, height: 36, borderRadius: 12,
            background: 'rgba(243,240,238,0.1)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ChevronLeft size={18} color="#F3F0EE" strokeWidth={2} />
          </button>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#F3F0EE', letterSpacing: 0.2 }}>
            Estado de Resultados
          </span>
          <div style={{ width: 36 }} />
        </div>

        {/* Period toggle */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
          {(['mes', 'anio'] as Periodo[]).map(p => (
            <button key={p} onClick={() => setPeriodo(p)} style={{
              padding: '7px 20px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: periodo === p ? 'rgba(243,240,238,0.95)' : 'rgba(243,240,238,0.1)',
              color: periodo === p ? '#1E2B38' : 'rgba(243,240,238,0.55)',
              fontSize: 13, fontWeight: 700, fontFamily: 'var(--font)', transition: 'all .15s',
            }}>{p === 'mes' ? 'Mes' : 'Año'}</button>
          ))}
        </div>

        {/* Navigator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 24 }}>
          <button onClick={prevNav} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, opacity: 0.6 }}>
            <ChevronLeft size={16} color="#F3F0EE" strokeWidth={2} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(243,240,238,0.85)', minWidth: 130, textAlign: 'center' }}>
            {navLabel}
          </span>
          <button onClick={nextNav} disabled={atLimit} style={{
            background: 'none', border: 'none', cursor: atLimit ? 'default' : 'pointer',
            padding: 6, opacity: atLimit ? 0.15 : 0.6,
          }}>
            <ChevronRight size={16} color="#F3F0EE" strokeWidth={2} />
          </button>
        </div>

        {/* KPIs */}
        {ready && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { label: 'Ganancia neta', value: fmt(totalGanancia), highlight: totalGanancia > 0 },
              { label: 'Capital recuperado', value: fmt(totalVenta), highlight: false },
              { label: 'ROI', value: `${roiGlobal}%`, highlight: roiGlobal > 0 },
            ].map(k => (
              <div key={k.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(243,240,238,0.4)', marginBottom: 4 }}>
                  {k.label}
                </div>
                <div style={{
                  fontSize: 16, fontWeight: 900, letterSpacing: '-0.5px',
                  color: k.highlight ? 'var(--green)' : '#F3F0EE',
                }}>
                  {k.value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="scrollable" style={{ flex: 1, overflowY: 'auto', paddingBottom: 40 }}>

        {/* Vendidos */}
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, paddingLeft: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--muted)' }}>
              Vendidos
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>
              {vendidos.length} {vendidos.length === 1 ? 'unidad' : 'unidades'}
            </span>
          </div>

          {vendidos.length === 0 ? (
            <div style={{
              background: 'var(--card-glass)', borderRadius: 20, padding: '32px 20px', textAlign: 'center',
              boxShadow: '0 1px 8px var(--btn-ghost-bg)',
            }}>
              <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.3 }}>📋</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>Sin ventas en {navLabel}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {vendidos.map(({ v, costo, ganancia, roi, dias, reparaciones, adicionales }) => {
                const isExpanded = expanded === v.id
                const isPositive = ganancia >= 0
                const roiAbs = Math.round(Math.abs(roi))
                const profitRatio = Math.min(Math.abs(ganancia) / costo, 1)

                return (
                  <div key={v.id} style={{
                    background: 'var(--card-glass)', borderRadius: 20, overflow: 'hidden',
                    boxShadow: '0 1px 8px var(--separator)',
                    border: isExpanded ? '1.5px solid rgba(122,171,142,0.3)' : '1.5px solid transparent',
                    transition: 'border-color .2s',
                  }}>
                    {/* Collapsed row */}
                    <button
                      onClick={() => setExpanded(isExpanded ? null : v.id)}
                      style={{
                        width: '100%', padding: '14px 16px', background: 'none', border: 'none',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                      }}
                    >
                      {/* Color indicator */}
                      <div style={{
                        width: 4, height: 38, borderRadius: 2, flexShrink: 0,
                        background: isPositive ? 'var(--green)' : 'var(--red)',
                      }} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {v.marca} {v.modelo}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          {v.anio} · {dias}d en lote
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                          fontSize: 16, fontWeight: 900, letterSpacing: '-0.5px',
                          color: isPositive ? 'var(--green)' : 'var(--red)',
                        }}>
                          {isPositive ? '+' : '-'}{fmtShort(ganancia)}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
                          ROI {isPositive ? '+' : '-'}{roiAbs}%
                        </div>
                      </div>

                      <div style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>
                        {isExpanded ? <ChevronUp size={16} strokeWidth={2} /> : <ChevronDown size={16} strokeWidth={2} />}
                      </div>
                    </button>

                    {/* Profit bar */}
                    <div style={{ height: 3, background: 'var(--btn-ghost-bg)', margin: '0 16px' }}>
                      <div style={{
                        height: '100%', borderRadius: 999,
                        width: `${Math.round(profitRatio * 100)}%`,
                        background: isPositive ? 'var(--green)' : 'var(--red)',
                        transition: 'width .4s ease',
                      }} />
                    </div>

                    {/* Expanded breakdown */}
                    {isExpanded && (
                      <div style={{ padding: '16px 20px 20px' }}>
                        <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)', marginBottom: 14 }}>
                          Desglose financiero
                        </div>

                        {/* Costs */}
                        {[
                          { label: 'Precio de compra', value: v.precio_compra, type: 'cost' },
                          ...(reparaciones > 0 ? [{ label: 'Reparaciones', value: reparaciones, type: 'cost' }] : []),
                          ...(adicionales > 0 ? [{ label: 'Gastos adicionales', value: adicionales, type: 'cost' }] : []),
                        ].map((item, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, marginBottom: 8, borderBottom: '0.5px solid var(--separator)' }}>
                            <span style={{ fontSize: 13, color: 'var(--ink2)', fontWeight: 500 }}>{item.label}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>-{fmt(item.value)}</span>
                          </div>
                        ))}

                        {/* Costo total */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(192,112,112,0.06)', borderRadius: 12, marginBottom: 10 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Costo total</span>
                          <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--red)' }}>-{fmt(costo)}</span>
                        </div>

                        {/* Venta */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(122,171,142,0.08)', borderRadius: 12, marginBottom: 12 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Precio de venta</span>
                          <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--green)' }}>+{fmt(v.precio_venta!)}</span>
                        </div>

                        {/* Separator */}
                        <div style={{ height: 1, background: 'var(--separator)', marginBottom: 12 }} />

                        {/* Resultado final */}
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '12px 16px', borderRadius: 14,
                          background: isPositive ? 'rgba(122,171,142,0.12)' : 'rgba(192,112,112,0.10)',
                        }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: isPositive ? 'var(--green)' : 'var(--red)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                              {isPositive ? 'Ganancia neta' : 'Pérdida neta'}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                              ROI {isPositive ? '+' : '-'}{roiAbs}% · {dias} días
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {isPositive
                              ? <TrendingUp size={16} color="var(--green)" strokeWidth={2} />
                              : <TrendingDown size={16} color="var(--red)" strokeWidth={2} />}
                            <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.8px', color: isPositive ? 'var(--green)' : 'var(--red)' }}>
                              {isPositive ? '+' : '-'}{fmtShort(ganancia)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* En lote */}
        {enLote.length > 0 && (
          <div style={{ padding: '20px 16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, paddingLeft: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--muted)' }}>
                En lote
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>
                Capital: {fmt(capitalEnLote)}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {enLote.map(v => {
                const alerta = alertaLote(v.dias)
                const capital = costoVehiculo(v)
                return (
                  <div key={v.id} style={{
                    background: 'var(--card-glass)', borderRadius: 16, padding: '12px 16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    boxShadow: '0 1px 6px var(--btn-ghost-bg)',
                  }}>
                    <div style={{ width: 4, height: 34, borderRadius: 2, background: alerta.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {v.marca} {v.modelo} {v.anio}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                        {v.estado === 'en_reparacion' ? 'En reparación' : 'En stock'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>{fmt(capital)}</div>
                      <div style={{
                        fontSize: 10, fontWeight: 700, color: alerta.color,
                        background: alerta.bg, borderRadius: 999, padding: '1px 7px', marginTop: 3, display: 'inline-block',
                      }}>
                        {v.dias}d
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Resumen total */}
        {ready && (vendidos.length > 0 || enLote.length > 0) && (
          <div style={{ padding: '20px 16px 0' }}>
            <div style={{
              background: 'var(--surface-deep)', borderRadius: 20, padding: '20px 20px',
              boxShadow: '0 4px 20px rgba(20,20,19,0.18)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: 'rgba(243,240,238,0.4)', marginBottom: 16 }}>
                Resumen · {navLabel}
              </div>
              {[
                { label: 'Unidades vendidas', value: `${vendidos.length}`, muted: true },
                { label: 'Capital invertido', value: `-${fmt(totalInvertido)}`, color: 'rgba(243,240,238,0.6)' },
                { label: 'Total recuperado (ventas)', value: `+${fmt(totalVenta)}`, color: 'var(--green)' },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: i < 2 ? 12 : 0, marginBottom: i < 2 ? 12 : 0, borderBottom: i < 2 ? '0.5px solid rgba(255,255,255,0.07)' : 'none' }}>
                  <span style={{ fontSize: 12, color: 'rgba(243,240,238,0.45)', fontWeight: 500 }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: row.color ?? '#F3F0EE' }}>{row.value}</span>
                </div>
              ))}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.12)', margin: '16px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(243,240,238,0.45)', fontWeight: 600, marginBottom: 2 }}>Ganancia neta del período</div>
                  <div style={{ fontSize: 10, color: 'rgba(243,240,238,0.3)' }}>ROI {roiGlobal}%</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {totalGanancia > 0
                    ? <TrendingUp size={18} color="var(--green)" />
                    : totalGanancia < 0
                    ? <TrendingDown size={18} color="var(--red)" />
                    : <Minus size={18} color="rgba(243,240,238,0.4)" />}
                  <span style={{
                    fontSize: 26, fontWeight: 900, letterSpacing: '-1px',
                    color: totalGanancia > 0 ? 'var(--green)' : totalGanancia < 0 ? 'var(--red)' : '#F3F0EE',
                  }}>
                    {totalGanancia >= 0 ? '+' : '-'}{fmtShort(totalGanancia)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
