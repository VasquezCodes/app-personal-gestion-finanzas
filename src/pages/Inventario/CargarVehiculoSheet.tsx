import { useState, useRef } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { BottomSheet } from '../../components/ios/BottomSheet'
import { useVehiculosStore } from '../../store/vehiculosStore'
import { parsearExcelVehiculos, generarTemplateExcel } from '../../lib/excel'
import { formatearMoneda } from '../../lib/utils'
import type { VehiculoForm } from '../../types'

// ---- Schema ----
const anioActual = new Date().getFullYear()
const toNum = (v: unknown) => (v === '' || v === undefined || v === null ? undefined : Number(v))
const schema = z.object({
  marca:              z.string().min(1, 'Requerido'),
  modelo:             z.string().min(1, 'Requerido'),
  anio:               z.preprocess(toNum, z.number().min(1900).max(anioActual + 1, `Máximo ${anioActual + 1}`)),
  color:              z.string().optional(),
  kilometraje:        z.preprocess(toNum, z.number().min(0).optional()),
  precio_compra:      z.preprocess(toNum, z.number().min(1, 'Requerido')),
  gastos_adicionales: z.preprocess(toNum, z.number().min(0).optional()),
  fecha_compra:       z.string().min(1, 'Requerido'),
  estado:             z.enum(['en_stock', 'vendido', 'en_reparacion', 'reservado']),
  notas:              z.string().optional(),
})

type FormData = z.infer<typeof schema>

// ---- Helpers UI ----
function FieldGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      {children}
    </div>
  )
}

function Field({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div
      className="px-4 py-3 border-b last:border-b-0"
      style={{ borderColor: 'rgba(60,60,67,0.12)' }}
    >
      <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#696969' }}>
        {label}
      </label>
      {children}
      {error && <p className="text-[12px] mt-1" style={{ color: '#FF3B30' }}>{error}</p>}
    </div>
  )
}

const inputClass = "w-full text-[16px] outline-none bg-transparent"
const inputStyle = { color: '#141413' }

// ---- Brand data (exported for use in list cards) ----
export const BRAND_LOGOS: Record<string, string> = {
  'Audi':          '/carBrands/Audi_Logo_1995.svg',
  'BMW':           '/carBrands/BMW_logo_(gray).svg',
  'Chevrolet':     '/carBrands/Chevrolet.svg',
  'Citroën':       '/carBrands/Citroen_2016_logo.svg',
  'Dodge':         '/carBrands/Dodge_black_logo.svg',
  'Fiat':          '/carBrands/fiat-svgrepo-com.svg',
  'Ford':          '/carBrands/ford-svgrepo-com.svg',
  'Honda':         '/carBrands/honda-svgrepo-com.svg',
  'Hummer':        '/carBrands/hummer-svgrepo-com.svg',
  'Hyundai':       '/carBrands/hyundai-svgrepo-com.svg',
  'Infiniti':      '/carBrands/infiniti-svgrepo-com.svg',
  'Jeep':          '/carBrands/jeep-alt-svgrepo-com.svg',
  'Kia':           '/carBrands/kia-svgrepo-com.svg',
  'Land Rover':    '/carBrands/land-rover-svgrepo-com.svg',
  'Lexus':         '/carBrands/lexus-svgrepo-com.svg',
  'Mazda':         '/carBrands/mazda-alt-svgrepo-com.svg',
  'Mercedes-Benz': '/carBrands/mercedes-benz-alt-svgrepo-com.svg',
  'Mitsubishi':    '/carBrands/mitsubishi-svgrepo-com.svg',
  'Nissan':        '/carBrands/nissan-svgrepo-com.svg',
  'Toyota':        '/carBrands/toyota-svgrepo-com.svg',
  'Volkswagen':    '/carBrands/Volkswagen_logo_2019.svg',
}

const MARCA_NOMBRES = Object.keys(BRAND_LOGOS)

