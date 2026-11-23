/**
 * Napkin-math question families, in the style of fermi.gg: each answer is
 * calculated exactly from the specs in these tables (which the answer's source
 * lists), and the guide runs the same sum on rounded numbers. Add a row to any
 * table to add questions.
 */
import { question, round, sci } from './build'
import type { Question } from './types'

const big = (n: number) => (n >= 1e15 ? sci(n) : round(n))
const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

// ---------------------------------------------------------------------------
// Containers and objects, shared by several families
// ---------------------------------------------------------------------------

interface Container {
  /** As it reads in a question: “a school bus”. */
  name: string
  /** Inside volume in m³. */
  volume: number
  /** How the volume was worked out. */
  spec: string
}

const box = (name: string, l: number, w: number, h: number, note: string): Container => ({
  name,
  volume: l * w * h,
  spec: `${note}: ≈ ${l} × ${w} × ${h} m`,
})

const C = {
  bus: box('a school bus', 9, 2.3, 1.9, 'Inside a full-size school bus'),
  pool: box('an Olympic swimming pool', 50, 25, 2, 'Olympic pool, at the 2 m minimum depth'),
  backyardPool: box('a backyard swimming pool', 8, 4, 1.5, 'A typical in-ground backyard pool'),
  bathtub: box('a bathtub', 1.5, 0.7, 0.4, 'Inside a standard bathtub, filled to the brim'),
  shipping: box('a 40-foot shipping container', 12.03, 2.35, 2.39, 'Inside a standard 40-ft container (ISO spec)'),
  elevator: box('an elevator', 2, 1.5, 2.4, 'Inside a typical office elevator car'),
  bedroom: box('a bedroom', 4, 3.5, 2.5, 'A mid-sized bedroom'),
  garage: box('a two-car garage', 6, 6, 2.4, 'A typical two-car garage'),
  suitcase: box('a carry-on suitcase', 0.56, 0.45, 0.25, 'The IATA carry-on size limit'),
  shoebox: box('a shoebox', 0.33, 0.2, 0.12, 'A typical adult shoebox'),
  fridge: { name: 'a fridge', volume: 0.566, spec: 'A 20-cubic-foot fridge: 20 × 0.0283 m³' },
  jug: { name: 'a 1-gallon jug', volume: 0.003785, spec: '1 US gallon = 3.785 litres' },
  esb: { name: 'the Empire State Building', volume: 1_047_723, spec: 'Empire State Building: ≈ 37 million cubic feet inside (Empire State Realty Trust)' },
  pyramid: { name: 'the Great Pyramid of Giza', volume: 2_583_283, spec: 'Great Pyramid: ≈ ⅓ × 230.3² × 146.6 m (original size)' },
} satisfies Record<string, Container>

interface Thing {
  singular: string
  plural: string
  /** Volume of one, in m³. */
  volume: number
  /** Its size, for the guide. */
  size: string
  /** Fraction of a container they fill when poured in loosely. */
  packing: number
}

const sphere = (singular: string, plural: string, diameterCm: number): Thing => ({
  singular,
  plural,
  volume: (Math.PI / 6) * (diameterCm / 100) ** 3,
  size: `${diameterCm} cm across`,
  packing: 0.64,
})

const THINGS: Thing[] = [
  sphere('tennis ball', 'tennis balls', 6.7),
  sphere('golf ball', 'golf balls', 4.27),
  sphere('ping-pong ball', 'ping-pong balls', 4),
  sphere('basketball', 'basketballs', 24),
  sphere('soccer ball', 'soccer balls', 22),
  sphere('baseball', 'baseballs', 7.4),
  sphere('marble', 'marbles', 1.6),
  sphere('bowling ball', 'bowling balls', 21.8),
  { singular: 'LEGO 2×4 brick', plural: 'LEGO 2×4 bricks', volume: 0.0318 * 0.0158 * 0.0114, size: '3.2 × 1.6 × 1.1 cm with studs', packing: 0.6 },
  { singular: 'die', plural: 'dice', volume: 0.016 ** 3, size: 'a 1.6 cm cube', packing: 0.6 },
  { singular: 'AA battery', plural: 'AA batteries', volume: Math.PI * 0.00725 ** 2 * 0.0505, size: '1.45 cm wide and 5.05 cm long', packing: 0.6 },
  { singular: 'US penny', plural: 'US pennies', volume: Math.PI * 0.009525 ** 2 * 0.00152, size: '19.05 mm across and 1.52 mm thick', packing: 0.6 },
]

const CONTAINERS_FOR_FILLING: Container[] = [C.shoebox, C.suitcase, C.jug, C.fridge, C.bathtub, C.elevator, C.bus, C.bedroom, C.garage, C.shipping, C.pool, C.esb, C.pyramid]

