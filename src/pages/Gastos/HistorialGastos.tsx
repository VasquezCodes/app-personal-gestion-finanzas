import { useState, useMemo } from 'react'
import { BackHeader } from '../../components/ios/BackHeader'
import type { GastoHistorial } from '../../types'

const LS_KEY = 'motorhub_gastos_historial'

type CatKey = GastoHistorial['categoria']

const catConfig: Record<CatKey, { label: string; color: string; bg: string }> = {
  alquiler:  { label: 'Alquiler',  color: '#7A96B8', bg: 'rgba(122,150,184,0.12)' },
  servicios: { label: 'Servicios', color: '#7AAB8E', bg: 'rgba(122,171,142,0.12)' },
  marketing: { label: 'Marketing', color: '#B89870', bg: 'rgba(184,152,112,0.12)' },
  personal:  { label: 'Personal',  color: '#A88AB8', bg: 'rgba(168,138,184,0.12)' },
  otro:      { label: 'Otro',      color: '#9A9590', bg: 'rgba(154,149,144,0.12)' },
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

function loadGastos(): GastoHistorial[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') } catch { return [] }
}
function saveGastos(data: GastoHistorial[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(data))
}

export default function HistorialGastos() {
  const [gastos, setGastos] = useState<GastoHistorial[]>(() => loadGastos())
  const [anioFiltro, setAnioFiltro] = useState<string>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)

  const anios = useMemo(() => {
    const set = new Set(gastos.map((g) => g.fecha.slice(0, 4)))
    return Array.from(set).sort((a, b) => b.localeCompare(a))
  }, [gastos])

  const filtrados = useMemo(() => {
    return gastos
      .filter((g) => anioFiltro === 'todos' || g.fecha.startsWith(anioFiltro))
      .filter((g) => !busqueda || g.descripcion.toLowerCase().includes(busqueda.toLowerCase()))
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [gastos, anioFiltro, busqueda])

  const porMes = useMemo(() => {
    const map = new Map<string, GastoHistorial[]>()
    filtrados.forEach((g) => {
      const key = g.fecha.slice(0, 7)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(g)
    })
    return Array.from(map.entries()).map(([key, items]) => {
      const [y, m] = key.split('-').map(Number)
      const label = new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
        .replace(/^\w/, (c) => c.toUpperCase())
      const total = items.reduce((s, g) => s + g.monto, 0)
      return { key, label, items, total }
    })
  }, [filtrados])

  const totalGeneral = filtrados.reduce((s, g) => s + g.monto, 0)

  function handleDelete(id: string) {
    const next = gastos.filter((g) => g.id !== id)
    setGastos(next)
    saveGastos(next)
  }

  function handleAdd(g: GastoHistorial) {
    const next = [g, ...gastos]
    setGastos(next)
    saveGastos(next)
    setSheetOpen(false)
  }

  function handleExport() {
    const rows = [
      ['ID', 'Descripcion', 'Monto', 'Categoria', 'Fecha'],
      ...filtrados.map((g) => [g.id, `"${g.descripcion}"`, g.monto, g.categoria, g.fecha]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'historial_gastos.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const actionButtons = (
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={handleExport} style={iconBtnStyle(false)}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
            stroke="#7A96B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <button onClick={() => setSheetOpen(true)} style={iconBtnStyle(true)}>
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
        <BackHeader title="Historial de Gastos" action={actionButtons} />

        {/* Hero */}
        <div style={{ padding: '0 22px 0' }}>
          <div style={{
            background: 'var(--surface-deep)', borderRadius: 28,
            padding: '20px 20px', boxShadow: '0 4px 24px rgba(20,20,19,0.14)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(243,240,238,0.4)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>
              Total acumulado
            </div>
            <div style={{ fontSize: 42, fontWeight: 900, color: '#F3F0EE', letterSpacing: '-2px', lineHeight: 1 }}>
              {fmt(totalGeneral)}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(243,240,238,0.4)', marginTop: 6 }}>
              {filtrados.length} movimientos
            </div>
          </div>
        </div>

        {/* Año filter */}
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
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por descripción…"
            style={{
              width: '100%', height: 42, borderRadius: 14,
              border: '1.5px solid rgba(20,20,19,0.10)',
              background: 'rgba(255,255,255,0.8)',
              padding: '0 14px', fontSize: 14, fontFamily: 'var(--font)',
              color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* List grouped by month */}
        <div style={{ padding: '12px 22px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {porMes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
              {gastos.length === 0 ? 'Sin gastos registrados' : 'Sin resultados para esta búsqueda'}
            </div>
          ) : (
            porMes.map(({ key, label, items, total }) => (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#C07070' }}>{fmt(total)}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map((g) => {
                    const c = catConfig[g.categoria]
                    const fecha = new Date(g.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
                    return (
                      <div key={g.id} style={{
                        background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)', borderRadius: 18, padding: '13px 16px',
                        display: 'flex', alignItems: 'center', gap: 13,
                        boxShadow: '0 1px 8px rgba(20,20,19,0.04)',
                        border: '0.5px solid rgba(20,20,19,0.06)',
                      }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 13, flexShrink: 0,
                          background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {g.descripcion}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{fecha} · {c.label}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#C07070' }}>−{fmt(g.monto)}</div>
                          <button
                            onClick={() => handleDelete(g.id)}
                            style={{
                              width: 30, height: 30, borderRadius: 10, border: 'none', cursor: 'pointer',
                              background: 'rgba(192,112,112,0.10)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
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
        <AddGastoHistorialSheet onClose={() => setSheetOpen(false)} onSaved={handleAdd} />
      )}
    </div>
  )
}

function iconBtnStyle(dark: boolean): React.CSSProperties {
  return {
    width: 40, height: 40, borderRadius: 14, border: 'none', cursor: 'pointer',
    background: dark ? 'var(--ink)' : 'rgba(20,20,19,0.07)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: dark ? '0 4px 14px rgba(20,20,19,0.18)' : 'none',
  }
}

function AddGastoHistorialSheet({
  onClose, onSaved,
}: { onClose: () => void; onSaved: (g: GastoHistorial) => void }) {
  const [desc, setDesc] = useState('')
  const [monto, setMonto] = useState('')
  const [cat, setCat] = useState<CatKey>('otro')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))

  function handleSave() {
    if (!desc || !monto) return
    onSaved({
      id: crypto.randomUUID(),
      descripcion: desc,
      monto: parseFloat(monto),
      categoria: cat,
      fecha,
    })
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
          <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.5px', marginBottom: 20 }}>Nuevo gasto</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descripción"
              style={inputStyle} />
            <input value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="Monto (USD)" type="number"
              style={inputStyle} />
            <select value={cat} onChange={(e) => setCat(e.target.value as CatKey)} style={inputStyle}>
              {(Object.entries(catConfig) as [CatKey, typeof catConfig[CatKey]][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <input value={fecha} onChange={(e) => setFecha(e.target.value)} type="date" style={inputStyle} />
            <button onClick={handleSave} disabled={!desc || !monto}
              style={{
                width: '100%', height: 50, borderRadius: 999, border: 'none', cursor: 'pointer',
                background: !desc || !monto ? 'rgba(20,20,19,0.15)' : 'var(--ink)',
                color: !desc || !monto ? 'var(--muted)' : '#F3F0EE',
                fontSize: 15, fontWeight: 700, fontFamily: 'var(--font)',
              }}>
              Guardar gasto
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 46, borderRadius: 14,
  border: '1.5px solid rgba(20,20,19,0.12)',
  background: 'rgba(255,255,255,0.8)',
  padding: '0 16px', fontSize: 14, fontFamily: 'var(--font)',
  color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
}
