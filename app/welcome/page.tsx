'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { PageWrapper } from '@/components/page-wrapper'

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

export default function WelcomePage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [goals, setGoals] = useState<Goal[]>([{ title: '', why: '' }])
  const currentYear = new Date().getFullYear()
  const [dobParts, setDobParts] = useState<DateParts>({ month: '', day: '', year: '' })
  const [targetParts, setTargetParts] = useState<DateParts>({ month: '', day: '', year: '' })
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [continuing, setContinuing] = useState(false)
  const [countdownChoice, setCountdownChoice] = useState<'1y' | '3y' | '5y' | '10y' | 'custom' | null>(null)
  const [countdownError, setCountdownError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: any } }) => {
      if (!data.user) router.replace('/')
      else setUser(data.user)
    })
  }, [router, supabase])

  const displayName = name.trim() || 'Welcome'
  const dob = toIsoDate(dobParts)
  const target = toIsoDate(targetParts)
  const validDob = !dob || new Date(`${dob}T00:00:00`) <= new Date()
  const validTarget = Boolean(title.trim() && target && new Date(`${target}T23:59:59`) > new Date())
  const targetDate = target ? new Date(`${target}T00:00:00`) : null
  const countdownPreview = targetDate && !Number.isNaN(targetDate.getTime()) && targetParts.month && targetParts.day && targetParts.year
    ? `Counting down to ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(targetDate)}`
    : ''

  function updateGoal(index: number, patch: Partial<Goal>) {
    setGoals((current) => current.map((goal, i) => (i === index ? { ...goal, ...patch } : goal)))
  }

  function next() {
    if (continuing || saving) return
    if (step === 2 && !goals.some((goal) => goal.title.trim())) {
      setCountdownError('Add at least one goal')
      return
    }
    if (step === 3 && (!dob || !validDob)) {
      setCountdownError('Choose your date of birth')
      return
    }
    if (step === 4 && !title.trim()) {
      setCountdownError('Add a title')
      return
    }
    if (step === 4 && (!target || new Date(`${target}T23:59:59`) <= new Date())) {
      setCountdownError('Choose a future date')
      return
    }
    setCountdownError('')
    setStep((current) => current + 1)
  }

  async function finish() {
    if (!user || saving) return
    setSaving(true)
    try {
      const selectedGoals = goals.filter((goal) => goal.title.trim()).map((goal) => ({ user_id: user.id, title: goal.title.trim(), why: goal.why.trim() || null }))
      if (selectedGoals.length) {
        const { error } = await supabase.from('goals').insert(selectedGoals)
        if (error) throw error
      }
      const { error: profileError } = await supabase.from('profiles').upsert({ id: user.id, display_name: name.trim() || null, ...(dob ? { date_of_birth: dob } : {}) })
      if (profileError) throw profileError
      if (validTarget) {
        const { error } = await supabase.from('countdowns').insert({ user_id: user.id, title: title.trim(), target_at: new Date(`${target}T23:59:59`).toISOString(), is_featured: true })
        if (error) throw error
      }
      const { error } = await supabase.from('profiles').upsert({ id: user.id, onboarding_completed: true })
      if (error) throw error
      router.replace('/')
    } catch (error: any) {
      console.error('[v0] onboarding save error', error)
      toast.error(error?.message || 'Could not save your welcome steps.')
    } finally {
      setSaving(false)
    }
  }

  if (!user) return <PageWrapper><main className="onboarding-shell"><div className="skeleton-panel" /></main></PageWrapper>

  return (
    <PageWrapper className="onboarding-shell">
      <div className="onboarding-progress" aria-label={`Step ${step} of 5`}><span style={{ width: `${step * 20}%` }} /></div>
      <div className="onboarding-content">
        <p className="eyebrow">A quiet beginning · {step} of 5</p>
        {step === 1 && <><h1>What should we call you?</h1><p className="onboarding-copy">A name makes this space feel a little more like yours.</p><input className="large-input" aria-label="Your name" placeholder="Your name (optional)" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /><p className="onboarding-copy">{name.trim() ? `Welcome, ${name.trim()}.` : 'Welcome.'}</p></>}
        {step === 2 && <>
          <div className="onboarding-heading"><h1>What do you want to work toward?</h1><p className="onboarding-copy">Choose one small direction to begin. You can always add more later.</p></div>
          <div className="goal-list">{goals.map((goal, index) => <div className="goal-card" key={index}>
            <div className="goal-card-header"><span>Goal {index + 1}</span>{goals.length > 1 && <button type="button" className="ghost-icon-button" aria-label={`Remove goal ${index + 1}`} onClick={() => setGoals(goals.filter((_, i) => i !== index))}><X /></button>}</div>
            <input className="goal-title-input" aria-label={`Goal ${index + 1}`} placeholder="A goal that matters to me" value={goal.title} onChange={(event) => updateGoal(index, { title: event.target.value })} />
            <input className="goal-why-input" aria-label={`Why goal ${index + 1} matters`} placeholder="Why does this matter to you? (optional)" value={goal.why} onChange={(event) => updateGoal(index, { why: event.target.value })} />
          </div>)}</div>
          <div className="suggestion-section"><p className="muted suggestion-label">Need a spark? Tap one:</p><div className="suggestions">{suggestions.map(([label, phrase]) => <button type="button" className={goals[goals.length - 1].title === phrase ? 'suggestion selected' : 'suggestion'} key={label} onClick={() => updateGoal(goals.length - 1, { title: phrase })}>{goals[goals.length - 1].title === phrase && <span aria-hidden="true">✓</span>}{label}</button>)}</div></div>
          <button type="button" className="add-goal-button" disabled={goals.length === 3} onClick={() => setGoals([...goals, { title: '', why: '' }])}><Plus /> {goals.length === 3 ? 'Up to 3 goals' : 'Add another goal'}</button>
          {!goals[0].title.trim() && <p className="helper-message">Add a first goal before continuing.</p>}
        </>}
        {step === 3 && <><div className="onboarding-heading"><h1>When were you born?</h1><p className="onboarding-copy">This lets us show your life in weeks and set meaningful timelines.</p></div><div className="date-section"><DateFields value={dobParts} onChange={setDobParts} yearStart={currentYear - 13} yearEnd={currentYear - 100} ariaLabel="Date of birth" /><p className="muted">Optional — you can skip this for now.</p>{dob && !validDob && <p className="helper-message" role="alert">Please choose a date in the past.</p>}</div><button type="button" className="text-button" onClick={() => { setDobParts({ month: '', day: '', year: '' }); setStep(4) }}>Skip for now</button></>}
        {step === 4 && <><div className="onboarding-heading"><h1>Where do you want to be, and by when?</h1><p className="onboarding-copy">Give something meaningful a little shape and a date.</p></div><div className="date-section"><label className="field-label" htmlFor="countdown-title">What are you working toward?</label><input id="countdown-title" className="large-input" placeholder="Become fluent in Spanish" value={title} onChange={(event) => setTitle(event.target.value)} /><div className="suggestions">{[1, 3, 5, 10].map((years) => <button type="button" className={countdownChoice === `${years}y` ? 'suggestion selected' : 'suggestion'} key={years} onClick={() => { const date = new Date(); date.setFullYear(date.getFullYear() + years); setCountdownChoice(`${years}y` as '1y' | '3y' | '5y' | '10y'); setTargetParts({ month: String(date.getMonth() + 1), day: String(date.getDate()), year: String(date.getFullYear()) }) }}>{years} year{years > 1 ? 's' : ''}</button>)}</div><DateFields value={targetParts} onChange={(value) => { setCountdownChoice('custom'); setTargetParts(value) }} yearStart={currentYear} yearEnd={currentYear + 50} ariaLabel="Countdown target date" />{countdownPreview && <p className="muted countdown-preview">{countdownPreview}</p>}</div></>}
        {step === 5 && <><h1>You&apos;re ready.</h1><p className="onboarding-copy">Your first small intentions are in place. Keep them close, and let the rest unfold gently.</p></>}
      </div>
      <div className="onboarding-actions">{step > 1 && <button type="button" className="secondary-button" onClick={() => setStep((current) => current - 1)}><ChevronLeft /> Back</button>}{step < 5 ? <><div className="onboarding-error" role="alert">{countdownError}</div><button type="button" className="primary-button" disabled={continuing || saving} onClick={next}>{continuing ? 'Continuing...' : step === 1 ? "Let's begin" : 'Continue'} <ChevronRight /></button></> : <button type="button" className="primary-button" disabled={saving} onClick={finish}>{saving ? 'Saving...' : 'Go to my day'} <ChevronRight /></button>}</div>
    </PageWrapper>
  )
}