// ---- Brand Picker (text pills) ----
function BrandPicker({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const isCustom = !!value && !MARCA_NOMBRES.includes(value)
  const [showCustom, setShowCustom] = useState(isCustom)

  const select = (nombre: string) => {
    setShowCustom(false)
    onChange(nombre)
  }

  const handleOtra = () => {
    setShowCustom((s) => !s)
    if (!showCustom) onChange('')
  }

  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#696969', marginBottom: 10 }}>
        Marca
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {MARCA_NOMBRES.map((nombre) => {
          const sel = value === nombre
          return (
            <motion.button
              key={nombre}
              type="button"
              onClick={() => select(nombre)}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: '7px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                background: sel ? '#141413' : 'rgba(20,20,19,0.07)',
                color: sel ? '#F3F0EE' : '#141413',
                fontSize: 13, fontWeight: sel ? 700 : 500,
                fontFamily: 'var(--font)',
                transition: 'background .12s, color .12s',
                boxShadow: sel ? '0 2px 10px rgba(20,20,19,0.22)' : 'none',
              }}
            >
              {nombre}
            </motion.button>
          )
        })}
        <motion.button
          type="button"
          onClick={handleOtra}
          whileTap={{ scale: 0.95 }}
          style={{
            padding: '7px 14px', borderRadius: 999, cursor: 'pointer',
            border: showCustom ? '1.5px solid #141413' : '1.5px dashed rgba(20,20,19,0.25)',
            background: 'transparent',
            color: showCustom ? '#141413' : 'rgba(20,20,19,0.4)',
            fontSize: 13, fontWeight: 600,
            fontFamily: 'var(--font)',
            transition: 'all .12s',
          }}
        >
          Otra…
        </motion.button>
      </div>

      {showCustom && (
        <input
          autoFocus
          value={isCustom ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Escribí la marca..."
          style={{
            marginTop: 10, width: '100%', height: 42, borderRadius: 12,
            border: '1.5px solid rgba(20,20,19,0.18)',
            background: 'rgba(255,255,255,0.9)',
            padding: '0 14px', fontSize: 15, fontFamily: 'var(--font)',
            color: '#141413', outline: 'none',
          }}
        />
      )}

      {error && <p style={{ fontSize: 12, marginTop: 6, color: '#FF3B30' }}>{error}</p>}
    </div>
  )
}

