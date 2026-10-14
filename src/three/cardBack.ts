/**
 * The card back: a hand-drawn rendition of the classic Bicycle "Rider Back"
 * (first printed in 1887). A red print inside a white border; two cherubs on
 * bicycles in medallions above and below the front wheel's hub; scrollwork,
 * rosettes and palmettes in the bands around them; a winged mer-cherub in
 * each corner.
 *
 * Everything is vector paths in the card's 512 x 731 units, so it stays sharp
 * at any texture size. The design is mirror-symmetric about both centre lines,
 * so nearly everything is drawn once, for the top-left quadrant, and repeated
 * mirrored into the other three.
 */

const W = 512
const H = 731
const CX = W / 2
const CY = H / 2

const RED = '#dc1d2e'
const WHITE = '#f5f2eb'

/** The top medallion; the bottom one mirrors it. */
const MEDAL_Y = 243
const MEDAL_R = 102
/** The big wheel behind the medallions, centred on the card. */
const WHEEL_R = 116.5
const RING_W = 3.4

type Ctx = CanvasRenderingContext2D
type Pt = [number, number]

function white(ctx: Ctx) {
  ctx.fillStyle = WHITE
  ctx.strokeStyle = WHITE
}

function red(ctx: Ctx) {
  ctx.fillStyle = RED
  ctx.strokeStyle = RED
}

/** Run `draw` four times: as is, then mirrored into the other three quadrants. */
function quadrants(ctx: Ctx, draw: () => void) {
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    ctx.save()
    ctx.translate(CX, CY)
    ctx.scale(sx, sy)
    ctx.translate(-CX, -CY)
    draw()
    ctx.restore()
  }
}

function stroke(ctx: Ctx, width: number, ...paths: string[]) {
  ctx.lineWidth = width
  for (const d of paths) ctx.stroke(new Path2D(d))
}

function fill(ctx: Ctx, ...paths: string[]) {
  for (const d of paths) ctx.fill(new Path2D(d))
}

function disc(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

function ring(ctx: Ctx, x: number, y: number, r: number, width: number) {
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.stroke()
}

/** Fill a band of varying width along a polyline: the engraved line of the original. */
function band(ctx: Ctx, pts: Pt[], width: (t: number) => number) {
  const left: Pt[] = []
  const right: Pt[] = []
  pts.forEach(([x, y], i) => {
    const [ax, ay] = pts[Math.max(0, i - 1)]
    const [bx, by] = pts[Math.min(pts.length - 1, i + 1)]
    const len = Math.hypot(bx - ax, by - ay) || 1
    const w = width(i / (pts.length - 1)) / 2
    const nx = (-(by - ay) / len) * w
    const ny = ((bx - ax) / len) * w
    left.push([x + nx, y + ny])
    right.push([x - nx, y - ny])
  })
  ctx.beginPath()
  for (const [x, y] of left) ctx.lineTo(x, y)
  for (const [x, y] of right.reverse()) ctx.lineTo(x, y)
  ctx.closePath()
  ctx.fill()
}

/** Point and tangent [x, y, dx, dy] at t on a cubic Bezier [x0, y0, cx1, cy1, cx2, cy2, x1, y1]. */
function bezierAt(b: number[], t: number): [number, number, number, number] {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = b
  const u = 1 - t
  return [
    u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
    u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
    3 * u * u * (x1 - x0) + 6 * u * t * (x2 - x1) + 3 * t * t * (x3 - x2),
    3 * u * u * (y1 - y0) + 6 * u * t * (y2 - y1) + 3 * t * t * (y3 - y2),
  ]
}

/**
 * A tapering stroke along a cubic Bezier: `w0` wide at its start and `w1` at
 * its end, swelling by `swell` between.
 */
function ribbon(ctx: Ctx, b: number[], w0: number, w1: number, swell = 0) {
  const pts: Pt[] = []
  for (let i = 0; i <= 24; i += 1) {
    const [x, y] = bezierAt(b, i / 24)
    pts.push([x, y])
  }
  band(ctx, pts, (t) => w0 + (w1 - w0) * t + swell * Math.sin(Math.PI * t))
}

/**
 * A scroll's volute: a spiral from radius `r` at angle `a0` (radians,
 * clockwise from +x), winding `turns` times (negative = anticlockwise) and
 * closing in by `shrink` of its radius, ending in a knob.
 */
function volute(ctx: Ctx, x: number, y: number, r: number, a0: number, turns: number, width: number, shrink = 0.75) {
  const pts: Pt[] = []
  const steps = Math.ceil(Math.abs(turns) * 48)
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const a = a0 + t * turns * Math.PI * 2
    const rr = r * (1 - shrink * t)
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr])
  }
  band(ctx, pts, (t) => width * (1 - 0.35 * t))
  const [ex, ey] = pts[pts.length - 1]
  disc(ctx, ex, ey, width * 0.75)
}

