/**
 * Question families worked out from small tables of reference data: the true
 * answer is calculated exactly, and the guide runs the same Fermi estimate on
 * rounded inputs. Add a row to any table to add a question.
 */
import { question, round, sci } from './build'
import type { Question } from './types'

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
  question(
    'population',
    `What was the population of ${state} at the 2020 US Census?`,
    pop,
    'people',
    seats >= 10 ? 'easy' : seats >= 4 ? 'medium' : 'hard',
    'US Census Bureau, 2020 Census resident population',
    [
      {
        step: `${state} has ${seats} seat${seats > 1 ? 's' : ''} in the US House`,
        source: 'House seats are shared out by population after every census; 2020 apportionment.',
      },
      { step: 'Each seat ≈ 760,000 people', source: '331 million Americans ÷ 435 seats.' },
      {
        step: `${seats} × 760,000 ≈ ${round(seats * 760_000)}`,
        source:
          seats <= 2
            ? 'Every state gets at least one seat and seats are whole numbers, so small states can be off by half a seat or more.'
            : 'Seats are whole numbers, so this can be off by up to half a seat.',
      },
    ],
  ),
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
  Prague: [50.075, 14.438],
  Warsaw: [52.23, 21.012],
  Stockholm: [59.329, 18.069],
  Oslo: [59.913, 10.752],
  Copenhagen: [55.676, 12.568],
  Dublin: [53.35, -6.26],
  Lisbon: [38.722, -9.139],
  Athens: [37.984, 23.728],
  Istanbul: [41.008, 28.978],
  Moscow: [55.756, 37.617],
  Edinburgh: [55.953, -3.189],
  Barcelona: [41.385, 2.173],
  Brussels: [50.85, 4.352],
  Zurich: [47.377, 8.54],
  Budapest: [47.498, 19.04],
  Helsinki: [60.17, 24.938],
  'New York': [40.713, -74.006],
  Boston: [42.36, -71.059],
  'Washington, D.C.': [38.907, -77.037],
  Chicago: [41.878, -87.63],
  Miami: [25.762, -80.192],
  Atlanta: [33.749, -84.388],
  Dallas: [32.777, -96.797],
  Houston: [29.76, -95.37],
  Denver: [39.739, -104.99],
  'Los Angeles': [34.052, -118.244],
  'San Francisco': [37.775, -122.419],
  Seattle: [47.606, -122.332],
  Phoenix: [33.448, -112.074],
  Toronto: [43.653, -79.383],
  Montreal: [45.502, -73.567],
  'Mexico City': [19.433, -99.133],
  'Las Vegas': [36.17, -115.14],
  'New Orleans': [29.951, -90.072],
  Minneapolis: [44.978, -93.265],
  Philadelphia: [39.953, -75.165],
  Tokyo: [35.676, 139.65],
  Osaka: [34.694, 135.502],
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
  ['London', 'Amsterdam'],
  ['London', 'Berlin'],
  ['London', 'Rome'],
  ['London', 'Madrid'],
  ['London', 'Stockholm'],
  ['Paris', 'Madrid'],
  ['Paris', 'Rome'],
  ['Paris', 'Berlin'],
  ['Paris', 'Barcelona'],
  ['Paris', 'Vienna'],
  ['Paris', 'Zurich'],
  ['Paris', 'Lisbon'],
  ['Berlin', 'Warsaw'],
  ['Berlin', 'Prague'],
  ['Berlin', 'Vienna'],
  ['Berlin', 'Copenhagen'],
  ['Berlin', 'Stockholm'],
  ['Berlin', 'Brussels'],
  ['Rome', 'Athens'],
  ['Rome', 'Vienna'],
  ['Madrid', 'Lisbon'],
  ['Madrid', 'Barcelona'],
  ['Barcelona', 'Rome'],
  ['Amsterdam', 'Brussels'],
  ['Amsterdam', 'Copenhagen'],
  ['Vienna', 'Budapest'],
  ['Prague', 'Budapest'],
  ['Stockholm', 'Oslo'],
  ['Stockholm', 'Helsinki'],
  ['Oslo', 'Copenhagen'],
  ['Athens', 'Istanbul'],
  ['Istanbul', 'Moscow'],
  ['Warsaw', 'Moscow'],
  ['Helsinki', 'Moscow'],
  ['Zurich', 'Vienna'],
  ['Dublin', 'Edinburgh'],
  ['Budapest', 'Athens'],
  ['New York', 'Boston'],
  ['New York', 'Washington, D.C.'],
  ['New York', 'Chicago'],
  ['New York', 'Miami'],
  ['New York', 'Toronto'],
  ['New York', 'Philadelphia'],
  ['Boston', 'Montreal'],
  ['Washington, D.C.', 'Atlanta'],
  ['Chicago', 'Minneapolis'],
  ['Chicago', 'Denver'],
  ['Chicago', 'Atlanta'],
  ['Chicago', 'Dallas'],
  ['Dallas', 'Houston'],
  ['Houston', 'New Orleans'],
  ['Atlanta', 'Miami'],
  ['Denver', 'Phoenix'],
  ['Denver', 'Las Vegas'],
  ['Los Angeles', 'San Francisco'],
  ['Los Angeles', 'Las Vegas'],
  ['Los Angeles', 'Phoenix'],
  ['San Francisco', 'Seattle'],
  ['Seattle', 'Denver'],
  ['Los Angeles', 'Denver'],
  ['Dallas', 'Mexico City'],
  ['Toronto', 'Montreal'],
  ['New Orleans', 'Atlanta'],
  ['Phoenix', 'Dallas'],
  ['Minneapolis', 'Denver'],
  ['Tokyo', 'Osaka'],
  ['Tokyo', 'Seoul'],
  ['Seoul', 'Beijing'],
  ['Beijing', 'Shanghai'],
  ['Shanghai', 'Hong Kong'],
  ['Hong Kong', 'Bangkok'],
  ['Bangkok', 'Singapore'],
  ['Delhi', 'Mumbai'],
  ['Sydney', 'Melbourne'],
  ['Cairo', 'Istanbul'],
  ['Dubai', 'Mumbai'],
  ['Dubai', 'Cairo'],
  ['Tokyo', 'Shanghai'],
]

