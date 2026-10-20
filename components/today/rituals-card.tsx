"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Maximize2, Moon, Pencil, Sun } from "lucide-react";
import { Face, MoodCheckin, useTween } from "@/components/today/mood-checkin";
import { hourOf } from "@/lib/day-scene";
import {
  MAX_INTENTION,
  MOOD_NAMES,
  journalLines,
  ritualMode,
  type RitualMode,
} from "@/lib/rituals";

// Section 4 of the Today screen: the two rituals that open and close the day.
// Morning: "Today I will..." Evening: how it went, then a short journal entry.

type Checkin = { id: string; checkin_date: string; mood: number; win: string | null; improve: string | null; created_at: string };

type Props = {
  /** Morning intention saved for today, if any. */
  intention: string | null;
  onSaveIntention: (text: string) => Promise<boolean>;
  suggestions: string[];

  /** Evening reflection: the same state the old check-in card used. */
  mood: number;
  setMood: (n: number) => void;
  win: string;
  setWin: (v: string) => void;
  improve: string;
  setImprove: (v: string) => void;
  saveCheckin: (e: React.FormEvent) => void;
  checkinError: string;
  checkinSaved: boolean;
  todayCheckin: Checkin | null;
  editingCheckin: Checkin | null;
  onCancelEdit: () => void;
  onEditCheckin: (c: Checkin) => void;
  editingLabel?: string;

  /** Numbers for the journal summary. */
  tasksDone: number;
  tasksTotal: number;
  actionsDone: number;
  streak: number;
  savedAt?: string;

  /** Mood of the most recent earlier check-in, for the line under the mood name. */
  previousMood?: number | null;

  /** Test hook: pin the time of day (0 to 24). */
  hourOverride?: number;
};