/** An almond leaf from (x1, y1) to (x2, y2), `w` wide at its middle. */
function leaf(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, w: number) {
  const len = Math.hypot(x2 - x1, y2 - y1)
  const nx = (-(y2 - y1) / len) * w
  const ny = ((x2 - x1) / len) * w
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.quadraticCurveTo(mx + nx, my + ny, x2, y2)
  ctx.quadraticCurveTo(mx - nx, my - ny, x1, y1)
  ctx.fill()
}

/** A teardrop petal on a rosette: pointed at radius r0, round at r1. */
function petal(ctx: Ctx, cx: number, cy: number, a: number, r0: number, r1: number, w: number) {
  const c = Math.cos(a)
  const s = Math.sin(a)
  const h = w / 2
  const bx = cx + c * (r1 - h)
  const by = cy + s * (r1 - h)
  ctx.beginPath()
  ctx.moveTo(cx + c * r0, cy + s * r0)
  ctx.quadraticCurveTo(bx - s * h * 1.1, by + c * h * 1.1, bx - s * h, by + c * h)
  ctx.arc(bx, by, h, a + Math.PI / 2, a - Math.PI / 2, true)
  ctx.quadraticCurveTo(bx + s * h * 1.1, by - c * h * 1.1, cx + c * r0, cy + s * r0)
  ctx.fill()
}

/** The fractional part, for deterministic scatter (grass). */
const frac = (v: number) => v - Math.floor(v)

/* ---------- The field: border, keyline, panel rules and stipple ---------- */

function field(ctx: Ctx) {
  ctx.fillStyle = WHITE
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = RED
  ctx.beginPath()
  ctx.roundRect(27.5, 22.5, W - 55, H - 45, 4)
  ctx.fill()

  white(ctx)
  ctx.lineWidth = 2.8
  ctx.beginPath()
  ctx.roundRect(38.2, 33.1, W - 76.4, H - 66.2, 3)
  ctx.stroke()

  quadrants(ctx, () => {
    // Halftone stipple across the centre panel, clear of the medallions and
    // the curl in the panel's corner.
    const step = 4.4
    for (let x = CX - step / 2; x > 137; x -= step) {
      for (let y = CY - step / 2; y > 134; y -= step) {
        const d = Math.min(
          Math.hypot(x - CX, y - MEDAL_Y) - MEDAL_R,
          Math.hypot(x - CX, y - CY) - WHEEL_R,
        )
        if (d < 4 || Math.hypot(x - 166, y - 132.4) < 10) continue
        disc(ctx, x, y, 0.65 + 0.45 * Math.min(1, d / 30))
      }
    }

    // Triple rules between the panel and the bands. The corners are left
    // open for the corner figures; the innermost top rule ends in a curl.
    stroke(ctx, 1.4, `M 146 118.8 L ${CX} 118.8`, `M 146 124.9 L ${CX} 124.9`, `M 172 130.6 L ${CX} 130.6`)
    stroke(ctx, 1.4, `M 121.5 188 L 121.5 ${CY}`, `M 127.8 188 L 127.8 ${CY}`, `M 133.8 188 L 133.8 ${CY}`)
    volute(ctx, 166, 132.4, 6.2, -0.29, 1.25, 1.8)
  })
}

