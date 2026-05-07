import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { normalizeLoginEmail } from "../../../../lib/auth";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: user } = await admin
    .from("users")
    .select("id, username, password_hash, role")
    .ilike("username", normalizeLoginEmail(username))
    .single();

  if (!user) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: normalizeLoginEmail(username),
    password,
  });

  if (authError) {
    // If Supabase Auth fails, we'll still return the user data
    // This allows the app to work even without Supabase Auth
    console.log("Supabase Auth failed, using custom auth:", authError.message);
  }

  return NextResponse.json({ 
    user: { id: user.id, username: user.username, role: user.role },
    session: authData?.session 
  });
}
