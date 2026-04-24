import { useEffect, useRef, useState } from 'react'
import { CargarVehiculoSheet, BRAND_LOGOS } from './CargarVehiculoSheet'
import { useStaggerIn } from '../../hooks/animations/useStaggerIn'
import { useVehiculosStore } from '../../store/vehiculosStore'
import { supabase } from '../../lib/supabase'
import type { Vehiculo, Reparacion, CategoriaReparacion, EstadoVehiculo } from '../../types'

const fmtShort = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

type Filtro = 'todos' | 'en_stock' | 'vendido' | 'en_reparacion'

const colorMap: Record<string, { bg: string; text: string }> = {
  vendido:       { bg: 'rgba(122,171,142,0.12)', text: '#7AAB8E' },
  en_stock:      { bg: 'rgba(122,150,184,0.12)', text: '#7A96B8' },
  en_reparacion: { bg: 'rgba(184,152,112,0.12)', text: '#B89870' },
  reservado:     { bg: 'rgba(168,138,184,0.12)', text: '#A88AB8' },
}

const catRepConfig: Record<CategoriaReparacion, { label: string; color: string }> = {
  mecanica:     { label: 'Mecánica',     color: '#B89870' },
  carroceria:   { label: 'Carrocería',   color: '#7A96B8' },
  electricidad: { label: 'Electricidad', color: '#A88AB8' },
  interior:     { label: 'Interior',     color: '#7AAB8E' },
  neumaticos:   { label: 'Neumáticos',   color: '#9A9590' },
  otro:         { label: 'Otro',         color: '#9A9590' },
}

const ESTADOS: { key: EstadoVehiculo; label: string }[] = [
  { key: 'en_stock',      label: 'En stock' },
  { key: 'en_reparacion', label: 'Reparación' },
  { key: 'reservado',     label: 'Reservado' },
  { key: 'vendido',       label: 'Vendido' },
]

