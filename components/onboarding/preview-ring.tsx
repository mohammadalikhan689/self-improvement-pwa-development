"use client";

import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

// A small version of the Today countdown ring. It draws itself in when a date is chosen,
// and the day count rolls up to the real number.

const R = 52;
const C = 2 * Math.PI * R;

export function PreviewRing({ days, label }: { days: number; label: string }) {
  const reduce = useReducedMotion();
  const progress = useMotionValue(0);
  const count = useMotionValue(0);
  const [offset, setOffset] = useState(C);
  const [shown, setShown] = useState(0);

  useMotionValueEvent(progress, "change", (v) => setOffset(C * (1 - v)));
  useMotionValueEvent(count, "change", (v) => setShown(Math.round(v)));

  useEffect(() => {
    const target = Math.max(days, 0);
    // The ring fills in as the goal gets closer: far-off dates show a short arc.
    const fraction = Math.min(0.92, Math.max(0.12, 1 - Math.log10(target + 1) / 4));
    const opts = reduce ? { duration: 0 } : { duration: 1.2, ease: [0.22, 0.8, 0.3, 1] as const };
    const a = animate(progress, fraction, opts);
    const b = animate(count, target, opts);
    return () => { a.stop(); b.stop(); };
  }, [days, reduce, progress, count]);

  return (
    <div className="ob-ring" role="img" aria-label={`${days.toLocaleString()} days until ${label}`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={R} fill="none" strokeWidth="7" className="ring-track" />
        <circle cx="60" cy="60" r={R} fill="none" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={offset} transform="rotate(-90 60 60)" className="ob-ring-progress" />
      </svg>
      <div className="ob-ring-value"><strong>{shown.toLocaleString()}</strong><span>days to go</span></div>
    </div>
  );
}
