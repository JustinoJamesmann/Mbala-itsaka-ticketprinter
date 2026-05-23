"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  total: number;
}

interface Order {
  id: string;
  customer: string;
  phone: string | null;
  address: string | null;
  subtotal: number;
  delivery_cost: number;
  remise: number;
  total: number;
  status: string;
  order_date: string;
  order_items: OrderItem[];
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [orderId, setOrderId] = useState<string>("");

  useEffect(() => {
    async function init() {
      const resolvedParams = await params;
      console.log('Order ID received:', resolvedParams.id);
      setOrderId(resolvedParams.id);
      loadOrder(resolvedParams.id);
    }
    init();
  }, [params]);

  async function loadOrder(id: string) {
    const supabase = createClient();
    console.log('Fetching order with id:', id);
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", id)
      .maybeSingle();

    console.log('Order data:', data);
    console.log('Order error:', error);

    if (error) {
      console.error("Error loading order:", error);
      setLoading(false);
      return;
    }

    setOrder(data as Order);
    setLoading(false);
  }

  async function updateItemQuantity(itemId: string, newQty: number) {
    if (newQty < 1) return;

    const supabase = createClient();
    const item = order?.order_items.find(i => i.id === itemId);
    if (!item) return;

    const newTotal = newQty * item.price;
    const { error: itemError } = await supabase
      .from("order_items")
      .update({ quantity: newQty, total: newTotal })
      .eq("id", itemId);

    if (itemError) {
      console.error("Error updating item:", itemError);
      return;
    }

    // Recalculate order totals
    const newSubtotal = order!.order_items.reduce((sum, i) => {
      if (i.id === itemId) return sum + newTotal;
      return sum + i.total;
    }, 0);
    const newOrderTotal = Math.max(0, newSubtotal + order!.delivery_cost - order!.remise);

    const { error: orderError } = await supabase
      .from("orders")
      .update({ subtotal: newSubtotal, total: newOrderTotal })
      .eq("id", orderId);

    if (orderError) {
      console.error("Error updating order:", orderError);
      return;
    }

    await loadOrder(orderId);
  }

  async function cancelItem(itemId: string, itemName: string) {
    if (!confirm(`Cancel ${itemName}?`)) return;

    const supabase = createClient();
    const { error } = await supabase.from("order_items").delete().eq("id", itemId);

    if (error) {
      console.error("Error cancelling item:", error);
      return;
    }

    // Recalculate order totals
    const newSubtotal = order!.order_items.filter(i => i.id !== itemId).reduce((sum, i) => sum + i.total, 0);
    const newOrderTotal = Math.max(0, newSubtotal + order!.delivery_cost - order!.remise);

    await supabase
      .from("orders")
      .update({ subtotal: newSubtotal, total: newOrderTotal })
      .eq("id", orderId);

    await loadOrder(orderId);
  }

  async function cancelSelectedItems() {
    if (selectedItemIds.size === 0) return;
    if (!confirm(`Cancel ${selectedItemIds.size} selected items?`)) return;

    const supabase = createClient();
    const { error } = await supabase.from("order_items").delete().in("id", Array.from(selectedItemIds));

    if (error) {
      console.error("Error cancelling items:", error);
      return;
    }

    // Recalculate order totals
    const newSubtotal = order!.order_items.filter(i => !selectedItemIds.has(i.id)).reduce((sum, i) => sum + i.total, 0);
    const newOrderTotal = Math.max(0, newSubtotal + order!.delivery_cost - order!.remise);

    await supabase
      .from("orders")
      .update({ subtotal: newSubtotal, total: newOrderTotal })
      .eq("id", orderId);

    setSelectedItemIds(new Set());
    await loadOrder(orderId);
  }

  async function cancelEntireOrder() {
    if (!confirm(`Cancel entire order #${order?.id.slice(0, 8)}...?`)) return;

    const supabase = createClient();
    const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);

    if (error) {
      console.error("Error cancelling order:", error);
      return;
    }