function VehicleSheet({ vehiculo: vInit, onClose }: { vehiculo: Vehiculo; onClose: () => void }) {
  const actualizarVehiculo = useVehiculosStore((s) => s.actualizarVehiculo)
  const eliminarVehiculo = useVehiculosStore((s) => s.eliminarVehiculo)
  const [v, setV] = useState(vInit)
  const [reparaciones, setReparaciones] = useState<Reparacion[]>([])
  const [loadingReps, setLoadingReps] = useState(true)
  const [addingRep, setAddingRep] = useState(false)
  const [cambiandoEstado, setCambiandoEstado] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deletingV, setDeletingV] = useState(false)

  // venta form
  const [precioVenta, setPrecioVenta] = useState(v.precio_venta ? String(v.precio_venta) : '')
  const [fechaVenta, setFechaVenta] = useState(v.fecha_venta ?? new Date().toISOString().slice(0, 10))
  const [savingEstado, setSavingEstado] = useState(false)

  // rep form state
  const [repDesc, setRepDesc] = useState('')
  const [repCosto, setRepCosto] = useState('')
  const [repCat, setRepCat] = useState<CategoriaReparacion>('mecanica')
  const [repFecha, setRepFecha] = useState(new Date().toISOString().slice(0, 10))
  const [repProveedor, setRepProveedor] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleEliminar() {
    setDeletingV(true)
    const err = await eliminarVehiculo(v.id)
    setDeletingV(false)
    if (!err) onClose()
  }

  async function handleCambiarEstado(nuevoEstado: EstadoVehiculo) {
    if (nuevoEstado === v.estado) { setCambiandoEstado(false); return }
    if (nuevoEstado === 'vendido') {
      setCambiandoEstado(true)
      return
    }
    setSavingEstado(true)
    const campos: Partial<Vehiculo> = { estado: nuevoEstado }
    if (v.estado === 'vendido') {
      campos.precio_venta = undefined
      campos.fecha_venta = undefined
    }
    const err = await actualizarVehiculo(v.id, campos)
    setSavingEstado(false)
    if (!err) setV((prev) => ({ ...prev, ...campos }))
  }

  async function handleConfirmarVenta() {
    if (!precioVenta) return
    setSavingEstado(true)
    const campos = {
      estado: 'vendido' as EstadoVehiculo,
      precio_venta: parseFloat(precioVenta),
      fecha_venta: fechaVenta,
    }
    const err = await actualizarVehiculo(v.id, campos)
    setSavingEstado(false)
    if (!err) {
      setV((prev) => ({ ...prev, ...campos }))
      setCambiandoEstado(false)
    }
  }

  useEffect(() => {
    setLoadingReps(true)
    supabase
      .from('reparaciones')
      .select('*')
      .eq('vehiculo_id', v.id)
      .order('fecha', { ascending: false })
      .then(({ data }) => {
        setReparaciones(data ?? [])
        setLoadingReps(false)
      })
  }, [v.id])

  const totalReparaciones = reparaciones.reduce((s, r) => s + r.costo, 0)
  const costoTotal = v.precio_compra + (v.gastos_adicionales ?? 0) + totalReparaciones
  const ganancia = v.precio_venta ? v.precio_venta - costoTotal : null
  const roi = (v.precio_venta && ganancia != null) ? Math.round((ganancia / costoTotal) * 100) : null

  const c = colorMap[v.estado] ?? colorMap.en_stock
  const estadoLabel = v.estado === 'en_stock' ? 'En stock' : v.estado === 'vendido' ? 'Vendido' : v.estado === 'en_reparacion' ? 'Reparación' : 'Reservado'

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  const Row = ({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '0.5px solid rgba(20,20,19,0.07)' }}>
      <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: bold ? 800 : 600, color: color || 'var(--ink)', letterSpacing: '-0.3px' }}>{value}</span>
    </div>
  )

  async function handleSaveRep() {
    if (!repDesc || !repCosto) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('reparaciones')
      .insert({
        vehiculo_id: v.id,
        descripcion: repDesc,
        costo: parseFloat(repCosto),
        categoria: repCat,
        fecha: repFecha,
        proveedor: repProveedor || null,
        user_id: user?.id,
      })
      .select()
      .single()
    setSaving(false)
    if (!error && data) {
      setReparaciones((prev) => [data, ...prev])
      setRepDesc('')
      setRepCosto('')
      setRepProveedor('')
      setRepCat('mecanica')
      setRepFecha(new Date().toISOString().slice(0, 10))
      setAddingRep(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(20,20,19,0.4)',
        backdropFilter: 'blur(4px)', zIndex: 90,
      }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--cream)', borderRadius: '28px 28px 0 0',
        zIndex: 91, maxHeight: '90svh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -8px 40px rgba(20,20,19,0.18)',
        animation: 'slideUp .3s cubic-bezier(.2,.8,.3,1)',
      }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>

        {/* Handle + header — fixed inside sheet */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(20,20,19,0.18)' }} />
          </div>
          <div style={{ padding: '8px 22px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(20,20,19,0.07)' }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.6px' }}>{v.marca} {v.modelo}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{v.anio}{v.color ? ` · ${v.color}` : ''}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 999, background: c.bg, color: c.text }}>
              {estadoLabel}
            </span>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="scrollable" style={{ flex: 1, padding: '16px 22px', paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>

          {/* Estado pills */}
          <div style={{ display: 'flex', gap: 7, marginBottom: 16, flexWrap: 'wrap' }}>
            {ESTADOS.map((e) => {
              const isActive = v.estado === e.key
              const cm = colorMap[e.key]
              return (
                <button
                  key={e.key}
                  onClick={() => handleCambiarEstado(e.key)}
                  disabled={savingEstado}
                  style={{
                    padding: '7px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                    background: isActive ? cm.bg : 'rgba(20,20,19,0.06)',
                    color: isActive ? cm.text : 'var(--muted)',
                    fontSize: 12, fontWeight: isActive ? 700 : 500,
                    fontFamily: 'var(--font)',
                    outline: isActive ? `1.5px solid ${cm.text}` : 'none',
                    outlineOffset: 0,
                    transition: 'all .15s',
                    opacity: savingEstado ? 0.5 : 1,
                  }}
                >
                  {isActive && <span style={{ marginRight: 5 }}>·</span>}
                  {e.label}
                </button>
              )
            })}
          </div>

          {/* Venta form — aparece al seleccionar Vendido */}
          {cambiandoEstado && (
            <div style={{
              background: 'rgba(122,171,142,0.08)', borderRadius: 18,
              padding: '16px', marginBottom: 16,
              border: '1.5px solid rgba(122,171,142,0.25)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#7AAB8E', marginBottom: 12 }}>Registrar venta</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    autoFocus
                    value={precioVenta}
                    onChange={(e) => setPrecioVenta(e.target.value)}
                    placeholder="Precio de venta (USD)"
                    type="number"
                    style={{ flex: 2, height: 42, borderRadius: 12, border: '1.5px solid rgba(20,20,19,0.12)', background: 'rgba(255,255,255,0.9)', padding: '0 14px', fontSize: 14, fontFamily: 'var(--font)', color: 'var(--ink)', outline: 'none' }}
                  />
                  <input
                    value={fechaVenta}
                    onChange={(e) => setFechaVenta(e.target.value)}
                    type="date"
                    style={{ flex: 1, height: 42, borderRadius: 12, border: '1.5px solid rgba(20,20,19,0.12)', background: 'rgba(255,255,255,0.9)', padding: '0 14px', fontSize: 13, fontFamily: 'var(--font)', color: 'var(--ink)', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setCambiandoEstado(false)}
                    style={{ flex: 1, height: 42, borderRadius: 999, border: '1.5px solid rgba(20,20,19,0.12)', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--muted)', fontFamily: 'var(--font)' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmarVenta}
                    disabled={savingEstado || !precioVenta}
                    style={{ flex: 2, height: 42, borderRadius: 999, border: 'none', cursor: 'pointer', background: !precioVenta ? 'rgba(20,20,19,0.1)' : '#7AAB8E', color: !precioVenta ? 'var(--muted)' : '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font)' }}
                  >
                    {savingEstado ? 'Guardando…' : 'Confirmar venta'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Financial summary */}
          <div style={{ background: 'rgba(255,255,255,0.85)', borderRadius: 20, padding: '4px 16px', marginBottom: 16 }}>
            <Row label="Precio de compra" value={fmt(v.precio_compra)} />
            {(v.gastos_adicionales ?? 0) > 0 && (
              <Row label="Gastos adicionales" value={`−${fmt(v.gastos_adicionales)}`} color="#C07070" />
            )}
            {totalReparaciones > 0 && (
              <Row label="Reparaciones" value={`−${fmt(totalReparaciones)}`} color="#C07070" />
            )}
            <Row label="Costo total" value={fmt(costoTotal)} bold />
            {v.precio_venta && <Row label="Precio de venta" value={fmt(v.precio_venta)} />}
            {ganancia != null && (
              <Row
                label="Ganancia neta"
                value={ganancia >= 0 ? `+${fmt(ganancia)}` : fmt(ganancia)}
                color={ganancia >= 0 ? '#7AAB8E' : '#C07070'}
                bold
              />
            )}
            {roi != null && <Row label="ROI" value={`${roi}%`} color="#7A96B8" />}
          </div>

          {/* Reparaciones section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
              Gastos del vehículo
            </div>
            <button
              onClick={() => setAddingRep((s) => !s)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: addingRep ? 'rgba(20,20,19,0.08)' : 'var(--ink)',
                border: 'none', cursor: 'pointer',
                padding: '5px 12px', borderRadius: 999,
              }}
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
                <path d={addingRep ? 'M18 6L6 18M6 6l12 12' : 'M12 5v14M5 12h14'} stroke={addingRep ? 'var(--ink)' : '#F3F0EE'} strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
              <span style={{ fontSize: 11, fontWeight: 700, color: addingRep ? 'var(--ink)' : '#F3F0EE', fontFamily: 'var(--font)' }}>
                {addingRep ? 'Cancelar' : 'Agregar gasto'}
              </span>
            </button>
          </div>

          {/* Add rep form */}
          {addingRep && (
            <div style={{
              background: 'rgba(255,255,255,0.9)', borderRadius: 20,
              padding: '16px', marginBottom: 12,
              boxShadow: '0 2px 16px rgba(20,20,19,0.08)',
              border: '1px solid rgba(20,20,19,0.08)',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  autoFocus
                  value={repDesc}
                  onChange={(e) => setRepDesc(e.target.value)}
                  placeholder="Descripción (ej: Cambio de aceite)"
                  style={{ width: '100%', height: 42, borderRadius: 12, border: '1.5px solid rgba(20,20,19,0.12)', background: 'rgba(255,255,255,0.8)', padding: '0 14px', fontSize: 14, fontFamily: 'var(--font)', color: 'var(--ink)', outline: 'none' }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={repCosto}
                    onChange={(e) => setRepCosto(e.target.value)}
                    placeholder="Costo (USD)"
                    type="number"
                    style={{ flex: 1, height: 42, borderRadius: 12, border: '1.5px solid rgba(20,20,19,0.12)', background: 'rgba(255,255,255,0.8)', padding: '0 14px', fontSize: 14, fontFamily: 'var(--font)', color: 'var(--ink)', outline: 'none' }}
                  />
                  <input
                    value={repFecha}
                    onChange={(e) => setRepFecha(e.target.value)}
                    type="date"
                    style={{ flex: 1, height: 42, borderRadius: 12, border: '1.5px solid rgba(20,20,19,0.12)', background: 'rgba(255,255,255,0.8)', padding: '0 14px', fontSize: 13, fontFamily: 'var(--font)', color: 'var(--ink)', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    value={repCat}
                    onChange={(e) => setRepCat(e.target.value as CategoriaReparacion)}
                    style={{ flex: 1, height: 42, borderRadius: 12, border: '1.5px solid rgba(20,20,19,0.12)', background: 'rgba(255,255,255,0.8)', padding: '0 14px', fontSize: 13, fontFamily: 'var(--font)', color: 'var(--ink)', outline: 'none' }}
                  >
                    {(Object.entries(catRepConfig) as [CategoriaReparacion, { label: string }][]).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                  <input
                    value={repProveedor}
                    onChange={(e) => setRepProveedor(e.target.value)}
                    placeholder="Proveedor (opcional)"
                    style={{ flex: 1, height: 42, borderRadius: 12, border: '1.5px solid rgba(20,20,19,0.12)', background: 'rgba(255,255,255,0.8)', padding: '0 14px', fontSize: 13, fontFamily: 'var(--font)', color: 'var(--ink)', outline: 'none' }}
                  />
                </div>
                <button
                  onClick={handleSaveRep}
                  disabled={saving || !repDesc || !repCosto}
                  style={{
                    width: '100%', height: 46, borderRadius: 999, border: 'none', cursor: 'pointer',
                    background: (saving || !repDesc || !repCosto) ? 'rgba(20,20,19,0.12)' : 'var(--ink)',
                    color: (saving || !repDesc || !repCosto) ? 'var(--muted)' : '#F3F0EE',
                    fontSize: 14, fontWeight: 700, fontFamily: 'var(--font)',
                  }}
                >
                  {saving ? 'Guardando…' : 'Confirmar gasto'}
                </button>
              </div>
            </div>
          )}

          {/* Reparaciones list */}
          {loadingReps ? (
            <div style={{ padding: '12px 0', color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>Cargando…</div>
          ) : reparaciones.length === 0 ? (
            <div style={{
              background: 'rgba(255,255,255,0.6)', borderRadius: 16,
              padding: '20px', textAlign: 'center',
              border: '1.5px dashed rgba(20,20,19,0.10)',
            }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                Sin gastos registrados<br/>
                <span style={{ fontSize: 11 }}>Agregá reparaciones y costos del vehículo</span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {reparaciones.map((r) => {
                const cat = catRepConfig[r.categoria] ?? catRepConfig.otro
                const fecha = new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
                return (
                  <div key={r.id} style={{
                    background: 'rgba(255,255,255,0.85)', borderRadius: 16,
                    padding: '12px 14px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    boxShadow: '0 1px 8px rgba(20,20,19,0.04)',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 11, flexShrink: 0,
                      background: `${cat.color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.descripcion}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        {fecha} · {cat.label}{r.proveedor ? ` · ${r.proveedor}` : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#C07070', flexShrink: 0 }}>
                      −{fmt(r.costo)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {v.notas && (
            <div style={{ background: 'rgba(255,255,255,0.8)', borderRadius: 14, padding: '12px 16px', marginTop: 12 }}>
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
                  fontSize: 13, fontWeight: 700, color: '#C07070', fontFamily: 'var(--font)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="#C07070" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Eliminar vehículo
              </button>
            ) : (
              <div style={{ background: 'rgba(192,112,112,0.08)', borderRadius: 18, padding: 16, border: '1.5px solid rgba(192,112,112,0.25)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#C07070', marginBottom: 6 }}>¿Eliminar este vehículo?</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
                  Se eliminará permanentemente junto con todas sus reparaciones y gastos.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    style={{ flex: 1, height: 42, borderRadius: 999, border: '1.5px solid rgba(20,20,19,0.12)', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--muted)', fontFamily: 'var(--font)' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleEliminar}
                    disabled={deletingV}
                    style={{ flex: 2, height: 42, borderRadius: 999, border: 'none', cursor: 'pointer', background: '#C07070', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font)', opacity: deletingV ? 0.6 : 1 }}
                  >
                    {deletingV ? 'Eliminando…' : 'Sí, eliminar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function Inventario() {
  const { vehiculos, loading, fetchVehiculos } = useVehiculosStore()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selected, setSelected] = useState<Vehiculo | null>(null)
  const [repTotals, setRepTotals] = useState<Record<string, number>>({})

  useEffect(() => {
    fetchVehiculos()
    supabase.from('reparaciones').select('vehiculo_id, costo').then(({ data }) => {
      const totals: Record<string, number> = {}
      data?.forEach((r) => { totals[r.vehiculo_id] = (totals[r.vehiculo_id] ?? 0) + r.costo })
      setRepTotals(totals)
    })
  }, [fetchVehiculos])

  const filtros: { id: Filtro; label: string; count: number }[] = [
    { id: 'todos', label: 'Todos', count: vehiculos.length },
    { id: 'en_stock', label: 'Stock', count: vehiculos.filter((v) => v.estado === 'en_stock').length },
    { id: 'vendido', label: 'Vendidos', count: vehiculos.filter((v) => v.estado === 'vendido').length },
    { id: 'en_reparacion', label: 'Reparación', count: vehiculos.filter((v) => v.estado === 'en_reparacion').length },
  ]

  const vehiculosFiltrados = vehiculos
    .filter((v) => filtro === 'todos' || v.estado === filtro)
    .filter((v) => {
      if (!busqueda) return true
      const q = busqueda.toLowerCase()
      return (
        v.marca.toLowerCase().includes(q) ||
        v.modelo.toLowerCase().includes(q) ||
        String(v.anio).includes(q) ||
        (v.color?.toLowerCase().includes(q) ?? false)
      )
    })

  const enStock = vehiculos.filter((v) => v.estado === 'en_stock')
  const valorInventario = enStock.reduce((a, v) => a + v.precio_compra, 0)

  const listRef = useRef<HTMLDivElement>(null)
  useStaggerIn(listRef, [vehiculosFiltrados.length, filtro, busqueda, loading])

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
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 3 }}>Inventario</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-1px', fontFamily: 'var(--font)' }}>Mis Autos</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setSearchOpen((s) => !s)}
                style={{
                  width: 40, height: 40, borderRadius: 14,
                  background: searchOpen ? 'var(--ink)' : 'rgba(20,20,19,0.07)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: 'none', cursor: 'pointer',
                }}
              >
                <svg width="17" height="17" fill="none" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="7" stroke={searchOpen ? '#F3F0EE' : 'var(--ink2)'} strokeWidth="1.9"/>
                  <path d="M16.5 16.5L21 21" stroke={searchOpen ? '#F3F0EE' : 'var(--ink2)'} strokeWidth="1.9" strokeLinecap="round"/>
                </svg>
              </button>
              <button
                onClick={() => setSheetOpen(true)}
                style={{
                  width: 40, height: 40, borderRadius: 14,
                  background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(20,20,19,0.18)',
                }}
              >
                <svg width="17" height="17" fill="none" viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14" stroke="#F3F0EE" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>

          {searchOpen && (
            <div style={{ marginTop: 12 }}>
              <input
                autoFocus
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar marca, modelo..."
                style={{
                  width: '100%', height: 42, borderRadius: 14,
                  border: '1.5px solid rgba(20,20,19,0.12)',
                  background: 'rgba(255,255,255,0.8)',
                  padding: '0 16px', fontSize: 14, fontFamily: 'var(--font)',
                  color: 'var(--ink)', outline: 'none',
                }}
              />
            </div>
          )}
        </div>

        {/* Summary strip */}
        <div style={{ padding: '14px 22px 0', display: 'flex', gap: 10 }}>
          <div style={{
            flex: 1, background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)', borderRadius: 18,
            padding: '12px 16px',
            boxShadow: '0 2px 12px rgba(20,20,19,0.05)',
            border: '0.5px solid rgba(20,20,19,0.06)',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--muted)', marginBottom: 3 }}>En stock</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.8px' }}>
              {enStock.length}
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginLeft: 4 }}>autos</span>
            </div>
          </div>
          <div style={{
            flex: 2, background: 'var(--ink)',
            borderRadius: 18, padding: '12px 16px',
            boxShadow: '0 4px 18px rgba(20,20,19,0.15)',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'rgba(243,240,238,0.45)', marginBottom: 3 }}>Valor inventario activo</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#F3F0EE', letterSpacing: '-0.8px' }}>
              {fmtShort(valorInventario)}
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ padding: '14px 22px 0', display: 'flex', gap: 8, overflowX: 'auto' }} className="scrollbar-none">
          {filtros.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              style={{
                padding: '7px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0,
                background: filtro === f.id ? 'var(--ink)' : 'rgba(20,20,19,0.07)',
                color: filtro === f.id ? '#F3F0EE' : 'var(--ink2)',
                fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)',
                display: 'flex', alignItems: 'center', gap: 5,
                transition: 'all .15s',
              }}
            >
              {f.label}
              <span style={{
                fontSize: 10, fontWeight: 800,
                background: filtro === f.id ? 'rgba(243,240,238,0.2)' : 'rgba(20,20,19,0.1)',
                padding: '1px 5px', borderRadius: 999,
              }}>{f.count}</span>
            </button>
          ))}
        </div>

        {/* Vehicle list */}
        <div ref={listRef} style={{ padding: '12px 22px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ height: 72, borderRadius: 22, background: 'rgba(20,20,19,0.07)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              ))}
            </>
          ) : vehiculosFiltrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
              Sin resultados
            </div>
          ) : (
            vehiculosFiltrados.map((v) => {
              const costoV = v.precio_compra + (v.gastos_adicionales ?? 0) + (repTotals[v.id] ?? 0)
              const ganancia = v.precio_venta ? v.precio_venta - costoV : null
              const c = colorMap[v.estado] ?? colorMap.en_stock
              const estadoLabel = v.estado === 'en_stock' ? 'En stock' : v.estado === 'vendido' ? 'Vendido' : v.estado === 'en_reparacion' ? 'Reparación' : 'Reservado'
              return (
                <button
                  key={v.id}
                  onClick={() => setSelected(v)}
                  style={{
                    background: 'rgba(255,255,255,0.85)',
                    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                    borderRadius: 22, padding: '14px 16px',
                    boxShadow: '0 1px 12px rgba(20,20,19,0.05)',
                    border: '0.5px solid rgba(20,20,19,0.06)',
                    display: 'flex', alignItems: 'center', gap: 14,
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  <div style={{
                    width: 72, height: 58, borderRadius: 16, flexShrink: 0,
                    background: '#fff',
                    boxShadow: '0 1px 6px rgba(20,20,19,0.10)',
                    border: `1.5px solid ${c.text}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '10px 12px',
                  }}>
                    {BRAND_LOGOS[v.marca] ? (
                      <img
                        src={BRAND_LOGOS[v.marca]}
                        alt={v.marca}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'brightness(0)', opacity: 0.88 }}
                      />
                    ) : (
                      <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                        <path d="M5 11l2-5h10l2 5" stroke={c.text} strokeWidth="1.8" strokeLinecap="round"/>
                        <rect x="2" y="11" width="20" height="7" rx="3" stroke={c.text} strokeWidth="1.8"/>
                        <circle cx="7" cy="18" r="2" fill={c.text}/>
                        <circle cx="17" cy="18" r="2" fill={c.text}/>
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {v.marca} {v.modelo}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      {v.anio}{v.color ? ` · ${v.color}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                      background: c.bg, color: c.text, letterSpacing: 0.2,
                    }}>{estadoLabel}</span>
                    {ganancia != null ? (
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#7AAB8E' }}>+{fmtShort(ganancia)}</span>
                    ) : (
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>{fmtShort(v.precio_compra)}</span>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Vehicle detail sheet */}
      {selected && (
        <VehicleSheet vehiculo={selected} onClose={() => {
          setSelected(null)
          supabase.from('reparaciones').select('vehiculo_id, costo').then(({ data }) => {
            const totals: Record<string, number> = {}
            data?.forEach((r) => { totals[r.vehiculo_id] = (totals[r.vehiculo_id] ?? 0) + r.costo })
            setRepTotals(totals)
          })
        }} />
      )}

      {/* Add vehicle sheet */}
      <CargarVehiculoSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  )
}
