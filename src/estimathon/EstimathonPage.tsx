import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { CATEGORY_LABELS, DIFFICULTIES, QUESTIONS, type Category, type Difficulty, type Question } from './questions'
import { formatNumber, numberInWords, parseGuess } from './numbers'
import { averageWidth, emptyStats, hitRate, loadStats, record, saveStats, type Tally } from './stats'
import './estimathon.css'

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[]
const TIMERS = [0, 30, 60, 120]

interface Result {
  low: number | null
  high: number | null
  hit: boolean
  timedOut: boolean
}

const percent = (r: number | null) => (r === null ? '—' : `${Math.round(r * 100)}%`)
const width = (r: number | null) => (r === null ? '—' : `×${r.toFixed(2)}`)
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
const capitalise = (s: string) => s[0].toUpperCase() + s.slice(1)

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

export default function EstimathonPage() {
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all')
  const [timer, setTimer] = useState(0)
  const [deck] = useState(() => shuffled(QUESTIONS))
  const [questionId, setQuestionId] = useState(deck[0].id)
  const [low, setLow] = useState('')
  const [high, setHigh] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [deadline, setDeadline] = useState<number | null>(null)
  const [now, setNow] = useState(0)
  const [stats, setStats] = useState(loadStats)

  const lowRef = useRef<HTMLInputElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const focusLow = useRef(false)

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

  useEffect(() => saveStats(stats), [stats])

  /** Puts a fresh question up, with the countdown (if any) restarted. */
  const show = (q: Question | undefined) => {
    if (q) setQuestionId(q.id)
    setLow('')
    setHigh('')
    setError(null)
    setResult(null)
    setNow(Date.now())
    setDeadline(timer ? Date.now() + timer * 1000 : null)
    focusLow.current = true
  }

  // Moving on puts the cursor back in the first box (but not on arrival, where
  // a phone would throw its keyboard up over the page).
  useEffect(() => {
    if (focusLow.current) lowRef.current?.focus()
    focusLow.current = false
  }, [questionId, result])

  useEffect(() => {
    if (result) nextRef.current?.focus()
  }, [result])

  const reveal = (timedOut: boolean) => {
    if (!question || result) return
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
    setError(null)
    setDeadline(null)
    setResult({ low: lo, high: hi, hit, timedOut })
    setStats((s) => record(s, question.category, hit, lo !== null && hi !== null ? hi / lo : null))
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
    focusLow.current = false
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
    if (window.confirm('Reset your Estimathon progress? This can’t be undone.')) setStats(emptyStats())
  }

  const remaining = deadline === null ? null : Math.max(0, Math.ceil((deadline - now) / 1000))
  const ratio = result?.low && result.high ? result.high / result.low : null

  const statRow = (label: string, t: Tally | undefined) => (
    <tr key={label}>
      <th scope="row">{label}</th>
      <td>{t?.attempts ?? 0}</td>
      <td>{percent(t ? hitRate(t) : null)}</td>
      <td>{width(t ? averageWidth(t) : null)}</td>
    </tr>
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
            Give a low and a high guess for each question. It counts when the true answer lands inside, and the
            tighter the interval, the better.
          </p>
        </header>

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

            <form className="est__form" onSubmit={submit} noValidate>
              <label className="est__field est__field--guess">
                <span>Low guess</span>
                <input
                  ref={lowRef}
                  value={low}
                  onChange={(e) => setLow(e.target.value)}
                  readOnly={!!result}
                  autoComplete="off"
                  spellCheck={false}
                  aria-describedby="est-hint"
                  aria-invalid={!!error}
                />
              </label>
              <label className="est__field est__field--guess">
                <span>High guess</span>
                <input
                  value={high}
                  onChange={(e) => setHigh(e.target.value)}
                  readOnly={!!result}
                  autoComplete="off"
                  spellCheck={false}
                  aria-describedby="est-hint"
                  aria-invalid={!!error}
                />
              </label>
              {!result && (
                <button type="submit" className="est__btn">
                  Reveal
                </button>
              )}
            </form>
            <p id="est-hint" className={error ? 'est__error' : 'est__hint'} role={error ? 'alert' : undefined}>
              {error ?? 'Type 2500000, 2,500,000, 2.5e6, 2.5m or 2.5 million. Enter submits.'}
            </p>

            <div aria-live="polite">
              {result && (
                <section className="est__result" aria-label="Answer">
                  <p className={`est__verdict est__verdict--${result.hit ? 'hit' : 'miss'}`}>
                    {result.hit
                      ? 'Hit: the answer is inside your interval.'
                      : result.low === null || result.high === null
                        ? 'Time’s up, with no interval in.'
                        : question.answer < result.low
                          ? `Miss: the answer is below your interval${result.timedOut ? ' (time ran out)' : ''}.`
                          : `Miss: the answer is above your interval${result.timedOut ? ' (time ran out)' : ''}.`}
                  </p>
                  <dl className="est__facts">
                    <div>
                      <dt>True answer</dt>
                      <dd>
                        <Amount n={question.answer} unit={question.unit} />
                      </dd>
                    </div>
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
                          {width(ratio)} <span className="est__words">(scores as {Math.floor(ratio)} in Estimathon)</span>
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt>Source</dt>
                      <dd>{question.answerSource}</dd>
                    </div>
                  </dl>

                  <h3 className="est__guide-title">How to estimate it</h3>
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
            <h2 id="est-stats-title">Your progress</h2>
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
              <span>Hit rate</span>
              <strong>{percent(hitRate(stats.total))}</strong>
            </div>
            <div className="est__tile">
              <span>Average width</span>
              <strong>{width(averageWidth(stats.total))}</strong>
            </div>
          </div>
          <div className="est__table-wrap">
            <table className="est__table">
              <caption className="est__sr">Progress by category</caption>
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col">Answered</th>
                  <th scope="col">Hit rate</th>
                  <th scope="col">Avg. width</th>
                </tr>
              </thead>
              <tbody>{CATEGORIES.map((c) => statRow(CATEGORY_LABELS[c], stats.byCategory[c]))}</tbody>
            </table>
          </div>
          <p className="est__note">
            Average width is the geometric mean of high ÷ low, so one very wide interval doesn’t swamp the rest. Saved in
            this browser only.
          </p>
        </section>
      </div>
    </div>
  )
}
