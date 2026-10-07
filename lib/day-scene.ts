// Pure logic for the Today "day scene". No React and no network, so it is easy to test.
// Everything is a function of the clock: the sky colours, where the sun or moon sits on
// its arc, how many stars are visible, and what part of the day it is.

export type Phase = "night" | "dawn" | "morning" | "day" | "golden" | "dusk";

export type SceneTheme = {
  phase: Phase;
  /** Sky gradient, top and bottom, as #rrggbb. */
  top: string;
  bottom: string;
  /** Hill colours (far, near) so the horizon matches the sky. */
  hillFar: string;
  hillNear: string;
  /** Sun position along its arc, 0 (sunrise) to 1 (sunset), or null when it is not up. */
  sunT: number | null;
  /** Moon position along its arc, 0 (moonrise) to 1 (moonset), or null when it is not up. */
  moonT: number | null;
  /** 0 to 1. */
  starOpacity: number;
  /** 0 to 1: how warm/low the sun is (drives its colour). */
  sunWarmth: number;
  /** 0 to 1: how much cloud cover. Clouds are brighter by day, dimmer at night. */
  cloudOpacity: number;
  /** Accent colour for chips and highlights that sits well on this sky. */
  accent: string;
};

type Stop = {
  h: number;
  top: string;
  bottom: string;
  hillFar: string;
  hillNear: string;
};

// Hour-of-day keyframes. Colours between two stops are blended, so the sky never jumps.
const STOPS: Stop[] = [
  { h: 0, top: "#0a0e2a", bottom: "#1a2356", hillFar: "#141a40", hillNear: "#0c1030" },
  { h: 4.5, top: "#141b4a", bottom: "#33307a", hillFar: "#1d2158", hillNear: "#10143a" },
  { h: 6, top: "#4a4a96", bottom: "#e58f7c", hillFar: "#5a4a82", hillNear: "#2c2858" },
  { h: 7.5, top: "#4f8fd6", bottom: "#f8c995", hillFar: "#4a7f9a", hillNear: "#2f5c6e" },
  { h: 10, top: "#2f7fd4", bottom: "#8ccaf2", hillFar: "#3a8aa0", hillNear: "#256a74" },
  { h: 14, top: "#2a78cc", bottom: "#86c4ee", hillFar: "#388aa0", hillNear: "#235f70" },
  { h: 16.5, top: "#3b76c2", bottom: "#c7d6e8", hillFar: "#4a7c8e", hillNear: "#2e5868" },
  { h: 18, top: "#52609f", bottom: "#f4a261", hillFar: "#6a5478", hillNear: "#3a3158" },
  { h: 19.2, top: "#383a78", bottom: "#d96f78", hillFar: "#4a3a70", hillNear: "#262450" },
  { h: 20.5, top: "#1a2152", bottom: "#4a3f80", hillFar: "#252a62", hillNear: "#151a46" },
  { h: 22, top: "#0c1232", bottom: "#1c2658", hillFar: "#161c46", hillNear: "#0d1234" },
  { h: 24, top: "#0a0e2a", bottom: "#1a2356", hillFar: "#141a40", hillNear: "#0c1030" },
];

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toHex = (rgb: number[]) =>
  "#" +
  rgb
    .map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0"))
    .join("");
