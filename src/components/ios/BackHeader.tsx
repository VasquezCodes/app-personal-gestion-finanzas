import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface BackHeaderProps {
  title: string
  onBack?: () => void
  action?: ReactNode
}

export function BackHeader({ title, onBack, action }: BackHeaderProps) {
  const navigate = useNavigate()
  const handleBack = onBack ?? (() => navigate(-1))

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: 'calc(env(safe-area-inset-top) + 12px) 22px 14px',
      gap: 12,
      background: 'transparent',
    }}>
      <button
        onClick={handleBack}
        style={{
          width: 40, height: 40, borderRadius: 14, border: 'none', cursor: 'pointer',
          background: 'rgba(20,20,19,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
          <path d="M15 18l-6-6 6-6" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div style={{
        flex: 1,
        fontSize: 18, fontWeight: 800, color: 'var(--ink)',
        letterSpacing: '-0.5px', fontFamily: 'var(--font)',
      }}>
        {title}
      </div>

      {action && (
        <div style={{ flexShrink: 0 }}>
          {action}
        </div>
      )}
    </div>
  )
}