const fitQuestions: Question[] = THINGS.flatMap((t) => {
  const options = CONTAINERS_FOR_FILLING.map((c) => ({ c, n: (c.volume * t.packing) / t.volume })).filter(({ n }) => n >= 20 && n <= 5e10)
  return options.map(({ c, n }) =>
    question('everyday', `How many ${t.plural} would fit inside ${c.name}?`, Math.round(n), t.plural, n > 1e6 ? 'hard' : 'medium', `Calculated: ${c.spec}; ${Math.round(t.packing * 100)}% packing; one ${t.singular} is ${t.size}`, [
      { step: `${cap(c.name)} ≈ ${round(c.volume, 3)} m³`, source: c.spec + '.' },
      { step: `One ${t.singular} ≈ ${round(t.volume * 1e6, 2)} cm³`, source: `It’s ${t.size}.` },
      {
        step: `Poured in, they fill ≈ ${Math.round(t.packing * 100)}% of the space`,
        source: t.packing === 0.64 ? 'Randomly packed balls fill ≈ 64% of a container; the rest is gaps.' : 'Loosely tipped-in odd shapes leave ≈ 40% gaps.',
      },
      { step: `${round(c.volume, 3)} m³ × ${t.packing} ÷ ${round(t.volume * 1e6, 2)} cm³ ≈ ${big(n)}`, source: 'Usable volume ÷ volume of one (1 m³ = 1 million cm³).' },
    ]),
  )
})

// ---------------------------------------------------------------------------
// What would it cost to fill it?
// ---------------------------------------------------------------------------

/** [liquid, US dollars per US gallon, source] — 2023 US averages */
const LIQUIDS: [string, number, string][] = [
  ['milk', 4.0, 'BLS average US price of whole milk, 2023 (≈ $4.00 a gallon)'],
  ['gasoline', 3.52, 'US EIA average retail price of regular gasoline, 2023 ($3.52 a gallon)'],
  ['diesel', 4.21, 'US EIA average retail price of diesel, 2023 ($4.21 a gallon)'],
]
const GALLONS_PER_M3 = 264.172

const fillQuestions: Question[] = LIQUIDS.flatMap(([liquid, price, source]) =>
  [C.bathtub, C.backyardPool, C.bus, C.shipping, C.pool, C.esb].map((c) => {
    const gallons = c.volume * GALLONS_PER_M3
    return question('money', `What would it cost to fill ${c.name} with ${liquid}?`, Math.round(gallons * price), 'US dollars', c.volume > 1000 ? 'hard' : 'medium', `Calculated: ${c.spec}; ${source}`, [
      { step: `${cap(c.name)} ≈ ${round(c.volume, 3)} m³`, source: c.spec + '.' },
      { step: `≈ ${big(gallons)} US gallons`, source: '1 m³ ≈ 264 US gallons (1,000 litres ÷ 3.785).' },
      { step: `× $${price.toFixed(2)} a gallon ≈ $${big(gallons * price)}`, source: source + '.' },
    ])
  }),
)

// ---------------------------------------------------------------------------
// Laid end to end, or stacked up
// ---------------------------------------------------------------------------

/** [plural, length in metres, where the length comes from] */
const LENGTHS: [string, number, string][] = [
  ['pencils', 0.19, 'A new pencil is ≈ 19 cm (7.5 in).'],
  ['bananas', 0.18, 'A medium banana is ≈ 18 cm long.'],
  ['$1 bills', 0.156, 'A US bill is 6.14 in ≈ 15.6 cm long.'],
  ['credit cards', 0.0856, 'A credit card is 85.6 mm wide (ISO ID-1).'],
  ['school buses', 12.2, 'A full-size school bus is ≈ 40 ft ≈ 12.2 m.'],
  ['Boeing 747s', 70.7, 'A 747-400 is 70.7 m long.'],
  ['blue whales', 25, 'An adult blue whale is ≈ 25 m long.'],
  ['cars', 4.5, 'A typical car is ≈ 4.5 m long.'],
  ['American football fields', 91.44, 'A field is 100 yards = 91.44 m between the goal lines.'],
  ['Titanics', 269, 'The Titanic was 269 m long.'],
  ['LEGO 2×4 bricks', 0.032, 'A 2×4 brick is 32 mm long.'],
  ['iPhones', 0.1476, 'An iPhone 15 is 147.6 mm tall.'],
  ['footlong subs', 0.305, 'A foot = 30.5 cm.'],
  ['people lying head to toe', 1.7, 'An adult is ≈ 1.7 m tall.'],
]

/** [phrase after “to”, metres, source] */
const SPANS: [string, number, string][] = [
  ['go once around the equator', 40_075_000, 'The equator is 40,075 km.'],
  ['reach the Moon', 384_400_000, 'The Moon is 384,400 km away on average.'],
  ['span the US from New York to Los Angeles', 3_936_000, 'NY to LA is ≈ 3,936 km in a straight line.'],
  ['stretch from London to Paris', 343_000, 'London to Paris is ≈ 343 km in a straight line.'],
  ['run the length of the Nile', 6_650_000, 'The Nile is ≈ 6,650 km long.'],
  ['cross the English Channel at Dover', 33_800, 'The Strait of Dover is ≈ 33.8 km wide.'],
  ['cover a marathon', 42_195, 'A marathon is 42.195 km.'],
  ['span the length of Manhattan', 21_600, 'Manhattan is ≈ 21.6 km (13.4 miles) long.'],
  ['reach the Sun', 149_597_871_000, 'The Sun is ≈ 149.6 million km away.'],
]

