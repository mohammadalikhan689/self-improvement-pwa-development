import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type StartBody = { timezone?: unknown; tz_offset_minutes?: unknown };

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function localNow(offsetMinutes: number) {
  return new Date(Date.now() - offsetMinutes * 60_000);
}

function streakFromDates(values: string[]) {
  const dates = new Set(values);
  const cursor = localNow(0);
  cursor.setUTCHours(0, 0, 0, 0);
  let key = cursor.toISOString().slice(0, 10);
  if (!dates.has(key)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    key = cursor.toISOString().slice(0, 10);
  }
  let count = 0;
  while (dates.has(key)) {
    count += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    key = cursor.toISOString().slice(0, 10);
  }
  return count;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: StartBody = {};
  try {
    body = await request.json();
  } catch {
    // Defaults below keep the endpoint safe when the body is malformed.
  }
  const timezone = text(body.timezone, "UTC");
  const offset = typeof body.tz_offset_minutes === "number" && Number.isFinite(body.tz_offset_minutes)
    ? Math.trunc(body.tz_offset_minutes)
    : 0;
  const now = localNow(offset);
  const localDate = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(now);
  const localTime = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(now);
  const dateKey = now.toISOString().slice(0, 10);

  const [profileResult, tasksResult, goalsResult, checkinsResult] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", auth.user.id).maybeSingle(),
    supabase.from("daily_tasks").select("title,completed_at").eq("user_id", auth.user.id).eq("task_date", dateKey).is("completed_at", null),
    supabase.from("goals").select("title,why").eq("user_id", auth.user.id).order("created_at", { ascending: true }).limit(3),
    supabase.from("checkins").select("checkin_date").eq("user_id", auth.user.id).order("checkin_date", { ascending: false }).limit(400),
  ]);
  const firstName = text(profileResult.data?.display_name).trim().split(/\s+/)[0];
  const planTitles = (tasksResult.data ?? []).map((task) => text(task.title).trim()).filter(Boolean);
  const goals = (goalsResult.data ?? []).map((goal) => {
    const title = text(goal.title).trim();
    const why = text(goal.why).trim();
    return why ? `${title}: ${why}` : title;
  }).filter(Boolean);

  const response = await fetch("https://api.retellai.com/v2/create-web-call", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      agent_id: process.env.RETELL_AGENT_ID,
      metadata: { user_id: auth.user.id, timezone, tz_offset_minutes: String(offset) },
      retell_llm_dynamic_variables: {
        first_name: (firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : "friend"),
        local_date: localDate,
        local_time: localTime,
        today_plan: planTitles.length ? planTitles.join(", ") : "nothing planned yet",
        goals_summary: goals.length ? goals.join("; ") : "no goals set yet",
        streak: String(streakFromDates((checkinsResult.data ?? []).map((checkin) => checkin.checkin_date))),
      },
    }),
  });
  if (!response.ok) {
    return NextResponse.json({ error: "Unable to start voice coach" }, { status: 502 });
  }
  const call = await response.json();
  return NextResponse.json({
    call_id: call.call_id,
    access_token: call.access_token,
    transport: call.transport,
    ice_servers: call.ice_servers,
  });
}
