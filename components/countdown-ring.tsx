'use client'

import { useEffect, useMemo, useState } from 'react'
import { intervalToDuration } from 'date-fns'

type Countdown = { title?: string | null; target_at?: string | null }

export function CountdownRing({ countdown }: { countdown?: Countdown | null }) {
  if (!countdown?.target_at) return null;
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    let frame = 0
    let timer: number | undefined
    const sync = () => setNowMs(Date.now())
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const start = () => {
      if (prefersReducedMotion.matches) {
        sync()
        timer = window.setInterval(sync, 1000)
      } else {
        const update = () => {
          sync()
          frame = window.requestAnimationFrame(update)
        }
        frame = window.requestAnimationFrame(update)
      }
    }
    const handleMotionChange = () => {
      if (frame) window.cancelAnimationFrame(frame)
      if (timer) window.clearInterval(timer)
      start()
    }
    const handleVisibilityChange = () => sync()
    prefersReducedMotion.addEventListener('change', handleMotionChange)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    start()
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      if (timer) window.clearInterval(timer)
      prefersReducedMotion.removeEventListener('change', handleMotionChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
  const target = useMemo(() => new Date(countdown.target_at as string), [countdown.target_at])
  const now = new Date(nowMs)
  const targetMs = target.getTime()
  const remainingMs = Math.max(targetMs - nowMs, 0)
  const passed = remainingMs === 0
  const duration = intervalToDuration({ start: now, end: target })
  const radius = 88
  const circumference = 2 * Math.PI * radius
  const minuteProgress = 1 - (remainingMs % 60000) / 60000
  const offset = circumference * (1 - minuteProgress)
  const units = `${duration.years || 0} years  ${duration.months || 0} months  ${duration.days || 0} days`
  const dateLabel = target.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
  const spoken = passed ? 'Countdown complete' : `${units}, ${duration.hours || 0} hours, ${duration.minutes || 0} minutes, and ${duration.seconds || 0} seconds remaining`
  return <section className="countdown-card" aria-label={spoken}><p className="eyebrow">Featured countdown</p><h2>{countdown.title}</h2>{passed ? <div className="countdown-done">You made it.</div> : <div className="countdown-ring-wrap"><svg className="countdown-ring" viewBox="0 0 200 200" aria-hidden="true"><circle className="ring-track" cx="100" cy="100" r="88" fill="none" strokeWidth="10" /><circle className="ring-progress" cx="100" cy="100" r="88" fill="none" strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} transform="rotate(-90 100 100)" /></svg><div className="countdown-values"><strong>{units}</strong><span className="tabular-nums">{String(duration.hours || 0).padStart(2, '0')} : {String(duration.minutes || 0).padStart(2, '0')} : {String(duration.seconds || 0).padStart(2, '0')}</span></div></div>}<p className="countdown-target">Until {dateLabel}</p></section>
}
