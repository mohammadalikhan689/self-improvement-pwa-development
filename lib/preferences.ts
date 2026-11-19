// Per-device preferences, kept in localStorage.

export type ThemePref = "System" | "Light" | "Dark";

export type Preferences = {
  theme: ThemePref;
  morningReminder: string; // "HH:MM" in 24h
  eveningReminder: string;
  reminderEnabled: boolean;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  weekStarts: "Monday" | "Sunday";
  voiceCoach: boolean;
  voiceConsent: boolean;
  haptics: boolean;
  animations: boolean;
};

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "System",
  morningReminder: "08:00",
  eveningReminder: "20:00",
  reminderEnabled: true,
  quietHoursEnabled: false,
  quietStart: "22:00",
  quietEnd: "07:00",
  weekStarts: "Monday",
  voiceCoach: true,
  voiceConsent: false,
  haptics: true,
  animations: true,
};

export const PREFERENCES_KEY = "small-steps-preferences";
export const THEME_KEY = "small-steps-theme";

/** Reads saved preferences. Older saves used `reminderTime` for a single reminder. */
export function loadPreferences(): Preferences {
  const prefs = { ...DEFAULT_PREFERENCES };
  try {
    const raw = window.localStorage.getItem(PREFERENCES_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Preferences> & { reminderTime?: string };
      Object.assign(prefs, saved);
      if (saved.reminderTime && !saved.morningReminder) prefs.morningReminder = saved.reminderTime;
    }
    // The header toggle used to write its own key.
    const legacyTheme = window.localStorage.getItem(THEME_KEY);
    const stored = raw ? (JSON.parse(raw) as Partial<Preferences>) : {};
    if (!stored.theme && (legacyTheme === "dark" || legacyTheme === "light")) {
      prefs.theme = legacyTheme === "dark" ? "Dark" : "Light";
    }
  } catch {
    /* ignore malformed or unavailable storage */
  }
  return prefs;
}

export function savePreferences(prefs: Preferences) {
  try {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
  } catch {
    /* storage may be unavailable */
  }
}

export function resolveDark(theme: ThemePref): boolean {
  if (theme === "Dark") return true;
  if (theme === "Light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** "20:00" becomes "8:00 PM". */
export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Half-hour steps between two hours, used by time pickers. */
export function timeOptions(fromHour: number, toHour: number): string[] {
  const out: string[] = [];
  for (let h = fromHour; h <= toHour; h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
    if (h !== toHour) out.push(`${String(h).padStart(2, "0")}:30`);
  }
  return out;
}

export function buzz(prefs: Pick<Preferences, "haptics">, pattern: number | number[] = 20) {
  if (!prefs.haptics) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
}
