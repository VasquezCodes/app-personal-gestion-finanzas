import { useState, useMemo } from 'react'
import { BackHeader } from '../../components/ios/BackHeader'
import type { VentaHistorial } from '../../types'

const LS_KEY = 'motorhub_ganancias_historial'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

function loadVentas(): VentaHistorial[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') } catch { return [] }
}
function saveVentas(data: VentaHistorial[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(data))
}

function Sparkline({ ventas }: { ventas: VentaHistorial[] }) {
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
  const [ventas, setVentas] = useState<VentaHistorial[]>(() => loadVentas())
  const [anioFiltro, setAnioFiltro] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)

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
    const map = new Map<string, VentaHistorial[]>()
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

  function handleDelete(id: string) {
    const next = ventas.filter((v) => v.id !== id)
    setVentas(next)
    saveVentas(next)
  }

  function handleAdd(v: VentaHistorial) {
    const next = [v, ...ventas]
    setVentas(next)
    saveVentas(next)
    setSheetOpen(false)
  }

  function handleExport() {
    const rows = [
      ['ID', 'Marca', 'Modelo', 'Anio', 'Ganancia', 'ROI', 'Dias', 'Fecha'],
      ...filtradas.map((v) => [v.id, v.marca, v.modelo, v.anio, v.ganancia, v.roi, v.dias, v.fecha]),
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
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={handleExport} style={iconBtn}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
            stroke="var(--ink2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <button onClick={() => setSheetOpen(true)} style={{ ...iconBtn, background: 'var(--ink)', boxShadow: '0 4px 14px rgba(20,20,19,0.18)' }}>
        <svg width="17" height="17" fill="none" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" stroke="#F3F0EE" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )

  return (
    <div style={{ height: '100svh', position: 'relative', overflow: 'hidden' }}>
      <div className="scrollable" style={{
        height: '100%',
        background: 'radial-gradient(ellipse 120% 60% at 60% 0%, #EDE8E0 0%, #F3F0EE 55%, #F7F4F0 100%)',
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
                background: anioFiltro === a ? 'var(--ink)' : 'rgba(20,20,19,0.07)',
                color: anioFiltro === a ? '#F3F0EE' : 'var(--ink2)',
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
              border: '1.5px solid rgba(20,20,19,0.10)',
              background: 'rgba(255,255,255,0.8)',
              padding: '0 14px', fontSize: 14, fontFamily: 'var(--font)',
              color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Grouped list */}
        <div style={{ padding: '12px 22px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {porMes.length === 0 ? (
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
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#7AAB8E' }}>{fmt(totalGanancia)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map((v) => {
                    const fecha = new Date(v.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
                    return (
                      <div key={v.id} style={{
                        background: 'rgba(255,255,255,0.82)', borderRadius: 18, padding: '13px 16px',
                        display: 'flex', alignItems: 'center', gap: 13,
                        boxShadow: '0 1px 8px rgba(20,20,19,0.04)',
                        border: '0.5px solid rgba(20,20,19,0.06)',
                      }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 13, flexShrink: 0,
                          background: 'rgba(122,171,142,0.12)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 800, color: '#7AAB8E',
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
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#7AAB8E' }}>+{fmt(v.ganancia)}</div>
                            <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'right' }}>ROI {v.roi.toFixed(1)}%</div>
                          </div>
                          <button onClick={() => handleDelete(v.id)} style={{
                            width: 30, height: 30, borderRadius: 10, border: 'none', cursor: 'pointer',
                            background: 'rgba(192,112,112,0.10)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
                                stroke="#C07070" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
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

      {sheetOpen && (
        <AddVentaSheet onClose={() => setSheetOpen(false)} onSaved={handleAdd} />
      )}
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 14, border: 'none', cursor: 'pointer',
  background: 'rgba(20,20,19,0.07)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

function AddVentaSheet({ onClose, onSaved }: { onClose: () => void; onSaved: (v: VentaHistorial) => void }) {
  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')
  const [anio, setAnio] = useState(String(new Date().getFullYear()))
  const [ganancia, setGanancia] = useState('')
  const [roi, setRoi] = useState('')
  const [dias, setDias] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))

  const valid = marca && modelo && ganancia && roi && dias

  function handleSave() {
    if (!valid) return
    onSaved({
      id: crypto.randomUUID(),
      marca, modelo,
      anio: parseInt(anio),
      ganancia: parseFloat(ganancia),
      roi: parseFloat(roi),
      dias: parseInt(dias),
      fecha,
    })
  }

  const inp: React.CSSProperties = {
    width: '100%', height: 46, borderRadius: 14,
    border: '1.5px solid rgba(20,20,19,0.12)',
    background: 'rgba(255,255,255,0.8)',
    padding: '0 16px', fontSize: 14, fontFamily: 'var(--font)',
    color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(20,20,19,0.4)', backdropFilter: 'blur(4px)', zIndex: 60 }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'var(--cream)', borderRadius: '28px 28px 0 0',
        zIndex: 70, paddingBottom: 34,
        boxShadow: '0 -8px 40px rgba(20,20,19,0.18)',
        animation: 'slideUp .3s cubic-bezier(.2,.8,.3,1)',
      }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(20,20,19,0.18)' }} />
        </div>
        <div style={{ padding: '12px 22px 0' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.5px', marginBottom: 20 }}>Registrar venta</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <input value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Marca" style={inp} />
              <input value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Modelo" style={inp} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input value={anio} onChange={(e) => setAnio(e.target.value)} placeholder="Año" type="number" style={inp} />
              <input value={dias} onChange={(e) => setDias(e.target.value)} placeholder="Días en lote" type="number" style={inp} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input value={ganancia} onChange={(e) => setGanancia(e.target.value)} placeholder="Ganancia ($)" type="number" style={inp} />
              <input value={roi} onChange={(e) => setRoi(e.target.value)} placeholder="ROI (%)" type="number" style={inp} />
            </div>
            <input value={fecha} onChange={(e) => setFecha(e.target.value)} type="date" style={inp} />
            <button onClick={handleSave} disabled={!valid}
              style={{
                width: '100%', height: 50, borderRadius: 999, border: 'none', cursor: 'pointer',
                background: !valid ? 'rgba(20,20,19,0.15)' : 'var(--ink)',
                color: !valid ? 'var(--muted)' : '#F3F0EE',
                fontSize: 15, fontWeight: 700, fontFamily: 'var(--font)',
              }}>
              Guardar venta
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
