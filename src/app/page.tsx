"use client";

import { Order, Page, User } from "./types";
import Report from "./components/Report";
import CreateOrderForm from "./components/CreateOrderForm";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  autoConnect,
  connectPrinter,
  printReceipt as serialPrint,
  onStatusChange,
  type PrinterStatus,
  type ReceiptLine,
} from "@/lib/printer";

function HomeContent() {
  const searchParams = useSearchParams();
  const [page, setPage] = useState<Page>("newOrder");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>("disconnected");

  useEffect(() => {
    async function bootstrap() {
      try {
        // Check localStorage for persisted session
        const saved = localStorage.getItem('session_user');
        if (saved) {
          setCurrentUser(JSON.parse(saved));
        }

        const response = await fetch("/api/bootstrap");
        const data = await response.json();
        if (data.user) {
          setCurrentUser(data.user);
          localStorage.setItem('session_user', JSON.stringify(data.user));
        }
        setOrders(data.orders || []);
      } finally {
        setLoaded(true);
      }
    }
    bootstrap();
    const unsubscribe = onStatusChange(setPrinterStatus);
    autoConnect();
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const pageParam = searchParams.get("page");
    if (pageParam === "report") {
      setPage("report");
    }
  }, [searchParams]);

  async function refreshData() {
    setDataLoading(true);
    const ordersResponse = await fetch("/api/orders");
    const ordersData = await ordersResponse.json();
    setOrders(ordersData.orders || []);
    setDataLoading(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: loginUsername, password: loginPassword }),
    });
    const data = await response.json();
    if (response.ok && data.user) {
      setCurrentUser(data.user);
      localStorage.setItem('session_user', JSON.stringify(data.user));
      setLoginError("");
      setLoginUsername("");
      setLoginPassword("");
      refreshData();
    } else {
      setLoginError(data.error || "Invalid username or password");
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem('session_user');
    setCurrentUser(null);
    setOrders([]);
  }

  async function handleSetOrders(nextOrders: Order[]) {
    const previousOrders = orders;
    setOrders(nextOrders);

    const deleted = previousOrders.find(order => !nextOrders.some(next => next.id === order.id));
    const created = nextOrders.find(order => !previousOrders.some(previous => previous.id === order.id));
    const updated = nextOrders.find(order => {
      const previous = previousOrders.find(o => o.id === order.id);
      return previous && previous.status !== order.status;
    });

    if (deleted) {
      await fetch("/api/orders", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deleted.id }) });
    } else if (created) {
      await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(created) });
    } else if (updated) {
      await fetch("/api/orders", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
    }
    await refreshData();
  }

  function buildReceiptLines(order: Order): ReceiptLine[] {
    const money = (value: number) => `${value.toFixed(2)} Ar`;
    const lines: ReceiptLine[] = [
      { type: 'spacer' },
      { text: 'MBALA&ITSAKA', align: 'center', bold: true, doubleWidth: true, doubleHeight: true },
      { type: 'spacer' },
      { text: 'Nif  : 5019196096', align: 'center' },
      { text: 'Stat : 47912 11 2025 0 03311', align: 'center' },
      { type: 'spacer' },
      { type: 'divider' },
      { text: 'Date:'.padEnd(14) + order.date, align: 'left' },
      { text: 'Customer:'.padEnd(14) + order.customer, align: 'left' },
      { text: 'Phone:'.padEnd(14) + (order.phone || ''), align: 'left' },
      { text: 'Address:'.padEnd(14) + (order.address || ''), align: 'left' },
      { type: 'divider' },
      { text: 'Receipt: ' + order.id, align: 'left' },
      { type: 'divider' },
      { type: 'spacer' },
    ];
    order.items.forEach(item => {
      lines.push({ text: item.productName, align: 'left', bold: true });
      lines.push({ type: 'columns', left: `  x${item.quantity} @ ${money(item.price)}`, right: money(item.quantity * item.price) });
      lines.push({ type: 'spacer' });
    });
    lines.push({ type: 'divider' });
    lines.push({ type: 'columns', left: 'Subtotal', right: money(order.subtotal) });
    if (order.deliveryCost > 0) {
      lines.push({ type: 'columns', left: 'Livraison', right: money(order.deliveryCost) });
    }
    if (order.remise > 0) {
      lines.push({ type: 'columns', left: 'Remise', right: `- ${money(order.remise)}` });
    }
    lines.push({ type: 'divider' });
    lines.push({ type: 'columns', left: 'TOTAL', right: money(order.total), bold: true });
    lines.push({ type: 'divider' });
    lines.push({ type: 'spacer' });
    lines.push({ text: 'Misaotra nanjifa !', align: 'center', bold: true });
    lines.push({ type: 'spacer' });
    lines.push({ type: 'spacer' });
    return lines;
  }

  async function printOrderReceipt(order: Order) {
    const serialAvailable = typeof navigator !== 'undefined' && !!(navigator as any).serial;
    if (!serialAvailable) {
      alert('Web Serial is only available in Chrome on Android.');
      return;
    }
    try {
      await serialPrint(buildReceiptLines(order), { paperWidth: 46, cutAfter: true });
    } catch (error) {
      console.error('Serial print error:', error);
      alert('Could not print. Tap Connect Printer first, then try again.');
    }
  }

  async function handleConnectPrinter() {
    try {
      await connectPrinter();
    } catch (error: any) {
      alert(error.message || 'Could not connect to printer. Use Chrome on Android after pairing the printer in Android Bluetooth settings.');
    }
  }

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0d1518' }}>
        <div className="text-center w-full max-w-sm">
          <img src="/logo.png" alt="Mbala&Itsaka" className="h-24 sm:h-32 md:h-40 w-auto mx-auto mb-4 object-contain" />
          <div className="text-2xl sm:text-3xl font-bold gradient-text mb-2">Mbala&amp;Itsaka</div>
          <div className="text-sm text-[#8fa3ad]/95 animate-pulse-neon">Loading...</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0d1518' }}>
        <div className="glass p-6 sm:p-8 w-full max-w-md bg-[#0d1518]">
          <img src="/logo.png" alt="Mbala&Itsaka" className="h-24 sm:h-32 w-auto mx-auto mb-3 object-contain" />
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-6 text-center">Mbala&amp;Itsaka</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-[#8fa3ad]/95 mb-1 block">Email</label>
              <input
                type="email"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                required
                className="w-full py-3 px-4"
              />
            </div>
            <div>
              <label className="text-xs text-[#8fa3ad]/95 mb-1 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="pr-10 w-full py-3 px-4"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8fa3ad]/95 hover:text-[#e6f1f5] transition-colors cursor-pointer text-lg"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
            {loginError && (
              <div className="text-neon-red text-sm text-center">{loginError}</div>
            )}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-neon-purple to-neon-cyan text-[#e6f1f5] font-medium text-sm hover:opacity-90 transition-opacity cursor-pointer"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0d1518' }}>

      {/* Floating logout */}
      <button
        onClick={handleLogout}
        className="fixed top-3 right-3 z-50 p-2.5 rounded-xl bg-[#162126] border border-[#1f2a30] text-[#8fa3ad] hover:text-red-400 hover:border-red-400/20 transition-colors cursor-pointer mr-4"
        title="Sign Out"
        style={{ boxShadow: '0 2px 8px rgba(127,32,32,0.10)' }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>

      {/* Main content */}
      <main className="flex-1 w-full p-3 sm:p-4 pb-24 overflow-auto min-h-screen">
        {dataLoading && (
          <div className="fixed top-3 right-14 z-40 glass px-3 py-2 text-xs text-[#e6f1f5]/80">
            Loading...
          </div>
        )}
        {page === "newOrder" && (
          <div className="animate-fade-in-up space-y-4 sm:space-y-6 pt-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold gradient-text">New Order</h1>
                <p className="text-[#8fa3ad]/95 text-sm mt-1">Create a ticket sale</p>
              </div>
              <button
                type="button"
                onClick={handleConnectPrinter}
                className={`px-3 py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                  printerStatus === "connected"
                    ? "bg-neon-green/10 border-neon-green/40 text-neon-green"
                    : printerStatus === "reconnecting"
                      ? "bg-neon-purple/10 border-neon-purple/40 text-neon-purple"
                      : "bg-[#162126] border-[#1f2a30] text-[#8fa3ad]"
                }`}
              >
                {printerStatus === "connected" ? "Printer ✓" : printerStatus === "reconnecting" ? "Connecting..." : "Connect Printer"}
              </button>
            </div>
            <CreateOrderForm
              onSave={async (order) => {
                const response = await fetch("/api/orders", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(order),
                });
                const data = await response.json();
                if (!response.ok) {
                  alert(data.error || "Failed to save order");
                  return;
                }
                const savedOrder = data.order as Order;
                setOrders([savedOrder, ...orders]);
                setPage("report");
                setTimeout(() => printOrderReceipt(savedOrder), 100);
              }}
              onClose={() => setPage("report")}
            />
          </div>
        )}
        {page === "report" && <Report orders={orders} currentUser={currentUser} onRefresh={refreshData} />}
      </main>

      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex"
        style={{ background: '#162126', borderTop: '1px solid rgba(31,42,48,1)', boxShadow: '0 -4px 24px rgba(127,32,32,0.10)' }}
      >
        <button
          onClick={() => setPage('newOrder')}
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors cursor-pointer ${
            page === 'newOrder' ? 'text-neon-purple' : 'text-[#8fa3ad]'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Order</span>
        </button>
        <button
          onClick={() => setPage('report')}
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors cursor-pointer ${
            page === 'report' ? 'text-neon-purple' : 'text-[#8fa3ad]'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>Report</span>
        </button>
      </nav>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div style={{ background: '#0d1518', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8fa3ad' }}>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
