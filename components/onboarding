"use client";

import { useId, useMemo } from "react";
import { arcPoint, makeStars, mix, sceneAt } from "@/lib/day-scene";

// The Today "living sky", reduced to a hero band for onboarding.
// Pass an hour (0 to 24). When the hour changes, colors and the sun/moon glide there
// using the same CSS transitions as the Today screen, so the sky travels through the day.

const W = 400;
const H = 260;
const HORIZON = 204;
const PEAK = 84;
const STARS = makeStars(40, W, 150);

const css = `
.ob-sky-svg { position:absolute; inset:0; width:100%; height:100%; display:block; }
.ob-sky-svg stop, .ob-sky-hill { transition:stop-color 1.4s ease, fill 1.4s ease; }
.ob-sky-body { transition:transform 2.2s cubic-bezier(.22,.8,.3,1); }
.ob-sky-layer { transition:opacity 1.4s ease; }
@keyframes ob-twinkle { 0%,100% { opacity:.25 } 50% { opacity:1 } }
@keyframes ob-drift { from { transform:translateX(-140px) } to { transform:translateX(560px) } }
@keyframes ob-breathe { 0%,100% { transform:scale(1); opacity:.9 } 50% { transform:scale(1.12); opacity:1 } }
@media (prefers-reduced-motion:no-preference) {
  .ob-star { animation:ob-twinkle var(--d,3s) ease-in-out var(--dl,0s) infinite; }
  .ob-cloud { animation:ob-drift var(--d,100s) linear var(--dl,0s) infinite; }
  .ob-glow { transform-box:fill-box; transform-origin:center; animation:ob-breathe 5s ease-in-out infinite; }
}
@media (prefers-reduced-motion:reduce) {
  .ob-sky-svg stop, .ob-sky-hill, .ob-sky-body, .ob-sky-layer { transition:none; }
  .ob-star { opacity:.8 }
}
`;

export function SkyBackdrop({ hour }: { hour: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const scene = useMemo(() => sceneAt(hour), [hour]);
  const sun = scene.sunT === null ? null : arcPoint(scene.sunT, W, HORIZON, PEAK);
  const moon = scene.moonT === null ? null : arcPoint(scene.moonT, W, HORIZON, PEAK + 6);
  const glow = mix("#ffe9a0", "#ff7a3a", scene.sunWarmth);
  const sunColor = mix("#fff4bf", "#ff8a3d", scene.sunWarmth);

  return (
    <>
      <style>{css}</style>
      <svg className="ob-sky-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id={`sky${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: scene.top }} />
            <stop offset="1" style={{ stopColor: scene.bottom }} />
          </linearGradient>
          <radialGradient id={`glow${uid}`}>
            <stop offset="0" style={{ stopColor: glow, stopOpacity: 0.85 }} />
            <stop offset="0.45" style={{ stopColor: glow, stopOpacity: 0.25 }} />
            <stop offset="1" style={{ stopColor: glow, stopOpacity: 0 }} />
          </radialGradient>
          <radialGradient id={`mglow${uid}`}>
            <stop offset="0" stopColor="#dfe8ff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#dfe8ff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`scrim${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.38" />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill={`url(#sky${uid})`} />
        <g className="ob-sky-layer" style={{ opacity: scene.starOpacity }}>
          {STARS.map((s, i) => (
            <circle key={i} className="ob-star" cx={s.x} cy={s.y} r={s.r} fill="#fff"
              style={{ ["--d" as string]: `${s.dur}s`, ["--dl" as string]: `${s.delay}s` }} />
          ))}
        </g>
        {sun && (
          <g className="ob-sky-body" style={{ transform: `translate(${sun.x}px, ${sun.y}px)` }}>
            <circle className="ob-glow" r="62" fill={`url(#glow${uid})`} />
            <circle r="15" style={{ fill: sunColor, transition: "fill 1.4s ease" }} />
          </g>
        )}
        {moon && (
          <g className="ob-sky-body" style={{ transform: `translate(${moon.x}px, ${moon.y}px)` }}>
            <circle className="ob-glow" r="44" fill={`url(#mglow${uid})`} />
            <circle r="13" fill="#f4f1e4" />
            <circle cx="-4" cy="-3" r="2.4" fill="#d9d4bd" opacity=".7" />
            <circle cx="4" cy="4" r="3" fill="#d9d4bd" opacity=".55" />
          </g>
        )}
        <g className="ob-sky-layer" style={{ opacity: scene.cloudOpacity }} fill="#fff">
          <g className="ob-cloud" style={{ ["--d" as string]: "110s", ["--dl" as string]: "-30s" }}>
            <ellipse cx="0" cy="60" rx="30" ry="9" opacity=".9" />
            <ellipse cx="-18" cy="65" rx="20" ry="7" opacity=".8" />
            <ellipse cx="20" cy="66" rx="22" ry="7" opacity=".8" />
          </g>
          <g className="ob-cloud" style={{ ["--d" as string]: "150s", ["--dl" as string]: "-95s" }}>
            <ellipse cx="0" cy="104" rx="38" ry="9" opacity=".6" />
            <ellipse cx="26" cy="109" rx="26" ry="7" opacity=".5" />
          </g>
        </g>
        <path className="ob-sky-hill" style={{ fill: scene.hillFar }} d="M0 196 Q 80 160 170 186 T 330 178 T 400 172 V260 H0Z" />
        <path className="ob-sky-hill" style={{ fill: scene.hillNear }} d="M0 224 Q 110 190 220 218 T 400 208 V260 H0Z" />
        <rect y="120" width={W} height="140" fill={`url(#scrim${uid})`} />
      </svg>
    </>
  );
}
