#!/usr/bin/env node
/**
 * Static hosts like GitHub Pages don't rewrite unknown paths to index.html, so
 * a deep link such as /research returns a 404. Copying index.html to 404.html
 * makes the host serve the app for any path; the app then reads the URL and
 * opens the right card. (Vercel/Netlify do this automatically, so the extra
 * file is harmless there.)
 */
import { copyFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dist = join(__dirname, '..', 'dist')
const index = join(dist, 'index.html')
const fallback = join(dist, '404.html')

if (existsSync(index)) {
  copyFileSync(index, fallback)
  console.log('[spa-fallback] Wrote dist/404.html')
} else {
  console.log('[spa-fallback] dist/index.html not found; skipping')
}
