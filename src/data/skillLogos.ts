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

/**
 * Logos shown beside skills, keyed by the skill exactly as the portfolio data
 * writes it; a skill without one keeps its plain bullet. The artwork is from
 * Devicon (devicon.dev, MIT licence).
 */
const LOGOS: Record<string, string> = {
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

export function skillLogoUrl(skill: string): string | undefined {
  return LOGOS[skill]
}

const images = new Map<string, HTMLImageElement>()

/**
 * Loads every logo for the cards, which are painted onto canvases and so need
 * the pictures in hand before they are drawn. A logo that fails to load is
 * left out, and its skill keeps its plain bullet.
 */
export function skillLogosReady(): Promise<void> {
  return Promise.all(
    Object.entries(LOGOS).map(async ([skill, url]) => {
      const img = new Image()
      img.src = url
      try {
        await img.decode()
        images.set(skill, img)
      } catch {
        // Drawn without its logo.
      }
    }),
  ).then(() => undefined)
}

/** A logo loaded by skillLogosReady, ready to draw. */
export function skillLogoImage(skill: string): HTMLImageElement | undefined {
  return images.get(skill)
}
