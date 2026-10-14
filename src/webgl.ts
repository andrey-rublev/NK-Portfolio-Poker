/**
 * Whether this browser can create a WebGL context at all (it can't on some
 * locked-down machines, old browsers and GPU blocklists). Checked up front:
 * react-three-fiber creates its renderer asynchronously, so a failure there
 * can't be caught by an error boundary and would leave an empty page.
 */
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    // Release the probe's context straight away; browsers cap how many exist.
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return gl !== null
  } catch {
    return false
  }
}
