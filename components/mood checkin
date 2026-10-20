"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft } from "lucide-react";
import { mix } from "@/lib/day-scene";
import { MOOD_NAMES, angleForValue, faceAt, moodSubtitle, valueForAngle } from "@/lib/rituals";

// The full-screen "Mood check-in": a ring you drag, a face that follows it, and a note.

/** Eases a number toward its target, so the face morphs instead of snapping. */
export function useTween(target: number, ms = 420): number {
  const [value, setValue] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      current.current = target;
      setValue(target);
      return;
    }
    const from = current.current;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      current.current = from + (target - from) * eased;
      setValue(current.current);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

export function Face({ value, size }: { value: number; size: number }) {
  const f = faceAt(value);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" style={{ display: "block" }}>
      <circle cx="50" cy="50" r="46" fill={f.color} />
      <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(0,0,0,.12)" strokeWidth="2" />
      <g stroke="#3a2a1a" strokeWidth="3.4" strokeLinecap="round" opacity={f.browOpacity}>
        <line x1="26" y1="29" x2="42" y2="29" transform={`rotate(${-f.browTilt} 34 29)`} />
        <line x1="58" y1="29" x2="74" y2="29" transform={`rotate(${f.browTilt} 66 29)`} />
      </g>
      <ellipse cx="36" cy="43" rx="4.4" ry={f.eyeRy} fill="#3a2a1a" />
      <ellipse cx="64" cy="43" rx="4.4" ry={f.eyeRy} fill="#3a2a1a" />
      <circle cx="24" cy="58" r="6" fill="#ff8aa0" opacity={f.cheekOpacity * 0.55} />
      <circle cx="76" cy="58" r="6" fill="#ff8aa0" opacity={f.cheekOpacity * 0.55} />
      <path d={`M ${f.mouthX0} 68 Q 50 ${f.mouthCtrl} ${f.mouthX1} 68`} fill="none" stroke="#3a2a1a" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

const css = `
.mc, .mc *, .mc *::before, .mc *::after { box-sizing:border-box; }
.mc { position:fixed; inset:0; z-index:9000; overflow-y:auto; overscroll-behavior:contain; color:#3e2410; animation:mc-in .35s cubic-bezier(.2,.9,.3,1) both; }
.mc p, .mc h2 { margin:0; }
.mc button, .mc input, .mc textarea { font-family:inherit; }
.mc-in { max-width:28rem; margin:0 auto; min-height:100%; padding:calc(env(safe-area-inset-top) + .8rem) 1.4rem calc(env(safe-area-inset-bottom) + 1.6rem); display:flex; flex-direction:column; align-items:center; gap:1rem; }
.mc-top { width:100%; display:grid; grid-template-columns:2.75rem 1fr 2.75rem; align-items:center; }
.mc-top span { text-align:center; font-weight:600; font-size:.95rem; }
.mc-back { width:2.75rem; height:2.75rem; display:grid; place-items:center; border:0; border-radius:999px; background:rgba(255,255,255,.7); color:inherit; box-shadow:0 4px 14px rgba(120,60,20,.12); }
.mc-back svg { width:22px; height:22px; }
.mc-q { margin-top:.6rem; text-align:center; font-family:Georgia,'Times New Roman',serif; font-weight:400; font-size:2rem; line-height:1.12; letter-spacing:-.02em; }
.mc-sub { margin-top:-.4rem; font-size:.85rem; opacity:.7; text-align:center; }
.mc-dial { position:relative; width:min(100%,19rem); aspect-ratio:1; margin-top:.4rem; touch-action:none; user-select:none; -webkit-user-select:none; outline:none; }
.mc-dial svg.ring { position:absolute; inset:0; width:100%; height:100%; overflow:visible; cursor:grab; }
.mc-dial:focus-visible svg.ring { filter:drop-shadow(0 0 6px rgba(62,36,16,.5)); }
.mc-face { position:absolute; left:50%; top:50%; width:58%; aspect-ratio:1; transform:translate(-50%,-50%); border-radius:50%; display:grid; place-items:center; background:rgba(255,255,255,.78); box-shadow:inset 0 0 0 1px rgba(255,255,255,.9), 0 8px 24px rgba(120,60,20,.1); pointer-events:none; }
.mc-name { margin-top:.2rem; font-family:Georgia,'Times New Roman',serif; font-size:2.4rem; line-height:1; letter-spacing:-.02em; }
.mc-line { margin-top:-.5rem; font-size:.95rem; opacity:.75; text-align:center; min-height:1.3em; }
.mc-note { width:100%; margin-top:.4rem; padding:1rem 1.1rem 1.1rem; border-radius:1.5rem; background:rgba(255,255,255,.78); box-shadow:0 8px 24px rgba(120,60,20,.08); display:flex; flex-direction:column; gap:.55rem; }
.mc-note label { font-size:.8rem; font-weight:700; letter-spacing:.02em; }
.mc .mc-note textarea, .mc .mc-note input { width:100%; margin:0; border:0; border-bottom:1px solid rgba(62,36,16,.15); border-radius:0; background:transparent; color:#3e2410; padding:.45rem 0; font-size:1rem; resize:none; outline:none; }
.mc .mc-note textarea { min-height:3.2rem; }
.mc .mc-note textarea::placeholder, .mc .mc-note input::placeholder { color:rgba(62,36,16,.45); }
.mc .mc-note textarea:focus, .mc .mc-note input:focus { border-bottom-color:#3e2410; }
.mc-save { width:100%; min-height:3.3rem; border:0; border-radius:1.2rem; background:#3e2410; color:#fff4e0; font-weight:700; font-size:1rem; transition:transform .15s; }
.mc-save:active { transform:scale(.98); }
.mc-err { font-size:.85rem; color:#b3261e; text-align:center; }
.mc-tag { font-size:.66rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; opacity:.7; }
@keyframes mc-in { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:none } }
@media (prefers-reduced-motion:reduce) { .mc { animation:none; } }
`;

const CX = 150;
const CY = 150;
const R = 118;
const pt = (deg: number, r = R) => {
  const a = (deg * Math.PI) / 180;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
};
function arc(from: number, to: number) {
  const a = pt(from);
  const b = pt(to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

type Props = {
  mood: number;
  setMood: (n: number) => void;
  win: string;
  setWin: (v: string) => void;
  improve: string;
  setImprove: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  error: string;
  previousMood?: number | null;
  /** Shown above the question when an older day is being edited. */
  editingLabel?: string;
  onClose: () => void;
};

export function MoodCheckin({ mood, setMood, win, setWin, improve, setImprove, onSubmit, error, previousMood, editingLabel, onClose }: Props) {
  const startValue = mood > 0 ? mood : 3;
  const [live, setLive] = useState(startValue);
  const [dragging, setDragging] = useState(false);
  const ring = useRef<SVGSVGElement>(null);
  const shown = useTween(live, dragging ? 90 : 280);
  const rounded = Math.min(5, Math.max(1, Math.round(live)));

  // Opening the screen picks "Okay" so there is always a face on it.
  useEffect(() => {
    if (!(mood > 0)) setMood(3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function setFromEvent(e: React.PointerEvent) {
    const el = ring.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const theta = (Math.atan2(e.clientY - (box.top + box.height / 2), e.clientX - (box.left + box.width / 2)) * 180) / Math.PI;
    const v = valueForAngle(theta);
    setLive(v);
    const r = Math.min(5, Math.max(1, Math.round(v)));
    if (r !== mood) setMood(r);
  }

  const face = faceAt(shown);
  const angle = angleForValue(shown);
  const start = angleForValue(1);
  const handle = pt(angle);
  const bgTop = mix("#fff7f2", face.color, 0.16);
  const bgBottom = mix("#ffe3d6", face.color, 0.3);

  const body = (
    <div className="mc" role="dialog" aria-modal="true" aria-label="Mood check-in" style={{ background: `linear-gradient(180deg, ${bgTop} 0%, ${bgBottom} 100%)` }}>
      <style>{css}</style>
      <form className="mc-in" onSubmit={(e) => { e.stopPropagation(); onSubmit(e); }}>
        <div className="mc-top">
          <button type="button" className="mc-back" onClick={onClose} aria-label="Back"><ChevronLeft aria-hidden="true" /></button>
          <span>Mood check-in</span>
          <span />
        </div>
        {editingLabel && <p className="mc-tag">{editingLabel}</p>}
        <h2 className="mc-q">How are you<br />feeling today?</h2>
        <p className="mc-sub">Take a moment for yourself</p>

        <div
          className="mc-dial"
          role="slider"
          tabIndex={0}
          aria-label="How are you feeling"
          aria-valuemin={1}
          aria-valuemax={5}
          aria-valuenow={rounded}
          aria-valuetext={MOOD_NAMES[rounded - 1]}
          onKeyDown={(e) => {
            const d = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
            if (!d) return;
            e.preventDefault();
            const n = Math.min(5, Math.max(1, rounded + d));
            setLive(n);
            setMood(n);
          }}
        >
          <svg
            ref={ring}
            className="ring"
            viewBox="0 0 300 300"
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDragging(true); setFromEvent(e); }}
            onPointerMove={(e) => { if (dragging) setFromEvent(e); }}
            onPointerUp={() => { setDragging(false); setLive(rounded); }}
            onPointerCancel={() => { setDragging(false); setLive(rounded); }}
          >
            <path d={arc(start, start + 270)} fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="24" strokeLinecap="round" />
            <path d={arc(start, Math.max(start + 0.01, angle))} fill="none" stroke={face.color} strokeWidth="24" strokeLinecap="round" />
            <circle cx={handle.x} cy={handle.y} r="19" fill="#fff" stroke={face.color} strokeWidth="6" />
            <circle cx={handle.x} cy={handle.y} r="6" fill={face.color} />
          </svg>
          <div className="mc-face"><Face value={shown} size={118} /></div>
        </div>

        <p className="mc-name" aria-live="polite">{MOOD_NAMES[rounded - 1]}</p>
        <p className="mc-line">{moodSubtitle(rounded, previousMood)}</p>

        <div className="mc-note">
          <label htmlFor="mc-win">Add a note (optional)</label>
          <textarea id="mc-win" value={win} placeholder="One win from today, however small" onChange={(e) => setWin(e.target.value)} />
          <label htmlFor="mc-imp">For tomorrow (optional)</label>
          <input id="mc-imp" value={improve} placeholder="One thing to make it gentler" onChange={(e) => setImprove(e.target.value)} />
        </div>
        {error && <p className="mc-err" role="alert">{error}</p>}
        <button type="submit" className="mc-save">Save reflection</button>
      </form>
    </div>
  );
  return createPortal(body, document.body);
}