/* ---------- The wheel and the two medallions ---------- */

function wheel(ctx: Ctx) {
  white(ctx)
  // Tapered spokes from the hub to the inner rim; the medallions hide all but
  // the two fans either side of the hub.
  const n = 64
  for (let i = 0; i < n; i += 1) {
    const a = ((i + 0.5) / n) * Math.PI * 2
    const c = Math.cos(a)
    const s = Math.sin(a)
    const r0 = 16
    const r1 = 109
    ctx.beginPath()
    ctx.moveTo(CX + c * r0 - s * 0.35, CY + s * r0 + c * 0.35)
    ctx.lineTo(CX + c * r1 - s * 1.25, CY + s * r1 + c * 1.25)
    ctx.lineTo(CX + c * r1 + s * 1.25, CY + s * r1 - c * 1.25)
    ctx.lineTo(CX + c * r0 + s * 0.35, CY + s * r0 - c * 0.35)
    ctx.fill()
  }
  ring(ctx, CX, CY, WHEEL_R, RING_W)
  ring(ctx, CX, CY, 108.8, 1.4)
}

const BIRDS: Pt[] = [[185, 214], [198, 191], [211, 196], [221, 205], [193, 203], [207, 257], [217, 279]]

/** The left half of the top medallion's scene: grass, hills, water and birds. */
function landscape(ctx: Ctx) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(CX, MEDAL_Y, 95.4, 0, Math.PI * 2)
  ctx.clip()
  white(ctx)

  // Grass: tufts scattered evenly (an R2 low-discrepancy sequence) over the
  // foot of the medallion, denser toward the bottom, their blades leaning
  // out from the spindle like a fountain.
  for (let i = 0; i < 64; i += 1) {
    const x0 = 158 + frac(0.3 + i * 0.7548777) * 92 + (frac(i * 0.1234) - 0.5) * 6
    const y0 = 258 + Math.sqrt(frac(0.6 + i * 0.5698403)) * 82
    const out = (x0 - CX) / 96 // -1 at the rim, 0 at the spindle
    for (let k = 0; k < 4; k += 1) {
      const n = i * 4 + k
      const x = x0 + (frac(n * 0.4142) - 0.5) * 5
      const y = y0 + frac(n * 0.7071) * 3
      if (Math.hypot(x - CX, y - MEDAL_Y) > 94 || x > 251) continue
      const lean = out * 0.8 + (k - 1.5) * 0.3 + (frac(n * 0.381) - 0.5) * 0.5
      const len = 7 + frac(n * 0.618) * 9
      const tx = x + Math.sin(lean) * len
      const ty = y - Math.cos(lean) * len
      const cx = x + Math.sin(lean) * len * 0.15
      const cy = y - len * 0.6
      ctx.beginPath()
      ctx.moveTo(x - 0.65, y)
      ctx.quadraticCurveTo(cx, cy, tx, ty)
      ctx.quadraticCurveTo(cx + 0.4, cy, x + 0.65, y)
      ctx.fill()
    }
  }

  // Distant hills, and water below them.
  stroke(ctx, 1.5, 'M 158 241 C 168 238 176 226 186 225 C 194 224 198 232 206 234 C 214 236 222 235 236 237')
  stroke(ctx, 1.1, 'M 162 249 C 180 246 200 250 236 247', 'M 174 254.5 C 190 252 210 255 230 253')

  for (const [x, y] of BIRDS) {
    fill(ctx, `M ${x - 3.4} ${y - 1.6} L ${x} ${y + 1.3} L ${x + 3.4} ${y - 1.6} L ${x} ${y - 0.2} Z`)
  }
  ctx.restore()
}

