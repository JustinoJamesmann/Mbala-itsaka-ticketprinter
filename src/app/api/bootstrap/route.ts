import { NextResponse } from "next/server";
import { mapOrder } from "../../../lib/mappers";
import { createAdminClient } from "../../../lib/supabase/admin";
import { createClient } from "../../../lib/supabase/server";
import { User } from "../../types";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let userProfile: User | null = null;
    if (user) {
      const admin = createAdminClient();
      const { data: profile } = await admin
        .from("users")
        .select("id, username, role")
        .eq("id", user.id)
        .single();

      if (profile) {
        userProfile = {
          id: profile.id,
          username: profile.username,
          role: profile.role,
        };
      }
    }

    const admin = createAdminClient();
    const ordersResult = await admin.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });

    if (ordersResult.error) {
      console.error("Orders query error:", ordersResult.error);
      return NextResponse.json({ user: userProfile, orders: [] });
    }

    return NextResponse.json({
      user: userProfile,
      orders: (ordersResult.data || []).map(mapOrder),
    });
  } catch (error) {
    console.error("Bootstrap error:", error);
    return NextResponse.json({ user: null, orders: [] });
  }
}
