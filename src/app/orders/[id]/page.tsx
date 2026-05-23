"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  printReceipt as serialPrint,
  type ReceiptLine,
} from "@/lib/printer";

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
  const [orderId, setOrderId] = useState<string>("");

  // Editable state
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [remise, setRemise] = useState(0);
  const [items, setItems] = useState<Array<{ id: string; productName: string; quantity: number; price: number; total: number; isNew?: boolean }>>([]);

  useEffect(() => {
    async function init() {
      const resolvedParams = await params;
      setOrderId(resolvedParams.id);
      loadOrder(resolvedParams.id);
    }
    init();
  }, [params]);

  async function loadOrder(id: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error loading order:", error);
      setLoading(false);
      return;
    }

    if (data) {
      setOrder(data as Order);
      setCustomer(data.customer);
      setPhone(data.phone || "");
      setAddress(data.address || "");
      setOrderDate(data.order_date);
      setDeliveryCost(data.delivery_cost);
      setRemise(data.remise);
      setItems(data.order_items.map((item: OrderItem) => ({
        id: item.id,
        productName: item.product_name,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
      })));
    }
    setLoading(false);
  }

  function updateItem(index: number, field: 'quantity' | 'price' | 'productName', value: string | number) {
    const newItems = [...items];
    if (field === 'quantity' || field === 'price') {
      const numValue = parseFloat(value as string) || 0;
      (newItems[index] as any)[field] = numValue;
      newItems[index].total = newItems[index].quantity * newItems[index].price;
    } else {
      (newItems[index] as any)[field] = value;
    }
    setItems(newItems);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function addItem() {
    setItems([...items, {
      id: crypto.randomUUID(),
      productName: '',
      quantity: 1,
      price: 0,
      total: 0,
      isNew: true,
    }]);
  }

  async function handleSaveChanges() {
    const supabase = createClient();
    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const total = Math.max(0, subtotal + deliveryCost - remise);

    // Update order
    const { error: orderError } = await supabase
      .from("orders")
      .update({
        customer,
        phone,
        address,
        order_date: orderDate,
        subtotal,
        delivery_cost: deliveryCost,
        remise,
        total,
      })
      .eq("id", orderId);

    if (orderError) {
      console.error("Error updating order:", orderError);
      alert("Failed to save order");
      return;
    }

    // Delete removed items (not new ones)
    const existingItemIds = items.filter(i => !i.isNew).map(i => i.id);
    const { data: currentItems } = await supabase.from("order_items").select("id").eq("order_id", orderId);
    const currentItemIds = currentItems?.map((i: any) => i.id) || [];
    const toDelete = currentItemIds.filter((id: string) => !existingItemIds.includes(id));

    if (toDelete.length > 0) {
      await supabase.from("order_items").delete().in("id", toDelete);
    }

    // Update existing items
    for (const item of items) {
      if (!item.isNew && item.id) {
        await supabase
          .from("order_items")
          .update({
            product_name: item.productName,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
          })
          .eq("id", item.id);
      }
    }

    // Insert new items
    for (const item of items) {
      if (item.isNew) {
        await supabase.from("order_items").insert({
          order_id: orderId,
          product_id: crypto.randomUUID(),
          product_name: item.productName,
          quantity: item.quantity,
          price: item.price,
          total: item.quantity * item.price,
        });
      }
    }

    alert("Changes saved successfully");
    loadOrder(orderId);
  }

  function buildReceiptLines(): ReceiptLine[] {
    const money = (value: number) => `${value.toFixed(2)} Ar`;
    const lines: ReceiptLine[] = [
      { type: 'spacer' },
      { text: 'MBALA&ITSAKA', align: 'center', bold: true, doubleWidth: true, doubleHeight: true },
      { type: 'spacer' },
      { text: 'Nif  : 5019196096', align: 'center' },
      { text: 'Stat : 47912 11 2025 0 03311', align: 'center' },
      { type: 'spacer' },
      { type: 'divider' },
      { text: 'Date:'.padEnd(14) + orderDate, align: 'left' },
      { text: 'Customer:'.padEnd(14) + customer, align: 'left' },
      { text: 'Phone:'.padEnd(14) + (phone || ''), align: 'left' },
      { text: 'Address:'.padEnd(14) + (address || ''), align: 'left' },
      { type: 'divider' },
      { text: 'Receipt: ' + orderId, align: 'left' },
      { type: 'divider' },
      { type: 'spacer' },
    ];
    items.forEach(item => {
      lines.push({ text: item.productName, align: 'left', bold: true });
      lines.push({ type: 'columns', left: `  x${item.quantity} @ ${money(item.price)}`, right: money(item.quantity * item.price) });
      lines.push({ type: 'spacer' });
    });
    lines.push({ type: 'divider' });
    lines.push({ type: 'columns', left: 'Subtotal', right: money(subtotal) });
    if (deliveryCost > 0) {
      lines.push({ type: 'columns', left: 'Livraison', right: money(deliveryCost) });
    }
    if (remise > 0) {
      lines.push({ type: 'columns', left: 'Remise', right: `- ${money(remise)}` });
    }
    lines.push({ type: 'divider' });
    lines.push({ type: 'columns', left: 'TOTAL', right: money(total), bold: true });
    lines.push({ type: 'divider' });
    lines.push({ type: 'spacer' });
    lines.push({ text: 'Misaotra nanjifa !', align: 'center', bold: true });
    lines.push({ type: 'spacer' });
    lines.push({ type: 'spacer' });
    return lines;
  }

  async function handleReprint() {
    const serialAvailable = typeof navigator !== 'undefined' && !!(navigator as any).serial;
    if (!serialAvailable) {
      alert('Web Serial is only available in Chrome on Android.');
      return;
    }
    try {
      await serialPrint(buildReceiptLines(), { paperWidth: 46, cutAfter: true });
    } catch (error) {
      console.error('Serial print error:', error);
      alert('Could not print. Tap Connect Printer first, then try again.');
    }
  }


  async function handleCancelOrder() {
    if (!confirm(`Cancel entire order #${orderId.slice(0, 8)}...?`)) return;

    const supabase = createClient();
    const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);

    if (error) {
      console.error("Error cancelling order:", error);
      return;
    }

    loadOrder(orderId);
  }

  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const total = Math.max(0, subtotal + deliveryCost - remise);

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
    <div className="min-h-screen flex flex-col p-3 sm:p-4" style={{ background: '#0d1518', minHeight: '100dvh', paddingBottom: '160px', overflowY: 'auto' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push('/?page=report')}
          className="p-2 rounded-xl bg-[#162126] border border-[#1f2a30] text-[#8fa3ad] hover:text-[#e6f1f5] transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold gradient-text">Edit Order</h1>
          <p className="text-[#8fa3ad]/95 text-sm">ORD#{orderId.slice(0, 8)}</p>
        </div>
        <div className={`text-xs px-2 py-0.5 rounded-full capitalize ${
          order.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
          order.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
          'bg-[#162126] text-[#8fa3ad]'
        }`}>
          {order.status}
        </div>
      </div>

      {/* Info Card */}
      <div className="glass p-4 rounded-2xl mb-4 space-y-3">
        <div>
          <label className="text-xs text-[#8fa3ad]/95 mb-1 block">Customer</label>
          <input type="text" value={customer} onChange={(e) => setCustomer(e.target.value)} className="w-full py-3 px-4" />
        </div>
        <div>
          <label className="text-xs text-[#8fa3ad]/95 mb-1 block">Phone</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full py-3 px-4" />
        </div>
        <div>
          <label className="text-xs text-[#8fa3ad]/95 mb-1 block">Address</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full py-3 px-4" />
        </div>
        <div>
          <label className="text-xs text-[#8fa3ad]/95 mb-1 block">Date</label>
          <input
            type="date"
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
            className="w-full py-3 px-4"
          />
        </div>
      </div>

      {/* Items */}
      <div className="mb-4">
        <label className="text-xs text-[#8fa3ad]/95 mb-2 block">Items</label>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={item.id} className="glass p-4 rounded-2xl bg-[#0d1518]">
              {/* Line 1: Name + Delete */}
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={item.productName}
                  onChange={(e) => updateItem(index, 'productName', e.target.value)}
                  className="flex-1 min-w-0 py-2 px-3 text-sm"
                  placeholder="Item name"
                />
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-red-400 hover:text-red-300 cursor-pointer text-lg p-1 shrink-0"
                >
                  ✕
                </button>
              </div>
              {/* Line 2: QTY × Price = Total */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#8fa3ad]/80">QTY</span>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                  className="no-spinners w-16 py-2 px-3 text-sm"
                />
                <span className="text-xs text-[#8fa3ad]/80">×</span>
                <span className="text-xs text-[#8fa3ad]/80">Price</span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={item.price}
                  onChange={(e) => updateItem(index, 'price', e.target.value)}
                  className="no-spinners w-24 py-2 px-3 text-sm"
                />
                <span className="text-xs text-[#8fa3ad]/80">=</span>
                <span className="text-sm text-neon-green">Ar {item.total.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addItem}
          className="w-full mt-3 py-3 rounded-xl bg-[#162126] border border-[#1f2a30] text-[#e6f1f5]/80 text-sm hover:bg-[#1f2a30] transition-colors cursor-pointer"
        >
          + Add Item
        </button>
      </div>

      {/* Costs */}
      <div className="glass p-4 rounded-2xl mb-4 space-y-3">
        <div>
          <label className="text-xs text-[#8fa3ad]/95 mb-1 block">Delivery Cost</label>
          <input type="number" step="0.01" min={0} value={deliveryCost} onChange={(e) => setDeliveryCost(parseFloat(e.target.value) || 0)} placeholder="0" className="no-spinners w-full py-3 px-4" />
        </div>
        <div>
          <label className="text-xs text-[#8fa3ad]/95 mb-1 block">Remise/Discount</label>
          <input type="number" step="0.01" min={0} value={remise} onChange={(e) => setRemise(parseFloat(e.target.value) || 0)} placeholder="0" className="no-spinners w-full py-3 px-4" />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#e6f1f5]/90">Subtotal</span>
          <span className="text-[#e6f1f5]/90">Ar {subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold">
          <span className="text-neon-green">Total</span>
          <span className="text-neon-green">Ar {total.toFixed(2)}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button onClick={handleSaveChanges} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-neon-pink to-neon-purple text-[#e6f1f5] font-medium text-sm hover:opacity-90 transition-opacity cursor-pointer neon-glow-pink">
          Save Changes
        </button>
        <button onClick={handleReprint} className="flex-1 py-3 rounded-xl bg-[#162126] border border-[#1f2a30] text-[#e6f1f5]/80 text-sm hover:bg-[#1f2a30] transition-colors cursor-pointer">
          Reprint
        </button>
        {order.status === 'confirmed' && (
          <button onClick={handleCancelOrder} className="flex-1 py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 text-sm hover:bg-red-500/30 transition-colors cursor-pointer">
            Cancel Order
          </button>
        )}
      </div>
    </div>
  );
}
