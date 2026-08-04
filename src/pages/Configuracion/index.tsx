import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Smartphone, Sun, Moon, Wrench, KeyRound } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore, DARK_HABILITADO, type ThemeMode } from '../../store/themeStore'
import { CambiarPasswordSheet } from '../../components/shared/CambiarPasswordSheet'

interface RowProps {
  icon: React.ReactNode
  label: string
  value?: string
  chevron?: boolean
  danger?: boolean
  onClick?: () => void
}

function Row({ icon, label, value, chevron, danger, onClick }: RowProps) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '13px 16px',
        borderBottom: '0.5px solid var(--separator)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: danger ? 'var(--red-bg)' : 'var(--btn-ghost-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: danger ? 'var(--red)' : 'var(--ink)' }}>{label}</div>
        {value && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{value}</div>}
      </div>
      {chevron && (
        <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
          <path d="M1 1l6 6-6 6" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  )
}

function ThemeSegment() {
  const mode = useThemeStore((s) => s.mode)
  const setMode = useThemeStore((s) => s.setMode)

  const opts: { value: ThemeMode; label: string; icon: React.ReactNode; bloqueado?: boolean }[] = [
    { value: 'auto',  label: 'Auto',   icon: <Smartphone size={14} strokeWidth={2} /> },
    { value: 'light', label: 'Claro',  icon: <Sun size={14} strokeWidth={2} /> },
    { value: 'dark',  label: 'Oscuro', icon: <Moon size={14} strokeWidth={2} />, bloqueado: !DARK_HABILITADO },
  ]

  return (
    <div style={{ padding: '12px 14px' }}>
      <div style={{
        display: 'flex', gap: 4, padding: 4, borderRadius: 14,
        background: 'var(--btn-ghost-bg)',
      }}>
        {opts.map((opt) => {
          const active = mode === opt.value && !opt.bloqueado
          return (
            <button
              key={opt.value}
              disabled={opt.bloqueado}
              onClick={() => setMode(opt.value)}
              style={{
                flex: 1, height: 36, borderRadius: 10, border: 'none',
                cursor: opt.bloqueado ? 'not-allowed' : 'pointer',
                opacity: opt.bloqueado ? 0.38 : 1,
                background: active ? 'var(--ink)' : 'transparent',
                color: active ? 'var(--bg)' : 'var(--ink2)',
                fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'background .2s, color .2s',
              }}
            >
              {opt.icon}
              {opt.label}
            </button>
          )
        })}
      </div>

      {!DARK_HABILITADO && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 9,
          marginTop: 10, padding: '10px 12px',
          background: 'var(--s-rep-bg)', borderRadius: 14,
        }}>
          <Wrench size={13} strokeWidth={2.2} color="var(--s-rep)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 11.5, lineHeight: 1.45, color: 'var(--ink2)' }}>
            <span style={{ color: 'var(--s-rep)', fontWeight: 700 }}>Modo oscuro en desarrollo.</span>{' '}
            Todavía no funciona bien: hay botones que quedan ocultos y pantallas sin
            buen contraste. Lo habilitamos cuando esté listo.
          </div>
        </div>
      )}
    </div>
  )
}

export default function Configuracion() {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()
  const [cambiandoPass, setCambiandoPass] = useState(false)

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'MH'
  const email = user?.email ?? ''

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div style={{ height: '100svh', position: 'relative', overflow: 'hidden' }}>
      <div className="scrollable" style={{
        height: '100%',
        background: 'var(--bg-gradient)',
        paddingBottom: 120,
      }}>
        {/* Header */}
        <div style={{ padding: 'calc(env(safe-area-inset-top) + 16px) 22px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 3 }}>Cuenta</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-1px', fontFamily: 'var(--font)' }}>Perfil</div>
        </div>

        {/* Avatar card — siempre superficie profunda para mantener contraste en ambos temas */}
        <div style={{ padding: '16px 22px 0' }}>
          <div style={{
            background: 'var(--surface-deep)', borderRadius: 28, padding: '20px 20px',
            display: 'flex', alignItems: 'center', gap: 16,
            boxShadow: 'var(--shadow-dark)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', right: -20, top: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
            <div style={{
              width: 56, height: 56, borderRadius: 999, flexShrink: 0,
              background: 'rgba(243,240,238,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 800, color: '#F3F0EE', fontFamily: 'var(--font)',
            }}>{initials}</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#F3F0EE', letterSpacing: '-0.4px' }}>
                {email.split('@')[0]}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(243,240,238,0.45)', marginTop: 2 }}>{email}</div>
              <div style={{
                marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'rgba(122,171,142,0.25)', borderRadius: 999, padding: '3px 10px',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)' }}>Activo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Settings sections */}
        <div style={{ padding: '14px 22px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Apariencia */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingLeft: 4 }}>Apariencia</div>
            <div style={{ background: 'var(--card-glass)', borderRadius: 22, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <ThemeSegment />
            </div>
          </div>

          {/* Cuenta */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingLeft: 4 }}>Cuenta</div>
            <div style={{ background: 'var(--card-glass)', borderRadius: 22, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <Row
                icon={<KeyRound size={16} color="var(--ink2)" strokeWidth={2} />}
                label="Cambiar contraseña" value="Se pide la contraseña actual" chevron
                onClick={() => setCambiandoPass(true)}
              />
              <Row
                icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="var(--red)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                label="Cerrar sesión" danger onClick={handleSignOut}
              />
            </div>
          </div>

          {/* Version */}
          <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>
            MotorHub v1.0.0 · PWA
          </div>
        </div>
      </div>

      {cambiandoPass && (
        <CambiarPasswordSheet onClose={() => setCambiandoPass(false)} />
      )}
    </div>
  )
}