const endToEndQuestions: Question[] = LENGTHS.flatMap(([plural, length, lengthSource], i) =>
  // Three spans per item, rotating, so each item meets a spread of distances.
  [0, 2, 4, 6].map((k) => SPANS[(i + k) % SPANS.length]).flatMap(([span, metres, spanSource]) => {
    const n = metres / length
    if (n < 30) return []
    return [
      question(n > 1e9 ? 'world' : 'everyday', `How many ${plural} laid end to end would it take to ${span}?`, Math.round(n), plural, n > 1e8 ? 'hard' : 'medium', `Calculated: ${spanSource.replace(/\.$/, '')}; ${lengthSource.replace(/\.$/, '')}`, [
        { step: `Distance ≈ ${big(metres)} m`, source: spanSource },
        { step: `Each ≈ ${round(length, 3)} m`, source: lengthSource },
        { step: `${big(metres)} ÷ ${round(length, 3)} ≈ ${big(n)}`, source: 'Divide.' },
      ]),
    ]
  }),
)

/** [plural, thickness in metres, source] */
const THICKNESSES: [string, number, string][] = [
  ['sheets of printer paper', 0.0001, 'A sheet is ≈ 0.1 mm (a 500-sheet ream is ≈ 5 cm).'],
  ['$1 bills', 0.000109, 'A US bill is 0.0043 in ≈ 0.109 mm thick (BEP).'],
  ['US pennies', 0.00152, 'A penny is 1.52 mm thick (US Mint).'],
  ['US quarters', 0.00175, 'A quarter is 1.75 mm thick (US Mint).'],
  ['poker chips', 0.0033, 'A casino chip is ≈ 3.3 mm thick.'],
  ['CDs', 0.0012, 'A bare CD is 1.2 mm thick.'],
  ['LEGO bricks', 0.0096, 'Stacked LEGO bricks rise 9.6 mm each.'],
  ['iPhones', 0.0078, 'An iPhone 15 is 7.8 mm thick.'],
]

/** [phrase, metres, source] */
const HEIGHTS: [string, number, string][] = [
  ['the roof of the Empire State Building', 381, 'The roof is 381 m up.'],
  ['the top of the Eiffel Tower', 330, 'The Eiffel Tower is 330 m tall.'],
  ['the top of the Burj Khalifa', 828, 'The Burj Khalifa is 828 m tall.'],
  ['the height of Mount Everest', 8_849, 'Everest is 8,849 m tall.'],
  ['airliner cruising height', 11_000, 'Jets cruise at ≈ 11 km.'],
  ['the International Space Station', 420_000, 'The ISS orbits ≈ 420 km up.'],
  ['the top of the Statue of Liberty’s torch', 93, 'Ground to torch is 93 m.'],
  ['the Moon', 384_400_000, 'The Moon is 384,400 km away on average.'],
]

const stackQuestions: Question[] = THICKNESSES.flatMap(([plural, thick, thickSource], i) =>
  [0, 2, 4, 6].map((k) => HEIGHTS[(i + k) % HEIGHTS.length]).flatMap(([what, metres, heightSource]) => {
    const n = metres / thick
    if (n < 30) return []
    return [
      question('everyday', `How many ${plural} would you need to stack to reach ${what}?`, Math.round(n), plural, n > 1e8 ? 'hard' : 'medium', `Calculated: ${heightSource.replace(/\.$/, '')}; ${thickSource.replace(/\.$/, '')}`, [
        { step: `Height ≈ ${big(metres)} m`, source: heightSource },
        { step: `Each ≈ ${round(thick * 1000, 3)} mm thick`, source: thickSource },
        { step: `${big(metres)} m ÷ ${round(thick * 1000, 3)} mm ≈ ${big(n)}`, source: 'Divide (1 m = 1,000 mm).' },
      ]),
    ]
  }),
)

// ---------------------------------------------------------------------------
// How long would it take to get there?
// ---------------------------------------------------------------------------

/** [how, km/h, source] */
const SPEEDS: [string, number, string][] = [
  ['walk', 5, 'Walking pace ≈ 5 km/h.'],
  ['cycle', 20, 'Steady cycling ≈ 20 km/h.'],
  ['drive at 100 km/h (62 mph)', 100, 'Motorway speed.'],
  ['fly in an airliner', 900, 'Airliners cruise ≈ 900 km/h.'],
  ['travel at the speed of sound', 1_235, 'Sound at sea level ≈ 343 m/s ≈ 1,235 km/h.'],
  ['travel at the ISS’s orbital speed', 27_600, 'The ISS moves at ≈ 7.66 km/s ≈ 27,600 km/h.'],
  ['crawl at a garden snail’s pace (≈ 1 mm a second)', 0.0036, '1 mm/s = 3.6 m an hour.'],
  ['run at Usain Bolt’s 100 m world-record average speed', 37.58, '100 m in 9.58 s ≈ 10.4 m/s ≈ 37.6 km/h.'],
]

/** [phrase, km, source] */
const TRIPS: [string, number, string][] = [
  ['once around the equator', 40_075, 'The equator is 40,075 km.'],
  ['to the Moon', 384_400, 'The Moon is 384,400 km away on average.'],
  ['from New York to Los Angeles (in a straight line)', 3_936, 'NY to LA ≈ 3,936 km.'],
  ['from London to Paris (in a straight line)', 343, 'London to Paris ≈ 343 km.'],
  ['to the Sun', 149_597_871, 'The Sun is ≈ 149.6 million km away.'],
  ['to Mars at its 2003 closest approach', 55_760_000, 'Mars came within 55.76 million km in August 2003.'],
  ['the length of a marathon', 42.195, 'A marathon is 42.195 km.'],
  ['to the nearest star, Proxima Centauri', 4.017e13, '4.246 light-years × 9.46 trillion km.'],
]

