import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { GastoGeneral } from '../../types'
import { useStaggerIn } from '../../hooks/animations/useStaggerIn'

type CatKey = 'alquiler' | 'servicios' | 'marketing' | 'personal' | 'otro'
type Periodo = 'mes' | 'anio' | 'todo'

const catConfig: Record<CatKey, { label: string; color: string; bg: string }> = {
  alquiler:  { label: 'Alquiler',  color: '#7A96B8', bg: 'rgba(122,150,184,0.12)' },
  servicios: { label: 'Servicios', color: '#7AAB8E', bg: 'rgba(122,171,142,0.12)' },
  marketing: { label: 'Marketing', color: '#B89870', bg: 'rgba(184,152,112,0.12)' },
  personal:  { label: 'Personal',  color: '#A88AB8', bg: 'rgba(168,138,184,0.12)' },
  otro:      { label: 'Otro',      color: '#9A9590', bg: 'rgba(154,149,144,0.12)' },
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const fmtShort = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

export default function Gastos() {
  const [gastos, setGastos] = useState<GastoGeneral[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'todos' | CatKey>('todos')
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const now = new Date()
  const mesKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const anioKey = String(now.getFullYear())
  const mesLabel = now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }).replace(/^\w/, (c) => c.toUpperCase())

  useEffect(() => {
    setLoading(true)
    supabase.from('gastos_generales').select('*').order('fecha', { ascending: false })
      .then(({ data }) => { setGastos(data ?? []); setLoading(false) })
  }, [])

  const gastosPeriodo = gastos.filter((g) => {
    if (periodo === 'mes') return g.fecha.startsWith(mesKey)
    if (periodo === 'anio') return g.fecha.startsWith(anioKey)
    return true
  })

  const gastosFiltrados = filtro === 'todos' ? gastosPeriodo : gastosPeriodo.filter((g) => g.categoria === filtro)
  const totalPeriodo = gastosPeriodo.reduce((a, g) => a + g.monto, 0)

  const catTotals = (Object.entries(catConfig) as [CatKey, typeof catConfig[CatKey]][])
    .map(([k, v]) => ({
      ...v, key: k,
      total: gastosPeriodo.filter((g) => g.categoria === k).reduce((a, g) => a + g.monto, 0),
      pct: totalPeriodo > 0
        ? Math.round(gastosPeriodo.filter((g) => g.categoria === k).reduce((a, g) => a + g.monto, 0) / totalPeriodo * 100)
        : 0,
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)

  const periodoLabel = periodo === 'mes' ? `Total · ${mesLabel}` : periodo === 'anio' ? `Total · ${anioKey}` : 'Historial completo'

  const navigate = useNavigate()
  const listRef = useRef<HTMLDivElement>(null)
  useStaggerIn(listRef, [gastosFiltrados.length, filtro, periodo])

  async function handleDelete(id: string) {
    setDeletingId(id)
    const { error } = await supabase.from('gastos_generales').delete().eq('id', id)
    setDeletingId(null)
    if (!error) setGastos((prev) => prev.filter((g) => g.id !== id))
  }

  return (
    <div style={{ height: '100svh', position: 'relative', overflow: 'hidden' }}>
      <div className="scrollable" style={{
        height: '100%',
        background: 'radial-gradient(ellipse 120% 60% at 60% 0%, #EDE8E0 0%, #F3F0EE 55%, #F7F4F0 100%)',
        paddingBottom: 120,
      }}>
        {/* Header */}
        <div style={{ padding: 'calc(env(safe-area-inset-top) + 16px) 22px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 3 }}>Finanzas</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-1px', fontFamily: 'var(--font)' }}>Gastos</div>
            </div>
            <button onClick={() => setSheetOpen(true)} style={{
              width: 40, height: 40, borderRadius: 14, background: 'var(--ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(20,20,19,0.18)',
            }}>
              <svg width="17" height="17" fill="none" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" stroke="#F3F0EE" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Período selector */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            {([{ id: 'mes', label: 'Este mes' }, { id: 'anio', label: 'Este año' }, { id: 'todo', label: 'Historial' }] as { id: Periodo; label: string }[]).map((p) => (
              <button key={p.id} onClick={() => setPeriodo(p.id)} style={{
                padding: '7px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                background: periodo === p.id ? 'var(--ink)' : 'rgba(20,20,19,0.07)',
                color: periodo === p.id ? '#F3F0EE' : 'var(--ink2)',
                fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)', transition: 'all .15s',
              }}>{p.label}</button>
            ))}
          </div>

          {/* Quick access */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={() => navigate('/gastos/reparaciones')} style={{
              flex: 1, height: 36, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: 'rgba(20,20,19,0.07)',
              color: 'var(--ink2)', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)',
            }}>
              🔧 Reparaciones
            </button>
            <button onClick={() => navigate('/gastos/historial')} style={{
              flex: 1, height: 36, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: 'rgba(20,20,19,0.07)',
              color: 'var(--ink2)', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)',
            }}>
              📋 Historial
            </button>
          </div>
        </div>

        {/* Total KPI */}
        <div style={{ padding: '14px 22px 0' }}>
          <div style={{
            background: 'var(--surface-deep)', borderRadius: 28,
            padding: '20px 20px', position: 'relative', overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(20,20,19,0.14)',
          }}>
            <div style={{ position: 'absolute', right: -8, top: -10, fontSize: 72, fontWeight: 900, color: 'rgba(255,255,255,0.04)', letterSpacing: '-3px', pointerEvents: 'none', userSelect: 'none' }}>
              GASTO
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(243,240,238,0.4)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
              {periodoLabel}
            </div>
            <div style={{ fontSize: 46, fontWeight: 900, color: '#F3F0EE', letterSpacing: '-2px', lineHeight: 1, marginBottom: 6 }}>
              {loading ? '—' : fmtShort(totalPeriodo)}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(243,240,238,0.4)', fontWeight: 500 }}>
              {gastosPeriodo.length} movimientos registrados
            </div>
            {catTotals.length > 0 && (
              <div style={{ marginTop: 16, display: 'flex', gap: 4, alignItems: 'flex-end', height: 32 }}>
                {catTotals.map((c) => (
                  <div key={c.key} style={{
                    flex: c.pct, height: Math.max(8, Math.round(c.pct * 0.32)), borderRadius: 4,
                    background: c.color, opacity: 0.7,
                  }} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Category breakdown */}
        {catTotals.length > 0 && (
          <div style={{ padding: '12px 22px 0' }}>
            <div style={{ background: 'rgba(255,255,255,0.8)', borderRadius: 24, padding: '16px 16px', boxShadow: '0 1px 12px rgba(20,20,19,0.05)' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', marginBottom: 12 }}>Por categoría</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {catTotals.map((c) => (
                  <div key={c.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink2)' }}>{c.label}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{c.pct}%</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink)' }}>{fmt(c.total)}</span>
                      </div>
                    </div>
                    <div style={{ height: 5, background: 'rgba(20,20,19,0.06)', borderRadius: 999 }}>
                      <div style={{ width: `${c.pct}%`, height: '100%', background: c.color, borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Filter pills */}
        <div style={{ padding: '14px 22px 0', display: 'flex', gap: 8, overflowX: 'auto' }} className="scrollbar-none">
          {([{ id: 'todos', label: 'Todos' }, ...Object.entries(catConfig).map(([k, v]) => ({ id: k as CatKey, label: v.label }))] as { id: 'todos' | CatKey; label: string }[]).map((f) => (
            <button key={f.id} onClick={() => setFiltro(f.id)} style={{
              padding: '7px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0,
              background: filtro === f.id ? 'var(--ink)' : 'rgba(20,20,19,0.07)',
              color: filtro === f.id ? '#F3F0EE' : 'var(--ink2)',
              fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)', transition: 'all .15s',
            }}>{f.label}</button>
          ))}
        </div>

        {/* Expense list */}
        <div ref={listRef} style={{ padding: '12px 22px 0', display: 'flex', flexDirection: 'column', gap: 9 }}>
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} style={{ height: 64, borderRadius: 18, background: 'rgba(20,20,19,0.07)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))
          ) : gastosFiltrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
              {periodo === 'mes' ? 'Sin gastos este mes' : periodo === 'anio' ? 'Sin gastos este año' : 'Sin gastos registrados'}
            </div>
          ) : (
            gastosFiltrados.map((g) => {
              const c = catConfig[g.categoria as CatKey] ?? catConfig.otro
              const fecha = new Date(g.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: periodo === 'todo' ? 'numeric' : undefined })
              const isDeleting = deletingId === g.id
              return (
                <div key={g.id} style={{
                  background: 'rgba(255,255,255,0.82)',
                  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                  borderRadius: 18, padding: '13px 16px',
                  display: 'flex', alignItems: 'center', gap: 13,
                  boxShadow: '0 1px 8px rgba(20,20,19,0.04)',
                  border: '0.5px solid rgba(20,20,19,0.06)',
                  opacity: isDeleting ? 0.5 : 1,
                  transition: 'opacity .2s',
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
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#C07070' }}>
                      −{fmt(g.monto)}
                    </div>
                    <button
                      onClick={() => handleDelete(g.id)}
                      disabled={isDeleting}
                      style={{
                        width: 30, height: 30, borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: 'rgba(192,112,112,0.10)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="#C07070" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {sheetOpen && (
        <AddGastoSheet onClose={() => setSheetOpen(false)} onSaved={(g) => {
          setGastos((prev) => [g, ...prev])
          setSheetOpen(false)
        }} />
      )}
    </div>
  )
}

function AddGastoSheet({ onClose, onSaved }: { onClose: () => void; onSaved: (g: GastoGeneral) => void }) {
  const [desc, setDesc] = useState('')
  const [monto, setMonto] = useState('')
  const [cat, setCat] = useState<CatKey>('otro')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!desc || !monto) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('gastos_generales')
      .insert({ descripcion: desc, monto: parseFloat(monto), categoria: cat, fecha, user_id: user?.id })
      .select().single()
    setSaving(false)
    if (!error && data) onSaved(data)
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
              style={{ width: '100%', height: 46, borderRadius: 14, border: '1.5px solid rgba(20,20,19,0.12)', background: 'rgba(255,255,255,0.8)', padding: '0 16px', fontSize: 14, fontFamily: 'var(--font)', color: 'var(--ink)', outline: 'none' }} />
            <input value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="Monto (USD)" type="number"
              style={{ width: '100%', height: 46, borderRadius: 14, border: '1.5px solid rgba(20,20,19,0.12)', background: 'rgba(255,255,255,0.8)', padding: '0 16px', fontSize: 14, fontFamily: 'var(--font)', color: 'var(--ink)', outline: 'none' }} />
            <select value={cat} onChange={(e) => setCat(e.target.value as CatKey)}
              style={{ width: '100%', height: 46, borderRadius: 14, border: '1.5px solid rgba(20,20,19,0.12)', background: 'rgba(255,255,255,0.8)', padding: '0 16px', fontSize: 14, fontFamily: 'var(--font)', color: 'var(--ink)', outline: 'none' }}>
              {(Object.entries(catConfig) as [CatKey, typeof catConfig[CatKey]][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <input value={fecha} onChange={(e) => setFecha(e.target.value)} type="date"
              style={{ width: '100%', height: 46, borderRadius: 14, border: '1.5px solid rgba(20,20,19,0.12)', background: 'rgba(255,255,255,0.8)', padding: '0 16px', fontSize: 14, fontFamily: 'var(--font)', color: 'var(--ink)', outline: 'none' }} />
            <button onClick={handleSave} disabled={saving || !desc || !monto}
              style={{
                width: '100%', height: 50, borderRadius: 999, border: 'none', cursor: 'pointer',
                background: saving || !desc || !monto ? 'rgba(20,20,19,0.15)' : 'var(--ink)',
                color: saving || !desc || !monto ? 'var(--muted)' : '#F3F0EE',
                fontSize: 15, fontWeight: 700, fontFamily: 'var(--font)',
              }}>
              {saving ? 'Guardando…' : 'Guardar gasto'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
