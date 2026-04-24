import { type RefObject } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

export function useBarGrow(
  containerRef: RefObject<HTMLDivElement | null>,
  deps: unknown[],
) {
  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const bars = containerRef.current?.querySelectorAll('[data-bar]')
      if (!bars?.length) return

      gsap.from(bars, {
        scaleY: 0,
        transformOrigin: 'bottom',
        stagger: 0.04,
        duration: 0.5,
        ease: 'power2.out',
        clearProps: 'transform,transformOrigin',
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    { scope: containerRef, dependencies: deps, revertOnUpdate: true },
  )
}
