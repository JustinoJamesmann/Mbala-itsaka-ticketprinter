"use client";

import { Order, User } from "../types";
import { useState } from "react";
import Calendar from "./Calendar";

export default function Report({ orders, currentUser, onRefresh }: { orders: Order[]; currentUser: User; onRefresh?: () => void }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [showAll, setShowAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  async function handleRefresh() {
    if (!onRefresh) return;
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  }

  const visibleOrders = (showAll
    ? orders
    : orders.filter(o => o.date === selectedDate)
  ).filter(o => o.status !== "cancelled");

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

      {/* Date filter row */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="flex items-center gap-2 flex-1">
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
              <button
                type="button"
                onClick={() => setExpandedOrders(prev => ({ ...prev, [order.id]: !prev[order.id] }))}
                className="w-full flex items-start justify-between gap-2 text-left cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#e6f1f5]">{order.customer}</div>
                  {order.phone   && <div className="text-xs text-[#8fa3ad]/80">{order.phone}</div>}
                  <div className="text-xs text-[#8fa3ad]/80 capitalize">{order.status}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-[#8fa3ad]/60">{order.id}</div>
                  <div className="text-xs text-[#8fa3ad]/60">{order.date}</div>
                  {order.deliveryCost > 0 && <div className="text-xs text-[#8fa3ad]/70">Livraison: Ar {order.deliveryCost.toFixed(2)}</div>}
                  {order.remise > 0 && <div className="text-xs text-[#8fa3ad]/70">Remise: Ar {order.remise.toFixed(2)}</div>}
                  <div className="text-sm font-bold text-neon-green">Ar {order.total.toFixed(2)}</div>
                </div>
              </button>

              {/* Items */}
              {expandedOrders[order.id] && (
                <div className="space-y-1 border-t border-[#1f2a30] pt-2">
                  {order.address && <div className="text-xs text-[#8fa3ad]/80 pb-1">{order.address}</div>}
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-[#e6f1f5]/80 truncate flex-1">{item.productName} <span className="text-[#8fa3ad]/60">×{item.quantity}</span></span>
                      <span className="text-[#e6f1f5]/80 ml-2 shrink-0">Ar {item.total.toFixed(2)}</span>
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
