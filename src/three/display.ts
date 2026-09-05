/** Small helpers for squeezing the most screen out of a phone browser. */

/** Running from the Home Screen (iOS) or an installed PWA — no browser chrome. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone
  return (
    iosStandalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches === true
  )
}

/**
 * iPhone Safari does not implement the Fullscreen API (iPadOS does), so the
 * fullscreen control is only offered where it actually works.
 */
export function canFullscreen(): boolean {
  if (typeof document === 'undefined') return false
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>
  }
  return Boolean(el.requestFullscreen || el.webkitRequestFullscreen)
}

export function isFullscreen(): boolean {
  if (typeof document === 'undefined') return false
  const d = document as Document & { webkitFullscreenElement?: Element | null }
  return Boolean(document.fullscreenElement || d.webkitFullscreenElement)
}

export async function toggleFullscreen(): Promise<void> {
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>
  }
  const d = document as Document & {
    webkitExitFullscreen?: () => Promise<void>
    webkitFullscreenElement?: Element | null
  }
  try {
    if (isFullscreen()) {
      await (document.exitFullscreen?.() ?? d.webkitExitFullscreen?.())
    } else {
      await (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.())
    }
  } catch {
    /* the browser refused (e.g. not a user gesture) — leave the view as-is */
  }
}

/**
 * True on the one platform that has no Fullscreen API at all: iPhone browsers
 * (every iOS browser is Safari underneath). There the only way to shed the
 * toolbars is to give the page something to scroll -- Safari collapses its own
 * chrome on the first upward swipe -- so the app mounts a scroll shim instead
 * of a fullscreen button.
 */
export function needsScrollShim(): boolean {
  if (typeof window === 'undefined') return false
  return !canFullscreen() && !isStandalone() && (navigator.maxTouchPoints ?? 0) > 0
}

/** How far the page must scroll before the browser has actually retracted. */
export const SHIM_COLLAPSE_PX = 24
