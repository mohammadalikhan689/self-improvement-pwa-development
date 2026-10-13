"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Clock, Pencil, Plus, Target, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  type ActionLite,
  type GoalLite,
  type PlanItem,
  type Priority,
  type TaskLite,
  actionNote,
  buildPlan,
  dueLabel,
  focusPick,
  goalThemes,
  planLine,
  planScore,
} from "@/lib/plan";

// Section 2 of the Today screen: one plan for the day.
// Goal actions that are still needed this week and one-off tasks live in a single list.
// Each row wears its goal's colour. A ring fills as you go.

type Props = {
  tasks: TaskLite[];
  goals: GoalLite[];
  actions: ActionLite[];
  toggleTask: (task: any) => void;
  toggleAction: (action: any) => void;
  onQuickAdd: (title: string) => void;
  onAddTask: () => void;
  onOpenTask: (task: any) => void;
  onUpdateAction: (action: ActionLite, name: string, weeklyTarget: number) => Promise<void>;
  onOpenGoals: () => void;
  /** Test hook: pin the clock. */
  nowOverride?: Date;
};

const PRIORITY_COLORS: Record<Priority, { a: string; b: string }> = {
  low: { a: "#3f94d4", b: "#4cc3b4" },
  mid: { a: "#4f9a62", b: "#8cc96a" },
  high: { a: "#e0902a", b: "#f2c04a" },
  urgent: { a: "#d9453a", b: "#f0803a" },
};

