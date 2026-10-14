"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, Dispatch, ReactNode, SetStateAction } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  CATEGORIES,
  DAY_LETTERS,
  DAY_NAMES,
  STATUS_LABEL,
  catByKey,
  clamp,
  computeBadges,
  computeOverall,
  computeStats,
  detectCategory,
  encouragement,
  formatLeft,
  pickNextStep,
  themeFor,
} from "@/lib/goal-stats";
import type {
  ActionRow,
  ActionStat,
  Badge,
  CatKey,
  Category,
  CountdownRow,
  GoalRow,
  GoalStat,
  IconName,
  Overall,
  Theme,
} from "@/lib/goal-stats";

const GOAL_COLS = "id,title,why,identity,countdown_id,created_at";
const SERIF = "Georgia, 'Times New Roman', serif";

/* ------------------------------------------------------------------ */
/* styles (self-contained, prefixed with gt-)                          */
/* ------------------------------------------------------------------ */

const GT_CSS = `
@keyframes gt-rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes gt-fade{from{opacity:0}to{opacity:1}}
@keyframes gt-pop{0%{transform:scale(.55)}60%{transform:scale(1.18)}100%{transform:scale(1)}}
@keyframes gt-burst{from{opacity:1;transform:rotate(var(--a)) translateY(-8px) scale(1)}to{opacity:0;transform:rotate(var(--a)) translateY(-30px) scale(.3)}}
@keyframes gt-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes gt-flicker{0%,100%{transform:scale(1) rotate(-3deg)}50%{transform:scale(1.1) rotate(3deg)}}
@keyframes gt-glow{0%,100%{opacity:.5}50%{opacity:1}}
@keyframes gt-sheen{from{transform:translateX(-120%)}to{transform:translateX(220%)}}
.gt-rise{animation:gt-rise .6s cubic-bezier(.22,1,.36,1) both}
.gt-fade{animation:gt-fade .45s ease both}
.gt-ring{transition:stroke-dashoffset 1.25s cubic-bezier(.22,1,.36,1)}
.gt-bar{transition:height .8s cubic-bezier(.22,1,.36,1)}
.gt-collapse{display:grid;grid-template-rows:0fr;transition:grid-template-rows .38s cubic-bezier(.22,1,.36,1)}
.gt-collapse[data-open="true"]{grid-template-rows:1fr}
.gt-collapse>div{overflow:hidden;min-height:0}
.gt-scroll{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding:2px 2px 8px;margin:0 -2px;scrollbar-width:none}
.gt-scroll::-webkit-scrollbar{display:none}
.gt-scroll>*{scroll-snap-align:start;flex:0 0 auto}
.gt-press{transition:transform .15s ease}
.gt-press:active{transform:scale(.96)}
.gt-pop{animation:gt-pop .42s cubic-bezier(.22,1,.36,1)}
.gt-float{animation:gt-float 5s ease-in-out infinite}
.gt-flame{animation:gt-flicker 1.6s ease-in-out infinite;transform-origin:50% 90%}
.gt-glow{animation:gt-glow 3.2s ease-in-out infinite}
.gt-burst{position:absolute;inset:0;pointer-events:none}
.gt-burst i{position:absolute;left:50%;top:50%;width:6px;height:6px;margin:-3px;border-radius:50%;animation:gt-burst .65s ease-out forwards}
.gt-sheen{position:absolute;inset:0;overflow:hidden;pointer-events:none;border-radius:inherit}
.gt-sheen::after{content:"";position:absolute;top:0;bottom:0;width:40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.28),transparent);animation:gt-sheen 4.5s ease-in-out infinite}
.gt-input{width:100%;min-height:48px;border-radius:16px;border:1px solid var(--border);background:var(--background);color:var(--foreground);padding:12px 14px;font-size:16px;outline:none}
.gt-input:focus{border-color:var(--primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--primary) 22%,transparent)}
.gt-area{min-height:88px;resize:vertical;line-height:1.45}
@media (prefers-reduced-motion:reduce){
  .gt-rise,.gt-fade,.gt-pop,.gt-float,.gt-flame,.gt-glow,.gt-sheen::after{animation:none!important}
  .gt-ring,.gt-bar,.gt-collapse,.gt-press{transition:none!important}
  .gt-burst{display:none}
}
`;

const tint = (color: string, pct: number, base = "var(--card)") =>
  `color-mix(in srgb, ${color} ${pct}%, ${base})`;
const grad = (t: Theme, angle = 135) =>
  `linear-gradient(${angle}deg, ${t.a}, ${t.b})`;

/* ------------------------------------------------------------------ */
/* icons                                                               */
/* ------------------------------------------------------------------ */

function Icon({
  name,
  size = 20,
  stroke = 2,
  fill = false,
  className,
  style,
}: {
  name: IconName;
  size?: number;
  stroke?: number;
  fill?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: fill ? "currentColor" : "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    style,
    "aria-hidden": true,
  };
  switch (name) {
    case "check":
      return (
        <svg {...common}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M5 12h14M12 5v14" />
        </svg>
      );
    case "minus":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
        </svg>
      );
    case "x":
      return (
        <svg {...common}>
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      );
    case "trash":
      return (
        <svg {...common}>
          <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
      );
    case "pencil":
      return (
        <svg {...common}>
          <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>
      );
    case "chevron":
      return (
        <svg {...common}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      );
    case "heart":
      return (
        <svg {...common}>
          <path d="M19 14c1.5-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      );
    case "book":
      return (
        <svg {...common}>
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      );
    case "coin":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="M14.5 9a3 3 0 0 0-2.5-1.5c-1.7 0-3 1-3 2.5s1.3 2 3 2.5 3 1 3 2.5-1.3 2.5-3 2.5A3 3 0 0 1 9.5 15M12 6v2M12 16v2" />
        </svg>
      );
    case "target":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
    case "leaf":
      return (
        <svg {...common}>
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
          <path d="M19 3v4M17 5h4M5 17v4M3 19h4" />
        </svg>
      );
    case "flame":
      return (
        <svg {...common}>
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      );
    case "bolt":
      return (
        <svg {...common}>
          <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
        </svg>
      );
    case "star":
      return (
        <svg {...common}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    case "trophy":
      return (
        <svg {...common}>
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      );
    case "lock":
      return (
        <svg {...common}>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "quote":
      return (
        <svg {...common}>
          <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zM15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
        </svg>
      );
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* small hooks and primitives                                          */
/* ------------------------------------------------------------------ */

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setM(true));
    return () => window.cancelAnimationFrame(id);
  }, []);
  return m;
}

function useCountUp(target: number, ms = 900) {
  const [value, setValue] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      prev.current = target;
      setValue(target);
      return;
    }
    const from = prev.current;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - k, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (k < 1) raf = window.requestAnimationFrame(tick);
      else prev.current = target;
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

function Burst({ color }: { color: string }) {
  return (
    <span className="gt-burst" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <i
          key={i}
          style={{ ["--a" as string]: `${i * 45}deg`, background: color } as CSSProperties}
        />
      ))}
    </span>
  );
}

function Tick({
  done,
  theme,
  onToggle,
  label,
  size = 44,
}: {
  done: boolean;
  theme: Theme;
  onToggle: () => void;
  label: string;
  size?: number;
}) {
  const [burst, setBurst] = useState(0);
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={done}
      className="gt-press"
      onClick={(e) => {
        e.stopPropagation();
        if (!done) setBurst((b) => b + 1);
        onToggle();
      }}
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        border: done ? "none" : `2px solid ${theme.a}`,
        background: done ? grad(theme) : tint(theme.a, 8),
        color: done ? "#fff" : theme.a,
        boxShadow: done ? `0 6px 16px ${theme.a}55` : "none",
      }}
    >
      <span
        key={done ? "d" : "o"}
        className={done ? "gt-pop" : undefined}
        style={{ display: "grid", placeItems: "center", opacity: done ? 1 : 0.4 }}
      >
        <Icon name="check" size={Math.round(size * 0.5)} stroke={done ? 3 : 2.5} />
      </span>
      {burst > 0 && <Burst key={burst} color={theme.b} />}
    </button>
  );
}

function Pill({
  children,
  color,
  solid = false,
}: {
  children: ReactNode;
  color: string;
  solid?: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.2,
        color: solid ? "#fff" : color,
        background: solid ? color : tint(color, 14),
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function SectionTitle({
  eyebrow,
  title,
  right,
}: {
  eyebrow?: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && (
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--primary)",
              margin: 0,
            }}
          >
            {eyebrow}
          </p>
        )}
        <p
          style={{
            fontFamily: SERIF,
            fontSize: 22,
            lineHeight: 1.15,
            margin: eyebrow ? "4px 0 0" : 0,
            color: "var(--foreground)",
          }}
        >
          {title}
        </p>
      </div>
      {right}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* hero: concentric progress rings                                     */
/* ------------------------------------------------------------------ */