const EARTH_RADIUS_KM = 6371
const rad = (deg: number) => (deg * Math.PI) / 180

/** Great-circle (haversine) distance in km. */
function greatCircle([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]) {
  const h = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

const tenth = (n: number) => Math.round(n * 10) / 10
const deg = (n: number, ns: 'N' | 'E') => `${tenth(Math.abs(n))}°${n < 0 ? (ns === 'N' ? 'S' : 'W') : ns}`

const distanceQuestions = ROUTES.map(([a, b]) => {
  const [lat1, lon1] = CITIES[a]
  const [lat2, lon2] = CITIES[b]
  const dLat = tenth(Math.abs(tenth(lat2) - tenth(lat1)))
  const dLon = tenth(Math.abs(tenth(lon2) - tenth(lon1)))
  const midLat = Math.round(Math.abs(lat1 + lat2) / 2)
  const ns = dLat * 111
  const ew = dLon * 111 * Math.cos(rad(midLat))
  return question(
    'geography',
    `How far is it from ${a} to ${b} in a straight line (as the crow flies)?`,
    Math.round(greatCircle(CITIES[a], CITIES[b])),
    'km',
    'medium',
    'Great-circle distance between the city centres (mean Earth radius 6,371 km)',
    [
      {
        step: `${a} ≈ ${deg(lat1, 'N')} ${deg(lon1, 'E')}; ${b} ≈ ${deg(lat2, 'N')} ${deg(lon2, 'E')}`,
        source: 'Coordinates of big cities are worth knowing; even to the nearest degree they get you close.',
      },
      {
        step: `North–south: ${dLat}° × 111 km ≈ ${round(ns)} km`,
        source: 'A degree of latitude is about 111 km: Earth’s 40,000 km circumference ÷ 360.',
      },
      {
        step: `East–west: ${dLon}° × 111 km × cos ${midLat}° ≈ ${round(ew)} km`,
        source: 'Lines of longitude close in toward the poles, so a degree of longitude shrinks with the cosine of the latitude.',
      },
      {
        step: `Straight line ≈ √(${round(ns)}² + ${round(ew)}²) ≈ ${round(Math.hypot(ns, ew))} km`,
        source: 'Pythagoras: the Earth’s curve barely matters over a few thousand kilometres.',
      },
    ],
  )
})

// ---------------------------------------------------------------------------
// Mass from volume and density
// ---------------------------------------------------------------------------

/** [what, its dimensions in metres, density in kg/m³, where that density comes from] */
const MASSES: [string, [number, number, number], number, string][] = [
  ['a 10 cm cube of solid gold', [0.1, 0.1, 0.1], 19_320, 'Gold is about 19× as dense as water: a standard 400-ounce bar (≈ 12.4 kg) is barely bigger than a phone.'],
  ['a 10 cm cube of aluminium', [0.1, 0.1, 0.1], 2_700, 'Aluminium is light for a metal, about 2.7× water: think of how light a drinks can is.'],
  ['a 10 cm cube of lead', [0.1, 0.1, 0.1], 11_340, 'Lead is about 11× water, which is why it’s used for weights and shielding.'],
  ['a 1 m cube of solid iron', [1, 1, 1], 7_874, 'Iron and steel are about 7.9× water.'],
  ['a 1 cm cube of platinum', [0.01, 0.01, 0.01], 21_450, 'Platinum is one of the densest metals, about 21× water.'],
  ['a 20 cm cube of copper', [0.2, 0.2, 0.2], 8_960, 'Copper is about 9× water, a little denser than iron.'],
  ['a 1 m cube of ice', [1, 1, 1], 917, 'Ice floats with about 9/10 of it under water, so it’s about 0.92× water.'],
  ['a 30 cm cube of tungsten', [0.3, 0.3, 0.3], 19_250, 'Tungsten is almost exactly as dense as gold (≈ 19×), which is why it’s used to fake gold bars.'],
  ['a 5 cm cube of osmium', [0.05, 0.05, 0.05], 22_590, 'Osmium is the densest element, about 22.6× water.'],
  ['a 2 cm cube of lithium', [0.02, 0.02, 0.02], 534, 'Lithium is the lightest metal and floats on water: about half water’s density.'],
  ['a 1-litre bottle full of mercury', [0.1, 0.1, 0.1], 13_534, 'Mercury is about 13.5× water: a steel ball floats on it.'],
  ['a 1 m cube of titanium', [1, 1, 1], 4_506, 'Titanium is about 4.5× water: strong like steel at roughly 60% of the weight.'],
  ['a 10 cm cube of silver', [0.1, 0.1, 0.1], 10_490, 'Silver is about 10.5× water, noticeably lighter than gold.'],
  ['a 50 cm cube of magnesium', [0.5, 0.5, 0.5], 1_738, 'Magnesium is the lightest structural metal, about 1.7× water.'],
  ['a 1 cm cube of diamond', [0.01, 0.01, 0.01], 3_510, 'Diamond is about 3.5× water: a 1-carat stone (0.2 g) is only about 6.5 mm across.'],
  ['the air in a room 5 m × 4 m × 2.5 m', [5, 4, 2.5], 1.204, 'Air at room temperature and sea level is about 1.2 kg per cubic metre (≈ 1/830 of water).'],
  ['the helium in a 1 m cube', [1, 1, 1], 0.1664, 'Helium is about 1/7 as dense as air (atomic mass 4 vs ≈ 29 for air).'],
  ['a 1 m cube of concrete', [1, 1, 1], 2_400, 'Normal concrete is about 2.4× water: rock and sand bound with cement.'],
  ['a pane of window glass 1 m × 1 m × 4 mm', [1, 1, 0.004], 2_500, 'Ordinary glass is about 2.5× water.'],
  ['a 1 m cube of seawater', [1, 1, 1], 1_025, 'Salt adds about 2.5% to water’s density (≈ 35 g of salt per litre).'],
  ['the ethanol in a full 1-litre bottle', [0.1, 0.1, 0.1], 789, 'Alcohol is about 0.79× water, which is why spirits float on top of a layered cocktail.'],
  ['a 10 cm cube of uranium', [0.1, 0.1, 0.1], 19_050, 'Uranium is about 19× water, nearly as dense as gold.'],
  ['a 10 cm cube of zinc', [0.1, 0.1, 0.1], 7_140, 'Zinc is about 7.1× water, a bit lighter than iron.'],
  ['the carbon dioxide filling a 1 m cube', [1, 1, 1], 1.842, 'CO₂ (molecular mass 44) is about 1.5× as dense as air (≈ 29).'],
  ['a 10 cm cube of nickel', [0.1, 0.1, 0.1], 8_908, 'Nickel is about 8.9× water, close to copper.'],
]

const massQuestions = MASSES.map(([what, [a, b, c], density, note]) => {
  const volume = a * b * c
  const kg = volume * density
  const grams = kg < 1
  return question(
    'physics',
    `How much does ${what} weigh?`,
    Number((grams ? kg * 1000 : kg).toPrecision(4)),
    grams ? 'grams' : 'kg',
    density < 10 || volume >= 1 ? 'medium' : 'easy',
    `Volume × density (${round(density, 4)} kg/m³ at room temperature)`,
    [
      { step: `Volume = ${[a, b, c].map((x) => `${round(x, 3)} m`).join(' × ')} = ${round(volume, 3)} m³ (${round(volume * 1000, 3)} litre${volume === 0.001 ? '' : 's'})`, source: 'Multiply the sides; 1 m³ is 1,000 litres.' },
      { step: `Density ≈ ${round(density, 2)} kg/m³`, source: note },
      {
        step: `${round(volume, 3)} m³ × ${round(density, 2)} kg/m³ ≈ ${grams ? `${round(volume * density * 1000)} g` : `${round(volume * density)} kg`}`,
        source: 'Mass = volume × density.',
      },
    ],
  )
})

// ---------------------------------------------------------------------------
// Counting atoms
// ---------------------------------------------------------------------------

const AVOGADRO = 6.02214076e23

/** [what, element, grams of it, molar mass in g/mol] */
const ATOMS: [string, string, number, number][] = [
  ['1 gram of hydrogen', 'hydrogen', 1, 1.008],
  ['half a gram of helium (about what a party balloon holds)', 'helium', 0.5, 4.0026],
  ['a 1-carat diamond (0.2 grams of carbon)', 'carbon', 0.2, 12.011],
  ['a 1 kg block of aluminium', 'aluminium', 1000, 26.982],
  ['a 10 gram gold ring', 'gold', 10, 196.97],
  ['a 5 kg iron dumbbell', 'iron', 5000, 55.845],
  ['3.11 grams of copper (the weight of a pre-1982 US cent)', 'copper', 3.11, 63.546],
  ['a 1 kg lead weight', 'lead', 1000, 207.2],
  ['1 gram of uranium', 'uranium', 1, 238.03],
  ['a 31.1 gram (1 troy ounce) silver coin', 'silver', 31.1, 107.87],
  ['1 gram of lithium', 'lithium', 1, 6.94],
  ['a 100 gram titanium bar', 'titanium', 100, 47.867],
  ['1 gram of silicon', 'silicon', 1, 28.085],
  ['1 gram of mercury', 'mercury', 1, 200.59],
  ['a 2 gram platinum earring', 'platinum', 2, 195.08],
  ['10 grams of magnesium ribbon', 'magnesium', 10, 24.305],
  ['1 gram of calcium', 'calcium', 1, 40.078],
  ['1 gram of sodium', 'sodium', 1, 22.99],
]

const atomQuestions = ATOMS.map(([what, element, grams, molar]) =>
  question(
    'physics',
    `How many atoms are in ${what}?`,
    Number(((grams / molar) * AVOGADRO).toPrecision(4)),
    'atoms',
    grams === 1 ? 'medium' : 'hard',
    `Avogadro’s number × mass ÷ molar mass (${element}: ${molar} g/mol)`,
    [
      {
        step: `Molar mass of ${element} ≈ ${round(molar, 2)} g/mol`,
        source: 'From the periodic table: roughly the number of protons plus neutrons in one atom.',
      },
      { step: `${round(grams, 3)} g ÷ ${round(molar, 2)} g/mol ≈ ${round(grams / molar)} mol`, source: 'Moles = mass ÷ molar mass.' },
      {
        step: `× 6.0 × 10²³ atoms per mole ≈ ${sci((grams / round_(molar)) * 6e23)} atoms`,
        source: 'Avogadro’s number: the atoms in one mole.',
      },
    ],
  ),
)

function round_(n: number) {
  return Number(n.toPrecision(2))
}

// ---------------------------------------------------------------------------
// Compound interest
// ---------------------------------------------------------------------------

/** [starting amount in $, yearly rate in %, years] */
const GROWTH: [number, number, number][] = [
  [1_000, 7, 30],
  [1_000, 10, 40],
  [10_000, 5, 20],
  [100, 8, 50],
  [5_000, 6, 25],
  [1_000, 3, 60],
  [1, 4, 200],
  [1_000, 12, 18],
  [10_000, 2, 35],
  [500, 9, 24],
  [1_000, 6, 100],
  [20_000, 4, 18],
  [100, 15, 30],
  [1_000, 1, 70],
  [2_500, 8, 45],
]

const usd = (n: number) => `$${n.toLocaleString('en-US')}`

const growthQuestions = GROWTH.map(([start, rate, years]) => {
  const doubling = 72 / rate
  const doublings = years / doubling
  return question(
    'money',
    `If you invest ${usd(start)} at ${rate}% a year, compounded yearly, what is it worth after ${years} years?`,
    Math.round(start * (1 + rate / 100) ** years * 100) / 100,
    'US dollars',
    doublings > 6 ? 'hard' : 'medium',
    `Compound interest: ${usd(start)} × ${1 + rate / 100}^${years}`,
    [
      { step: `Doubling time ≈ 72 ÷ ${rate} ≈ ${round(doubling)} years`, source: 'The rule of 72: money growing at r% a year doubles in about 72 ÷ r years.' },
      { step: `${years} years ÷ ${round(doubling)} ≈ ${round(doublings)} doublings`, source: 'Count how many doubling periods fit.' },
      {
        step: `${usd(start)} × 2^${round(doublings)} ≈ $${round(start * 2 ** doublings)}`,
        source: 'Each doubling multiplies by 2 (2¹⁰ ≈ 1,000 helps for long runs).',
      },
    ],
  )
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
  return question(
    'money',
    `$100 in ${year} bought about as much as how many dollars in 2023?`,
    Math.round((100 * CPI_2023) / cpi),
    'US dollars',
    year < 1980 ? 'hard' : 'medium',
    'US Bureau of Labor Statistics, CPI-U annual averages',
    [
      {
        step: `Assume ≈ ${assumed}% inflation a year`,
        source:
          year >= 1990
            ? 'US inflation mostly ran 2–3% a year from the 1990s, with a spike in 2021–22.'
            : 'US inflation has averaged about 3.5% a year since 1950, with the 1970s far hotter.',
      },
      { step: `${years} years at ${assumed}% → × ${round(factor)}`, source: `Doubling time ≈ 72 ÷ ${assumed} ≈ ${round(72 / assumed)} years.` },
      { step: `$100 × ${round(factor)} ≈ $${round(100 * factor)}`, source: 'Grow the $100 by the price rise.' },
    ],
  )
})

// ---------------------------------------------------------------------------
// Planets: Kepler's third law, light time, and size
// ---------------------------------------------------------------------------

/** [planet, mean distance from the Sun in AU, orbital period in Earth days] (NASA planetary fact sheet) */
const PLANETS: [string, number, number][] = [
  ['Mercury', 0.387, 87.97],
  ['Venus', 0.723, 224.7],
  ['Mars', 1.524, 686.98],
  ['Jupiter', 5.203, 4_332.59],
  ['Saturn', 9.537, 10_759.22],
  ['Uranus', 19.191, 30_688.5],
  ['Neptune', 30.069, 60_195],
]

const AU_KM = 149_597_871

const planetQuestions = PLANETS.flatMap(([planet, au, days]) => {
  const years = days / 365.25
  const roundAu = round_(au)
  return [
    question(
      'space',
      `How many Earth days does one year on ${planet} last?`,
      days,
      'days',
      au < 2 ? 'medium' : 'hard',
      'NASA planetary fact sheet (sidereal orbital period)',
      [
        { step: `${planet} orbits ≈ ${roundAu} AU from the Sun`, source: 'Worth memorising: Mercury 0.4, Venus 0.7, Mars 1.5, Jupiter 5, Saturn 10, Uranus 19, Neptune 30 AU.' },
        { step: `Period ≈ ${roundAu}^1.5 ≈ ${round(roundAu ** 1.5)} Earth years`, source: 'Kepler’s third law: in years and AU, period² = distance³.' },
        { step: `× 365 ≈ ${round(roundAu ** 1.5 * 365)} days`, source: 'Days in an Earth year.' },
      ],
    ),
    question(
      'space',
      `What is ${planet}’s average distance from the Sun?`,
      Math.round(au * AU_KM),
      'km',
      'medium',
      'NASA planetary fact sheet (semi-major axis)',
      [
        { step: `A year on ${planet} ≈ ${round(years)} Earth years`, source: 'Mercury ≈ 88 days, Venus ≈ 225 days, Mars ≈ 2 years, Jupiter ≈ 12, Saturn ≈ 29, Uranus ≈ 84, Neptune ≈ 165.' },
        { step: `Distance ≈ ${round(years)}^(2/3) ≈ ${round(round_(years) ** (2 / 3))} AU`, source: 'Kepler’s third law turned round: distance = period^(2/3).' },
        { step: `× 150 million km ≈ ${round(round_(years) ** (2 / 3) * 150e6)} km`, source: 'One astronomical unit, the Earth–Sun distance, is about 150 million km.' },
      ],
    ),
    question(
      'space',
      `How many minutes does sunlight take to reach ${planet}?`,
      Number(((au * AU_KM) / 299_792.458 / 60).toPrecision(4)),
      'minutes',
      'medium',
      'Mean distance (NASA) ÷ the speed of light',
      [
        { step: `${planet} ≈ ${roundAu} AU from the Sun`, source: 'Mercury 0.4, Venus 0.7, Mars 1.5, Jupiter 5, Saturn 10, Uranus 19, Neptune 30 AU.' },
        { step: 'Light crosses 1 AU in ≈ 8.3 minutes', source: '150 million km ÷ 300,000 km/s ≈ 500 s.' },
        { step: `${roundAu} × 8.3 ≈ ${round(roundAu * 8.3)} minutes`, source: 'Scale by the distance.' },
      ],
    ),
  ]
})

/** [prompt, mean radius of the big body, of the small one (km), radius anchor] (NASA) */
const VOLUMES: [string, number, number, string][] = [
  ['How many Earths would fit inside the Sun (by volume)?', 695_700, 6_371, 'The Sun is about 109 Earths across.'],
  ['How many Earths would fit inside Jupiter (by volume)?', 69_911, 6_371, 'Jupiter is about 11 Earths across.'],
  ['How many Earths would fit inside Saturn (by volume)?', 58_232, 6_371, 'Saturn is about 9 Earths across.'],
  ['How many Earths would fit inside Uranus (by volume)?', 25_362, 6_371, 'Uranus is about 4 Earths across.'],
  ['How many Earths would fit inside Neptune (by volume)?', 24_622, 6_371, 'Neptune is just under 4 Earths across.'],
  ['How many Moons would fit inside the Earth (by volume)?', 6_371, 1_737.4, 'The Moon is a little over a quarter of Earth’s width (3,474 km vs 12,742 km).'],
  ['How many Mars-sized planets would fit inside the Earth (by volume)?', 6_371, 3_389.5, 'Mars is about half Earth’s width (6,779 km vs 12,742 km).'],
  ['How many Jupiters would fit inside the Sun (by volume)?', 695_700, 69_911, 'The Sun is about 10 Jupiters across.'],
]

const volumeQuestions = VOLUMES.map(([prompt, big, small, anchor]) => {
  const ratio = big / small
  const r = ratio < 10 ? Math.round(ratio * 10) / 10 : Math.round(ratio)
  return question('space', prompt, Number((ratio ** 3).toPrecision(4)), 'times', ratio > 50 ? 'medium' : 'easy', 'Ratio of mean radii, cubed (NASA fact sheets)', [
    { step: `Width ratio ≈ ${r}`, source: anchor },
    { step: `${r}³ ≈ ${round(r ** 3)}`, source: 'Volume grows with the cube of the width (and gaps between packed spheres are ignored).' },
  ])
})

export const FAMILY_QUESTIONS: Question[] = [
  ...stateQuestions,
  ...distanceQuestions,
  ...massQuestions,
  ...atomQuestions,
  ...growthQuestions,
  ...inflationQuestions,
  ...planetQuestions,
  ...volumeQuestions,
]