/** The left half of the cherub on his bicycle, seen head-on. */
function rider(ctx: Ctx) {
  white(ctx)
  // Wing: feathers fanning out from his shoulder.
  fill(ctx, 'M 246 186 C 238 178 226 168 214 162 C 216 167 217 170 219 173 C 217 175 218 178 220 181 C 219 184 222 187 226 189 C 230 192 238 193 244 192 Z')
  // Leg: thigh, shin and the foot on its pedal.
  ribbon(ctx, [248, 223, 244, 231, 239, 242, 238.5, 252], 10.5, 8)
  ribbon(ctx, [238.5, 252, 238.5, 261, 240, 271, 242, 280], 7.5, 4.5)
  ribbon(ctx, [243, 281, 241, 282.5, 239, 283.5, 235.5, 284], 4.2, 3.4)
  // Arm hanging clear of his body, down to the handlebar.
  ribbon(ctx, [243, 184, 238, 190, 236, 200, 236.5, 210], 6.5, 5)
  ribbon(ctx, [236.5, 210, 237, 216, 238, 221, 239, 225.5], 5, 4.4)
  // Torso and head.
  fill(ctx, 'M 256 177 C 250 177 245.5 179 244.5 184 C 243 192 242 204 243 212 C 244 220 249 225 256 226 C 263 225 268 220 269 212 C 270 204 269 192 267.5 184 C 266.5 179 262 177 256 177 Z')
  ctx.beginPath()
  ctx.ellipse(CX, 164, 9.5, 10.5, 0, 0, Math.PI * 2)
  ctx.fill()
  disc(ctx, 248.5, 157.5, 3.6)
  disc(ctx, 252.5, 154, 3.8)
  disc(ctx, 256, 153, 3.6)
  disc(ctx, 246.8, 163, 3)
  ribbon(ctx, [252, 172, 252, 175, 252, 177, 252, 180], 4, 4)
  // Handlebar and hand.
  stroke(ctx, 2, `M 228 227 L ${CX} 227`)
  disc(ctx, 228, 227, 2)
  disc(ctx, 239.5, 226.5, 3.2)
  // The front wheel, edge-on: a rod between his legs that swells below his
  // feet around the wheel's hub.
  fill(ctx, 'M 256 226 C 258.4 240 258.4 270 258 284 C 262.5 296 262 320 256 338 C 250 320 249.5 296 254 284 C 253.6 270 253.6 240 256 226 Z')
  disc(ctx, CX, 304, 3.6)

  red(ctx)
  // Face, hair and feathers.
  stroke(ctx, 0.9, 'M 250.5 164 q 1.8 1.2 3.6 0', 'M 254 170.5 q 2 1 4 0', 'M 256 165.5 l 0 2.4')
  stroke(ctx, 0.8, 'M 246.5 158 q 2 -1.5 4 0', 'M 250.5 154.5 q 2 -1.5 4 0', 'M 245.5 163.5 q 1.5 -1.4 3 -0.4')
  stroke(
    ctx,
    0.8,
    'M 242 187 C 234 180 225 172 216 165',
    'M 241 189 C 234 184 227 179 219 175',
    'M 240 190.5 C 234 188 227 185 220.5 182',
    'M 239 191.5 C 235 191 230 190 225 188.5',
  )
  // Body modelling: chest, belly, hip, knee, and stippled shadow down his side.
  stroke(ctx, 0.9, 'M 247 189 q 4.5 3 9 1', 'M 248 217 q 4 2.5 8 3', 'M 244.5 224 q 3 1.5 6 1', 'M 239 253.5 q 3 1.5 5 0')
  disc(ctx, CX, 213, 0.9)
  for (const [x, y] of [[245.5, 196], [245, 200], [245, 204], [245.5, 208], [246.5, 212], [248, 216], [244, 236], [243, 241], [242.5, 246]] as Pt[]) {
    disc(ctx, x, y, 0.55)
  }
  // The wheel: its rim's centre line, and the spokes seen edge-on, crossing
  // at the hub.
  stroke(ctx, 0.8, 'M 256 286 L 256 334', 'M 252.4 294 L 259.6 314', 'M 259.6 294 L 252.4 314')
  ring(ctx, CX, 304, 2.2, 0.9)
}