function Hero({
  stats,
  overall,
  onSelect,
  onCreate,
}: {
  stats: GoalStat[];
  overall: Overall;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  const mounted = useMounted();
  const pct = useCountUp(Math.round(overall.progress * 100));
  const ringStats = stats.slice(0, 5);
  const radii =
    ringStats.length <= 1 ? [78] : ringStats.length === 2 ? [84, 62] : [88, 74, 60, 46, 32];
  const width = ringStats.length <= 2 ? 15 : 10;
  const first = stats[0]?.theme || { a: "#4F8A68", b: "#8FC4A2", id: "sage" };
  const second = stats[1]?.theme || first;

  return (
    <section
      className="gt-rise relative overflow-hidden"
      style={{
        borderRadius: 32,
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow)",
        padding: 20,
        background: `radial-gradient(120% 90% at 0% 0%, ${tint(first.a, 24)}, transparent 60%), radial-gradient(100% 80% at 100% 100%, ${tint(second.b, 20)}, transparent 60%), var(--card)`,
      }}
    >
      <div className="flex items-center gap-4">
        <div style={{ position: "relative", width: 164, height: 164, flexShrink: 0 }}>
          <svg viewBox="0 0 200 200" width="164" height="164" role="img" aria-label={`Weekly progress ${Math.round(overall.progress * 100)} percent`}>
            <defs>
              {ringStats.map((s, i) => (
                <linearGradient key={s.goal.id} id={`gt-ring-${i}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={s.theme.a} />
                  <stop offset="100%" stopColor={s.theme.b} />
                </linearGradient>
              ))}
            </defs>
            {ringStats.length === 0 &&
              [78, 58, 38].map((r) => (
                <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="var(--border)" strokeWidth="10" strokeDasharray="3 9" strokeLinecap="round" />
              ))}
            {ringStats.map((s, i) => {
              const r = radii[i];
              const c = 2 * Math.PI * r;
              const p = s.progress > 0 && s.progress < 0.02 ? 0.02 : clamp(s.progress, 0, 1);
              return (
                <g key={s.goal.id} transform="rotate(-90 100 100)">
                  <circle cx="100" cy="100" r={r} fill="none" stroke={tint(s.theme.a, 16, "var(--card)")} strokeWidth={width} />
                  <circle
                    className="gt-ring"
                    cx="100"
                    cy="100"
                    r={r}
                    fill="none"
                    stroke={`url(#gt-ring-${i})`}
                    strokeWidth={width}
                    strokeLinecap="round"
                    style={{ strokeDasharray: c, strokeDashoffset: mounted ? c * (1 - p) : c }}
                  />
                </g>
              );
            })}
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            <span style={{ fontFamily: SERIF, fontSize: ringStats.length > 2 ? 30 : 36, lineHeight: 1, fontVariantNumeric: "tabular-nums", color: "var(--foreground)" }}>
              {pct}
              <span style={{ fontSize: 15 }}>%</span>
            </span>
            <span style={{ fontSize: 11, marginTop: 4, color: "var(--muted-foreground)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              this week
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {ringStats.length === 0 ? (
            <div>
              <p style={{ fontFamily: SERIF, fontSize: 21, lineHeight: 1.2, margin: 0 }}>
                Rings that fill as you grow.
              </p>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "8px 0 0", lineHeight: 1.45 }}>
                Every goal gets its own ring. Close them all in a week.
              </p>
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {ringStats.map((s) => (
                <li key={s.goal.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(s.goal.id)}
                    className="gt-press flex w-full items-center gap-2 text-left"
                    style={{ background: "transparent", border: 0, padding: "2px 0", color: "inherit" }}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: 99, background: grad(s.theme), flexShrink: 0 }} />
                    <span className="min-w-0 flex-1" style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.goal.title}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: s.theme.a }}>
                      {Math.round(s.progress * 100)}%
                    </span>
                  </button>
                </li>
              ))}
              {stats.length > 5 && (
                <li style={{ fontSize: 12, color: "var(--muted-foreground)" }}>+{stats.length - 5} more below</li>
              )}
            </ul>
          )}
        </div>
      </div>

      <p style={{ margin: "16px 0 0", fontSize: 14, lineHeight: 1.45, color: "var(--foreground)" }}>
        {encouragement(stats.length, overall)}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {overall.streak > 0 && (
          <Pill color="#DB6A33">
            <Icon name="flame" size={14} fill className="gt-flame" />
            {overall.streak} day{overall.streak === 1 ? "" : "s"} in a row
          </Pill>
        )}
        {stats.length > 0 && (
          <Pill color="#4F8A68">
            <Icon name="check" size={14} stroke={3} />
            {overall.doneToday} done today
          </Pill>
        )}
        {stats.length === 0 && (
          <button
            type="button"
            onClick={onCreate}
            className="gt-press"
            style={{
              border: 0,
              borderRadius: 999,
              padding: "10px 18px",
              fontSize: 14,
              fontWeight: 700,
              color: "#fff",
              background: grad({ id: "x", a: "#4F8A68", b: "#74B98D" }),
              boxShadow: "0 8px 20px rgba(79,138,104,.35)",
            }}
          >
            Create your first goal
          </button>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* weekly pulse                                                        */
/* ------------------------------------------------------------------ */

function Pulse({ overall, hasActions }: { overall: Overall; hasActions: boolean }) {
  const mounted = useMounted();
  const [sel, setSel] = useState(overall.todayIdx);
  const count = overall.pulse[sel] ?? 0;
  const future = sel > overall.todayIdx;
  return (
    <section
      className="gt-rise"
      style={{
        animationDelay: "80ms",
        borderRadius: 28,
        border: "1px solid var(--border)",
        background: "var(--card)",
        padding: 18,
        boxShadow: "var(--shadow)",
      }}
    >
      <SectionTitle eyebrow="This week" title="Your weekly pulse" />
      <div className="mt-4 grid grid-cols-7 gap-2">
        {DAY_LETTERS.map((letter, i) => {
          const c = overall.pulse[i] ?? 0;
          const isFuture = i > overall.todayIdx;
          const h = isFuture || !hasActions ? 8 : c === 0 ? 8 : 16 + (c / overall.pulseMax) * 84;
          const active = sel === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSel(i)}
              aria-label={`${DAY_NAMES[i]}: ${isFuture ? "upcoming" : `${c} done`}`}
              className="gt-press flex flex-col items-center gap-2"
              style={{ background: "transparent", border: 0, padding: 0, color: "inherit" }}
            >
              <div style={{ height: 100, width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                <div
                  className="gt-bar"
                  style={{
                    width: "100%",
                    maxWidth: 30,
                    height: mounted ? h : 8,
                    borderRadius: 12,
                    background: isFuture || c === 0 ? tint("#7d8a80", 14) : "linear-gradient(180deg,#8FC4A2,#4F8A68)",
                    outline: i === overall.todayIdx ? "2px solid var(--primary)" : "none",
                    outlineOffset: 2,
                    opacity: active || i === overall.todayIdx ? 1 : 0.85,
                  }}
                />
              </div>
              <span style={{ fontSize: 12, fontWeight: active ? 800 : 600, color: active ? "var(--foreground)" : "var(--muted-foreground)" }}>
                {letter}
              </span>
            </button>
          );
        })}
      </div>
      <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--muted-foreground)" }}>
        <strong style={{ color: "var(--foreground)" }}>{DAY_NAMES[sel]}</strong>
        {" · "}
        {future ? "still ahead" : `${count} action${count === 1 ? "" : "s"} done`}
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* next best step                                                      */
/* ------------------------------------------------------------------ */

function NextStepCard({
  stats,
  hasAnyAction,
  onToggle,
  onAddAction,
}: {
  stats: GoalStat[];
  hasAnyAction: boolean;
  onToggle: (a: ActionRow) => void;
  onAddAction: () => void;
}) {
  const next = useMemo(() => pickNextStep(stats), [stats]);
  if (!stats.length) return null;

  if (!next) {
    return (
      <section
        className="gt-rise relative overflow-hidden"
        style={{
          animationDelay: "120ms",
          borderRadius: 28,
          padding: 20,
          color: "#fff",
          background: hasAnyAction ? "linear-gradient(135deg,#3F7A5A,#7CC09A)" : "linear-gradient(135deg,#6b6f8a,#9aa0c4)",
        }}
      >
        <div className="gt-sheen" />
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.85 }}>
          Next best step
        </p>
        <p style={{ fontFamily: SERIF, fontSize: 24, lineHeight: 1.15, margin: "8px 0 0" }}>
          {hasAnyAction ? "You are all caught up." : "Give your goals a first action."}
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 14, opacity: 0.92, lineHeight: 1.45 }}>
          {hasAnyAction
            ? "Nothing else needs you today. Rest is part of the plan."
            : "One small daily action is all it takes to light up your rings."}
        </p>
        {!hasAnyAction && (
          <button
            type="button"
            onClick={onAddAction}
            className="gt-press"
            style={{ marginTop: 14, border: 0, borderRadius: 999, padding: "10px 18px", fontWeight: 700, fontSize: 14, background: "#fff", color: "#3b4252" }}
          >
            Add an action
          </button>
        )}
      </section>
    );
  }

  const { stat, item, need, daysLeft } = next;
  return (
    <section
      key={item.action.id}
      className="gt-rise relative overflow-hidden"
      style={{ animationDelay: "120ms", borderRadius: 28, padding: 20, color: "#fff", background: grad(stat.theme), boxShadow: `0 16px 40px ${stat.theme.a}44` }}
    >
      <div className="gt-sheen" />
      <div style={{ position: "absolute", right: -30, top: -30, width: 150, height: 150, borderRadius: 999, background: "rgba(255,255,255,.14)" }} />
      <div className="relative flex items-center gap-4">
        <div className="min-w-0 flex-1" style={{ textShadow: "0 1px 2px rgba(0,0,0,.22)" }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.9 }}>
            Next best step
          </p>
          <p style={{ fontFamily: SERIF, fontSize: 22, lineHeight: 1.18, margin: "8px 0 0", overflowWrap: "anywhere" }}>
            {item.action.name}
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 13, opacity: 0.95, lineHeight: 1.4 }}>
            For {stat.goal.title} · {need} more this week, {daysLeft} day{daysLeft === 1 ? "" : "s"} left
          </p>
        </div>
        <button
          type="button"
          aria-label={`Mark ${item.action.name} as done`}
          onClick={() => onToggle(item.action)}
          className="gt-press"
          style={{
            width: 64,
            height: 64,
            flexShrink: 0,
            borderRadius: 999,
            border: 0,
            background: "#fff",
            color: stat.theme.a,
            display: "grid",
            placeItems: "center",
            boxShadow: "0 10px 24px rgba(0,0,0,.2)",
          }}
        >
          <Icon name="check" size={30} stroke={3} />
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* goal card                                                           */
/* ------------------------------------------------------------------ */

