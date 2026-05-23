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
  const email = normalizeLoginEmail(username);

  // Try to sign in with Supabase Auth
  let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // If sign in fails, try to create the user in Supabase Auth
  if (authError) {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      console.log("Supabase Auth failed:", signUpError.message);
    } else {
      // If signup succeeded, try signing in again
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      authData = signInData;
    }
  }

  return NextResponse.json({
    user: { id: user.id, username: user.username, role: user.role },
    session: authData?.session
  });
}
