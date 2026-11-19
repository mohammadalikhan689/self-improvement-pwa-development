// Device-local milestone memory: when each one was earned, plus a few signals
// (early bird, voice coach) that the database does not record.

const earnedKey = (userId: string) => `small-steps-earned-${userId}`;
const seenKey = (userId: string) => `small-steps-badges-${userId}`; // legacy list of ids
const eventKey = (userId: string, event: MilestoneEvent) => `small-steps-event-${event}-${userId}`;

export type MilestoneEvent = "early" | "voice";

export function readEarned(userId: string): Record<string, string> | null {
  try {
    const raw = window.localStorage.getItem(earnedKey(userId));
    if (raw) return JSON.parse(raw) as Record<string, string>;
    // First run of this version: carry over the ids the old toast logic had seen.
    const legacy = window.localStorage.getItem(seenKey(userId));
    if (legacy) {
      const ids = JSON.parse(legacy) as string[];
      const map: Record<string, string> = {};
      ids.forEach((id) => (map[id] = new Date().toISOString()));
      return map;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function writeEarned(userId: string, map: Record<string, string>) {
  try {
    window.localStorage.setItem(earnedKey(userId), JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function recordEvent(userId: string | undefined | null, event: MilestoneEvent) {
  if (!userId) return;
  try {
    window.localStorage.setItem(eventKey(userId, event), "1");
  } catch {
    /* ignore */
  }
}

export function hasEvent(userId: string | undefined | null, event: MilestoneEvent): boolean {
  if (!userId) return false;
  try {
    return window.localStorage.getItem(eventKey(userId, event)) === "1";
  } catch {
    return false;
  }
}

/** Call when an action or task is completed. */
export function noteCompletion(userId: string | undefined | null, when = new Date()) {
  if (when.getHours() < 9) recordEvent(userId, "early");
}

export function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
