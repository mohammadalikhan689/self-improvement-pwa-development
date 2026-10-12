"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Ellipsis, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { hourOf, mix, sceneAt } from "@/lib/day-scene";
import {
  type CountdownItem,
  heroOf,
  longLabel,
  orderCountdowns,
  pad2,
  partsBetween,
  periodProgress,
  secondFraction,
} from "@/lib/countdown-stats";

// Section 3 of the Today screen: the life clock.
// Inner ring = the real 60 seconds. Outer ring = how much of the whole period has passed.
// Swipe sideways to move between countdowns.

const R_OUT = 102;
const R_IN = 88;
const C_OUT = 2 * Math.PI * R_OUT;
const C_IN = 2 * Math.PI * R_IN;

const css = `
.cd-wrap, .cd-wrap *, .cd-wrap *::before, .cd-wrap *::after { box-sizing:border-box; }
.cd-wrap { position:relative; overflow:hidden; border-radius:28px; color:#fff; box-shadow:0 14px 40px rgba(20,24,60,.2); }
.cd-track { display:flex; overflow-x:auto; scroll-snap-type:x mandatory; scrollbar-width:none; -webkit-overflow-scrolling:touch; overscroll-behavior-x:contain; }
.cd-track::-webkit-scrollbar { display:none; }
.cd-slide { position:relative; flex:0 0 100%; scroll-snap-align:center; padding:1.1rem 1.25rem .5rem; display:flex; flex-direction:column; align-items:center; }
.cd-head { width:100%; display:flex; align-items:flex-start; justify-content:space-between; gap:.75rem; }
.cd-eyebrow { font-size:.66rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; opacity:.8; }
.cd-title { margin:.2rem 0 0; font-family:Georgia,'Times New Roman',serif; font-weight:400; font-size:1.5rem; line-height:1.15; letter-spacing:-.02em; overflow-wrap:anywhere; text-wrap:balance; }
.cd-menu-btn { flex:0 0 auto; width:2.5rem; height:2.5rem; margin:-.35rem -.45rem 0 0; display:grid; place-items:center; border:0; border-radius:999px; background:rgba(255,255,255,.12); color:#fff; }
.cd-menu-btn:hover { background:rgba(255,255,255,.22); }
.cd-menu-btn svg { width:18px; height:18px; }
.cd-pop { position:absolute; z-index:6; right:1rem; top:3.4rem; min-width:11.5rem; padding:.35rem; border-radius:1rem; background:rgba(14,18,44,.96); border:1px solid rgba(255,255,255,.14); box-shadow:0 14px 34px rgba(0,0,0,.4); }
.cd-pop button { display:flex; align-items:center; gap:.65rem; width:100%; min-height:2.6rem; padding:0 .75rem; border:0; border-radius:.7rem; background:transparent; color:#fff; font-size:.9rem; text-align:left; }
.cd-pop button:hover { background:rgba(255,255,255,.1); }
.cd-pop button svg { width:16px; height:16px; opacity:.85; }
.cd-pop .danger { color:#ffb4a8; }
.cd-scrim { position:fixed; inset:0; z-index:5; background:transparent; border:0; }
.cd-ringbox { position:relative; width:min(66vw,15rem); aspect-ratio:1; margin:.9rem auto .4rem; }
.cd-ringbox svg { position:absolute; inset:0; width:100%; height:100%; overflow:visible; }
.cd-center { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; }
.cd-days { font-family:Georgia,'Times New Roman',serif; font-size:clamp(2.6rem,15vw,3.6rem); line-height:1; letter-spacing:-.04em; font-variant-numeric:tabular-nums; }
.cd-days-label { margin-top:.3rem; font-size:.72rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; opacity:.8; }
.cd-clock { font-variant-numeric:tabular-nums; font-size:1.15rem; font-weight:600; letter-spacing:.06em; }
.cd-long { margin-top:.2rem; font-size:.88rem; opacity:.9; text-align:center; }
.cd-meta { margin-top:.2rem; font-size:.78rem; opacity:.72; text-align:center; }
.cd-dots { display:flex; justify-content:center; gap:.4rem; padding:.55rem 0 .15rem; }
.cd-dot { width:.4rem; height:.4rem; padding:0; border:0; border-radius:999px; background:rgba(255,255,255,.35); transition:width .25s, background .25s; }
.cd-dot.on { width:1.2rem; background:#fff; }
.cd-add { display:flex; align-items:center; justify-content:center; gap:.4rem; width:100%; min-height:2.9rem; border:0; border-top:1px solid rgba(255,255,255,.12); background:rgba(0,0,0,.14); color:#fff; font-size:.88rem; font-weight:600; }
.cd-add svg { width:16px; height:16px; }
.cd-cta { width:100%; min-height:3rem; margin-top:1rem; border:0; border-radius:1rem; background:#fff; color:#17204a; font-weight:700; }
.cd-done { margin:2.2rem 0 1.4rem; text-align:center; }
.cd-done strong { display:block; font-family:Georgia,serif; font-size:2.4rem; font-weight:400; }
.cd-conf { position:absolute; left:50%; top:46%; width:.5rem; height:.8rem; border-radius:2px; opacity:0; animation:cd-pop 1.8s cubic-bezier(.15,.8,.3,1) both; }
.cd-slide-compact { align-items:stretch; padding:.85rem 1rem .85rem 1.15rem; }
.cd-sum { display:flex; align-items:center; gap:.9rem; width:100%; padding:0 2.6rem 0 0; border:0; background:transparent; color:inherit; text-align:left; font:inherit; }
.cd-sum-text { min-width:0; flex:1; }
.cd-title-sm { font-size:1.2rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.cd-sum .cd-meta { margin-top:.3rem; display:flex; align-items:center; gap:.3rem; text-align:left; }
.cd-sum .cd-meta svg { width:14px; height:14px; opacity:.8; }
.cd-mini { position:relative; flex:0 0 auto; width:4.6rem; height:4.6rem; }
.cd-mini svg { position:absolute; inset:0; width:100%; height:100%; overflow:visible; }
.cd-days-sm { font-size:1.2rem; letter-spacing:-.03em; }
.cd-days-label-sm { margin-top:.1rem; font-size:.5rem; letter-spacing:.1em; }
.cd-slide-compact .cd-menu-btn { position:absolute; top:.5rem; right:.5rem; margin:0; width:2.25rem; height:2.25rem; }
.cd-slide-compact .cd-pop { top:2.9rem; }
.cd-collapse { display:flex; align-items:center; justify-content:center; gap:.35rem; width:100%; min-height:2.5rem; border:0; background:transparent; color:#fff; font-size:.8rem; font-weight:600; opacity:.8; }
.cd-collapse svg { width:15px; height:15px; }
@keyframes cd-sweep { from { stroke-dashoffset:${C_IN} } to { stroke-dashoffset:0 } }
@keyframes cd-pop { 0% { opacity:1; transform:translate(0,0) rotate(0) } 100% { opacity:0; transform:translate(var(--x),var(--y)) rotate(var(--r)) } }
@keyframes cd-pulse { 0%,100% { opacity:1 } 50% { opacity:.55 } }
@media (prefers-reduced-motion:no-preference) {
  .cd-sec { animation:cd-sweep 60s linear infinite; animation-delay:var(--delay,0s); }
  .cd-tip { animation:cd-pulse 1s ease-in-out infinite; }
}
@media (prefers-reduced-motion:reduce) { .cd-conf { display:none; } }
`;

