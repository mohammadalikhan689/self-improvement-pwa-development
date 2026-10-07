"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Flame } from "lucide-react";
import {
  arcPoint,
  dayLine,
  hourOf,
  makeStars,
  mix,
  moonPhase,
  sceneAt,
} from "@/lib/day-scene";

// Section 1 of the Today screen: a living sky.
// The sky, sun, moon and stars follow the real clock. Tap the sky to peek at other hours.

const W = 400;
const H = 260;
const HORIZON = 204;
const PEAK = 84;
const STARS = makeStars(46, W, 150);

type Props = {
  /** Time-of-day greeting, e.g. "Good afternoon". */
  greeting: string;
  /** First name, already tidied. Empty string if unknown. */
  name: string;
  /** e.g. "Wednesday, 7 October". */
  dateLabel: string;
  /** The headline for the day. */
  headline: string;
  /** Check-in streak in days. */
  streak: number;
  /** Tasks done and total, for the line under the headline. */
  done: number;
  total: number;
  /** Test hook: pin the scene to an hour (0 to 24). */
  hourOverride?: number;
};

const css = `
.ds-root, .ds-root *, .ds-root *::before, .ds-root *::after { box-sizing:border-box; }
.ds-root { position:relative; isolation:isolate; overflow:hidden; border-radius:28px; min-height:15.5rem; color:#fff; box-shadow:0 14px 40px rgba(20,24,60,.22); user-select:none; -webkit-tap-highlight-color:transparent; }
.ds-svg { position:absolute; inset:0; width:100%; height:100%; display:block; }
.ds-svg stop, .ds-hill { transition:stop-color 1.2s ease, fill 1.2s ease; }
.ds-body { transition:transform 1.4s cubic-bezier(.22,.8,.3,1), opacity .8s ease; }
.ds-layer { transition:opacity 1s ease; }
.ds-content { position:relative; z-index:2; display:flex; flex-direction:column; justify-content:space-between; gap:1.5rem; min-height:15.5rem; padding:1.1rem 1.25rem 1.2rem; }
.ds-top { display:flex; align-items:center; justify-content:space-between; gap:.75rem; }
.ds-date { font-size:.68rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; opacity:.9; text-shadow:0 1px 8px rgba(0,0,0,.3); }
.ds-chip { display:inline-flex; align-items:center; gap:.35rem; height:2rem; padding:0 .8rem; border-radius:999px; background:rgba(255,255,255,.16); border:1px solid rgba(255,255,255,.28); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); font-size:.78rem; font-weight:700; white-space:nowrap; }
.ds-chip svg { width:15px; height:15px; }
.ds-chip.off { opacity:.8; font-weight:600; }
.ds-hello { font-size:.9rem; font-weight:500; opacity:.92; text-shadow:0 1px 10px rgba(0,0,0,.35); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ds-title { margin:.2rem 0 0; font-family:Georgia,'Times New Roman',serif; font-weight:400; font-size:clamp(1.75rem,8vw,2.2rem); line-height:1.08; letter-spacing:-.03em; text-wrap:balance; text-shadow:0 2px 16px rgba(0,0,0,.4); }
.ds-line { margin-top:.5rem; font-size:.85rem; opacity:.92; text-shadow:0 1px 10px rgba(0,0,0,.35); }
.ds-preview { position:absolute; z-index:3; left:50%; top:3.1rem; transform:translateX(-50%); padding:.2rem .65rem; border-radius:999px; background:rgba(0,0,0,.35); font-size:.68rem; font-weight:600; letter-spacing:.06em; }
@keyframes ds-twinkle { 0%,100% { opacity:.25 } 50% { opacity:1 } }
@keyframes ds-drift { from { transform:translateX(-140px) } to { transform:translateX(560px) } }
@keyframes ds-breathe { 0%,100% { transform:scale(1); opacity:.9 } 50% { transform:scale(1.12); opacity:1 } }
@keyframes ds-shoot { 0%,86% { opacity:0; transform:translate(0,0) } 88% { opacity:1 } 100% { opacity:0; transform:translate(-90px,48px) } }
@media (prefers-reduced-motion:no-preference) {
  .ds-star { animation:ds-twinkle var(--d,3s) ease-in-out var(--dl,0s) infinite; }
  .ds-cloud { animation:ds-drift var(--d,100s) linear var(--dl,0s) infinite; }
  .ds-glow { transform-box:fill-box; transform-origin:center; animation:ds-breathe 5s ease-in-out infinite; }
  .ds-shoot { animation:ds-shoot 14s ease-in 3s infinite; }
}
@media (prefers-reduced-motion:reduce) { .ds-star { opacity:.8 } .ds-shoot { display:none } }
`;