function medallions(ctx: Ctx) {
  // The medallions sit over the wheel, hiding all but its sides.
  red(ctx)
  disc(ctx, CX, MEDAL_Y, MEDAL_R + RING_W / 2)
  disc(ctx, CX, H - MEDAL_Y, MEDAL_R + RING_W / 2)
  quadrants(ctx, () => landscape(ctx))
  white(ctx)
  for (const y of [MEDAL_Y, H - MEDAL_Y]) {
    ring(ctx, CX, y, MEDAL_R, RING_W)
    ring(ctx, CX, y, 96, 1.3)
  }
  quadrants(ctx, () => rider(ctx))
}

/** The crank (the one asymmetric touch) and the hub over it. */
function hub(ctx: Ctx) {
  white(ctx)
  fill(ctx, `M ${CX - 22} ${CY} C ${CX - 12} ${CY - 12} ${CX + 12} ${CY - 12} ${CX + 22} ${CY} C ${CX + 12} ${CY + 12} ${CX - 12} ${CY + 12} ${CX - 22} ${CY} Z`)

  ctx.save()
  ctx.translate(CX, CY)
  ctx.rotate((-56 * Math.PI) / 180)
  ctx.beginPath()
  ctx.roundRect(-50, -6.5, 100, 13, 6.5)
  ctx.fillStyle = RED
  ctx.fill()
  ctx.lineWidth = 2.4
  ctx.stroke()
  ctx.restore()

  red(ctx)
  disc(ctx, CX, CY, 12.9)
  white(ctx)
  disc(ctx, CX, CY, 10.7)
  red(ctx)
  disc(ctx, CX, CY, 8)
  white(ctx)
  disc(ctx, CX, CY, 3.8)
}

/* ---------- Ornament: corners, top band, side band ---------- */