    await loadOrder(orderId);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d1518' }}>
        <div className="text-[#8fa3ad]">Loading...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d1518' }}>
        <div className="text-[#8fa3ad]">Order not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4" style={{ background: '#0d1518' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl bg-[#162126] border border-[#1f2a30] text-[#8fa3ad] hover:text-[#e6f1f5] transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#e6f1f5]">Order Details</h1>
          <div className={`text-xs px-2 py-0.5 rounded-full inline-block capitalize ${
            order.status === 'confirmed' ? 'bg-green-500/20 text-green-400' : 
            order.status === 'cancelled' ? 'bg-red-500/20 text-red-400' : 
            'bg-[#162126] text-[#8fa3ad]'
          }`}>
            {order.status}
          </div>
        </div>
      </div>

      {/* Order Info */}
      <div className="glass p-4 rounded-2xl mb-4 space-y-2">
        <div className="text-xs text-[#8fa3ad]/60">{order.id}</div>
        <div className="text-sm font-semibold text-[#e6f1f5]">{order.customer}</div>
        {order.phone && <div className="text-xs text-[#8fa3ad]/80">{order.phone}</div>}
        {order.address && <div className="text-xs text-[#8fa3ad]/80">{order.address}</div>}
        <div className="text-xs text-[#8fa3ad]/60">{order.order_date}</div>
      </div>

      {/* Items Table */}
      <div className="glass p-4 rounded-2xl mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={order.order_items.length > 0 && selectedItemIds.size === order.order_items.length}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedItemIds(new Set(order.order_items.map(i => i.id)));
                } else {
                  setSelectedItemIds(new Set());
                }
              }}
              className="w-4 h-4 rounded border-[#1f2a30] bg-[#162126] text-neon-purple focus:ring-neon-purple cursor-pointer"
            />
            <span className="text-sm text-[#e6f1f5]">Items</span>
          </div>
          {selectedItemIds.size > 0 && (
            <button
              onClick={cancelSelectedItems}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer"
            >
              Cancel Selected ({selectedItemIds.size})
            </button>
          )}
        </div>

        <div className="space-y-2">
          {order.order_items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-[#162126]/50 border border-[#1f2a30]">
              <input
                type="checkbox"
                checked={selectedItemIds.has(item.id)}
                onChange={(e) => {
                  const newSet = new Set(selectedItemIds);
                  if (e.target.checked) {
                    newSet.add(item.id);
                  } else {
                    newSet.delete(item.id);
                  }
                  setSelectedItemIds(newSet);
                }}
                className="w-4 h-4 rounded border-[#1f2a30] bg-[#162126] text-neon-purple focus:ring-neon-purple cursor-pointer shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-[#e6f1f5] truncate">{item.product_name}</div>
                <div className="text-xs text-[#8fa3ad]/60">Ar {item.price.toFixed(2)} each</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  className="w-6 h-6 rounded bg-[#1f2a30] text-[#8fa3ad] hover:text-[#e6f1f5] disabled:opacity-30 cursor-pointer text-sm"
                >
                  -
                </button>
                <span className="w-8 text-center text-sm text-[#e6f1f5]">{item.quantity}</span>
                <button
                  onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                  className="w-6 h-6 rounded bg-[#1f2a30] text-[#8fa3ad] hover:text-[#e6f1f5] cursor-pointer text-sm"
                >
                  +
                </button>
              </div>
              <div className="text-sm text-[#e6f1f5] w-20 text-right">Ar {item.total.toFixed(2)}</div>
              {order.status === 'confirmed' && (
                <button
                  onClick={() => cancelItem(item.id, item.product_name)}
                  className="p-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                  title="Cancel item"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="glass p-4 rounded-2xl mb-4 space-y-2">
        {order.delivery_cost > 0 && (
          <div className="flex justify-between text-xs text-[#8fa3ad]/70">
            <span>Delivery</span><span>Ar {order.delivery_cost.toFixed(2)}</span>
          </div>
        )}
        {order.remise > 0 && (
          <div className="flex justify-between text-xs text-[#8fa3ad]/70">
            <span>Remise</span><span>- Ar {order.remise.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold">
          <span className="text-neon-green">TOTAL</span>
          <span className="text-neon-green">Ar {order.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Cancel Entire Order */}
      {order.status === 'confirmed' && (
        <button
          onClick={cancelEntireOrder}
          className="w-full py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer font-medium"
        >
          Cancel Entire Order
        </button>
      )}
    </div>
  );
}
