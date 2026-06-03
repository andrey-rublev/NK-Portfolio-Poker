import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
// `base` lets the same build work at a sub-path (GitHub Pages project sites,
// e.g. /my-repo/) or at the root (Vercel/Netlify/custom domain). The deploy
// workflow sets VITE_BASE; locally it defaults to "/".
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), cloudflare()],
})