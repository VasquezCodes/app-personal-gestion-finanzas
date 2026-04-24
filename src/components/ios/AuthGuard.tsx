import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuthStore } from '../../store/authStore'

interface AuthGuardProps {
  children: ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { session, loading } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !session) {
      navigate('/login', { replace: true })
    }
  }, [session, loading, navigate])

  if (loading) {
    return (
      <div
        className="min-h-svh flex items-center justify-center"
        style={{ background: '#F3F0EE' }}
      >
        <div
          className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#141413', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  if (!session) return null

  return <>{children}</>
}