export function mix(a: string, b: string, t: number): string {
  const x = hex(a);
  const y = hex(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
}

/** Fractional hour, 0 to 24, from a Date. */
export const hourOf = (d: Date) => d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;

export function phaseAt(hour: number): Phase {
  const h = ((hour % 24) + 24) % 24;
  if (h < 5) return "night";
  if (h < 7) return "dawn";
  if (h < 11) return "morning";
  if (h < 16.5) return "day";
  if (h < 18.5) return "golden";
  if (h < 20.5) return "dusk";
  return "night";
}

export function sceneAt(hourIn: number): SceneTheme {
  const hour = ((hourIn % 24) + 24) % 24;
  let i = 0;
  while (i < STOPS.length - 2 && hour >= STOPS[i + 1].h) i += 1;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  const t = clamp((hour - a.h) / (b.h - a.h), 0, 1);

  // The sun is up from 6:00 to 18:30, the moon from 18:30 to 6:00 (next day).
  const SUN_RISE = 6;
  const SUN_SET = 18.5;
  const sunUp = hour >= SUN_RISE && hour <= SUN_SET;
  const sunT = sunUp ? (hour - SUN_RISE) / (SUN_SET - SUN_RISE) : null;
  let moonT: number | null = null;
  if (!sunUp) {
    const since = hour >= SUN_SET ? hour - SUN_SET : hour + 24 - SUN_SET;
    moonT = clamp(since / (24 - SUN_SET + SUN_RISE), 0, 1);
  }

  // Warmth: 1 right at the horizon, 0 high in the sky.
  const sunWarmth = sunT === null ? 0 : clamp(1 - Math.sin(Math.PI * sunT) * 1.35, 0, 1);

  // Stars fade in after dusk and out before dawn.
  let starOpacity = 0;
  if (hour >= 19.5 || hour < 5.5) {
    starOpacity = 1;
    if (hour >= 19.5 && hour < 21) starOpacity = (hour - 19.5) / 1.5;
    if (hour >= 4.5 && hour < 5.5) starOpacity = 1 - (hour - 4.5);
  }

  const phase = phaseAt(hour);
  const night = phase === "night";
  return {
    phase,
    top: mix(a.top, b.top, t),
    bottom: mix(a.bottom, b.bottom, t),
    hillFar: mix(a.hillFar, b.hillFar, t),
    hillNear: mix(a.hillNear, b.hillNear, t),
    sunT,
    moonT,
    starOpacity: clamp(starOpacity, 0, 1),
    sunWarmth,
    cloudOpacity: night ? 0.14 : phase === "day" || phase === "morning" ? 0.85 : 0.5,
    accent: night ? "#ffd479" : phase === "dusk" || phase === "golden" ? "#ffe0a3" : "#fff3c4",
  };
}

/** Point on the arc for t in [0,1]. The arc is a half-ellipse above the horizon. */
export function arcPoint(
  t: number,
  width: number,
  horizonY: number,
  peakY: number,
  margin = 0.1,
): { x: number; y: number } {
  const left = width * margin;
  const right = width * (1 - margin);
  return {
    x: left + (right - left) * t,
    y: horizonY - (horizonY - peakY) * Math.sin(Math.PI * t),
  };
}

/** Moon age as 0 to 1 (0 new, 0.5 full), so the drawn moon changes through the month. */
export function moonPhase(date: Date): number {
  // Days since a known new moon (2000-01-06 18:14 UTC), modulo the synodic month.
  const synodic = 29.530588853;
  const known = Date.UTC(2000, 0, 6, 18, 14);
  const days = (date.getTime() - known) / 86400000;
  return ((days % synodic) + synodic) % synodic / synodic; // 0 new, 0.5 full
}

/** Small deterministic pseudo-random so stars stay in place between renders. */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export type Star = { x: number; y: number; r: number; delay: number; dur: number };
export function makeStars(count: number, width: number, height: number): Star[] {
  const rnd = seeded(20260607);
  return Array.from({ length: count }, () => ({
    x: rnd() * width,
    y: rnd() * height,
    r: 0.6 + rnd() * 1.3,
    delay: rnd() * 4,
    dur: 2.4 + rnd() * 3,
  }));
}

/** Short line for the sky, depending on how the day is going. */
export function dayLine(done: number, total: number, phase: Phase): string {
  if (total === 0) {
    return phase === "night" ? "Nothing planned. Rest well." : "A blank day. Add one small step.";
  }
  if (done === total) return phase === "night" ? "Everything done. Sleep easy." : "Everything done. Well earned.";
  if (done === 0) return `${total} ${total === 1 ? "step" : "steps"} waiting. Start with one.`;
  return `${done} of ${total} done. Keep going.`;
}