function duration(hours: number): [number, string] {
  if (hours < 48) return [hours, 'hours']
  if (hours < 24 * 730) return [hours / 24, 'days']
  return [hours / 8_766, 'years']
}

const travelQuestions: Question[] = SPEEDS.flatMap(([how, speed, speedSource]) =>
  TRIPS.flatMap(([where, km, tripSource]) => {
    const hours = km / speed
    if (hours < 0.5 || hours > 1e10 * 8_766) return []
    const [value, unit] = duration(hours)
    return [
      question('travel', `How long would it take to ${how} ${where}, without stopping?`, Number(value.toPrecision(3)), unit, hours > 8_766 * 1000 ? 'hard' : 'medium', `Calculated: ${tripSource.replace(/\.$/, '')}; ${speedSource.replace(/\.$/, '')}`, [
        { step: `Distance ≈ ${big(km)} km`, source: tripSource },
        { step: `Speed ≈ ${round(speed, 3)} km/h`, source: speedSource },
        {
          step: `${big(km)} ÷ ${round(speed, 3)} ≈ ${big(hours)} hours${unit === 'hours' ? '' : ` ≈ ${big(value)} ${unit}`}`,
          source: unit === 'years' ? '≈ 8,766 hours in a year.' : unit === 'days' ? '24 hours in a day.' : 'Time = distance ÷ speed.',
        },
      ]),
    ]
  }),
)

// ---------------------------------------------------------------------------
// Over a lifetime
// ---------------------------------------------------------------------------

const LIFE_DAYS = 80 * 365.25

/** [prompt, per day, unit, where the daily rate comes from] */
const LIFETIME: [string, number, string, string][] = [
  ['How many times does your heart beat in an 80-year life (at 70 beats a minute)?', 70 * 1_440, 'beats', '70 beats a minute × 1,440 minutes.'],
  ['How many breaths do you take in an 80-year life (at 14 a minute)?', 14 * 1_440, 'breaths', '14 breaths a minute × 1,440 minutes.'],
  ['How many times do you blink in an 80-year life (15 a minute over 16 waking hours)?', 15 * 960, 'blinks', '15 a minute × 960 waking minutes.'],
  ['How many meals do you eat in an 80-year life, at three a day?', 3, 'meals', 'Three meals a day.'],
  ['How many times do you brush your teeth in an 80-year life, twice a day?', 2, 'brushings', 'Twice a day.'],
  ['How many hours do you spend asleep in an 80-year life, at 8 hours a night?', 8, 'hours', '8 hours a night.'],
  ['How many steps does the average American take in an 80-year life (≈ 5,100 a day)?', 5_117, 'steps', 'Bassett et al. (2010): US adults average ≈ 5,117 steps a day.'],
  ['How many words do you speak in an 80-year life (≈ 16,000 a day)?', 16_000, 'words', 'Mehl et al. (2007), Science: ≈ 16,000 words a day.'],
  ['How many haircuts do you get in an 80-year life, at one every 6 weeks?', 1 / 42, 'haircuts', 'One every 42 days.'],
  ['How many hours of TV does the average American watch in an 80-year life (≈ 2.8 a day)?', 2.8, 'hours', 'BLS American Time Use Survey 2023: ≈ 2.8 hours a day.'],
  ['How many times do you go to the toilet in an 80-year life (≈ 7 a day)?', 7, 'visits', 'A typical 6–8 times a day.'],
  ['How many litres of water do you drink in an 80-year life (≈ 2 litres a day)?', 2, 'litres', '≈ 2 L of drinks a day.'],
]

const lifetimeQuestions: Question[] = LIFETIME.map(([prompt, perDay, unit, source]) => {
  const total = perDay * LIFE_DAYS
  return question('body', prompt, Math.round(total), unit, total > 1e8 ? 'medium' : 'easy', `Calculated: ${source.replace(/\.$/, '')} × 29,220 days (80 years)`, [
    { step: `Per day ≈ ${round(perDay, 3)}`, source },
    { step: '80 years ≈ 29,000 days', source: '80 × 365.' },
    { step: `${round(perDay, 3)} × 29,000 ≈ ${big(perDay * 29_000)}`, source: 'Multiply.' },
  ])
})

// ---------------------------------------------------------------------------
// How much would it weigh?
// ---------------------------------------------------------------------------

/** [substance, kg/m³, where the density comes from] */
const STUFF = {
  air: ['air', 1.204, 'Air at room temperature ≈ 1.2 kg per m³.'],
  helium: ['helium', 0.1664, 'Helium ≈ 0.17 kg per m³, about ⅐ of air.'],
  water: ['water', 998, 'Water ≈ 1,000 kg per m³ (1 kg a litre).'],
  gold: ['solid gold', 19_320, 'Gold ≈ 19,300 kg per m³, about 19× water.'],
  sand: ['dry sand', 1_600, 'Dry sand ≈ 1,600 kg per m³ (grains plus gaps).'],
  honey: ['honey', 1_420, 'Honey ≈ 1.42 kg a litre.'],
  lead: ['solid lead', 11_340, 'Lead ≈ 11,300 kg per m³.'],
  ice: ['ice', 917, 'Ice ≈ 0.92× water: it floats.'],
  concrete: ['solid concrete', 2_400, 'Concrete ≈ 2,400 kg per m³.'],
} satisfies Record<string, [string, number, string]>

