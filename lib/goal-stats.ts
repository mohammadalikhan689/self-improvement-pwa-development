// Pure logic for the Goals tab. No React and no network, so it is easy to test.

export type GoalRow = {
  id: string;
  title: string;
  why: string | null;
  identity?: string | null;
  countdown_id?: string | null;
  created_at?: string | null;
};
export type ActionRow = {
  id: string;
  name: string;
  goal_id: string;
  weekly_target: number;
  completions: string[];
};
export type CountdownRow = {
  id: string;
  title: string;
  target_at: string;
  is_featured?: boolean;
};

export type IconName =
  | "heart"
  | "book"
  | "coin"
  | "target"
  | "leaf"
  | "users"
  | "pencil"
  | "spark"
  | "flame"
  | "check"
  | "plus"
  | "minus"
  | "x"
  | "trash"
  | "trophy"
  | "lock"
  | "arrow"
  | "chevron"
  | "calendar"
  | "bolt"
  | "star"
  | "quote"
  | "sun"
  | "mic"
  | "refresh"
  | "journal";

export type Theme = { id: string; a: string; b: string };
export const THEMES: Theme[] = [
  { id: "sage", a: "#4F8A68", b: "#8FC4A2" },
  { id: "ocean", a: "#3A74B8", b: "#74B9E8" },
  { id: "ember", a: "#DB6A33", b: "#F2AE5A" },
  { id: "violet", a: "#7156C0", b: "#AE92EE" },
  { id: "rose", a: "#C25577", b: "#F096B0" },
  { id: "teal", a: "#26867F", b: "#6ECDBE" },
  { id: "gold", a: "#B98421", b: "#E8BE52" },
];

export type CatKey =
  | "health"
  | "learn"
  | "money"
  | "focus"
  | "calm"
  | "people"
  | "create"
  | "growth";

export type Category = {
  key: CatKey;
  label: string;
  blurb: string;
  icon: IconName;
  theme: number;
  words: string[];
  identity: string;
  whyHint: string;
  titleHint: string;
  actions: { name: string; target: number }[];
};

