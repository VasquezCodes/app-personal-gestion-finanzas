import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, cubicBezier } from 'framer-motion'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const schema = z.object({
  email:    z.string().check(z.email({ error: 'Email inválido' })),
  password: z.string().min(6, { error: 'Mínimo 6 caracteres' }),
})
type LoginForm = z.infer<typeof schema>

const easeCustom = cubicBezier(0.22, 1, 0.36, 1)

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: easeCustom },
})

export default function Login() {
  const signIn   = useAuthStore((s) => s.signIn)
  const navigate = useNavigate()
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
      className="min-h-svh flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden"
      style={{ background: 'var(--bg)', fontFamily: 'var(--font-primary)' }}
    >
      {/* Ambient blob */}
      <div
        aria-hidden
        style={{
          position: 'absolute', top: '-5%', right: '-20%',
          width: 360, height: 360, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(20,20,19,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Brand ── */}
      <motion.div
        className="flex flex-col items-center mb-10"
        {...fadeUp(0)}
      >
        {/* Logo mark + wordmark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, ease: easeCustom }}
          style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}
        >
          <svg width="56" height="36" viewBox="0 0 52 34" fill="none">
            <path d="M4 30 A22 22 0 0 1 48 30" stroke="var(--separator)" strokeWidth="4" strokeLinecap="round"/>
            <path d="M4 30 A22 22 0 0 1 38 8" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round"/>
            <line x1="26" y1="30" x2="35" y2="10" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="26" cy="30" r="4" fill="var(--ink)"/>
            <circle cx="26" cy="30" r="2" fill="var(--cream)"/>
          </svg>
          <div style={{ lineHeight: 1 }}>
            <span style={{ fontSize: 34, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-1.5px', fontFamily: 'var(--font)' }}>Motor</span>
            <span style={{ fontSize: 34, fontWeight: 300, color: 'var(--ink)', letterSpacing: '-1.5px', fontFamily: 'var(--font)' }}>Hub</span>
          </div>
        </motion.div>

        <motion.p
          {...fadeUp(0.14)}
          style={{
            fontSize: 14,
            color: 'var(--muted)',
            marginTop: 6,
            letterSpacing: '0.01em',
          }}
        >
          Tu dealership. Siempre bajo control.
        </motion.p>
      </motion.div>

      {/* ── Form card ── */}
      <motion.div
        {...fadeUp(0.2)}
        style={{
          width: '100%', maxWidth: 360,
          background: 'var(--bg-card)',
          borderRadius: 28,
          padding: '28px 24px',
          boxShadow: '0 4px 40px rgba(20,20,19,0.07)',
          border: '1px solid var(--separator)',
        }}
      >
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">

          {/* Email */}
          <InputField label="Email" error={errors.email?.message}>
            <input
              {...register('email')}
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="nombre@email.com"
              style={inputStyle}
            />
          </InputField>

          {/* Contraseña */}
          <InputField label="Contraseña" error={errors.password?.message}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                {...register('password')}
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                style={{ flexShrink: 0, lineHeight: 0, opacity: 0.5, cursor: 'pointer' }}
              >
                {showPwd
                  ? <EyeOff size={18} color="var(--ink)" />
                  : <Eye size={18} color="var(--ink)" />
                }
              </button>
            </div>
          </InputField>

          {/* Error */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                borderRadius: 12,
                padding: '10px 14px',
                textAlign: 'center',
                fontSize: 13,
                fontWeight: 500,
                background: 'var(--red-bg)',
                color: 'var(--red)',
              }}
            >
              {errorMsg}
            </motion.div>
          )}

          {/* CTA */}
          <motion.button
            type="submit"
            disabled={isSubmitting}
            whileTap={{ scale: 0.97 }}
            style={{
              marginTop: 4,
              width: '100%',
              borderRadius: 20,
              padding: '16px 0',
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              background: isSubmitting ? 'var(--neutral-700)' : 'var(--ink)',
              color: 'var(--bg)',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontFamily: 'var(--font-primary)',
              boxShadow: '0 4px 20px rgba(20,20,19,0.18)',
              transition: 'background 200ms ease',
            }}
          >
            {isSubmitting
              ? <Loader2 size={20} className="animate-spin" />
              : 'Ingresar'
            }
          </motion.button>
        </form>
      </motion.div>

      {/* Footer */}
      <motion.p
        {...fadeUp(0.3)}
        style={{
          marginTop: 32,
          fontSize: 12,
          color: 'var(--text-tertiary)',
          letterSpacing: '0.02em',
          textAlign: 'center',
        }}
      >
        MotorHub · Uso privado
      </motion.p>
    </div>
  )
}

function InputField({
  label, error, children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--muted)',
          fontFamily: 'var(--font-primary)',
        }}
      >
        {label}
      </label>
      <div
        style={{
          borderRadius: 14,
          padding: '13px 16px',
          background: 'var(--bg)',
          border: error
            ? '1.5px solid var(--red)'
            : '1.5px solid var(--separator)',
        }}
      >
        {children}
      </div>
      {error && (
        <p style={{ fontSize: 12, color: 'var(--red)', margin: 0, paddingLeft: 2 }}>
          {error}
        </p>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  fontSize: 16,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: 'var(--ink)',
  fontFamily: 'var(--font-primary)',
}
