import { forwardRef, useCallback } from 'react'

interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type' | 'value'> {
  value: string | number
  onChange: (raw: string) => void
}

/**
 * Input de texto que muestra separadores de miles (es-AR: punto) mientras
 * el usuario escribe, y devuelve dígitos crudos en onChange.
 * Uso: value={monto} onChange={(raw) => setMonto(raw)}
 */
export const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(
  ({ value, onChange, ...props }, ref) => {
    const raw = String(value ?? '').replace(/[^0-9]/g, '')
    const formatted = raw ? parseInt(raw, 10).toLocaleString('es-AR') : ''

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const clean = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '')
      onChange(clean)
    }, [onChange])

    return (
      <input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        value={formatted}
        onChange={handleChange}
      />
    )
  },
)
NumericInput.displayName = 'NumericInput'