export const CATEGORIES: Category[] = [
  {
    key: "health",
    label: "Body & health",
    blurb: "Move, eat well, feel strong",
    icon: "heart",
    theme: 2,
    words: ["health", "fit", "gym", "run", "workout", "exercise", "weight", "muscle", "walk", "diet", "body", "strong", "swim", "yoga", "football", "cricket", "sport", "steps", "water", "stamina"],
    identity: "I'm becoming someone who moves every day.",
    whyHint: "I want to feel strong and full of energy.",
    titleHint: "Get stronger and fitter",
    actions: [
      { name: "Walk for 20 minutes", target: 5 },
      { name: "Drink 2 litres of water", target: 7 },
      { name: "Stretch for 10 minutes", target: 4 },
      { name: "Strength session", target: 3 },
      { name: "Sleep before 11 PM", target: 5 },
    ],
  },
  {
    key: "learn",
    label: "Learning",
    blurb: "A skill, a language, an exam",
    icon: "book",
    theme: 1,
    words: ["learn", "study", "read", "book", "language", "spanish", "english", "arabic", "french", "german", "course", "exam", "school", "skill", "code", "coding", "program", "math", "degree", "ielts", "class", "tuition", "tution"],
    identity: "I'm becoming someone who keeps learning.",
    whyHint: "I want to be fluent and confident.",
    titleHint: "Become fluent in Spanish",
    actions: [
      { name: "Study for 30 minutes", target: 5 },
      { name: "Practice out loud for 15 minutes", target: 4 },
      { name: "Learn 5 new words", target: 5 },
      { name: "Read 10 pages", target: 5 },
      { name: "Review yesterday's notes", target: 4 },
    ],
  },
  {
    key: "money",
    label: "Money",
    blurb: "Save, earn, buy something big",
    icon: "coin",
    theme: 6,
    words: ["money", "save", "saving", "invest", "budget", "debt", "buy", "xbox", "earn", "income", "salary", "rich", "wealth", "loan", "spend", "laptop", "bike", "fund"],
    identity: "I'm becoming someone who is calm and in control with money.",
    whyHint: "I want freedom and fewer worries.",
    titleHint: "Save for something that matters",
    actions: [
      { name: "Log today's spending", target: 7 },
      { name: "Put a fixed amount aside", target: 5 },
      { name: "Skip one impulse purchase", target: 3 },
      { name: "Check the budget", target: 2 },
    ],
  },
  {
    key: "focus",
    label: "Work & focus",
    blurb: "Ship projects, build a career",
    icon: "target",
    theme: 3,
    words: ["work", "career", "job", "focus", "project", "business", "startup", "productiv", "freelanc", "client", "launch", "deadline", "balance"],
    identity: "I'm becoming someone who finishes what they start.",
    whyHint: "I want my effort to add up to something real.",
    titleHint: "Finish my most important project",
    actions: [
      { name: "One deep work block of 45 minutes", target: 5 },
      { name: "Plan tomorrow tonight", target: 5 },
      { name: "Phone away for one hour", target: 5 },
      { name: "Clear the inbox", target: 3 },
    ],
  },
  {
    key: "calm",
    label: "Calm & sleep",
    blurb: "Rest, routines, a quieter mind",
    icon: "leaf",
    theme: 5,
    words: ["calm", "sleep", "meditat", "stress", "mind", "peace", "pray", "gratitude", "relax", "routine", "habit", "quit", "screen", "rest"],
    identity: "I'm becoming someone who protects their peace.",
    whyHint: "I want to wake up rested and steady.",
    titleHint: "Build a calmer evening routine",
    actions: [
      { name: "Breathe slowly for 5 minutes", target: 7 },
      { name: "Write down 3 good things", target: 5 },
      { name: "Screen-free hour before bed", target: 5 },
      { name: "Short walk outside", target: 4 },
    ],
  },
  {
    key: "people",
    label: "People",
    blurb: "Family, friends, relationships",
    icon: "users",
    theme: 4,
    words: ["friend", "family", "relationship", "love", "social", "partner", "connect", "parent", "mother", "father", "marriage", "kind", "people"],
    identity: "I'm becoming someone who shows up for the people who matter.",
    whyHint: "I want the people I love to feel it.",
    titleHint: "Be more present with my people",
    actions: [
      { name: "Message someone I care about", target: 5 },
      { name: "Call family", target: 2 },
      { name: "Do one kind thing", target: 4 },
      { name: "Plan a meetup", target: 1 },
    ],
  },
  {
    key: "create",
    label: "Creative",
    blurb: "Write, make, design, perform",
    icon: "pencil",
    theme: 0,
    words: ["write", "music", "art", "draw", "design", "create", "guitar", "piano", "photo", "video", "paint", "sing", "poem", "novel", "blog", "film"],
    identity: "I'm becoming someone who makes things and shares them.",
    whyHint: "I want to turn ideas into finished work.",
    titleHint: "Finish and share my creative project",
    actions: [
      { name: "Create for 20 minutes", target: 5 },
      { name: "Practice the basics", target: 4 },
      { name: "Collect inspiration", target: 3 },
      { name: "Share one piece of work", target: 1 },
    ],
  },
  {
    key: "growth",
    label: "Something else",
    blurb: "Your own kind of goal",
    icon: "spark",
    theme: 0,
    words: [],
    identity: "I'm becoming someone who keeps their promises to themselves.",
    whyHint: "This matters to me because...",
    titleHint: "What are you moving toward?",
    actions: [
      { name: "Take one small step", target: 5 },
      { name: "Reflect for 5 minutes", target: 4 },
      { name: "Plan the week", target: 1 },
    ],
  },
];

export const catByKey = (key: CatKey): Category =>
  CATEGORIES.find((c) => c.key === key) || CATEGORIES[CATEGORIES.length - 1];

export function detectCategory(title: string): Category {
  const text = (title || "").toLowerCase();
  for (const cat of CATEGORIES) {
    if (!cat.words.length) continue;
    for (const word of cat.words) {
      if (new RegExp("\\b" + word).test(text)) return cat;
    }
  }
  return catByKey("growth");
}

export function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function themeFor(cat: Category, title: string): Theme {
  if (cat.key === "growth") return THEMES[hashString(title) % THEMES.length];
  return THEMES[cat.theme % THEMES.length];
}

/* ---------- dates ---------- */

const pad = (n: number) => String(n).padStart(2, "0");
export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseKey = (k: string) =>
  new Date(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, Number(k.slice(8, 10)));
export const addDays = (d: Date, n: number) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
};
export const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const mondayOf = (d: Date) => {
  const x = startOfDay(d);
  const wd = x.getDay();
  x.setDate(x.getDate() - (wd === 0 ? 6 : wd - 1));
  return x;
};
export const dayDiff = (a: Date, b: Date) =>
  Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);