/** [stuff, container, prompt style: 'all' = “all the X in”, 'full' = “full of X”] */
const WEIGHINGS: [keyof typeof STUFF, Container, 'all' | 'full'][] = [
  ['air', C.bedroom, 'all'],
  ['air', C.bus, 'all'],
  ['air', C.esb, 'all'],
  ['air', C.garage, 'all'],
  ['air', C.elevator, 'all'],
  ['helium', C.bedroom, 'full'],
  ['helium', C.esb, 'full'],
  ['water', C.pool, 'all'],
  ['water', C.bathtub, 'full'],
  ['water', C.bus, 'full'],
  ['water', C.esb, 'full'],
  ['water', C.backyardPool, 'all'],
  ['gold', C.shoebox, 'full'],
  ['gold', C.suitcase, 'full'],
  ['gold', C.bathtub, 'full'],
  ['gold', C.jug, 'full'],
  ['gold', C.fridge, 'full'],
  ['sand', C.bathtub, 'full'],
  ['sand', C.bus, 'full'],
  ['sand', C.shipping, 'full'],
  ['honey', C.bathtub, 'full'],
  ['honey', C.jug, 'full'],
  ['lead', C.shoebox, 'full'],
  ['ice', C.pool, 'full'],
  ['concrete', C.bedroom, 'full'],
]

const weighQuestions: Question[] = WEIGHINGS.map(([key, c, style]) => {
  const [stuff, density, densitySource] = STUFF[key]
  const kg = c.volume * density
  const prompt = style === 'all' ? `How much does all the ${stuff} in ${c.name} weigh?` : `How much would ${c.name} full of ${stuff} weigh?`
  return question('world', prompt, Number(kg.toPrecision(4)), 'kg', key === 'air' || key === 'helium' ? 'hard' : 'medium', `Calculated: ${c.spec}; ${densitySource.replace(/\.$/, '')}`, [
    { step: `${cap(c.name)} ≈ ${round(c.volume, 3)} m³`, source: c.spec + '.' },
    { step: `Density ≈ ${round(density, 2)} kg/m³`, source: densitySource },
    { step: `${round(c.volume, 3)} × ${round(density, 2)} ≈ ${big(kg)} kg`, source: 'Mass = volume × density.' },
  ])
})

/** [what, its dimensions in metres, density in kg/m³, where that density comes from] */
const OBJECTS: [string, [number, number, number], number, string][] = [
  ['a 10 cm cube of solid gold', [0.1, 0.1, 0.1], 19_320, 'Gold is about 19× as dense as water.'],
  ['a 1 m cube of solid iron', [1, 1, 1], 7_874, 'Iron and steel are about 7.9× water.'],
  ['a 1 m cube of ice', [1, 1, 1], 917, 'Ice floats with about 9/10 under water: ≈ 0.92× water.'],
  ['a 1-litre bottle full of mercury', [0.1, 0.1, 0.1], 13_534, 'Mercury is about 13.5× water: steel floats on it.'],
  ['a pane of window glass 1 m × 1 m × 4 mm', [1, 1, 0.004], 2_500, 'Glass is about 2.5× water.'],
  ['a 10 cm cube of aluminium', [0.1, 0.1, 0.1], 2_700, 'Aluminium is about 2.7× water.'],
  ['a 30 cm cube of tungsten', [0.3, 0.3, 0.3], 19_250, 'Tungsten is almost exactly as dense as gold.'],
]

const objectQuestions = OBJECTS.map(([what, [a, b, c], density, note]) => {
  const volume = a * b * c
  const kg = volume * density
  return question('everyday', `How much does ${what} weigh?`, Number(kg.toPrecision(4)), 'kg', 'medium', `Volume × density (${round(density, 4)} kg/m³)`, [
    { step: `Volume = ${[a, b, c].map((x) => `${round(x, 3)} m`).join(' × ')} = ${round(volume, 3)} m³`, source: '1 m³ = 1,000 litres.' },
    { step: `Density ≈ ${round(density, 2)} kg/m³`, source: note },
    { step: `${round(volume, 3)} × ${round(density, 2)} ≈ ${round(kg)} kg`, source: 'Mass = volume × density.' },
  ])
})

// ---------------------------------------------------------------------------
// Counting atoms
// ---------------------------------------------------------------------------

const AVOGADRO = 6.02214076e23

/** [what, element, grams of it, molar mass in g/mol] */
const ATOMS: [string, string, number, number][] = [
  ['a 1-carat diamond (0.2 grams of carbon)', 'carbon', 0.2, 12.011],
  ['a 1 kg block of aluminium', 'aluminium', 1000, 26.982],
  ['a 10 gram gold ring', 'gold', 10, 196.97],
  ['a 5 kg iron dumbbell', 'iron', 5000, 55.845],
  ['a 1 kg lead weight', 'lead', 1000, 207.2],
  ['a 31.1 gram (1 troy ounce) silver coin', 'silver', 31.1, 107.87],
  ['half a gram of helium (about what a party balloon holds)', 'helium', 0.5, 4.0026],
  ['a 2 gram platinum earring', 'platinum', 2, 195.08],
  ['a 100 gram titanium bar', 'titanium', 100, 47.867],
  ['10 grams of magnesium ribbon', 'magnesium', 10, 24.305],
]

