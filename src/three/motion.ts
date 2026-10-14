/**
 * Whether to suppress decorative motion (the camera swoop, pulsing cues). Follows
 * the OS "reduce motion" setting, with a URL override either way for testing:
 *   ?motion=1 / ?motion=on  → force animations ON
 *   ?motion=0 / ?motion=off → force reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  const flag = new URLSearchParams(window.location.search).get('motion')
  if (flag === '1' || flag === 'on') return false
  if (flag === '0' || flag === 'off') return true
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}
