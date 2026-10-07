// Pure logic for the Today countdown card. No React and no network, so it is easy to test.

export type CountdownItem = {
  id: string;
  title: string;
  target_at: string;
  created_at?: string | null;
  is_featured?: boolean;
};

export type Parts = {
  passed: boolean;
  /** Whole days left (24h blocks). This is the big number on the card. */
  totalDays: number;
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const DAY = 86400000;

/** Add whole months to a date, clamping the day (31 Jan + 1 month = 28/29 Feb). */
function addMonths(d: Date, months: number): Date {
  const out = new Date(d.getTime());
  const day = out.getDate();
  out.setDate(1);
  out.setMonth(out.getMonth() + months);
  const last = new Date(out.getFullYear(), out.getMonth() + 1, 0).getDate();
  out.setDate(Math.min(day, last));
  return out;
}

export function partsBetween(nowMs: number, targetMs: number): Parts {
  const remaining = targetMs - nowMs;
  if (!(remaining > 0)) {
    return { passed: true, totalDays: 0, years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  const now = new Date(nowMs);
  const target = new Date(targetMs);

  // Largest whole number of months that still fits before the target.
  let months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  while (months > 0 && addMonths(now, months).getTime() > targetMs) months -= 1;
  while (months < 0) months += 1;
  const anchor = addMonths(now, months);
  const rest = targetMs - anchor.getTime();

  const days = Math.floor(rest / DAY);
  const afterDays = rest - days * DAY;
  const hours = Math.floor(afterDays / 3600000);
  const minutes = Math.floor((afterDays % 3600000) / 60000);
  const seconds = Math.floor((afterDays % 60000) / 1000);

  return {
    passed: false,
    totalDays: Math.floor(remaining / DAY),
    years: Math.floor(months / 12),
    months: months % 12,
    days,
    hours,
    minutes,
    seconds,
  };
}

/** How much of the whole period has passed, 0 to 1. Null if we cannot tell. */
export function periodProgress(createdAt: string | null | undefined, targetAt: string, nowMs: number): number | null {
  if (!createdAt) return null;
  const start = new Date(createdAt).getTime();
  const end = new Date(targetAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return Math.min(1, Math.max(0, (nowMs - start) / (end - start)));
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "1 year, 1 month, 17 days". On the last day it counts hours and minutes instead. */
export function longLabel(p: Parts): string {
  if (p.passed) return "Done";
  const bits: string[] = [];
  if (p.years) bits.push(plural(p.years, "year"));
  if (p.months) bits.push(plural(p.months, "month"));
  if (p.days) bits.push(plural(p.days, "day"));
  if (bits.length === 0) {
    if (p.hours) bits.push(plural(p.hours, "hour"));
    if (p.minutes) bits.push(plural(p.minutes, "minute"));
  }
  return bits.length ? bits.join(", ") : "Less than a minute";
}

/** The big number on the card: days, then hours on the last day, then minutes in the last hour. */
export function heroOf(p: Parts): { value: number; label: string } {
  if (p.totalDays >= 1) return { value: p.totalDays, label: p.totalDays === 1 ? "day to go" : "days to go" };
  if (p.hours >= 1) return { value: p.hours, label: p.hours === 1 ? "hour to go" : "hours to go" };
  return { value: p.minutes, label: p.minutes === 1 ? "minute to go" : "minutes to go" };
}

export const pad2 = (n: number) => String(n).padStart(2, "0");

/** Featured ones first (nearest date first), then the rest, nearest date first. */
export function orderCountdowns<T extends CountdownItem>(list: T[]): T[] {
  const byDate = (a: T, b: T) => new Date(a.target_at).getTime() - new Date(b.target_at).getTime();
  const featured = list.filter((c) => c.is_featured).sort(byDate);
  const rest = list.filter((c) => !c.is_featured).sort(byDate);
  return [...featured, ...rest];
}

/** Position of the 60-second ring, 0 to 1, from the real clock. */
export function secondFraction(nowMs: number): number {
  return (nowMs % 60000) / 60000;
}
