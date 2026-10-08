'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, ChevronLeft, ChevronRight, Leaf, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { PageWrapper } from '@/components/page-wrapper'
import { SkyBackdrop } from '@/components/onboarding/sky-backdrop'
import { LifeWeeks, weeksLived } from '@/components/onboarding/life-weeks'
import { PreviewRing } from '@/components/onboarding/preview-ring'
import { hourOf } from '@/lib/day-scene'

type Goal = { title: string; why: string }
const suggestions = [
  ['Health', 'Feel stronger and more energetic'],
  ['Focus', 'Spend more time on deep work'],
  ['Learning', 'Learn something new every week'],
  ['Relationships', 'Be more present with people I care about'],
  ['Money', 'Build a savings habit'],
  ['Calm', 'Find a few quiet minutes each day'],
] as const

const monthNames = Array.from({ length: 12 }, (_, index) => new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(2020, index, 1)))

type DateParts = { month: string; day: string; year: string }

type DateFieldsProps = {
  value: DateParts
  onChange: (value: DateParts) => void
  yearStart: number
  yearEnd: number
  ariaLabel: string
}

function DateFields({ value, onChange, yearStart, yearEnd, ariaLabel }: DateFieldsProps) {
  const daysInMonth = value.month && value.year ? new Date(Number(value.year), Number(value.month), 0).getDate() : 31
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1)
  const years = Array.from({ length: Math.abs(yearEnd - yearStart) + 1 }, (_, index) => yearStart + (yearEnd > yearStart ? index : -index))

  function update(part: keyof DateParts, nextValue: string) {
    const next = { ...value, [part]: nextValue }
    if (part !== 'day' && next.day && Number(next.day) > new Date(Number(next.year || 2000), Number(next.month || 1), 0).getDate()) next.day = ''
    onChange(next)
  }

  return (
    <div className="date-fields" aria-label={ariaLabel}>
      <label className="date-select"><span className="sr-only">Month</span><select value={value.month} onChange={(event) => update('month', event.target.value)} aria-label="Month"><option value="">Month</option>{monthNames.map((month, index) => <option value={index + 1} key={month}>{month}</option>)}</select><ChevronDown aria-hidden="true" /></label>
      <label className="date-select"><span className="sr-only">Day</span><select value={value.day} onChange={(event) => update('day', event.target.value)} aria-label="Day"><option value="">Day</option>{days.map((day) => <option value={day} key={day}>{day}</option>)}</select><ChevronDown aria-hidden="true" /></label>
      <label className="date-select"><span className="sr-only">Year</span><select value={value.year} onChange={(event) => update('year', event.target.value)} aria-label="Year"><option value="">Year</option>{years.map((year) => <option value={year} key={year}>{year}</option>)}</select><ChevronDown aria-hidden="true" /></label>
    </div>
  )
}

