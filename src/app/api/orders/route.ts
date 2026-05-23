import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "../../../lib/supabase/admin";
import { mapOrder } from "../../../lib/mappers";
import { Order } from "../../types";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ orders: (data || []).map(mapOrder) });
  } catch (error) {
    console.error("Orders GET error:", error);
    return NextResponse.json({ orders: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const order = await request.json() as Omit<Order, "id">;
    const supabase = createAdminClient();

    const { data: createdOrder, error: orderError } = await supabase.from("orders").insert({
      customer: order.customer,
      phone: order.phone || null,
      address: order.address || null,
      subtotal: order.subtotal,
      delivery_cost: order.deliveryCost || 0,
      remise: order.remise || 0,
      total: order.total,
      status: "confirmed",
      order_date: order.date,
    }).select("*").single();

    if (orderError) {
      console.error("Order insert error:", orderError);
      return NextResponse.json({ error: orderError.message, details: orderError }, { status: 500 });
    }

    const { error: itemsError } = await supabase.from("order_items").insert(order.items.map(item => ({
      order_id: createdOrder.id,
      product_id: item.productId || crypto.randomUUID(),
      product_name: item.productName,
      quantity: item.quantity,
      price: item.price,
      total: item.total,
    })));

    if (itemsError) {
      console.error("Items insert error:", itemsError);
      return NextResponse.json({ error: itemsError.message, details: itemsError }, { status: 500 });
    }

    const { data: savedOrder, error: savedOrderError } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", createdOrder.id)
      .single();

    if (savedOrderError) return NextResponse.json({ error: savedOrderError.message }, { status: 500 });

    return NextResponse.json({ order: mapOrder(savedOrder) });
  } catch (error) {
    console.error("Orders POST error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, status } = await request.json();
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("orders").update({ status }).eq("id", id).select("*, order_items(*)").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ order: mapOrder(data) });
  } catch (error) {
    console.error("Orders PUT error:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    const supabase = createAdminClient();
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Orders DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}
