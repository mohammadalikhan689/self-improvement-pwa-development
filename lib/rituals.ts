// Pure logic for the Today "rituals" (morning intention + evening reflection).
// No React and no network, so it is easy to test.

import { mix } from "./day-scene";

export const MOOD_NAMES = ["Low", "Down", "Okay", "Good", "Happy"] as const;

/** Longest morning intention we save. */
export const MAX_INTENTION = 120;

/* ---------- Time of day ---------- */

export type RitualMode = "morning" | "midday" | "evening";

/** Which ritual leads the screen: morning until noon, evening from 6 PM. */
export function ritualMode(hour: number): RitualMode {
  const h = ((hour % 24) + 24) % 24;
  if (h < 12) return "morning";
  if (h < 18) return "midday";
  return "evening";
}

/* ---------- Faces ---------- */

export type Face = {
  color: string;
  /** SVG control point of the mouth curve. The mouth line is at y=68: above it frowns, below it smiles. */
  mouthCtrl: number;
  mouthX0: number;
  mouthX1: number;
  /** Eye height. Small means squinting happily. */
  eyeRy: number;
  /** Brow tilt in degrees, positive = sad (inner ends raised). */
  browTilt: number;
  browOpacity: number;
  cheekOpacity: number;
};

// One look per mood. In-between values are blended, so a face can morph smoothly.
const LOOKS: Face[] = [
  { color: "#8fa0c8", mouthCtrl: 56, mouthX0: 36, mouthX1: 64, eyeRy: 3.8, browTilt: 14, browOpacity: 1, cheekOpacity: 0 },
  { color: "#9db4e6", mouthCtrl: 64, mouthX0: 35, mouthX1: 65, eyeRy: 3.8, browTilt: 8, browOpacity: 0.8, cheekOpacity: 0 },
  { color: "#f0cf6b", mouthCtrl: 72, mouthX0: 34, mouthX1: 66, eyeRy: 3.6, browTilt: 0, browOpacity: 0.3, cheekOpacity: 0 },
  { color: "#8fd9a4", mouthCtrl: 80, mouthX0: 32, mouthX1: 68, eyeRy: 3.4, browTilt: 0, browOpacity: 0, cheekOpacity: 0.5 },
  { color: "#ffb35c", mouthCtrl: 88, mouthX0: 30, mouthX1: 70, eyeRy: 1.6, browTilt: -4, browOpacity: 0, cheekOpacity: 1 },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The face for a mood from 1 to 5, including in-between values. Out-of-range input is clamped. */
export function faceAt(value: number): Face {
  const v = Math.min(5, Math.max(1, Number.isFinite(value) ? value : 3));
  const i = Math.min(3, Math.floor(v - 1));
  const t = v - 1 - i;
  const a = LOOKS[i];
  const b = LOOKS[i + 1];
  return {
    color: mix(a.color, b.color, t),
    mouthCtrl: lerp(a.mouthCtrl, b.mouthCtrl, t),
    mouthX0: lerp(a.mouthX0, b.mouthX0, t),
    mouthX1: lerp(a.mouthX1, b.mouthX1, t),
    eyeRy: lerp(a.eyeRy, b.eyeRy, t),
    browTilt: lerp(a.browTilt, b.browTilt, t),
    browOpacity: lerp(a.browOpacity, b.browOpacity, t),
    cheekOpacity: lerp(a.cheekOpacity, b.cheekOpacity, t),
  };
}

/* ---------- Intention suggestions ---------- */

export type GoalLite = { id: string; title: string; identity?: string | null };
export type ActionLite = { id: string; name: string; goal_id: string; completions: string[] };

const lowerFirst = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** "I'm becoming someone who moves every day." becomes "be someone who moves every day". */
export function identityToIntention(identity: string | null | undefined): string | null {
  const m = (identity || "").trim().match(/^I(?:['’]m| am) becoming\s+(.+?)[.!\s]*$/i);
  if (!m || !m[1]) return null;
  return clip(`be ${m[1].trim()}`, 60);
}

/**
 * Up to `max` ways to finish "Today I will …", taken from the person's own goals:
 * the first two identity lines, then actions they have not ticked yet today.
 */
export function intentionSuggestions(goals: GoalLite[], actions: ActionLite[], todayKey: string, max = 4): string[] {
  const out: string[] = [];
  const push = (t: string | null) => {
    const clean = (t || "").trim();
    if (clean && !out.some((x) => x.toLowerCase() === clean.toLowerCase())) out.push(clean);
  };
  let identities = 0;
  for (const g of goals) {
    if (identities >= 2) break;
    const before = out.length;
    push(identityToIntention(g.identity));
    if (out.length > before) identities += 1;
  }
  for (const a of actions) {
    if (out.length >= max) break;
    if (a.completions.includes(todayKey)) continue;
    push(clip(lowerFirst(a.name.trim()), 44));
  }
  return out.slice(0, max);
}

/* ---------- Journal ---------- */

export type JournalInput = {
  moodName: string;
  intention: string | null;
  win: string | null;
  improve: string | null;
  tasksDone: number;
  tasksTotal: number;
  actionsDone: number;
  streak: number;
};
export type JournalLine = { key: "feel" | "intention" | "win" | "tomorrow" | "stats"; label: string; text: string };

const endsSentence = (s: string) => /[.!?…]$/.test(s);
const sentence = (s: string) => (endsSentence(s) ? s : `${s}.`);

/** The short journal entry shown after the evening reflection. Empty parts are left out. */
export function journalLines(i: JournalInput): JournalLine[] {
  const lines: JournalLine[] = [{ key: "feel", label: "Feeling", text: `You felt ${i.moodName.toLowerCase()} today.` }];
  const intention = (i.intention || "").trim();
  if (intention) lines.push({ key: "intention", label: "Intention", text: `You set out to ${sentence(lowerFirst(intention))}` });
  const win = (i.win || "").trim();
  if (win) lines.push({ key: "win", label: "A win", text: sentence(win) });
  const improve = (i.improve || "").trim();
  if (improve) lines.push({ key: "tomorrow", label: "Tomorrow", text: sentence(improve) });

  const bits: string[] = [];
  if (i.tasksTotal > 0) bits.push(`${i.tasksDone} of ${i.tasksTotal} ${i.tasksTotal === 1 ? "task" : "tasks"} done`);
  if (i.actionsDone > 0) bits.push(`${i.actionsDone} ${i.actionsDone === 1 ? "step" : "steps"} ticked`);
  if (i.streak >= 2) bits.push(`${i.streak}-day streak`);
  if (bits.length) lines.push({ key: "stats", label: "The day", text: bits.join(" · ") });
  return lines;
}