const css = `
.pl-wrap, .pl-wrap *, .pl-wrap *::before, .pl-wrap *::after { box-sizing:border-box; }
.pl-wrap { position:relative; overflow:hidden; border-radius:28px; border:1px solid var(--border); background:var(--card); color:var(--foreground); box-shadow:0 12px 34px rgba(30,24,60,.1); padding:1.15rem; display:flex; flex-direction:column; gap:.95rem; }
.pl-wrap p { margin:0; }
.pl-wrap button, .pl-wrap input { font-family:inherit; }
.pl-head { display:flex; align-items:center; justify-content:space-between; gap:1rem; }
.pl-eyebrow { font-size:.66rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--primary); }
.pl-title { margin:.2rem 0 0; font-family:Georgia,'Times New Roman',serif; font-size:1.6rem; line-height:1.1; letter-spacing:-.02em; font-weight:400; }
.pl-sub { margin-top:.3rem; font-size:.85rem; color:var(--muted-foreground); }
.pl-ring { position:relative; flex:0 0 auto; width:4.6rem; height:4.6rem; }
.pl-ring svg { width:100%; height:100%; transform:rotate(-90deg); overflow:visible; }
.pl-ring .pct { position:absolute; inset:0; display:grid; place-items:center; font-weight:700; font-size:1rem; font-variant-numeric:tabular-nums; }
.pl-ring .pct svg { width:1.6rem; height:1.6rem; transform:none; color:#2f9e6b; }
.pl-add { display:flex; align-items:center; gap:.5rem; }
.pl-wrap .pl-add input.pl-input { flex:1; min-width:0; height:3rem; border-radius:999px; padding:0 1.1rem; font-size:1rem; margin:0; border:1px solid var(--border); outline:none; color:var(--foreground); background:color-mix(in srgb, var(--background) 70%, var(--card)); }
.pl-wrap .pl-add input.pl-input:focus { border-color:var(--primary); box-shadow:0 0 0 3px color-mix(in srgb, var(--primary) 22%, transparent); }
.pl-addbtn { flex:0 0 auto; display:grid; place-items:center; width:3rem; height:3rem; border:0; border-radius:999px; background:var(--primary); color:var(--primary-foreground); transition:transform .15s, opacity .2s; }
.pl-addbtn:disabled { opacity:.4; }
.pl-addbtn:active { transform:scale(.92); }
.pl-addbtn svg { width:20px; height:20px; }
.pl-tools { display:flex; align-items:center; justify-content:space-between; gap:.5rem; margin-top:-.3rem; }
.pl-link { border:0; background:transparent; color:var(--primary); font-size:.82rem; font-weight:600; min-height:2.4rem; padding:0 .2rem; }
.pl-pill { display:inline-flex; align-items:center; gap:.4rem; min-height:2.2rem; padding:0 .85rem; border-radius:999px; border:1px solid var(--border); background:transparent; color:var(--foreground); font-size:.82rem; font-weight:600; transition:background .2s, color .2s, border-color .2s; }
.pl-pill svg { width:15px; height:15px; }
.pl-pill.on { background:var(--primary); color:var(--primary-foreground); border-color:var(--primary); }
.pl-late { display:flex; align-items:center; gap:.5rem; padding:.55rem .85rem; border-radius:1rem; background:color-mix(in srgb, #d9453a 12%, var(--card)); border:1px solid color-mix(in srgb, #d9453a 35%, var(--border)); color:#b8372d; font-size:.85rem; font-weight:600; }
.dark .pl-late { color:#ffb4a8; }
.pl-late svg { width:16px; height:16px; flex:0 0 auto; }
.pl-list { display:flex; flex-direction:column; gap:.6rem; }
.pl-row { position:relative; display:flex; align-items:center; gap:.8rem; padding:.7rem .8rem .7rem 1rem; border-radius:1.2rem; border:1px solid var(--border); background:color-mix(in srgb, var(--background) 55%, var(--card)); transition:background .3s, border-color .3s, opacity .3s; }
.pl-row::before { content:""; position:absolute; left:0; top:.75rem; bottom:.75rem; width:4px; border-radius:0 4px 4px 0; background:var(--c, var(--primary)); }
.pl-row.done { opacity:.72; }
.pl-row.late { border-color:color-mix(in srgb, #d9453a 45%, var(--border)); }
.pl-check { position:relative; flex:0 0 auto; width:2.8rem; height:2.8rem; display:grid; place-items:center; border:0; border-radius:999px; color:#fff; background:var(--g); box-shadow:0 2px 8px color-mix(in srgb, var(--c) 35%, transparent); transition:transform .15s; }
.pl-check:active { transform:scale(.88); }
.pl-check svg { width:20px; height:20px; opacity:.6; }
.pl-row.done .pl-check { background:var(--c); box-shadow:none; }
.pl-row.done .pl-check svg { opacity:1; stroke-width:3.2; }
.pl-check.just::after { content:""; position:absolute; inset:-2px; border-radius:999px; border:2px solid var(--c); animation:pl-ripple .7s ease-out forwards; }
.pl-body { min-width:0; flex:1; text-align:left; background:transparent; border:0; padding:0; color:inherit; cursor:pointer; }
.pl-pencil { width:15px; height:15px; flex:0 0 auto; color:var(--muted-foreground); opacity:.7; }
.pl-name { display:block; font-weight:600; font-size:1rem; line-height:1.25; overflow-wrap:anywhere; }
.pl-row.done .pl-name { text-decoration:line-through; color:var(--muted-foreground); }
.pl-meta { display:flex; flex-wrap:wrap; align-items:center; gap:.2rem .6rem; margin-top:.25rem; font-size:.78rem; color:var(--muted-foreground); }
.pl-goal { display:inline-flex; align-items:center; gap:.35rem; max-width:100%; }
.pl-goal i { width:.55rem; height:.55rem; border-radius:999px; background:var(--c); flex:0 0 auto; }
.pl-goal span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pl-tone-overdue, .pl-tone-urgent { color:#c4382d; font-weight:700; }
.pl-tone-soon { color:#b97512; font-weight:600; }
.dark .pl-tone-overdue, .dark .pl-tone-urgent { color:#ff9d90; }
.dark .pl-tone-soon { color:#f0be66; }
.pl-must { color:#b97512; font-weight:700; }
.dark .pl-must { color:#f0be66; }
.pl-focus { position:relative; padding:1.3rem 1.15rem 1.15rem; border-radius:1.6rem; color:#fff; background:var(--g); box-shadow:0 14px 34px color-mix(in srgb, var(--c) 40%, transparent); display:flex; flex-direction:column; gap:.7rem; animation:pl-pop .45s cubic-bezier(.2,.9,.3,1.15) both; }
.pl-focus .k { font-size:.66rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; opacity:.85; }
.pl-focus .t { font-family:Georgia,'Times New Roman',serif; font-size:1.7rem; line-height:1.12; letter-spacing:-.02em; overflow-wrap:anywhere; text-shadow:0 1px 10px rgba(0,0,0,.18); }
.pl-focus .m { font-size:.88rem; opacity:.92; }
.pl-focus .go { display:flex; align-items:center; justify-content:center; gap:.5rem; min-height:3.2rem; border:0; border-radius:1rem; background:#fff; color:#1f2937; font-weight:700; font-size:1rem; }
.pl-focus .go svg { width:20px; height:20px; }
.pl-more { text-align:center; font-size:.82rem; color:var(--muted-foreground); }
.pl-donehead { display:flex; align-items:center; justify-content:space-between; width:100%; min-height:2.6rem; padding:0 .2rem; border:0; background:transparent; color:var(--muted-foreground); font-size:.82rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; }
.pl-donehead svg { width:16px; height:16px; transition:transform .25s; }
.pl-donehead.open svg { transform:rotate(180deg); }
.pl-empty { text-align:center; padding:.6rem .5rem .3rem; color:var(--muted-foreground); font-size:.9rem; line-height:1.5; }
.pl-empty b { display:block; font-family:Georgia,serif; font-weight:400; font-size:1.25rem; color:var(--foreground); margin-bottom:.2rem; }
.pl-conf { position:absolute; right:2.2rem; top:2.6rem; width:.5rem; height:.8rem; border-radius:2px; opacity:0; animation:pl-burst 1.7s cubic-bezier(.15,.8,.3,1) both; pointer-events:none; }
.pl-wrap.complete { border-color:color-mix(in srgb, #2f9e6b 45%, var(--border)); }
@keyframes pl-ripple { from { opacity:.9; transform:scale(1) } to { opacity:0; transform:scale(1.7) } }
@keyframes pl-pop { from { opacity:0; transform:scale(.96) translateY(6px) } to { opacity:1; transform:none } }
@keyframes pl-burst { 0% { opacity:1; transform:translate(0,0) rotate(0) } 100% { opacity:0; transform:translate(var(--x),var(--y)) rotate(var(--r)) } }
@media (prefers-reduced-motion:reduce) { .pl-check.just::after, .pl-focus, .pl-conf { animation:none; display:none; } .pl-focus { display:flex; } .pl-row, .pl-donehead svg { transition:none; } }
`;

