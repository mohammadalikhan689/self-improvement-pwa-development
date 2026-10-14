"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Ellipsis,
  FileText,
  Home,
  Moon,
  Plus,
  Sun,
  Target,
  Trash2,
  UserRound,
  Camera,
  ImageIcon,
  Trash2 as TrashIcon,
  Trophy,
  BarChart3,
  Lock,
  Info,
  Flame,
  Timer,
} from "lucide-react";
import { intervalToDuration } from "date-fns";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoginForm } from "@/components/auth-form";
import { PageWrapper } from "@/components/page-wrapper";
import { GoalsTab } from "@/components/goals-tab";
import { DayScene } from "@/components/today/day-scene";
import { CountdownCard } from "@/components/today/countdown-card";
import { PlanCard } from "@/components/today/plan-card";
import { RitualsCard } from "@/components/today/rituals-card";
import { VoiceCoachButton } from "@/components/today/voice-coach-button";
import { intentionSuggestions } from "@/lib/rituals";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const moods = ["😔", "😕", "😐", "🙂", "😊"];
type Tab = "today" | "goals" | "you";
type ProfileScreen = "home" | "history" | "preferences" | "privacy" | "about";
type Goal = {
  id: string;
  title: string;
  why: string | null;
  identity?: string | null;
  countdown_id?: string | null;
  created_at?: string | null;
};
type Action = {
  id: string;
  name: string;
  goal_id: string;
  weekly_target: number;
  completions: string[];
};
type DailyTask = {
  id: string;
  user_id: string;
  task_date: string;
  title: string;
  goal_id: string | null;
  due_at: string | null;
  completed_at: string | null;
  description: string | null;
  priority: "low" | "mid" | "high" | "urgent";
};
type Countdown = {
  id: string;
  title: string;
  target_at: string;
  created_at?: string | null;
  is_featured?: boolean;
};
type Checkin = {
  id: string;
  checkin_date: string;
  mood: number;
  win: string | null;
  improve: string | null;
  created_at: string;
  tomorrow_priority?: string | null;
  ai_reflection?: string | null;
  daily_thought?: string | null;
};
const moodNames = ["Low", "Down", "Okay", "Good", "Happy"];
const localDateKey = (value = new Date()) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const today = () => localDateKey();
const intentionKey = (userId: string) => `small-steps-intention-${userId}-${localDateKey()}`;
const readLocalIntention = (userId: string): string | null => {
  try {
    return window.localStorage.getItem(intentionKey(userId));
  } catch {
    return null;
  }
};
const writeLocalIntention = (userId: string, value: string) => {
  try {
    window.localStorage.setItem(intentionKey(userId), value);
  } catch {
    /* storage may be unavailable */
  }
};
const startOfWeek = () => {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return localDateKey(d);
};
  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : h < 22 ? "Good evening" : "Good night";
  };
  const timeOfDay = () => {
    const h = new Date().getHours();
    return h < 12 ? "morning" : h < 18 ? "afternoon" : h < 22 ? "evening" : "night";
  };
  const dailyHeadline = () => {
    const options = {
      morning: ["Rise with purpose.", "A fresh page. Write on it.", "Start small. Start now.", "Today is yours to shape.", "Make today count."],
      afternoon: ["Keep the momentum.", "Halfway there. Keep going.", "One more step forward.", "Stay with it."],
      evening: ["Finish with intention.", "Close the day well.", "Look at what you did today."],
      night: ["Rest is part of the plan.", "Let today be enough.", "Tomorrow starts with sleep."],
    } as const;
    const now = new Date();
    const dayIndex = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    const choices = options[timeOfDay()];
    return choices[dayIndex % choices.length];
  };
