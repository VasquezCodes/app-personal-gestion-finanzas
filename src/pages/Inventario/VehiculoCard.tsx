import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight, Car } from 'lucide-react'
import type { Vehiculo } from '../../types'
import { formatearMoneda, formatearFecha, labelPorEstado, colorPorEstado, diasEnLote, alertaLote } from '../../lib/utils'

interface VehiculoCardProps {
  vehiculo: Vehiculo
  index: number
}

export function VehiculoCard({ vehiculo, index }: VehiculoCardProps) {
  const navigate = useNavigate()

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/vehiculo/${vehiculo.id}`)}
      className="w-full text-left rounded-[20px] p-4 flex items-center gap-3"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--separator)',
      }}
    >
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
        style={{ background: `${colorPorEstado(vehiculo.estado)}18` }}
      >
        <Car size={20} style={{ color: colorPorEstado(vehiculo.estado) }} strokeWidth={1.8} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[15px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {vehiculo.marca} {vehiculo.modelo}
          </span>
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
            style={{
              background: `${colorPorEstado(vehiculo.estado)}18`,
              color: colorPorEstado(vehiculo.estado),
            }}
          >
            {labelPorEstado(vehiculo.estado)}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          <span>{vehiculo.anio}</span>
          {vehiculo.color && <><span>·</span><span>{vehiculo.color}</span></>}
          {vehiculo.kilometraje > 0 && (
            <><span>·</span><span>{vehiculo.kilometraje.toLocaleString('es-AR')} km</span></>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1">
          <span className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {formatearMoneda(vehiculo.precio_compra)}
          </span>
          <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
            · {formatearFecha(vehiculo.fecha_compra, 'corto')}
          </span>
        </div>
      </div>

      {vehiculo.estado !== 'vendido' && (() => {
        const dias = diasEnLote(vehiculo.fecha_compra)
        const alerta = alertaLote(dias)
        return (
          <span style={{
            fontSize: 11, fontWeight: 800,
            color: alerta.color,
            background: alerta.bg,
            padding: '3px 9px', borderRadius: 999,
            flexShrink: 0,
            letterSpacing: 0.2,
          }}>
            {dias}d
          </span>
        )
      })()}
      <ChevronRight size={16} style={{ color: 'var(--neutral-600)', flexShrink: 0 }} />
    </motion.button>
  )
}
