/** ?motion=1 / ?motion=on → true, ?motion=0 / ?motion=off → false, otherwise null. */
function motionFlag(): boolean | null {
  if (typeof window === 'undefined') return null
  const flag = new URLSearchParams(window.location.search).get('motion')
  if (flag === '1' || flag === 'on') return true
  if (flag === '0' || flag === 'off') return false
  return null
}

/**
 * Whether to suppress decorative, repeating motion (the pulsing deal cue and
 * the like). Follows the OS "reduce motion" setting; ?motion=1 / ?motion=0
 * override it either way.
 */
export function prefersReducedMotion(): boolean {
  const flag = motionFlag()
  if (flag !== null) return !flag
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

/**
 * Whether to skip the camera's zoom in to the table when the hand is dealt.
 * The zoom plays even when the OS asks for reduced motion: it is one short,
 * eased move that the visitor starts themselves by dealing, and part of the
 * table's welcome. Only an explicit ?motion=0 turns it off.
 */
export function skipIntroZoom(): boolean {
  return motionFlag() === false
}
