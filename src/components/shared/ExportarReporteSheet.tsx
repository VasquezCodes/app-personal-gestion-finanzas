import { useState } from 'react'
import { X, FileText, FileSpreadsheet, Check } from 'lucide-react'
import { buildReporteData } from '../../lib/reportes/buildReporteData'

const MESES_LARGOS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

type Formato = 'pdf' | 'excel'
type TipoPeriodo = 'mes' | 'anio'

interface Props {
  defaultPeriodo: TipoPeriodo
  mesActual: number   // 0-indexed
  anioActual: number
  onClose: () => void
}

export function ExportarReporteSheet({ defaultPeriodo, mesActual, anioActual, onClose }: Props) {
  const [formato, setFormato] = useState<Formato>('pdf')
  const [periodo, setPeriodo] = useState<TipoPeriodo>(defaultPeriodo)
  const [loading, setLoading] = useState(false)

  const labelPeriodo = periodo === 'mes' ? `${MESES_LARGOS[mesActual]} ${anioActual}` : `Año ${anioActual}`
  const labelFormato = formato === 'pdf' ? 'PDF' : 'Excel'

  async function handleExportar() {
    setLoading(true)
    try {
      const data = await buildReporteData(periodo, anioActual, periodo === 'mes' ? mesActual : null)
      if (formato === 'pdf') {
        const { exportPdf } = await import('../../lib/reportes/exportPdf')
        exportPdf(data)
      } else {
        const { exportExcel } = await import('../../lib/reportes/exportExcel')
        await exportExcel(data)
      }
      onClose()
    } catch (e) {
      window.alert(`No se pudo generar: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(20,20,19,0.4)', backdropFilter: 'blur(4px)',
        zIndex: 100,
      }} />
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
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.5px' }}>
              Exportar reporte
            </div>
            <button onClick={onClose} disabled={loading} style={{
              width: 32, height: 32, borderRadius: 10, background: 'var(--btn-ghost-bg)',
              border: 'none', cursor: loading ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <X size={15} color="var(--ink)" strokeWidth={2} />
            </button>
          </div>

          {/* FORMATO */}
          <div style={{ marginBottom: 18 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: 0.8, color: 'var(--muted)', marginBottom: 8,
            }}>Formato</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <FormatoCard
                Icon={FileText}
                label="PDF"
                active={formato === 'pdf'}
                onClick={() => setFormato('pdf')}
                disabled={loading}
              />
              <FormatoCard
                Icon={FileSpreadsheet}
                label="Excel"
                active={formato === 'excel'}
                onClick={() => setFormato('excel')}
                disabled={loading}
              />
            </div>
          </div>

          {/* PERÍODO */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: 0.8, color: 'var(--muted)', marginBottom: 8,
            }}>Período</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <PeriodoCard
                label={`${MESES_LARGOS[mesActual]} ${anioActual}`}
                active={periodo === 'mes'}
                onClick={() => setPeriodo('mes')}
                disabled={loading}
              />
              <PeriodoCard
                label={`Año ${anioActual}`}
                active={periodo === 'anio'}
                onClick={() => setPeriodo('anio')}
                disabled={loading}
              />
            </div>
          </div>

          {/* SUBMIT */}
          <button onClick={handleExportar} disabled={loading} style={{
            width: '100%', height: 50, borderRadius: 999, border: 'none',
            cursor: loading ? 'default' : 'pointer',
            background: loading ? 'var(--btn-ghost-bg)' : 'var(--ink)',
            color: loading ? 'var(--muted)' : 'var(--bg)',
            fontSize: 15, fontWeight: 700, fontFamily: 'var(--font)',
          }}>
            {loading ? 'Generando…' : `Exportar ${labelFormato} · ${labelPeriodo}`}
          </button>
        </div>
      </div>
    </>
  )
}

interface FormatoCardProps {
  Icon: typeof FileText
  label: string
  active: boolean
  onClick: () => void
  disabled: boolean
}

function FormatoCard({ Icon, label, active, onClick, disabled }: FormatoCardProps) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      flex: 1, height: 78, borderRadius: 18,
      background: active ? 'var(--ink)' : 'var(--btn-ghost-bg)',
      color: active ? 'var(--bg)' : 'var(--ink2)',
      border: 'none', cursor: disabled ? 'default' : 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 5, position: 'relative',
      transition: 'all .15s',
    }}>
      <Icon size={22} strokeWidth={1.8} />
      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font)' }}>{label}</span>
      {active && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          width: 16, height: 16, borderRadius: '50%',
          background: 'var(--bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={10} color="var(--ink)" strokeWidth={3} />
        </div>
      )}
    </button>
  )
}

interface PeriodoCardProps {
  label: string
  active: boolean
  onClick: () => void
  disabled: boolean
}

function PeriodoCard({ label, active, onClick, disabled }: PeriodoCardProps) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      flex: 1, height: 50, borderRadius: 14,
      background: active ? 'var(--ink)' : 'var(--btn-ghost-bg)',
      color: active ? 'var(--bg)' : 'var(--ink2)',
      border: 'none', cursor: disabled ? 'default' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 6, position: 'relative',
      fontSize: 13, fontWeight: 700, fontFamily: 'var(--font)',
      transition: 'all .15s',
    }}>
      {active && <Check size={13} strokeWidth={3} />}
      <span>{label}</span>
    </button>
  )
}
