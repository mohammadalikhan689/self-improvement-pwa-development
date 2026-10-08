// Pure logic for Today's plan: one list that merges goal actions and one-off tasks.
// No React and no network, so it is easy to test.

import { dateKey, detectCategory, mondayOf, themeFor, type Theme } from "./goal-stats";

export type Priority = "low" | "mid" | "high" | "urgent";

export type TaskLite = {
  id: string;
  title: string;
  goal_id: string | null;
  due_at: string | null;
  completed_at: string | null;
  description?: string | null;
  priority: Priority;
};
export type ActionLite = {
  id: string;
  name: string;
  goal_id: string;
  weekly_target: number;
  completions: string[];
};
export type GoalLite = { id: string; title: string };

export type PlanItem<T extends TaskLite = TaskLite, A extends ActionLite = ActionLite> =
  | {
      kind: "task";
      id: string;
      title: string;
      goalId: string | null;
      priority: Priority;
      dueAt: string | null;
      done: boolean;
      doneAt: string | null;
      hasNotes: boolean;
      overdue: boolean;
      raw: T;
    }
  | {
      kind: "action";
      id: string;
      title: string;
      goalId: string;
      done: boolean;
      /** Times ticked so far this week (Monday to today). */
      weekCount: number;
      target: number;
      /** Ticks still needed this week. */
      remaining: number;
      /** The days left this week are all needed to reach the target. */
      mustDo: boolean;
      raw: A;
    };

const RANK: Record<Priority, number> = { urgent: 0, high: 1, mid: 2, low: 3 };

/** Days left in this week including today. Monday = 7, Sunday = 1. */
export function daysLeftInWeek(now: Date): number {
  const idx = (now.getDay() + 6) % 7; // Monday = 0
  return 7 - idx;
}

/**
 * Where an action stands this week. It is shown while it still needs ticks,
 * and stays visible (as done) on the day it was ticked.
 */
export function actionStatus(a: ActionLite, now: Date) {
  const today = dateKey(now);
  const monday = dateKey(mondayOf(now));
  const target = Math.min(7, Math.max(1, Math.round(a.weekly_target || 1)));
  const doneToday = a.completions.includes(today);
  const unique = new Set(a.completions.filter((d) => d >= monday && d <= today));
  const weekCount = unique.size;
  const remaining = Math.max(0, target - weekCount);
  const mustDo = !doneToday && remaining > 0 && remaining >= daysLeftInWeek(now);
  const show = doneToday || remaining > 0;
  return { show, doneToday, weekCount, target, remaining, mustDo };
}

export function isOverdue(t: Pick<TaskLite, "due_at" | "completed_at">, nowMs: number): boolean {
  return !t.completed_at && !!t.due_at && new Date(t.due_at).getTime() < nowMs;
}

/** Lower number = comes first. */
function rankOf(item: PlanItem): number {
  if (item.kind === "task") return item.overdue ? 0 : 2 + RANK[item.priority];
  return item.mustDo ? 1 : 4.5;
}

const dueMs = (item: PlanItem) => (item.kind === "task" && item.dueAt ? new Date(item.dueAt).getTime() : Infinity);