export const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

export const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function streakOf(days: Set<string>, today: Date): number {
  let d = startOfDay(today);
  if (!days.has(dateKey(d))) d = addDays(d, -1);
  let n = 0;
  while (days.has(dateKey(d))) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

function bestOf(days: Set<string>): number {
  const keys = Array.from(days).sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of keys) {
    const d = parseKey(k);
    if (prev && dayDiff(d, prev) === 1) run++;
    else run = 1;
    if (run > best) best = run;
    prev = d;
  }
  return best;
}

/** True when the person came back after missing three or more days in a row. */
function hasComeback(days: Set<string>): boolean {
  const keys = Array.from(days).sort();
  for (let i = 1; i < keys.length; i++) {
    if (dayDiff(parseKey(keys[i]), parseKey(keys[i - 1])) >= 4) return true;
  }
  return false;
}

/* ---------- per-goal stats ---------- */

export type Status = "empty" | "fresh" | "track" | "nudge" | "done";
export const STATUS_LABEL: Record<Status, string> = {
  empty: "Add an action",
  fresh: "Fresh start",
  track: "On track",
  nudge: "Needs a nudge",
  done: "Week complete",
};

export type ActionStat = {
  action: ActionRow;
  target: number;
  doneWeek: number;
  doneToday: boolean;
  week: boolean[];
};

export type GoalStat = {
  goal: GoalRow;
  cat: Category;
  theme: Theme;
  actions: ActionStat[];
  targetTotal: number;
  doneTotal: number;
  progress: number;
  streak: number;
  best: number;
  totalDone: number;
  doneToday: number;
  status: Status;
  heat: number[][];
  byWeekday: number[];
  countdown: CountdownRow | null;
  daysLeft: number | null;
};

export function computeStats(
  goals: GoalRow[],
  actions: ActionRow[],
  countdowns: CountdownRow[],
  nowDate: Date = new Date(),
): GoalStat[] {
  const today = startOfDay(nowDate);
  const todayKey = dateKey(today);
  const monday = mondayOf(today);
  const weekKeys = Array.from({ length: 7 }, (_, i) => dateKey(addDays(monday, i)));
  const dayIdx = dayDiff(today, monday);

  return goals.map((goal) => {
    const mine = actions.filter((a) => a.goal_id === goal.id);
    const cat = detectCategory(goal.title);
    const theme = themeFor(cat, goal.title);
    const days = new Set<string>();
    const byWeekday = [0, 0, 0, 0, 0, 0, 0];
    let totalDone = 0;

    const aStats: ActionStat[] = mine.map((a) => {
      const set = new Set<string>(a.completions || []);
      set.forEach((k) => {
        days.add(k);
        totalDone++;
        byWeekday[(parseKey(k).getDay() + 6) % 7]++;
      });
      const week = weekKeys.map((k) => set.has(k));
      const target = clamp(Number(a.weekly_target) || 1, 1, 7);
      return {
        action: a,
        target,
        doneWeek: week.filter(Boolean).length,
        doneToday: set.has(todayKey),
        week,
      };
    });

    const targetTotal = aStats.reduce((s, a) => s + a.target, 0);
    const doneTotal = aStats.reduce((s, a) => s + Math.min(a.doneWeek, a.target), 0);
    const progress = targetTotal ? doneTotal / targetTotal : 0;

    const ageDays = goal.created_at
      ? Math.max(0, (nowDate.getTime() - Date.parse(goal.created_at)) / 86400000)
      : 0;
    let status: Status;
    if (!mine.length) status = "empty";
    else if (targetTotal > 0 && doneTotal >= targetTotal) status = "done";
    else if (totalDone === 0 && ageDays <= 3) status = "fresh";
    else if (totalDone === 0) status = "nudge";
    else status = progress >= ((dayIdx + 1) / 7) * 0.75 ? "track" : "nudge";

    const heat = Array.from({ length: 12 }, (_, w) => {
      const weekStart = addDays(monday, -7 * (11 - w));
      return Array.from({ length: 7 }, (_, d) => {
        const day = addDays(weekStart, d);
        if (day.getTime() > today.getTime()) return -1;
        const k = dateKey(day);
        const count = mine.filter((a) => (a.completions || []).includes(k)).length;
        return mine.length ? count / mine.length : 0;
      });
    });

    const countdown = goal.countdown_id
      ? countdowns.find((c) => c.id === goal.countdown_id) || null
      : null;
    const daysLeft = countdown
      ? Math.ceil((new Date(countdown.target_at).getTime() - nowDate.getTime()) / 86400000)
      : null;

    return {
      goal,
      cat,
      theme,
      actions: aStats,
      targetTotal,
      doneTotal,
      progress,
      streak: streakOf(days, today),
      best: bestOf(days),
      totalDone,
      doneToday: aStats.filter((a) => a.doneToday).length,
      status,
      heat,
      byWeekday,
      countdown,
      daysLeft,
    };
  });
}

