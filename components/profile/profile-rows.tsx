"use client";

import { ChevronRight, FileText, Info, Lock, SlidersHorizontal, Timer } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { periodProgress } from "@/lib/countdown-stats";
import { formatClock, type Preferences } from "@/lib/preferences";

type Countdown = { id: string; title: string; target_at: string; created_at?: string | null; is_featured?: boolean };
type Checkin = { checkin_date: string; mood: number };
type Screen = "home" | "countdowns" | "history" | "preferences" | "privacy" | "about";

const MOODS = ["😔", "😕", "😐", "🙂", "😊"];
const DAY_MS = 86_400_000;

const key = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function Row({
  icon: Icon,
  accent,
  title,
  detail,
  onClick,
  dot,
  trailing,
}: {
  icon: typeof Timer;
  accent: string;
  title: string;
  detail: ReactNode;
  onClick: () => void;
  dot?: boolean;
  trailing?: ReactNode;
}) {
  return (
    <button type="button" className="profile-menu" style={{ "--row": accent } as CSSProperties} onClick={onClick}>
      <span className="profile-menu-icon">
        <Icon />
        {dot && <i className="profile-dot" aria-label="Not done today" />}
      </span>
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      {trailing}
      <ChevronRight className="profile-chevron" aria-hidden="true" />
    </button>
  );
}

function TinyRing({ pct, color }: { pct: number; color: string }) {
  const r = 11;
  const c = 2 * Math.PI * r;
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true" style={{ flex: "0 0 auto", transform: "rotate(-90deg)" }}>
      <circle cx="15" cy="15" r={r} fill="none" stroke={`color-mix(in srgb, ${color} 22%, transparent)`} strokeWidth="3.5" />
      <circle cx="15" cy="15" r={r} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
    </svg>
  );
}

export function daysUntil(targetIso: string, now = Date.now()): number {
  return Math.ceil((new Date(targetIso).getTime() - now) / DAY_MS);
}

export function daysLeftLabel(days: number): string {
  if (days < 0) return "Date passed";
  if (days === 0) return "Today";
  return `${days} ${days === 1 ? "day" : "days"} left`;
}

export function ProfileRows({
  countdowns,
  checkins,
  preferences,
  setScreen,
  onAddCountdown,
}: {
  countdowns: Countdown[];
  checkins: Checkin[];
  preferences: Preferences;
  setScreen: (screen: Screen) => void;
  onAddCountdown: () => void;
}) {
  const now = Date.now();
  const valid = countdowns.filter((c) => c?.target_at && !Number.isNaN(new Date(c.target_at).getTime()));
  const upcoming = valid
    .filter((c) => new Date(c.target_at).getTime() >= now - DAY_MS)
    .sort((a, b) => new Date(a.target_at).getTime() - new Date(b.target_at).getTime());
  const nearest = upcoming[0];

  let countdownDetail: ReactNode = "Add a date to move toward";
  let ring: ReactNode = null;
  if (nearest) {
    const days = daysUntil(nearest.target_at, now);
    const more = valid.length - 1;
    countdownDetail = `${nearest.title} · ${daysLeftLabel(days)}${more > 0 ? ` · +${more} more` : ""}`;
    const pct = periodProgress(nearest.created_at, nearest.target_at, now);
    if (pct !== null) ring = <TinyRing pct={pct} color="#D69A22" />;
  } else if (valid.length > 0) {
    countdownDetail = `${valid.length} ${valid.length === 1 ? "date has" : "dates have"} passed`;
  }

  const todayKey = key(new Date());
  const byDate = new Map(checkins.map((c) => [c.checkin_date, c]));
  const doneToday = byDate.has(todayKey);
  const strip = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return byDate.get(key(d)) ?? null;
  });
  const historyDetail: ReactNode =
    checkins.length === 0 ? (
      "Your first reflection starts tonight."
    ) : (
      <span className="profile-strip" aria-label="Moods from the last 7 days">
        {strip.map((entry, i) => (
          <span key={i} data-empty={!entry}>
            {entry ? MOODS[Math.max(0, Math.min(4, entry.mood - 1))] : ""}
          </span>
        ))}
      </span>
    );

  const reminders = preferences.reminderEnabled
    ? `reminders ${formatClock(preferences.morningReminder)}, ${formatClock(preferences.eveningReminder)}`
    : "reminders off";

  return (
    <>
      <section className="profile-group">
        <h2 className="profile-group-title">Your data</h2>
        <Row
          icon={Timer}
          accent="#D69A22"
          title="Countdowns"
          detail={countdownDetail}
          trailing={ring}
          onClick={() => (valid.length === 0 ? onAddCountdown() : setScreen("countdowns"))}
        />
        <Row icon={FileText} accent="#5C7FBF" title="Reflection history" detail={historyDetail} dot={!doneToday} onClick={() => setScreen("history")} />
      </section>
      <section className="profile-group">
        <h2 className="profile-group-title">Settings</h2>
        <Row icon={SlidersHorizontal} accent="#8A6FD0" title="Preferences" detail={`${preferences.theme} · ${reminders}`} onClick={() => setScreen("preferences")} />
        <Row icon={Lock} accent="#C25577" title="Privacy & security" detail="Export or delete your data" onClick={() => setScreen("privacy")} />
      </section>
      <section className="profile-group">
        <h2 className="profile-group-title">About</h2>
        <Row icon={Info} accent="#26867F" title="About Small Steps" detail="A quieter way to grow" onClick={() => setScreen("about")} />
      </section>
    </>
  );
}