/** A winged mer-cherub holding up a flower, his fish tail curling down the side band. */
function cornerFigure(ctx: Ctx) {
  white(ctx)
  // A volute in the corner, its stem running along the top to his wing, and
  // a scroll down the edge.
  ribbon(ctx, [102, 43.5, 84, 38, 62, 50, 48.8, 62.8], 1.2, 2.4, 0.4)
  volute(ctx, 58, 72, 13, -0.75 * Math.PI, -1.5, 2.4, 0.8)
  ribbon(ctx, [45.5, 80, 44, 93, 46, 105, 52.5, 112], 2, 1.8)
  volute(ctx, 56.5, 109, 4.2, Math.PI * 0.75, -1.1, 1.8)
  leaf(ctx, 72, 60, 74, 47, 3.4)
  leaf(ctx, 71, 60, 64, 52, 2.6)

  // Wings.
  fill(
    ctx,
    'M 94 106 C 84 104 66 104 50 110 C 55 112 56 114 56 115 C 60 115 62 116 63 118 C 66 118 68 119 69 121 C 76 121 86 118 94 113 Z',
    'M 100 90 C 96 80 96 66 104 52 C 106 49 108 48 110 48 C 112 56 114 62 118 66 C 116 70 117 74 119 78 C 116 80 114 84 112 90 Z',
  )
  // Fish tail curling down beside him and sweeping away down the band, a fin
  // fanning from his hips, and another trailing to the right.
  const tail = [110, 124, 132, 134, 136, 168, 116, 186]
  const sweep = [116, 186, 100, 196, 76, 194, 58, 207]
  ribbon(ctx, tail, 22, 12)
  ribbon(ctx, sweep, 12, 2.2)
  leaf(ctx, 134, 128, 162, 127, 6)
  leaf(ctx, 136, 132, 165, 139, 5.5)
  leaf(ctx, 135, 136, 158, 150, 5)
  leaf(ctx, 104, 128, 90, 150, 5)
  leaf(ctx, 108, 130, 97, 156, 5)
  leaf(ctx, 112, 131, 106, 158, 4.5)
  // Body, neck, head and hair.
  fill(ctx, 'M 86 93 C 94 87 112 87 124 91 C 131 94 134 102 131 110 C 129 116 128 121 124 126 C 116 129 104 129 96 125 C 91 120 90 112 89 106 C 87 101 85 97 86 93 Z')
  ribbon(ctx, [86, 87, 88, 89, 90, 91, 93, 94], 8, 9)
  disc(ctx, 82, 80, 10.5)
  disc(ctx, 79, 75.5, 9.5)
  disc(ctx, 72.5, 71.5, 4)
  // Arms: one raised to the flower, one across his body.
  ribbon(ctx, [120, 93, 128, 88, 134, 82, 139, 77], 6.5, 4.5)
  disc(ctx, 141, 74, 3.2)
  ribbon(ctx, [92, 102, 102, 114, 120, 117, 135, 113], 6, 4.2)
  disc(ctx, 137.5, 112.5, 3)
  stroke(ctx, 1.8, 'M 140 71 L 137.4 57')
  leaf(ctx, 137.4, 56, 137.4, 42.5, 5.2)
  leaf(ctx, 137.4, 56, 124.5, 54.5, 4.6)
  leaf(ctx, 137.4, 56, 148, 59.5, 4.2)
  disc(ctx, 137.4, 56, 2)

  red(ctx)
  stroke(
    ctx,
    0.8,
    // Feathers.
    'M 103 89 C 101 78 103 64 108 52',
    'M 107 89 C 106 80 108 70 112 62',
    'M 110 89 C 110 82 112 76 115 70',
    'M 92 108 C 80 108 66 110 54 112',
    'M 92 111 C 82 112 72 114 62 117',
    'M 92 113 C 84 115 76 117 68 120',
    // Fins.
    'M 136 128 L 159 127',
    'M 138 132 L 162 138.5',
    'M 137 136 L 156 148.5',
    'M 104 130 L 92.5 148',
    'M 108 132 L 99 153',
    'M 112 133 L 107 155',
  )
  // Engraved lines running down the tail.
  for (const [b, w0, w1] of [[tail, 22, 12], [sweep, 12, 2.2]] as [number[], number, number][]) {
    for (const f of [-0.28, 0, 0.28]) {
      const pts: Pt[] = []
      for (let i = 2; i <= 22; i += 1) {
        const t = i / 24
        const [x, y, dx, dy] = bezierAt(b, t)
        const len = Math.hypot(dx, dy)
        const o = f * (w0 + (w1 - w0) * t)
        pts.push([x - (dy / len) * o, y + (dx / len) * o])
      }
      band(ctx, pts, (t) => 0.8 * (1 - 0.5 * t))
    }
  }
  stroke(
    ctx,
    0.85,
    // Hairline, strands and face, looking down to the right.
    'M 73.5 82 C 75 75 82 71 90.5 74',
    'M 76 69.5 q 4 -2 8 0',
    'M 74.5 74 q 4 -2.5 9 -1.5',
    'M 82 81 q 1.6 1 3.2 0',
    'M 87.5 82.5 q 1.2 0.8 2.4 0',
    'M 89.2 83.5 q 1.5 2.5 -0.5 3.5',
    'M 85 88.5 q 1.6 0.6 3 -0.4',
    'M 76 80 q -1.5 2 0 4',
    // Chest and belly.
    'M 99 98 q 6 4 12 1',
    'M 112 99 q 5 3 10 -1',
    'M 108 112 q 2 3 6 3',
  )
  for (let k = 0; k < 9; k += 1) disc(ctx, 97 + k * 3.2, 125 + Math.sin(k * 0.5) * 1.2, 0.5)

  // A sunflower at the end of a scroll, below him, and crossed stems.
  white(ctx)
  volute(ctx, 62, 144, 12.5, 0.2 * Math.PI, 0.85, 2.2, 0.25)
  for (let k = 0; k < 6; k += 1) {
    petal(ctx, 62, 144, Math.PI * (0.95 + k * 0.2), 3.5, 8.5, 2.6)
  }
  disc(ctx, 62, 144, 2.2)
  ribbon(ctx, [71.7, 151.1, 81, 155, 90, 148, 91, 138], 2.2, 1.2)
  disc(ctx, 91, 137.5, 1.6)
  stroke(ctx, 1.6, 'M 46 158 L 46 188', 'M 46 158 q -1 -5 4 -6')
  stroke(ctx, 1.7, 'M 54 162 L 75 190', 'M 75 162 L 54 190')
}