/* ---------- overall stats ---------- */

export type Overall = {
  progress: number;
  remaining: number;
  targetTotal: number;
  doneTotal: number;
  streak: number;
  best: number;
  totalCompletions: number;
  doneToday: number;
  actionsCount: number;
  pulse: number[];
  pulseMax: number;
  todayIdx: number;
  weekdayTotals: number[];
  last4Weeks: number[];
  perfectWeek: boolean;
  comeback: boolean;
};

export function computeOverall(
  stats: GoalStat[],
  actions: ActionRow[],
  nowDate: Date = new Date(),
): Overall {
  const today = startOfDay(nowDate);
  const monday = mondayOf(today);
  const weekKeys = Array.from({ length: 7 }, (_, i) => dateKey(addDays(monday, i)));
  const allDays = new Set<string>();
  actions.forEach((a) => (a.completions || []).forEach((k) => allDays.add(k)));

  const pulse = weekKeys.map(
    (k) => actions.filter((a) => (a.completions || []).includes(k)).length,
  );
  const targetTotal = stats.reduce((s, g) => s + g.targetTotal, 0);
  const doneTotal = stats.reduce((s, g) => s + g.doneTotal, 0);
  const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
  stats.forEach((g) => g.byWeekday.forEach((n, i) => (weekdayTotals[i] += n)));

  const last4Weeks = [3, 2, 1, 0].map((back) => {
    const start = addDays(monday, -7 * back);
    let count = 0;
    for (let d = 0; d < 7; d++) {
      const k = dateKey(addDays(start, d));
      count += actions.filter((a) => (a.completions || []).includes(k)).length;
    }
    return count;
  });

  return {
    progress: targetTotal ? doneTotal / targetTotal : 0,
    remaining: Math.max(0, targetTotal - doneTotal),
    targetTotal,
    doneTotal,
    streak: streakOf(allDays, today),
    best: bestOf(allDays),
    totalCompletions: stats.reduce((s, g) => s + g.totalDone, 0),
    doneToday: stats.reduce((s, g) => s + g.doneToday, 0),
    actionsCount: actions.length,
    pulse,
    pulseMax: Math.max(1, ...pulse),
    todayIdx: dayDiff(today, monday),
    weekdayTotals,
    last4Weeks,
    perfectWeek: stats.some((g) => g.status === "done"),
    comeback: hasComeback(allDays),
  };
}

/* ---------- next best step ---------- */

export type NextStep = { stat: GoalStat; item: ActionStat; need: number; daysLeft: number } | null;

export function pickNextStep(stats: GoalStat[], nowDate: Date = new Date()): NextStep {
  const today = startOfDay(nowDate);
  const dayIdx = dayDiff(today, mondayOf(today));
  const daysLeft = 7 - dayIdx;
  let best: NextStep = null;
  let bestScore = -1;
  for (const stat of stats) {
    for (const item of stat.actions) {
      if (item.doneToday || item.doneWeek >= item.target) continue;
      const need = item.target - item.doneWeek;
      const score = need / Math.max(1, daysLeft) + (1 - stat.progress) * 0.05;
      if (score > bestScore) {
        bestScore = score;
        best = { stat, item, need, daysLeft };
      }
    }
  }
  return best;
}

/* ---------- badges ---------- */

export type Badge = {
  id: string;
  label: string;
  /** What this milestone is for, shown once it is earned. */
  hint: string;
  /** A plain instruction for unlocking it, shown while it is locked. */
  howTo: string;
  icon: IconName;
  a: string;
  b: string;
  unlocked: boolean;
  progress: string;
  value: number;
  need: number;
  /** 0 to 1, how close this milestone is to unlocking. */
  pct: number;
};

/** Signals that do not come from goals and actions. */
export type BadgeExtras = {
  checkinCount?: number;
  earlyBird?: boolean;
  voiceUsed?: boolean;
};

