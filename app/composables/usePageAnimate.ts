export function usePageAnimate() {
  async function animateIn(targets: string, stagger = 0.06) {
    if (import.meta.server) return
    await nextTick()
    const { gsap } = await import('gsap')
    const els = document.querySelectorAll(targets)
    if (!els.length) return
    gsap.fromTo(
      els,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.42, stagger, ease: 'power2.out' }
    )
  }

  return { animateIn }
}
