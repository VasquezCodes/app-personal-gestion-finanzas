import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Smartphone, Sun, Moon } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore, type ThemeMode } from '../../store/themeStore'
import { seedMockData, clearMockData } from '../../lib/seedData'

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

  const opts: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'auto',  label: 'Auto',   icon: <Smartphone size={14} strokeWidth={2} /> },
    { value: 'light', label: 'Claro',  icon: <Sun size={14} strokeWidth={2} /> },
    { value: 'dark',  label: 'Oscuro', icon: <Moon size={14} strokeWidth={2} /> },
  ]

  return (
    <div style={{ padding: '12px 14px' }}>
      <div style={{
        display: 'flex', gap: 4, padding: 4, borderRadius: 14,
        background: 'var(--btn-ghost-bg)',
      }}>
        {opts.map((opt) => {
          const active = mode === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => setMode(opt.value)}
              style={{
                flex: 1, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
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
    </div>
  )
}

export default function Configuracion() {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()
  const [seeding, setSeeding] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [clearing, setClearing] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'MH'
  const email = user?.email ?? ''

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  async function handleSeed() {
    setSeeding('loading')
    const res = await seedMockData()
    setSeeding(res.ok ? 'ok' : 'err')
    setTimeout(() => setSeeding('idle'), 3000)
  }

  async function handleClear() {
    setClearing('loading')
    const res = await clearMockData()
    setClearing(res.ok ? 'ok' : 'err')
    setTimeout(() => setClearing('idle'), 3000)
  }

  return (
    <div style={{ height: '100svh', overflow: 'hidden' }}>
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

          {/* Datos */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingLeft: 4 }}>Datos</div>
            <div style={{ background: 'var(--card-glass)', borderRadius: 22, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <Row
                icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3" stroke="var(--ink2)" strokeWidth="1.8"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" stroke="var(--ink2)" strokeWidth="1.8"/></svg>}
                label="Base de datos" value="Supabase · Conectado"
              />
            </div>
          </div>

          {/* Datos de prueba */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingLeft: 4 }}>Datos de prueba</div>
            <div style={{ background: 'var(--card-glass)', borderRadius: 22, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <button onClick={handleSeed} disabled={seeding === 'loading'} style={{
                width: '100%', padding: '14px 18px', background: 'none', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: seeding === 'loading' ? 'default' : 'pointer',
                borderBottom: '0.5px solid var(--separator)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 10, background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                      <path d="M12 5v14M5 12h14" stroke="var(--green)" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Cargar datos de prueba</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: seeding === 'ok' ? 'var(--green)' : seeding === 'err' ? 'var(--red)' : 'var(--muted)' }}>
                  {seeding === 'loading' ? 'Cargando…' : seeding === 'ok' ? '✓ Listo' : seeding === 'err' ? 'Error' : 'Ene–Abr 2026'}
                </span>
              </button>
              <button onClick={handleClear} disabled={clearing === 'loading'} style={{
                width: '100%', padding: '14px 18px', background: 'none', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: clearing === 'loading' ? 'default' : 'pointer',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 10, background: 'var(--red-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="var(--red)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--red)' }}>Eliminar datos de prueba</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: clearing === 'ok' ? 'var(--green)' : clearing === 'err' ? 'var(--red)' : 'var(--muted)' }}>
                  {clearing === 'loading' ? 'Eliminando…' : clearing === 'ok' ? '✓ Listo' : clearing === 'err' ? 'Error' : 'mock-*'}
                </span>
              </button>
            </div>
          </div>

          {/* Cuenta */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingLeft: 4 }}>Cuenta</div>
            <div style={{ background: 'var(--card-glass)', borderRadius: 22, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
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
    </div>
  )
}
