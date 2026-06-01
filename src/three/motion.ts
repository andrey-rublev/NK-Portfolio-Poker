/**
 * Whether to suppress animations. Honors the OS `prefers-reduced-motion`
 * setting, but allows an explicit override via URL for testing or for users who
 * want motion regardless of their OS default:
 *   ?motion=1 / ?motion=on  → force animations ON
 *   ?motion=0 / ?motion=off → force reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  const flag = new URLSearchParams(window.location.search).get('motion')
  if (flag === '1' || flag === 'on') return false
  if (flag === '0' || flag === 'off') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
