import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

/**
 * Wait for the web fonts to load before first render so the canvas card
 * textures are drawn with Mulish/Cormorant rather than a system fallback.
 * Falls back to rendering after a short timeout if the fonts are slow/offline.
 */
async function preloadFonts() {
  if (!('fonts' in document)) return
  const faces = [
    '400 16px "Mulish"',
    '600 16px "Mulish"',
    '700 16px "Mulish"',
    '800 16px "Mulish"',
    '900 16px "Mulish"',
    '700 16px "Cormorant Garamond"',
  ]
  try {
    await Promise.race([
      Promise.all(faces.map((f) => document.fonts.load(f))),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ])
  } catch {
    /* fall back to system fonts */
  }
}

preloadFonts().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
