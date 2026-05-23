"use client";

import { Order, User } from "../types";
import { useState } from "react";
import Calendar from "./Calendar";

export default function Report({ orders, currentUser, onRefresh }: { orders: Order[]; currentUser: User; onRefresh?: () => void }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [showAll, setShowAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  async function handleRefresh() {
    if (!onRefresh) return;
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  }

  async function handleCancelOrder(orderId: string) {
    const response = await fetch("/api/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: orderId, status: "cancelled" }),
    });
    if (response.ok) {
      await onRefresh?.();
    }
  }

  async function handleCancelItem(itemId: string, orderId: string) {
    const response = await fetch("/api/order-items", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: itemId }),
    });
    if (response.ok) {
      // Recalculate and update order totals
      const order = orders.find(o => o.id === orderId);
      if (order) {
        const remainingItems = order.items.filter(i => i.productId !== itemId);
        const newSubtotal = remainingItems.reduce((sum, i) => sum + i.total, 0);
        const newTotal = Math.max(0, newSubtotal + order.deliveryCost - order.remise);
        await fetch("/api/orders", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: orderId, subtotal: newSubtotal, total: newTotal }),
        });
      }
      await onRefresh?.();
    }
  }

  async function handleCancelSelected() {
    if (selectedOrderIds.size === 0) return;
    for (const id of selectedOrderIds) {
      await handleCancelOrder(id);
    }
    setSelectedOrderIds(new Set());
  }

  const visibleOrders = (showAll
    ? orders
    : orders.filter(o => o.date === selectedDate)
  );

  const totalRevenue = visibleOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders  = visibleOrders.length;

  return (
    <div className="animate-fade-in-up space-y-4 pt-2">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold gradient-text">Report</h1>
          <p className="text-[#8fa3ad]/95 text-sm mt-0.5">Order history</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedOrderIds.size > 0 && (
            <button
              onClick={handleCancelSelected}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer"
            >
              Cancel Selected ({selectedOrderIds.size})
            </button>
          )}
          {onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-[#162126] border border-[#1f2a30] text-[#8fa3ad] hover:text-[#e6f1f5] transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh"
            >
              <svg className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Date filter row */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="flex items-center gap-2 flex-1">
          <input
            type="checkbox"
            checked={visibleOrders.length > 0 && selectedOrderIds.size === visibleOrders.length}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedOrderIds(new Set(visibleOrders.map(o => o.id)));
              } else {
                setSelectedOrderIds(new Set());
              }
            }}
            className="w-4 h-4 rounded border-[#1f2a30] bg-[#162126] text-neon-purple focus:ring-neon-purple cursor-pointer"
          />
          <label className="text-sm text-[#e6f1f5]/80 shrink-0">Date:</label>
          <div className={showAll ? 'opacity-40 pointer-events-none' : ''}>
            <Calendar value={selectedDate} onChange={setSelectedDate} />
          </div>
        </div>
        <button
          onClick={() => setShowAll(v => !v)}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer border ${
            showAll
              ? 'bg-neon-purple/20 border-neon-purple/40 text-neon-purple'
              : 'bg-[#162126] border-[#1f2a30] text-[#8fa3ad]'
          }`}
        >
          {showAll ? 'All dates ✓' : 'All dates'}
        </button>
      </div>

      {/* Summary bar */}
      {totalOrders > 0 && (
        <div className="flex gap-3">
          <div className="glass flex-1 p-3 rounded-xl text-center">
            <div className="text-xs text-[#8fa3ad]/80 mb-0.5">Orders</div>
            <div className="text-lg font-bold text-[#e6f1f5]">{totalOrders}</div>
          </div>
          <div className="glass flex-1 p-3 rounded-xl text-center">
            <div className="text-xs text-[#8fa3ad]/80 mb-0.5">Revenue</div>
            <div className="text-lg font-bold text-neon-green">Ar {totalRevenue.toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* Order list */}
      {visibleOrders.length === 0 ? (
        <div className="glass p-8 rounded-2xl text-center">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-[#8fa3ad]/80 text-sm">
            {showAll ? 'No orders yet' : `No orders for ${selectedDate}`}
          </div>
          {!showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="mt-3 text-xs text-neon-purple underline cursor-pointer"
            >
              Show all dates
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleOrders.map(order => (
            <div key={order.id} className="glass p-4 rounded-2xl space-y-3">
              {/* Order header */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedOrderIds.has(order.id)}
                  onChange={(e) => {
                    const newSet = new Set(selectedOrderIds);
                    if (e.target.checked) {
                      newSet.add(order.id);
                    } else {
                      newSet.delete(order.id);
                    }
                    setSelectedOrderIds(newSet);
                  }}
                  className="w-4 h-4 mt-1 rounded border-[#1f2a30] bg-[#162126] text-neon-purple focus:ring-neon-purple cursor-pointer shrink-0"
                />
                <button
                  type="button"
                  onClick={() => setExpandedOrders(prev => ({ ...prev, [order.id]: !prev[order.id] }))}
                  className="flex-1 flex items-start justify-between gap-2 text-left cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#e6f1f5]">{order.customer}</div>
                    {order.phone   && <div className="text-xs text-[#8fa3ad]/80">{order.phone}</div>}
                    <div className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 capitalize ${
                      order.status === 'confirmed' ? 'bg-green-500/20 text-green-400' : 
                      order.status === 'cancelled' ? 'bg-red-500/20 text-red-400' : 
                      'bg-[#162126] text-[#8fa3ad]'
                    }`}>
                      {order.status}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-[#8fa3ad]/60">{order.id.slice(0, 8)}...</div>
                    <div className="text-xs text-[#8fa3ad]/60">{order.date}</div>
                    {order.deliveryCost > 0 && <div className="text-xs text-[#8fa3ad]/70">Livraison: Ar {order.deliveryCost.toFixed(2)}</div>}
                    {order.remise > 0 && <div className="text-xs text-[#8fa3ad]/70">Remise: Ar {order.remise.toFixed(2)}</div>}
                    <div className="text-sm font-bold text-neon-green">Ar {order.total.toFixed(2)}</div>
                  </div>
                </button>
                {order.status === 'confirmed' && (
                  <button
                    onClick={() => handleCancelOrder(order.id)}
                    className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer shrink-0"
                    title="Cancel order"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Items */}
              {expandedOrders[order.id] && (
                <div className="space-y-1 border-t border-[#1f2a30] pt-2">
                  {order.address && <div className="text-xs text-[#8fa3ad]/80 pb-1">{order.address}</div>}
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="text-[#e6f1f5]/80 truncate flex-1">{item.productName} <span className="text-[#8fa3ad]/60">×{item.quantity}</span></span>
                      <div className="flex items-center gap-2">
                        <span className="text-[#e6f1f5]/80 shrink-0">Ar {item.total.toFixed(2)}</span>
                        {order.status === 'confirmed' && (
                          <button
                            onClick={() => handleCancelItem(item.productId || item.productName, order.id)}
                            className="p-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                            title="Cancel item"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Totals */}
              <div className="border-t border-[#1f2a30] pt-2 space-y-1">
                {order.deliveryCost > 0 && (
                  <div className="flex justify-between text-xs text-[#8fa3ad]/70">
                    <span>Delivery</span><span>Ar {order.deliveryCost.toFixed(2)}</span>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
