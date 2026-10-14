/**
 * The canvas draws frames only on demand, so the first frame after a pause
 * reports the whole pause as its delta. Animations step by at most this much,
 * so they ease out of a rest instead of jumping straight to their end.
 */
const MAX_STEP = 1 / 20

export const frameStep = (delta: number) => Math.min(delta, MAX_STEP)

/** Below this, an eased value is treated as having arrived (and snapped). */
export const SETTLED = 5e-4
