import { create } from 'zustand'

export type ThemeMode = 'auto' | 'light' | 'dark'
type ResolvedTheme = 'light' | 'dark'

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
  if (raw === 'light' || raw === 'dark' || raw === 'auto') return raw
  return 'auto'
}

function writeMode(userId: string | null, mode: ThemeMode) {
  const key = userId ? `${LS_PREFIX}${userId}` : ANON_KEY
  localStorage.setItem(key, mode)
}

function resolve(mode: ThemeMode): ResolvedTheme {
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
        const next: ResolvedTheme = mql.matches ? 'dark' : 'light'
        apply(next)
        set({ resolved: next })
      }
      mql.addEventListener('change', onChange)
      systemListenerBound = true
    }
  },

  setMode: (mode) => {
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
