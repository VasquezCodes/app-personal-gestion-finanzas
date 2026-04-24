import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  titulo: string
  mostrarVolver?: boolean
  accion?: ReactNode
  subtitulo?: string
}

export function PageHeader({ titulo, mostrarVolver = false, accion, subtitulo }: PageHeaderProps) {
  const navigate = useNavigate()

  return (
    <header
      className="sticky top-0 z-40 safe-top"
      style={{
        background: 'rgba(236,234,229,0.88)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        fontFamily: 'var(--font-primary)',
      }}
    >
      <div className="relative flex items-center justify-between px-4 max-w-2xl mx-auto" style={{ height: 44 }}>
        {mostrarVolver && (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-0.5 active:opacity-50 transition-opacity"
            style={{ color: 'var(--green)' }}

            aria-label="Volver"
          >
            <ChevronLeft size={24} strokeWidth={2.2} />
            <span className="text-[15px] font-medium">Atrás</span>
          </button>
        )}

        <div className={`absolute inset-x-0 flex flex-col items-center justify-center pointer-events-none ${mostrarVolver ? 'px-20' : 'px-4'}`}>
          <h1
            className="text-[17px] font-semibold leading-tight truncate"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
          >
            {titulo}
          </h1>
          {subtitulo && (
            <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{subtitulo}</p>
          )}
        </div>

        <div className="ml-auto" style={{ minWidth: mostrarVolver ? 0 : 40 }}>
          {accion}
        </div>
      </div>
    </header>
  )
}