/** Everything for today, undone first in the order you should do it, done last. */
export function buildPlan<T extends TaskLite, A extends ActionLite>(tasks: T[], actions: A[], now: Date): PlanItem<T, A>[] {
  const nowMs = now.getTime();
  const items: PlanItem<T, A>[] = [];
  for (const t of tasks) {
    items.push({
      kind: "task",
      id: t.id,
      title: t.title,
      goalId: t.goal_id,
      priority: t.priority || "mid",
      dueAt: t.due_at,
      done: Boolean(t.completed_at),
      doneAt: t.completed_at,
      hasNotes: Boolean(t.description && t.description.trim()),
      overdue: isOverdue(t, nowMs),
      raw: t,
    });
  }
  for (const a of actions) {
    const s = actionStatus(a, now);
    if (!s.show) continue;
    items.push({
      kind: "action",
      id: a.id,
      title: a.name,
      goalId: a.goal_id,
      done: s.doneToday,
      weekCount: s.weekCount,
      target: s.target,
      remaining: s.remaining,
      mustDo: s.mustDo,
      raw: a,
    });
  }
  const order = new Map(items.map((it, i) => [it, i]));
  return items.sort((x, y) => {
    if (x.done !== y.done) return x.done ? 1 : -1;
    if (x.done && y.done) {
      const dx = x.kind === "task" && x.doneAt ? new Date(x.doneAt).getTime() : -1;
      const dy = y.kind === "task" && y.doneAt ? new Date(y.doneAt).getTime() : -1;
      return dy - dx || (order.get(x) as number) - (order.get(y) as number);
    }
    return rankOf(x) - rankOf(y) || dueMs(x) - dueMs(y) || (order.get(x) as number) - (order.get(y) as number);
  });
}

export type Score = { done: number; total: number; pct: number; overdue: number; mustDo: number; complete: boolean };

export function planScore(items: PlanItem[]): Score {
  const total = items.length;
  const done = items.filter((i) => i.done).length;
  return {
    done,
    total,
    pct: total ? done / total : 0,
    overdue: items.filter((i) => i.kind === "task" && i.overdue).length,
    mustDo: items.filter((i) => i.kind === "action" && i.mustDo).length,
    complete: total > 0 && done === total,
  };
}

/** The one thing to do next, for focus mode. */
export function focusPick<T extends PlanItem>(items: T[]): T | null {
  return items.find((i) => !i.done) ?? null;
}

/** One line under the heading. */
export function planLine(s: Score): string {
  if (s.total === 0) return "Nothing planned yet. Add one small step.";
  if (s.complete) return "Everything done. Well earned.";
  const bits: string[] = [];
  if (s.overdue) bits.push(`${s.overdue} overdue`);
  if (s.mustDo) bits.push(`${s.mustDo} must-do today`);
  const left = s.total - s.done;
  if (!bits.length) bits.push(`${left} ${left === 1 ? "step" : "steps"} to go`);
  return bits.join(" · ");
}

export type DueTone = "overdue" | "urgent" | "soon" | "ok";

/** "2h 10m left", "Overdue by 5m", with a tone for colouring. */
export function dueLabel(dueAt: string, nowMs: number): { text: string; tone: DueTone } {
  const sec = Math.floor((new Date(dueAt).getTime() - nowMs) / 1000);
  if (sec < 0) {
    const m = Math.max(1, Math.floor(-sec / 60));
    return { text: m >= 60 ? `Overdue by ${Math.floor(m / 60)}h ${m % 60}m` : `Overdue by ${m}m`, tone: "overdue" };
  }
  const tone: DueTone = sec < 1800 ? "urgent" : sec < 7200 ? "soon" : "ok";
  if (sec < 3600) return { text: `${Math.floor(sec / 60)}m left`, tone };
  return { text: `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m left`, tone };
}

/** Each goal's colours, the same ones the Goals tab uses, so a goal looks the same in both places. */
export function goalThemes(goals: GoalLite[]): Record<string, Theme> {
  const out: Record<string, Theme> = {};
  for (const g of goals) out[g.id] = themeFor(detectCategory(g.title), g.title);
  return out;
}

/** "2 of 5 this week", "Must do today", or "Done for the week". */
export function actionNote(i: Extract<PlanItem, { kind: "action" }>): string {
  if (i.done) return i.remaining === 0 ? `Done for the week · ${i.weekCount} of ${i.target}` : `${i.weekCount} of ${i.target} this week`;
  if (i.mustDo) return `Must do today · ${i.weekCount} of ${i.target} this week`;
  return `${i.weekCount} of ${i.target} this week`;
}
