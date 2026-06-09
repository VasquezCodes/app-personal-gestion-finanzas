import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ReactNode } from 'react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  titulo?: string
  children: ReactNode
  altura?: 'auto' | 'full' | 'media'
}

export function BottomSheet({ open, onClose, titulo, children, altura = 'auto' }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const alturaClass = {
    auto:  'max-h-[92svh]',
    media: 'h-[60svh]',
    full:  'h-[92svh]',
  }[altura]

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-100"
            style={{ background: 'rgba(0,0,0,0.75)' }}
            onClick={onClose}
          />

          <motion.div
            key="sheet"
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={(_, info) => { if (info.offset.y > 80) onClose() }}
            className={`fixed bottom-0 inset-x-0 z-100 flex flex-col rounded-t-[28px] overflow-hidden ${alturaClass}`}
            style={{
              background: 'var(--bg-card)',
              borderTop: '1px solid var(--sep)',
            }}
          >
            {/* Handle */}
            <div className="shrink-0 flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--neutral-600)' }} />
            </div>

            {/* Header */}
            {titulo && (
              <div
                className="shrink-0 flex items-center justify-between px-5 pb-3 border-b"
                style={{ borderColor: 'var(--separator)' }}
              >
                <h2 className="text-[17px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {titulo}
                </h2>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                >
                  ✕
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto scroll-ios">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
