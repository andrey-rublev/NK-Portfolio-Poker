# NK Portfolio — 3D Poker Table

An interactive portfolio rendered as a real 3D poker table (Three.js / react-three-fiber).
Each pocket card is a section — click it to flip the card and reveal the details.
Project data is **auto-updated from Devpost** (and optionally LinkedIn) by a scheduled
GitHub Action.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
```

## How the data works

Content lives in two layers that are merged at load time
([`src/data/portfolio.ts`](src/data/portfolio.ts)):

1. **`src/data/portfolio.json`** — the hand-edited source of truth. Edit this for
   anything you want to control directly (about, education, contact, awards, …).
   Card identity (`id`, `rank`, `suit`, `accent`) always comes from here.
2. **`src/data/generated/overrides.json`** — written by the fetch script. It maps a
   card `id` to a partial override (`bullets`, `actions`, `detail`, …) that is
   deep-merged over the base. If a fetch fails, the previous override is kept and the
   base still renders, so the build never breaks.

Run the fetcher locally:

```bash
npm run fetch:data
```

### Devpost (automatic ✅)

The script reads your Devpost handle from `owner.links.devpost` in
`portfolio.json` (or the `DEVPOST_USER` env var) and parses your public profile into
the **Projects** card. No API key needed.

### LinkedIn (manual export, by design ⚠️)

LinkedIn's User Agreement prohibits scraping and they actively block bots — there is no
safe, reliable way to auto-scrape your profile, and doing it with your session cookie
risks your account. So instead, drop an export at **`scripts/linkedin.json`** and the
fetcher merges it. Shape it by card `id`:

```json
{
  "about":     { "bullets": ["..."] },
  "work":      { "title": "Company", "detail": "...", "bullets": ["..."] },
  "education": { "bullets": ["..."] },
  "skills":    { "bullets": ["..."] }
}
```

You can generate this by hand, or from LinkedIn's official **"Get a copy of your data"**
export. (If you later want fully-automatic LinkedIn sync, the only robust route is a
paid API such as Proxycurl behind a serverless function — see `fetch-data.mjs` for the
extension point.)

## Deploy (GitHub Pages)

The included workflow ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml))
builds and deploys on every push to `main`, **daily at 07:00 UTC** (to pull in new
Devpost entries), and on manual dispatch.

1. Push this repo to GitHub.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. Done. The site publishes to `https://<user>.github.io/<repo>/`.

Optional repository **Variables** (Settings → Secrets and variables → Actions → Variables):

- `DEVPOST_USER` — override the Devpost handle.
- `VITE_BASE` — set to `/` if you deploy to a **user page** (`<user>.github.io`) or a
  **custom domain**. Defaults to `/<repo>/` for project pages.

### Other hosts (Vercel / Netlify)

Set the build command to `npm run build`, output dir `dist`, and `VITE_BASE=/`. Their
SPA routing handles deep links automatically (the generated `404.html` is harmless).
To keep data fresh there, run `npm run fetch:data` as part of the build.

## Stack

React 19 · TypeScript · Vite · Three.js · @react-three/fiber · @react-three/drei ·
@react-spring/three