function toIsoDate({ month, day, year }: DateParts) {
  return month && day && year ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` : ''
}

/* ---------- Motion ---------- */

const EASE: [number, number, number, number] = [0.22, 0.8, 0.3, 1]

// Steps slide in the direction you are travelling; children rise in one after another.
const slide: Variants = {
  enter: (d: number) => ({ opacity: 0, x: d * 28 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.35, ease: EASE, staggerChildren: 0.07, delayChildren: 0.05 } },
  exit: (d: number) => ({ opacity: 0, x: d * -28, transition: { duration: 0.18 } }),
}
const slideReduced: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
}
const item: Variants = {
  enter: { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
}

// Which hour the sky shows at each step: dawn, morning, midday, afternoon, golden hour.
// The last screen uses the real clock, so it matches the Today screen you land on.
const STEP_HOURS = [6.4, 7.6, 10.5, 14, 17.3]
const SPARKLES = [
  { x: 12, d: 0.0, s: 5 }, { x: 24, d: 0.3, s: 4 }, { x: 36, d: 0.1, s: 6 }, { x: 48, d: 0.5, s: 4 },
  { x: 58, d: 0.2, s: 5 }, { x: 70, d: 0.45, s: 4 }, { x: 80, d: 0.05, s: 6 }, { x: 90, d: 0.35, s: 4 },
]

export default function WelcomePage() {
  const supabase = useMemo(
    () => (typeof window === "undefined" ? null : createClient()) as ReturnType<typeof createClient>,
    [],
  )
  const router = useRouter()
  const reduce = useReducedMotion()
  const [user, setUser] = useState<any>(null)
  const [step, setStep] = useState(0) // 0 = intro, 1 to 4 = questions, 5 = ready
  const [direction, setDirection] = useState(1)
  const [name, setName] = useState('')
  const [goals, setGoals] = useState<Goal[]>([{ title: '', why: '' }])
  const currentYear = new Date().getFullYear()
  const [dobParts, setDobParts] = useState<DateParts>({ month: '', day: '', year: '' })
  const [targetParts, setTargetParts] = useState<DateParts>({ month: '', day: '', year: '' })
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [countdownChoice, setCountdownChoice] = useState<'1y' | '3y' | '5y' | '10y' | 'custom' | null>(null)
  const [error, setError] = useState('')
  const [risen, setRisen] = useState(false)
  const [realHour] = useState(() => hourOf(new Date()))
  // Remember what has already been saved, so a retry never inserts the same thing twice.
  const saved = useRef({ goals: false, countdown: false })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: any } }) => {
      if (!data.user) router.replace('/')
      else setUser(data.user)
    })
  }, [router, supabase])

  // Sunrise on the intro screen.
  useEffect(() => {
    if (!user) return
    const id = window.setTimeout(() => setRisen(true), reduce ? 0 : 450)
    return () => window.clearTimeout(id)
  }, [user, reduce])

  // Move focus to the new step's heading so screen readers announce it.
  useEffect(() => {
    if (step === 0) return
    const id = window.setTimeout(() => document.querySelector<HTMLElement>('.ob-step h1')?.focus({ preventScroll: true }), 420)
    return () => window.clearTimeout(id)
  }, [step])

  const dob = toIsoDate(dobParts)
  const dobPartial = Boolean((dobParts.month || dobParts.day || dobParts.year) && !dob)
  const validDob = Boolean(dob) && new Date(`${dob}T00:00:00`) <= new Date()
  const target = toIsoDate(targetParts)
  const targetDate = target ? new Date(`${target}T23:59:59`) : null
  const validTarget = Boolean(title.trim() && targetDate && targetDate > new Date())
  const daysToGo = targetDate && targetDate > new Date() ? Math.ceil((targetDate.getTime() - Date.now()) / 86400000) : 0
  const countdownPreview = target
    ? `Counting down to ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${target}T00:00:00`))}`
    : ''
  const firstName = name.trim().split(/\s+/)[0] || ''
  const filledGoals = goals.filter((goal) => goal.title.trim())

  const hour = step === 0 ? (risen ? STEP_HOURS[0] : 4.9) : step === 5 ? realHour : STEP_HOURS[step]
  const stage = step === 0 ? 'intro' : step === 5 ? 'ready' : 'step'

  function updateGoal(index: number, patch: Partial<Goal>) {
    setGoals((current) => current.map((goal, i) => (i === index ? { ...goal, ...patch } : goal)))
  }

  function go(to: number) {
    setDirection(to > step ? 1 : -1)
    setError('')
    setStep(to)
  }

  function next() {
    if (saving) return
    if (step === 2 && !filledGoals.length) return setError('Add at least one goal to continue.')
    // Date of birth is optional: leaving it empty and continuing simply skips it.
    if (step === 3 && dobPartial) return setError('Finish the date, or skip for now.')
    if (step === 3 && dob && !validDob) return setError('Please choose a date in the past.')
    if (step === 4 && !title.trim()) return setError('Give what you are working toward a name.')
    if (step === 4 && (!target || !validTarget)) return setError('Choose a date in the future.')
    go(step + 1)
  }

  async function finish() {
    if (!user || saving) return
    setSaving(true)
    setError('')
    try {
      if (!saved.current.goals && filledGoals.length) {
        const rows = filledGoals.map((goal) => ({ user_id: user.id, title: goal.title.trim(), why: goal.why.trim() || null }))
        const { error: goalsError } = await supabase.from('goals').insert(rows)
        if (goalsError) throw goalsError
        saved.current.goals = true
      }
      if (!saved.current.countdown && validTarget) {
        const { error: countdownError } = await supabase.from('countdowns').insert({ user_id: user.id, title: title.trim(), target_at: new Date(`${target}T23:59:59`).toISOString(), is_featured: true })
        if (countdownError) throw countdownError
        saved.current.countdown = true
      }
      // The profile goes last and carries the completed flag, so onboarding only counts as done once everything above is saved.
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        display_name: name.trim() || null,
        ...(validDob ? { date_of_birth: dob } : {}),
        onboarding_completed: true,
      })
      if (profileError) throw profileError
      router.replace('/')
    } catch (caught: any) {
      const message = caught?.message || 'Could not save your welcome steps. Please try again.'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (!user) return <PageWrapper><main className="onboarding-shell"><div className="skeleton-panel" /></main></PageWrapper>

  return (
    <PageWrapper className="onboarding-shell ob-shell">
      <div className="ob-hero" data-stage={stage}>
        <SkyBackdrop hour={hour} />
        {step === 0 && (
          <motion.div className="ob-hero-mark" initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6, ease: EASE }}>
            <span><Leaf aria-hidden="true" /></span> Small Steps
          </motion.div>
        )}
        {step >= 1 && step <= 4 && <p className="ob-hero-eyebrow">A quiet beginning · {step} of 5</p>}
        {step === 5 && (
          <>
            <motion.svg className="ob-check" viewBox="0 0 64 64" aria-hidden="true" initial="hidden" animate="shown">
              <motion.circle cx="32" cy="32" r="28" fill="rgba(255,255,255,.14)" stroke="#fff" strokeWidth="2.5" variants={{ hidden: { pathLength: reduce ? 1 : 0 }, shown: { pathLength: 1, transition: { duration: 0.7, ease: EASE } } }} />
              <motion.path d="M20 33 L29 42 L45 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" variants={{ hidden: { pathLength: reduce ? 1 : 0 }, shown: { pathLength: 1, transition: { duration: 0.5, delay: 0.55, ease: EASE } } }} />
            </motion.svg>
            {!reduce && SPARKLES.map((sparkle, i) => (
              <motion.span key={i} className="ob-sparkle" style={{ left: `${sparkle.x}%`, width: sparkle.s, height: sparkle.s }}
                initial={{ opacity: 0, y: 40 }} animate={{ opacity: [0, 1, 0], y: -90 }}
                transition={{ duration: 2.4, delay: 0.8 + sparkle.d, ease: 'easeOut', repeat: Infinity, repeatDelay: 1.2 }} />
            ))}
          </>
        )}
      </div>

      {step >= 1 && (
        <div className="onboarding-progress" role="progressbar" aria-label="Onboarding progress" aria-valuemin={1} aria-valuemax={5} aria-valuenow={step}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n}><motion.i initial={false} animate={{ scaleX: n <= step ? 1 : 0 }} transition={{ duration: reduce ? 0 : 0.5, ease: EASE }} /></span>
          ))}
        </div>
      )}

      <div className="onboarding-content ob-content">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div key={step} className="ob-step" custom={direction} variants={reduce ? slideReduced : slide} initial="enter" animate="center" exit="exit">
            {step === 0 && <>
              <motion.h1 variants={item}>Small steps add up <em>quietly.</em></motion.h1>
              <motion.p className="onboarding-copy" variants={item}>A few gentle questions to shape a space that feels like yours. It takes about a minute, and you can change everything later.</motion.p>
            </>}

            {step === 1 && <>
              <motion.h1 variants={item} tabIndex={-1}>What should we call you?</motion.h1>
              <motion.p className="onboarding-copy" variants={item}>A name makes this space feel a little more like yours.</motion.p>
              <motion.input variants={item} className="large-input" aria-label="Your name" placeholder="Your name (optional)" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') next() }} autoComplete="name" />
              <motion.p className="ob-greeting" variants={item} aria-live="polite">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={firstName || 'anon'} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                    {firstName ? `Welcome, ${firstName}.` : 'Welcome.'}
                  </motion.span>
                </AnimatePresence>
              </motion.p>
            </>}

            {step === 2 && <>
              <motion.div className="onboarding-heading" variants={item}><h1 tabIndex={-1}>What do you want to work toward?</h1><p className="onboarding-copy">Choose one small direction to begin. You can always add more later.</p></motion.div>
              <motion.div className="goal-list" variants={item}>
                <AnimatePresence initial={false}>
                  {goals.map((goal, index) => (
                    <motion.div className="goal-card" key={index} layout={!reduce}
                      initial={reduce ? false : { opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }} transition={{ duration: 0.3, ease: EASE }}>
                      <div className="goal-card-header"><span>Goal {index + 1}</span>{goals.length > 1 && <button type="button" className="ghost-icon-button" aria-label={`Remove goal ${index + 1}`} onClick={() => setGoals(goals.filter((_, i) => i !== index))}><X /></button>}</div>
                      <input className="goal-title-input" aria-label={`Goal ${index + 1}`} placeholder="A goal that matters to me" value={goal.title} onChange={(event) => updateGoal(index, { title: event.target.value })} />
                      <input className="goal-why-input" aria-label={`Why goal ${index + 1} matters`} placeholder="Why does this matter to you? (optional)" value={goal.why} onChange={(event) => updateGoal(index, { why: event.target.value })} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
              <motion.div className="suggestion-section" variants={item}>
                <p className="muted suggestion-label">Need a spark? Tap one:</p>
                <div className="suggestions">{suggestions.map(([label, phrase]) => {
                  const selected = goals[goals.length - 1].title === phrase
                  return <motion.button type="button" whileTap={reduce ? undefined : { scale: 0.94 }} className={selected ? 'suggestion selected' : 'suggestion'} key={label} onClick={() => updateGoal(goals.length - 1, { title: phrase })}>{selected && <span aria-hidden="true">✓</span>}{label}</motion.button>
                })}</div>
              </motion.div>
              <motion.button variants={item} type="button" className="add-goal-button" disabled={goals.length === 3} onClick={() => setGoals([...goals, { title: '', why: '' }])}><Plus /> {goals.length === 3 ? 'Up to 3 goals' : 'Add another goal'}</motion.button>
            </>}

            {step === 3 && <>
              <motion.div className="onboarding-heading" variants={item}><h1 tabIndex={-1}>When were you born?</h1><p className="onboarding-copy">This lets us show your life in weeks and set meaningful timelines.</p></motion.div>
              <motion.div className="date-section" variants={item}>
                <DateFields value={dobParts} onChange={setDobParts} yearStart={currentYear - 13} yearEnd={currentYear - 100} ariaLabel="Date of birth" />
                <p className="muted">Optional. You can skip this for now.</p>
              </motion.div>
              <AnimatePresence>
                {validDob && (
                  <motion.div className="ob-weeks-card" key="weeks" initial={reduce ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.45, ease: EASE }}>
                    <LifeWeeks dob={dob} />
                    <p><strong>{weeksLived(dob).toLocaleString()}</strong> weeks lived so far. Every row is a year, and there are plenty of fresh ones ahead.</p>
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.button variants={item} type="button" className="text-button" onClick={() => { setDobParts({ month: '', day: '', year: '' }); go(4) }}>Skip for now</motion.button>
            </>}

            {step === 4 && <>
              <motion.div className="onboarding-heading" variants={item}><h1 tabIndex={-1}>Where do you want to be, and by when?</h1><p className="onboarding-copy">Give something meaningful a little shape and a date.</p></motion.div>
              <motion.div className="date-section" variants={item}>
                <label className="field-label" htmlFor="countdown-title">What are you working toward?</label>
                <input id="countdown-title" className="large-input" placeholder="Become fluent in Spanish" value={title} onChange={(event) => setTitle(event.target.value)} />
                <div className="suggestions">{[1, 3, 5, 10].map((years) => (
                  <motion.button type="button" whileTap={reduce ? undefined : { scale: 0.94 }} className={countdownChoice === `${years}y` ? 'suggestion selected' : 'suggestion'} key={years} onClick={() => { const date = new Date(); date.setFullYear(date.getFullYear() + years); setCountdownChoice(`${years}y` as '1y' | '3y' | '5y' | '10y'); setTargetParts({ month: String(date.getMonth() + 1), day: String(date.getDate()), year: String(date.getFullYear()) }) }}>{years} year{years > 1 ? 's' : ''}</motion.button>
                ))}</div>
                <DateFields value={targetParts} onChange={(value) => { setCountdownChoice('custom'); setTargetParts(value) }} yearStart={currentYear} yearEnd={currentYear + 50} ariaLabel="Countdown target date" />
                {countdownPreview && <p className="muted countdown-preview">{countdownPreview}</p>}
              </motion.div>
              <AnimatePresence>
                {daysToGo > 0 && (
                  <motion.div key="ring" className="ob-ring-card" initial={reduce ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.45, ease: EASE }}>
                    <PreviewRing days={daysToGo} label={title.trim() || 'your date'} />
                  </motion.div>
                )}
              </AnimatePresence>
            </>}

            {step === 5 && <>
              <motion.h1 variants={item} tabIndex={-1}>You&apos;re ready{firstName ? `, ${firstName}` : ''}.</motion.h1>
              <motion.p className="onboarding-copy" variants={item}>Your first small intentions are in place. Keep them close, and let the rest unfold gently.</motion.p>
              {(filledGoals.length > 0 || validTarget) && (
                <motion.ul className="ob-summary" variants={item}>
                  {filledGoals.map((goal, i) => <li key={i}><span>Goal</span>{goal.title.trim()}</li>)}
                  {validTarget && <li><span>Countdown</span>{title.trim()} · {daysToGo.toLocaleString()} days</li>}
                </motion.ul>
              )}
            </>}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="ob-actions">
        <div className="onboarding-error" role="alert" aria-live="assertive">{error}</div>
        <div className="ob-actions-row">
          {step > 0 && <button type="button" className="secondary-button" onClick={() => go(step - 1)} disabled={saving}><ChevronLeft /> Back</button>}
          {step < 5
            ? <motion.button type="button" className="primary-button" whileTap={reduce ? undefined : { scale: 0.98 }} onClick={next}>{step === 0 ? "Let's begin" : 'Continue'} <ChevronRight /></motion.button>
            : <motion.button type="button" className="primary-button" whileTap={reduce ? undefined : { scale: 0.98 }} disabled={saving} onClick={finish}>{saving ? 'Saving...' : 'Go to my day'} <ChevronRight /></motion.button>}
        </div>
      </div>
    </PageWrapper>
  )
}
