import { NextResponse } from "next/server";
import { mapOrder } from "../../../lib/mappers";
import { createAdminClient } from "../../../lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const ordersResult = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });

    if (ordersResult.error) {
      console.error("Orders query error:", ordersResult.error);
      return NextResponse.json({ user: null, orders: [] });
    }

    return NextResponse.json({
      user: null,
      orders: (ordersResult.data || []).map(mapOrder),
    });
  } catch (error) {
    console.error("Bootstrap error:", error);
    return NextResponse.json({ user: null, orders: [] });
  }
}
