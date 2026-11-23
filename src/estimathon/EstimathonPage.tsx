import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { CATEGORY_LABELS, DIFFICULTIES, QUESTIONS, type Category, type Difficulty, type Question } from './questions'
import { formatNumber, numberInWords, parseGuess } from './numbers'
import { averageWidth, emptyStats, hitRate, loadStats, record, saveStats, type Mode, type Tally } from './stats'
import './estimathon.css'

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[]
const TIMERS = [0, 30, 60, 120]

const MODES: { id: Mode; title: string; blurb: string }[] = [
  { id: 'interval', title: 'Estimathon', blurb: 'A low and a high guess' },
  { id: 'single', title: 'Fermi', blurb: 'One guess, scored by how far off' },
]

/** In Fermi mode, a guess within this many times of the answer counts as close. */
const CLOSE = 2

const MODE_KEY = 'estimathon-mode'

function savedMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === 'single' ? 'single' : 'interval'
  } catch {
    return 'interval'
  }
}

interface Result {
  low: number | null
  high: number | null
  guess: number | null
  hit: boolean
  timedOut: boolean
}

const percent = (r: number | null) => (r === null ? '—' : `${Math.round(r * 100)}%`)
const times = (r: number | null) => (r === null ? '—' : `×${r.toFixed(2)}`)
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
const capitalise = (s: string) => s[0].toUpperCase() + s.slice(1)
/** How many times off a guess is: 1 is exact, 2 is double or half. */
const timesOff = (guess: number, answer: number) => Math.max(guess / answer, answer / guess)