function topBand(ctx: Ctx) {
  white(ctx)
  // Rosette: a daisy in a scroll ring, crested with curled tendrils, the ring
  // running on into a long sweep that rises beside the palmette.
  const rx = 170
  const ry = 79.5
  for (let k = 0; k < 8; k += 1) petal(ctx, rx, ry, (k * Math.PI) / 4 - Math.PI / 2, 5.2, 16, 4.8)
  disc(ctx, rx, ry, 3)
  volute(ctx, rx, ry, 24.5, 0.3 * Math.PI, 0.82, 2.4, 0)
  disc(ctx, rx + Math.cos(0.7 * Math.PI) * 24.5, ry + Math.sin(0.7 * Math.PI) * 24.5, 1.6)
  ribbon(ctx, [184.4, 99.3, 196, 110, 218, 108, 226, 92], 2.4, 2.2, 0.4)
  ribbon(ctx, [226, 92, 232, 80, 233, 56, 236, 45], 2.2, 1.6)
  disc(ctx, 236, 43.5, 2.2)
  for (const deg of [256, 272, 288, 304]) {
    const a = (deg * Math.PI) / 180
    const c = Math.cos(a)
    const s = Math.sin(a)
    const [x0, y0] = [rx + c * 24.5, ry + s * 24.5]
    const [x1, y1] = [rx + c * 35, ry + s * 35]
    ribbon(ctx, [x0, y0, x0 + c * 5 - s * 3, y0 + s * 5 + c * 3, x1 - s * 3, y1 + c * 3, x1, y1], 1.8, 1.2)
    disc(ctx, x1, y1, 1.5)
  }

  // A scroll from the ring up to a volute, and the feathered dart pointing
  // up at the palmette.
  ribbon(ctx, [192, 70, 196, 64, 200, 58, 204, 55.8], 2, 1.8)
  volute(ctx, 204, 50.3, 5.5, Math.PI / 2, -1.2, 2)
  leaf(ctx, 206, 63, 216, 66, 3)
  leaf(ctx, 178, 103, 221, 71, 7.5)
  red(ctx)
  stroke(ctx, 0.9, 'M 182 100 L 218 73.2')
  for (const t of [0.3, 0.48, 0.66]) {
    const px = 178 + 43 * t
    const py = 103 - 32 * t
    stroke(ctx, 0.9, `M ${px - 0.3} ${py - 0.4} L ${px - 4} ${py - 1.2}`)
  }
  white(ctx)

  // The palmette in a spade, its lobes curling in.
  stroke(ctx, 2.6, 'M 256 39.6 C 250 50 228 60 225 82 C 223 96 228 108 237 111 C 244 113 249 107 247 101 C 245 96 239 97 239.5 101')
  stroke(ctx, 1.3, 'M 256 50 C 251 58 234 68 231.5 85 C 230 95 233 101 237 103')
  fill(ctx, 'M 256 58.5 L 260.3 64.5 L 256 70.5 L 251.7 64.5 Z')
  ribbon(ctx, [256, 70, 256, 80, 256, 92, 256, 103], 2.4, 2.8)
  leaf(ctx, 253.5, 96, 244.5, 73.7, 3.3)
  leaf(ctx, 253.5, 97, 240, 81, 3.3)
  leaf(ctx, 253.5, 98, 239, 89, 3.1)
  leaf(ctx, 253.5, 99, 242, 96, 2.8)
}

