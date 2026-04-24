import { useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

export function PageTransition({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.from(containerRef.current, {
        x: 18,
        autoAlpha: 0,
        duration: 0.3,
        ease: 'power2.out',
        clearProps: 'all',
      })
    },
    {
      scope: containerRef,
      dependencies: [location.pathname],
      revertOnUpdate: true,
    },
  )

  return (
    <div ref={containerRef} style={{ height: '100%', overflow: 'hidden' }}>
      {children}
    </div>
  )
}