const atomQuestions = ATOMS.map(([what, element, grams, molar]) => {
  const molarRounded = Number(molar.toPrecision(2))
  return question('world', `How many atoms are in ${what}?`, Number(((grams / molar) * AVOGADRO).toPrecision(4)), 'atoms', 'hard', `Avogadro’s number × mass ÷ molar mass (${element}: ${molar} g/mol)`, [
    { step: `Molar mass of ${element} ≈ ${molarRounded} g/mol`, source: 'From the periodic table: about the number of protons plus neutrons.' },
    { step: `${round(grams, 3)} g ÷ ${molarRounded} ≈ ${round(grams / molarRounded)} mol`, source: 'Moles = mass ÷ molar mass.' },
    { step: `× 6 × 10²³ ≈ ${sci((grams / molarRounded) * 6e23)} atoms`, source: 'Avogadro’s number.' },
  ])
})

// ---------------------------------------------------------------------------
// Inflation
// ---------------------------------------------------------------------------

/** US CPI-U, annual average (1982–84 = 100), US Bureau of Labor Statistics. */
const CPI_2023 = 304.702
const CPI: [number, number][] = [
  [1950, 24.1],
  [1960, 29.6],
  [1970, 38.8],
  [1980, 82.4],
  [1990, 130.7],
  [2000, 172.2],
  [2010, 218.056],
]

const inflationQuestions = CPI.map(([year, cpi]) => {
  const years = 2023 - year
  const assumed = year >= 1990 ? 2.5 : 3.5
  const factor = (1 + assumed / 100) ** years
  return question('money', `$100 in ${year} bought about as much as how many dollars in 2023?`, Math.round((100 * CPI_2023) / cpi), 'US dollars', year < 1980 ? 'hard' : 'medium', 'US Bureau of Labor Statistics, CPI-U annual averages', [
    { step: `Assume ≈ ${assumed}% inflation a year`, source: year >= 1990 ? 'US inflation mostly ran 2–3% a year from the 1990s, with a spike in 2021–22.' : 'US inflation has averaged about 3.5% a year since 1950.' },
    { step: `${years} years at ${assumed}% → × ${round(factor)}`, source: `Doubling time ≈ 72 ÷ ${assumed} ≈ ${round(72 / assumed)} years.` },
    { step: `$100 × ${round(factor)} ≈ $${round(100 * factor)}`, source: 'Grow the $100 by the price rise.' },
  ])
})

// ---------------------------------------------------------------------------
// US states: population from House seats
// ---------------------------------------------------------------------------

/** [state, 2020 census resident population, House seats from the 2020 apportionment] */
const STATES: [string, number, number][] = [
  ['California', 39_538_223, 52],
  ['Texas', 29_145_505, 38],
  ['Florida', 21_538_187, 28],
  ['New York', 20_201_249, 26],
  ['Pennsylvania', 13_002_700, 17],
  ['Illinois', 12_812_508, 17],
  ['Ohio', 11_799_448, 15],
  ['Georgia', 10_711_908, 14],
  ['North Carolina', 10_439_388, 14],
  ['Michigan', 10_077_331, 13],
  ['New Jersey', 9_288_994, 12],
  ['Virginia', 8_631_393, 11],
  ['Washington', 7_705_281, 10],
  ['Arizona', 7_151_502, 9],
  ['Massachusetts', 7_029_917, 9],
  ['Tennessee', 6_910_840, 9],
  ['Indiana', 6_785_528, 9],
  ['Maryland', 6_177_224, 8],
  ['Missouri', 6_154_913, 8],
  ['Wisconsin', 5_893_718, 8],
  ['Colorado', 5_773_714, 8],
  ['Minnesota', 5_706_494, 8],
  ['South Carolina', 5_118_425, 7],
  ['Alabama', 5_024_279, 7],
  ['Louisiana', 4_657_757, 6],
  ['Kentucky', 4_505_836, 6],
  ['Oregon', 4_237_256, 6],
  ['Oklahoma', 3_959_353, 5],
  ['Connecticut', 3_605_944, 5],
  ['Utah', 3_271_616, 4],
  ['Iowa', 3_190_369, 4],
  ['Nevada', 3_104_614, 4],
  ['Arkansas', 3_011_524, 4],
  ['Mississippi', 2_961_279, 4],
  ['Kansas', 2_937_880, 4],
  ['New Mexico', 2_117_522, 3],
  ['Nebraska', 1_961_504, 3],
  ['Idaho', 1_839_106, 2],
  ['West Virginia', 1_793_716, 2],
  ['Hawaii', 1_455_271, 2],
  ['New Hampshire', 1_377_529, 2],
  ['Maine', 1_362_359, 2],
  ['Rhode Island', 1_097_379, 2],
  ['Montana', 1_084_225, 2],
  ['Delaware', 989_948, 1],
  ['South Dakota', 886_667, 1],
  ['North Dakota', 779_094, 1],
  ['Alaska', 733_391, 1],
  ['Vermont', 643_077, 1],
  ['Wyoming', 576_851, 1],
]

