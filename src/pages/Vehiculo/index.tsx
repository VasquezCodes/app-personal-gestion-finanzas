import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useVehiculosStore } from '../../store/vehiculosStore'
import { supabase } from '../../lib/supabase'
import { BRAND_LOGOS } from '../Inventario/CargarVehiculoSheet'
import type { Reparacion, CategoriaReparacion, EstadoVehiculo } from '../../types'
import { EditReparacionSheet } from '../../components/shared/EditReparacionSheet'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const colorMap: Record<string, { bg: string; text: string }> = {
  vendido:       { bg: 'rgba(122,171,142,0.12)', text: 'var(--green)' },
  en_stock:      { bg: 'rgba(122,150,184,0.12)', text: '#7A96B8' },
  en_reparacion: { bg: 'rgba(184,152,112,0.12)', text: '#B89870' },
  reservado:     { bg: 'rgba(168,138,184,0.12)', text: '#A88AB8' },
}

const catConfig: Record<CategoriaReparacion, { label: string; color: string }> = {
  mecanica:     { label: 'Mecánica',     color: '#B89870' },
  carroceria:   { label: 'Carrocería',   color: '#7A96B8' },
  electricidad: { label: 'Electricidad', color: '#A88AB8' },
  interior:     { label: 'Interior',     color: 'var(--green)' },
  neumaticos:   { label: 'Neumáticos',   color: '#9A9590' },
  otro:         { label: 'Otro',         color: '#9A9590' },
}

const ESTADOS: { key: EstadoVehiculo; label: string }[] = [
  { key: 'en_stock',      label: 'En stock' },
  { key: 'en_reparacion', label: 'Reparación' },
  { key: 'reservado',     label: 'Reservado' },
  { key: 'vendido',       label: 'Vendido' },
]

function Row({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '0.5px solid var(--btn-ghost-bg)' }}>
      <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: bold ? 800 : 600, color: color || 'var(--ink)', letterSpacing: '-0.3px' }}>{value}</span>
    </div>
  )
}

