import { type RefObject } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

export function useStaggerIn(
  containerRef: RefObject<HTMLDivElement | null>,
  deps: unknown[],
) {
  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const children = containerRef.current?.querySelectorAll(':scope > *')
      if (!children?.length) return

      gsap.from(children, {
        y: 20,
        autoAlpha: 0,
        stagger: 0.06,
        duration: 0.4,
        ease: 'power2.out',
        clearProps: 'transform,opacity,visibility',
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    { scope: containerRef, dependencies: deps, revertOnUpdate: true },
  )
}
