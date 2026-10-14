import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

import { cloudflare } from '@cloudflare/vite-plugin'

/**
 * Preload the Latin subsets of the two self-hosted fonts. They are referenced
 * only from CSS, so without this the browser finds them late -- after the
 * stylesheet has downloaded and been applied. The file names are hashed at
 * build time, so the tags are injected from the emitted bundle.
 */
function preloadFonts(): Plugin {
  let base = '/'
  return {
    name: 'preload-fonts',
    apply: 'build',
    configResolved(config) {
      base = config.base
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle) return
        return Object.keys(ctx.bundle)
          .filter((file) => /(mulish|cormorant-garamond)-latin-wght-normal-[^/]*\.woff2$/.test(file))
          .map((file) => ({
            tag: 'link',
            attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `${base}${file}`, crossorigin: '' },
            injectTo: 'head' as const,
          }))
      },
    },
  }
}

// https://vite.dev/config/
// `base` lets the same build work at a sub-path (e.g. /my-repo/) as well as at
// the domain root; set VITE_BASE to override. It defaults to "/".
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), cloudflare(), preloadFonts()],
  // Honour an externally assigned port (e.g. the preview harness sets PORT);
  // otherwise fall back to Vite's default.
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
  },
})
