/**
 * Estimathon practice questions. To add one, append an object to QUESTIONS:
 * `answer` is a plain number in `unit`, and each guide step pairs a number in
 * the Fermi estimate with where it comes from.
 */

export type Category = 'population' | 'physics' | 'money' | 'history' | 'everyday'
export type Difficulty = 'easy' | 'medium' | 'hard'

export const CATEGORY_LABELS: Record<Category, string> = {
  population: 'Population',
  physics: 'Physics',
  money: 'Money',
  history: 'History',
  everyday: 'Everyday objects',
}

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

export interface GuideStep {
  /** One link in the estimate, e.g. "US population ≈ 330 million". */
  step: string
  /** Where that number comes from. */
  source: string
}

export interface Question {
  id: string
  prompt: string
  answer: number
  unit: string
  category: Category
  difficulty: Difficulty
  /** Where the true answer comes from. */
  answerSource: string
  guide: GuideStep[]
}

export const QUESTIONS: Question[] = [
  {
    id: 'california-population',
    prompt: 'How many people lived in California at the 2020 US Census?',
    answer: 39_538_223,
    unit: 'people',
    category: 'population',
    difficulty: 'easy',
    answerSource: 'US Census Bureau, 2020 Census apportionment results',
    guide: [
      { step: 'US population ≈ 330 million', source: 'The 2020 census headline figure was 331 million, a number worth memorising.' },
      {
        step: 'California’s share ≈ 12%',
        source: 'House seats are handed out by population, and California got 52 of the 435 (≈ 12%) after 2020.',
      },
      { step: '330 million × 0.12 ≈ 40 million', source: 'Multiply the two.' },
      { step: 'A 35–45 million interval is a safe, tight call', source: 'Both inputs are solid, so a ratio near 1.3 is reasonable.' },
    ],
  },
  {
    id: 'japan-population',
    prompt: 'What was Japan’s population at its 2020 census?',
    answer: 126_146_099,
    unit: 'people',
    category: 'population',
    difficulty: 'medium',
    answerSource: 'Statistics Bureau of Japan, 2020 Population Census',
    guide: [
      { step: 'Land area ≈ 380,000 km²', source: 'Japan is a little larger than Germany (≈ 357,000 km²).' },
      {
        step: 'Density ≈ 330 people per km²',
        source: 'Japan is much denser than Germany (≈ 230/km²) and a bit denser than the UK (≈ 280/km²): most people live on narrow coastal plains.',
      },
      { step: '380,000 × 330 ≈ 125 million', source: 'Multiply area by density.' },
      {
        step: 'Cross-check: Greater Tokyo ≈ 37 million ≈ 30% of Japan → ≈ 120 million',
        source: 'Tokyo is usually quoted as the world’s largest metro area at around 37 million.',
      },
    ],
  },
  {
    id: 'us-births',
    prompt: 'How many babies were born in the United States in 2023?',
    answer: 3_596_017,
    unit: 'births',
    category: 'population',
    difficulty: 'hard',
    answerSource: 'CDC National Center for Health Statistics, “Births: Final Data for 2023”',
    guide: [
      { step: 'US population ≈ 335 million', source: '331 million at the 2020 census, plus a few years of growth.' },
      {
        step: 'Steady state: births ≈ population ÷ lifespan ≈ 335M ÷ 80 ≈ 4.2 million',
        source: 'In a stable population each year’s births replace one year’s worth of people; US life expectancy is in the high 70s.',
      },
      {
        step: 'Shade down ≈ 15% → ≈ 3.6 million',
        source: 'US fertility (≈ 1.6 children per woman) is below replacement (2.1), and immigration rather than births fills part of the gap.',
      },
      {
        step: 'Cross-check: birth rate ≈ 11 per 1,000 people → 335M × 0.011 ≈ 3.7 million',
        source: 'Rich countries’ crude birth rates mostly sit between about 8 and 12 per 1,000.',
      },
    ],
  },
  {
    id: 'moon-distance',
    prompt: 'What is the average distance from the Earth to the Moon?',
    answer: 384_400,
    unit: 'km',
    category: 'physics',
    difficulty: 'easy',
    answerSource: 'NASA, Moon fact sheet (mean Earth–Moon distance)',
    guide: [
      {
        step: 'Light takes ≈ 1.3 s to cross it',
        source: 'Apollo mission audio has a ≈ 2.5 s pause between Houston’s question and the astronaut’s answer: there and back.',
      },
      { step: 'Speed of light ≈ 300,000 km/s', source: 'Physical constant (299,792 km/s).' },
      { step: '1.3 s × 300,000 km/s ≈ 390,000 km', source: 'Distance = speed × time.' },
      {
        step: 'Cross-check: ≈ 30 Earth diameters → 30 × 12,700 km ≈ 380,000 km',
        source: 'A common picture: all the other planets would fit side by side in the gap, which spans about 30 Earths.',
      },
    ],
  },
  {
    id: 'atmosphere-mass',
    prompt: 'What is the total mass of Earth’s atmosphere?',
    answer: 5.15e18,
    unit: 'kg',
    category: 'physics',
    difficulty: 'hard',
    answerSource: 'Trenberth & Smith (2005), “The Mass of the Atmosphere”, Journal of Climate',
    guide: [
      {
        step: 'Sea-level pressure ≈ 100,000 Pa',
        source: 'Standard atmosphere is 101,325 Pa: the weight of the air above each square metre.',
      },
      { step: 'Air above each m² ≈ 100,000 ÷ 10 ≈ 10,000 kg', source: 'Pressure = weight ÷ area, and weight = mass × g with g ≈ 10 m/s².' },
      {
        step: 'Earth’s surface ≈ 4π × (6.4 × 10⁶ m)² ≈ 5.1 × 10¹⁴ m²',
        source: 'Area of a sphere with Earth’s radius (≈ 6,400 km).',
      },
      { step: '10⁴ kg/m² × 5.1 × 10¹⁴ m² ≈ 5.1 × 10¹⁸ kg', source: 'Mass per area × area. Mountains push the true value down a touch.' },
    ],
  },
  {
    id: 'sunlight-travel',
    prompt: 'How long does sunlight take to reach the Earth?',
    answer: 499,
    unit: 'seconds',
    category: 'physics',
    difficulty: 'medium',
    answerSource: 'NASA (1 astronomical unit ÷ the speed of light)',
    guide: [
      { step: 'Earth–Sun distance ≈ 150 million km', source: 'One astronomical unit is 149.6 million km (about 93 million miles).' },
      { step: 'Speed of light ≈ 300,000 km/s', source: 'Physical constant (299,792 km/s).' },
      { step: '150,000,000 ÷ 300,000 ≈ 500 s ≈ 8⅓ minutes', source: 'Time = distance ÷ speed.' },
    ],
  },
  {
    id: 'minimum-wage-year',
    prompt: 'What is the gross yearly pay for a full-time job at the US federal minimum wage?',
    answer: 15_080,
    unit: 'US dollars',
    category: 'money',
    difficulty: 'easy',
    answerSource: 'US Department of Labor: $7.25 an hour since July 24, 2009; full time = 2,080 hours a year',
    guide: [
      { step: 'Wage = $7.25 an hour', source: 'The federal minimum, unchanged since 2009.' },
      { step: '40 hours a week × 52 weeks = 2,080 hours', source: 'The standard full-time year that payroll uses.' },
      { step: '$7.25 × 2,080 = $15,080', source: 'Hours × wage. Rounding to $7 × 2,000 = $14,000 already lands within 10%.' },
    ],
  },
  {
    id: 'apple-revenue-2023',
    prompt: 'What were Apple’s total net sales in fiscal year 2023?',
    answer: 383_285_000_000,
    unit: 'US dollars',
    category: 'money',
    difficulty: 'medium',
    answerSource: 'Apple Inc., Form 10-K for fiscal 2023 ($383.285 billion)',
    guide: [
      {
        step: 'iPhones sold per year ≈ 230 million',
        source: 'Analyst estimates; Apple stopped publishing unit sales after 2018, but the figure has hovered around 200–240 million.',
      },
      {
        step: 'Average selling price ≈ $850',
        source: 'Between the ≈ $800 base model and the $1,000+ Pro models, pulled down by older, cheaper models.',
      },
      { step: 'iPhone sales ≈ 230M × $850 ≈ $195 billion', source: 'Units × price.' },
      {
        step: 'iPhone ≈ half of Apple’s sales → total ≈ $390 billion',
        source: 'Apple’s segment reports have put iPhone at about half of revenue for years; services, Mac, iPad and wearables make up the rest.',
      },
    ],
  },
  {
    id: 'million-dollar-weight',
    prompt: 'How much does $1,000,000 in $100 bills weigh?',
    answer: 10,
    unit: 'kg',
    category: 'money',
    difficulty: 'easy',
    answerSource: 'US Bureau of Engraving and Printing: each note weighs about 1 gram',
    guide: [
      { step: '$1,000,000 ÷ $100 = 10,000 notes', source: 'Count the notes.' },
      {
        step: 'One note ≈ 156 mm × 66 mm ≈ 0.01 m²',
        source: 'A US bill is 6.14 × 2.61 inches; every denomination is the same size.',
      },
      {
        step: 'Paper ≈ 80–100 g per m² → ≈ 1 g per note',
        source: 'Printer paper is sold as “80 gsm”; banknote paper is a little heavier.',
      },
      { step: '10,000 × 1 g = 10 kg', source: 'About the weight of a full carry-on bag.' },
    ],
  },
  {
    id: 'hundred-years-war',
    prompt: 'How many years did the Hundred Years’ War last?',
    answer: 116,
    unit: 'years',
    category: 'history',
    difficulty: 'easy',
    answerSource: 'Encyclopaedia Britannica: 1337–1453',
    guide: [
      { step: 'Start near 100', source: 'Historians named the war afterwards, and names like this round.' },
      { step: 'Start ≈ 1330s', source: 'Edward III of England claimed the French throne in the 1330s.' },
      { step: 'Joan of Arc ≈ 1429–1431 sits late in the war', source: 'She turned the tide for France; English losses followed over the next two decades.' },
      { step: 'End ≈ 1450s → 1450s − 1330s ≈ 115–120 years', source: 'The war ended in 1453, the same year Constantinople fell.' },
    ],
  },
  {
    id: 'declaration-signers',
    prompt: 'How many men signed the United States Declaration of Independence?',
    answer: 56,
    unit: 'signers',
    category: 'history',
    difficulty: 'medium',
    answerSource: 'US National Archives',
    guide: [
      { step: '13 colonies, each with a delegation', source: 'The Continental Congress seated one delegation per colony.' },
      {
        step: 'Typical delegation ≈ 4 people',
        source: 'Delegations ran from 2 (Rhode Island) to 9 (Pennsylvania); most were 3–5.',
      },
      { step: '13 × 4 ≈ 52 → interval ≈ 45–65', source: 'Colonies × delegates.' },
    ],
  },
  {
    id: 'siege-of-leningrad',
    prompt: 'How many days did the Siege of Leningrad last?',
    answer: 872,
    unit: 'days',
    category: 'history',
    difficulty: 'hard',
    answerSource: 'Encyclopaedia Britannica: 8 September 1941 to 27 January 1944',
    guide: [
      {
        step: 'Start ≈ September 1941',
        source: 'Germany invaded the USSR in June 1941 and had Leningrad surrounded about eleven weeks later.',
      },
      { step: 'End ≈ January 1944', source: 'The Red Army lifted the siege in its winter offensives, months before D-Day.' },
      { step: 'Sept 1941 → Jan 1944 ≈ 2 years + 4½ months', source: 'Count the calendar.' },
      { step: '730 + 140 ≈ 870 days', source: '2 × 365 days, plus about 4½ × 30.' },
    ],
  },
  {
    id: 'olympic-pool',
    prompt: 'How many litres of water does an Olympic-size swimming pool hold (the commonly quoted figure)?',
    answer: 2_500_000,
    unit: 'litres',
    category: 'everyday',
    difficulty: 'easy',
    answerSource: 'World Aquatics facilities rules: 50 m × 25 m, at least 2 m deep',
    guide: [
      { step: 'Length = 50 m', source: 'Olympic races are 50, 100, 200 m… one length is the shortest race.' },
      { step: 'Width = 25 m', source: '10 lanes × 2.5 m each.' },
      { step: 'Depth ≈ 2 m', source: 'The rulebook minimum; deeper pools are “faster”, but 2 m is the usual figure.' },
      { step: '50 × 25 × 2 = 2,500 m³ = 2.5 million litres', source: '1 m³ holds 1,000 litres.' },
    ],
  },
  {
    id: 'dollar-bill-thickness',
    prompt: 'How thick is a US dollar bill?',
    answer: 0.109,
    unit: 'mm',
    category: 'everyday',
    difficulty: 'medium',
    answerSource: 'US Bureau of Engraving and Printing: 0.0043 inches',
    guide: [
      { step: 'A 500-sheet ream of printer paper ≈ 5 cm thick', source: 'About two inches: picture the packet next to a printer.' },
      { step: '50 mm ÷ 500 = 0.1 mm per sheet', source: 'Thickness ÷ sheets.' },
      { step: 'A bill ≈ a sheet of printer paper → ≈ 0.1 mm', source: 'Banknotes feel about as thick as printer paper, a touch crisper.' },
    ],
  },
  {
    id: 'penny-mass',
    prompt: 'How much does a US penny minted today weigh?',
    answer: 2.5,
    unit: 'grams',
    category: 'everyday',
    difficulty: 'hard',
    answerSource: 'US Mint coin specifications: 2.500 g, copper-plated zinc',
    guide: [
      { step: 'Diameter ≈ 19 mm', source: 'Three-quarters of an inch.' },
      { step: 'Thickness ≈ 1.5 mm', source: 'A paper roll of 50 pennies is about 3 inches (≈ 76 mm) long.' },
      { step: 'Volume ≈ π × (0.95 cm)² × 0.15 cm ≈ 0.43 cm³', source: 'Treat the coin as a solid cylinder.' },
      {
        step: 'Density ≈ 7 g/cm³ → ≈ 3 g',
        source: 'Since 1982 pennies have been mostly zinc (≈ 7.1 g/cm³), with a thin copper coat.',
      },
      {
        step: 'Shade down → ≈ 2.5 g',
        source: 'The raised rim makes the coin look thicker than its face really is, so the true metal volume is lower.',
      },
    ],
  },
]