const stateQuestions = STATES.map(([state, pop, seats]) =>
  question('people', `How many people lived in ${state} at the 2020 US Census?`, pop, 'people', seats >= 10 ? 'easy' : seats >= 4 ? 'medium' : 'hard', 'US Census Bureau, 2020 Census resident population', [
    { step: `${state} has ${seats} seat${seats > 1 ? 's' : ''} in the US House`, source: 'House seats are shared out by population after every census; 2020 apportionment.' },
    { step: 'Each seat ≈ 760,000 people', source: '331 million Americans ÷ 435 seats.' },
    {
      step: `${seats} × 760,000 ≈ ${round(seats * 760_000)}`,
      source: seats <= 2 ? 'Every state gets at least one seat and seats are whole numbers, so small states can be off by half a seat or more.' : 'Seats are whole numbers, so this can be off by up to half a seat.',
    },
  ]),
)

// ---------------------------------------------------------------------------
// Distances between cities, from latitude and longitude
// ---------------------------------------------------------------------------

/** [latitude, longitude] of the city centre, in degrees (south and west negative). */
const CITIES: Record<string, [number, number]> = {
  London: [51.507, -0.128],
  Paris: [48.857, 2.352],
  Berlin: [52.52, 13.405],
  Madrid: [40.417, -3.704],
  Rome: [41.902, 12.496],
  Amsterdam: [52.37, 4.895],
  Vienna: [48.208, 16.373],
  Warsaw: [52.23, 21.012],
  Stockholm: [59.329, 18.069],
  Dublin: [53.35, -6.26],
  Lisbon: [38.722, -9.139],
  Athens: [37.984, 23.728],
  Istanbul: [41.008, 28.978],
  Moscow: [55.756, 37.617],
  Edinburgh: [55.953, -3.189],
  Barcelona: [41.385, 2.173],
  'New York': [40.713, -74.006],
  Boston: [42.36, -71.059],
  'Washington, D.C.': [38.907, -77.037],
  Chicago: [41.878, -87.63],
  Miami: [25.762, -80.192],
  Atlanta: [33.749, -84.388],
  Dallas: [32.777, -96.797],
  Denver: [39.739, -104.99],
  'Los Angeles': [34.052, -118.244],
  'San Francisco': [37.775, -122.419],
  Seattle: [47.606, -122.332],
  'Las Vegas': [36.17, -115.14],
  Toronto: [43.653, -79.383],
  'Mexico City': [19.433, -99.133],
  Tokyo: [35.676, 139.65],
  Seoul: [37.567, 126.978],
  Beijing: [39.904, 116.407],
  Shanghai: [31.23, 121.474],
  'Hong Kong': [22.32, 114.17],
  Singapore: [1.352, 103.82],
  Bangkok: [13.756, 100.502],
  Delhi: [28.614, 77.209],
  Mumbai: [19.076, 72.878],
  Sydney: [-33.869, 151.209],
  Melbourne: [-37.814, 144.963],
  Cairo: [30.044, 31.236],
  Dubai: [25.205, 55.271],
}

const ROUTES: [string, string][] = [
  ['London', 'Paris'],
  ['London', 'Edinburgh'],
  ['London', 'Dublin'],
  ['London', 'Berlin'],
  ['London', 'Rome'],
  ['Paris', 'Madrid'],
  ['Paris', 'Barcelona'],
  ['Berlin', 'Warsaw'],
  ['Berlin', 'Vienna'],
  ['Berlin', 'Stockholm'],
  ['Madrid', 'Lisbon'],
  ['Rome', 'Athens'],
  ['Amsterdam', 'Berlin'],
  ['Athens', 'Istanbul'],
  ['Warsaw', 'Moscow'],
  ['New York', 'Boston'],
  ['New York', 'Washington, D.C.'],
  ['New York', 'Chicago'],
  ['New York', 'Miami'],
  ['New York', 'Toronto'],
  ['Chicago', 'Denver'],
  ['Chicago', 'Atlanta'],
  ['Dallas', 'Atlanta'],
  ['Los Angeles', 'San Francisco'],
  ['Los Angeles', 'Las Vegas'],
  ['San Francisco', 'Seattle'],
  ['Denver', 'Las Vegas'],
  ['Dallas', 'Mexico City'],
  ['Atlanta', 'Miami'],
  ['Tokyo', 'Seoul'],
  ['Seoul', 'Beijing'],
  ['Beijing', 'Shanghai'],
  ['Shanghai', 'Hong Kong'],
  ['Bangkok', 'Singapore'],
  ['Delhi', 'Mumbai'],
  ['Sydney', 'Melbourne'],
  ['Cairo', 'Istanbul'],
  ['Dubai', 'Mumbai'],
  ['Hong Kong', 'Bangkok'],
  ['Tokyo', 'Shanghai'],
]

const EARTH_RADIUS_KM = 6371
const rad = (deg: number) => (deg * Math.PI) / 180
const tenth = (n: number) => Math.round(n * 10) / 10
const deg = (n: number, ns: 'N' | 'E') => `${tenth(Math.abs(n))}°${n < 0 ? (ns === 'N' ? 'S' : 'W') : ns}`