export default function VehiculoDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { vehiculos, actualizarVehiculo, eliminarVehiculo } = useVehiculosStore()
  const vBase = vehiculos.find((v) => v.id === id)

  const [v, setV] = useState(vBase)
  const [reparaciones, setReparaciones] = useState<Reparacion[]>([])
  const [loadingReps, setLoadingReps] = useState(true)
  const [addingRep, setAddingRep] = useState(false)
  const [editingRep, setEditingRep] = useState<Reparacion | null>(null)
  const [cambiandoEstado, setCambiandoEstado] = useState(false)
  const [savingEstado, setSavingEstado] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deletingV, setDeletingV] = useState(false)

  const [precioVenta, setPrecioVenta] = useState('')
  const [fechaVenta, setFechaVenta] = useState(new Date().toISOString().slice(0, 10))

  const [repDesc, setRepDesc] = useState('')
  const [repCosto, setRepCosto] = useState('')
  const [repCat, setRepCat] = useState<CategoriaReparacion>('mecanica')
  const [repFecha, setRepFecha] = useState(new Date().toISOString().slice(0, 10))
  const [repProveedor, setRepProveedor] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (vBase) setV(vBase)
  }, [vBase])

  useEffect(() => {
    if (!id) return
    setLoadingReps(true)
    supabase.from('reparaciones').select('*').eq('vehiculo_id', id).order('fecha', { ascending: false })
      .then(({ data }) => { setReparaciones(data ?? []); setLoadingReps(false) })
  }, [id])

  if (!v) {
    return (
      <div style={{ height: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)' }}>
        <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
          <p style={{ fontSize: 14 }}>Vehículo no encontrado</p>
          <button onClick={() => navigate(-1)} style={{ marginTop: 12, fontSize: 13, color: 'var(--ink)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Volver</button>
        </div>
      </div>
    )
  }

  const totalReparaciones = reparaciones.reduce((s, r) => s + r.costo, 0)
  const costoTotal = v.precio_compra + (v.gastos_adicionales ?? 0) + totalReparaciones
  const ganancia = v.precio_venta ? v.precio_venta - costoTotal : null
  const roi = (v.precio_venta && ganancia != null) ? Math.round((ganancia / costoTotal) * 100) : null
  const c = colorMap[v.estado] ?? colorMap.en_stock
  const estadoLabel = v.estado === 'en_stock' ? 'En stock' : v.estado === 'vendido' ? 'Vendido' : v.estado === 'en_reparacion' ? 'Reparación' : 'Reservado'
  const logo = BRAND_LOGOS[v.marca]

  async function handleCambiarEstado(nuevoEstado: EstadoVehiculo) {
    if (nuevoEstado === v!.estado) { setCambiandoEstado(false); return }
    if (nuevoEstado === 'vendido') { setCambiandoEstado(true); return }
    setSavingEstado(true)
    const campos: Partial<typeof v> = { estado: nuevoEstado }
    if (v!.estado === 'vendido') { campos.precio_venta = undefined; campos.fecha_venta = undefined }
    const err = await actualizarVehiculo(v!.id, campos as never)
    setSavingEstado(false)
    if (!err) setV((prev) => prev ? { ...prev, ...campos } : prev)
  }

  async function handleConfirmarVenta() {
    if (!precioVenta) return
    setSavingEstado(true)
    const campos = { estado: 'vendido' as EstadoVehiculo, precio_venta: parseFloat(precioVenta), fecha_venta: fechaVenta }
    const err = await actualizarVehiculo(v!.id, campos)
    setSavingEstado(false)
    if (!err) { setV((prev) => prev ? { ...prev, ...campos } : prev); setCambiandoEstado(false) }
  }

  async function handleSaveRep() {
    if (!repDesc || !repCosto) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('reparaciones').insert({
      vehiculo_id: v!.id, descripcion: repDesc, costo: parseFloat(repCosto),
      categoria: repCat, fecha: repFecha, proveedor: repProveedor || null, user_id: user?.id,
    }).select().single()
    setSaving(false)
    if (!error && data) {
      setReparaciones((prev) => [data, ...prev])
      setRepDesc(''); setRepCosto(''); setRepProveedor(''); setRepCat('mecanica')
      setRepFecha(new Date().toISOString().slice(0, 10)); setAddingRep(false)
    }
  }

  async function handleEliminar() {
    setDeletingV(true)
    const err = await eliminarVehiculo(v!.id)
    setDeletingV(false)
    if (!err) navigate(-1)
  }

  const inputStyle: React.CSSProperties = {
    height: 42, borderRadius: 12, border: '1.5px solid var(--separator)',
    background: 'var(--bg-input)', padding: '0 14px', fontSize: 14,
    fontFamily: 'var(--font)', color: 'var(--ink)', outline: 'none', width: '100%',
  }

  return (
    <div style={{ height: '100svh', overflow: 'hidden', background: 'var(--bg-gradient)' }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        padding: 'calc(env(safe-area-inset-top) + 4px) 22px 12px',
        background: 'rgba(243,240,238,0.88)', backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '0.5px solid var(--btn-ghost-bg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>Atrás</span>
          </button>

          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.3px' }}>
              {v.marca} {v.modelo}
            </div>
          </div>

          <span style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 999, background: c.bg, color: c.text }}>
            {estadoLabel}
          </span>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="scrollable" style={{ height: 'calc(100svh - 56px)', padding: '16px 20px', paddingBottom: 120 }}>

        {/* Brand hero */}
        {logo && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{
              width: 96, height: 72, borderRadius: 22,
              background: 'var(--bg-card)', boxShadow: '0 2px 16px var(--separator)',
              border: `1.5px solid ${c.text}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '12px 14px',
            }}>
              <img src={logo} alt={v.marca} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'var(--logo-filter)', opacity: 0.85 }} />
            </div>
          </div>
        )}

        {/* Title + meta */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.8px' }}>{v.marca} {v.modelo}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>
            {v.anio}{v.color ? ` · ${v.color}` : ''}{v.kilometraje ? ` · ${v.kilometraje.toLocaleString('es-AR')} km` : ''}
          </div>
        </div>

        {/* Estado pills */}
        <div style={{ display: 'flex', gap: 7, marginBottom: 16, flexWrap: 'wrap' }}>
          {ESTADOS.map((e) => {
            const isActive = v.estado === e.key
            const cm = colorMap[e.key]
            return (
              <button key={e.key} onClick={() => handleCambiarEstado(e.key)} disabled={savingEstado} style={{
                padding: '7px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                background: isActive ? cm.bg : 'var(--separator)',
                color: isActive ? cm.text : 'var(--muted)',
                fontSize: 12, fontWeight: isActive ? 700 : 500, fontFamily: 'var(--font)',
                outline: isActive ? `1.5px solid ${cm.text}` : 'none',
                transition: 'all .15s', opacity: savingEstado ? 0.5 : 1,
              }}>
                {isActive && <span style={{ marginRight: 5 }}>·</span>}
                {e.label}
              </button>
            )
          })}
        </div>

        {/* Venta form */}
        {cambiandoEstado && (
          <div style={{ background: 'rgba(122,171,142,0.08)', borderRadius: 18, padding: 16, marginBottom: 16, border: '1.5px solid rgba(122,171,142,0.25)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', marginBottom: 12 }}>Registrar venta</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input autoFocus value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} placeholder="Precio de venta (USD)" type="number" style={{ ...inputStyle, flex: 2 }} />
                <input value={fechaVenta} onChange={(e) => setFechaVenta(e.target.value)} type="date" style={{ ...inputStyle, flex: 1, fontSize: 13 }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setCambiandoEstado(false)} style={{ flex: 1, height: 42, borderRadius: 999, border: '1.5px solid var(--separator)', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--muted)', fontFamily: 'var(--font)' }}>Cancelar</button>
                <button onClick={handleConfirmarVenta} disabled={savingEstado || !precioVenta} style={{ flex: 2, height: 42, borderRadius: 999, border: 'none', cursor: 'pointer', background: !precioVenta ? 'var(--btn-ghost-bg)' : 'var(--green)', color: !precioVenta ? 'var(--muted)' : '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font)' }}>
                  {savingEstado ? 'Guardando…' : 'Confirmar venta'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Financial summary */}
        <div style={{ background: 'var(--card-glass)', borderRadius: 20, padding: '4px 16px', marginBottom: 16 }}>
          <Row label="Precio de compra" value={fmt(v.precio_compra)} />
          {(v.gastos_adicionales ?? 0) > 0 && <Row label="Gastos adicionales" value={`−${fmt(v.gastos_adicionales!)}`} color="var(--red)" />}
          {totalReparaciones > 0 && <Row label="Reparaciones" value={`−${fmt(totalReparaciones)}`} color="var(--red)" />}
          <Row label="Costo total" value={fmt(costoTotal)} bold />
          {v.precio_venta && <Row label="Precio de venta" value={fmt(v.precio_venta)} />}
          {ganancia != null && <Row label="Ganancia neta" value={ganancia >= 0 ? `+${fmt(ganancia)}` : fmt(ganancia)} color={ganancia >= 0 ? 'var(--green)' : 'var(--red)'} bold />}
          {roi != null && <Row label="ROI" value={`${roi}%`} color="#7A96B8" />}
        </div>

        {/* Gastos del vehículo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Gastos del vehículo</div>
          <button onClick={() => setAddingRep((s) => !s)} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: addingRep ? 'var(--btn-ghost-bg)' : 'var(--ink)',
            border: 'none', cursor: 'pointer', padding: '5px 12px', borderRadius: 999,
          }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
              <path d={addingRep ? 'M18 6L6 18M6 6l12 12' : 'M12 5v14M5 12h14'} stroke={addingRep ? 'var(--ink)' : 'var(--bg)'} strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: 11, fontWeight: 700, color: addingRep ? 'var(--ink)' : 'var(--bg)', fontFamily: 'var(--font)' }}>
              {addingRep ? 'Cancelar' : 'Agregar gasto'}
            </span>
          </button>
        </div>

        {/* Add rep form */}
        {addingRep && (
          <div style={{ background: 'var(--bg-input)', borderRadius: 20, padding: 16, marginBottom: 12, boxShadow: '0 2px 16px var(--btn-ghost-bg)', border: '1px solid var(--btn-ghost-bg)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input autoFocus value={repDesc} onChange={(e) => setRepDesc(e.target.value)} placeholder="Descripción (ej: Cambio de aceite)" style={inputStyle} />
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={repCosto} onChange={(e) => setRepCosto(e.target.value)} placeholder="Costo (USD)" type="number" style={{ ...inputStyle, flex: 1 }} />
                <input value={repFecha} onChange={(e) => setRepFecha(e.target.value)} type="date" style={{ ...inputStyle, flex: 1, fontSize: 13 }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={repCat} onChange={(e) => setRepCat(e.target.value as CategoriaReparacion)} style={{ ...inputStyle, flex: 1 }}>
                  {(Object.entries(catConfig) as [CategoriaReparacion, { label: string }][]).map(([k, cfg]) => (
                    <option key={k} value={k}>{cfg.label}</option>
                  ))}
                </select>
                <input value={repProveedor} onChange={(e) => setRepProveedor(e.target.value)} placeholder="Proveedor (opcional)" style={{ ...inputStyle, flex: 1 }} />
              </div>
              <motion.button onClick={handleSaveRep} disabled={saving || !repDesc || !repCosto} whileTap={{ scale: 0.97 }}
                style={{ width: '100%', height: 46, borderRadius: 999, border: 'none', cursor: 'pointer', background: (saving || !repDesc || !repCosto) ? 'var(--separator)' : 'var(--ink)', color: (saving || !repDesc || !repCosto) ? 'var(--muted)' : 'var(--bg)', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font)' }}>
                {saving ? 'Guardando…' : 'Confirmar gasto'}
              </motion.button>
            </div>
          </div>
        )}

        {/* Reparaciones list */}
        {loadingReps ? (
          <div style={{ padding: '12px 0', color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>Cargando…</div>
        ) : reparaciones.length === 0 ? (
          <div style={{ background: 'var(--card-glass)', borderRadius: 16, padding: 20, textAlign: 'center', border: '1.5px dashed var(--separator)' }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
              Sin gastos registrados<br/><span style={{ fontSize: 11 }}>Agregá reparaciones y costos del vehículo</span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reparaciones.map((r) => {
              const cat = catConfig[r.categoria] ?? catConfig.otro
              const fecha = new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
              return (
                <button key={r.id} onClick={() => setEditingRep(r)} style={{ background: 'var(--card-glass)', borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 8px rgba(20,20,19,0.04)', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 11, flexShrink: 0, background: `${cat.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.descripcion}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{fecha} · {cat.label}{r.proveedor ? ` · ${r.proveedor}` : ''}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--red)', flexShrink: 0 }}>−{fmt(r.costo)}</div>
                </button>
              )
            })}
          </div>
        )}

        {v.notas && (
          <div style={{ background: 'var(--card-glass)', borderRadius: 14, padding: '12px 16px', marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Notas</div>
            <p style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.5, margin: 0 }}>{v.notas}</p>
          </div>
        )}

        {/* Delete vehicle */}
        <div style={{ marginTop: 24 }}>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                width: '100%', height: 46, borderRadius: 999, border: '1.5px solid rgba(192,112,112,0.35)',
                background: 'rgba(192,112,112,0.07)', cursor: 'pointer',
                fontSize: 13, fontWeight: 700, color: 'var(--red)', fontFamily: 'var(--font)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="var(--red)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Eliminar vehículo
            </button>
          ) : (
            <div style={{ background: 'rgba(192,112,112,0.08)', borderRadius: 18, padding: 16, border: '1.5px solid rgba(192,112,112,0.25)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', marginBottom: 6 }}>¿Eliminar este vehículo?</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
                Se eliminará permanentemente junto con todas sus reparaciones y gastos.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{ flex: 1, height: 42, borderRadius: 999, border: '1.5px solid var(--separator)', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--muted)', fontFamily: 'var(--font)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEliminar}
                  disabled={deletingV}
                  style={{ flex: 2, height: 42, borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--red)', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font)', opacity: deletingV ? 0.6 : 1 }}
                >
                  {deletingV ? 'Eliminando…' : 'Sí, eliminar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {editingRep && (
        <EditReparacionSheet
          reparacion={editingRep}
          onClose={() => setEditingRep(null)}
          onSaved={(updated) => {
            setReparaciones((prev) => prev.map((r) => r.id === updated.id ? updated : r))
            setEditingRep(null)
          }}
          onDeleted={(id) => {
            setReparaciones((prev) => prev.filter((r) => r.id !== id))
            setEditingRep(null)
          }}
        />
      )}
    </div>
  )
}