export function DayScene({
  greeting,
  name,
  dateLabel,
  headline,
  streak,
  done,
  total,
  hourOverride,
}: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [now, setNow] = useState(() => new Date());
  const [peek, setPeek] = useState<number | null>(null);
  const peekTimer = useRef<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30000);
    const onVisible = () => setNow(new Date());
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      if (peekTimer.current) window.clearTimeout(peekTimer.current);
    };
  }, []);

  const realHour = hourOf(now);
  const hour = hourOverride ?? peek ?? realHour;
  const scene = useMemo(() => sceneAt(hour), [hour]);
  const moon = useMemo(() => moonPhase(now), [now]);

  // Tap the sky to jump ahead 3 hours. It slides back to real time after a few seconds.
  function peekAhead() {
    setPeek((cur) => ((cur ?? realHour) + 3) % 24);
    if (peekTimer.current) window.clearTimeout(peekTimer.current);
    peekTimer.current = window.setTimeout(() => setPeek(null), 7000);
  }

  const sun = scene.sunT === null ? null : arcPoint(scene.sunT, W, HORIZON, PEAK);
  const moonPos = scene.moonT === null ? null : arcPoint(scene.moonT, W, HORIZON, PEAK + 6);
  const sunColor = mix("#fff4bf", "#ff8a3d", scene.sunWarmth);
  const glowColor = mix("#ffe9a0", "#ff7a3a", scene.sunWarmth);

  // Moon: lit fraction from the real moon age (never fully dark, so it stays visible).
  const lit = Math.max(0.14, 1 - Math.abs(moon - 0.5) * 2);
  const waxing = moon < 0.5;
  const MOON_R = 13;
  const shade = (waxing ? -1 : 1) * lit * MOON_R * 2;

  const peeking = hourOverride === undefined && peek !== null;
  const clock = new Date(2000, 0, 1, Math.floor(hour), Math.round((hour % 1) * 60) % 60)
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <section
      className="ds-root"
      aria-label={`${greeting}. ${dayLine(done, total, scene.phase)}`}
      data-phase={scene.phase}
      onClick={peekAhead}
    >
      <style>{css}</style>
      <svg className="ds-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id={`sky${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: scene.top }} />
            <stop offset="1" style={{ stopColor: scene.bottom }} />
          </linearGradient>
          <radialGradient id={`glow${uid}`}>
            <stop offset="0" style={{ stopColor: glowColor, stopOpacity: 0.85 }} />
            <stop offset="0.45" style={{ stopColor: glowColor, stopOpacity: 0.25 }} />
            <stop offset="1" style={{ stopColor: glowColor, stopOpacity: 0 }} />
          </radialGradient>
          <radialGradient id={`mglow${uid}`}>
            <stop offset="0" stopColor="#dfe8ff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#dfe8ff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`scrim${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.42" />
          </linearGradient>
          <mask id={`moonmask${uid}`}>
            <circle r={MOON_R} fill="#fff" />
            <circle r={MOON_R} cx={shade} fill="#000" />
          </mask>
        </defs>

        <rect width={W} height={H} fill={`url(#sky${uid})`} />

        {/* Stars */}
        <g className="ds-layer" style={{ opacity: scene.starOpacity }}>
          {STARS.map((s, i) => (
            <circle
              key={i}
              className="ds-star"
              cx={s.x}
              cy={s.y}
              r={s.r}
              fill="#fff"
              style={{ ["--d" as string]: `${s.dur}s`, ["--dl" as string]: `${s.delay}s` }}
            />
          ))}
          <line className="ds-shoot" x1="300" y1="30" x2="322" y2="24" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        </g>

        {/* Sun */}
        {sun && (
          <g className="ds-body" style={{ transform: `translate(${sun.x}px, ${sun.y}px)` }}>
            <circle className="ds-glow" r="62" fill={`url(#glow${uid})`} />
            <circle r="15" style={{ fill: sunColor, transition: "fill 1.2s ease" }} />
          </g>
        )}

        {/* Moon */}
        {moonPos && (
          <g className="ds-body" style={{ transform: `translate(${moonPos.x}px, ${moonPos.y}px)` }}>
            <circle className="ds-glow" r="44" fill={`url(#mglow${uid})`} />
            <g mask={`url(#moonmask${uid})`}>
              <circle r={MOON_R} fill="#f4f1e4" />
              <circle cx="-4" cy="-3" r="2.4" fill="#d9d4bd" opacity=".7" />
              <circle cx="4" cy="4" r="3" fill="#d9d4bd" opacity=".55" />
            </g>
          </g>
        )}

        {/* Clouds */}
        <g className="ds-layer" style={{ opacity: scene.cloudOpacity }} fill="#fff">
          <g className="ds-cloud" style={{ ["--d" as string]: "110s", ["--dl" as string]: "-30s" }}>
            <ellipse cx="0" cy="60" rx="30" ry="9" opacity=".9" />
            <ellipse cx="-18" cy="65" rx="20" ry="7" opacity=".8" />
            <ellipse cx="20" cy="66" rx="22" ry="7" opacity=".8" />
          </g>
          <g className="ds-cloud" style={{ ["--d" as string]: "150s", ["--dl" as string]: "-95s" }}>
            <ellipse cx="0" cy="104" rx="38" ry="9" opacity=".6" />
            <ellipse cx="-24" cy="109" rx="24" ry="7" opacity=".5" />
            <ellipse cx="26" cy="109" rx="26" ry="7" opacity=".5" />
          </g>
          <g className="ds-cloud" style={{ ["--d" as string]: "90s", ["--dl" as string]: "-70s" }}>
            <ellipse cx="0" cy="32" rx="22" ry="6" opacity=".7" />
            <ellipse cx="14" cy="36" rx="16" ry="5" opacity=".6" />
          </g>
        </g>

        {/* Hills: the sun and moon rise from behind them */}
        <path className="ds-hill" style={{ fill: scene.hillFar }} d="M0 196 Q 80 160 170 186 T 330 178 T 400 172 V260 H0Z" />
        <path className="ds-hill" style={{ fill: scene.hillNear }} d="M0 224 Q 110 190 220 218 T 400 208 V260 H0Z" />
        <rect y="120" width={W} height="140" fill={`url(#scrim${uid})`} />
      </svg>

      {peeking && <span className="ds-preview">Preview · {clock}</span>}

      <div className="ds-content">
        <div className="ds-top">
          <span className="ds-date">{dateLabel}</span>
          <span className={streak > 0 ? "ds-chip" : "ds-chip off"} title="Check-in streak">
            <Flame aria-hidden="true" style={{ color: streak > 0 ? scene.accent : "currentColor", fill: streak > 0 ? scene.accent : "none" }} />
            {streak > 0 ? `${streak}-day streak` : "Start a streak"}
          </span>
        </div>
        <div>
          <p className="ds-hello">{name ? `${greeting}, ${name}` : greeting}</p>
          <h1 className="ds-title">{headline}</h1>
          <p className="ds-line">{dayLine(done, total, scene.phase)}</p>
        </div>
      </div>
    </section>
  );
}
