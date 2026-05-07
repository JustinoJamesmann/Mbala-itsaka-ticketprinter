import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";
import { User } from "../app/types";

export type AuthUser = User & { authId: string };

export async function getServerUser(): Promise<AuthUser | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("id, username, role")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    id: profile.id,
    authId: profile.id,
    username: profile.username,
    role: profile.role,
  };
}

export async function requireServerUser(): Promise<AuthUser> {
  const user = await getServerUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireServerUser();
  if (user.role !== "admin") throw new Error("Forbidden");
  return user;
}

export function normalizeLoginEmail(login: string) {
  return login.trim().toLowerCase();
}
