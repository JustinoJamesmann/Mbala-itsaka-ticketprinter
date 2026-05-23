import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "../../../lib/supabase/admin";

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    const supabase = createAdminClient();
    const { error } = await supabase.from("order_items").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Order items DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete order item" }, { status: 500 });
  }
}
