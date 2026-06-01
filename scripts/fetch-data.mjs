#!/usr/bin/env node
/**
 * Pulls live portfolio data and writes it to src/data/generated/overrides.json,
 * which is deep-merged over src/data/portfolio.json at load time (see
 * src/data/portfolio.ts).
 *
 * Design goals:
 *  - NEVER fail the build. Any fetch/parse error is caught and the previous
 *    overrides are left untouched.
 *  - Only overwrite the fields a source can reasonably provide; identity fields
 *    (rank, suit, accent, id) always come from the base file.
 *
 * Sources:
 *  - Devpost  : public profile page, parsed best-effort (no official API exists).
 *  - LinkedIn : LinkedIn forbids scraping and has no open profile API, so this
 *               reads an optional, user-supplied export file instead
 *               (scripts/linkedin.json). See README for how to populate it.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const BASE_PATH = join(ROOT, 'src', 'data', 'portfolio.json')
const OVERRIDES_PATH = join(ROOT, 'src', 'data', 'generated', 'overrides.json')
const LINKEDIN_EXPORT_PATH = join(__dirname, 'linkedin.json')

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return fallback
  }
}

function log(msg) {
  console.log(`[fetch-data] ${msg}`)
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Pull the Devpost username out of a profile URL or the DEVPOST_USER env var. */
function getDevpostUser(base) {
  if (process.env.DEVPOST_USER) return process.env.DEVPOST_USER.trim()
  const url = base?.owner?.links?.devpost
  if (!url) return null
  const m = url.match(/devpost\.com\/([^/?#]+)/i)
  return m ? m[1] : null
}

/**
 * Parse a Devpost profile page into a list of { title, url, tagline }.
 * Devpost markup changes over time, so this tries a couple of resilient
 * strategies and tolerates partial matches.
 */
function parseDevpost(html) {
  const projects = []
  const seen = new Set()

  // Each project is an anchor with class "link-to-software" wrapping a card.
  const anchorRe =
    /<a[^>]*class="[^"]*link-to-software[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  let m
  while ((m = anchorRe.exec(html)) !== null) {
    const url = m[1]
    const inner = m[2]
    if (seen.has(url)) continue
    seen.add(url)

    const titleMatch =
      inner.match(/<h5[^>]*>([\s\S]*?)<\/h5>/i) ||
      inner.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)
    const taglineMatch =
      inner.match(/<p[^>]*class="[^"]*tagline[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ||
      inner.match(/<p[^>]*>([\s\S]*?)<\/p>/i)

    const title = titleMatch
      ? decodeEntities(titleMatch[1].replace(/<[^>]+>/g, ''))
      : ''
    const tagline = taglineMatch
      ? decodeEntities(taglineMatch[1].replace(/<[^>]+>/g, ''))
      : ''

    if (title) projects.push({ title, url, tagline })
  }

  return projects
}

async function fetchDevpost(user) {
  if (!user) {
    log('No Devpost user configured (owner.links.devpost or DEVPOST_USER); skipping.')
    return null
  }
  const profileUrl = `https://devpost.com/${user}`
  log(`Fetching Devpost projects for "${user}"...`)
  const res = await fetch(profileUrl, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Devpost responded ${res.status}`)
  const html = await res.text()
  const projects = parseDevpost(html)
  log(`Parsed ${projects.length} Devpost project(s).`)
  if (projects.length === 0) return null

  const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)
  const top = projects.slice(0, 6)
  return {
    bullets: top.map((p) =>
      p.tagline ? `${p.title} — ${clip(p.tagline, 96)}` : p.title,
    ),
    actions: [
      ...top.slice(0, 2).map((p) => ({ label: p.title.slice(0, 22), href: p.url })),
      { label: 'All projects', href: profileUrl },
    ],
    source: 'devpost',
  }
}

/**
 * LinkedIn merge. Scraping LinkedIn violates their User Agreement and is
 * actively blocked, so we read a user-provided export instead. Drop a file at
 * scripts/linkedin.json shaped like:
 *   { "about": { "bullets": [...] }, "work": { "title": "...", "bullets": [...] },
 *     "education": {...}, "skills": {...} }
 * Each key maps to a card id and is merged as-is.
 */
function loadLinkedIn() {
  if (!existsSync(LINKEDIN_EXPORT_PATH)) {
    log('No scripts/linkedin.json present; skipping LinkedIn (see README).')
    return null
  }
  const data = readJson(LINKEDIN_EXPORT_PATH, null)
  if (!data) {
    log('scripts/linkedin.json could not be parsed; skipping.')
    return null
  }
  log('Merged LinkedIn data from scripts/linkedin.json.')
  return data
}

async function main() {
  const base = readJson(BASE_PATH, null)
  if (!base) {
    log('Could not read base portfolio.json; aborting without changes.')
    process.exit(0)
  }

  // Start from the existing overrides so a failed source keeps its last value.
  const overrides = readJson(OVERRIDES_PATH, {})
  const meta = overrides._meta ?? {}
  meta.note =
    'Auto-generated by scripts/fetch-data.mjs. Do not edit by hand. Maps card id -> partial content override that is deep-merged over src/data/portfolio.json at load time.'
  meta.sources = meta.sources ?? {}

  // --- Devpost ---
  try {
    const devpost = await fetchDevpost(getDevpostUser(base))
    if (devpost) {
      overrides.projects = devpost
      meta.sources.devpost = { ok: true, at: new Date().toISOString() }
    }
  } catch (err) {
    log(`Devpost fetch failed (keeping previous): ${err.message}`)
    meta.sources.devpost = { ok: false, at: new Date().toISOString(), error: err.message }
  }

  // --- LinkedIn (optional export) ---
  try {
    const linkedin = loadLinkedIn()
    if (linkedin && typeof linkedin === 'object') {
      for (const [cardId, value] of Object.entries(linkedin)) {
        overrides[cardId] = { ...(overrides[cardId] ?? {}), ...value, source: 'linkedin' }
      }
      meta.sources.linkedin = { ok: true, at: new Date().toISOString() }
    }
  } catch (err) {
    log(`LinkedIn merge failed (keeping previous): ${err.message}`)
    meta.sources.linkedin = { ok: false, at: new Date().toISOString(), error: err.message }
  }

  meta.lastUpdated = new Date().toISOString()
  overrides._meta = meta

  writeFileSync(OVERRIDES_PATH, JSON.stringify(overrides, null, 2) + '\n')
  log(`Wrote ${OVERRIDES_PATH}`)
}

main().catch((err) => {
  // Last-resort guard: never fail the pipeline.
  log(`Unexpected error (no changes written): ${err.message}`)
  process.exit(0)
})
