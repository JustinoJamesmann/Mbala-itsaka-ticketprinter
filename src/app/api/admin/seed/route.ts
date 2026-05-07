import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";

const defaultAccounts = [
  { email: "Ramanatenasoamariemichelle@gmail.com", username: "Michelle", password: "marisa20.", role: "admin" as const },
  { email: "mbala.itsaka@gmail.com", username: "MbalaItsaka", password: "Mba!Itsa123", role: "worker" as const },
];

export async function POST() {
  const supabase = createAdminClient();

  for (const account of defaultAccounts) {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { username: account.username, role: account.role },
    });

    if (error && !error.message.toLowerCase().includes("already")) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const userId = created.user?.id;
    if (userId) {
      await supabase.from("profiles").upsert({ id: userId, username: account.username, role: account.role });
    }
  }

  await supabase.from("activity_logs").insert({
    action: "seed_database",
    entity_type: "system",
    details: { users: defaultAccounts.map(a => a.username) },
  });

  return NextResponse.json({ ok: true });
}
