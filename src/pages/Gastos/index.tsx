import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { RadialBarChart, RadialBar, PolarGrid, PolarRadiusAxis, Label, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'
import type { GastoGeneral } from '../../types'

type CatKey = 'alquiler' | 'servicios' | 'marketing' | 'personal' | 'otro'

const catConfig: Record<CatKey, { label: string; color: string; bg: string }> = {
  alquiler:  { label: 'Alquiler',  color: '#7A96B8', bg: 'rgba(122,150,184,0.12)' },
  servicios: { label: 'Servicios', color: '#7AAB8E', bg: 'rgba(122,171,142,0.12)' },
  marketing: { label: 'Marketing', color: '#B89870', bg: 'rgba(184,152,112,0.12)' },
  personal:  { label: 'Personal',  color: '#A88AB8', bg: 'rgba(168,138,184,0.12)' },
  otro:      { label: 'Otro',      color: '#9A9590', bg: 'rgba(154,149,144,0.12)' },
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const USD_RATE = 1050

const fmtUSD = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const fmtARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

const catIcons: Record<CatKey, React.ReactNode> = {
  alquiler: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V10.5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  servicios: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  marketing: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
      <path d="M3 11h3v6H3zM18 4v16l-9-3.5V7.5L18 4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  personal: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  otro: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
      <circle cx="5" cy="12" r="1.5" fill="currentColor"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
      <circle cx="19" cy="12" r="1.5" fill="currentColor"/>
    </svg>
  ),
}

function RadialDistribution({ data, centerLabel, centerSub }: {
  data: { name: string; value: number; fill: string }[]
  centerLabel: string
  centerSub: string
}) {
  return (
    <div style={{ width: 260, height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={data}
          startAngle={90}
          endAngle={-270}
          innerRadius={55}
          outerRadius={115}
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
                        y={(viewBox.cy ?? 0) - 10}
                        style={{ fontSize: 15, fontWeight: 900, fill: '#141413', fontFamily: 'var(--font)' }}
                      >
                        {centerLabel}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy ?? 0) + 12}
                        style={{ fontSize: 11, fill: '#9A9590', fontWeight: 500 }}
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
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [moneda, setMoneda] = useState<'pesos' | 'dolares'>('dolares')

  const now = new Date()
  const [mesIdx, setMesIdx] = useState(now.getMonth())
  const [anio] = useState(now.getFullYear())

  useEffect(() => {
    setLoading(true)
    supabase.from('gastos_generales').select('*').order('fecha', { ascending: false })
      .then(({ data }) => { setGastos(data ?? []); setLoading(false) })
  }, [])

  const mesKey = `${anio}-${String(mesIdx + 1).padStart(2, '0')}`
  const gastosMes = gastos.filter((g) => g.fecha.startsWith(mesKey))
  const totalMes = gastosMes.reduce((a, g) => a + g.monto, 0)

  const catTotals = (Object.entries(catConfig) as [CatKey, typeof catConfig[CatKey]][])
    .map(([k, v]) => ({
      ...v, key: k,
      total: gastosMes.filter((g) => g.categoria === k).reduce((a, g) => a + g.monto, 0),
      pct: totalMes > 0
        ? Math.round(gastosMes.filter((g) => g.categoria === k).reduce((a, g) => a + g.monto, 0) / totalMes * 100)
        : 0,
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)

  const formatMonto = (n: number) =>
    moneda === 'dolares' ? fmtUSD(n) : fmtARS(n * USD_RATE)

  const displayTotal = moneda === 'dolares' ? fmtUSD(totalMes) : fmtARS(totalMes * USD_RATE)

  return (
    <div style={{ height: '100svh', position: 'relative', overflow: 'hidden' }}>
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
            <button onClick={() => navigate('/gastos/historial')} style={{
              width: 38, height: 38, borderRadius: 12, background: 'rgba(20,20,19,0.07)',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                <path d="M12 8v4l3 3" stroke="var(--ink2)" strokeWidth="1.8" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="9" stroke="var(--ink2)" strokeWidth="1.8"/>
              </svg>
            </button>
            <button onClick={() => setSheetOpen(true)} style={{
              width: 38, height: 38, borderRadius: 12, background: 'var(--ink)',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(20,20,19,0.18)',
            }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" stroke="#F3F0EE" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Radial chart */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
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
              centerSub={`${MESES[mesIdx].slice(0, 3)} ${anio}`}
            />
          )}
        </div>

        {/* Month navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: 20 }}>
          <button onClick={() => setMesIdx((m) => Math.max(0, m - 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
            <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
              <path d="M7 1L1 6.5l6 5.5" stroke="rgba(20,20,19,0.35)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink2)', minWidth: 140, textAlign: 'center' }}>
            {MESES[mesIdx]} {anio}
          </span>
          <button onClick={() => setMesIdx((m) => Math.min(11, m + 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
            <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
              <path d="M1 1l6 5.5L1 12" stroke="rgba(20,20,19,0.35)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Currency toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 }}>
          {([{ id: 'dolares', label: 'Dólares' }, { id: 'pesos', label: 'Pesos' }] as { id: 'pesos' | 'dolares'; label: string }[]).map((m) => (
            <button key={m.id} onClick={() => setMoneda(m.id)} style={{
              padding: '8px 22px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: moneda === m.id ? 'var(--ink)' : 'rgba(20,20,19,0.07)',
              color: moneda === m.id ? '#F3F0EE' : 'var(--ink2)',
              fontSize: 13, fontWeight: 700, fontFamily: 'var(--font)', transition: 'all .15s',
            }}>{m.label}</button>
          ))}
        </div>

        {/* Category cards */}
        <div style={{ padding: '18px 16px 0', display: 'flex', flexDirection: 'column', gap: 9 }}>
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} style={{ height: 70, borderRadius: 18, background: 'rgba(20,20,19,0.07)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))
          ) : catTotals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 14 }}>
              Sin gastos registrados en {MESES[mesIdx]}
            </div>
          ) : (
            catTotals.map((c) => (
              <div key={c.key} style={{
                background: '#fff', borderRadius: 18, padding: '13px 16px',
                display: 'flex', alignItems: 'center', gap: 14,
                boxShadow: '0 1px 8px rgba(20,20,19,0.05)',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 15, flexShrink: 0,
                  background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: c.color,
                }}>
                  {catIcons[c.key as CatKey]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{c.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{formatMonto(c.total)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.3px' }}>{c.pct}%</span>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color }} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick actions */}
        <div style={{ padding: '14px 16px 0', display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/gastos/reparaciones')} style={{
            flex: 1, height: 46, borderRadius: 16,
            background: '#fff', border: '0.5px solid rgba(20,20,19,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            cursor: 'pointer', fontFamily: 'var(--font)',
            boxShadow: '0 1px 6px rgba(20,20,19,0.04)',
          }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
              <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
                stroke="#B89870" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Reparaciones</span>
          </button>
          <button onClick={() => navigate('/gastos/historial')} style={{
            flex: 1, height: 46, borderRadius: 16,
            background: 'var(--ink)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            cursor: 'pointer', fontFamily: 'var(--font)',
            boxShadow: '0 4px 14px rgba(20,20,19,0.15)',
          }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
              <path d="M3 12h18M3 6h18M3 18h12" stroke="#F3F0EE" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#F3F0EE' }}>Ver historial</span>
          </button>
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
