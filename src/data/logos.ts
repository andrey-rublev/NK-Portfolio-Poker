import aws from '../assets/skills/aws.svg'
import c from '../assets/skills/c.svg'
import dart from '../assets/skills/dart.svg'
import fastapi from '../assets/skills/fastapi.svg'
import git from '../assets/skills/git.svg'
import java from '../assets/skills/java.svg'
import matlab from '../assets/skills/matlab.svg'
import python from '../assets/skills/python.svg'
import r from '../assets/skills/r.svg'
import react from '../assets/skills/react.svg'
import typescript from '../assets/skills/typescript.svg'
import mercor from '../assets/orgs/mercor.svg'
import purdue from '../assets/orgs/purdue.svg'
import rtx from '../assets/orgs/rtx.svg'
import tompkins from '../assets/orgs/tompkins.png'
import transpira from '../assets/orgs/transpira.png'

/**
 * Logos shown beside skills, keyed by the skill exactly as the portfolio data
 * writes it; a skill without one keeps its plain bullet. From Devicon
 * (devicon.dev, MIT licence).
 */
const SKILLS: Record<string, string> = {
  Python: python,
  Java: java,
  C: c,
  TypeScript: typescript,
  Dart: dart,
  R: r,
  MATLAB: matlab,
  React: react,
  FastAPI: fastapi,
  'Git/GitHub': git,
  AWS: aws,
}

/**
 * Logos shown beside a job or school, matched against the start of its
 * heading (first match wins, so the more specific names come first). Purdue's
 * and RTX's are from Wikimedia Commons; the others are from each one's site.
 */
const ORGS: [string, string][] = [
  ['Purdue Datamine RTX', rtx],
  ['Purdue', purdue],
  ['Mercor', mercor],
  ['Transpira Labs', transpira],
  ['Obra D. Tompkins High School', tompkins],
]

export function skillLogoUrl(skill: string): string | undefined {
  return SKILLS[skill]
}

export function orgLogoUrl(heading: string): string | undefined {
  return ORGS.find(([name]) => heading.startsWith(name))?.[1]
}

const images = new Map<string, HTMLImageElement>()

/**
 * Loads every logo for the cards, which are painted onto canvases and so need
 * the pictures in hand before they are drawn. A logo that fails to load is
 * left out, and its line is drawn without it.
 */
export function logosReady(): Promise<void> {
  const urls = new Set([...Object.values(SKILLS), ...ORGS.map(([, url]) => url)])
  return Promise.all(
    [...urls].map(async (url) => {
      const img = new Image()
      img.src = url
      try {
        await img.decode()
        images.set(url, img)
      } catch {
        // Drawn without its logo.
      }
    }),
  ).then(() => undefined)
}

/** A logo loaded by logosReady, ready to draw. */
export function logoImage(url: string | undefined): HTMLImageElement | undefined {
  return url ? images.get(url) : undefined
}
