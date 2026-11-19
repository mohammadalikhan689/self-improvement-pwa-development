"use client";

import { useState } from "react";
import { ChevronLeft, Info, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { APP_NAME, APP_VERSION, SUPPORT_EMAIL } from "@/lib/app-info";
import { formatClock, timeOptions, type Preferences } from "@/lib/preferences";
import { GroupCard, Segmented, SwitchRow, TimeRow } from "./controls";
import { daysLeftLabel, daysUntil } from "./profile-rows";

type Countdown = { id: string; title: string; target_at: string; created_at?: string | null; is_featured?: boolean };
type Checkin = {
  id: string;
  checkin_date: string;
  mood: number;
  win: string | null;
  improve: string | null;
  tomorrow_priority?: string | null;
  ai_reflection?: string | null;
  daily_thought?: string | null;
};
export type ProfileScreenName = "home" | "countdowns" | "history" | "preferences" | "privacy" | "about";

const MOODS = ["😔", "😕", "😐", "🙂", "😊"];
const TITLES: Record<string, string> = {
  countdowns: "Countdowns",
  history: "Reflection history",
  preferences: "Preferences",
  privacy: "Privacy & security",
  about: "About Small Steps",
};

function Back({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
        <ChevronLeft />
      </Button>
      <h1 className="text-2xl font-semibold">{title}</h1>
    </div>
  );
}

/* ------------------------------ countdowns ------------------------------ */

function CountdownsScreen({
  countdowns,
  onAdd,
  onEdit,
  onDelete,
  onFeature,
}: {
  countdowns: Countdown[];
  onAdd: () => void;
  onEdit: (c: Countdown) => void;
  onDelete: (c: Countdown) => void;
  onFeature: (c: Countdown) => void;
}) {
  const sorted = [...countdowns].sort((a, b) => new Date(a.target_at).getTime() - new Date(b.target_at).getTime());
  return (
    <>
      {sorted.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">No countdowns yet. Add a date worth moving toward.</CardContent>
        </Card>
      )}
      {sorted.map((c) => {
        const valid = c.target_at && !Number.isNaN(new Date(c.target_at).getTime());
        return (
          <div key={c.id} className="flex items-center gap-2 rounded-[1.25rem] border bg-card p-3 pl-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {c.title || "Untitled countdown"}
                {c.is_featured && <Star className="ml-1.5 inline size-3.5 fill-current text-amber-500" aria-label="Featured" />}
              </p>
              <p className="text-sm text-muted-foreground">
                {valid ? `${new Date(c.target_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · ${daysLeftLabel(daysUntil(c.target_at))}` : "Target date not set"}
              </p>
            </div>
            {!c.is_featured && (
              <Button variant="ghost" size="icon" aria-label={`Feature ${c.title}`} onClick={() => onFeature(c)}>
                <Star />
              </Button>
            )}
            <Button variant="ghost" size="icon" aria-label={`Edit ${c.title}`} onClick={() => onEdit(c)}>
              <Pencil />
            </Button>
            <Button variant="ghost" size="icon" aria-label={`Delete ${c.title}`} onClick={() => onDelete(c)}>
              <Trash2 />
            </Button>
          </div>
        );
      })}
      <Button variant="outline" className="h-11" onClick={onAdd}>
        <Plus /> Add countdown
      </Button>
    </>
  );
}

/* -------------------------------- history -------------------------------- */