function MiniRing({ value, size = 62 }: { value: number; size?: number }) {
  const mounted = useMounted();
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const p = clamp(value, 0, 1);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="6" />
          <circle
            className="gt-ring"
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#fff"
            strokeWidth="6"
            strokeLinecap="round"
            style={{ strokeDasharray: c, strokeDashoffset: mounted ? c * (1 - p) : c }}
          />
        </g>
      </svg>
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          fontSize: 14,
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums",
          color: "#fff",
          textShadow: "0 1px 2px rgba(0,0,0,.25)",
        }}
      >
        {Math.round(p * 100)}
      </span>
    </div>
  );
}

function WeekDots({ item, todayIdx, theme }: { item: ActionStat; todayIdx: number; theme: Theme }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`${item.doneWeek} of ${item.target} this week`}>
      {item.week.map((done, i) => (
        <span
          key={i}
          style={{
            width: 9,
            height: 9,
            borderRadius: 99,
            background: done ? grad(theme) : i > todayIdx ? "transparent" : tint(theme.a, 12),
            border: i > todayIdx && !done ? `1.5px dashed ${tint(theme.a, 35)}` : "none",
            outline: i === todayIdx ? `1.5px solid ${theme.a}` : "none",
            outlineOffset: 1.5,
          }}
        />
      ))}
      <span style={{ marginLeft: 4, fontSize: 12, fontWeight: 600, color: item.doneWeek >= item.target ? theme.a : "var(--muted-foreground)", fontVariantNumeric: "tabular-nums" }}>
        {item.doneWeek}/{item.target}
      </span>
    </div>
  );
}

