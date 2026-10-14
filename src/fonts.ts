/**
 * Resolves once Mulish is ready to draw with, or after a short timeout if it is
 * slow or offline. HTML text swaps fonts in on its own; the card faces are
 * painted onto canvases once and can't, so only the 3D scene waits for this.
 */
export function canvasFontsReady(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return Promise.resolve()
  // One variable-font file covers every weight the cards use.
  const load = document.fonts.load('16px "Mulish Variable"').then(() => undefined)
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 2500))
  return Promise.race([load, timeout]).catch(() => undefined)
}