const css = `
.rt-wrap, .rt-wrap *, .rt-wrap *::before, .rt-wrap *::after { box-sizing:border-box; }
.rt-wrap { display:flex; flex-direction:column; gap:.9rem; }
.rt-wrap p { margin:0; }
.rt-wrap button, .rt-wrap input, .rt-wrap textarea { font-family:inherit; }
.rt-card { position:relative; overflow:hidden; border-radius:28px; box-shadow:0 12px 34px rgba(30,24,60,.16); }
.rt-card.am { background:linear-gradient(160deg,#ffeccb 0%,#ffd2a8 100%); color:#3e2410; }
.rt-card.pm { background:linear-gradient(160deg,#2d3274 0%,#15193f 100%); color:#fff; }
.rt-head { display:flex; align-items:center; gap:.75rem; width:100%; padding:1rem 1.15rem; border:0; background:transparent; color:inherit; text-align:left; }
.rt-badge { flex:0 0 auto; display:grid; place-items:center; width:2.5rem; height:2.5rem; border-radius:999px; }
.am .rt-badge { background:rgba(255,255,255,.6); color:#c2660f; }
.pm .rt-badge { background:rgba(255,255,255,.14); color:#ffd479; }
.rt-badge svg { width:20px; height:20px; }
.rt-titles { min-width:0; flex:1; }
.rt-eyebrow { font-size:.66rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; opacity:.75; }
.rt-preview { margin-top:.15rem; font-size:1rem; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.rt-tick { flex:0 0 auto; display:grid; place-items:center; width:1.6rem; height:1.6rem; border-radius:999px; background:#2f9e6b; color:#fff; }
.rt-tick svg { width:14px; height:14px; }
.rt-chev { flex:0 0 auto; width:18px; height:18px; opacity:.6; transition:transform .3s; }
.rt-card.open .rt-chev { transform:rotate(180deg); }
.rt-body { display:grid; grid-template-rows:0fr; transition:grid-template-rows .38s ease; }
.rt-card.open .rt-body { grid-template-rows:1fr; }
.rt-body > div { overflow:hidden; min-height:0; }
.rt-inner { padding:0 1.15rem 1.2rem; display:flex; flex-direction:column; gap:.85rem; }
.rt-say { font-family:Georgia,'Times New Roman',serif; font-size:1.55rem; line-height:1.15; letter-spacing:-.02em; }
.rt-wrap .rt-card input.rt-input, .rt-wrap .rt-card textarea.rt-input { width:100%; border-radius:1rem; font-size:1rem; padding:.8rem 1rem; margin:0; min-height:3rem; }
.rt-wrap .rt-card textarea.rt-input { min-height:4.2rem; resize:none; }
.rt-wrap .rt-card.am .rt-input { background:rgba(255,255,255,.72); border:1px solid rgba(130,72,20,.22); color:#3e2410; }
.rt-wrap .rt-card.am .rt-input::placeholder { color:rgba(62,36,16,.5); }
.rt-wrap .rt-card.pm .rt-input { background:rgba(255,255,255,.09); border:1px solid rgba(255,255,255,.22); color:#fff; }
.rt-wrap .rt-card.pm .rt-input::placeholder { color:rgba(255,255,255,.5); }
.rt-chips { display:flex; flex-wrap:wrap; gap:.45rem; }
.rt-chip { min-height:2.4rem; padding:0 .9rem; border-radius:999px; font-size:.85rem; border:1px solid transparent; transition:transform .15s, background .2s; text-align:left; }
.rt-chip:active { transform:scale(.96); }
.am .rt-chip { background:rgba(255,255,255,.6); border-color:rgba(130,72,20,.18); color:#5a3410; }
.am .rt-chip:hover { background:rgba(255,255,255,.9); }
.rt-btn { min-height:3rem; border:0; border-radius:1rem; font-weight:700; font-size:.95rem; display:flex; align-items:center; justify-content:center; gap:.45rem; width:100%; transition:transform .15s, opacity .2s; }
.rt-btn:active { transform:scale(.98); }
.rt-btn:disabled { opacity:.55; }
.am .rt-btn { background:#3e2410; color:#fff4e0; }
.pm .rt-btn { background:#ffd479; color:#2a2250; }
.rt-btn svg { width:17px; height:17px; }
.rt-link { align-self:flex-start; display:inline-flex; align-items:center; gap:.4rem; min-height:2.5rem; padding:0 .2rem; border:0; background:transparent; color:inherit; font-size:.85rem; font-weight:600; opacity:.8; }
.rt-link svg { width:14px; height:14px; }
.rt-err { font-size:.85rem; color:#ffb4a8; text-align:center; }
.rt-quote { padding:.75rem 1rem; border-radius:1rem; background:rgba(255,255,255,.1); border-left:3px solid #ffd479; font-size:.9rem; line-height:1.4; }
.rt-quote small { display:block; margin-bottom:.15rem; font-size:.66rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; opacity:.7; }
.rt-face-big { display:flex; flex-direction:column; align-items:center; gap:.35rem; padding:.2rem 0 .1rem; }
.rt-face-open { width:100%; border:0; background:transparent; color:inherit; cursor:pointer; }
.rt-open { display:inline-flex; align-items:center; gap:.35rem; margin-top:.1rem; padding:.3rem .75rem; border-radius:999px; background:rgba(255,255,255,.14); font-size:.74rem; font-weight:600; opacity:.9; }
.rt-open svg { width:13px; height:13px; }
.rt-face-big .rt-mood-name { min-height:1.3rem; font-weight:700; font-size:1rem; }
.rt-face-row { display:flex; justify-content:space-between; gap:.25rem; }
.rt-face-btn { flex:1; display:grid; place-items:center; min-height:3.4rem; padding:.2rem; border:2px solid transparent; border-radius:1rem; background:transparent; opacity:.8; transition:opacity .2s, transform .2s, background .2s, border-color .2s; }
.rt-face-btn.on { opacity:1; transform:translateY(-2px) scale(1.06); background:rgba(255,255,255,.12); border-color:rgba(255,255,255,.55); }
.rt-journal { display:flex; flex-direction:column; gap:.9rem; }
.rt-date { font-family:Georgia,serif; font-size:1.3rem; letter-spacing:-.01em; }
.rt-line { display:grid; grid-template-columns:5.6rem 1fr; gap:.6rem; align-items:baseline; }
.rt-line b { font-size:.64rem; font-weight:700; letter-spacing:.13em; text-transform:uppercase; opacity:.65; }
.rt-line span { font-family:Georgia,'Times New Roman',serif; font-size:1.02rem; line-height:1.4; overflow-wrap:anywhere; }
.rt-line.stats span { font-family:inherit; font-size:.88rem; opacity:.9; }
.rt-pop { animation:rt-pop .6s cubic-bezier(.2,.9,.3,1.2) both; }
@keyframes rt-pop { from { opacity:0; transform:scale(.94) translateY(8px) } to { opacity:1; transform:none } }
@keyframes rt-draw { from { stroke-dashoffset:30 } to { stroke-dashoffset:0 } }
@media (prefers-reduced-motion:reduce) { .rt-pop { animation:none; } .rt-body, .rt-chev, .rt-face-btn { transition:none; } }
`;

function useHour(override?: number): number {
  const [hour, setHour] = useState(() => hourOf(new Date()));
  useEffect(() => {
    if (override !== undefined) return;
    const id = window.setInterval(() => setHour(hourOf(new Date())), 60000);
    return () => window.clearInterval(id);
  }, [override]);
  return override ?? hour;
}