/** Re-renders once per real second, on the second boundary. */
function useSecondClock(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let timer: number | undefined;
    const loop = () => {
      setNow(Date.now());
      timer = window.setTimeout(loop, 1000 - (Date.now() % 1000) + 8);
    };
    loop();
    const sync = () => {
      if (timer) window.clearTimeout(timer);
      loop();
    };
    document.addEventListener("visibilitychange", sync);
    return () => {
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  return now;
}

const CONFETTI = Array.from({ length: 18 }, (_, i) => {
  const a = (i / 18) * Math.PI * 2;
  const d = 90 + ((i * 37) % 70);
  return {
    x: Math.round(Math.cos(a) * d),
    y: Math.round(Math.sin(a) * d - 30),
    r: `${(i * 97) % 360}deg`,
    c: ["#ffd479", "#ff9db4", "#8fe3c0", "#9cc4ff", "#fff"][i % 5],
  };
});

type SlideProps = {
  item: CountdownItem;
  isPrimary: boolean;
  now: number;
  menuOpen: boolean;
  onMenu: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onFeature: () => void;
  onAdd: () => void;
  compact: boolean;
  onToggle: () => void;
};

function Slide({ item, isPrimary, now, menuOpen, onMenu, onEdit, onDelete, onFeature, onAdd, compact, onToggle }: SlideProps) {
  const target = useMemo(() => new Date(item.target_at), [item.target_at]);
  const targetMs = target.getTime();
  const parts = partsBetween(now, targetMs);
  const progress = periodProgress(item.created_at, item.target_at, now);
  const hero = heroOf(parts);
  const dateLabel = target.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });

  // The seconds ring starts from the real clock. Re-sync when the tab comes back to the front.
  const [sync, setSync] = useState(() => Date.now());
  useEffect(() => {
    const on = () => setSync(Date.now());
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  const delay = `${-((sync % 60000) / 1000).toFixed(3)}s`;

  const pct = progress === null ? null : Math.floor(progress * 100);
  const spoken = parts.passed
    ? `${item.title}: countdown complete`
    : `${item.title}: ${longLabel(parts)}, ${parts.hours} hours, ${parts.minutes} minutes, ${parts.seconds} seconds remaining`;

  const ringSvg = (
            <svg viewBox="0 0 220 220">
              {/* Outer ring: how much of the whole period has passed */}
              <circle cx="110" cy="110" r={R_OUT} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="7" />
              {progress !== null && (
                <circle
                  cx="110" cy="110" r={R_OUT} fill="none" stroke="#fff" strokeOpacity=".9" strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={C_OUT} strokeDashoffset={C_OUT * (1 - Math.max(progress, 0.012))}
                  transform="rotate(-90 110 110)" style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              )}
              {/* Inner ring: the real 60 seconds */}
              <circle cx="110" cy="110" r={R_IN} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="6" />
              <circle
                key={sync}
                className="cd-sec"
                cx="110" cy="110" r={R_IN} fill="none" stroke="#ffd479" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={C_IN} strokeDashoffset={C_IN * (1 - secondFraction(now))}
                transform="rotate(-90 110 110)" style={{ ["--delay" as string]: delay }}
              />
            </svg>
  );
  const menu = (
      menuOpen && (
        <>
          <button type="button" className="cd-scrim" aria-label="Close menu" onClick={() => onMenu(false)} />
          <div className="cd-pop" role="menu">
            <button type="button" role="menuitem" onClick={() => { onMenu(false); onEdit(); }}>
              <Pencil aria-hidden="true" /> Edit
            </button>
            {!isPrimary && (
              <button type="button" role="menuitem" onClick={() => { onMenu(false); onFeature(); }}>
                <Star aria-hidden="true" /> Make featured
              </button>
            )}
            <button type="button" role="menuitem" onClick={() => { onMenu(false); onAdd(); }}>
              <Plus aria-hidden="true" /> New countdown
            </button>
            <button type="button" role="menuitem" className="danger" onClick={() => { onMenu(false); onDelete(); }}>
              <Trash2 aria-hidden="true" /> Delete
            </button>
          </div>
        </>
      )
  );

  if (compact && !parts.passed) {
    return (
      <div className="cd-slide cd-slide-compact" role="group" aria-label={spoken}>
        <button type="button" className="cd-sum" aria-expanded={false} aria-label={`${spoken}. Show full countdown`} onClick={onToggle}>
          <span className="cd-sum-text">
            <span className="cd-eyebrow" style={{ display: "block" }}>{isPrimary ? "Featured countdown" : "Countdown"}</span>
            <span className="cd-title cd-title-sm" style={{ display: "block" }}>{item.title}</span>
            <span className="cd-meta" style={{ display: "flex" }}>
              {longLabel(parts)}
              <ChevronDown aria-hidden="true" />
            </span>
          </span>
          <span className="cd-mini" aria-hidden="true">
            {ringSvg}
            <span className="cd-center">
              <span className="cd-days cd-days-sm">{hero.value.toLocaleString("en-US")}</span>
              <span className="cd-days-label cd-days-label-sm">{hero.label}</span>
            </span>
          </span>
        </button>
        <button className="cd-menu-btn" type="button" aria-label={`Options for ${item.title}`} aria-expanded={menuOpen} onClick={() => onMenu(!menuOpen)}>
          <Ellipsis aria-hidden="true" />
        </button>
        {menu}
      </div>
    );
  }

  return (
    <div className="cd-slide" role="group" aria-label={spoken}>
      <div className="cd-head">
        <div style={{ minWidth: 0 }}>
          <p className="cd-eyebrow">{isPrimary ? "Featured countdown" : "Countdown"}</p>
          <h2 className="cd-title">{item.title}</h2>
        </div>
        <button className="cd-menu-btn" type="button" aria-label={`Options for ${item.title}`} aria-expanded={menuOpen} onClick={() => onMenu(!menuOpen)}>
          <Ellipsis aria-hidden="true" />
        </button>
      </div>

      {menu}

      {parts.passed ? (
        <div className="cd-done" style={{ position: "relative" }}>
          {CONFETTI.map((c, i) => (
            <span key={i} className="cd-conf" style={{ background: c.c, ["--x" as string]: `${c.x}px`, ["--y" as string]: `${c.y}px`, ["--r" as string]: c.r }} />
          ))}
          <strong>You made it.</strong>
          <p className="cd-meta">{dateLabel}</p>
        </div>
      ) : (
        <>
          <div className="cd-ringbox" aria-hidden="true">
            {ringSvg}
            <div className="cd-center">
              <span className="cd-days">{hero.value.toLocaleString("en-US")}</span>
              <span className="cd-days-label">{hero.label}</span>
            </div>
          </div>
          <p className="cd-clock" aria-hidden="true">
            {pad2(parts.hours)} : {pad2(parts.minutes)} : {pad2(parts.seconds)}
          </p>
          <p className="cd-long">{longLabel(parts)}</p>
          <p className="cd-meta">
            Until {dateLabel}
            {pct !== null && ` · ${pct}% of the way there`}
          </p>
        </>
      )}
    </div>
  );
}

type Props = {
  countdowns: CountdownItem[];
  onAdd: () => void;
  onEdit: (c: CountdownItem) => void;
  onDelete: (c: CountdownItem) => void;
  onFeature: (c: CountdownItem) => void;
};

export function CountdownCard({ countdowns, onAdd, onEdit, onDelete, onFeature }: Props) {
  const now = useSecondClock();
  const ordered = useMemo(
    () => orderCountdowns(Array.isArray(countdowns) ? countdowns.filter((item) => item?.target_at) : []),
    [countdowns],
  );
  const [active, setActive] = useState(0);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const track = useRef<HTMLDivElement>(null);

  // Starts as a slim banner. Tap it to open the full ring; the choice is remembered on this device.
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    try {
      if (window.localStorage.getItem("small-steps-countdown-expanded") === "1") setExpanded(true);
    } catch {}
  }, []);
  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    try {
      window.localStorage.setItem("small-steps-countdown-expanded", next ? "1" : "0");
    } catch {}
  };

  // Tint the card from the sky, so it belongs to the Day scene above it.
  const sky = sceneAt(hourOf(new Date(now)));
  const background = `linear-gradient(165deg, ${mix(sky.top, "#000000", 0.3)}, ${mix(sky.bottom, "#000000", 0.58)})`;

  const lastIndex = useRef(0);
  const onScroll = useCallback(() => {
    const el = track.current;
    if (!el || !el.clientWidth) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    if (index === lastIndex.current) return;
    lastIndex.current = index;
    setActive(index);
    setMenuFor(null); // only close the menu when you actually move to another countdown
  }, []);

  // If a countdown is deleted while the last one is showing, keep the position valid.
  useEffect(() => {
    if (active > ordered.length - 1) setActive(Math.max(0, ordered.length - 1));
  }, [ordered.length, active]);

  if (ordered.length === 0) {
    return (
      <section className="cd-wrap" style={{ background }}>
        <style>{css}</style>
        <div className="cd-slide" style={{ paddingBottom: "1.25rem", alignItems: "stretch" }}>
          <p className="cd-eyebrow">Featured countdown</p>
          <h2 className="cd-title">Pick a date you&apos;re working toward.</h2>
          <button type="button" className="cd-cta" onClick={onAdd}>Set a countdown</button>
        </div>
      </section>
    );
  }

  return (
    <section className="cd-wrap" style={{ background }} aria-roledescription="carousel" aria-label="Countdowns">
      <style>{css}</style>
      <div className="cd-track" ref={track} onScroll={onScroll}>
        {ordered.map((c, i) => (
          <Slide
            key={c.id}
            item={c}
            isPrimary={i === 0}
            now={now}
            menuOpen={menuFor === c.id}
            onMenu={(open) => setMenuFor(open ? c.id : null)}
            onEdit={() => onEdit(c)}
            onDelete={() => onDelete(c)}
            onFeature={() => onFeature(c)}
            onAdd={onAdd}
            compact={!expanded}
            onToggle={toggle}
          />
        ))}
      </div>
      {ordered.length > 1 && (
        <div className="cd-dots" role="tablist" aria-label="Choose countdown">
          {ordered.map((c, i) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={c.title}
              className={i === active ? "cd-dot on" : "cd-dot"}
              onClick={() => {
                const el = track.current;
                if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
              }}
            />
          ))}
        </div>
      )}
      {expanded && (
        <>
          <button type="button" className="cd-collapse" onClick={toggle}>
            <ChevronUp aria-hidden="true" /> Show less
          </button>
          <button type="button" className="cd-add" onClick={onAdd}>
            <Plus aria-hidden="true" /> Add countdown
          </button>
        </>
      )}
    </section>
  );
}