// ---- Tab: Manual ----
function TabManual({ onSuccess }: { onSuccess: () => void }) {
  const crearVehiculo = useVehiculosStore((s) => s.crearVehiculo)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: {
      estado: 'en_stock',
      anio: anioActual,
      fecha_compra: new Date().toISOString().split('T')[0],
    },
  })

  const marcaValue = watch('marca') ?? ''

  const onSubmit = async (data: FormData) => {
    const error = await crearVehiculo(data as VehiculoForm)
    if (!error) {
      reset()
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-4 flex flex-col gap-3 pb-10">
      {/* Vehículo */}
      <FieldGroup>
        <BrandPicker
          value={marcaValue}
          onChange={(v) => setValue('marca', v, { shouldValidate: true })}
          error={errors.marca?.message}
        />
        <Field label="Modelo" error={errors.modelo?.message}>
          <input {...register('modelo')} placeholder="Corolla" className={inputClass} style={inputStyle} />
        </Field>
        <Field label="Año" error={errors.anio?.message}>
          <input {...register('anio')} type="number" inputMode="numeric" placeholder={String(anioActual)} className={inputClass} style={inputStyle} />
        </Field>
        <Field label="Color">
          <input {...register('color')} placeholder="Blanco" className={inputClass} style={inputStyle} />
        </Field>
        <Field label="Kilometraje">
          <input {...register('kilometraje')} type="number" inputMode="numeric" placeholder="0" className={inputClass} style={inputStyle} />
        </Field>
      </FieldGroup>

      {/* Financiero */}
      <FieldGroup>
        <Field label="Precio de Compra *" error={errors.precio_compra?.message}>
          <input {...register('precio_compra')} type="number" inputMode="decimal" placeholder="0" className={inputClass} style={inputStyle} />
        </Field>
        <Field label="Gastos Adicionales">
          <input {...register('gastos_adicionales')} type="number" inputMode="decimal" placeholder="0" className={inputClass} style={inputStyle} />
        </Field>
      </FieldGroup>

      {/* Estado y fecha */}
      <FieldGroup>
        <Field label="Estado" error={errors.estado?.message}>
          <select {...register('estado')} className={inputClass} style={inputStyle}>
            <option value="en_stock">En Stock</option>
            <option value="en_reparacion">En Reparación</option>
            <option value="reservado">Reservado</option>
            <option value="vendido">Vendido</option>
          </select>
        </Field>
        <Field label="Fecha de Compra *" error={errors.fecha_compra?.message}>
          <input {...register('fecha_compra')} type="date" className={inputClass} style={inputStyle} />
        </Field>
      </FieldGroup>

      {/* Notas */}
      <FieldGroup>
        <Field label="Notas">
          <textarea
            {...register('notas')}
            placeholder="Observaciones opcionales..."
            rows={3}
            className="w-full text-[16px] outline-none bg-transparent resize-none"
            style={inputStyle}
          />
        </Field>
      </FieldGroup>

      <motion.button
        type="submit"
        disabled={isSubmitting}
        whileTap={{ scale: 0.97 }}
        className="w-full rounded-[20px] py-4 text-[17px] font-semibold flex items-center justify-center gap-2 mt-1 disabled:opacity-60"
        style={{ background: '#141413', color: '#F3F0EE' }}
      >
        {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Guardar Vehículo'}
      </motion.button>
    </form>
  )
}

// ---- Tab: Excel ----
function TabExcel({ onSuccess }: { onSuccess: () => void }) {
  const crearVehiculosBatch = useVehiculosStore((s) => s.crearVehiculosBatch)
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<VehiculoForm[] | null>(null)
  const [errores, setErrores] = useState<string[]>([])
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState<{ exitosos: number; fallidos: number } | null>(null)

  const handleFile = async (file: File) => {
    setPreview(null)
    setErrores([])
    setResultado(null)

    const { datos, resultado } = await parsearExcelVehiculos(file)
    setPreview(datos)
    if (resultado.errores.length > 0) setErrores(resultado.errores)
  }

  const handleImportar = async () => {
    if (!preview || preview.length === 0) return
    setImportando(true)
    const res = await crearVehiculosBatch(preview)
    setResultado(res)
    setImportando(false)
    if (res.exitosos > 0) {
      setTimeout(onSuccess, 1500)
    }
  }

  return (
    <div className="px-4 py-4 flex flex-col gap-4">
      {/* Template */}
      <button
        onClick={generarTemplateExcel}
        className="flex items-center gap-2 text-[15px] font-medium"
        style={{ color: '#007AFF' }}
      >
        <Download size={18} />
        Descargar plantilla Excel
      </button>

      {/* Drop zone */}
      <button
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-[20px] border-2 border-dashed flex flex-col items-center justify-center gap-2 py-10"
        style={{ borderColor: 'rgba(60,60,67,0.2)', background: '#FFFFFF' }}
      >
        <FileSpreadsheet size={36} style={{ color: '#696969' }} strokeWidth={1.5} />
        <span className="text-[15px] font-medium" style={{ color: '#141413' }}>
          Seleccionar archivo
        </span>
        <span className="text-[13px]" style={{ color: '#696969' }}>
          .xlsx o .csv
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />

      {/* Errores de parseo */}
      {errores.length > 0 && (
        <div className="rounded-2xl p-3 flex flex-col gap-1" style={{ background: '#FFECEB' }}>
          {errores.map((e, i) => (
            <div key={i} className="flex items-center gap-2 text-[13px]" style={{ color: '#FF3B30' }}>
              <AlertCircle size={14} />
              {e}
            </div>
          ))}
        </div>
      )}

      {/* Preview */}
      {preview && preview.length > 0 && !resultado && (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-semibold" style={{ color: '#696969' }}>
            {preview.length} vehículo{preview.length !== 1 ? 's' : ''} encontrado{preview.length !== 1 ? 's' : ''}
          </p>
          <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            {preview.slice(0, 5).map((v, i) => (
              <div
                key={i}
                className="px-4 py-3 border-b last:border-b-0 flex items-center justify-between"
                style={{ borderColor: 'rgba(60,60,67,0.1)' }}
              >
                <span className="text-[14px]" style={{ color: '#141413' }}>
                  {v.marca} {v.modelo} {v.anio}
                </span>
                <span className="text-[14px] font-semibold" style={{ color: '#141413' }}>
                  {formatearMoneda(v.precio_compra)}
                </span>
              </div>
            ))}
            {preview.length > 5 && (
              <div className="px-4 py-3 text-[13px]" style={{ color: '#696969' }}>
                +{preview.length - 5} más...
              </div>
            )}
          </div>

          <motion.button
            onClick={handleImportar}
            disabled={importando}
            whileTap={{ scale: 0.97 }}
            className="w-full rounded-[20px] py-4 text-[17px] font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: '#141413', color: '#F3F0EE' }}
          >
            {importando
              ? <><Loader2 size={20} className="animate-spin" /> Importando...</>
              : `Importar ${preview.length} vehículo${preview.length !== 1 ? 's' : ''}`
            }
          </motion.button>
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-[20px] p-5 flex flex-col items-center gap-2"
          style={{ background: resultado.exitosos > 0 ? '#E8F9ED' : '#FFECEB' }}
        >
          <CheckCircle2 size={32} style={{ color: resultado.exitosos > 0 ? '#34C759' : '#FF3B30' }} />
          <p className="text-[16px] font-semibold" style={{ color: '#141413' }}>
            {resultado.exitosos > 0
              ? `¡${resultado.exitosos} vehículo${resultado.exitosos !== 1 ? 's' : ''} importado${resultado.exitosos !== 1 ? 's' : ''}!`
              : 'Error al importar'
            }
          </p>
        </motion.div>
      )}
    </div>
  )
}

// ---- Sheet principal ----
interface Props {
  open: boolean
  onClose: () => void
}

export function CargarVehiculoSheet({ open, onClose }: Props) {
  const [tab, setTab] = useState<'manual' | 'excel'>('manual')

  return (
    <BottomSheet open={open} onClose={onClose} titulo="Cargar Vehículo" altura="full">
      {/* Tabs */}
      <div className="flex gap-1 mx-4 mt-3 mb-1 rounded-xl p-1" style={{ background: 'rgba(120,120,128,0.12)' }}>
        {(['manual', 'excel'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-1.5 rounded-lg text-[14px] font-semibold transition-all"
            style={{
              background: tab === t ? '#FFFFFF' : 'transparent',
              color: tab === t ? '#141413' : '#696969',
              boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {t === 'manual' ? 'Manual' : (
              <span className="flex items-center justify-center gap-1">
                <Upload size={13} />
                Excel
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'manual'
        ? <TabManual onSuccess={onClose} />
        : <TabExcel onSuccess={onClose} />
      }
    </BottomSheet>
  )
}
