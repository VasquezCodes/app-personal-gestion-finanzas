import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'

const SUB_ROUTES = ['/gastos/historial', '/gastos/reparaciones', '/reportes/historial']

const tabs = [
  {
    to: '/',
    label: 'Inicio',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
        <rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor" opacity=".9"/>
        <rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor" opacity=".5"/>
        <rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor" opacity=".5"/>
        <rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor" opacity=".5"/>
      </svg>
    ),
  },
  {
    to: '/inventario',
    label: 'Autos',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
        <path d="M5 11l2-5h10l2 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <rect x="2" y="11" width="20" height="7" rx="3" stroke="currentColor" strokeWidth="1.8"/>
        <circle cx="7" cy="18" r="2" fill="currentColor"/>
        <circle cx="17" cy="18" r="2" fill="currentColor"/>
      </svg>
    ),
  },
  {
    to: '/gastos',
    label: 'Gastos',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
        <rect x="2" y="5" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M2 10h20" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M6 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    to: '/reportes',
    label: 'Reportes',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
        <path d="M3 17l5-5 4 4 5-6 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    to: '/configuracion',
    label: 'Perfil',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
] as const

export function TabBar() {
  const { pathname } = useLocation()
  if (SUB_ROUTES.some((r) => pathname.startsWith(r))) return null

  return (
    <nav
      className="fixed bottom-4 z-50 no-select"
      style={{ left: 12, right: 12 }}
    >
      <div
        style={{
          background: '#141413',
          borderRadius: 999,
          padding: '10px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          boxShadow: '0 8px 40px rgba(20,20,19,0.32)',
        }}
      >
        {tabs.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={{ flex: 1, display: 'flex', justifyContent: 'center' }}
          >
            {({ isActive }) => (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  padding: '4px 10px',
                  color: isActive ? '#F3F0EE' : 'rgba(243,240,238,0.38)',
                  transition: 'color .2s',
                  position: 'relative',
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="tab-bg"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 14,
                      background: 'rgba(243,240,238,0.10)',
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <span style={{ position: 'relative', zIndex: 1 }}>
                  {icon}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: isActive ? 700 : 500,
                    fontFamily: 'var(--font)',
                    letterSpacing: 0.3,
                    opacity: isActive ? 1 : 0.6,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  {label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
