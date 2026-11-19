import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Deleting an auth user needs the service-role key, which must never reach the browser.
export async function POST(request: Request) 
{
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { confirm?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    /* handled below */
  }
  if (body.confirm !== "DELETE") {
    return NextResponse.json({ error: "Confirmation missing." }, { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "Account deletion isn't set up on this server yet." }, { status: 501 });
  }

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const userId = auth.user.id;

  // Children first, so foreign keys without ON DELETE CASCADE don't block the user row.
  const steps: Array<[string, string]> = [
    ["habit_completions", "user_id"],
    ["habits", "user_id"],
    ["daily_tasks", "user_id"],
    ["daily_intentions", "user_id"],
    ["checkins", "user_id"],
    ["goals", "user_id"],
    ["countdowns", "user_id"],
    ["profiles", "id"],
  ];
  for (const [table, column] of steps) {
    const { error } = await admin.from(table).delete().eq(column, userId);
    if (error) {
      console.error(`Account delete: failed clearing ${table}`, error.message);
      return NextResponse.json({ error: `Could not remove your ${table.replace(/_/g, " ")}.` }, { status: 500 });
    }
  }

  const { data: files } = await admin.storage.from("avatars").list(userId);
  if (files?.length) {
    await admin.storage.from("avatars").remove(files.map((f) => `${userId}/${f.name}`));
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error("Account delete: auth user", deleteError.message);
    return NextResponse.json({ error: "Could not delete your login." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
