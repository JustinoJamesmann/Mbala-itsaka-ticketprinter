"use client";

import { Order } from "../types";
import { useState } from "react";
import Calendar from "./Calendar";

export default function CreateOrderForm({ onSave, onClose }: { onSave: (o: Omit<Order, "id">) => void; onClose: () => void }) {
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [items, setItems] = useState<Array<{ productName: string; quantity: number; price: number; total: number }>>([]);
  const [itemName, setItemName] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [remise, setRemise] = useState(0);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);

  function addItem() {
    const parsedQty = parseInt(qty) || 0;
    const parsedPrice = parseFloat(price) || 0;
    if (!itemName || parsedQty <= 0 || parsedPrice <= 0) return;
    const total = parsedQty * parsedPrice;
    setItems([...items, { productName: itemName, quantity: parsedQty, price: parsedPrice, total }]);
    setItemName("");
    setQty("");
    setPrice("");
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customer || items.length === 0) return;
    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const total = Math.max(0, subtotal + deliveryCost - remise);
    onSave({
      customer,
      phone,
      address,
      items: items.map(item => ({ ...item, productId: item.productName })),
      subtotal,
      deliveryCost,
      remise,
      total,
      status: "pending",
      date: orderDate,
    });
  }

  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const total = Math.max(0, subtotal + deliveryCost - remise);

  return (
    <div className="space-y-6">
      <div className="glass p-4 sm:p-6 lg:p-8 neon-glow-pink bg-[#0a0a1a]">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-[#8fa3ad]/95 mb-1 block">Customer Name</label>
            <input type="text" required value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name" />
          </div>

          <div>
            <label className="text-xs text-[#8fa3ad]/95 mb-1 block">Phone Number (Optional)</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
          </div>

          <div>
            <label className="text-xs text-[#8fa3ad]/95 mb-1 block">Address (Optional)</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Delivery address" />
          </div>

          <div>
            <label className="text-xs text-[#8fa3ad]/95 mb-1 block">live date</label>
            <Calendar value={orderDate} onChange={setOrderDate} />
          </div>

          {/* Add items manually */}
          <div className="glass p-4 bg-[#0d1518]">
            <label className="text-xs text-[#8fa3ad]/95 mb-1 block">Add Item</label>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Item name"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-[#8fa3ad]/95 mb-1 block">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="QTY"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="no-spinners"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#8fa3ad]/95 mb-1 block">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="no-spinners"
                  />
                </div>
              </div>
              <button type="button" onClick={addItem} className="w-full px-4 py-2 rounded-xl bg-neon-purple/20 text-neon-purple text-sm hover:bg-neon-purple/30 transition-colors cursor-pointer">
                Add Item
              </button>
            </div>
          </div>

          {/* Item list */}
          {items.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs text-[#8fa3ad]/95 mb-1 block">Items</label>
              {items.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-[#0d1518] border border-[#1f2a30]">
                  <div>
                    <div className="text-sm text-[#e6f1f5]/90">{item.productName}</div>
                    <div className="text-xs text-[#8fa3ad]/95">{item.quantity}x @ Ar {item.price.toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-neon-green">Ar {item.total.toFixed(2)}</div>
                    <button type="button" onClick={() => removeItem(index)} className="text-red-400 hover:text-red-300 cursor-pointer">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-[#8fa3ad]/95 mb-1 block">Delivery Cost (Optional)</label>
              <input type="number" step="0.01" min={0} value={deliveryCost} onChange={(e) => setDeliveryCost(parseFloat(e.target.value) || 0)} placeholder="0" className="no-spinners" />
            </div>
            <div>
              <label className="text-xs text-[#8fa3ad]/95 mb-1 block">Remise/Discount (Optional)</label>
              <input type="number" step="0.01" min={0} value={remise} onChange={(e) => setRemise(parseFloat(e.target.value) || 0)} placeholder="0" className="no-spinners" />
            </div>
          </div>

          {/* Summary */}
          {items.length > 0 && (
            <div className="glass p-4 bg-[#0d1518]">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#e6f1f5]/90">Subtotal:</span>
                <span className="text-[#e6f1f5]/90">Ar {subtotal.toFixed(2)}</span>
              </div>
              {deliveryCost > 0 && (
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#e6f1f5]/90">Delivery:</span>
                  <span className="text-[#e6f1f5]/90">Ar {deliveryCost.toFixed(2)}</span>
                </div>
              )}
              {remise > 0 && (
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#e6f1f5]/90">Remise:</span>
                  <span className="text-[#e6f1f5]/90">- Ar {remise.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t border-[#1f2a30]">
                <span className="text-neon-green">Total:</span>
                <span className="text-neon-green">Ar {total.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={!customer || items.length === 0} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-neon-pink to-neon-purple text-[#e6f1f5] font-medium text-sm hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed neon-glow-pink">
              Create Order & Print
            </button>
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-[#d14b4b]/8 border border-[#1f2a30] text-[#e6f1f5]/80 text-sm hover:bg-[#d14b4b]/10 transition-colors cursor-pointer">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
