import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!value)} style={{
      width: 44, height: 26, borderRadius: 999, cursor: 'pointer',
      background: value ? 'var(--ink)' : 'rgba(20,20,19,0.15)',
      position: 'relative', transition: 'background .2s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 3, left: value ? 21 : 3,
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        transition: 'left .2s',
      }} />
    </div>
  )
}

interface RowProps {
  icon: React.ReactNode
  label: string
  value?: string
  toggle?: boolean
  onToggle?: (v: boolean) => void
  chevron?: boolean
  danger?: boolean
  onClick?: () => void
}

function Row({ icon, label, value, toggle, onToggle, chevron, danger, onClick }: RowProps) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '13px 16px',
        borderBottom: '0.5px solid rgba(20,20,19,0.06)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: danger ? 'rgba(192,112,112,0.12)' : 'rgba(20,20,19,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: danger ? '#C07070' : 'var(--ink)' }}>{label}</div>
        {value && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{value}</div>}
      </div>
      {toggle !== undefined && onToggle && <Toggle value={toggle} onChange={onToggle} />}
      {chevron && (
        <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
          <path d="M1 1l6 6-6 6" stroke="rgba(20,20,19,0.3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  )
}

export default function Configuracion() {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()
  const [notif, setNotif] = useState(true)
  const [sync, setSync] = useState(true)

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'MH'
  const email = user?.email ?? ''

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div style={{ height: '100svh', overflow: 'hidden' }}>
      <div className="scrollable" style={{
        height: '100%',
        background: 'radial-gradient(ellipse 120% 60% at 60% 0%, #EDE8E0 0%, #F3F0EE 55%, #F7F4F0 100%)',
        paddingBottom: 120,
      }}>
        {/* Header */}
        <div style={{ padding: 'calc(env(safe-area-inset-top) + 16px) 22px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 3 }}>Cuenta</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-1px', fontFamily: 'var(--font)' }}>Perfil</div>
        </div>

        {/* Avatar card */}
        <div style={{ padding: '16px 22px 0' }}>
          <div style={{
            background: 'var(--ink)', borderRadius: 28, padding: '20px 20px',
            display: 'flex', alignItems: 'center', gap: 16,
            boxShadow: '0 4px 24px rgba(20,20,19,0.15)',
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
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7AAB8E' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#7AAB8E' }}>Activo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Settings sections */}
        <div style={{ padding: '14px 22px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Preferencias */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingLeft: 4 }}>Preferencias</div>
            <div style={{ background: 'rgba(255,255,255,0.82)', borderRadius: 22, overflow: 'hidden', boxShadow: '0 1px 8px rgba(20,20,19,0.04)' }}>
              <Row
                icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="var(--ink2)" strokeWidth="1.8" strokeLinecap="round"/></svg>}
                label="Notificaciones" toggle={notif} onToggle={setNotif}
              />
              <Row
                icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" stroke="var(--ink2)" strokeWidth="1.8"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="var(--ink2)" strokeWidth="1.8" strokeLinecap="round"/></svg>}
                label="Modo claro" value="Sistema"
              />
            </div>
          </div>

          {/* Datos */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingLeft: 4 }}>Datos</div>
            <div style={{ background: 'rgba(255,255,255,0.82)', borderRadius: 22, overflow: 'hidden', boxShadow: '0 1px 8px rgba(20,20,19,0.04)' }}>
              <Row
                icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="var(--ink2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                label="Sync automático" toggle={sync} onToggle={setSync}
              />
              <Row
                icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="var(--ink2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                label="Exportar datos" value="CSV / Excel" chevron
                onClick={() => navigate('/reportes')}
              />
              <Row
                icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3" stroke="var(--ink2)" strokeWidth="1.8"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" stroke="var(--ink2)" strokeWidth="1.8"/></svg>}
                label="Base de datos" value="Supabase · Conectado" chevron
              />
            </div>
          </div>

          {/* Cuenta */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingLeft: 4 }}>Cuenta</div>
            <div style={{ background: 'rgba(255,255,255,0.82)', borderRadius: 22, overflow: 'hidden', boxShadow: '0 1px 8px rgba(20,20,19,0.04)' }}>
              <Row
                icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" stroke="var(--ink2)" strokeWidth="1.8"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="var(--ink2)" strokeWidth="1.8" strokeLinecap="round"/></svg>}
                label="Editar perfil" chevron
              />
              <Row
                icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--ink2)" strokeWidth="1.8"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="var(--ink2)" strokeWidth="1.8" strokeLinecap="round"/></svg>}
                label="Cambiar contraseña" chevron
              />
              <Row
                icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="#C07070" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
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
    </div>
  )
}