function GoalCard({
  stat,
  index,
  todayIdx,
  open,
  onToggleOpen,
  onToggleAction,
  onDetail,
  onQuickAdd,
}: {
  stat: GoalStat;
  index: number;
  todayIdx: number;
  open: boolean;
  onToggleOpen: () => void;
  onToggleAction: (a: ActionRow) => void;
  onDetail: () => void;
  onQuickAdd: (goalId: string, name: string, target: number) => Promise<boolean>;
}) {
  const { goal, theme, cat } = stat;
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState(5);
  const [busy, setBusy] = useState(false);

  const rhythm = stat.heat.map((week) => {
    const vals = week.filter((v) => v >= 0);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  });

  async function submit() {
    const n = name.trim();
    if (!n) {
      toast.error("Name the action first.");
      return;
    }
    setBusy(true);
    const ok = await onQuickAdd(goal.id, n, target);
    setBusy(false);
    if (ok) {
      setName("");
      setAdding(false);
    }
  }

  return (
    <article
      id={`gt-goal-${goal.id}`}
      className="gt-rise"
      style={{
        animationDelay: `${Math.min(index, 6) * 70}ms`,
        overflow: "hidden",
        borderRadius: 30,
        border: "1px solid var(--border)",
        background: "var(--card)",
        boxShadow: "var(--shadow)",
      }}
    >
      <div style={{ position: "relative", padding: "18px 18px 16px", color: "#fff", background: grad(theme) }}>
        <div style={{ position: "absolute", right: -40, top: -50, width: 170, height: 170, borderRadius: 999, background: "rgba(255,255,255,.12)" }} />
        <div style={{ position: "absolute", right: 30, bottom: -60, width: 120, height: 120, borderRadius: 999, background: "rgba(255,255,255,.09)" }} />
        <Icon name={cat.icon} size={120} stroke={1.2} className="gt-float" style={{ position: "absolute", right: -10, bottom: -18, opacity: 0.13 }} />

        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
            <span style={{ width: 34, height: 34, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(255,255,255,.22)", backdropFilter: "blur(6px)" }}>
              <Icon name={cat.icon} size={18} />
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.92 }}>
              {cat.label}
            </span>
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,.24)", color: "#fff", whiteSpace: "nowrap" }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: stat.status === "nudge" ? "#FFD58A" : "#fff" }} />
            {STATUS_LABEL[stat.status]}
          </span>
        </div>

        <div className="relative mt-4 flex items-center gap-3">
          <div className="min-w-0 flex-1" style={{ textShadow: "0 1px 2px rgba(0,0,0,.22)" }}>
            <p style={{ fontFamily: SERIF, fontSize: 25, lineHeight: 1.12, margin: 0, overflowWrap: "anywhere" }}>
              {goal.title}
            </p>
            {goal.identity ? (
              <p style={{ margin: "8px 0 0", fontSize: 13, fontStyle: "italic", opacity: 0.95, lineHeight: 1.4 }}>
                {goal.identity}
              </p>
            ) : null}
          </div>
          <MiniRing value={stat.progress} />
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <div className="flex flex-wrap items-center gap-2">
          {stat.streak > 0 && (
            <Pill color="#DB6A33">
              <Icon name="flame" size={14} fill className="gt-flame" />
              {stat.streak} day{stat.streak === 1 ? "" : "s"}
            </Pill>
          )}
          {stat.actions.length > 0 && (
            <Pill color={theme.a}>
              {stat.doneTotal} of {stat.targetTotal} this week
            </Pill>
          )}
          {stat.daysLeft !== null && (
            <Pill color="#7156C0">
              <Icon name="calendar" size={14} />
              {formatLeft(stat.daysLeft)}
            </Pill>
          )}
        </div>

        {goal.why ? (
          <p style={{ margin: "12px 0 0", fontSize: 13, lineHeight: 1.5, color: "var(--muted-foreground)" }}>
            <span style={{ color: theme.a, fontWeight: 700 }}>Why: </span>
            {goal.why}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={open}
          className="gt-press mt-4 flex w-full items-center justify-between"
          style={{ background: "transparent", border: 0, padding: "4px 0", color: "var(--foreground)", fontSize: 13, fontWeight: 700 }}
        >
          <span>
            Daily actions <span style={{ color: "var(--muted-foreground)", fontWeight: 500 }}>({stat.actions.length})</span>
          </span>
          <Icon name="chevron" size={18} style={{ transition: "transform .3s", transform: open ? "rotate(180deg)" : "none" }} />
        </button>

        <div className="gt-collapse" data-open={open}>
          <div>
            <div className="flex flex-col gap-1 pt-2">
              {stat.actions.length === 0 && (
                <p style={{ margin: "4px 0 8px", fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
                  No actions yet. A goal moves when a small action repeats. Add your first one.
                </p>
              )}
              {stat.actions.map((item) => (
                <div
                  key={item.action.id}
                  className="flex items-center gap-3"
                  style={{ borderRadius: 18, padding: "8px 10px", background: item.doneToday ? tint(theme.a, 10) : "transparent", transition: "background .3s" }}
                >
                  <Tick
                    done={item.doneToday}
                    theme={theme}
                    label={item.doneToday ? `Mark ${item.action.name} as not done` : `Mark ${item.action.name} as done`}
                    onToggle={() => onToggleAction(item.action)}
                    size={42}
                  />
                  <div className="min-w-0 flex-1">
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 600, lineHeight: 1.3, overflowWrap: "anywhere", textDecoration: item.doneToday ? "line-through" : "none", opacity: item.doneToday ? 0.6 : 1 }}>
                      {item.action.name}
                    </p>
                    <div className="mt-1.5">
                      <WeekDots item={item} todayIdx={todayIdx} theme={theme} />
                    </div>
                  </div>
                </div>
              ))}

              {adding ? (
                <div style={{ marginTop: 6, minWidth: 0, overflow: "hidden", borderRadius: 20, border: "1px dashed var(--border)", padding: 12 }}>
                  <input
                    className="gt-input"
                    placeholder="A small action, like Walk for 20 minutes"
                    value={name}
                    autoFocus
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submit();
                    }}
                  />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <Stepper value={target} onChange={setTarget} label="days a week" theme={theme} />
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setAdding(false)} className="gt-press" style={{ border: 0, background: "transparent", color: "var(--muted-foreground)", fontWeight: 600, fontSize: 14, padding: "10px 8px" }}>
                        Cancel
                      </button>
                      <button type="button" onClick={submit} disabled={busy} className="gt-press" style={{ border: 0, borderRadius: 999, padding: "10px 16px", fontWeight: 700, fontSize: 14, color: "#fff", background: grad(theme), opacity: busy ? 0.7 : 1 }}>
                        {busy ? "Adding..." : "Add"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="gt-press"
                  style={{ marginTop: 6, minHeight: 46, borderRadius: 18, border: `1.5px dashed ${tint(theme.a, 45)}`, background: "transparent", color: theme.a, fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <Icon name="plus" size={16} stroke={2.6} /> Add action
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
              12-week rhythm
            </p>
            <div className="mt-2 flex items-end gap-1" style={{ height: 30 }} aria-hidden="true">
              {rhythm.map((v, i) => (
                <span key={i} style={{ width: 6, height: 5 + v * 25, borderRadius: 4, background: v > 0 ? grad(theme, 180) : tint(theme.a, 14) }} />
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onDetail}
            className="gt-press"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, border: `1px solid ${tint(theme.a, 40)}`, borderRadius: 999, background: tint(theme.a, 8), color: theme.a, fontWeight: 700, fontSize: 13, padding: "9px 14px" }}
          >
            Open details <Icon name="arrow" size={15} stroke={2.4} />
          </button>
        </div>
      </div>
    </article>
  );
}

function Stepper({
  value,
  onChange,
  label,
  theme,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
  theme: Theme;
}) {
  const btn: CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 999,
    border: `1px solid ${tint(theme.a, 40)}`,
    background: tint(theme.a, 8),
    color: theme.a,
    display: "grid",
    placeItems: "center",
  };
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label="Fewer days" className="gt-press" style={btn} onClick={() => onChange(clamp(value - 1, 1, 7))}>
        <Icon name="minus" size={16} stroke={2.8} />
      </button>
      <span style={{ minWidth: 70, textAlign: "center", fontSize: 13, color: "var(--muted-foreground)" }}>
        <strong style={{ fontSize: 16, color: "var(--foreground)" }}>{value}</strong> {label}
      </span>
      <button type="button" aria-label="More days" className="gt-press" style={btn} onClick={() => onChange(clamp(value + 1, 1, 7))}>
        <Icon name="plus" size={16} stroke={2.8} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* why wall                                                            */
/* ------------------------------------------------------------------ */

function WhyWall({ stats }: { stats: GoalStat[] }) {
  const list = stats.filter((s) => (s.goal.why || "").trim());
  const [i, setI] = useState(0);
  if (!list.length) return null;
  const s = list[i % list.length];
  const written = s.goal.created_at
    ? new Date(s.goal.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric" })
    : null;
  return (
    <section
      className="gt-rise relative overflow-hidden"
      style={{ animationDelay: "60ms", borderRadius: 30, padding: 22, color: "#fff", background: `linear-gradient(150deg, ${s.theme.a}, ${s.theme.b})`, boxShadow: `0 18px 44px ${s.theme.a}40` }}
    >
      <Icon name="quote" size={90} stroke={1.2} style={{ position: "absolute", right: 8, top: 6, opacity: 0.16 }} />
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.9 }}>
        Remember why
      </p>
      <div key={s.goal.id} className="gt-fade" style={{ textShadow: "0 1px 2px rgba(0,0,0,.2)" }}>
        <p style={{ fontFamily: SERIF, fontSize: 22, lineHeight: 1.3, margin: "12px 0 0", overflowWrap: "anywhere" }}>
          &ldquo;{s.goal.why}&rdquo;
        </p>
        <p style={{ margin: "14px 0 0", fontSize: 13, opacity: 0.95 }}>
          You, on {s.goal.title}
          {written ? ` · written ${written}` : ""}
        </p>
      </div>
      {list.length > 1 && (
        <button
          type="button"
          onClick={() => setI((n) => n + 1)}
          className="gt-press"
          style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 6, border: 0, borderRadius: 999, padding: "9px 14px", fontSize: 13, fontWeight: 700, background: "rgba(255,255,255,.24)", color: "#fff" }}
        >
          Another reason <Icon name="arrow" size={15} stroke={2.4} />
        </button>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* milestones                                                          */
/* ------------------------------------------------------------------ */

function Milestones({ badges }: { badges: Badge[] }) {
  const unlocked = badges.filter((b) => b.unlocked).length;
  return (
    <section className="gt-rise flex flex-col gap-3" style={{ animationDelay: "60ms" }}>
      <SectionTitle
        eyebrow="Milestones"
        title="Earned along the way"
        right={
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--muted-foreground)" }}>
            {unlocked}/{badges.length}
          </span>
        }
      />
      <div className="gt-scroll">
        {badges.map((b) => (
          <div
            key={b.id}
            style={{
              width: 138,
              borderRadius: 24,
              padding: 14,
              border: "1px solid var(--border)",
              background: b.unlocked ? `linear-gradient(160deg, ${tint(b.a, 14)}, var(--card))` : "var(--card)",
              boxShadow: b.unlocked ? `0 10px 26px ${b.a}22` : "none",
            }}
          >
            <span
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                display: "grid",
                placeItems: "center",
                color: b.unlocked ? "#fff" : "var(--muted-foreground)",
                background: b.unlocked ? `linear-gradient(135deg, ${b.a}, ${b.b})` : tint("#7d8a80", 14),
              }}
            >
              <Icon name={b.unlocked ? b.icon : "lock"} size={22} />
            </span>
            <p style={{ margin: "12px 0 0", fontSize: 14, fontWeight: 700, lineHeight: 1.2, opacity: b.unlocked ? 1 : 0.7 }}>
              {b.label}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 12, lineHeight: 1.35, color: "var(--muted-foreground)" }}>
              {b.unlocked ? b.hint : b.progress}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* insights                                                            */
/* ------------------------------------------------------------------ */

function Insights({ overall }: { overall: Overall }) {
  if (overall.totalCompletions < 1) return null;
  const maxDay = Math.max(...overall.weekdayTotals);
  const strongest = overall.weekdayTotals.indexOf(maxDay);
  const maxWeek = Math.max(1, ...overall.last4Weeks);
  const labels = ["3w ago", "2w ago", "Last wk", "This wk"];
  const card: CSSProperties = {
    borderRadius: 24,
    border: "1px solid var(--border)",
    background: "var(--card)",
    padding: 16,
    boxShadow: "var(--shadow)",
  };
  return (
    <section className="gt-rise flex flex-col gap-3" style={{ animationDelay: "60ms" }}>
      <SectionTitle eyebrow="Insights" title="What your data says" />
      <div className="grid grid-cols-2 gap-3">
        <div style={card}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)" }}>Strongest day</p>
          <p style={{ fontFamily: SERIF, fontSize: 24, margin: "6px 0 0", lineHeight: 1.1 }}>
            {maxDay > 0 ? DAY_NAMES[strongest] : "Not yet"}
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--muted-foreground)" }}>
            {maxDay > 0 ? `${maxDay} action${maxDay === 1 ? "" : "s"} done on ${DAY_NAMES[strongest]}s` : "Finish a few actions first"}
          </p>
        </div>
        <div style={card}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)" }}>Best streak</p>
          <p style={{ fontFamily: SERIF, fontSize: 24, margin: "6px 0 0", lineHeight: 1.1, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="flame" size={22} fill style={{ color: "#DB6A33" }} />
            {overall.best} day{overall.best === 1 ? "" : "s"}
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--muted-foreground)" }}>
            {overall.streak > 0 ? `Now at ${overall.streak}` : "Start a new one today"}
          </p>
        </div>
      </div>
      <div style={card}>
        <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)" }}>Actions done, last 4 weeks</p>
        <div className="mt-3 grid grid-cols-4 gap-3">
          {overall.last4Weeks.map((n, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{n}</span>
              <div style={{ height: 56, width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                <div style={{ width: "100%", maxWidth: 34, height: 6 + (n / maxWeek) * 50, borderRadius: 10, background: i === 3 ? "linear-gradient(180deg,#8FC4A2,#4F8A68)" : tint("#4F8A68", 28) }} />
              </div>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{labels[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* goal wizard                                                         */
/* ------------------------------------------------------------------ */

type Pick = { name: string; target: number; on: boolean };
type CreatePayload = {
  title: string;
  why: string | null;
  identity: string | null;
  countdown_id: string | null;
  /** A date (YYYY-MM-DD) picked in the wizard. A countdown is created for it. */
  new_date?: string | null;
  actions: { name: string; target: number }[];
};

function WizardBody({
  initialCat,
  countdowns,
  onCreate,
  onClose,
}: {
  initialCat: CatKey | null;
  countdowns: CountdownRow[];
  onCreate: (p: CreatePayload) => Promise<boolean>;
  onClose: () => void;
}) {
  const startCat = initialCat ? catByKey(initialCat) : null;
  const [step, setStep] = useState(startCat ? 1 : 0);
  const [catKey, setCatKey] = useState<CatKey | null>(startCat ? startCat.key : null);
  const [title, setTitle] = useState("");
  const [why, setWhy] = useState("");
  const [identity, setIdentity] = useState("");
  const [picks, setPicks] = useState<Pick[]>(
    startCat ? startCat.actions.map((a, i) => ({ ...a, on: i < 3 })) : [],
  );
  const [custom, setCustom] = useState("");
  const [countdownId, setCountdownId] = useState<string | null>(null);
  const [pickedDate, setPickedDate] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const baseCat = catKey ? catByKey(catKey) : catByKey("growth");
  const liveCat = baseCat.key === "growth" ? detectCategory(title) : baseCat;
  const theme = themeFor(liveCat, title || baseCat.titleHint);

  function chooseCat(c: Category) {
    setCatKey(c.key);
    setPicks(c.actions.map((a, i) => ({ ...a, on: i < 3 })));
    setError("");
    setStep(1);
  }
  function next() {
    setError("");
    if (step === 1 && !title.trim()) {
      setError("Give your goal a name first.");
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  }
  async function create() {
    if (!title.trim()) {
      setStep(1);
      setError("Give your goal a name first.");
      return;
    }
    setBusy(true);
    const ok = await onCreate({
      title: title.trim(),
      why: why.trim() || null,
      identity: identity.trim() || null,
      countdown_id: pickedDate ? null : countdownId,
      new_date: pickedDate || null,
      actions: picks.filter((p) => p.on).map((p) => ({ name: p.name, target: p.target })),
    });
    setBusy(false);
    if (ok) onClose();
  }
  function addCustom() {
    const n = custom.trim();
    if (!n) return;
    setPicks((p) => [...p, { name: n, target: 5, on: true }]);
    setCustom("");
  }

  const heading = ["What kind of goal?", "Name it, and say why", "Small daily actions", "Tie it to a date"][step];

  return (
    <div style={{ padding: "44px 18px 8px" }}>
      <div className="flex items-center gap-2" aria-label={`Step ${step + 1} of 4`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} style={{ height: 5, flex: 1, borderRadius: 99, background: i <= step ? grad(theme, 90) : tint(theme.a, 14), transition: "background .3s" }} />
        ))}
      </div>
      <p style={{ margin: "18px 0 0", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: theme.a }}>
        Step {step + 1} of 4
      </p>
      <p style={{ fontFamily: SERIF, fontSize: 28, lineHeight: 1.12, margin: "6px 0 0" }}>{heading}</p>

      {step === 0 && (
        <div className="gt-fade mt-5 grid grid-cols-2 gap-3">
          {CATEGORIES.map((c) => {
            const t = themeFor(c, c.label);
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => chooseCat(c)}
                className="gt-press text-left"
                style={{ borderRadius: 24, border: `1px solid ${tint(t.a, 30)}`, padding: 14, background: `linear-gradient(160deg, ${tint(t.a, 12)}, var(--card))`, color: "inherit", minHeight: 124 }}
              >
                <span style={{ width: 42, height: 42, borderRadius: 14, display: "grid", placeItems: "center", color: "#fff", background: grad(t) }}>
                  <Icon name={c.icon} size={21} />
                </span>
                <p style={{ margin: "12px 0 0", fontSize: 15, fontWeight: 700 }}>{c.label}</p>
                <p style={{ margin: "3px 0 0", fontSize: 12, lineHeight: 1.35, color: "var(--muted-foreground)" }}>{c.blurb}</p>
              </button>
            );
          })}
        </div>
      )}

      {step === 1 && (
        <div className="gt-fade mt-5 flex flex-col gap-4">
          <div style={{ position: "relative", overflow: "hidden", borderRadius: 24, padding: 16, color: "#fff", background: grad(theme), textShadow: "0 1px 2px rgba(0,0,0,.2)" }}>
            <Icon name={liveCat.icon} size={90} stroke={1.2} style={{ position: "absolute", right: -6, bottom: -12, opacity: 0.15 }} />
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.9 }}>{liveCat.label}</p>
            <p style={{ fontFamily: SERIF, fontSize: 22, lineHeight: 1.15, margin: "8px 0 0", overflowWrap: "anywhere" }}>
              {title.trim() || baseCat.titleHint}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 13, fontStyle: "italic", opacity: 0.95 }}>
              {identity.trim() || baseCat.identity}
            </p>
          </div>
          <div>
            <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600 }}>What are you moving toward?</p>
            <input className="gt-input" value={title} placeholder={baseCat.titleHint} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600 }}>Why does it matter? <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>(you will see this on hard days)</span></p>
            <textarea className="gt-input gt-area" value={why} placeholder={baseCat.whyHint} onChange={(e) => setWhy(e.target.value)} />
          </div>
          <div>
            <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600 }}>Who are you becoming?</p>
            <input className="gt-input" value={identity} placeholder={baseCat.identity} onChange={(e) => setIdentity(e.target.value)} />
            {!identity.trim() && (
              <button type="button" onClick={() => setIdentity(baseCat.identity)} className="gt-press" style={{ marginTop: 8, border: `1px solid ${tint(theme.a, 40)}`, borderRadius: 999, background: tint(theme.a, 8), color: theme.a, fontSize: 12, fontWeight: 700, padding: "7px 12px" }}>
                Use this suggestion
              </button>
            )}
          </div>
          {error && <p style={{ margin: 0, fontSize: 13, color: "#d64545" }}>{error}</p>}
        </div>
      )}

      {step === 2 && (
        <div className="gt-fade mt-5 flex flex-col gap-2">
          <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
            Pick the small things you will repeat. You can change them any time.
          </p>
          {picks.map((p, i) => (
            <div key={`${p.name}-${i}`} style={{ borderRadius: 20, border: `1px solid ${p.on ? tint(theme.a, 45) : "var(--border)"}`, background: p.on ? tint(theme.a, 8) : "var(--card)", padding: "10px 12px", transition: "all .2s" }}>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label={p.on ? `Remove ${p.name}` : `Add ${p.name}`}
                  aria-pressed={p.on}
                  onClick={() => setPicks((all) => all.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))}
                  className="gt-press"
                  style={{ width: 30, height: 30, borderRadius: 99, flexShrink: 0, display: "grid", placeItems: "center", border: p.on ? "none" : `2px solid ${tint(theme.a, 50)}`, background: p.on ? grad(theme) : "transparent", color: "#fff" }}
                >
                  {p.on && <Icon name="check" size={16} stroke={3} />}
                </button>
                <span className="min-w-0 flex-1" style={{ fontSize: 15, fontWeight: 600, overflowWrap: "anywhere" }}>{p.name}</span>
              </div>
              {p.on && (
                <div className="mt-2 pl-[42px]">
                  <Stepper value={p.target} onChange={(n) => setPicks((all) => all.map((x, j) => (j === i ? { ...x, target: n } : x)))} label="days a week" theme={theme} />
                </div>
              )}
            </div>
          ))}
          <div className="mt-2 flex items-center gap-2">
            <input className="gt-input" value={custom} placeholder="Write your own action" onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addCustom(); }} />
            <button type="button" onClick={addCustom} className="gt-press" style={{ border: 0, borderRadius: 16, minWidth: 52, minHeight: 48, color: "#fff", background: grad(theme), display: "grid", placeItems: "center" }} aria-label="Add custom action">
              <Icon name="plus" size={20} stroke={2.8} />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="gt-fade mt-5 flex flex-col gap-2">
          <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
            A date turns a wish into a plan. Link one of your countdowns, or skip.
          </p>
          <button type="button" onClick={() => { setCountdownId(null); setPickedDate(""); }} className="gt-press text-left" style={{ borderRadius: 20, border: `1px solid ${countdownId === null && !pickedDate ? tint(theme.a, 50) : "var(--border)"}`, background: countdownId === null && !pickedDate ? tint(theme.a, 8) : "var(--card)", padding: "14px 16px", color: "inherit" }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>No date for now</span>
          </button>
          {countdowns.map((c) => {
            const left = Math.ceil((new Date(c.target_at).getTime() - Date.now()) / 86400000);
            const on = countdownId === c.id && !pickedDate;
            return (
              <button key={c.id} type="button" onClick={() => { setCountdownId(c.id); setPickedDate(""); }} className="gt-press text-left" style={{ borderRadius: 20, border: `1px solid ${on ? tint(theme.a, 50) : "var(--border)"}`, background: on ? tint(theme.a, 8) : "var(--card)", padding: "14px 16px", color: "inherit" }}>
                <span style={{ display: "block", fontSize: 15, fontWeight: 600, overflowWrap: "anywhere" }}>{c.title}</span>
                <span style={{ display: "block", marginTop: 3, fontSize: 12, color: "var(--muted-foreground)" }}>
                  {new Date(c.target_at).toLocaleDateString("en-US", { dateStyle: "long" })} · {formatLeft(left)}
                </span>
              </button>
            );
          })}
          <div style={{ marginTop: 6, minWidth: 0, overflow: "hidden", borderRadius: 20, border: `1px solid ${pickedDate ? tint(theme.a, 50) : "var(--border)"}`, background: pickedDate ? tint(theme.a, 8) : "var(--card)", padding: "14px 16px" }}>
            <span style={{ display: "block", fontSize: 15, fontWeight: 600 }}>Pick a date</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {[
                ["1 month", 1],
                ["3 months", 3],
                ["6 months", 6],
                ["1 year", 12],
              ].map(([label, months]) => {
                const d = new Date();
                d.setHours(12, 0, 0, 0);
                const day = d.getDate();
                d.setDate(1);
                d.setMonth(d.getMonth() + (months as number));
                d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                const on = pickedDate === key;
                return (
                  <button key={label as string} type="button" onClick={() => { setPickedDate(key); setCountdownId(null); }} className="gt-press" style={{ minHeight: 40, padding: "0 14px", borderRadius: 999, border: `1px solid ${on ? tint(theme.a, 60) : "var(--border)"}`, background: on ? tint(theme.a, 14) : "transparent", color: "inherit", fontSize: 13, fontWeight: 600 }}>
                    {label as string}
                  </button>
                );
              })}
            </div>
            <input
              type="date"
              aria-label="Goal date"
              value={pickedDate}
              min={(() => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`; })()}
              onChange={(e) => { setPickedDate(e.target.value); if (e.target.value) setCountdownId(null); }}
              style={{ display: "block", marginTop: 10, width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", WebkitAppearance: "none", appearance: "none", minHeight: 46, borderRadius: 14, border: "1px solid var(--border)", background: "var(--background)", color: "inherit", padding: "0 12px", font: "inherit", fontSize: 15 }}
            />
            {pickedDate && (
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--muted-foreground)" }}>
                A countdown to {new Date(`${pickedDate}T12:00:00`).toLocaleDateString("en-US", { dateStyle: "long" })} will be added for this goal.
              </p>
            )}
          </div>
        </div>
      )}

      {step > 0 && (
        <div className="mt-6 flex items-center gap-3">
          <button type="button" onClick={() => { setError(""); setStep((s) => Math.max(0, s - 1)); }} className="gt-press" style={{ minHeight: 52, minWidth: 90, borderRadius: 18, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontWeight: 700, fontSize: 15 }}>
            Back
          </button>
          {step < 3 ? (
            <button type="button" onClick={next} className="gt-press" style={{ flex: 1, minHeight: 52, borderRadius: 18, border: 0, color: "#fff", fontWeight: 800, fontSize: 16, background: grad(theme), boxShadow: `0 10px 24px ${theme.a}44` }}>
              Continue
            </button>
          ) : (
            <button type="button" onClick={create} disabled={busy} className="gt-press" style={{ flex: 1, minHeight: 52, borderRadius: 18, border: 0, color: "#fff", fontWeight: 800, fontSize: 16, background: grad(theme), boxShadow: `0 10px 24px ${theme.a}44`, opacity: busy ? 0.75 : 1 }}>
              {busy ? "Creating..." : "Create goal"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* goal detail sheet                                                   */
/* ------------------------------------------------------------------ */

type GoalFields = { title: string; why: string | null; identity: string | null; countdown_id: string | null };

function DetailBody({
  stat,
  countdowns,
  todayIdx,
  onToggleAction,
  onUpdateGoal,
  onDeleteGoal,
  onUpdateAction,
  onDeleteAction,
  onAddAction,
}: {
  stat: GoalStat;
  countdowns: CountdownRow[];
  todayIdx: number;
  onToggleAction: (a: ActionRow) => void;
  onUpdateGoal: (g: GoalRow, f: GoalFields) => Promise<boolean>;
  onDeleteGoal: (g: GoalRow) => Promise<boolean>;
  onUpdateAction: (a: ActionRow, name: string, target: number) => Promise<boolean>;
  onDeleteAction: (a: ActionRow) => Promise<boolean>;
  onAddAction: (goalId: string, name: string, target: number) => Promise<boolean>;
}) {
  const { goal, theme, cat } = stat;
  const [editGoal, setEditGoal] = useState(false);
  const [title, setTitle] = useState(goal.title);
  const [why, setWhy] = useState(goal.why || "");
  const [identity, setIdentity] = useState(goal.identity || "");
  const [cd, setCd] = useState(goal.countdown_id || "");
  const [busy, setBusy] = useState(false);
  const [confirmGoal, setConfirmGoal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [aName, setAName] = useState("");
  const [aTarget, setATarget] = useState(5);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState(5);

  const maxDay = Math.max(1, ...stat.byWeekday);
  const bestDay = stat.byWeekday.indexOf(Math.max(...stat.byWeekday));
  const hasData = stat.totalDone > 0;
  const card: CSSProperties = { borderRadius: 24, border: "1px solid var(--border)", background: "var(--card)", padding: 16 };

  async function saveGoal() {
    if (!title.trim()) {
      toast.error("A goal needs a name.");
      return;
    }
    setBusy(true);
    const ok = await onUpdateGoal(goal, {
      title: title.trim(),
      why: why.trim() || null,
      identity: identity.trim() || null,
      countdown_id: cd || null,
    });
    setBusy(false);
    if (ok) setEditGoal(false);
  }

  return (
    <div style={{ padding: "44px 16px 8px" }} className="flex flex-col gap-4">
      <div style={{ position: "relative", overflow: "hidden", borderRadius: 28, padding: 18, color: "#fff", background: grad(theme), textShadow: "0 1px 2px rgba(0,0,0,.2)" }}>
        <Icon name={cat.icon} size={130} stroke={1.2} className="gt-float" style={{ position: "absolute", right: -14, bottom: -22, opacity: 0.13 }} />
        <div className="relative flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.92 }}>
              {cat.label} · {STATUS_LABEL[stat.status]}
            </p>
            <p style={{ fontFamily: SERIF, fontSize: 26, lineHeight: 1.12, margin: "8px 0 0", overflowWrap: "anywhere" }}>{goal.title}</p>
            {goal.identity ? <p style={{ margin: "8px 0 0", fontSize: 13, fontStyle: "italic", opacity: 0.95 }}>{goal.identity}</p> : null}
          </div>
          <MiniRing value={stat.progress} size={74} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Current streak", value: `${stat.streak}`, unit: stat.streak === 1 ? "day" : "days", flame: stat.streak > 0 },
          { label: "Best streak", value: `${stat.best}`, unit: stat.best === 1 ? "day" : "days", flame: false },
          { label: "Total completions", value: `${stat.totalDone}`, unit: "", flame: false },
          { label: "This week", value: `${stat.doneTotal}/${stat.targetTotal}`, unit: "", flame: false },
        ].map((s) => (
          <div key={s.label} style={card}>
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)" }}>{s.label}</p>
            <p style={{ fontFamily: SERIF, fontSize: 28, lineHeight: 1.1, margin: "6px 0 0", display: "flex", alignItems: "center", gap: 6, fontVariantNumeric: "tabular-nums" }}>
              {s.flame && <Icon name="flame" size={22} fill className="gt-flame" style={{ color: "#DB6A33" }} />}
              {s.value}
              {s.unit && <span style={{ fontSize: 14, color: "var(--muted-foreground)", fontFamily: "inherit" }}>{s.unit}</span>}
            </p>
          </div>
        ))}
      </div>

      <div style={card}>
        <div className="flex items-center justify-between">
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Last 12 weeks</p>
          <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>darker means more done</span>
        </div>
        <div className="mt-3 flex gap-1.5">
          <div className="flex flex-col justify-between" style={{ paddingRight: 2 }}>
            {DAY_LETTERS.map((l, i) => (
              <span key={i} style={{ fontSize: 9, lineHeight: "18px", color: "var(--muted-foreground)", visibility: i % 2 === 0 ? "visible" : "hidden" }}>{l}</span>
            ))}
          </div>
          {stat.heat.map((week, w) => (
            <div key={w} className="flex flex-1 flex-col gap-1.5">
              {week.map((v, d) => {
                const isToday = w === 11 && d === todayIdx;
                return (
                  <span
                    key={d}
                    style={{
                      display: "block",
                      height: 18,
                      borderRadius: 6,
                      background: v < 0 ? "transparent" : v === 0 ? tint(theme.a, 9) : tint(theme.a, 34 + v * 66),
                      border: v < 0 ? `1px dashed ${tint(theme.a, 22)}` : "none",
                      outline: isToday ? `2px solid ${theme.a}` : "none",
                      outlineOffset: 1,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Your strongest day</p>
        <div className="mt-3 grid grid-cols-7 gap-2">
          {stat.byWeekday.map((n, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div style={{ height: 64, width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                <div style={{ width: "100%", maxWidth: 26, height: 6 + (n / maxDay) * 56, borderRadius: 9, background: hasData && i === bestDay ? grad(theme, 180) : tint(theme.a, 22) }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: hasData && i === bestDay ? 800 : 500, color: hasData && i === bestDay ? "var(--foreground)" : "var(--muted-foreground)" }}>{DAY_LETTERS[i]}</span>
            </div>
          ))}
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--muted-foreground)" }}>
          {hasData ? `${DAY_NAMES[bestDay]} is where this goal moves most.` : "Complete a few actions and your pattern will appear here."}
        </p>
      </div>

      <div style={card}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Daily actions</p>
        <div className="mt-3 flex flex-col gap-2">
          {stat.actions.map((item) => {
            const a = item.action;
            const editing = editId === a.id;
            return (
              <div key={a.id} style={{ borderRadius: 18, border: "1px solid var(--border)", padding: 12, background: item.doneToday ? tint(theme.a, 8) : "transparent" }}>
                {editing ? (
                  <div className="flex flex-col gap-3">
                    <input className="gt-input" value={aName} onChange={(e) => setAName(e.target.value)} />
                    <Stepper value={aTarget} onChange={setATarget} label="days a week" theme={theme} />
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" onClick={() => setEditId(null)} className="gt-press" style={{ border: 0, background: "transparent", color: "var(--muted-foreground)", fontWeight: 600, padding: "10px 8px" }}>Cancel</button>
                      <button
                        type="button"
                        className="gt-press"
                        style={{ border: 0, borderRadius: 999, padding: "10px 16px", fontWeight: 700, color: "#fff", background: grad(theme) }}
                        onClick={async () => {
                          if (!aName.trim()) {
                            toast.error("An action needs a name.");
                            return;
                          }
                          const ok = await onUpdateAction(a, aName.trim(), aTarget);
                          if (ok) setEditId(null);
                        }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Tick done={item.doneToday} theme={theme} size={40} label={item.doneToday ? `Mark ${a.name} as not done` : `Mark ${a.name} as done`} onToggle={() => onToggleAction(a)} />
                    <div className="min-w-0 flex-1">
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, overflowWrap: "anywhere", textDecoration: item.doneToday ? "line-through" : "none", opacity: item.doneToday ? 0.6 : 1 }}>{a.name}</p>
                      <div className="mt-1.5"><WeekDots item={item} todayIdx={todayIdx} theme={theme} /></div>
                    </div>
                    <button type="button" aria-label={`Edit ${a.name}`} className="gt-press" onClick={() => { setEditId(a.id); setAName(a.name); setATarget(item.target); setConfirmAction(null); }} style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", display: "grid", placeItems: "center" }}>
                      <Icon name="pencil" size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label={confirmAction === a.id ? `Confirm delete ${a.name}` : `Delete ${a.name}`}
                      className="gt-press"
                      onClick={async () => {
                        if (confirmAction !== a.id) {
                          setConfirmAction(a.id);
                          return;
                        }
                        setConfirmAction(null);
                        await onDeleteAction(a);
                      }}
                      style={{ height: 38, minWidth: 38, padding: confirmAction === a.id ? "0 10px" : 0, borderRadius: 12, border: "1px solid #d6454555", background: confirmAction === a.id ? "#d64545" : "transparent", color: confirmAction === a.id ? "#fff" : "#d64545", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700 }}
                    >
                      {confirmAction === a.id ? "Delete?" : <Icon name="trash" size={16} />}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          <div className="flex flex-col gap-2" style={{ borderRadius: 18, border: `1.5px dashed ${tint(theme.a, 45)}`, padding: 12 }}>
            <input className="gt-input" value={newName} placeholder="Add another action" onChange={(e) => setNewName(e.target.value)} />
            <div className="flex items-center justify-between gap-3">
              <Stepper value={newTarget} onChange={setNewTarget} label="days a week" theme={theme} />
              <button
                type="button"
                className="gt-press"
                style={{ border: 0, borderRadius: 999, padding: "10px 16px", fontWeight: 700, color: "#fff", background: grad(theme) }}
                onClick={async () => {
                  if (!newName.trim()) {
                    toast.error("Name the action first.");
                    return;
                  }
                  const ok = await onAddAction(goal.id, newName.trim(), newTarget);
                  if (ok) setNewName("");
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={card}>
        <button type="button" onClick={() => setEditGoal((v) => !v)} className="flex w-full items-center justify-between" style={{ background: "transparent", border: 0, padding: 0, color: "var(--foreground)", fontSize: 14, fontWeight: 700 }}>
          Edit goal
          <Icon name="chevron" size={18} style={{ transition: "transform .3s", transform: editGoal ? "rotate(180deg)" : "none" }} />
        </button>
        <div className="gt-collapse" data-open={editGoal}>
          <div>
            <div className="flex flex-col gap-3 pt-4">
              <input className="gt-input" value={title} placeholder="Goal name" onChange={(e) => setTitle(e.target.value)} />
              <textarea className="gt-input gt-area" value={why} placeholder="Why does it matter?" onChange={(e) => setWhy(e.target.value)} />
              <input className="gt-input" value={identity} placeholder="I'm becoming someone who..." onChange={(e) => setIdentity(e.target.value)} />
              <select className="gt-input" value={cd} onChange={(e) => setCd(e.target.value)} aria-label="Linked countdown">
                <option value="">No countdown linked</option>
                {countdowns.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <button type="button" onClick={saveGoal} disabled={busy} className="gt-press" style={{ minHeight: 50, border: 0, borderRadius: 16, color: "#fff", fontWeight: 800, fontSize: 15, background: grad(theme), opacity: busy ? 0.7 : 1 }}>
                {busy ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="gt-press"
        onClick={async () => {
          if (!confirmGoal) {
            setConfirmGoal(true);
            return;
          }
          await onDeleteGoal(goal);
        }}
        style={{ minHeight: 50, borderRadius: 16, border: "1px solid #d6454566", background: confirmGoal ? "#d64545" : "transparent", color: confirmGoal ? "#fff" : "#d64545", fontWeight: 700, fontSize: 14 }}
      >
        {confirmGoal ? "Tap again to delete this goal and its actions" : "Delete goal"}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* the Goals tab                                                       */
/* ------------------------------------------------------------------ */

type Filter = "all" | "track" | "nudge" | "new";

export type GoalsTabProps = {
  supabase: any;
  user: { id: string } | null;
  goals: GoalRow[];
  actions: ActionRow[];
  countdowns: CountdownRow[];
  setGoals: Dispatch<SetStateAction<GoalRow[]>>;
  setActions: Dispatch<SetStateAction<ActionRow[]>>;
  setCountdowns?: Dispatch<SetStateAction<any[]>>;
  toggleAction: (a: ActionRow) => void | Promise<void>;
};

export function GoalsTab({
  supabase,
  user,
  goals,
  actions,
  countdowns,
  setGoals,
  setActions,
  setCountdowns,
  toggleAction,
}: GoalsTabProps) {
  const stats = useMemo(() => computeStats(goals, actions, countdowns), [goals, actions, countdowns]);
  const overall = useMemo(() => computeOverall(stats, actions), [stats, actions]);
  const badges = useMemo(() => computeBadges(stats, overall), [stats, overall]);
  const [filter, setFilter] = useState<Filter>("all");
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [wizard, setWizard] = useState<{ open: boolean; cat: CatKey | null; n: number }>({ open: false, cat: null, n: 0 });
  const [detailId, setDetailId] = useState<string | null>(null);

  const userId = user ? user.id : "";
  const detail = stats.find((s) => s.goal.id === detailId) || null;
  const hasAnyAction = actions.length > 0;

  useEffect(() => {
    try {
      const key = `small-steps-badges-${userId}`;
      const raw = window.localStorage.getItem(key);
      const unlocked = badges.filter((b) => b.unlocked).map((b) => b.id);
      if (raw === null) {
        window.localStorage.setItem(key, JSON.stringify(unlocked));
        return;
      }
      const seen: string[] = JSON.parse(raw);
      const fresh = badges.filter((b) => b.unlocked && !seen.includes(b.id));
      if (fresh.length) {
        fresh.forEach((b) => toast.success(`Milestone unlocked: ${b.label}`));
        window.localStorage.setItem(key, JSON.stringify(unlocked));
      }
    } catch {
      /* storage may be unavailable */
    }
  }, [badges, userId]);

  const message = (e: unknown) =>
    e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Something went wrong.";

  async function addActionTo(goalId: string, name: string, target: number) {
    const res = await supabase
      .from("habits")
      .insert({ user_id: userId, goal_id: goalId, name, weekly_target: target })
      .select("id,name,goal_id,weekly_target")
      .single();
    if (res.error) {
      toast.error(message(res.error));
      return false;
    }
    setActions((prev) => [...prev, { ...res.data, completions: [] }]);
    toast.success("Action added.");
    return true;
  }
  async function updateAction(a: ActionRow, name: string, target: number) {
    const res = await supabase
      .from("habits")
      .update({ name, weekly_target: target })
      .eq("id", a.id)
      .eq("user_id", userId)
      .select("id,name,goal_id,weekly_target")
      .single();
    if (res.error) {
      toast.error(message(res.error));
      return false;
    }
    setActions((prev) => prev.map((x) => (x.id === a.id ? { ...x, ...res.data } : x)));
    toast.success("Action updated.");
    return true;
  }
  async function deleteAction(a: ActionRow) {
    const res = await supabase.from("habits").delete().eq("id", a.id).eq("user_id", userId);
    if (res.error) {
      toast.error(message(res.error));
      return false;
    }
    setActions((prev) => prev.filter((x) => x.id !== a.id));
    toast.success("Action deleted.");
    return true;
  }
  async function updateGoal(g: GoalRow, f: GoalFields) {
    const res = await supabase
      .from("goals")
      .update(f)
      .eq("id", g.id)
      .eq("user_id", userId)
      .select(GOAL_COLS)
      .single();
    if (res.error) {
      toast.error(message(res.error));
      return false;
    }
    setGoals((prev) => prev.map((x) => (x.id === g.id ? { ...x, ...res.data } : x)));
    toast.success("Goal updated.");
    return true;
  }
  async function deleteGoal(g: GoalRow) {
    const res = await supabase.from("goals").delete().eq("id", g.id).eq("user_id", userId);
    if (res.error) {
      toast.error(message(res.error));
      return false;
    }
    setGoals((prev) => prev.filter((x) => x.id !== g.id));
    setActions((prev) => prev.filter((x) => x.goal_id !== g.id));
    setDetailId(null);
    toast.success("Goal deleted.");
    return true;
  }
  async function createGoal(p: CreatePayload) {
    let countdownId = p.countdown_id;
    if (p.new_date) {
      const [y, m, d] = p.new_date.split("-").map(Number);
      const target = new Date(y, (m || 1) - 1, d || 1, 23, 59, 0);
      if (Number.isNaN(target.getTime())) {
        toast.error("That date doesn't look right.");
        return false;
      }
      const cd = await supabase
        .from("countdowns")
        .insert({ user_id: userId, title: p.title, target_at: target.toISOString(), is_featured: false })
        .select("id,title,target_at,created_at,is_featured")
        .single();
      if (cd.error) {
        toast.error(message(cd.error));
        return false;
      }
      countdownId = cd.data.id;
      setCountdowns?.((prev) => [...prev, cd.data]);
    }
    const res = await supabase
      .from("goals")
      .insert({ user_id: userId, title: p.title, why: p.why, identity: p.identity, countdown_id: countdownId })
      .select(GOAL_COLS)
      .single();
    if (res.error) {
      toast.error(message(res.error));
      return false;
    }
    const goal = res.data as GoalRow;
    setGoals((prev) => [...prev, goal]);
    if (p.actions.length) {
      const ins = await supabase
        .from("habits")
        .insert(p.actions.map((a) => ({ user_id: userId, goal_id: goal.id, name: a.name, weekly_target: a.target })))
        .select("id,name,goal_id,weekly_target");
      if (ins.error) {
        toast.error(`Goal saved, but the actions failed: ${message(ins.error)}`);
      } else {
        setActions((prev) => [...prev, ...((ins.data || []) as Omit<ActionRow, "completions">[]).map((h) => ({ ...h, completions: [] }))]);
      }
    }
    setOpenMap((m) => ({ ...m, [goal.id]: true }));
    toast.success("Goal created. Let's go.");
    return true;
  }

  function jumpTo(id: string) {
    setOpenMap((m) => ({ ...m, [id]: true }));
    setFilter("all");
    window.setTimeout(() => {
      const el = document.getElementById(`gt-goal-${id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  const matches = (s: GoalStat) =>
    filter === "all"
      ? true
      : filter === "track"
        ? s.status === "track" || s.status === "done"
        : filter === "nudge"
          ? s.status === "nudge"
          : s.status === "fresh" || s.status === "empty";
  const visible = stats.filter(matches);
  const counts = {
    all: stats.length,
    track: stats.filter((s) => s.status === "track" || s.status === "done").length,
    nudge: stats.filter((s) => s.status === "nudge").length,
    new: stats.filter((s) => s.status === "fresh" || s.status === "empty").length,
  };
  const chips: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "track", label: "On track" },
    { key: "nudge", label: "Needs a nudge" },
    { key: "new", label: "New" },
  ];

  const openWizard = (cat: CatKey | null) => setWizard((w) => ({ open: true, cat, n: w.n + 1 }));

  return (
    <div className="flex flex-col gap-5 pb-6">
      <style>{GT_CSS}</style>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--primary)" }}>
            Your direction
          </p>
          <p style={{ fontFamily: SERIF, fontSize: 38, lineHeight: 1.02, letterSpacing: "-0.03em", margin: "6px 0 0" }}>Goals</p>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--muted-foreground)" }}>
            {stats.length} goal{stats.length === 1 ? "" : "s"} · {actions.length} daily action{actions.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openWizard(null)}
          className="gt-press"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, border: 0, borderRadius: 999, padding: "12px 16px", fontSize: 14, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg,#4F8A68,#74B98D)", boxShadow: "0 10px 24px rgba(79,138,104,.38)", flexShrink: 0 }}
        >
          <Icon name="plus" size={17} stroke={3} /> New goal
        </button>
      </div>

      <Hero stats={stats} overall={overall} onSelect={jumpTo} onCreate={() => openWizard(null)} />

      {stats.length === 0 && (
        <section className="gt-rise flex flex-col gap-3" style={{ animationDelay: "100ms" }}>
          <SectionTitle eyebrow="Start here" title="Pick a starting point" />
          <div className="gt-scroll">
            {CATEGORIES.filter((c) => c.key !== "growth").map((c) => {
              const t = themeFor(c, c.label);
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => openWizard(c.key)}
                  className="gt-press text-left"
                  style={{ width: 168, borderRadius: 26, padding: 16, border: 0, color: "#fff", background: grad(t), position: "relative", overflow: "hidden", textShadow: "0 1px 2px rgba(0,0,0,.2)", boxShadow: `0 14px 30px ${t.a}38` }}
                >
                  <Icon name={c.icon} size={80} stroke={1.2} style={{ position: "absolute", right: -8, bottom: -10, opacity: 0.18 }} />
                  <span style={{ width: 38, height: 38, borderRadius: 13, display: "grid", placeItems: "center", background: "rgba(255,255,255,.22)" }}>
                    <Icon name={c.icon} size={20} />
                  </span>
                  <p style={{ margin: "14px 0 0", fontFamily: SERIF, fontSize: 19, lineHeight: 1.15 }}>{c.label}</p>
                  <p style={{ margin: "6px 0 0", fontSize: 12, lineHeight: 1.35, opacity: 0.95 }}>{c.blurb}</p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <NextStepCard stats={stats} hasAnyAction={hasAnyAction} onToggle={toggleAction} onAddAction={() => { if (stats[0]) setDetailId(stats[0].goal.id); }} />

      {hasAnyAction && <Pulse overall={overall} hasActions={hasAnyAction} />}

      <WhyWall stats={stats} />

      {stats.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionTitle eyebrow="Your goals" title="Everything in motion" />
          {stats.length > 1 && (
            <div className="gt-scroll" role="tablist" aria-label="Filter goals">
              {chips.map((c) => {
                const on = filter === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setFilter(c.key)}
                    className="gt-press"
                    style={{ borderRadius: 999, padding: "9px 14px", fontSize: 13, fontWeight: 700, border: `1px solid ${on ? "var(--primary)" : "var(--border)"}`, background: on ? "var(--primary)" : "var(--card)", color: on ? "var(--primary-foreground)" : "var(--foreground)", whiteSpace: "nowrap" }}
                  >
                    {c.label} <span style={{ opacity: 0.75, marginLeft: 4 }}>{counts[c.key]}</span>
                  </button>
                );
              })}
            </div>
          )}
          {visible.length === 0 && (
            <p style={{ margin: 0, fontSize: 14, color: "var(--muted-foreground)", padding: "8px 2px" }}>
              Nothing in this view right now.
            </p>
          )}
          {visible.map((s, i) => (
            <GoalCard
              key={s.goal.id}
              stat={s}
              index={i}
              todayIdx={overall.todayIdx}
              open={openMap[s.goal.id] ?? stats.indexOf(s) === 0}
              onToggleOpen={() => setOpenMap((m) => ({ ...m, [s.goal.id]: !(m[s.goal.id] ?? stats.indexOf(s) === 0) }))}
              onToggleAction={toggleAction}
              onDetail={() => setDetailId(s.goal.id)}
              onQuickAdd={addActionTo}
            />
          ))}
          <button
            type="button"
            onClick={() => openWizard(null)}
            className="gt-press"
            style={{ minHeight: 64, borderRadius: 26, border: "1.5px dashed var(--border)", background: "transparent", color: "var(--muted-foreground)", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <Icon name="plus" size={18} stroke={2.6} /> Add another goal
          </button>
        </section>
      )}

      <Milestones badges={badges} />
      <Insights overall={overall} />

      <Sheet open={wizard.open} onOpenChange={(o) => setWizard((w) => ({ ...w, open: o }))}>
        <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom)+4.5rem)]">
          <SheetHeader className="sr-only">
            <SheetTitle>Create a goal</SheetTitle>
            <SheetDescription>Build a new goal step by step.</SheetDescription>
          </SheetHeader>
          {wizard.open && (
            <WizardBody
              key={wizard.n}
              initialCat={wizard.cat}
              countdowns={countdowns}
              onCreate={createGoal}
              onClose={() => setWizard((w) => ({ ...w, open: false }))}
            />
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={Boolean(detail)} onOpenChange={(o) => { if (!o) setDetailId(null); }}>
        <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom)+4.5rem)]">
          <SheetHeader className="sr-only">
            <SheetTitle>{detail ? detail.goal.title : "Goal details"}</SheetTitle>
            <SheetDescription>Progress, patterns and settings for this goal.</SheetDescription>
          </SheetHeader>
          {detail && (
            <DetailBody
              key={detail.goal.id}
              stat={detail}
              countdowns={countdowns}
              todayIdx={overall.todayIdx}
              onToggleAction={toggleAction}
              onUpdateGoal={updateGoal}
              onDeleteGoal={deleteGoal}
              onUpdateAction={updateAction}
              onDeleteAction={deleteAction}
              onAddAction={addActionTo}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