export function computeBadges(
  stats: GoalStat[],
  overall: Overall,
  extras: BadgeExtras = {},
): Badge[] {
  const goalsCount = stats.length;
  const identities = stats.filter((s) => (s.goal.identity || "").trim()).length;
  const total = overall.totalCompletions;
  const best = overall.best;
  const make = (
    id: string,
    label: string,
    hint: string,
    howTo: string,
    icon: IconName,
    a: string,
    b: string,
    value: number,
    need: number,
    unit: string,
  ): Badge => ({
    id,
    label,
    hint,
    howTo,
    icon,
    a,
    b,
    unlocked: value >= need,
    progress: value >= need ? "Unlocked" : `${Math.min(value, need)} of ${need} ${unit}`,
    value: Math.min(value, need),
    need,
    pct: need > 0 ? Math.min(1, value / need) : 0,
  });
  return [
    make("first", "First step", "Completed your first action", "Complete any action", "check", "#4F8A68", "#8FC4A2", total, 1, "action"),
    make("warm", "Warming up", "Kept a 3-day streak", "Do something three days in a row", "flame", "#DB6A33", "#F2AE5A", best, 3, "days"),
    make("fire", "On fire", "Kept a 7-day streak", "Do something seven days in a row", "bolt", "#C25577", "#F096B0", best, 7, "days"),
    make("fortnight", "Two weeks in", "Kept a 14-day streak", "Keep a streak going for 14 days", "flame", "#C2492F", "#EE8A5E", best, 14, "days"),
    make("month", "Unbroken month", "Kept a 30-day streak", "Keep a streak going for 30 days", "trophy", "#8A4FB8", "#C79BEA", best, 30, "days"),
    make("ten", "Ten strong", "Completed 10 actions", "Complete 10 actions in total", "star", "#3A74B8", "#74B9E8", total, 10, "actions"),
    make("fifty", "Half a hundred", "Completed 50 actions", "Complete 50 actions in total", "trophy", "#B98421", "#E8BE52", total, 50, "actions"),
    make("week", "Perfect week", "Hit every target on one goal", "Hit every target on one goal in a week", "target", "#7156C0", "#AE92EE", overall.perfectWeek ? 1 : 0, 1, "week"),
    make("three", "Big picture", "Holding three goals", "Add up to three goals", "spark", "#26867F", "#6ECDBE", goalsCount, 3, "goals"),
    make("who", "Identity set", "Wrote who you are becoming", "Write who you are becoming on a goal", "quote", "#7156C0", "#AE92EE", identities, 1, "goal"),
    make("comeback", "Comeback", "Returned after a break", "Come back after missing 3 days or more", "refresh", "#3F8F9E", "#82CBD6", overall.comeback ? 1 : 0, 1, "return"),
    make("reflector", "Reflector", "Saved 7 check-ins", "Save 7 evening check-ins", "journal", "#5C7FBF", "#9DB8EA", extras.checkinCount ?? 0, 7, "check-ins"),
    make("early", "Early bird", "Finished something before 9 AM", "Complete an action or task before 9 AM", "sun", "#D69A22", "#F5D071", extras.earlyBird ? 1 : 0, 1, "morning"),
    make("voice", "Found your voice", "Talked with your voice coach", "Have a conversation with the voice coach", "mic", "#B8527A", "#EC9AB9", extras.voiceUsed ? 1 : 0, 1, "chat"),
  ];
}

/* ---------- small formatters ---------- */

export function formatLeft(days: number | null): string {
  if (days === null) return "";
  if (days < 0) return "Date passed";
  if (days === 0) return "Today";
  if (days === 1) return "1 day left";
  if (days >= 730) return `${Math.round((days / 365) * 10) / 10} years left`;
  if (days >= 90) return `${Math.round(days / 30)} months left`;
  return `${days} days left`;
}

export function encouragement(
  goalsCount: number,
  overall: Overall,
): string {
  if (goalsCount === 0) return "Your first goal is one tap away.";
  if (overall.actionsCount === 0) return "Add a small daily action to light up your rings.";
  if (overall.progress >= 1) return "Every target hit this week. That is real momentum.";
  const n = overall.remaining;
  const word = n === 1 ? "action" : "actions";
  if (overall.doneToday === 0) return `${n} ${word} to close your week. Start with one.`;
  return `${overall.doneToday} done today. ${n} ${word} to close your week.`;
}

export function titleCase(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}
