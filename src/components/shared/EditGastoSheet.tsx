import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { GastoGeneral, CategoriaGasto } from '../../types'

const CATEGORIAS: { value: CategoriaGasto; label: string }[] = [
  { value: 'alquiler',  label: 'Alquiler' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'personal',  label: 'Personal' },
  { value: 'impuestos', label: 'Impuestos' },
  { value: 'seguros',   label: 'Seguros' },
  { value: 'otro',      label: 'Otro' },
]

interface Props {
  gasto: GastoGeneral
  onClose: () => void
  onSaved: (g: GastoGeneral) => void
  onDeleted: (id: string) => void
}

export function EditGastoSheet({ gasto, onClose, onSaved, onDeleted }: Props) {
  const [desc, setDesc] = useState(gasto.descripcion)
  const [monto, setMonto] = useState(String(gasto.monto))
  const [cat, setCat] = useState<CategoriaGasto>(gasto.categoria)
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
    if (error || !data) {
      window.alert(`No se pudo guardar: ${error?.message ?? 'sin datos'}`)
      return
    }
    onSaved(data)
  }

  async function handleDelete() {
    if (!confirming) { setConfirming(true); return }
    setSaving(true)
    const { error } = await supabase.from('gastos_generales').delete().eq('id', gasto.id)
    if (error) {
      setSaving(false)
      window.alert(`No se pudo eliminar: ${error.message}`)
      return
    }
    onDeleted(gasto.id)
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(20,20,19,0.4)', backdropFilter: 'blur(4px)', zIndex: 100 }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'var(--bg-card)', borderRadius: '28px 28px 0 0',
        zIndex: 110, paddingBottom: 34,
        boxShadow: '0 -8px 40px rgba(20,20,19,0.18)',
        animation: 'slideUp .3s cubic-bezier(.2,.8,.3,1)',
      }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--separator)' }} />
        </div>
        <div style={{ padding: '12px 22px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.5px' }}>Editar gasto</div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--btn-ghost-bg)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={15} color="var(--ink)" strokeWidth={2} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descripción" style={inputStyle} />
            <input value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="Monto (USD)" type="number" style={inputStyle} />
            <select value={cat} onChange={(e) => setCat(e.target.value as CategoriaGasto)} style={inputStyle}>
              {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input value={fecha} onChange={(e) => setFecha(e.target.value)} type="date" style={inputStyle} />
            <button onClick={handleSave} disabled={saving || !desc || !monto}
              style={{
                width: '100%', height: 50, borderRadius: 999, border: 'none', cursor: 'pointer',
                background: saving || !desc || !monto ? 'var(--btn-ghost-bg)' : 'var(--ink)',
                color: saving || !desc || !monto ? 'var(--muted)' : 'var(--bg)',
                fontSize: 15, fontWeight: 700, fontFamily: 'var(--font)',
              }}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button onClick={handleDelete} disabled={saving}
              style={{
                width: '100%', height: 46, borderRadius: 999, border: 'none', cursor: 'pointer',
                background: confirming ? 'var(--red-bg)' : 'transparent',
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

const inputStyle: React.CSSProperties = {
  width: '100%', height: 46, borderRadius: 14,
  border: '1.5px solid var(--separator)',
  background: 'var(--bg-input)',
  padding: '0 16px', fontSize: 14, fontFamily: 'var(--font)',
  color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
}
