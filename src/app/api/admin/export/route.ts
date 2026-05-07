import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { requireAdmin } from "../../../../lib/auth";

export async function GET() {
  const user = await requireAdmin();
  const supabase = createAdminClient();
  const [orders, orderItems, activityLogs] = await Promise.all([
    supabase.from("orders").select("*"),
    supabase.from("order_items").select("*"),
    supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(1000),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    orders: orders.data || [],
    orderItems: orderItems.data || [],
    activityLogs: activityLogs.data || [],
  };

  await supabase.from("activity_logs").insert({ actor_id: user.authId, actor_username: user.username, action: "export_backup", entity_type: "backup", details: { exportedAt: payload.exportedAt } });

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="bsh-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
