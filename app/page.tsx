"use client";

import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { intervalToDuration } from "date-fns";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoginForm } from "@/components/auth-form";
import { PageWrapper } from "@/components/page-wrapper";
import { CountdownRing } from "@/components/countdown-ring";
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
type Goal = {
  id: string;
  title: string;
  why: string | null;
  identity?: string | null;
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
  is_featured?: boolean;
};
type Checkin = {
  id: string;
  checkin_date: string;
  mood: number;
  win: string | null;
  improve: string | null;
  created_at: string;
};
const moodNames = ["Low", "Down", "Okay", "Good", "Happy"];
const localDateKey = (value = new Date()) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const today = () => localDateKey();
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
  const [displayName, setDisplayName] = useState(""),
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
        supabase.from("profiles").select("display_name,date_of_birth").eq("id", auth.user.id).maybeSingle(),
        supabase.from("goals").select("id,title,why,identity").eq("user_id", auth.user.id),
        supabase.from("habits").select("id,name,goal_id,weekly_target").eq("user_id", auth.user.id),
        supabase.from("countdowns").select("id,title,target_at,is_featured").eq("user_id", auth.user.id),
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
      .select("id,title,target_at,is_featured")
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
  async function addSuggestedTask(title: string) {
    const result = await supabase
      .from("daily_tasks")
      .insert({ user_id: user.id, task_date: today(), title, priority: "mid" })
      .select("id,user_id,task_date,title,goal_id,due_at,completed_at,description,priority")
      .single();
    if (!(await saveResult(result, "Task added."))) return;
    setDailyTasks((v) => [...v, result.data]);
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
      improvement: improve.trim() || null,
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
        <header className="topbar">
          <div className="topbar-greeting-wrap">
            <p className="topbar-greeting">
              {displayName ? `${greeting()}, ${normalizedDisplayName}` : greeting()}
            </p>
            <p className="date">{dateLabel()}</p>
          </div>
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
        <section className="content">
          {tab === "today" && (
            <Today
              goals={goals}
              actions={actions}
              doneToday={doneToday}
              incomplete={incomplete}
              countdown={featured}
              dailyHeadline={dailyHeadline()}
              countdowns={countdowns}
              toggleAction={toggleAction}
  dailyTasks={dailyTasks}
  onAddSuggestedTask={addSuggestedTask}
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
              onOpenTask={(task: DailyTask) => setDetailTask(task)}
              toggleDailyTask={toggleDailyTask}
              onDeleteTask={askDeleteTask}
              onAddCountdown={() => {
                setEditingCountdown(null);
                setCountdownOpen(true);
              }}
              onEditCountdown={(c: Countdown) => {
                setEditingCountdown(c);
                setCountdownTitle(c.title);
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
            <Goals
              goals={goals}
              actions={actions}
              toggleAction={toggleAction}
              onAddGoal={() => {
                setEditingGoal(null);
                setGoalOpen(true);
              }}
              onEditGoal={(g: Goal) => {
                setEditingGoal(g);
                setGoalOpen(true);
              }}
              onDelete={(g: Goal) =>
                setConfirm({
                  title: "Delete goal?",
                  description: "This also removes its actions.",
                  action: () => deleteGoal(g),
                })
              }
              onAddAction={(id: string) => {
                setEditingAction(null);
                setActionGoal(id);
              }}
              onEditAction={(a: Action) => {
                setEditingAction(a);
                setActionGoal(a.goal_id);
              }}
              onDeleteAction={(a: Action) =>
                setConfirm({
                  title: "Delete action?",
                  description:
                    "Your check-in history for this action will be removed.",
                  action: () => deleteAction(a),
                })
              }
              actionGoal={actionGoal}
              addAction={addAction}
              saving={saving}
            />
          )}
          {tab === "you" && (
            <You
              user={user}
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
              goals={goals}
              actions={actions}
              countdowns={countdowns}
              onAddCountdown={() => {
                setEditingCountdown(null);
                setCountdownOpen(true);
              }}
              onEditCountdown={(c: Countdown) => {
                setEditingCountdown(c);
                setCountdownTitle(c.title);
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
              checkins={checkins.slice(0, 20)}
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
  const safeSetTitle = typeof setTitle === "function" ? setTitle : () => {};
  const safeSetDescription = typeof setDescription === "function" ? setDescription : () => {};
  const safeSetDue = typeof setDue === "function" ? setDue : () => {};
  const safeSetPriority = typeof setPriority === "function" ? setPriority : () => {};
  const safeSave = typeof save === "function" ? save : () => {};
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
        <Label>Task<Input className="mt-2 h-12" value={title} onChange={(e) => safeSetTitle(e.target.value)} /></Label>
        <Label>Details (optional)
          <Textarea className="mt-2 min-h-24 rounded-2xl border-border bg-card px-4 py-3 text-base" placeholder="Add notes, steps or anything you want to remember" value={description} onChange={(e) => safeSetDescription(e.target.value)} />
        </Label>
        <Label>Priority
          <div className="mt-2 grid grid-cols-4 gap-2">
            {(["low", "mid", "high", "urgent"] as const).map((value) => <button key={value} type="button" data-selected={priority === value} className={`h-11 rounded-full border text-sm font-medium capitalize transition-colors ${priorityStyles[value]}`} onClick={() => safeSetPriority(value)}>{value}</button>)}
          </div>
        </Label>
        <Label>Finish before
          <div className="mt-2 grid grid-cols-3 gap-2">
            <select aria-label="Hour" className="h-12 rounded-xl border border-border bg-card px-3" value={due ? due.split(":")[0] : ""} onChange={(e) => { const p = due ? due.split(":") : ["", "00", "AM"]; safeSetDue(e.target.value ? `${e.target.value}:${p[1] || "00"}:${p[2] || "AM"}` : ""); }}><option value="">No deadline</option>{Array.from({length: 12}, (_, i) => <option key={i + 1}>{i + 1}</option>)}</select>
            <select aria-label="Minute" className="h-12 rounded-xl border border-border bg-card px-3" value={due ? due.split(":")[1] : ""} onChange={(e) => { const p = due ? due.split(":") : ["12", "", "AM"]; setDue(e.target.value ? `${p[0] || "12"}:${e.target.value}:${p[2] || "AM"}` : ""); }}><option value="">Minute</option>{Array.from({length: 12}, (_, i) => <option key={i}>{String(i * 5).padStart(2, "0")}</option>)}</select>
            <select aria-label="AM or PM" className="h-12 rounded-xl border border-border bg-card px-3" value={due ? due.split(":")[2] : ""} onChange={(e) => { const p = due ? due.split(":") : ["12", "00", ""]; setDue(e.target.value ? `${p[0] || "12"}:${p[1] || "00"}:${e.target.value}` : ""); }}><option value="">AM/PM</option><option>AM</option><option>PM</option></select>
          </div>
        </Label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="button" disabled={saving} onClick={safeSave}>{saving ? "Saving…" : "Save task"}</Button>
      </div>
    </SheetContent>
  </Sheet>;
}

function ActionRow({ action, toggleAction = () => {}, onEdit = () => {}, onDelete = () => {} }: any) {
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
function CountdownActions({ countdown, onEdit = () => {}, onDelete = () => {}, onFeature = () => {} }: any) {
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
  onEditTask,
  toggleDailyTask,
  onDeleteTask,
  onOpenTask,
}: any) {
  return (
    <div className="screen flex flex-col gap-6">
      <div className="today-greeting">
        <h1>{dailyHeadline}</h1>
        <p className="muted">
          {dailyTasks.length === 0
            ? "Add one small task to begin."
            : dailyTasks.every((task: DailyTask) => task.completed_at)
              ? "All done for today. Well earned."
              : `${dailyTasks.filter((task: DailyTask) => !task.completed_at).length} ${dailyTasks.filter((task: DailyTask) => !task.completed_at).length === 1 ? "task" : "tasks"} waiting. Start with the most urgent one.`}
        </p>
      </div>
      {countdown ? (
        <Card>
          <CardHeader className="items-center">
            <div className="flex w-full items-center justify-between">
              <CardDescription>Featured countdown</CardDescription>
              <CountdownActions
                countdown={countdown}
                onEdit={() => onEditCountdown(countdown)}
                onDelete={() => onDelete(countdown)}
                onFeature={() => onFeature(countdown)}
              />
            </div>
            <CountdownRing countdown={countdown} />
          </CardHeader>
          <CardFooter>
            <Button
              variant="ghost"
              className="mx-auto"
              onClick={onAddCountdown}
            >
              Add countdown
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardDescription>Featured countdown</CardDescription>
            <CardTitle>Pick a date you&apos;re working toward.</CardTitle>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" onClick={onAddCountdown}>
              Set a countdown
            </Button>
          </CardFooter>
        </Card>
      )}
      <DailyTasksCard tasks={dailyTasks} goals={goals} onAddTask={onAddTask} onAddSuggestedTask={onAddSuggestedTask} onEditTask={onEditTask} toggleTask={toggleDailyTask} onDeleteTask={onDeleteTask} onOpenTask={onOpenTask} />
      <Card className={checkinSaved ? "animate-in fade-in zoom-in-95 duration-500 motion-reduce:animate-none" : ""}>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardDescription>Evening check-in</CardDescription>
              <CardTitle>{todayCheckin ? "You showed up for yourself today" : "How are you feeling?"}</CardTitle>
            </div>
            {todayCheckin && <span className="grid size-7 place-items-center rounded-full bg-emerald-600 text-white"><Check aria-hidden="true" /></span>}
          </div>
        </CardHeader>
        {todayCheckin && !editingCheckin ? (
          <>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-3"><span className="text-4xl" aria-label={moodNames[todayCheckin.mood - 1]}>{moods[todayCheckin.mood - 1]}</span><span>You felt <strong>{moodNames[todayCheckin.mood - 1]}</strong></span></div>
              {todayCheckin.win && <div><p className="text-sm font-medium">Today&apos;s win</p><p className="text-muted-foreground">{todayCheckin.win}</p></div>}
              {todayCheckin.improve && <div><p className="text-sm font-medium">Gentler tomorrow</p><p className="text-muted-foreground">{todayCheckin.improve}</p></div>}
              <div className="rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">{checkinStreak(checkins) >= 2 ? `${checkinStreak(checkins)} days in a row. Come back tomorrow to keep it going.` : "First day logged. See you tomorrow."}</div>
            </CardContent>
            <CardFooter className="justify-between"><span className="text-sm text-muted-foreground">Saved {clockTime(todayCheckin.created_at)}</span><Button variant="ghost" size="sm" onClick={() => onEditCheckin(todayCheckin)}>Edit reflection</Button></CardFooter>
          </>
        ) : (
          <form onSubmit={saveCheckin}>
            <CardContent className="flex flex-col gap-4">
              {editingCheckin && <p className="text-sm font-medium text-muted-foreground">Editing {formatDate(new Date(`${editingCheckin.checkin_date}T12:00:00`))}</p>}
              <div>
                <div className="flex justify-between">{moods.map((m, i) => <Button key={m} type="button" variant="ghost" className={`text-2xl transition-opacity ${mood && mood !== i + 1 ? "opacity-50" : ""} ${mood === i + 1 ? "scale-110 rounded-full bg-emerald-100 dark:bg-emerald-950/50" : ""}`} aria-label={moodNames[i]} onClick={() => setMood(i + 1)}>{m}</Button>)}</div>
                {mood > 0 && <p className="text-center text-xs text-muted-foreground">{moodNames[mood - 1]}</p>}
              </div>
              <Textarea className="min-h-16" placeholder="One win from today, however small" value={win} onChange={(e) => setWin(e.target.value)} />
              <Textarea className="min-h-16" placeholder="One thing to make tomorrow gentler" value={improve} onChange={(e) => setImprove(e.target.value)} />
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-2"><Button className="w-full">Save check-in</Button>{checkinError && <p className="text-center text-sm text-destructive">{checkinError}</p>}{editingCheckin && <Button type="button" variant="outline" onClick={() => { setEditingCheckin(null); setMood(0); setWin(""); setImprove(""); }}>Cancel</Button>}</CardFooter>
          </form>
        )}
      </Card>
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
function DailyTasksCard({
  tasks,
  onAddTask,
  onAddSuggestedTask,
  onEditTask,
  toggleTask,
  onDeleteTask,
  onOpenTask,
}: {
  tasks: DailyTask[];
  goals?: Goal[];
  onAddTask: () => void;
  onAddSuggestedTask: (title: string) => void;
  onEditTask: (task: DailyTask) => void;
  toggleTask: (task: DailyTask) => void;
  onDeleteTask: (task: DailyTask) => void;
  onOpenTask: (task: DailyTask) => void;
}) {
  const now = useNow();
  const ordered = [...tasks].sort(
    (a, b) =>
      Number(Boolean(a.completed_at)) - Number(Boolean(b.completed_at)) ||
      TASK_RANK[a.priority || "mid"] - TASK_RANK[b.priority || "mid"] ||
      (a.due_at ? new Date(a.due_at).getTime() : Infinity) -
        (b.due_at ? new Date(b.due_at).getTime() : Infinity),
  );
  const done = tasks.filter((t) => t.completed_at).length;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardDescription>Today&apos;s actions</CardDescription>
              <CardTitle>
                {tasks.length > 0 && done === tasks.length ? (
                  <span className="flex items-center gap-2"><Check className="text-emerald-600" aria-hidden="true" />All done for today</span>
                ) : (
                  `${done} of ${tasks.length} done`
                )}
              </CardTitle>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: tasks.length ? `${(done / tasks.length) * 100}%` : "0%",
                }}
              />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onAddTask}>
            Add task
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {ordered.length ? (
          ordered.map((task) => {
            const priority = task.priority || "mid";
            const isDone = Boolean(task.completed_at);
            return (
              <div
                key={task.id}
                onClick={() => onOpenTask(task)}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition-colors duration-300 motion-reduce:transition-none ${
                  isDone
                    ? "border-emerald-300/70 bg-emerald-50 dark:bg-emerald-950/30"
                    : "border-border/60 bg-card"
                }`}
              >
                <button
                  type="button"
                  aria-label={
                    isDone ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTask(task);
                  }}
                  className={`flex size-11 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition-all duration-300 active:scale-90 motion-reduce:transition-none ${
                    isDone
                      ? "bg-emerald-600"
                      : `bg-gradient-to-br ${TASK_RING[priority]} ring-4 ring-black/5`
                  }`}
                >
                  <Check
                    className={isDone ? "size-6" : "size-5 opacity-60"}
                    strokeWidth={isDone ? 3 : 2.5}
                  />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenTask(task);
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${TASK_TAB[priority]}`}
                    >
                      {priority}
                    </span>
                    {task.description && (
                      <FileText
                        className="size-3.5 text-muted-foreground"
                        aria-label="Has details"
                      />
                    )}
                  </span>
                  <span
                    className={`mt-1 block break-words font-medium ${
                      isDone ? "text-muted-foreground line-through" : ""
                    }`}
                  >
                    {task.title}
                  </span>
                  {isDone ? (
                    <span className="block text-xs">
                      <DoneLine task={task} />
                    </span>
                  ) : (
                    task.due_at && (
                      <span className={`block text-xs ${timeLeftClass(task.due_at, now)}`}>
                        {timeLeft(task.due_at, now)}
                      </span>
                    )
                  )}
                </button>
                <div onClick={(e) => e.stopPropagation()}>
                  <ActionMenu>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${task.title}`}
                      onClick={() => onEditTask(task)}
                    >
                      <Ellipsis />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${task.title}`}
                      onClick={() => onDeleteTask(task)}
                    >
                      <Trash2 />
                    </Button>
                  </ActionMenu>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">What will you do today?</p>
            <div className="flex flex-wrap justify-center gap-2">
              {["Drink water", "Walk for 15 minutes", "Read 10 pages", "Plan tomorrow"].map((suggestion) => (
                <Button key={suggestion} variant="outline" size="sm" onClick={() => onAddSuggestedTask(suggestion)}>
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
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
function Goals({
  goals,
  actions,
  toggleAction,
  onAddGoal,
  onEditGoal,
  onDelete,
  onAddAction,
  onEditAction,
  onDeleteAction,
  actionGoal,
  addAction,
  saving,
}: any) {
  return (
    <div className="screen flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow">What matters</p>
          <h1>Your goals.</h1>
          <p className="muted">Small actions, meaningful direction.</p>
        </div>
        <Button
          size="icon"
          className="rounded-full"
          onClick={onAddGoal}
          aria-label="Add goal"
        >
          <Plus />
        </Button>
      </div>
      {goals.map((goal: Goal) => (
        <Card key={goal.id} id={`goal-${goal.id}`} className="rounded-3xl">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="font-serif">{goal.title}</CardTitle>
                {goal.identity && (
                  <CardDescription className="italic">
                    {goal.identity}
                  </CardDescription>
                )}
              </div>
              <ActionMenu>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEditGoal(goal)}
                  aria-label={`Edit ${goal.title}`}
                >
                  <Ellipsis />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(goal)}
                  aria-label={`Delete ${goal.title}`}
                >
                  <Trash2 />
                </Button>
              </ActionMenu>
            </div>
            {goal.why && <CardDescription>{goal.why}</CardDescription>}
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {actions
              .filter((a: Action) => a.goal_id === goal.id)
              .map((a: Action) => (
                <ActionRow
                  key={a.id}
                  action={a}
                  toggleAction={toggleAction}
                  onEdit={() => onEditAction(a)}
                  onDelete={() => onDeleteAction(a)}
                />
              ))}
            {actionGoal === goal.id && (
              <form
                className="flex flex-col gap-4 rounded-2xl border p-4"
                onSubmit={(e) => addAction(e, goal.id)}
              >
                <Label>
                  What small action moves this forward?
                  <Input
                    name="name"
                    defaultValue={editingValue(actionGoal, actions)}
                    required
                  />
                </Label>
                <Label>
                  Weekly target (1–7 days)
                  <Input
                    name="weekly_target"
                    type="number"
                    min="1"
                    max="7"
                    defaultValue="3"
                  />
                </Label>
                <Button disabled={saving}>
                  {saving ? "Saving…" : "Save action"}
                </Button>
              </form>
            )}
            <Button
              variant="outline"
              className="h-10"
              onClick={() => onAddAction(goal.id)}
            >
              {actionGoal === goal.id ? "Cancel" : "Add action"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
function editingValue(_: any, __: any) {
  return "";
}
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
            {(displayName || user.email || "?")[0].toUpperCase()}
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
          {countdowns.map((c: Countdown) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-2xl border p-3"
            >
              <div>
                <p className="font-medium">{c.title}</p>
                <p className="text-sm text-muted-foreground">
                  Until {formatDate(new Date(c.target_at))}
                  {c.is_featured ? " · Featured" : ""}
                </p>
              </div>
              <CountdownActions
                countdown={c}
                onEdit={() => onEditCountdown(c)}
                onDelete={() => onDeleteCountdown(c)}
                onFeature={() => onFeature(c)}
              />
            </div>
          ))}
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
          {checkins.map((c: Checkin) => (
            <div
              key={c.id}
              className="flex items-start gap-3 rounded-2xl border p-3"
            >
              <span className="text-xl">{moods[c.mood - 1] || moods[2]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">
                  {formatDate(new Date(c.created_at))}
                </p>
                <p>{c.win || "No note added."}</p>
                {c.improve && (
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
