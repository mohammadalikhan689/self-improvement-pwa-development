'use client'

import { useEffect, useMemo, useState } from 'react'
import { intervalToDuration } from 'date-fns'

type Countdown = { title: string; target_at: string }

export function CountdownRing({ countdown }: { countdown: Countdown }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const sync = () => setNow(new Date())
    const timer = window.setInterval(sync, 1000)
    document.addEventListener('visibilitychange', sync)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', sync) }
  }, [])
  const target = useMemo(() => new Date(countdown.target_at), [countdown.target_at])
  const passed = target <= now
  const duration = intervalToDuration({ start: now, end: target })
  const radius = 88
  const circumference = 2 * Math.PI * radius
  const secondsFraction = (now.getSeconds() + now.getMilliseconds() / 1000) / 60
  const offset = circumference * (1 - secondsFraction)
  const units = `${duration.years || 0} years  ${duration.months || 0} months  ${duration.days || 0} days`
  const dateLabel = target.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
  const spoken = passed ? 'Countdown complete' : `${units}, ${duration.hours || 0} hours, ${duration.minutes || 0} minutes, and ${duration.seconds || 0} seconds remaining`
  return <section className="countdown-card" aria-label={spoken}><p className="eyebrow">Featured countdown</p><h2>{countdown.title}</h2>{passed ? <div className="countdown-done">You made it.</div> : <div className="countdown-ring-wrap"><svg className="countdown-ring" viewBox="0 0 200 200" aria-hidden="true"><circle className="ring-track" cx="100" cy="100" r="88" fill="none" strokeWidth="10" /><circle className="ring-progress" cx="100" cy="100" r="88" fill="none" strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} transform="rotate(-90 100 100)" /></svg><div className="countdown-values"><strong>{units}</strong><span className="tabular-nums">{String(duration.hours || 0).padStart(2, '0')} : {String(duration.minutes || 0).padStart(2, '0')} : {String(duration.seconds || 0).padStart(2, '0')}</span></div></div>}<p className="countdown-target">Until {dateLabel}</p></section>
}
