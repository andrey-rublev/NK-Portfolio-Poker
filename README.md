# NK Portfolio — 3D Poker Table

An interactive portfolio rendered as a real 3D poker table (Three.js / react-three-fiber).
Each pocket card is a section — click it to flip the card and reveal the details.
All content is maintained by hand in [`src/data/portfolio.json`](src/data/portfolio.json).

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
```

## How the data works

All content is hand-edited in **[`src/data/portfolio.json`](src/data/portfolio.json)** —
each card's `label`, `title`, `detail`, `bullets`, `actions`, and identity (`id`, `rank`,
`suit`, `accent`). To update the site (new role, project, award, …), edit that file and
redeploy. `src/data/portfolio.ts` decides which cards are seat hands vs. community cards.

`src/data/generated/overrides.json` is reserved for optional overrides that deep-merge
over the base, but it is empty by default — there is **no automatic Devpost/LinkedIn
scraping**. (A best-effort `scripts/fetch-data.mjs` + `npm run fetch:data` remain in the
repo if you ever want to regenerate Devpost data manually, but nothing runs it for you.)

## Deploy

Any static host works (Cloudflare Pages / Vercel / Netlify): build command
`npm run build`, output dir `dist`. Set `VITE_BASE=/` when serving from the domain
root; for a sub-path (e.g. GitHub Pages project sites) set it to `/<repo>/`. SPA
routing handles deep links automatically (the generated `404.html` is harmless).

## Stack

React 19 · TypeScript · Vite · Three.js · @react-three/fiber · @react-three/drei ·
@react-spring/three
