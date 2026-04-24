import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { BackHeader } from '../../components/ios/BackHeader'
import type { CategoriaReparacion } from '../../types'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const tipoConfig: Record<CategoriaReparacion, { label: string; color: string; bg: string }> = {
  mecanica:     { label: 'Mecánica',          color: '#7A96B8', bg: 'rgba(122,150,184,0.12)' },
  carroceria:   { label: 'Carrocería/Pintura', color: '#B89870', bg: 'rgba(184,152,112,0.12)' },
  electricidad: { label: 'Eléctrica',          color: '#E8D97A', bg: 'rgba(232,217,122,0.12)' },
  interior:     { label: 'Interior',           color: '#A88AB8', bg: 'rgba(168,138,184,0.12)' },
  neumaticos:   { label: 'Gomas',              color: '#7AAB8E', bg: 'rgba(122,171,142,0.12)' },
  otro:         { label: 'Otros',              color: '#9A9590', bg: 'rgba(154,149,144,0.12)' },
}

interface RepRow {
  id: string
  descripcion: string
  costo: number
  fecha: string
  vehiculo_id: string
  categoria: CategoriaReparacion
  vehiculos: { marca: string } | null
}

type Vista = 'tipo' | 'marca'

export default function ReparacionesGastos() {
  const [reps, setReps] = useState<RepRow[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<Vista>('tipo')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('reparaciones')
      .select('id, descripcion, costo, fecha, vehiculo_id, categoria, vehiculos(marca)')
      .order('fecha', { ascending: false })
      .then(({ data }) => {
        setReps((data as unknown as RepRow[]) ?? [])
        setLoading(false)
      })
  }, [])

  const totalGeneral = reps.reduce((s, r) => s + r.costo, 0)

  const porTipo = useMemo(() => {
    const map = new Map<CategoriaReparacion, RepRow[]>()
    reps.forEach((r) => {
      if (!map.has(r.categoria)) map.set(r.categoria, [])
      map.get(r.categoria)!.push(r)
    })
    return Array.from(map.entries())
      .map(([cat, items]) => ({
        cat,
        ...tipoConfig[cat],
        total: items.reduce((s, r) => s + r.costo, 0),
        items,
        breakdown: buildMarcaBreakdown(items),
      }))
      .sort((a, b) => b.total - a.total)
  }, [reps])

  const porMarca = useMemo(() => {
    const map = new Map<string, RepRow[]>()
    reps.forEach((r) => {
      const marca = r.vehiculos?.marca ?? 'Sin marca'
      if (!map.has(marca)) map.set(marca, [])
      map.get(marca)!.push(r)
    })
    return Array.from(map.entries())
      .map(([marca, items]) => ({
        marca,
        total: items.reduce((s, r) => s + r.costo, 0),
        items,
        breakdown: buildTipoBreakdown(items),
      }))
      .sort((a, b) => b.total - a.total)
  }, [reps])

  const maxTipo = Math.max(...porTipo.map((t) => t.total), 1)
  const maxMarca = Math.max(...porMarca.map((m) => m.total), 1)

  return (
    <div style={{ height: '100svh', position: 'relative', overflow: 'hidden' }}>
      <div className="scrollable" style={{
        height: '100%',
        background: 'radial-gradient(ellipse 120% 60% at 60% 0%, #EDE8E0 0%, #F3F0EE 55%, #F7F4F0 100%)',
        paddingBottom: 40,
      }}>
        <BackHeader title="Reparaciones" />

        {/* Hero */}
        <div style={{ padding: '0 22px 0' }}>
          <div style={{
            background: 'var(--surface-deep)', borderRadius: 28,
            padding: '20px 20px', boxShadow: '0 4px 24px rgba(20,20,19,0.14)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(243,240,238,0.4)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>
              Total invertido en reparaciones
            </div>
            <div style={{ fontSize: 42, fontWeight: 900, color: '#F3F0EE', letterSpacing: '-2px', lineHeight: 1 }}>
              {loading ? '—' : fmt(totalGeneral)}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(243,240,238,0.4)', marginTop: 6 }}>
              {reps.length} reparaciones registradas
            </div>
            {!loading && porTipo.length > 0 && (
              <div style={{ marginTop: 14, display: 'flex', gap: 3, alignItems: 'flex-end', height: 24 }}>
                {porTipo.map((t) => (
                  <div key={t.cat} style={{
                    flex: t.total, height: Math.max(6, Math.round((t.total / totalGeneral) * 24)),
                    borderRadius: 3, background: t.color, opacity: 0.7,
                  }} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Toggle */}
        <div style={{ padding: '14px 22px 0', display: 'flex', gap: 8 }}>
          {(['tipo', 'marca'] as Vista[]).map((v) => (
            <button key={v} onClick={() => { setVista(v); setExpanded(null) }} style={{
              padding: '8px 20px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: vista === v ? 'var(--ink)' : 'rgba(20,20,19,0.07)',
              color: vista === v ? '#F3F0EE' : 'var(--ink2)',
              fontSize: 13, fontWeight: 700, fontFamily: 'var(--font)',
            }}>
              {v === 'tipo' ? 'Por tipo' : 'Por marca'}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ padding: '12px 22px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} style={{ height: 64, borderRadius: 18, background: 'rgba(20,20,19,0.07)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))
          ) : vista === 'tipo' ? (
            porTipo.map((t) => (
              <TipoRow
                key={t.cat}
                label={t.label}
                color={t.color}
                bg={t.bg}
                total={t.total}
                pct={Math.round((t.total / maxTipo) * 100)}
                breakdown={t.breakdown}
                isOpen={expanded === t.cat}
                onToggle={() => setExpanded(expanded === t.cat ? null : t.cat)}
              />
            ))
          ) : (
            porMarca.map((m) => (
              <MarcaRow
                key={m.marca}
                marca={m.marca}
                total={m.total}
                pct={Math.round((m.total / maxMarca) * 100)}
                breakdown={m.breakdown}
                isOpen={expanded === m.marca}
                onToggle={() => setExpanded(expanded === m.marca ? null : m.marca)}
              />
            ))
          )}
          {!loading && reps.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
              Sin reparaciones registradas
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function buildMarcaBreakdown(items: RepRow[]) {
  const map = new Map<string, number>()
  items.forEach((r) => {
    const marca = r.vehiculos?.marca ?? 'Sin marca'
    map.set(marca, (map.get(marca) ?? 0) + r.costo)
  })
  return Array.from(map.entries())
    .map(([marca, total]) => ({ label: marca, total }))
    .sort((a, b) => b.total - a.total)
}

function buildTipoBreakdown(items: RepRow[]) {
  const map = new Map<CategoriaReparacion, number>()
  items.forEach((r) => { map.set(r.categoria, (map.get(r.categoria) ?? 0) + r.costo) })
  return Array.from(map.entries())
    .map(([cat, total]) => ({ label: tipoConfig[cat].label, total, color: tipoConfig[cat].color }))
    .sort((a, b) => b.total - a.total)
}

function TipoRow({ label, color, bg, total, pct, breakdown, isOpen, onToggle }: {
  label: string; color: string; bg: string; total: number; pct: number
  breakdown: { label: string; total: number }[]
  isOpen: boolean; onToggle: () => void
}) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.82)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 8px rgba(20,20,19,0.04)', border: '0.5px solid rgba(20,20,19,0.06)' }}>
      <button onClick={onToggle} style={{
        width: '100%', background: 'none', border: 'none', cursor: 'pointer',
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
        </div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{label}</div>
          <div style={{ height: 4, background: 'rgba(20,20,19,0.06)', borderRadius: 999, marginTop: 5, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999 }} />
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>{fmt(total)}</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{pct}%</div>
        </div>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s', opacity: 0.4, flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {isOpen && breakdown.length > 0 && (
        <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ height: 1, background: 'rgba(20,20,19,0.06)', marginBottom: 4 }} />
          {breakdown.map((b) => (
            <div key={b.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--ink2)', fontWeight: 600 }}>{b.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{fmt(b.total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MarcaRow({ marca, total, pct, breakdown, isOpen, onToggle }: {
  marca: string; total: number; pct: number
  breakdown: { label: string; total: number; color: string }[]
  isOpen: boolean; onToggle: () => void
}) {
  const initial = marca.slice(0, 2).toUpperCase()
  return (
    <div style={{ background: 'rgba(255,255,255,0.82)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 8px rgba(20,20,19,0.04)', border: '0.5px solid rgba(20,20,19,0.06)' }}>
      <button onClick={onToggle} style={{
        width: '100%', background: 'none', border: 'none', cursor: 'pointer',
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(20,20,19,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 800, color: 'var(--ink)' }}>
          {initial}
        </div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{marca}</div>
          <div style={{ height: 4, background: 'rgba(20,20,19,0.06)', borderRadius: 999, marginTop: 5, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--ink)', opacity: 0.4, borderRadius: 999 }} />
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>{fmt(total)}</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{pct}%</div>
        </div>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s', opacity: 0.4, flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {isOpen && breakdown.length > 0 && (
        <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ height: 1, background: 'rgba(20,20,19,0.06)', marginBottom: 4 }} />
          {breakdown.map((b) => (
            <div key={b.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: b.color }} />
                <span style={{ fontSize: 12, color: 'var(--ink2)', fontWeight: 600 }}>{b.label}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{fmt(b.total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