/** Great-circle (haversine) distance in km. */
function greatCircle([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]) {
  const h = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

const distanceQuestions = ROUTES.map(([a, b]) => {
  const [lat1, lon1] = CITIES[a]
  const [lat2, lon2] = CITIES[b]
  const dLat = tenth(Math.abs(tenth(lat2) - tenth(lat1)))
  const dLon = tenth(Math.abs(tenth(lon2) - tenth(lon1)))
  const midLat = Math.round(Math.abs(lat1 + lat2) / 2)
  const ns = dLat * 111
  const ew = dLon * 111 * Math.cos(rad(midLat))
  return question('travel', `How far is it from ${a} to ${b} as the crow flies?`, Math.round(greatCircle(CITIES[a], CITIES[b])), 'km', 'medium', 'Great-circle distance between the city centres (mean Earth radius 6,371 km)', [
    { step: `${a} ≈ ${deg(lat1, 'N')} ${deg(lon1, 'E')}; ${b} ≈ ${deg(lat2, 'N')} ${deg(lon2, 'E')}`, source: 'Coordinates of big cities are worth knowing; even to the nearest degree they get you close.' },
    { step: `North–south: ${dLat}° × 111 km ≈ ${round(ns)} km`, source: 'A degree of latitude is about 111 km: Earth’s 40,000 km circumference ÷ 360.' },
    { step: `East–west: ${dLon}° × 111 km × cos ${midLat}° ≈ ${round(ew)} km`, source: 'Longitude lines close in toward the poles, so a degree of longitude shrinks with the cosine of the latitude.' },
    { step: `Straight line ≈ √(${round(ns)}² + ${round(ew)}²) ≈ ${round(Math.hypot(ns, ew))} km`, source: 'Pythagoras: the Earth’s curve barely matters over a few thousand kilometres.' },
  ])
})

// ---------------------------------------------------------------------------
// Space: light time and “how many fit inside”
// ---------------------------------------------------------------------------

/** [planet, mean distance from the Sun in AU] (NASA planetary fact sheet) */
const PLANETS: [string, number][] = [
  ['Mercury', 0.387],
  ['Venus', 0.723],
  ['Mars', 1.524],
  ['Jupiter', 5.203],
  ['Saturn', 9.537],
  ['Uranus', 19.191],
  ['Neptune', 30.069],
]
const AU_KM = 149_597_871

const lightQuestions = PLANETS.map(([planet, au]) => {
  const roundAu = Number(au.toPrecision(2))
  return question('world', `How many minutes does sunlight take to reach ${planet}?`, Number(((au * AU_KM) / 299_792.458 / 60).toPrecision(4)), 'minutes', 'medium', 'Mean distance (NASA) ÷ the speed of light', [
    { step: `${planet} ≈ ${roundAu} AU from the Sun`, source: 'Mercury 0.4, Venus 0.7, Mars 1.5, Jupiter 5, Saturn 10, Uranus 19, Neptune 30 AU.' },
    { step: 'Light crosses 1 AU in ≈ 8.3 minutes', source: '150 million km ÷ 300,000 km/s ≈ 500 s.' },
    { step: `${roundAu} × 8.3 ≈ ${round(roundAu * 8.3)} minutes`, source: 'Scale by the distance.' },
  ])
})

/** [prompt, mean radius of the big body, of the small one (km), radius anchor] (NASA) */
const VOLUMES: [string, number, number, string][] = [
  ['How many Earths would fit inside the Sun?', 695_700, 6_371, 'The Sun is about 109 Earths across.'],
  ['How many Earths would fit inside Jupiter?', 69_911, 6_371, 'Jupiter is about 11 Earths across.'],
  ['How many Earths would fit inside Saturn?', 58_232, 6_371, 'Saturn is about 9 Earths across.'],
  ['How many Earths would fit inside Neptune?', 24_622, 6_371, 'Neptune is just under 4 Earths across.'],
  ['How many Moons would fit inside the Earth?', 6_371, 1_737.4, 'The Moon is a little over a quarter of Earth’s width.'],
  ['How many Mars-sized planets would fit inside the Earth?', 6_371, 3_389.5, 'Mars is about half Earth’s width.'],
  ['How many Jupiters would fit inside the Sun?', 695_700, 69_911, 'The Sun is about 10 Jupiters across.'],
]

const volumeQuestions = VOLUMES.map(([prompt, bigR, small, anchor]) => {
  const ratio = bigR / small
  const r = ratio < 10 ? Math.round(ratio * 10) / 10 : Math.round(ratio)
  return question('world', prompt, Number((ratio ** 3).toPrecision(4)), 'times (by volume)', ratio > 50 ? 'medium' : 'easy', 'Ratio of mean radii, cubed (NASA fact sheets)', [
    { step: `Width ratio ≈ ${r}`, source: anchor },
    { step: `${r}³ ≈ ${round(r ** 3)}`, source: 'Volume grows with the cube of the width (ignoring the gaps between packed spheres).' },
  ])
})

export const FAMILY_QUESTIONS: Question[] = [
  ...fitQuestions,
  ...fillQuestions,
  ...endToEndQuestions,
  ...stackQuestions,
  ...travelQuestions,
  ...lifetimeQuestions,
  ...weighQuestions,
  ...objectQuestions,
  ...atomQuestions,
  ...inflationQuestions,
  ...stateQuestions,
  ...distanceQuestions,
  ...lightQuestions,
  ...volumeQuestions,
]