const dateLabel = () =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
const formatDate = (value: Date) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(value);
const checkinStreak = (checkins: Checkin[]) => {
  const dates = new Set(checkins.map((c) => c.checkin_date));
  let cursor = new Date();
  if (!dates.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (dates.has(localDateKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
};

export default function Page() {
  const supabase = useMemo(
    () => (typeof window === "undefined" ? null : createClient()),
    [],
  );
  const router = useRouter();
  const [user, setUser] = useState<any>(null),
    [loading, setLoading] = useState(true),
    [tab, setTab] = useState<Tab>("today");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [profileScreen, setProfileScreen] = useState<ProfileScreen>("home");
  const [preferences, setPreferences] = useState({ reminderTime: "08:00", reminderEnabled: true, weekStarts: "Monday", monthStarts: "1", haptics: true, animations: true, language: "English" });
const [displayName, setDisplayName] = useState(""),
  [avatarUrl, setAvatarUrl] = useState<string | null>(null),
  [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]),
    [actions, setActions] = useState<Action[]>([]),
    [countdowns, setCountdowns] = useState<Countdown[]>([]),
    [checkins, setCheckins] = useState<Checkin[]>([]),
    [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [taskOpen, setTaskOpen] = useState(false),
    [editingTask, setEditingTask] = useState<DailyTask | null>(null),
    [taskTitle, setTaskTitle] = useState(""),
    [taskDue, setTaskDue] = useState(""),
    [taskPriority, setTaskPriority] = useState<DailyTask["priority"]>("mid"),
    [taskDescription, setTaskDescription] = useState(""),
    [detailTask, setDetailTask] = useState<DailyTask | null>(null),
    [taskError, setTaskError] = useState("");
  const [intention, setIntention] = useState<string | null>(null);
  const [checkinSaved, setCheckinSaved] = useState(false),
  [checkinError, setCheckinError] = useState(""),
  [mood, setMood] = useState(0),
    [win, setWin] = useState(""),
    [improve, setImprove] = useState("");
  const [goalOpen, setGoalOpen] = useState(false),
    [actionGoal, setActionGoal] = useState<string | null>(null),
    [countdownOpen, setCountdownOpen] = useState(false),
    [builderOpen, setBuilderOpen] = useState(false);
  const [editingCountdown, setEditingCountdown] = useState<Countdown | null>(
      null,
    ),
    [editingGoal, setEditingGoal] = useState<Goal | null>(null),
    [editingAction, setEditingAction] = useState<Action | null>(null),
    [editingCheckin, setEditingCheckin] = useState<Checkin | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    action: () => Promise<void>;
  } | null>(null);
  const [saving, setSaving] = useState(false),
    [profileDraft, setProfileDraft] = useState(""),
    [birthMonth, setBirthMonth] = useState(""),
    [birthDay, setBirthDay] = useState(""),
    [birthYear, setBirthYear] = useState("");
  const normalizedDisplayName = displayName.trim()
    ? displayName.trim().charAt(0).toUpperCase() + displayName.trim().slice(1).toLowerCase()
    : "";
  useEffect(() => {
    const stored = window.localStorage.getItem("small-steps-preferences");
    if (stored) {
      try { setPreferences((current) => ({ ...current, ...JSON.parse(stored) })); } catch { /* ignore malformed local settings */ }
    }
  }, []);
  const updatePreferences = (patch: Partial<typeof preferences>) => {
    setPreferences((current) => { const next = { ...current, ...patch }; window.localStorage.setItem("small-steps-preferences", JSON.stringify(next)); return next; });
  };
  const [countdownTitle, setCountdownTitle] = useState(""),
    [countdownChoice, setCountdownChoice] = useState<
      "1y" | "3y" | "5y" | "10y" | "custom" | null
    >(null),
    [countdownTargetDate, setCountdownTargetDate] = useState<Date | null>(null),
    [countdownMonth, setCountdownMonth] = useState(""),
    [countdownDay, setCountdownDay] = useState(""),
    [countdownYear, setCountdownYear] = useState(""),
    [countdownError, setCountdownError] = useState("");

  async function loadData() {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      setUser(auth.user);
      if (!auth.user) return;

      const results = await Promise.all([
        supabase.from("profiles").select("display_name,date_of_birth,avatar_url").eq("id", auth.user.id).maybeSingle(),
        supabase.from("goals").select("id,title,why,identity,countdown_id,created_at").eq("user_id", auth.user.id).order("created_at", { ascending: true }),
        supabase.from("habits").select("id,name,goal_id,weekly_target").eq("user_id", auth.user.id),
        supabase.from("countdowns").select("id,title,target_at,created_at,is_featured").eq("user_id", auth.user.id),
        supabase.from("checkins").select("id,checkin_date,mood,win,improvement,created_at").eq("user_id", auth.user.id).order("checkin_date", { ascending: false }).limit(60),
        supabase.from("daily_tasks").select("id,user_id,task_date,title,goal_id,due_at,completed_at,description,priority").eq("user_id", auth.user.id).eq("task_date", today()).order("due_at", { ascending: true, nullsFirst: false }),
      ]);
      const [profileResult, goalsResult, habitsResult, countdownsResult, checkinsResult, tasksResult] = results;
      for (const result of results) if (result.error) toast.error(result.error.message);
      const profile = profileResult.data;
      const gs = goalsResult.data || [];
      const hs = habitsResult.data || [];
      const cds = countdownsResult.data || [];
      const cis = checkinsResult.data || [];
      const dts = tasksResult.data || [];
      const ids = hs.map((h: any) => h.id).filter(Boolean);
      const completionResult = ids.length
        ? await supabase.from("habit_completions").select("habit_id,completed_on").eq("user_id", auth.user.id).in("habit_id", ids)
        : { data: [], error: null };
      if (completionResult.error) toast.error(completionResult.error.message);
      const comps = completionResult.data || [];
setDisplayName(profile?.display_name || "");
  setAvatarUrl(profile?.avatar_url || null);
  setProfileDraft(profile?.display_name || "");
    setDateOfBirth(profile?.date_of_birth || null);
    setGoals(gs || []);
    setCountdowns(cds || []);
    setCheckins(
      (cis || []).map((c: any) => ({ ...c, improve: c.improvement })),
    );
    setActions(
      (hs || []).map((h: any) => ({
        ...h,
        completions: (comps || [])
          .filter((c: any) => c.habit_id === h.id)
          .map((c: any) => c.completed_on),
      })),
    );
      setDailyTasks((dts || []) as DailyTask[]);
      // The morning intention lives in its own table. If it has not been created yet, stay quiet.
      const intentionResult = await supabase
        .from("daily_intentions")
        .select("intention")
        .eq("user_id", auth.user.id)
        .eq("intention_date", today())
        .maybeSingle();
      setIntention(
        intentionResult.error || !intentionResult.data?.intention
          ? readLocalIntention(auth.user.id)
          : intentionResult.data.intention,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[v0] Failed to load app data:", error);
      toast.error(message);
      setDisplayName("");
      setDateOfBirth(null);
      setGoals([]);
      setActions([]);
      setCountdowns([]);
      setCheckins([]);
      setDailyTasks([]);
      setIntention(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const savedTheme = window.localStorage.getItem("small-steps-theme");
    const dark = savedTheme ? savedTheme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDarkMode(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);
  useEffect(() => {
    loadData();
    const { data } = supabase?.auth.onAuthStateChange(() => loadData()) || {
      data: { subscription: { unsubscribe() {} } },
    };
    return () => data.subscription.unsubscribe();
  }, [supabase]);
  const saveResult = async (result: { error: any }, success: string) => {
    if (result.error) {
      toast.error(result.error.message);
      return false;
    }
    toast.success(success);
    return true;
  };
  async function toggleAction(action: Action) {
    const done = action.completions.includes(today());
    setActions((v) =>
      v.map((a) =>
        a.id === action.id
          ? {
              ...a,
              completions: done
                ? a.completions.filter((d) => d !== today())
                : [...a.completions, today()],
            }
          : a,
      ),
    );
    const result = done
      ? await supabase
          .from("habit_completions")
          .delete()
          .match({
            user_id: user.id,
            habit_id: action.id,
            completed_on: today(),
          })
      : await supabase
          .from("habit_completions")
          .upsert(
            { habit_id: action.id, user_id: user.id, completed_on: today() },
            { onConflict: "habit_id,completed_on" },
          );
    if (result.error) {
      toast.error(result.error.message);
      setActions((v) =>
        v.map((a) =>
          a.id === action.id
            ? {
                ...a,
                completions: done
                  ? [...a.completions, today()]
                  : a.completions.filter((d) => d !== today()),
              }
            : a,
        ),
      );
    }
  }
  async function toggleDailyTask(task: DailyTask) {
    const completed_at = task.completed_at ? null : new Date().toISOString();
    const result = await supabase
      .from("daily_tasks")
      .update({ completed_at })
      .eq("id", task.id)
      .eq("user_id", user.id);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    await loadData();
    if (completed_at) {
      toast("Task completed", {
        duration: 5000,
        action: {
          label: "Undo",
          onClick: async () => {
            const undo = await supabase
              .from("daily_tasks")
              .update({ completed_at: null })
              .eq("id", task.id)
              .eq("user_id", user.id);
            if (undo.error) toast.error(undo.error.message);
            else await loadData();
          },
        },
      });
    }
  }
  async function saveDailyTask() {
    setTaskError("");
    const title = taskTitle.trim();
    if (!title) {
      setTaskError("Add a task name");
      return;
    }
    let due_at: string | null = null;
    if (taskDue) {
      const [hour, minute, meridiem] = taskDue.split(":");
      const h = (Number(hour) % 12) + (meridiem === "PM" ? 12 : 0);
      const deadline = new Date();
      deadline.setHours(h, Number(minute), 0, 0);
      const keepsOldDeadline =
        editingTask?.due_at &&
        Math.abs(new Date(editingTask.due_at).getTime() - deadline.getTime()) < 60000;
      if (deadline <= new Date() && !keepsOldDeadline) {
        setTaskError("That time has passed");
        return;
      }
      due_at = deadline.toISOString();
    }
    setSaving(true);
    const fields = {
      user_id: user.id,
      task_date: today(),
      title,
      description: taskDescription.trim() || null,
      due_at,
      priority: taskPriority,
    };
    const result = editingTask
      ? await supabase
          .from("daily_tasks")
          .update(fields)
          .eq("id", editingTask.id)
          .eq("user_id", user.id)
      : await supabase.from("daily_tasks").insert(fields);
    if (result.error) {
      toast.error(result.error.message);
      setTaskError(result.error.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    setTaskOpen(false);
    setEditingTask(null);
    setTaskTitle("");
    setTaskDescription("");
    setTaskDue("");
    setTaskPriority("mid");
    await loadData();
  }
  async function deleteDailyTask(task: DailyTask) {
    const result = await supabase
      .from("daily_tasks")
      .delete()
      .eq("id", task.id)
      .eq("user_id", user.id);
    if (result.error) toast.error(result.error.message);
    else await loadData();
  }
  function openEditTask(task: DailyTask) {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDescription(task.description || "");
    setTaskPriority(task.priority || "mid");
    setTaskError("");
    setTaskDue(
      task.due_at
        ? new Date(task.due_at)
            .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
            .replace(" ", ":")
        : "",
    );
    setDetailTask(null);
    setTaskOpen(true);
  }
  function askDeleteTask(task: DailyTask) {
    setDetailTask(null);
    setConfirm({
      title: "Delete task?",
      description: "This cannot be undone.",
      action: () => deleteDailyTask(task),
    });
  }
  async function saveGoal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      fields = {
        title: String(f.get("title") || "").trim(),
        why: String(f.get("why") || "").trim(),
        identity: String(f.get("identity") || "").trim() || null,
      };
    if (!fields.title || !fields.why)
      return toast.error("Title and why are required.");
    setSaving(true);
    const result = editingGoal
      ? await supabase
          .from("goals")
          .update(fields)
          .eq("id", editingGoal.id)
          .eq("user_id", user.id)
          .select("id,title,why,identity")
          .single()
      : await supabase
          .from("goals")
          .insert({ user_id: user.id, ...fields })
          .select("id,title,why,identity")
          .single();
    setSaving(false);
    if (
      !(await saveResult(result, editingGoal ? "Goal updated." : "Goal saved."))
    )
      return;
    setGoals((v) =>
      editingGoal
        ? v.map((g) => (g.id === editingGoal.id ? result.data : g))
        : [...v, result.data],
    );
    setEditingGoal(null);
    setGoalOpen(false);
  }
  async function updateActionFromPlan(action: Action, name: string, weekly_target: number) {
    const cleanName = name.trim();
    if (!cleanName) throw new Error("Add a name first.");
    if (!Number.isFinite(weekly_target) || weekly_target < 1 || weekly_target > 7) throw new Error("Choose 1 to 7 days.");
    const result = await supabase
      .from("habits")
      .update({ name: cleanName, weekly_target })
      .eq("id", action.id)
      .eq("user_id", user.id)
      .select("id,name,goal_id,weekly_target");
    if (result.error) throw new Error(result.error.message);
    const row = result.data?.[0];
    if (!row) throw new Error("Couldn't save. This action wasn't updated.");
    setActions((v) => v.map((a) => (a.id === action.id ? { ...a, name: row.name, weekly_target: row.weekly_target } : a)));
    toast.success("Action updated.");
  }
  async function addAction(
    e: React.FormEvent<HTMLFormElement>,
    goalId: string,
  ) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      fields = {
        name: String(f.get("name") || "").trim(),
        weekly_target: Number(f.get("weekly_target") || 1),
      };
    if (!fields.name || fields.weekly_target < 1 || fields.weekly_target > 7)
      return toast.error("Add an action and choose 1–7 days.");
    setSaving(true);
    const result = editingAction
      ? await supabase
          .from("habits")
          .update(fields)
          .eq("id", editingAction.id)
          .eq("user_id", user.id)
          .select("id,name,goal_id,weekly_target")
          .single()
      : await supabase
          .from("habits")
          .insert({ user_id: user.id, goal_id: goalId, ...fields })
          .select("id,name,goal_id,weekly_target")
          .single();
    setSaving(false);
    if (
      !(await saveResult(
        result,
        editingAction ? "Action updated." : "Action saved.",
      ))
    )
      return;
    setActions((v) =>
      editingAction
        ? v.map((a) =>
            a.id === editingAction.id
              ? { ...result.data, completions: a.completions }
              : a,
          )
        : [...v, { ...result.data, completions: [] }],
    );
    setEditingAction(null);
    setActionGoal(null);
  }
  async function saveCountdown() {
    setCountdownError("");
    const target = countdownTargetDate;
    if (!countdownTitle.trim()) {
      setCountdownError("Add a title");
      return;
    }
    if (!target) {
      setCountdownError("Choose a date");
      return;
    }
    if (target <= new Date()) {
      setCountdownError("Choose a future date");
      return;
    }
    setSaving(true);
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.log("[v0] Countdown auth error:", authError);
      setSaving(false);
      setCountdownError(authError.message);
      toast.error(authError.message);
      return;
    }
    if (!auth.user) {
      setSaving(false);
      setCountdownError("Please sign in again");
      toast.error("Please sign in again");
      return;
    }
    if (editingCountdown) {
      const updated = await supabase
        .from("countdowns")
        .update({ title: countdownTitle.trim(), target_at: target.toISOString() })
        .eq("id", editingCountdown.id)
        .eq("user_id", auth.user.id);
      setSaving(false);
      if (updated.error) {
        setCountdownError(updated.error.message);
        toast.error(updated.error.message);
        return;
      }
      closeCountdown();
      await loadData();
      toast.success("Countdown updated.");
      return;
    }
    const clearResult = await supabase
      .from("countdowns")
      .update({ is_featured: false })
      .eq("user_id", auth.user.id);
    if (clearResult.error) {
      console.log("[v0] Countdown feature reset error:", clearResult.error);
      setSaving(false);
      setCountdownError(clearResult.error.message);
      toast.error(clearResult.error.message);
      return;
    }
    const result = await supabase
      .from("countdowns")
      .insert({
        user_id: auth.user.id,
        title: countdownTitle.trim(),
        target_at: target.toISOString(),
        is_featured: true,
      })
      .select("id,title,target_at,created_at,is_featured")
      .single();
    if (result.error) {
      console.log("[v0] Countdown insert error:", result.error);
      setSaving(false);
      setCountdownError(result.error.message);
      toast.error(result.error.message);
      return;
    }
    setSaving(false);
    closeCountdown();
    await loadData();
    toast.success("Countdown saved.");
  }
  function closeCountdown() {
    setCountdownOpen(false);
    setEditingCountdown(null);
    setCountdownTitle("");
    setCountdownChoice(null);
    setCountdownTargetDate(null);
    setCountdownMonth("");
    setCountdownDay("");
    setCountdownYear("");
    setCountdownError("");
  }
  async function makeFeatured(c: Countdown) {
    const clear = await supabase
      .from("countdowns")
      .update({ is_featured: false })
      .eq("user_id", user.id);
    if (clear.error) {
      toast.error(clear.error.message);
      return;
    }
    const result = await supabase
      .from("countdowns")
      .update({ is_featured: true })
      .eq("id", c.id)
      .eq("user_id", user.id);
    if (!(await saveResult(result, "Featured countdown updated."))) return;
    setCountdowns((v) => v.map((x) => ({ ...x, is_featured: x.id === c.id })));
  }
  async function deleteCountdown(c: Countdown) {
    const previous = countdowns;
    setCountdowns((v) => v.filter((x) => x.id !== c.id));
    const result = await supabase
      .from("countdowns")
      .delete()
      .eq("id", c.id)
      .eq("user_id", user.id);
    if (!(await saveResult(result, "Countdown deleted.")))
      setCountdowns(previous);
  }
  async function deleteGoal(g: Goal) {
    const previousGoals = goals,
      previousActions = actions;
    setGoals((v) => v.filter((x) => x.id !== g.id));
    setActions((v) => v.filter((x) => x.goal_id !== g.id));
    const result = await supabase
      .from("goals")
      .delete()
      .eq("id", g.id)
      .eq("user_id", user.id);
    if (!(await saveResult(result, "Goal deleted."))) {
      setGoals(previousGoals);
      setActions(previousActions);
    }
  }
  async function deleteAction(a: Action) {
    setActions((v) => v.filter((x) => x.id !== a.id));
    const result = await supabase
      .from("habits")
      .delete()
      .eq("id", a.id)
      .eq("user_id", user.id);
    if (!(await saveResult(result, "Action deleted."))) await loadData();
  }
  async function saveProfile() {
    const result = await supabase
      .from("profiles")
      .upsert({ id: user.id, display_name: profileDraft.trim() });
    if (await saveResult(result, "Profile saved."))
      setDisplayName(profileDraft.trim());
  }
  async function saveBirth() {
    if (!birthMonth || !birthDay || !birthYear)
      return toast.error("Choose a complete date.");
    const value = `${birthYear}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`;
    const result = await supabase
      .from("profiles")
      .upsert({ id: user.id, date_of_birth: value });
    if (await saveResult(result, "Date of birth saved.")) setDateOfBirth(value);
  }
  async function addSuggestedTask(title: string, priority: DailyTask["priority"] = "mid", goalId?: string) {
  const result = await supabase
  .from("daily_tasks")
  .insert({ user_id: user.id, task_date: today(), title, priority, goal_id: goalId || null })
  .select("id,user_id,task_date,title,goal_id,due_at,completed_at,description,priority")
  .single();
  if (!(await saveResult(result, "Task added."))) return;
  setDailyTasks((v) => [...v, result.data]);
  }
  async function saveIntention(text: string) {
    const value = text.trim().slice(0, 120);
    if (!value) return false;
    const result = await supabase
      .from("daily_intentions")
      .upsert(
        { user_id: user.id, intention_date: today(), intention: value, updated_at: new Date().toISOString() },
        { onConflict: "user_id,intention_date" },
      )
      .select("intention")
      .single();
    if (result.error) {
      // The table may not exist yet. Keep the intention on this device so the ritual still works.
      console.warn("[intention] saved on this device only:", result.error.message);
      writeLocalIntention(user.id, value);
      setIntention(value);
      toast.success("Intention set.");
      return true;
    }
    writeLocalIntention(user.id, value);
    setIntention(result.data.intention);
    toast.success("Intention set.");
    return true;
  }
  async function saveCheckin(e: React.FormEvent) {
    e.preventDefault();
    if (!mood) {
      setCheckinError("Choose how you feel first");
      return;
    }
    setCheckinError("");
    const editing = editingCheckin;
    const fields = {
      user_id: user.id,
      checkin_date: editing?.checkin_date || today(),
      mood: Math.min(5, Math.max(1, mood)),
      win: win.trim() || null,
      improvement: improve.trim(),
      ...(editing ? { id: editing.id } : {}),
    };
    const result = await supabase
      .from("checkins")
      .upsert(fields, { onConflict: "user_id,checkin_date" })
      .select("id,checkin_date,mood,win,improvement,created_at")
      .single();
    if (!(await saveResult(result, "A moment well spent."))) return;
    setCheckins((v) => {
      const next = { ...result.data, improve: result.data.improvement };
      return [next, ...v.filter((c) => c.id !== next.id)].sort((a, b) =>
        b.checkin_date.localeCompare(a.checkin_date),
      );
    });
    const wasEditingOldEntry = Boolean(editing && editing.checkin_date !== today());
    setCheckinSaved(true);
    setEditingCheckin(null);
    setMood(0);
    setWin("");
    setImprove("");
    if (wasEditingOldEntry) setTab("you");
  }
  async function deleteCheckin(c: Checkin) {
    setCheckins((v) => v.filter((x) => x.id !== c.id));
    const result = await supabase
      .from("checkins")
      .delete()
      .eq("id", c.id)
      .eq("user_id", user.id);
    if (!(await saveResult(result, "Check-in deleted."))) await loadData();
  }
  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }
  if (loading)
    return (
      <PageWrapper>
        <main className="app-shell">
          <Skeleton className="h-96 w-full" />
        </main>
      </PageWrapper>
    );
  if (!user) return <LoginForm />;
  const featured = countdowns.find((c) => c.is_featured) || countdowns[0],
    doneToday = actions.filter((a) => a.completions.includes(today())).length,
    incomplete = actions.find((a) => !a.completions.includes(today()));
  return (
    <PageWrapper>
      <main className="app-shell">
        {tab === "you" && (
        <header className="topbar">
          {(
            <div className="topbar-greeting-wrap">
              <p className="topbar-greeting">
                {displayName ? `${greeting()}, ${normalizedDisplayName}` : greeting()}
              </p>
              <p className="date">{dateLabel()}</p>
            </div>
          )}
          <div className="top-actions">
            <Button
              variant="outline"
              size="icon"
              aria-label="Toggle dark mode"
              onClick={() => {
                const nextDark = !isDarkMode;
                setIsDarkMode(nextDark);
                document.documentElement.classList.toggle("dark", nextDark);
                window.localStorage.setItem("small-steps-theme", nextDark ? "dark" : "light");
              }}
            >
              {isDarkMode ? <Sun /> : <Moon />}
            </Button>
            <Button
              className="rounded-full"
              size="icon"
              aria-label="Open You"
              onClick={() => setTab("you")}
            >
              {user.email?.[0]?.toUpperCase()}
            </Button>
          </div>
        </header>
        )}
        <section className="content">
          {tab === "today" && (
            <Today
              goals={goals}
              actions={actions}
              doneToday={doneToday}
              incomplete={incomplete}
              countdown={featured}
              dailyHeadline={dailyHeadline()}
              greetingText={greeting()}
              name={normalizedDisplayName}
              dateText={dateLabel()}
              streak={checkinStreak(checkins)}
              onOpenGoals={() => setTab("goals")}
              intention={intention}
              onSaveIntention={saveIntention}
              countdowns={countdowns}
              toggleAction={toggleAction}
  dailyTasks={dailyTasks}
  onAddSuggestedTask={addSuggestedTask}
  onQuickAdd={(title: string) => {
  setEditingTask(null);
  setTaskTitle(title);
  setTaskDescription("");
  setTaskPriority("mid");
  setTaskDue("");
  setTaskError("");
  setTaskOpen(true);
  }}
  onAddTask={() => {
  setEditingTask(null);
                setTaskTitle("");
                setTaskDescription("");
                setTaskPriority("mid");
                setTaskDue("");
                setTaskError("");
                setTaskOpen(true);
              }}
              onEditTask={openEditTask}
  onOpenTask={openEditTask}
  updateActionFromPlan={updateActionFromPlan}
  toggleDailyTask={toggleDailyTask}
              onDeleteTask={askDeleteTask}
              onAddCountdown={() => {
                setEditingCountdown(null);
                setCountdownOpen(true);
              }}
              onEditCountdown={(c: Countdown) => {
                if (!c?.target_at) {
                  toast.error("This countdown has no target date.");
                  return;
                }
                setEditingCountdown(c);
                setCountdownTitle(c.title || "");
                setCountdownChoice("custom");
                const targetDate = new Date(c.target_at);
                setCountdownTargetDate(targetDate);
                setCountdownMonth(String(targetDate.getMonth() + 1));
                setCountdownDay(String(targetDate.getDate()));
                setCountdownYear(String(targetDate.getFullYear()));
                setCountdownOpen(true);
              }}
              onDelete={(c: Countdown) =>
                setConfirm({
                  title: "Delete countdown?",
                  description: "This cannot be undone.",
                  action: () => deleteCountdown(c),
                })
              }
              onFeature={makeFeatured}
              mood={mood}
              setMood={setMood}
              win={win}
              setWin={setWin}
              improve={improve}
              setImprove={setImprove}
  saveCheckin={saveCheckin}
  checkinError={checkinError}
  checkinSaved={checkinSaved}
              todayCheckin={checkins.find((c) => c.checkin_date === today()) || null}
              checkins={checkins}
              editingCheckin={editingCheckin}
              setEditingCheckin={setEditingCheckin}
              onEditCheckin={(c: Checkin) => {
                setEditingCheckin(c);
                setMood(c.mood);
                setWin(c.win || "");
                setImprove(c.improve || "");
                setCheckinSaved(false);
                setTab("today");
              }}
            />
          )}
          {tab === "goals" && (
            <GoalsTab
              supabase={supabase}
              user={user}
              goals={goals}
              actions={actions}
              countdowns={countdowns}
              setGoals={setGoals}
              setActions={setActions}
              toggleAction={toggleAction}
            />
          )}
  {tab === "you" && (
  <PremiumProfile
  user={user}
  profileScreen={profileScreen}
  setProfileScreen={setProfileScreen}
  preferences={preferences}
  updatePreferences={updatePreferences}
  supabase={supabase}
  avatarUrl={avatarUrl}
  setAvatarUrl={setAvatarUrl}
  streak={checkinStreak(checkins)}
  goals={goals}
  actions={actions}
  checkins={checkins}
  displayName={displayName}
              profileDraft={profileDraft}
              setProfileDraft={setProfileDraft}
              saveProfile={saveProfile}
              dateOfBirth={dateOfBirth}
              birthMonth={birthMonth}
              setBirthMonth={setBirthMonth}
              birthDay={birthDay}
              setBirthDay={setBirthDay}
              birthYear={birthYear}
              setBirthYear={setBirthYear}
              saveBirth={saveBirth}
              countdowns={countdowns}
              onAddCountdown={() => {
                setEditingCountdown(null);
                setCountdownOpen(true);
              }}
              onEditCountdown={(c: Countdown) => {
                if (!c?.target_at) {
                  toast.error("This countdown has no target date.");
                  return;
                }
                setEditingCountdown(c);
                setCountdownTitle(c.title || "");
                setCountdownChoice("custom");
                const targetDate = new Date(c.target_at);
                setCountdownTargetDate(targetDate);
                setCountdownMonth(String(targetDate.getMonth() + 1));
                setCountdownDay(String(targetDate.getDate()));
                setCountdownYear(String(targetDate.getFullYear()));
                setCountdownOpen(true);
              }}
              onDeleteCountdown={(c: Countdown) =>
                setConfirm({
                  title: "Delete countdown?",
                  description: "This cannot be undone.",
                  action: () => deleteCountdown(c),
                })
              }
              onFeature={makeFeatured}
              onEditCheckin={(c: Checkin) => {
                setEditingCheckin(c);
                setMood(c.mood);
                setWin(c.win || "");
                setImprove(c.improve || "");
                setCheckinSaved(false);
                setTab("today");
              }}
              onDeleteCheckin={(c: Checkin) =>
                setConfirm({
                  title: "Delete check-in?",
                  description: "This cannot be undone.",
                  action: () => deleteCheckin(c),
                })
              }
              signOut={signOut}
            />
          )}
        </section>
        <DailyTaskSheet open={taskOpen} onOpenChange={setTaskOpen} editing={Boolean(editingTask)} title={taskTitle} setTitle={setTaskTitle} description={taskDescription} setDescription={setTaskDescription} due={taskDue} setDue={setTaskDue} priority={taskPriority} setPriority={setTaskPriority} save={saveDailyTask} error={taskError} saving={saving} />
        <TaskDetailsSheet task={detailTask ? dailyTasks.find((t) => t.id === detailTask.id) ?? null : null} onClose={() => setDetailTask(null)} onToggle={toggleDailyTask} onEdit={openEditTask} onDelete={askDeleteTask} />
        <nav className="tabbar">
          {(
            [
              ["today", Home, "Today"],
              ["goals", Target, "Goals"],
              ["you", UserRound, "You"],
            ] as const
          ).map(([key, Icon, label]) => (
            <Button
              key={key}
              variant="ghost"
              className={tab === key ? "tab active" : "tab"}
              onClick={() => setTab(key)}
            >
              <Icon />
              <span>{label}</span>
            </Button>
          ))}
        </nav>
        {tab === "today" && <VoiceCoachButton />}
      </main>
      <GoalSheet
        open={goalOpen}
        onOpenChange={setGoalOpen}
        goal={editingGoal}
        saveGoal={saveGoal}
        saving={saving}
      />
      <CountdownSheet
        open={countdownOpen}
        onOpenChange={(v: boolean) =>
          v ? setCountdownOpen(true) : closeCountdown()
        }
        title={countdownTitle}
        setTitle={setCountdownTitle}
        choice={countdownChoice}
        setChoice={(value: any) => {
          setCountdownChoice(value);
          if (value === "custom") setCountdownTargetDate(null);
        }}
        targetDate={countdownTargetDate}
        setTargetDate={setCountdownTargetDate}
        month={countdownMonth}
        setMonth={setCountdownMonth}
        day={countdownDay}
        setDay={setCountdownDay}
        year={countdownYear}
        setYear={setCountdownYear}
        save={saveCountdown}
        error={countdownError}
        editing={!!editingCountdown}
      />
      <AlertDialog
        open={!!confirm}
        onOpenChange={(v: boolean) => !v && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const action = confirm?.action;
                setConfirm(null);
                if (action) await action();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}

function ActionMenu({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-1">{children}</div>;
}
function DailyTaskSheet({
  open, onOpenChange, editing, title, setTitle, description, setDescription, due, setDue,
  priority, setPriority, save, error, saving,
}: any) {
  const times = Array.from({ length: 24 }, (_, i) => {
    const h = i % 12 || 12;
    const ap = i < 12 ? "AM" : "PM";
    return Array.from({ length: 12 }, (_, m) => `${h}:${String(m * 5).padStart(2, "0")}:${ap}`);
  }).flat();
  const priorityStyles: Record<string, string> = {
    low: "border-sky-300 text-sky-700 data-[selected=true]:bg-sky-400 data-[selected=true]:text-white",
    mid: "border-emerald-300 text-emerald-700 data-[selected=true]:bg-emerald-500 data-[selected=true]:text-white",
    high: "border-amber-300 text-amber-700 data-[selected=true]:bg-amber-500 data-[selected=true]:text-white",
    urgent: "border-red-300 text-red-700 data-[selected=true]:bg-red-600 data-[selected=true]:text-white",
  };
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom)+4.5rem)]">
      <SheetHeader><SheetTitle>{editing ? "Edit task" : "Add task"}</SheetTitle></SheetHeader>
      <div className="mt-6 flex flex-col gap-4">
        <Label>Task<Input className="mt-2 h-12" value={title} onChange={(e) => setTitle(e.target.value)} /></Label>
        <Label>Details (optional)
          <Textarea className="mt-2 min-h-24 rounded-2xl border-border bg-card px-4 py-3 text-base" placeholder="Add notes, steps or anything you want to remember" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Label>
        <Label>Priority
          <div className="mt-2 grid grid-cols-4 gap-2">
            {(["low", "mid", "high", "urgent"] as const).map((value) => <button key={value} type="button" data-selected={priority === value} className={`h-11 rounded-full border text-sm font-medium capitalize transition-colors ${priorityStyles[value]}`} onClick={() => setPriority(value)}>{value}</button>)}
          </div>
        </Label>
        <Label>Finish before
          <div className="mt-2 grid grid-cols-3 gap-2">
            <select aria-label="Hour" className="h-12 rounded-xl border border-border bg-card px-3" value={due ? due.split(":")[0] : ""} onChange={(e) => { const p = due ? due.split(":") : ["", "00", "AM"]; setDue(e.target.value ? `${e.target.value}:${p[1] || "00"}:${p[2] || "AM"}` : ""); }}><option value="">No deadline</option>{Array.from({length: 12}, (_, i) => <option key={i + 1}>{i + 1}</option>)}</select>
            <select aria-label="Minute" className="h-12 rounded-xl border border-border bg-card px-3" value={due ? due.split(":")[1] : ""} onChange={(e) => { const p = due ? due.split(":") : ["12", "", "AM"]; setDue(e.target.value ? `${p[0] || "12"}:${e.target.value}:${p[2] || "AM"}` : ""); }}><option value="">Minute</option>{Array.from({length: 12}, (_, i) => <option key={i}>{String(i * 5).padStart(2, "0")}</option>)}</select>
            <select aria-label="AM or PM" className="h-12 rounded-xl border border-border bg-card px-3" value={due ? due.split(":")[2] : ""} onChange={(e) => { const p = due ? due.split(":") : ["12", "00", ""]; setDue(e.target.value ? `${p[0] || "12"}:${p[1] || "00"}:${e.target.value}` : ""); }}><option value="">AM/PM</option><option>AM</option><option>PM</option></select>
          </div>
        </Label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="button" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save task"}</Button>
      </div>
    </SheetContent>
  </Sheet>;
}

function ActionRow({ action, toggleAction, onEdit, onDelete }: any) {
  const done = action.completions.includes(today()),
    count = action.completions.filter((d: string) => d >= startOfWeek()).length;
  return (
    <div id={`action-${action.id}`} className="flex items-center gap-3">
      <Button
        variant={done ? "default" : "outline"}
        size="icon"
        className="rounded-full"
        aria-label={
          done ? `Uncomplete ${action.name}` : `Complete ${action.name}`
        }
        onClick={() => toggleAction(action)}
      >
        {done && <Check />}
      </Button>
      <div className="min-w-0 flex-1">
        <p
          className={
            done ? "font-medium line-through opacity-60" : "font-medium"
          }
        >
          {action.name}
        </p>
        <p className="text-sm text-muted-foreground">
          {count} of {action.weekly_target} this week
        </p>
      </div>
      <ActionMenu>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Edit ${action.name}`}
          onClick={onEdit}
        >
          <Ellipsis />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Delete ${action.name}`}
          onClick={onDelete}
        >
          <Trash2 />
        </Button>
      </ActionMenu>
    </div>
  );
}
function CountdownActions({ countdown, onEdit, onDelete, onFeature }: any) {
  return (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Edit ${countdown.title}`}
        onClick={onEdit}
      >
        <Ellipsis />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Delete ${countdown.title}`}
        onClick={onDelete}
      >
        <Trash2 />
      </Button>
      {!countdown.is_featured && (
        <Button variant="outline" size="sm" onClick={onFeature}>
          Make featured
        </Button>
      )}
    </div>
  );
}
function Today({
  goals,
  actions,
  doneToday,
  incomplete,
  countdown,
  dailyHeadline,
  greetingText,
  name,
  dateText,
  streak,
  onOpenGoals,
  intention,
  onSaveIntention,
  countdowns,
  toggleAction,
  onAddCountdown,
  onEditCountdown,
  onDelete,
  onFeature,
  mood,
  setMood,
  win,
  setWin,
  improve,
  setImprove,
  saveCheckin,
  checkinError,
  checkinSaved,
  todayCheckin,
  checkins,
  editingCheckin,
  setEditingCheckin,
  onEditCheckin,
  dailyTasks,
  onAddSuggestedTask,
  onAddTask,
  onQuickAdd,
  onEditTask,
  toggleDailyTask,
  onDeleteTask,
  onOpenTask,
  updateActionFromPlan,
  }: any) {
  return (
    <div className="screen flex flex-col gap-6">
      <DayScene
        greeting={greetingText}
        name={name}
        dateLabel={dateText}
        headline={dailyHeadline}
        streak={streak}
        done={dailyTasks.filter((task: DailyTask) => task.completed_at).length}
        total={dailyTasks.length}
      />
      <CountdownCard
        countdowns={countdowns}
        onAdd={onAddCountdown}
        onEdit={onEditCountdown}
        onDelete={onDelete}
        onFeature={onFeature}
      />
      <PlanCard
        tasks={dailyTasks}
        goals={goals}
        actions={actions}
        toggleTask={toggleDailyTask}
        toggleAction={toggleAction}
  onQuickAdd={onQuickAdd}
  onAddTask={onAddTask}
  onOpenTask={onEditTask}
  onUpdateAction={updateActionFromPlan}
  onOpenGoals={onOpenGoals}
      />
      <RitualsCard
        intention={intention}
        onSaveIntention={onSaveIntention}
        suggestions={intentionSuggestions(goals, actions, today())}
        mood={mood}
        setMood={setMood}
        win={win}
        setWin={setWin}
        improve={improve}
        setImprove={setImprove}
        saveCheckin={saveCheckin}
        checkinError={checkinError}
        checkinSaved={checkinSaved}
        todayCheckin={todayCheckin}
        editingCheckin={editingCheckin}
        onCancelEdit={() => {
          setEditingCheckin(null);
          setMood(0);
          setWin("");
          setImprove("");
        }}
        onEditCheckin={onEditCheckin}
        editingLabel={editingCheckin ? `Editing ${formatDate(new Date(`${editingCheckin.checkin_date}T12:00:00`))}` : undefined}
        tasksDone={dailyTasks.filter((task: DailyTask) => task.completed_at).length}
        tasksTotal={dailyTasks.length}
        actionsDone={actions.filter((a: Action) => a.completions.includes(today())).length}
        streak={streak}
        savedAt={todayCheckin ? clockTime(todayCheckin.created_at) : undefined}
      />
    </div>
  );
}
const TASK_RING = {
  low: "from-sky-400 to-teal-400",
  mid: "from-lime-400 to-emerald-500",
  high: "from-amber-400 to-orange-500",
  urgent: "from-orange-500 to-red-600",
} as const;
const TASK_TAB = {
  low: "bg-sky-100 text-sky-700",
  mid: "bg-emerald-100 text-emerald-700",
  high: "bg-amber-100 text-amber-800",
  urgent: "bg-red-100 font-semibold text-red-700",
} as const;
const TASK_RANK = { urgent: 0, high: 1, mid: 2, low: 3 } as const;
const clockTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  return now;
}
function timeLeft(due: string, now: number) {
  const seconds = Math.floor((new Date(due).getTime() - now) / 1000);
  if (seconds < 0) return `Overdue by ${Math.max(1, Math.floor(-seconds / 60))}m`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s left`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m left`;
}
function timeLeftClass(due: string, now: number) {
  const ms = new Date(due).getTime() - now;
  if (ms < 1800000) return "font-bold text-red-600";
  if (ms < 7200000) return "text-amber-600";
  return "text-muted-foreground";
}
function DoneLine({ task }: { task: DailyTask }) {
  if (!task.completed_at) return null;
  const onTime =
    task.due_at &&
    new Date(task.completed_at).getTime() <= new Date(task.due_at).getTime();
  return (
    <span className="text-muted-foreground">
      Done at {clockTime(task.completed_at)}
      {onTime && <span className="font-medium text-emerald-700"> · on time</span>}
    </span>
  );
}
function TaskDetailsBody({
  task,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: DailyTask;
  onToggle: (task: DailyTask) => void;
  onEdit: (task: DailyTask) => void;
  onDelete: (task: DailyTask) => void;
}) {
  const now = useNow();
  const priority = task.priority || "mid";
  const isDone = Boolean(task.completed_at);
  return (
    <>
      <SheetHeader>
        <span
          className={`w-fit rounded-md px-2 py-0.5 text-xs uppercase tracking-wide ${TASK_TAB[priority]}`}
        >
          {priority}
        </span>
        <SheetTitle
          className={isDone ? "break-words text-muted-foreground line-through" : "break-words"}
        >
          {task.title}
        </SheetTitle>
        <SheetDescription>Task details</SheetDescription>
      </SheetHeader>
      <div className="mt-6 flex flex-col gap-5">
        <div>
          <p className="text-sm text-muted-foreground">Time</p>
          {isDone ? (
            <p className="mt-1 text-sm">
              <DoneLine task={task} />
            </p>
          ) : task.due_at ? (
            <>
              <p className="mt-1">Finish before {clockTime(task.due_at)}</p>
              <p className={`text-sm ${timeLeftClass(task.due_at, now)}`}>
                {timeLeft(task.due_at, now)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-muted-foreground">No deadline</p>
          )}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Details</p>
          {task.description ? (
            <p className="mt-1 whitespace-pre-wrap break-words">{task.description}</p>
          ) : (
            <p className="mt-1 text-muted-foreground">No details added</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button type="button" className="h-12" onClick={() => onToggle(task)}>
            {isDone ? "Mark as not done" : "Mark as done"}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="h-12" onClick={() => onEdit(task)}>
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12 text-red-600"
              onClick={() => onDelete(task)}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
function TaskDetailsSheet({
  task,
  onClose,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: DailyTask | null;
  onClose: () => void;
  onToggle: (task: DailyTask) => void;
  onEdit: (task: DailyTask) => void;
  onDelete: (task: DailyTask) => void;
}) {
  return (
    <Sheet
      open={Boolean(task)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="bottom"
        className="max-h-[90dvh] overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom)+4.5rem)]"
      >
        {task && (
          <TaskDetailsBody
            task={task}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
function PremiumProfile({ user, supabase, avatarUrl, setAvatarUrl, streak, goals, actions, checkins, profileDraft, setProfileDraft, saveProfile, countdowns, onAddCountdown, onEditCountdown, onDeleteCountdown, onFeature, onEditCheckin, onDeleteCheckin, signOut, profileScreen, setProfileScreen, preferences, updatePreferences }: any) {
  const safeGoals = Array.isArray(goals) ? goals : [];
  const safeActions = Array.isArray(actions) ? actions.filter(Boolean) : [];
  const safeCountdowns = Array.isArray(countdowns) ? countdowns.filter(Boolean) : [];
  const safeCheckins = Array.isArray(checkins) ? checkins.filter(Boolean) : [];
  const [sheetOpen, setSheetOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const initials = String(profileDraft || user?.email || "?").split(/\s+/).map((part: string) => part[0]).join("").slice(0, 2).toUpperCase();
  const saveName = async (value: string) => { if (!user?.id || !supabase) return; setProfileDraft(value.slice(0, 40)); const result = await supabase.from("profiles").upsert({ id: user.id, display_name: value.trim().slice(0, 40) }); if (result.error) toast.error(result.error.message); };
  const resizeImage = (file: File) => new Promise<Blob>((resolve, reject) => { const objectUrl = URL.createObjectURL(file); const image = new Image(); image.onload = () => { URL.revokeObjectURL(objectUrl); const size = 720; const canvas = document.createElement("canvas"); canvas.width = size; canvas.height = size; const scale = Math.max(size / image.width, size / image.height); const width = image.width * scale; const height = image.height * scale; const ctx = canvas.getContext("2d"); if (!ctx) return reject(new Error("Could not prepare image")); ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height); canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not compress image")), "image/jpeg", .82); }; image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Could not read image")); }; image.src = objectUrl; });
  const upload = async (file: File) => {
    if (!supabase) {
      const message = "Supabase is not available. Refresh the page and try again.";
      setUploadError(message); toast.error(message); return;
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    const authenticatedUser = authData?.user ?? user;
    if (authError || !authenticatedUser?.id) {
      const message = authError?.message || "You must be signed in before uploading a picture.";
      setUploadError(message); toast.error(message); return;
    }
    if (!file.type.startsWith("image/") || file.size === 0) {
      const message = "Please choose a valid image file.";
      setUploadError(message); toast.error(message); return;
    }

    setUploading(true); setUploadError(null);
    try {
      const blob = await resizeImage(file);
      const path = `${authenticatedUser.id}/${crypto.randomUUID()}.jpg`;
      const bucket = supabase.storage.from("avatars");
      const { error: storageError } = await bucket.upload(path, blob, {
        upsert: false,
        contentType: "image/jpeg",
        cacheControl: "3600",
      });
      if (storageError) throw storageError;

      const { data: publicData } = bucket.getPublicUrl(path);
      const publicUrl = publicData?.publicUrl;
      if (!publicUrl) throw new Error("Supabase did not return a public URL for the avatar.");
      const url = `${publicUrl}?v=${Date.now()}`;
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ id: authenticatedUser.id, avatar_url: url });
      if (profileError) throw profileError;

      setAvatarUrl(url);
      setSheetOpen(false);
      toast.success("Profile picture updated.");
    } catch (error) {
      const details = error && typeof error === "object"
        ? error as { message?: string; statusCode?: string | number; details?: string }
        : {};
      const message = details.message || (error instanceof Error ? error.message : "Could not upload your picture.");
      console.error("[v0] Avatar upload failed", {
        error,
        message: details.message ?? message,
        statusCode: details.statusCode,
        details: details.details,
      });
      const actionable = /bucket|not found|does not exist|invalid.*bucket/i.test(message)
        ? `${message} Create a Supabase Storage bucket named avatars, then try again.`
        : message;
      setUploadError(actionable);
      toast.error(actionable);
    } finally {
      setUploading(false);
    }
  };
  const removePhoto = async () => { if (!user?.id || !supabase) return; setUploading(true); setUploadError(null); try { const { error: removeError } = await supabase.storage.from("avatars").remove([`${user.id}/avatar.jpg`]); if (removeError) throw removeError; const result = await supabase.from("profiles").upsert({ id: user.id, avatar_url: null }); if (result.error) throw result.error; setAvatarUrl(null); setSheetOpen(false); toast.success("Profile picture removed."); } catch (error) { const message = error instanceof Error ? error.message : "Could not remove your picture."; setUploadError(message); toast.error(message); } finally { setUploading(false); } };
  if (profileScreen !== "home") return <ProfileDestination screen={profileScreen} user={user} supabase={supabase} checkins={safeCheckins} preferences={preferences} updatePreferences={updatePreferences} displayName={profileDraft} setDisplayName={setProfileDraft} onBack={() => setProfileScreen("home")} signOut={signOut} />;
  return <div className="profile-screen flex flex-col gap-5">
    <section className="profile-hero rounded-[2rem] border p-6 text-center">
      <button type="button" className="profile-avatar-button" onClick={() => setSheetOpen(true)} aria-label="Change profile picture"><div className="profile-avatar">{avatarUrl ? <img src={avatarUrl} alt="Profile" /> : initials}</div><span className="profile-camera"><Camera /></span></button>
      <Input aria-label="Display name" value={profileDraft} onChange={(e) => setProfileDraft(e.target.value.slice(0, 40))} onBlur={(e) => saveName(e.target.value)} placeholder="Your name" className="profile-name-input" />
      <p className="profile-email">{user?.email}</p><span className="streak-pill"><Flame /> {streak || 0} day streak</span>
      <p className="profile-autosave">Changes save automatically</p>
    </section>
    <section className="profile-grid"><ProfileStat icon={BarChart3} label="Progress snapshot" value={`${safeActions.filter((a: Action) => a?.completions?.includes?.(today())).length} actions today`} /><ProfileStat icon={Trophy} label="Achievements" value={`${safeGoals.length} goals in motion`} /><ProfileStat icon={Flame} label="Personal statistics" value={`${safeCheckins.length} reflections`} /></section>
    <ProfileMenu icon={Timer} title="Countdowns" detail={`${safeCountdowns.length} moments worth moving toward`} onClick={onAddCountdown} />
    <ProfileMenu icon={FileText} title="Reflection history" detail={`${safeCheckins.length} check-ins saved`} onClick={() => setProfileScreen("history")} />
    <ProfileMenu icon={UserRound} title="Preferences" detail="Theme, reminders, and daily rhythm" onClick={() => setProfileScreen("preferences")} />
    <ProfileMenu icon={Lock} title="Privacy & security" detail="Your account and personal data" onClick={() => setProfileScreen("privacy")} />
    <ProfileMenu icon={Info} title="About Small Steps" detail="A quieter way to grow" onClick={() => setProfileScreen("about")} />
    <Button variant="outline" className="mt-2" onClick={signOut}>Sign out</Button>
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}><SheetContent side="bottom"><SheetHeader><SheetTitle>Profile picture</SheetTitle><SheetDescription>Choose a picture that feels like you.</SheetDescription></SheetHeader><div className="profile-upload-actions"><Button variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}><Camera /> Take photo</Button><Button variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}><ImageIcon /> Choose from gallery</Button>{avatarUrl && <Button variant="ghost" disabled={uploading} onClick={removePhoto}><TrashIcon /> Remove photo</Button>}<Button variant="ghost" onClick={() => setSheetOpen(false)}>Cancel</Button>{uploading && <p className="profile-uploading">Uploading your picture…</p>}{uploadError && <p role="alert" className="profile-uploading text-destructive">{uploadError}</p>}</div></SheetContent></Sheet><input ref={fileRef} className="sr-only" type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) upload(file); }} />
  </div>;
}
function ProfileDestination({ screen, user, supabase, checkins, preferences, updatePreferences, displayName, setDisplayName, onBack, signOut }: any) {
  const [selected, setSelected] = useState<Checkin | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const title = screen === "history" ? "Reflection history" : screen === "preferences" ? "Preferences" : screen === "privacy" ? "Privacy & security" : "About Small Steps";
  const saveName = async () => { if (!user || !supabase) return; const result = await supabase.from("profiles").upsert({ id: user.id, display_name: displayName.trim().slice(0, 40) }); if (result.error) toast.error("Could not update your name."); else toast.success("Name updated."); };
  const rows = Array.isArray(checkins) ? [...checkins].filter(Boolean).sort((a, b) => String(b?.checkin_date || "").localeCompare(String(a?.checkin_date || ""))) : [];
  if (screen === "history") return <div className="profile-screen flex flex-col gap-5"><ProfileBack title={title} onBack={onBack} />{rows.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground">No reflections yet. Your daily check-ins will appear here.</CardContent></Card> : rows.map((entry: Checkin) => <button type="button" key={entry?.id ?? entry?.checkin_date} className="profile-menu text-left" onClick={() => setSelected(entry)}><span className="text-2xl">{moods[Math.max(0, Math.min(4, (entry?.mood || 3) - 1))]}</span><span><strong>{entry?.checkin_date || "Date unavailable"}</strong><small>Proud of: {entry?.win || "Not added"}<br />Challenge: {entry?.improve || "Not added"}<br />Tomorrow priority: {entry?.tomorrow_priority || "Not added"}</small></span><ChevronDown /></button>)}{selected && <Card><CardHeader><CardTitle>Complete reflection</CardTitle></CardHeader><CardContent className="flex flex-col gap-2"><p>{selected?.win || "No proud moment added."}</p><p>{selected?.improve || "No challenge added."}</p><p className="text-sm text-muted-foreground">{selected?.ai_reflection || selected?.daily_thought || "No AI reflection or daily thought available."}</p><Button variant="outline" onClick={() => setSelected(null)}>Close</Button></CardContent></Card>}</div>;
  if (screen === "preferences") return <div className="profile-screen flex flex-col gap-5"><ProfileBack title={title} onBack={onBack} /><Card><CardContent className="flex flex-col gap-5 p-5"><SettingSelect label="Theme" value={preferences.theme || "System"} values={["System", "Light", "Dark"]} onChange={(theme: string) => updatePreferences({ theme })} /><SettingSelect label="Daily reminder time" value={preferences.reminderTime} values={["07:00", "08:00", "09:00", "18:00", "20:00"]} onChange={(reminderTime: string) => updatePreferences({ reminderTime })} /><SettingSelect label="Start of week" value={preferences.weekStarts} values={["Monday", "Sunday"]} onChange={(weekStarts: string) => updatePreferences({ weekStarts })} /><SettingSelect label="First day of month" value={preferences.monthStarts} values={["1", "2", "15"]} onChange={(monthStarts: string) => updatePreferences({ monthStarts })} /><SettingToggle label="Reminders on" value={preferences.reminderEnabled} onChange={(reminderEnabled: boolean) => updatePreferences({ reminderEnabled })} /><SettingToggle label="Haptic feedback" value={preferences.haptics} onChange={(haptics: boolean) => updatePreferences({ haptics })} /><SettingToggle label="Animations" value={preferences.animations} onChange={(animations: boolean) => updatePreferences({ animations })} /><SettingSelect label="Language" value={preferences.language} values={["English"]} onChange={(language: string) => updatePreferences({ language })} /><p className="text-sm text-muted-foreground">Auto-save is on. Preferences are saved automatically.</p></CardContent></Card></div>;
  if (screen === "privacy") return <div className="profile-screen flex flex-col gap-5"><ProfileBack title={title} onBack={onBack} /><Card><CardContent className="flex flex-col gap-3 p-5"><Label>Display name</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} onBlur={saveName} /><Button variant="outline" onClick={() => toast.info("Choose a new picture from your profile card.")}>Change profile picture</Button><Button variant="outline" onClick={() => toast.info("Your personal data export is being prepared.")}>Export personal data</Button><Button variant="outline" onClick={() => toast.info("Privacy Policy and Terms of Service are available in the app release notes.")}>Privacy Policy & Terms of Service</Button><Button variant="outline" onClick={() => setConfirmDelete(true)}>Delete account</Button><Button onClick={signOut}>Sign out</Button></CardContent></Card><AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete your account?</AlertDialogTitle><AlertDialogDescription>This permanently removes your account and personal data.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={async () => { if (user && supabase) { const result = await supabase.auth.admin.deleteUser(user.id); if (result.error) toast.error("Account deletion requires support."); else await signOut(); } }}>Delete account</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>;
  return <div className="profile-screen flex flex-col gap-5"><ProfileBack title={title} onBack={onBack} /><Card><CardContent className="flex flex-col gap-4 p-6 text-center"><div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary text-primary-foreground"><Info /></div><h2 className="text-xl font-semibold">Small Steps</h2><p className="text-muted-foreground">A quieter way to grow, one honest day at a time.</p><p className="text-sm text-muted-foreground">Version 1.0.0</p><Button variant="outline" onClick={() => toast.success("Thanks for helping Small Steps grow.")}>What's new</Button><Button variant="outline" onClick={() => window.location.href = "mailto:support@smallsteps.app"}>Send feedback & contact support</Button><Button variant="outline" onClick={() => navigator.share?.({ title: "Small Steps", text: "A quieter way to grow." })}>Share the App</Button></CardContent></Card></div>;
}
function ProfileBack({ title, onBack }: any) { return <div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={onBack} aria-label="Back"><ChevronDown className="rotate-90" /></Button><h1 className="text-2xl font-semibold">{title}</h1></div>; }
function SettingSelect({ label, value, values, onChange }: any) { return <div className="flex items-center justify-between gap-4"><Label>{label}</Label><Select value={value} onValueChange={(v) => v && onChange(v)}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{values.map((item: string) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>; }
function SettingToggle({ label, value, onChange }: any) { return <button type="button" className="flex items-center justify-between rounded-xl border p-3 text-left" onClick={() => onChange(!value)}><span>{label}</span><span className="text-sm text-muted-foreground">{value ? "On" : "Off"}</span></button>; }
function ProfileStat({ icon: Icon, label, value }: any) { return <div className="profile-stat"><Icon /><span>{label}</span><strong>{value}</strong></div>; }
function ProfileMenu({ icon: Icon, title, detail, onClick }: any) { return <button type="button" className="profile-menu" onClick={onClick}><span className="profile-menu-icon"><Icon /></span><span><strong>{title}</strong><small>{detail}</small></span><ChevronDown /></button>; }

function You({
  user,
  displayName,
  profileDraft,
  setProfileDraft,
  saveProfile,
  dateOfBirth,
  birthMonth,
  setBirthMonth,
  birthDay,
  setBirthDay,
  birthYear,
  setBirthYear,
  saveBirth,
  countdowns,
  onAddCountdown,
  onEditCountdown,
  onDeleteCountdown,
  onFeature,
  checkins,
  onEditCheckin,
  onDeleteCheckin,
  signOut,
}: any) {
  const safeCountdowns = Array.isArray(countdowns) ? countdowns.filter(Boolean) : [];
  const safeCheckins = Array.isArray(checkins) ? checkins.filter(Boolean) : [];
  const select = (
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    values: string[],
  ) => (
    <Select
      value={value}
      onValueChange={(v: string | null) => {
        if (v) onChange(v);
      }}
    >
      <SelectTrigger className="h-12 rounded-xl">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {values.map((v) => (
          <SelectItem key={v} value={v}>
            {v}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
  return (
    <div className="screen flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground font-semibold">
            {(displayName || user?.email || "?")[0]?.toUpperCase() || "?"}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <label htmlFor="display-name">Display name</label>
            <Input
              id="display-name"
              value={profileDraft}
              onChange={(e) => setProfileDraft(e.target.value)}
              placeholder="Display name"
            />
            <p className="break-all text-sm text-muted-foreground">
              {user.email}
            </p>
            <Button
              variant="outline"
              className="h-10 self-start"
              onClick={saveProfile}
            >
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Countdowns</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {safeCountdowns.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-5 text-center text-sm text-muted-foreground">
              No countdowns yet. Create one to stay motivated.
            </div>
          ) : (
            safeCountdowns.map((c: Countdown) => {
              const targetAt = c?.target_at;
              const targetDate = targetAt ? new Date(targetAt) : null;
              const hasValidTarget = targetDate && !Number.isNaN(targetDate.getTime());
              return (
                <div
                  key={c?.id ?? targetAt ?? c?.title ?? "countdown"}
                  className="flex items-center justify-between gap-3 rounded-2xl border p-3"
                >
                  <div>
                    <p className="font-medium">{c?.title || "Untitled countdown"}</p>
                    <p className="text-sm text-muted-foreground">
                      {hasValidTarget ? `Until ${formatDate(targetDate)}` : "Target date not set"}
                      {c?.is_featured ? " · Featured" : ""}
                    </p>
                  </div>
                  <CountdownActions
                    countdown={c}
                    onEdit={() => onEditCountdown?.(c)}
                    onDelete={() => onDeleteCountdown?.(c)}
                    onFeature={() => onFeature?.(c)}
                  />
                </div>
              );
            })
          )}
          <Button variant="outline" onClick={onAddCountdown}>
            <Plus /> Add countdown
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {safeCheckins.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-5 text-center text-sm text-muted-foreground">
              No reflections yet.
            </div>
          ) : safeCheckins.map((c: Checkin) => (
            <div
              key={c?.id ?? c?.created_at ?? "checkin"}
              className="flex items-start gap-3 rounded-2xl border p-3"
            >
              <span className="text-xl">{moods[(c?.mood ?? 3) - 1] || moods[2]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">
                  {c?.created_at ? formatDate(new Date(c.created_at)) : "Date unavailable"}
                </p>
                <p>{c?.win || "No note added."}</p>
                {c?.improve && (
                  <p className="text-sm text-muted-foreground">{c.improve}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEditCheckin(c)}
                aria-label="Edit check-in"
              >
                <Ellipsis />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDeleteCheckin(c)}
                aria-label="Delete check-in"
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
      {!dateOfBirth && (
        <Card>
          <CardHeader>
            <CardTitle>When were you born?</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2">
            {select(
              birthMonth,
              setBirthMonth,
              "Month",
              Array.from({ length: 12 }, (_, i) => String(i + 1)),
            )}
            {select(
              birthDay,
              setBirthDay,
              "Day",
              Array.from({ length: 31 }, (_, i) => String(i + 1)),
            )}
            {select(
              birthYear,
              setBirthYear,
              "Year",
              Array.from({ length: 100 }, (_, i) =>
                String(new Date().getFullYear() - i),
              ),
            )}
            <Button className="col-span-3" onClick={saveBirth}>
              Save birth date
            </Button>
          </CardContent>
        </Card>
      )}
      <Button variant="outline" onClick={signOut}>
        Sign out
      </Button>
    </div>
  );
}
function GoalSheet({ open, onOpenChange, goal, saveGoal, saving }: any) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>
            {goal ? "Edit goal" : "What are you moving toward?"}
          </SheetTitle>
          <SheetDescription>
            Give your goal a reason and an identity.
          </SheetDescription>
        </SheetHeader>
        <form className="mt-6 flex flex-col gap-4" onSubmit={saveGoal}>
          <Label>
            What are you moving toward?
            <Input
              name="title"
              className="h-12"
              defaultValue={goal?.title || ""}
              required
            />
          </Label>
          <Label>
            Why does it matter?
            <Textarea
              name="why"
              rows={3}
              className="rounded-2xl"
              defaultValue={goal?.why || ""}
              required
            />
          </Label>
          <Label>
            I&apos;m becoming someone who...
            <Input
              name="identity"
              className="h-12"
              defaultValue={goal?.identity || ""}
            />
          </Label>
          <Button disabled={saving}>
            {saving ? "Saving…" : goal ? "Update goal" : "Save goal"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
function DateSelect({
  month,
  day,
  year,
  onMonthChange,
  onDayChange,
  onYearChange,
}: any) {
  const currentYear = new Date().getFullYear();
  const daysInMonth =
    month && year ? new Date(Number(year), Number(month), 0).getDate() : 31;
  const field = (
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
    options: { value: string; label: string }[],
  ) => (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
        className="h-12 w-full appearance-none rounded-xl border border-border bg-card px-3 pr-10 text-base"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
  const months = Array.from({ length: 12 }, (_, index) => ({
    value: String(index + 1),
    label: new Intl.DateTimeFormat("en-US", { month: "long" }).format(
      new Date(2020, index, 1),
    ),
  }));
  const days = Array.from({ length: daysInMonth }, (_, index) => ({
    value: String(index + 1),
    label: String(index + 1),
  }));
  const years = Array.from({ length: 51 }, (_, index) => ({
    value: String(currentYear + index),
    label: String(currentYear + index),
  }));
  return (
    <div className="grid grid-cols-3 gap-2">
      {field(month, onMonthChange, "Month", months)}
      {field(day, onDayChange, "Day", days)}
      {field(year, onYearChange, "Year", years)}
    </div>
  );
}

function CountdownSheet({
  open,
  onOpenChange,
  title,
  setTitle,
  choice,
  setChoice,
  targetDate,
  setTargetDate,
  month,
  setMonth,
  day,
  setDay,
  year,
  setYear,
  save,
  error,
  saving,
}: any) {
  const todayDate = new Date(),
    currentYear = todayDate.getFullYear(),
    daysInMonth = month && year ? new Date(+year, +month, 0).getDate() : 31;
  const chooseYears = (value: "1y" | "3y" | "5y" | "10y") => {
    const next = new Date();
    next.setFullYear(next.getFullYear() + Number(value.replace("y", "")));
    setChoice(value);
    setTargetDate(next);
    setMonth("");
    setDay("");
    setYear("");
  };
  const chooseCustom = () => {
    setChoice("custom");
    setTargetDate(null);
  };
  const updateDate = (part: "month" | "day" | "year", value: string) => {
    const nextMonth = part === "month" ? value : month,
      nextDay = part === "day" ? value : day,
      nextYear = part === "year" ? value : year;
    if (part === "month") setMonth(value);
    if (part === "day") setDay(value);
    if (part === "year") setYear(value);
    if (nextMonth && nextDay && nextYear) {
      const next = new Date(+nextYear, +nextMonth - 1, +nextDay);
      if (
        next.getFullYear() !== +nextYear ||
        next.getMonth() !== +nextMonth - 1 ||
        next.getDate() !== +nextDay ||
        next <= new Date()
      ) {
        setTargetDate(null);
        return;
      }
      setTargetDate(next);
    } else setTargetDate(null);
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="pb-[calc(1rem+env(safe-area-inset-bottom)+4.5rem)]"
      >
        <SheetHeader>
          <SheetTitle>Set a countdown</SheetTitle>
        </SheetHeader>
        <div className="mt-6 flex flex-col gap-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className={
                choice === "1y"
                  ? "h-10 rounded-full border-primary bg-primary text-primary-foreground"
                  : "h-10 rounded-full"
              }
              onClick={() => chooseYears("1y")}
            >
              1 year
            </Button>
            <Button
              type="button"
              variant="outline"
              className={
                choice === "3y"
                  ? "h-10 rounded-full border-primary bg-primary text-primary-foreground"
                  : "h-10 rounded-full"
              }
              onClick={() => chooseYears("3y")}
            >
              3 years
            </Button>
            <Button
              type="button"
              variant="outline"
              className={
                choice === "5y"
                  ? "h-10 rounded-full border-primary bg-primary text-primary-foreground"
                  : "h-10 rounded-full"
              }
              onClick={() => chooseYears("5y")}
            >
              5 years
            </Button>
            <Button
              type="button"
              variant="outline"
              className={
                choice === "10y"
                  ? "h-10 rounded-full border-primary bg-primary text-primary-foreground"
                  : "h-10 rounded-full"
              }
              onClick={() => chooseYears("10y")}
            >
              10 years
            </Button>
            <Button
              type="button"
              variant="outline"
              className={
                choice === "custom"
                  ? "h-10 rounded-full border-primary bg-primary text-primary-foreground"
                  : "h-10 rounded-full"
              }
              onClick={chooseCustom}
            >
              Pick a date
            </Button>
          </div>
          {choice === "custom" && (
            <DateSelect
              month={month}
              day={day}
              year={year}
              onMonthChange={(v: string) => updateDate("month", v)}
              onDayChange={(v: string) => updateDate("day", v)}
              onYearChange={(v: string) => updateDate("year", v)}
            />
          )}
          {targetDate && (
            <p className="text-sm text-muted-foreground">
              Counting down to {formatDate(targetDate)}
            </p>
          )}
          {choice === "custom" && month && day && year && !targetDate && (
            <p className="text-sm text-red-600">Choose a future date</p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="button" disabled={saving} onClick={save}>
            {saving ? "Saving..." : "Save countdown"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
void intervalToDuration;
