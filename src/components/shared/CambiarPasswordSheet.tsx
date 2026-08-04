import { useState } from 'react'
import { X, Eye, EyeOff, Check } from 'lucide-react'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'

interface Props {
  onClose: () => void
}

const schema = z
  .object({
    actual: z.string().min(1, 'Ingresá tu contraseña actual'),
    nueva: z.string().min(8, 'La nueva contraseña necesita al menos 8 caracteres'),
    repetir: z.string().min(1, 'Repetí la contraseña nueva'),
  })
  .refine((d) => d.nueva === d.repetir, {
    path: ['repetir'],
    message: 'Las contraseñas no coinciden',
  })

export function CambiarPasswordSheet({ onClose }: Props) {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetir, setRepetir] = useState('')
  const [verPass, setVerPass] = useState(false)
  const [estado, setEstado] = useState<'idle' | 'guardando' | 'ok'>('idle')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState('')

  function validar(): boolean {
    const res = schema.safeParse({ actual, nueva, repetir })
    if (res.success) {
      setErrores({})
      return true
    }
    const mapa: Record<string, string> = {}
    for (const issue of res.error.issues) {
      const campo = String(issue.path[0] ?? '')
      if (campo && !mapa[campo]) mapa[campo] = issue.message
    }
    setErrores(mapa)
    return false
  }

  async function handleSubmit() {
    setErrorGeneral('')
    if (!validar()) return

    setEstado('guardando')

    // El email del JWT queda congelado al momento del login, así que lo pedimos
    // al servidor en vez de confiar en el cacheado: si reautenticáramos con uno
    // viejo, el login fallaría solo.
    const { data: datosUsuario, error: errorUsuario } = await supabase.auth.getUser()
    const emailVigente = datosUsuario.user?.email

    if (errorUsuario || !emailVigente) {
      setEstado('idle')
      setErrorGeneral('Tu sesión expiró. Cerrá sesión y volvé a entrar para cambiar la contraseña.')
      return
    }

    // Reautenticación: confirmamos la contraseña actual antes de tocar la cuenta.
    // Además deja la sesión "reciente", que es lo que pide Supabase cuando el
    // proyecto tiene activado el cambio seguro de contraseña.
    const { error: errorLogin } = await supabase.auth.signInWithPassword({
      email: emailVigente,
      password: actual,
    })

    if (errorLogin) {
      setEstado('idle')
      setErrores({ actual: 'La contraseña actual no es correcta' })
      return
    }

    const { error } = await supabase.auth.updateUser({ password: nueva })

    if (error) {
      setEstado('idle')
      setErrorGeneral(error.message)
      return
    }

    setEstado('ok')
  }

  const puedeGuardar = actual.length > 0 && nueva.length > 0 && repetir.length > 0
  const bloqueado = estado === 'guardando' || !puedeGuardar

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
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.5px' }}>Cambiar contraseña</div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--btn-ghost-bg)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={15} color="var(--ink)" strokeWidth={2} />
            </button>
          </div>

          {estado === 'ok' ? (
            <div style={{ paddingBottom: 8 }}>
              <div style={{
                width: 46, height: 46, borderRadius: 999, background: 'var(--green-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
              }}>
                <Check size={22} color="var(--green)" strokeWidth={2.4} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                Contraseña actualizada
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--muted)', marginBottom: 18 }}>
                Usá la contraseña nueva la próxima vez que inicies sesión.
              </div>
              <button onClick={onClose} style={{
                width: '100%', height: 50, borderRadius: 999, border: 'none', cursor: 'pointer',
                background: 'var(--ink)', color: 'var(--bg)',
                fontSize: 15, fontWeight: 700, fontFamily: 'var(--font)',
              }}>
                Listo
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Campo label="Contraseña actual" error={errores.actual}>
                <InputPass
                  value={actual}
                  onChange={setActual}
                  visible={verPass}
                  onToggle={() => setVerPass((v) => !v)}
                  autoComplete="current-password"
                  error={!!errores.actual}
                />
              </Campo>

              <Campo label="Contraseña nueva" error={errores.nueva} ayuda="Mínimo 8 caracteres">
                <InputPass
                  value={nueva}
                  onChange={setNueva}
                  visible={verPass}
                  onToggle={() => setVerPass((v) => !v)}
                  autoComplete="new-password"
                  error={!!errores.nueva}
                />
              </Campo>

              <Campo label="Repetir contraseña nueva" error={errores.repetir}>
                <InputPass
                  value={repetir}
                  onChange={setRepetir}
                  visible={verPass}
                  onToggle={() => setVerPass((v) => !v)}
                  autoComplete="new-password"
                  error={!!errores.repetir}
                />
              </Campo>

              {errorGeneral && (
                <div style={{
                  background: 'var(--red-bg)', borderRadius: 12, padding: '10px 12px',
                  fontSize: 12, lineHeight: 1.4, color: 'var(--red)', fontWeight: 600,
                }}>
                  {errorGeneral}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={bloqueado}
                style={{
                  width: '100%', height: 50, borderRadius: 999, border: 'none',
                  cursor: bloqueado ? 'default' : 'pointer',
                  background: bloqueado ? 'var(--btn-ghost-bg)' : 'var(--ink)',
                  color: bloqueado ? 'var(--muted)' : 'var(--bg)',
                  fontSize: 15, fontWeight: 700, fontFamily: 'var(--font)',
                  marginTop: 2,
                }}
              >
                {estado === 'guardando' ? 'Guardando…' : 'Cambiar contraseña'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

interface CampoProps {
  label: string
  error?: string
  ayuda?: string
  children: React.ReactNode
}

function Campo({ label, error, ayuda, children }: CampoProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--muted)' }}>
        {label}
      </label>
      {children}
      {error
        ? <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--red)' }}>{error}</div>
        : ayuda && <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{ayuda}</div>}
    </div>
  )
}

interface InputPassProps {
  value: string
  onChange: (v: string) => void
  visible: boolean
  onToggle: () => void
  autoComplete: string
  error: boolean
}

function InputPass({ value, onChange, visible, onToggle, autoComplete, error }: InputPassProps) {
  return (
    <div style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        style={{
          width: '100%', height: 46, borderRadius: 14,
          border: `1.5px solid ${error ? 'var(--red)' : 'var(--separator)'}`,
          background: 'var(--bg-input)',
          padding: '0 46px 0 16px', fontSize: 14, fontFamily: 'var(--font)',
          color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
        }}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        style={{
          position: 'absolute', right: 6, top: 6, width: 34, height: 34,
          borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {visible
          ? <EyeOff size={16} color="var(--ink2)" strokeWidth={2} />
          : <Eye size={16} color="var(--ink2)" strokeWidth={2} />}
      </button>
    </div>
  )
}
