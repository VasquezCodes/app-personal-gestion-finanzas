import { create } from 'zustand'

export type ThemeMode = 'auto' | 'light' | 'dark'
type ResolvedTheme = 'light' | 'dark'

// El modo oscuro sigue en desarrollo: hay controles que quedan ocultos y pantallas
// sin buen contraste. Mientras esté en false la app se fuerza a claro, incluso con
// el sistema en oscuro. Poner en true cuando el tema esté terminado.
export const DARK_HABILITADO = false

const LS_PREFIX = 'motorhub_theme:'
const ANON_KEY = `${LS_PREFIX}anon`

interface ThemeState {
  mode: ThemeMode          // preferencia del usuario
  resolved: ResolvedTheme  // tema efectivo aplicado al DOM
  userId: string | null
  init: () => void
  setMode: (mode: ThemeMode) => void
  bindUser: (userId: string | null) => void
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readMode(userId: string | null): ThemeMode {
  const key = userId ? `${LS_PREFIX}${userId}` : ANON_KEY
  const raw = localStorage.getItem(key)
  // Si quedó 'dark' guardado de antes, se muestra como claro pero no se pisa el
  // storage: al rehabilitar el tema vuelve la preferencia original del usuario.
  if (raw === 'dark') return DARK_HABILITADO ? 'dark' : 'light'
  if (raw === 'light' || raw === 'auto') return raw
  return 'auto'
}

function writeMode(userId: string | null, mode: ThemeMode) {
  const key = userId ? `${LS_PREFIX}${userId}` : ANON_KEY
  localStorage.setItem(key, mode)
}

function resolve(mode: ThemeMode): ResolvedTheme {
  if (!DARK_HABILITADO) return 'light'
  return mode === 'auto' ? getSystemTheme() : mode
}

function apply(resolved: ResolvedTheme) {
  document.documentElement.setAttribute('data-theme', resolved)
}

let systemListenerBound = false

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'auto',
  resolved: 'light',
  userId: null,

  init: () => {
    const mode = readMode(null)
    const resolved = resolve(mode)
    apply(resolved)
    set({ mode, resolved })

    if (!systemListenerBound && typeof window !== 'undefined' && window.matchMedia) {
      const mql = window.matchMedia('(prefers-color-scheme: dark)')
      const onChange = () => {
        const s = get()
        if (s.mode !== 'auto') return
        // Pasa por resolve() para respetar DARK_HABILITADO, si no el cambio de
        // tema del sistema metería el modo oscuro por la ventana.
        const next = resolve(s.mode)
        apply(next)
        set({ resolved: next })
      }
      mql.addEventListener('change', onChange)
      systemListenerBound = true
    }
  },

  setMode: (mode) => {
    if (mode === 'dark' && !DARK_HABILITADO) return
    const { userId } = get()
    writeMode(userId, mode)
    const resolved = resolve(mode)
    apply(resolved)
    set({ mode, resolved })
  },

  bindUser: (userId) => {
    const prev = get().userId
    if (prev === userId) return
    const mode = readMode(userId)
    const resolved = resolve(mode)
    apply(resolved)
    set({ userId, mode, resolved })
  },
}))