const CONFETTI = Array.from({ length: 16 }, (_, i) => {
  const a = Math.PI * (0.55 + (i / 16) * 0.9);
  const d = 80 + ((i * 41) % 90);
  return {
    x: Math.round(Math.cos(a) * d),
    y: Math.round(Math.sin(a) * d),
    r: `${(i * 83) % 360}deg`,
    c: ["#ffd479", "#ff9db4", "#8fe3c0", "#9cc4ff", "#c9a7ff"][i % 5],
  };
});

function useNow(override?: Date): Date {
  const [now, setNow] = useState(() => override ?? new Date());
  useEffect(() => {
    if (override) {
      setNow(override);
      return;
    }
    const tick = () => setNow(new Date());
    const id = window.setInterval(tick, 20000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [override]);
  return now;
}

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

function Ring({ pct, complete }: { pct: number; complete: boolean }) {
  const R = 30;
  const C = 2 * Math.PI * R;
  return (
    <div className="pl-ring" role="img" aria-label={`${Math.round(pct * 100)} percent of today done`}>
      <svg viewBox="0 0 72 72">
        <defs>
          <linearGradient id="plg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={complete ? "#2f9e6b" : "#5b8c6e"} />
            <stop offset="1" stopColor={complete ? "#8fe3c0" : "#e9b44c"} />
          </linearGradient>
        </defs>
        <circle cx="36" cy="36" r={R} fill="none" stroke="var(--border)" strokeWidth="7" />
        <circle
          cx="36" cy="36" r={R} fill="none" stroke="url(#plg)" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
          style={{ transition: "stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <span className="pct">{complete ? <Check aria-hidden="true" strokeWidth={3.2} /> : `${Math.round(pct * 100)}%`}</span>
    </div>
  );
}

export function PlanCard({
  tasks,
  goals,
  actions,
  toggleTask,
  toggleAction,
  onQuickAdd,
  onAddTask,
  onOpenTask,
  onUpdateAction,
  onOpenGoals,
  nowOverride,
}: Props) {
  const now = useNow(nowOverride);
  const nowMs = now.getTime();
  const plan = useMemo(() => buildPlan(tasks, actions, now), [tasks, actions, now]);
  const themes = useMemo(() => goalThemes(goals), [goals]);
  const goalName = useMemo(() => Object.fromEntries(goals.map((g) => [g.id, g.title])), [goals]);
  const score = planScore(plan);
  const undone = plan.filter((i) => !i.done);
  const finished = plan.filter((i) => i.done);

  const [draft, setDraft] = useState("");
  const [focus, setFocus] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [just, setJust] = useState<string | null>(null);
  const [burst, setBurst] = useState(false);
  const [actionSheet, setActionSheet] = useState<PlanItem< TaskLite, ActionLite> | null>(null);
  const [actionName, setActionName] = useState("");
  const [actionTarget, setActionTarget] = useState("1");
  const wasComplete = useRef(score.complete);

  // Celebrate the moment the last item is ticked, but not when the screen first loads complete.
  useEffect(() => {
    if (score.complete && !wasComplete.current) {
      setBurst(true);
      const id = window.setTimeout(() => setBurst(false), 2000);
      wasComplete.current = true;
      return () => window.clearTimeout(id);
    }
    wasComplete.current = score.complete;
  }, [score.complete]);

  function colorsOf(item: PlanItem) {
    const t = item.goalId ? themes[item.goalId] : undefined;
    if (t) return t;
    return item.kind === "task" ? PRIORITY_COLORS[item.priority] : { a: "#5b8c6e", b: "#8fc4a2" };
  }
  const style = (item: PlanItem) => {
    const c = colorsOf(item);
    return { ["--c" as string]: c.a, ["--g" as string]: `linear-gradient(135deg, ${c.a}, ${c.b})` } as React.CSSProperties;
  };

  function tick(item: PlanItem) {
    if (item.kind === "task") toggleTask(item.raw);
    else toggleAction(item.raw);
    setJust(item.id);
    window.setTimeout(() => setJust((cur) => (cur === item.id ? null : cur)), 800);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onQuickAdd(draft.trim());
    setDraft("");
  }

  function meta(item: PlanItem) {
    const goal = item.goalId ? goalName[item.goalId] : null;
    return (
      <span className="pl-meta">
        {goal && (
          <span className="pl-goal">
            <i />
            <span>{goal}</span>
          </span>
        )}
        {item.kind === "action" ? (
          <span className={item.mustDo ? "pl-must" : undefined}>{actionNote(item)}</span>
        ) : item.done ? (
          item.doneAt && (
            <span>
              Done at {clock(item.doneAt)}
              {item.dueAt && new Date(item.doneAt).getTime() <= new Date(item.dueAt).getTime() ? " · on time" : ""}
            </span>
          )
        ) : item.dueAt ? (
          (() => {
            const d = dueLabel(item.dueAt, nowMs);
            return <span className={`pl-tone-${d.tone}`}>{d.text}</span>;
          })()
        ) : (
          <span style={{ textTransform: "capitalize" }}>{item.priority}</span>
        )}
        {item.kind === "task" && item.hasNotes && <span>Has notes</span>}
      </span>
    );
  }

  function row(item: PlanItem) {
    const late = item.kind === "task" && item.overdue;
    const open = item.kind === "task" ? () => onOpenTask(item.raw) : () => {
      setActionSheet(item);
      setActionName(item.title);
      setActionTarget(String(item.target));
    };
    const label = (item.done ? "Mark as not done: " : "Mark as done: ") + item.title;
    return (
      <div key={`${item.kind}-${item.id}`} className={`pl-row${item.done ? " done" : ""}${late ? " late" : ""}`} style={style(item)}>
        <button type="button" className={`pl-check${just === item.id ? " just" : ""}`} aria-label={label} onClick={() => tick(item)}>
          <Check aria-hidden="true" />
        </button>
        {open ? (
          <button type="button" className="pl-body" onClick={open}>
            <span className="pl-name">{item.title}</span>
            {meta(item)}
          </button>
        ) : (
          <button type="button" className="pl-body" onClick={open}>
            <span className="pl-name">{item.title}</span>
            {meta(item)}
          </button>
        )}
        <Pencil aria-hidden="true" className="pl-pencil" />
      </div>
    );
  }

  const next = focusPick(undone);
  const overdueCount = score.overdue;

  return (
    <section className={`pl-wrap${score.complete ? " complete" : ""}`} aria-label="Today's plan">
      <style>{css}</style>
      {burst &&
        CONFETTI.map((c, i) => (
          <span key={i} className="pl-conf" style={{ background: c.c, ["--x" as string]: `${c.x}px`, ["--y" as string]: `${c.y}px`, ["--r" as string]: c.r } as React.CSSProperties} />
        ))}

      <div className="pl-head">
        <div style={{ minWidth: 0 }}>
          <p className="pl-eyebrow">Today&apos;s plan</p>
          <h2 className="pl-title">
            {score.total === 0 ? "A clear day" : score.complete ? "Day complete" : `${score.done} of ${score.total} done`}
          </h2>
          <p className="pl-sub">{planLine(score)}</p>
        </div>
        <Ring pct={score.pct} complete={score.complete} />
      </div>

      <form className="pl-add" onSubmit={submit}>
        <input
          className="pl-input"
          value={draft}
          maxLength={120}
          placeholder="Add a task for today"
          aria-label="Add a task for today"
          enterKeyHint="done"
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className="pl-addbtn" aria-label="Add task">
          <Plus aria-hidden="true" />
        </button>
      </form>
      <div className="pl-tools">
        <button type="button" className="pl-link" onClick={onAddTask}>
          Add with a deadline or notes
        </button>
        {undone.length > 1 && (
          <button type="button" className={`pl-pill${focus ? " on" : ""}`} aria-pressed={focus} onClick={() => setFocus((v) => !v)}>
            <Target aria-hidden="true" /> Focus
          </button>
        )}
      </div>

      {overdueCount > 0 && !focus && (
        <div className="pl-late" role="status">
          <Clock aria-hidden="true" />
          {overdueCount === 1 ? "1 task is past its time" : `${overdueCount} tasks are past their time`}
        </div>
      )}

      {plan.length === 0 && (
        <div className="pl-empty">
          <b>Nothing planned yet</b>
          Type your first step above.
          {goals.length === 0 && (
            <>
              {" "}
              Or{" "}
              <button type="button" className="pl-link" style={{ display: "inline", minHeight: 0 }} onClick={onOpenGoals}>
                add a goal
              </button>{" "}
              and its daily actions will show up here.
            </>
          )}
        </div>
      )}

      {focus && next ? (
        <>
          <div className="pl-focus" style={style(next)} key={next.id}>
            <span className="k">{next.kind === "task" && next.overdue ? "Do this first · overdue" : "Focus on this one"}</span>
            <span className="t">{next.title}</span>
            <span className="m">
              {next.kind === "action"
                ? actionNote(next)
                : next.dueAt
                  ? dueLabel(next.dueAt, nowMs).text
                  : next.goalId && goalName[next.goalId]
                    ? goalName[next.goalId]
                    : "No deadline"}
            </span>
            <button type="button" className="go" onClick={() => tick(next)}>
              <Check aria-hidden="true" /> Done
            </button>
          </div>
          {undone.length > 1 && <p className="pl-more">{undone.length - 1} more waiting</p>}
        </>
      ) : (
        undone.length > 0 && <div className="pl-list">{undone.map(row)}</div>
      )}

      {finished.length > 0 && (
        <div className="pl-list">
          <button type="button" className={`pl-donehead${showDone ? " open" : ""}`} aria-expanded={showDone} onClick={() => setShowDone((v) => !v)}>
            <span>Done · {finished.length}</span>
            <ChevronDown aria-hidden="true" />
          </button>
          {showDone && finished.map(row)}
        </div>
      )}

      <Sheet open={Boolean(actionSheet)} onOpenChange={(open) => !open && setActionSheet(null)}>
        <SheetContent side="bottom" className="max-h-[70dvh] overflow-y-auto">
          {actionSheet?.kind === "action" && (
            <>
              <SheetHeader>
                <SheetTitle>{actionSheet.title}</SheetTitle>
                <SheetDescription>{goalName[actionSheet.goalId]} · {actionSheet.weekCount} of {actionSheet.target} this week</SheetDescription>
              </SheetHeader>
              <div className="mt-5 flex flex-col gap-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground"><span>This week</span><span>{actionSheet.weekCount} of {actionSheet.target} this week</span></div>
                <div className="flex gap-2" aria-label="This week's progress">
                  {Array.from({ length: 7 }, (_, i) => <span key={i} className={`size-3 rounded-full ${i < actionSheet.weekCount ? "bg-primary" : "bg-muted"}`} />)}
                </div>
                <Input aria-label="Action name" value={actionName} onChange={(e) => setActionName(e.target.value)} />
                <select aria-label="Days per week" className="h-11 rounded-xl border border-border bg-card px-3" value={actionTarget} onChange={(e) => setActionTarget(e.target.value)}>
                  {Array.from({ length: 7 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1} days per week</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" onClick={async () => { await onUpdateAction(actionSheet.raw, actionName, Number(actionTarget)); setActionSheet(null); }}>Edit action</Button>
                  <Button type="button" variant="outline" onClick={() => { setActionSheet(null); onOpenGoals(); }}>Open goal</Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