function HistoryScreen({ checkins }: { checkins: Checkin[] }) {
  const [selected, setSelected] = useState<Checkin | null>(null);
  const rows = [...checkins].sort((a, b) => String(b.checkin_date).localeCompare(String(a.checkin_date)));
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">Your first reflection starts tonight. Check in on the Today tab and it will appear here.</CardContent>
      </Card>
    );
  }
  return (
    <>
      {rows.map((entry) => (
        <button type="button" key={entry.id ?? entry.checkin_date} className="profile-menu" style={{ "--row": "#5C7FBF" } as React.CSSProperties} onClick={() => setSelected(entry)}>
          <span className="text-2xl">{MOODS[Math.max(0, Math.min(4, (entry.mood || 3) - 1))]}</span>
          <span>
            <strong>{entry.checkin_date}</strong>
            <small>
              Proud of: {entry.win || "Not added"}
              <br />
              Challenge: {entry.improve || "Not added"}
            </small>
          </span>
        </button>
      ))}
      {selected && (
        <Card>
          <CardHeader>
            <CardTitle>Complete reflection</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p>{selected.win || "No proud moment added."}</p>
            <p>{selected.improve || "No challenge added."}</p>
            <p className="text-sm text-muted-foreground">{selected.ai_reflection || selected.daily_thought || "No AI reflection or daily thought available."}</p>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}

/* ------------------------------ preferences ------------------------------ */

function PreferencesScreen({ preferences, update }: { preferences: Preferences; update: (patch: Partial<Preferences>) => void }) {
  const morning = timeOptions(5, 11);
  const evening = timeOptions(17, 23);
  const quiet = timeOptions(0, 23);
  return (
    <>
      <GroupCard title="Appearance">
        <Segmented label="Theme" value={preferences.theme} options={["System", "Light", "Dark"] as const} onChange={(theme) => update({ theme })} />
        <SwitchRow label="Animations" checked={preferences.animations} onChange={(animations) => update({ animations })} />
        <SwitchRow label="Haptic feedback" description="A small buzz on milestones" checked={preferences.haptics} onChange={(haptics) => update({ haptics })} />
      </GroupCard>
      <GroupCard title="Reminders">
        <SwitchRow label="Reminders" description="Times are saved on this device" checked={preferences.reminderEnabled} onChange={(reminderEnabled) => update({ reminderEnabled })} />
        <TimeRow label="Morning" value={preferences.morningReminder} options={morning} format={formatClock} disabled={!preferences.reminderEnabled} onChange={(morningReminder) => update({ morningReminder })} />
        <TimeRow label="Evening check-in" value={preferences.eveningReminder} options={evening} format={formatClock} disabled={!preferences.reminderEnabled} onChange={(eveningReminder) => update({ eveningReminder })} />
        <SwitchRow label="Quiet hours" description="No reminders in this window" checked={preferences.quietHoursEnabled} onChange={(quietHoursEnabled) => update({ quietHoursEnabled })} />
        {preferences.quietHoursEnabled && (
          <>
            <TimeRow label="From" value={preferences.quietStart} options={quiet} format={formatClock} onChange={(quietStart) => update({ quietStart })} />
            <TimeRow label="Until" value={preferences.quietEnd} options={quiet} format={formatClock} onChange={(quietEnd) => update({ quietEnd })} />
          </>
        )}
      </GroupCard>
      <GroupCard title="Daily rhythm">
        <Segmented label="Week starts on" value={preferences.weekStarts} options={["Monday", "Sunday"] as const} onChange={(weekStarts) => update({ weekStarts })} />
        <SwitchRow label="Voice coach" description="Show the talk button on Today" checked={preferences.voiceCoach} onChange={(voiceCoach) => update({ voiceCoach })} />
      </GroupCard>
      <p className="px-1 text-xs text-muted-foreground">Preferences save automatically.</p>
    </>
  );
}

/* -------------------------------- privacy -------------------------------- */

const EXPORT_TABLES = ["goals", "habits", "habit_completions", "daily_tasks", "daily_intentions", "checkins", "countdowns"] as const;

function PrivacyScreen({
  user,
  supabase,
  preferences,
  update,
  signOut,
}: {
  user: { id: string; email?: string } | null;
  supabase: any;
  preferences: Preferences;
  update: (patch: Partial<Preferences>) => void;
  signOut: () => Promise<void> | void;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function changePassword() {
    if (password.length < 8) return toast.error("Use at least 8 characters.");
    if (password !== confirmPassword) return toast.error("The two passwords don't match.");
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPassword(false);
    if (error) return toast.error(error.message);
    setPassword("");
    setConfirmPassword("");
    toast.success("Password updated.");
  }

  async function exportData() {
    if (!user) return;
    setExporting(true);
    try {
      const [profile, ...rest] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id),
        ...EXPORT_TABLES.map((table) => supabase.from(table).select("*").eq("user_id", user.id)),
      ]);
      const failed = [profile, ...rest].find((r: any) => r.error);
      if (failed) throw failed.error;
      const data: Record<string, unknown> = { exported_at: new Date().toISOString(), email: user.email, profile: profile.data?.[0] ?? null };
      EXPORT_TABLES.forEach((table, i) => (data[table] = rest[i].data ?? []));
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `small-steps-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Your data was downloaded.");
    } catch (e) {
      toast.error(e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Could not export your data.");
    } finally {
      setExporting(false);
    }
  }

  function closeDelete(open: boolean) {
    if (deleting) return;
    setDeleteOpen(open);
    if (!open) {
      setDeleteStep(1);
      setTyped("");
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Could not delete your account.");
      }
      try {
        Object.keys(window.localStorage)
          .filter((k) => k.startsWith("small-steps-"))
          .forEach((k) => window.localStorage.removeItem(k));
      } catch {
        /* ignore */
      }
      await signOut();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete your account.");
      setDeleting(false);
    }
  }

  return (
    <>
      <GroupCard title="Account">
        <div>
          <p className="text-sm font-medium">Email</p>
          <p className="break-all text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <div className="flex flex-col gap-3">
          <Label htmlFor="new-password" style={{ marginBottom: 0 }}>Change password</Label>
          <Input id="new-password" type="password" autoComplete="new-password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Input aria-label="Confirm new password" type="password" autoComplete="new-password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          <Button variant="outline" className="h-11" disabled={savingPassword || !password} onClick={changePassword}>
            {savingPassword ? "Updating…" : "Update password"}
          </Button>
        </div>
      </GroupCard>
      <GroupCard title="Voice coach">
        <SwitchRow
          label="Voice recording consent"
          description="During a voice call your microphone audio is streamed to our voice provider, Retell, to hear and answer you. Turn this off to stop voice calls."
          checked={preferences.voiceConsent}
          onChange={(voiceConsent) => update({ voiceConsent })}
        />
      </GroupCard>
      <GroupCard title="Your data">
        <p className="text-sm text-muted-foreground">Download everything you've saved in Small Steps as a JSON file.</p>
        <Button variant="outline" className="h-11" disabled={exporting} onClick={exportData}>
          {exporting ? "Preparing…" : "Export my data"}
        </Button>
        <div className="border-t pt-4">
          <p className="text-sm font-medium">Delete account</p>
          <p className="mb-3 text-sm text-muted-foreground">Permanently removes your account, goals, check-ins and countdowns.</p>
          <Button variant="destructive" className="h-11 w-full" onClick={() => setDeleteOpen(true)}>
            Delete my account
          </Button>
        </div>
      </GroupCard>

      <AlertDialog open={deleteOpen} onOpenChange={closeDelete}>
        <AlertDialogContent>
          {deleteStep === 1 ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  Everything is removed for good: goals, actions, check-ins, countdowns and your profile. Consider exporting your data first.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep my account</AlertDialogCancel>
                <Button variant="destructive" onClick={() => setDeleteStep(2)}>
                  Continue
                </Button>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Type DELETE to confirm</AlertDialogTitle>
                <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <Input aria-label="Type DELETE to confirm" autoCapitalize="characters" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="DELETE" />
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <Button variant="destructive" disabled={typed.trim() !== "DELETE" || deleting} onClick={deleteAccount}>
                  {deleting ? "Deleting…" : "Delete forever"}
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* --------------------------------- about --------------------------------- */

const STEPS = [
  ["Pick what matters", "Start with a goal and write why it matters to you."],
  ["Take small steps", "Break it into tiny daily actions. Streaks forgive a missed day."],
  ["Reflect each evening", "A short check-in turns the day into something you can learn from."],
];

function AboutScreen() {
  return (
    <>
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Info />
          </div>
          <h2 className="text-xl font-semibold">{APP_NAME}</h2>
          <p className="text-muted-foreground">A quieter way to grow, one honest day at a time.</p>
          <p className="text-sm text-muted-foreground">Version {APP_VERSION}</p>
        </CardContent>
      </Card>
      <GroupCard title="How it works">
        {STEPS.map(([title, body], i) => (
          <div key={title} className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">{i + 1}</span>
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          </div>
        ))}
      </GroupCard>
      <div className="flex flex-col gap-3">
        <Button
          variant="outline"
          className="h-11"
          onClick={() => {
            window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${APP_NAME} feedback (v${APP_VERSION})`)}`;
          }}
        >
          Send feedback
        </Button>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <Button variant="outline" className="h-11" onClick={() => navigator.share({ title: APP_NAME, text: "A quieter way to grow." }).catch(() => {})}>
            Share the app
          </Button>
        )}
      </div>
    </>
  );
}

/* --------------------------------- shell --------------------------------- */

export function ProfileScreens({
  screen,
  user,
  supabase,
  checkins,
  countdowns,
  preferences,
  updatePreferences,
  onBack,
  signOut,
  onAddCountdown,
  onEditCountdown,
  onDeleteCountdown,
  onFeature,
}: {
  screen: Exclude<ProfileScreenName, "home">;
  user: { id: string; email?: string } | null;
  supabase: any;
  checkins: Checkin[];
  countdowns: Countdown[];
  preferences: Preferences;
  updatePreferences: (patch: Partial<Preferences>) => void;
  onBack: () => void;
  signOut: () => Promise<void> | void;
  onAddCountdown: () => void;
  onEditCountdown: (c: Countdown) => void;
  onDeleteCountdown: (c: Countdown) => void;
  onFeature: (c: Countdown) => void;
}) {
  return (
    <div className="profile-screen flex flex-col gap-5">
      <Back title={TITLES[screen]} onBack={onBack} />
      {screen === "countdowns" && <CountdownsScreen countdowns={countdowns} onAdd={onAddCountdown} onEdit={onEditCountdown} onDelete={onDeleteCountdown} onFeature={onFeature} />}
      {screen === "history" && <HistoryScreen checkins={checkins} />}
      {screen === "preferences" && <PreferencesScreen preferences={preferences} update={updatePreferences} />}
      {screen === "privacy" && <PrivacyScreen user={user} supabase={supabase} preferences={preferences} update={updatePreferences} signOut={signOut} />}
      {screen === "about" && <AboutScreen />}
    </div>
  );
}
