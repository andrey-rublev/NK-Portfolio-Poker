/**
 * Whether the visitor has turned the table's motion off with ?motion=0 (or
 * ?motion=off). The OS "reduce motion" setting is deliberately not followed:
 * the dealing, the camera's fly-in and the casino around the table are the
 * experience itself, and the "View as list" button offers the same content
 * without any of it.
 */
export function motionOff(): boolean {
  if (typeof window === 'undefined') return false
  const flag = new URLSearchParams(window.location.search).get('motion')
  return flag === '0' || flag === 'off'
}