function sideBand(ctx: Ctx) {
  white(ctx)
  // The corner figure's tail runs on as a double stem down the band's outer
  // edge, then turns in to a pair of volutes either side of a leafy stem.
  ribbon(ctx, [58, 207, 52, 220, 51, 244, 52, 262], 2, 2, 0.4)
  ribbon(ctx, [52, 262, 54, 280, 66, 290, 84, 291], 2, 1.8)
  ribbon(ctx, [64.5, 210, 58, 224, 56.5, 246, 57.5, 262], 1.1, 1.1, 0.3)
  ribbon(ctx, [57.5, 262, 59, 276, 68, 285, 80, 286.5], 1.1, 1)
  ribbon(ctx, [84, 291, 72, 290, 60, 291, 55.5, 294.5], 1.8, 1.8)
  volute(ctx, 55.5, 304, 9.5, -Math.PI / 2, -1.4, 2.1)
  ribbon(ctx, [84, 291, 96, 290, 106, 291, 108.5, 294.5], 1.8, 1.8)
  volute(ctx, 108.5, 304, 9.5, -Math.PI / 2, 1.4, 2.1)
  ribbon(ctx, [84, 291, 84, 305, 84, 320, 84, 334], 2.2, 1.4)
  leaf(ctx, 84, 304, 73, 320, 4.6)
  leaf(ctx, 84, 304, 95, 320, 4.6)
  leaf(ctx, 84, 318, 77, 329, 3.4)
  leaf(ctx, 84, 318, 91, 329, 3.4)
  stroke(ctx, 1.4, 'M 43 323 l 7 7', 'M 50 323 l -7 7')

  // The big volute filling the band, its stem rising to a hook, and a bud
  // above it.
  volute(ctx, 88, 256, 30, -0.705, 2, 2.4, 0.87)
  ribbon(ctx, [110.8, 236.6, 116, 228, 118, 216, 114, 208], 2.4, 1.8)
  volute(ctx, 109.5, 211, 4.6, 0, -1.1, 1.8)
  leaf(ctx, 84, 228, 69, 207, 6.2)
  leaf(ctx, 82, 228, 63, 219, 4.4)
  leaf(ctx, 86, 227, 85, 205, 4.4)

  // The heart at the band's middle: a palmette pointing out to the edge.
  stroke(ctx, 2.4, `M 44 ${CY} C 52 354 66 340 88 337 C 104 335 114 342 113 351 C 112 358 104 360 101 356 C 98 352 102 348 106 350`)
  stroke(ctx, 1.3, `M 55 ${CY} C 63 356 76 346 90 344 C 101 343 107 348 106 353`)
  fill(ctx, `M 56 ${CY} L 63 361.5 L 70 ${CY} L 63 369.5 Z`)
  ribbon(ctx, [70, CY, 80, CY, 92, CY, 104, CY], 2.4, 2.8)
  leaf(ctx, 101, 363.5, 74, 355.5, 3.3)
  leaf(ctx, 102, 363, 80, 350.5, 3.3)
  leaf(ctx, 103, 362.5, 88, 348, 3.1)
  leaf(ctx, 104, 362, 96, 349, 2.8)
}

/** Draws the card back at `scale` pixels per card unit. */
export function drawCardBack(scale = 2): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = W * scale
  c.height = H * scale
  const ctx = c.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  field(ctx)
  wheel(ctx)
  medallions(ctx)
  hub(ctx)
  quadrants(ctx, () => {
    cornerFigure(ctx)
    topBand(ctx)
    sideBand(ctx)
  })
  return c
}
