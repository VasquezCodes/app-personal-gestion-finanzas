import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Home, Zap, Megaphone, User, MoreHorizontal,
  Wrench, Clock, Plus, ChevronLeft, ChevronRight, X, Trash2,
} from 'lucide-react'
import { RadialBarChart, RadialBar, PolarGrid, PolarRadiusAxis, Label, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'
import type { GastoGeneral } from '../../types'

type CatKey = 'alquiler' | 'servicios' | 'marketing' | 'personal' | 'otro'

interface RepDetalle {
  id: string
  descripcion: string
  costo: number
  fecha: string
  vehiculos: { marca: string; modelo: string } | null
}

const catConfig: Record<CatKey, { label: string; color: string; bg: string }> = {
  alquiler:  { label: 'Alquiler',  color: '#7A96B8', bg: 'rgba(122,150,184,0.12)' },
  servicios: { label: 'Servicios', color: '#7AAB8E', bg: 'rgba(122,171,142,0.12)' },
  marketing: { label: 'Marketing', color: '#B89870', bg: 'rgba(184,152,112,0.12)' },
  personal:  { label: 'Personal',  color: '#A88AB8', bg: 'rgba(168,138,184,0.12)' },
  otro:      { label: 'Otro',      color: '#9A9590', bg: 'rgba(154,149,144,0.12)' },
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const fmtUSD = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const catIcons: Record<CatKey, React.ReactNode> = {
  alquiler:  <Home       size={18} strokeWidth={1.8} />,
  servicios: <Zap        size={18} strokeWidth={1.8} />,
  marketing: <Megaphone  size={18} strokeWidth={1.8} />,
  personal:  <User       size={18} strokeWidth={1.8} />,
  otro:      <MoreHorizontal size={18} strokeWidth={1.8} />,
}

function RadialDistribution({ data, centerLabel, centerSub }: {
  data: { name: string; value: number; fill: string }[]
  centerLabel: string
  centerSub: string
}) {
  return (
    <div style={{ width: 240, height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={data}
          startAngle={90}
          endAngle={-270}
          innerRadius={58}
          outerRadius={108}
          cx="50%"
          cy="50%"
        >
          <PolarGrid gridType="circle" radialLines={false} stroke="none" />
          <RadialBar dataKey="value" cornerRadius={6} background={{ fill: 'rgba(20,20,19,0.05)' }} />
          <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
            <Label
              content={({ viewBox }) => {
                if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy ?? 0) - 11}
                        style={{ fontSize: 14, fontWeight: 900, fill: '#C07070', fontFamily: 'var(--font)' }}
                      >
                        {centerLabel}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy ?? 0) + 10}
                        style={{ fontSize: 10, fill: '#9A9590', fontWeight: 500 }}
                      >
                        {centerSub}
                      </tspan>
                    </text>
                  )
                }
              }}
            />
          </PolarRadiusAxis>
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function Gastos() {
  const navigate = useNavigate()
  const [gastos, setGastos] = useState<GastoGeneral[]>([])
  const [repsData, setRepsData] = useState<RepDetalle[]>([])
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [editingGasto, setEditingGasto] = useState<GastoGeneral | null>(null)
  const [vista, setVista] = useState<'mes' | 'anio'>('mes')
  const [mesIdx, setMesIdx] = useState(() => new Date().getMonth())
  const [anioNav, setAnioNav] = useState(() => new Date().getFullYear())

  useEffect(() => {
    setLoading(true)
    Promise.all([
      supabase.from('gastos_generales').select('*').order('fecha', { ascending: false }),
      supabase.from('reparaciones').select('id, descripcion, costo, fecha, vehiculos(marca, modelo)').order('fecha', { ascending: false }),
    ]).then(([gRes, rRes]) => {
      setGastos(gRes.data ?? [])
      setRepsData((rRes.data ?? []) as unknown as RepDetalle[])
      setLoading(false)
    })
  }, [])

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()
  const atCurrentMonth = vista === 'mes' && anioNav === currentYear && mesIdx === currentMonth
  const atCurrentYear  = vista === 'anio' && anioNav === currentYear

  const prevNav = () => {
    if (vista === 'mes') {
      if (mesIdx === 0) { setMesIdx(11); setAnioNav(a => a - 1) }
      else setMesIdx(m => m - 1)
    } else {
      setAnioNav(a => a - 1)
    }
  }
  const nextNav = () => {
    if (atCurrentMonth || atCurrentYear) return
    if (vista === 'mes') {
      if (mesIdx === 11) { setMesIdx(0); setAnioNav(a => a + 1) }
      else setMesIdx(m => m + 1)
    } else {
      setAnioNav(a => Math.min(a + 1, currentYear))
    }
  }

  const navLabel = vista === 'mes' ? `${MESES[mesIdx]} ${anioNav}` : String(anioNav)
  const mesKey = `${anioNav}-${String(mesIdx + 1).padStart(2, '0')}`

  const gastosVista = gastos.filter((g) =>
    vista === 'mes' ? g.fecha.startsWith(mesKey) : g.fecha.startsWith(String(anioNav))
  )
  const repsVista = repsData.filter((r) =>
    vista === 'mes' ? r.fecha?.startsWith(mesKey) : r.fecha?.startsWith(String(anioNav))
  )
  const repTotalVista = repsVista.reduce((a, r) => a + r.costo, 0)
  const gastosTotalVista = gastosVista.reduce((a, g) => a + g.monto, 0)
  const grandTotal = gastosTotalVista + repTotalVista

  const catTotals = [
    ...(Object.entries(catConfig) as [CatKey, typeof catConfig[CatKey]][])
      .map(([k, v]) => {
        const total = gastosVista.filter((g) => g.categoria === k).reduce((a, g) => a + g.monto, 0)
        return { ...v, key: k, total, pct: grandTotal > 0 ? Math.round(total / grandTotal * 100) : 0 }
      })
      .filter((c) => c.total > 0),
    ...(repTotalVista > 0 ? [{
      key: 'reparaciones',
      label: 'Reparaciones',
      color: '#C07070',
      bg: 'rgba(192,112,112,0.12)',
      total: repTotalVista,
      pct: grandTotal > 0 ? Math.round(repTotalVista / grandTotal * 100) : 0,
    }] : []),
  ].sort((a, b) => b.total - a.total)

  const displayTotal = grandTotal > 0 ? `−${fmtUSD(grandTotal)}` : fmtUSD(0)
  const centerSub = vista === 'mes' ? `${MESES[mesIdx].slice(0, 3)} ${anioNav}` : String(anioNav)

  return (
    <div style={{ height: '100svh', position: 'relative', overflow: 'hidden' }}>
      <div className="scrollable" style={{
        height: '100%',
        background: '#F7F5F2',
        paddingBottom: 120,
      }}>
        {/* Header */}
        <div style={{ padding: 'calc(env(safe-area-inset-top) + 16px) 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Gastos
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => navigate('/gastos/historial')} style={{
                width: 36, height: 36, borderRadius: 12, background: 'rgba(20,20,19,0.07)',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Clock size={15} color="var(--ink2)" strokeWidth={1.8} />
              </button>
              <button onClick={() => setSheetOpen(true)} style={{
                width: 36, height: 36, borderRadius: 12, background: 'var(--ink)',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(20,20,19,0.18)',
              }}>
                <Plus size={15} color="#F3F0EE" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Hero total */}
          <div style={{
            background: '#1E2B38',
            borderRadius: 28, padding: '20px 22px 22px',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Decorative circle */}
            <div style={{
              position: 'absolute', right: -32, top: -32,
              width: 140, height: 140, borderRadius: '50%',
              background: 'rgba(192,112,112,0.10)',
              pointerEvents: 'none',
            }} />

            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(243,240,238,0.4)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
              Total gastado · {navLabel}
            </div>

            <div style={{ fontSize: 48, fontWeight: 900, color: '#C07070', letterSpacing: '-2px', lineHeight: 1, marginBottom: 8 }}>
              {loading ? '—' : displayTotal}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 12, color: 'rgba(243,240,238,0.4)', fontWeight: 500 }}>
                {loading ? '···' : `${catTotals.length} ${catTotals.length === 1 ? 'categoría' : 'categorías'}`}
              </div>
              {!loading && grandTotal > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'rgba(192,112,112,0.18)', borderRadius: 999,
                  padding: '3px 10px',
                }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#C07070' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#C07070' }}>
                    {catTotals[0]?.label} · {catTotals[0]?.pct}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Radial chart */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
          {loading ? (
            <div style={{ width: 260, height: 260, borderRadius: '50%', background: 'rgba(20,20,19,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ) : catTotals.length === 0 ? (
            <div style={{ width: 260, height: 260, borderRadius: '50%', background: 'rgba(20,20,19,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Sin gastos</span>
            </div>
          ) : (
            <RadialDistribution
              data={catTotals.map((c) => ({ name: c.label, value: c.total, fill: c.color }))}
              centerLabel={displayTotal}
              centerSub={centerSub}
            />
          )}
        </div>

        {/* Vista toggle + navigator */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 20 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {([{ id: 'mes', label: 'Mes' }, { id: 'anio', label: 'Año' }] as { id: 'mes'|'anio'; label: string }[]).map((v) => (
              <button key={v.id} onClick={() => setVista(v.id)} style={{
                padding: '8px 22px', borderRadius: 999, border: 'none', cursor: 'pointer',
                background: vista === v.id ? 'var(--ink)' : 'rgba(20,20,19,0.07)',
                color: vista === v.id ? '#F3F0EE' : 'var(--ink2)',
                fontSize: 13, fontWeight: 700, fontFamily: 'var(--font)', transition: 'all .15s',
              }}>{v.label}</button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <button onClick={prevNav} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
              <ChevronLeft size={16} color="rgba(20,20,19,0.35)" strokeWidth={1.8} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink2)', minWidth: 140, textAlign: 'center' }}>
              {navLabel}
            </span>
            <button onClick={nextNav} disabled={atCurrentMonth || atCurrentYear}
              style={{ background: 'none', border: 'none', padding: 8, cursor: atCurrentMonth || atCurrentYear ? 'default' : 'pointer', opacity: atCurrentMonth || atCurrentYear ? 0.25 : 1 }}>
              <ChevronRight size={16} color="rgba(20,20,19,0.35)" strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* Category cards */}
        <div style={{ padding: '18px 16px 0', display: 'flex', flexDirection: 'column', gap: 9 }}>
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} style={{ height: 70, borderRadius: 18, background: 'rgba(20,20,19,0.07)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))
          ) : catTotals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 14 }}>
              Sin gastos ni reparaciones en {navLabel}
            </div>
          ) : (
            catTotals.map((c) => (
              <button
                key={c.key}
                onClick={() => setSelectedCat(c.key)}
                style={{
                  width: '100%', background: '#fff', borderRadius: 18, padding: '13px 16px',
                  display: 'flex', alignItems: 'center', gap: 14,
                  boxShadow: '0 1px 8px rgba(20,20,19,0.05)',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  transition: 'transform .12s, box-shadow .12s',
                }}
                onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
                onPointerUp={(e) => (e.currentTarget.style.transform = '')}
                onPointerLeave={(e) => (e.currentTarget.style.transform = '')}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 15, flexShrink: 0,
                  background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: c.color,
                }}>
                  {c.key === 'reparaciones' ? <Wrench size={18} strokeWidth={1.8} /> : catIcons[c.key as CatKey]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{c.label}</div>
                  <div style={{ fontSize: 12, color: '#C07070', marginTop: 2 }}>−{fmtUSD(c.total)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.3px' }}>{c.pct}%</span>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color }} />
                  <ChevronRight size={14} color="rgba(20,20,19,0.25)" strokeWidth={1.8} />
                </div>
              </button>
            ))
          )}
        </div>

      </div>

      {sheetOpen && (
        <AddGastoSheet onClose={() => setSheetOpen(false)} onSaved={(g) => {
          setGastos((prev) => [g, ...prev])
          setSheetOpen(false)
        }} />
      )}

      {editingGasto && (
        <EditGastoSheet
          gasto={editingGasto}
          onClose={() => setEditingGasto(null)}
          onSaved={(updated) => {
            setGastos((prev) => prev.map((g) => g.id === updated.id ? updated : g))
            setEditingGasto(null)
          }}
          onDeleted={(id) => {
            setGastos((prev) => prev.filter((g) => g.id !== id))
            setEditingGasto(null)
          }}
        />
      )}

      {selectedCat && (() => {
        const cat = catTotals.find(c => c.key === selectedCat)
        if (!cat) return null
        const isRep = selectedCat === 'reparaciones'
        const items = isRep
          ? repsVista
          : gastosVista.filter(g => g.categoria === selectedCat)
        const fmtFecha = (f: string) =>
          new Date(f + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })

        return (
          <>
            {/* Backdrop */}
            <div
              onClick={() => setSelectedCat(null)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(20,20,19,0.45)', backdropFilter: 'blur(6px)', zIndex: 80 }}
            />

            {/* Sheet */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 90,
              background: '#F7F5F2', borderRadius: '28px 28px 0 0',
              maxHeight: '75vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 -8px 40px rgba(20,20,19,0.2)',
              animation: 'slideUp .32s cubic-bezier(.2,.8,.3,1)',
            }}>
              <style>{`@keyframes slideUp { from { transform:translateY(100%) } to { transform:translateY(0) } }`}</style>

              {/* Drag handle */}
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 8 }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(20,20,19,0.18)' }} />
              </div>

              {/* Colored header */}
              <div style={{
                margin: '0 16px 16px', borderRadius: 22, padding: '18px 20px',
                background: cat.color, position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', right: -20, top: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', pointerEvents: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    {isRep ? <Wrench size={18} strokeWidth={1.8} /> : catIcons[selectedCat as CatKey]}
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.4px' }}>{cat.label}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{navLabel}</div>
                  </div>
                  <button onClick={() => setSelectedCat(null)} style={{
                    marginLeft: 'auto', width: 32, height: 32, borderRadius: 10,
                    background: 'rgba(255,255,255,0.18)', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                  }}>
                    <X size={14} strokeWidth={2} color="#fff" />
                  </button>
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: '-1.5px', lineHeight: 1 }}>
                  {fmtUSD(cat.total)}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>
                  {items.length} {items.length === 1 ? 'registro' : 'registros'}
                </div>
              </div>

              {/* Items list */}
              <div className="scrollable" style={{ flex: 1, overflowY: 'auto', padding: '0 16px 40px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 14 }}>
                    Sin registros en {navLabel}
                  </div>
                ) : isRep ? (
                  (items as RepDetalle[]).map((r) => (
                    <div key={r.id} style={{
                      background: '#fff', borderRadius: 16, padding: '12px 16px',
                      display: 'flex', alignItems: 'center', gap: 12,
                      boxShadow: '0 1px 6px rgba(20,20,19,0.05)',
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {r.descripcion || 'Reparación'}
                        </div>
                        {r.vehiculos && (
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                            {r.vehiculos.marca} {r.vehiculos.modelo}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: cat.color }}>
                          -{fmtUSD(r.costo)}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{fmtFecha(r.fecha)}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  (items as GastoGeneral[]).map((g) => (
                    <button key={g.id} onClick={() => setEditingGasto(g)} style={{
                      width: '100%', background: '#fff', borderRadius: 16, padding: '12px 16px',
                      display: 'flex', alignItems: 'center', gap: 12,
                      boxShadow: '0 1px 6px rgba(20,20,19,0.05)',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {g.descripcion}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{fmtFecha(g.fecha)}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: cat.color }}>
                          -{fmtUSD(g.monto)}
                        </div>
                        <ChevronRight size={13} color="rgba(20,20,19,0.2)" strokeWidth={2} />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )
      })()}
    </div>
  )
}

function EditGastoSheet({ gasto, onClose, onSaved, onDeleted }: {
  gasto: GastoGeneral
  onClose: () => void
  onSaved: (g: GastoGeneral) => void
  onDeleted: (id: string) => void
}) {
  const [desc, setDesc] = useState(gasto.descripcion)
  const [monto, setMonto] = useState(String(gasto.monto))
  const [cat, setCat] = useState<CatKey>(gasto.categoria as CatKey)
  const [fecha, setFecha] = useState(gasto.fecha)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)

  async function handleSave() {
    if (!desc || !monto) return
    setSaving(true)
    const { data, error } = await supabase
      .from('gastos_generales')
      .update({ descripcion: desc, monto: parseFloat(monto), categoria: cat, fecha })
      .eq('id', gasto.id)
      .select().single()
    setSaving(false)
    if (!error && data) onSaved(data)
  }

  async function handleDelete() {
    if (!confirming) { setConfirming(true); return }
    setSaving(true)
    await supabase.from('gastos_generales').delete().eq('id', gasto.id)
    onDeleted(gasto.id)
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(20,20,19,0.4)', backdropFilter: 'blur(4px)', zIndex: 100 }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'var(--cream)', borderRadius: '28px 28px 0 0',
        zIndex: 110, paddingBottom: 34,
        boxShadow: '0 -8px 40px rgba(20,20,19,0.18)',
        animation: 'slideUp .3s cubic-bezier(.2,.8,.3,1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(20,20,19,0.18)' }} />
        </div>
        <div style={{ padding: '12px 22px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.5px' }}>Editar gasto</div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(20,20,19,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={15} color="var(--ink)" strokeWidth={2} />
            </button>
          </div>
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
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button onClick={handleDelete} disabled={saving}
              style={{
                width: '100%', height: 46, borderRadius: 999, border: 'none', cursor: 'pointer',
                background: confirming ? 'rgba(192,112,112,0.15)' : 'transparent',
                color: 'var(--red)',
                fontSize: 14, fontWeight: 700, fontFamily: 'var(--font)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                transition: 'background .15s',
              }}>
              <Trash2 size={15} strokeWidth={2} />
              {confirming ? 'Tocá de nuevo para confirmar' : 'Eliminar gasto'}
            </button>
          </div>
        </div>
      </div>
    </>
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
