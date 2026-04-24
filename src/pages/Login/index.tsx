import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, Car } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const schema = z.object({
  email:    z.string().check(z.email({ error: 'Email inválido' })),
  password: z.string().min(6, { error: 'Mínimo 6 caracteres' }),
})
type LoginForm = z.infer<typeof schema>

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <div
        className="rounded-xl px-4 py-3.5"
        style={{
          background: 'var(--bg-input)',
          border: error ? '1.5px solid var(--red)' : '1.5px solid var(--separator)',
        }}
      >
        {children}
      </div>
      {error && <p className="text-[12px] pl-1" style={{ color: 'var(--red)' }}>{error}</p>}
    </div>
  )
}

export default function Login() {
  const signIn    = useAuthStore((s) => s.signIn)
  const navigate  = useNavigate()
  const [showPwd, setShowPwd] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: LoginForm) => {
    setErrorMsg(null)
    const error = await signIn(data.email, data.password)
    if (error) setErrorMsg('Email o contraseña incorrectos')
    else navigate('/', { replace: true })
  }

  return (
    <div
      className="min-h-svh flex flex-col items-center justify-center px-6 py-12"
      style={{ background: 'var(--bg)', fontFamily: 'var(--font-primary)' }}
    >
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex flex-col items-center mb-10"
      >
        <div
          className="w-20 h-20 rounded-[28px] flex items-center justify-center mb-5"
          style={{
            background: 'var(--green-bg)',
            border: '1px solid rgba(0,204,126,0.2)',
            boxShadow: 'var(--shadow-glow-green)',
          }}
        >
          <Car size={36} color="var(--green)" strokeWidth={1.8} />
        </div>
        <h1 className="text-[30px] font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          AutoDealer
        </h1>
        <p className="text-[14px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          Gestión de tu dealership
        </p>
      </motion.div>

      {/* Form */}
      <motion.form
        onSubmit={handleSubmit(onSubmit)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="w-full max-w-sm flex flex-col gap-4"
        noValidate
      >
        <Field label="Email" error={errors.email?.message}>
          <input
            {...register('email')}
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="nombre@email.com"
            className="w-full text-[16px] outline-none bg-transparent"
            style={{ color: 'var(--text-primary)' }}
          />
        </Field>

        <Field label="Contraseña" error={errors.password?.message}>
          <div className="flex items-center gap-2">
            <input
              {...register('password')}
              type={showPwd ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              className="flex-1 text-[16px] outline-none bg-transparent"
              style={{ color: 'var(--text-primary)' }}
            />
            <button type="button" onClick={() => setShowPwd(!showPwd)} className="active:opacity-60">
              {showPwd
                ? <EyeOff size={18} color="var(--text-secondary)" />
                : <Eye size={18} color="var(--text-secondary)" />
              }
            </button>
          </div>
        </Field>

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl px-4 py-3 text-center text-[14px] font-medium"
            style={{ background: 'var(--red-bg)', color: 'var(--red)' }}
          >
            {errorMsg}
          </motion.div>
        )}

        <motion.button
          type="submit"
          disabled={isSubmitting}
          whileTap={{ scale: 0.97 }}
          className="w-full rounded-xl py-4 text-[16px] font-semibold flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          style={{
            background: 'var(--green)',
            color: '#fff',
            boxShadow: 'var(--shadow-glow-green)',
            letterSpacing: '-0.01em',
          }}
        >
          {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Ingresar'}
        </motion.button>
      </motion.form>
    </div>
  )
}