/** A fresh random order of every question (Fisher–Yates), so “Next” mixes categories. */
function shuffled(list: Question[]) {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function Amount({ n, unit }: { n: number; unit: string }) {
  const inWords = numberInWords(n)
  return (
    <>
      {formatNumber(n)} {unit}
      {inWords && <span className="est__words"> ({inWords})</span>}
    </>
  )
}

function verdict(mode: Mode, result: Result, answer: number) {
  const late = result.timedOut ? ' (time ran out)' : ''
  if (mode === 'single') {
    if (result.guess === null) return 'Time’s up, with no guess in.'
    const off = timesOff(result.guess, answer)
    if (off < 1.005) return 'Spot on!'
    return `You landed ×${off.toFixed(2)} ${result.guess < answer ? 'too low' : 'too high'}${off <= CLOSE ? ': close!' : '.'}${late}`
  }
  if (result.hit) return 'Hit: the answer is inside your interval.'
  if (result.low === null || result.high === null) return 'Time’s up, with no interval in.'
  return `Miss: the answer is ${answer < result.low ? 'below' : 'above'} your interval${late}.`
}

export default function EstimathonPage() {
  const [mode, setMode] = useState<Mode>(savedMode)
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all')
  const [timer, setTimer] = useState(0)
  const [deck] = useState(() => shuffled(QUESTIONS))
  const [questionId, setQuestionId] = useState(deck[0].id)
  const [low, setLow] = useState('')
  const [high, setHigh] = useState('')
  const [guess, setGuess] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [deadline, setDeadline] = useState<number | null>(null)
  const [now, setNow] = useState(0)
  const [stats, setStats] = useState(() => loadStats(mode))

  const firstRef = useRef<HTMLInputElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const focusFirst = useRef(false)

  const filtered = useMemo(
    () =>
      deck.filter(
        (q) => (category === 'all' || q.category === category) && (difficulty === 'all' || q.difficulty === difficulty),
      ),
    [deck, category, difficulty],
  )
  const index = filtered.findIndex((q) => q.id === questionId)
  const question = filtered[index] as Question | undefined

  useEffect(() => {
    const title = document.title
    document.title = 'Estimathon practice | Nikhil Kolli'
    return () => {
      document.title = title
    }
  }, [])

  useEffect(() => saveStats(mode, stats), [mode, stats])

  /** Puts a fresh question up, with the countdown (if any) restarted. */
  const show = (q: Question | undefined) => {
    if (q) setQuestionId(q.id)
    setLow('')
    setHigh('')
    setGuess('')
    setError(null)
    setResult(null)
    setNow(Date.now())
    setDeadline(timer ? Date.now() + timer * 1000 : null)
    focusFirst.current = true
  }

  // Moving on puts the cursor back in the first box (but not on arrival, where
  // a phone would throw its keyboard up over the page).
  useEffect(() => {
    if (focusFirst.current) firstRef.current?.focus()
    focusFirst.current = false
  }, [questionId, result])

  useEffect(() => {
    if (result) nextRef.current?.focus()
  }, [result])

  const reveal = (timedOut: boolean) => {
    if (!question || result) return
    if (mode === 'single') {
      let g = parseGuess(guess)
      if (!timedOut) {
        if (g === null) return setError('Enter your guess as a number, like 2500000, 2.5e6 or 2.5m.')
        if (g <= 0) return setError('Your guess has to be above zero.')
      } else if (g === null || g <= 0) {
        g = null
      }
      const off = g === null ? null : timesOff(g, question.answer)
      const hit = off !== null && off <= CLOSE
      setResult({ low: null, high: null, guess: g, hit, timedOut })
      setStats((s) => record(s, question.category, hit, off))
    } else {
      let lo = parseGuess(low)
      let hi = parseGuess(high)
      if (!timedOut) {
        if (lo === null || hi === null) return setError('Enter both guesses as numbers, like 2500000, 2.5e6 or 2.5m.')
        if (lo <= 0) return setError('The low guess has to be above zero.')
        if (hi < lo) return setError('The high guess can’t be below the low guess.')
      } else if (lo === null || hi === null || lo <= 0 || hi < lo) {
        lo = hi = null
      }
      const hit = lo !== null && hi !== null && lo <= question.answer && question.answer <= hi
      setResult({ low: lo, high: hi, guess: null, hit, timedOut })
      setStats((s) => record(s, question.category, hit, lo !== null && hi !== null ? hi / lo : null))
    }
    setError(null)
    setDeadline(null)
  }

  // The countdown submits whatever is in the boxes when it runs out.
  const revealRef = useRef(reveal)
  useLayoutEffect(() => {
    revealRef.current = reveal
  })
  useEffect(() => {
    if (deadline === null) return
    const id = window.setInterval(() => {
      setNow(Date.now())
      if (Date.now() >= deadline) revealRef.current(true)
    }, 250)
    return () => window.clearInterval(id)
  }, [deadline])

  const next = () => show(filtered[(index + 1) % filtered.length])
  const random = () => {
    const others = filtered.filter((q) => q.id !== questionId)
    show(others.length ? others[Math.floor(Math.random() * others.length)] : filtered[0])
  }

  // Enter moves on from a revealed answer wherever focus is (buttons, links and
  // menus keep their own Enter).
  useEffect(() => {
    if (!result) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || (e.target as Element).closest?.('button, a, select, input')) return
      e.preventDefault()
      nextRef.current?.click()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [result])

  const changeMode = (m: Mode) => {
    setMode(m)
    setStats(loadStats(m))
    try {
      localStorage.setItem(MODE_KEY, m)
    } catch {
      // The choice just won't be remembered.
    }
    // The same question, asked afresh in the new format.
    show(question)
    focusFirst.current = false
  }

  const changeFilter = (nextCategory: Category | 'all', nextDifficulty: Difficulty | 'all') => {
    setCategory(nextCategory)
    setDifficulty(nextDifficulty)
    const list = deck.filter(
      (q) =>
        (nextCategory === 'all' || q.category === nextCategory) &&
        (nextDifficulty === 'all' || q.difficulty === nextDifficulty),
    )
    if (list.some((q) => q.id === questionId)) return
    show(list[0])
    // Leave focus on the menu that was just changed.
    focusFirst.current = false
  }

  const changeTimer = (seconds: number) => {
    setTimer(seconds)
    if (!result) {
      setNow(Date.now())
      setDeadline(seconds ? Date.now() + seconds * 1000 : null)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    reveal(false)
  }

  const resetStats = () => {
    const name = mode === 'single' ? 'Fermi' : 'Estimathon'
    if (window.confirm(`Reset your ${name} progress? This can’t be undone.`)) setStats(emptyStats())
  }

  const remaining = deadline === null ? null : Math.max(0, Math.ceil((deadline - now) / 1000))
  const ratio = result?.low && result.high ? result.high / result.low : null
  const off = result?.guess && question ? timesOff(result.guess, question.answer) : null
  const single = mode === 'single'
  const hitLabel = single ? `Within ×${CLOSE}` : 'Hit rate'
  const widthLabel = single ? 'Average miss' : 'Average width'

  const statRow = (label: string, t: Tally | undefined) => (
    <tr key={label}>
      <th scope="row">{label}</th>
      <td>{t?.attempts ?? 0}</td>
      <td>{percent(t ? hitRate(t) : null)}</td>
      <td>{times(t ? averageWidth(t) : null)}</td>
    </tr>
  )

  const input = (label: string, value: string, set: (v: string) => void, first: boolean) => (
    <label className="est__field est__field--guess">
      <span>{label}</span>
      <input
        ref={first ? firstRef : undefined}
        value={value}
        onChange={(e) => set(e.target.value)}
        readOnly={!!result}
        autoComplete="off"
        spellCheck={false}
        aria-describedby="est-hint"
        aria-invalid={!!error}
      />
    </label>
  )

  return (
    <div className="est">
      <div className="est__wrap">
        <header className="est__header">
          <a className="est__back" href={import.meta.env.BASE_URL}>
            ← Back to the table
          </a>
          <h1 className="est__title">Estimathon practice</h1>
          <p className="est__lede">
            {single
              ? 'One guess per question, scored by how many times off it is: ×1 is exact, and anything within ×2 is close. No looking things up, just napkin math.'
              : 'Give a low and a high guess for each question. It counts when the true answer lands inside, and the tighter the interval, the better.'}
          </p>
        </header>

        <fieldset className="est__modes">
          <legend className="est__sr">Game mode</legend>
          {MODES.map((m) => (
            <label key={m.id} className="est__mode">
              <input type="radio" name="est-mode" value={m.id} checked={mode === m.id} onChange={() => changeMode(m.id)} />
              <span>
                <strong>{m.title}</strong>
                <small>{m.blurb}</small>
              </span>
            </label>
          ))}
        </fieldset>

        <section className="est__filters" aria-label="Question options">
          <label className="est__field">
            <span>Category</span>
            <select value={category} onChange={(e) => changeFilter(e.target.value as Category | 'all', difficulty)}>
              <option value="all">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="est__field">
            <span>Difficulty</span>
            <select value={difficulty} onChange={(e) => changeFilter(category, e.target.value as Difficulty | 'all')}>
              <option value="all">Any difficulty</option>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {capitalise(d)}
                </option>
              ))}
            </select>
          </label>
          <label className="est__field">
            <span>Timer</span>
            <select value={timer} onChange={(e) => changeTimer(Number(e.target.value))}>
              {TIMERS.map((t) => (
                <option key={t} value={t}>
                  {t ? `${t} seconds` : 'Off'}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="est__btn est__btn--ghost" onClick={random} disabled={!filtered.length}>
            Random question
          </button>
        </section>

        {question ? (
          <article className="est__card" aria-labelledby="est-prompt">
            <div className="est__meta">
              <span className="est__tag">{CATEGORY_LABELS[question.category]}</span>
              <span className={`est__tag est__tag--${question.difficulty}`}>{capitalise(question.difficulty)}</span>
              <span className="est__count">
                {index + 1} of {filtered.length}
              </span>
              {remaining !== null && (
                <span className={`est__timer${remaining <= 10 ? ' est__timer--low' : ''}`} role="timer" aria-label="Time left">
                  {clock(remaining)}
                </span>
              )}
            </div>
            <h2 id="est-prompt" className="est__prompt">
              {question.prompt}
            </h2>
            <p className="est__unit">Answer in {question.unit}</p>

            <form className={`est__form${single ? ' est__form--single' : ''}`} onSubmit={submit} noValidate>
              {single ? (
                input('Your guess', guess, setGuess, true)
              ) : (
                <>
                  {input('Low guess', low, setLow, true)}
                  {input('High guess', high, setHigh, false)}
                </>
              )}
              {!result && (
                <button type="submit" className="est__btn">
                  {single ? 'Lock it in' : 'Reveal'}
                </button>
              )}
            </form>
            <p id="est-hint" className={error ? 'est__error' : 'est__hint'} role={error ? 'alert' : undefined}>
              {error ?? 'Type 2500000, 2,500,000, 2.5e6, 2.5m or 2.5 million. Enter submits.'}
            </p>

            <div aria-live="polite">
              {result && (
                <section className="est__result" aria-label="Answer">
                  <p className={`est__verdict est__verdict--${result.hit ? 'hit' : 'miss'}`}>{verdict(mode, result, question.answer)}</p>
                  <dl className="est__facts">
                    <div>
                      <dt>True answer</dt>
                      <dd>
                        <Amount n={question.answer} unit={question.unit} />
                      </dd>
                    </div>
                    {result.guess !== null && (
                      <div>
                        <dt>Your guess</dt>
                        <dd>{formatNumber(result.guess)}</dd>
                      </div>
                    )}
                    {off !== null && (
                      <div>
                        <dt>How far off</dt>
                        <dd>
                          {times(off)} <span className="est__words">(×1 is exact; lower is better)</span>
                        </dd>
                      </div>
                    )}
                    {result.low !== null && result.high !== null && (
                      <div>
                        <dt>Your interval</dt>
                        <dd>
                          {formatNumber(result.low)} to {formatNumber(result.high)}
                        </dd>
                      </div>
                    )}
                    {ratio !== null && (
                      <div>
                        <dt>Width (high ÷ low)</dt>
                        <dd>
                          {times(ratio)} <span className="est__words">(scores as {Math.floor(ratio)} in Estimathon)</span>
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt>Source</dt>
                      <dd>{question.answerSource}</dd>
                    </div>
                  </dl>

                  <h3 className="est__guide-title">Napkin math</h3>
                  <ol className="est__guide">
                    {question.guide.map((g) => (
                      <li key={g.step}>
                        <strong>{g.step}</strong>
                        <span>{g.source}</span>
                      </li>
                    ))}
                  </ol>

                  <button ref={nextRef} type="button" className="est__btn" onClick={next}>
                    Next question
                  </button>
                </section>
              )}
            </div>
          </article>
        ) : (
          <p className="est__card est__empty">No questions match those filters yet.</p>
        )}

        <section className="est__stats" aria-labelledby="est-stats-title">
          <div className="est__stats-head">
            <h2 id="est-stats-title">Your {single ? 'Fermi' : 'Estimathon'} progress</h2>
            <button type="button" className="est__btn est__btn--ghost" onClick={resetStats} disabled={!stats.total.attempts}>
              Reset
            </button>
          </div>
          <div className="est__tiles">
            <div className="est__tile">
              <span>Answered</span>
              <strong>{stats.total.attempts}</strong>
            </div>
            <div className="est__tile">
              <span>{hitLabel}</span>
              <strong>{percent(hitRate(stats.total))}</strong>
            </div>
            <div className="est__tile">
              <span>{widthLabel}</span>
              <strong>{times(averageWidth(stats.total))}</strong>
            </div>
          </div>
          <div className="est__table-wrap">
            <table className="est__table">
              <caption className="est__sr">Progress by category</caption>
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col">Answered</th>
                  <th scope="col">{hitLabel}</th>
                  <th scope="col">{single ? 'Avg. miss' : 'Avg. width'}</th>
                </tr>
              </thead>
              <tbody>{CATEGORIES.map((c) => statRow(CATEGORY_LABELS[c], stats.byCategory[c]))}</tbody>
            </table>
          </div>
          <p className="est__note">
            {single
              ? 'Average miss is the geometric mean of how many times off each guess was, so one wild guess doesn’t swamp the rest.'
              : 'Average width is the geometric mean of high ÷ low, so one very wide interval doesn’t swamp the rest.'}{' '}
            Each mode keeps its own progress, saved in this browser only.
          </p>
        </section>
      </div>
    </div>
  )
}