function Header({
  kind,
  title,
  preview,
  done,
  open,
  onToggle,
}: {
  kind: "am" | "pm";
  title: string;
  preview: string;
  done: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" className="rt-head" onClick={onToggle} aria-expanded={open}>
      <span className="rt-badge">{kind === "am" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}</span>
      <span className="rt-titles">
        <span className="rt-eyebrow">{title}</span>
        <span className="rt-preview" style={{ display: "block" }}>{preview}</span>
      </span>
      {done && <span className="rt-tick" aria-label="Done"><Check aria-hidden="true" /></span>}
      <ChevronDown className="rt-chev" aria-hidden="true" />
    </button>
  );
}

function Morning({
  intention,
  onSave,
  suggestions,
  open,
  setOpen,
}: {
  intention: string | null;
  onSave: (t: string) => Promise<boolean>;
  suggestions: string[];
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const showForm = !intention || editing;

  async function save() {
    const text = draft.trim();
    if (!text || saving) return;
    setSaving(true);
    const ok = await onSave(text);
    setSaving(false);
    if (ok) {
      setEditing(false);
      setDraft("");
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 1500);
    }
  }

  return (
    <div className={`rt-card am${open ? " open" : ""}`}>
      <Header
        kind="am"
        title="Morning intention"
        preview={intention ? `Today I will ${intention}` : "How do you want today to go?"}
        done={Boolean(intention)}
        open={open}
        onToggle={() => setOpen(!open)}
      />
      <div className="rt-body" inert={!open}>
        <div>
          <div className={`rt-inner${justSaved ? " rt-pop" : ""}`}>
            {showForm ? (
              <>
                <p className="rt-say">Today I will…</p>
                <input
                  className="rt-input"
                  value={draft}
                  maxLength={MAX_INTENTION}
                  placeholder="finish the one thing that matters"
                  aria-label="Today I will"
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void save(); } }}
                />
                {suggestions.length > 0 && (
                  <div className="rt-chips" aria-label="Ideas from your goals">
                    {suggestions.map((s) => (
                      <button key={s} type="button" className="rt-chip" onClick={() => setDraft(s)}>{s}</button>
                    ))}
                  </div>
                )}
                <button type="button" className="rt-btn" disabled={!draft.trim() || saving} onClick={save}>
                  {saving ? "Saving…" : intention ? "Update my intention" : "Set my intention"}
                </button>
                {editing && (
                  <button type="button" className="rt-link" onClick={() => { setEditing(false); setDraft(""); }}>Cancel</button>
                )}
              </>
            ) : (
              <>
                <p className="rt-say">Today I will {intention}.</p>
                <button type="button" className="rt-link" onClick={() => { setDraft(intention ?? ""); setEditing(true); }}>
                  <Pencil aria-hidden="true" /> Change it
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Evening(p: Props & { open: boolean; setOpen: (v: boolean) => void }) {
  const { todayCheckin, editingCheckin, mood, open, setOpen } = p;
  const showJournal = Boolean(todayCheckin) && !editingCheckin;
  const tweened = useTween(mood > 0 ? mood : 3);
  const [full, setFull] = useState(false);

  // Close the full screen once the reflection is saved.
  useEffect(() => {
    if (p.checkinSaved) setFull(false);
  }, [p.checkinSaved]);

  const preview = showJournal
    ? `You felt ${MOOD_NAMES[(todayCheckin as Checkin).mood - 1]?.toLowerCase() ?? "okay"} today`
    : editingCheckin
      ? "Editing a reflection"
      : "How did today go?";

  const lines = showJournal
    ? journalLines({
        moodName: MOOD_NAMES[(todayCheckin as Checkin).mood - 1] ?? "Okay",
        intention: p.intention,
        win: (todayCheckin as Checkin).win,
        improve: (todayCheckin as Checkin).improve,
        tasksDone: p.tasksDone,
        tasksTotal: p.tasksTotal,
        actionsDone: p.actionsDone,
        streak: p.streak,
      })
    : [];
  const dateText = new Intl.DateTimeFormat("en-US", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <div className={`rt-card pm${open ? " open" : ""}`}>
      <Header kind="pm" title="Evening reflection" preview={preview} done={showJournal} open={open} onToggle={() => setOpen(!open)} />
      <div className="rt-body" inert={!open}>
        <div>
          {showJournal ? (
            <div className={`rt-inner rt-journal${p.checkinSaved ? " rt-pop" : ""}`}>
              <p className="rt-date">{dateText}</p>
              {lines.map((l) => (
                <p key={l.key} className={`rt-line ${l.key}`}>
                  <b>{l.label}</b>
                  <span>{l.text}</span>
                </p>
              ))}
              <p className="rt-line stats" style={{ opacity: 0.7 }}>
                <b>Saved</b>
                <span>{p.savedAt ? `${p.savedAt}. ` : ""}{p.streak >= 2 ? "Come back tomorrow to keep it going." : "See you tomorrow."}</span>
              </p>
              <button type="button" className="rt-link" onClick={() => p.onEditCheckin(todayCheckin as Checkin)}>
                <Pencil aria-hidden="true" /> Edit reflection
              </button>
            </div>
          ) : (
            <form className="rt-inner" onSubmit={p.saveCheckin}>
              {editingCheckin && <p className="rt-eyebrow">{p.editingLabel ?? "Editing an earlier day"}</p>}
              {p.intention && (
                <div className="rt-quote">
                  <small>This morning</small>
                  Today I will {p.intention}
                </div>
              )}
              <button type="button" className="rt-face-big rt-face-open" onClick={() => setFull(true)} aria-label="Open the full mood check-in">
                <Face value={tweened} size={92} />
                <span className="rt-mood-name" aria-live="polite">{mood > 0 ? MOOD_NAMES[mood - 1] : "Tap a face"}</span>
                <span className="rt-open"><Maximize2 aria-hidden="true" /> Open full check-in</span>
              </button>
              <div className="rt-face-row" role="radiogroup" aria-label="How do you feel?">
                {MOOD_NAMES.map((name, i) => (
                  <button
                    key={name}
                    type="button"
                    role="radio"
                    aria-checked={mood === i + 1}
                    aria-label={name}
                    className={`rt-face-btn${mood === i + 1 ? " on" : ""}`}
                    onClick={() => p.setMood(i + 1)}
                  >
                    <Face value={i + 1} size={38} />
                  </button>
                ))}
              </div>
              <textarea className="rt-input" placeholder="One win from today, however small" value={p.win} onChange={(e) => p.setWin(e.target.value)} />
              <textarea className="rt-input" placeholder="One thing to make tomorrow gentler" value={p.improve} onChange={(e) => p.setImprove(e.target.value)} />
              <button type="submit" className="rt-btn">Save reflection</button>
              {p.checkinError && <p className="rt-err">{p.checkinError}</p>}
              {editingCheckin && (
                <button type="button" className="rt-link" onClick={p.onCancelEdit}>Cancel</button>
              )}
              {full && (
                <MoodCheckin
                  mood={mood}
                  setMood={p.setMood}
                  win={p.win}
                  setWin={p.setWin}
                  improve={p.improve}
                  setImprove={p.setImprove}
                  onSubmit={p.saveCheckin}
                  error={p.checkinError}
                  previousMood={p.previousMood}
                  editingLabel={editingCheckin ? p.editingLabel : undefined}
                  onClose={() => setFull(false)}
                />
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export function RitualsCard(props: Props) {
  const hour = useHour(props.hourOverride);
  const mode: RitualMode = ritualMode(hour);
  const hasIntention = Boolean(props.intention);
  const hasReflection = Boolean(props.todayCheckin);

  // Which card starts open depends on the time of day. The person can open or close either.
  const [openAm, setOpenAm] = useState(mode === "morning" || (mode === "midday" && !hasIntention));
  const [openPm, setOpenPm] = useState(mode === "evening" || Boolean(props.editingCheckin));
  const lastMode = useRef(mode);
  useEffect(() => {
    if (lastMode.current === mode) return;
    lastMode.current = mode;
    setOpenAm(mode === "morning" || (mode === "midday" && !hasIntention));
    setOpenPm(mode === "evening");
  }, [mode, hasIntention]);

  // Editing an old reflection from the You tab brings the evening card forward.
  useEffect(() => {
    if (props.editingCheckin) setOpenPm(true);
  }, [props.editingCheckin]);

  // Once the reflection is saved, show the journal entry.
  useEffect(() => {
    if (props.checkinSaved) setOpenPm(true);
  }, [props.checkinSaved]);

  const eveningFirst = mode === "evening" || hasReflection;
  const morning = (
    <Morning
      key="am"
      intention={props.intention}
      onSave={props.onSaveIntention}
      suggestions={props.suggestions}
      open={openAm}
      setOpen={setOpenAm}
    />
  );
  const evening = <Evening key="pm" {...props} open={openPm} setOpen={setOpenPm} />;

  return (
    <section className="rt-wrap" aria-label="Daily rituals">
      <style>{css}</style>
      {eveningFirst ? [evening, morning] : [morning, evening]}
    </section>
  );
}
