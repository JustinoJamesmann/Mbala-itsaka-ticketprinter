"use client";

import { Order, Page, User } from "./types";
import Report from "./components/Report";
import CreateOrderForm from "./components/CreateOrderForm";
import { useState, useEffect } from "react";
import {
  autoConnect,
  printReceipt as blePrint,
  hasSavedPrinter,
  type ReceiptLine,
} from "@/lib/printer";

export default function Home() {
  const [page, setPage] = useState<Page>("newOrder");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      try {
        const response = await fetch("/api/bootstrap");
        const data = await response.json();
        setCurrentUser(data.user);
        setOrders(data.orders || []);
      } finally {
        setLoaded(true);
      }
    }
    bootstrap();
    autoConnect();
  }, []);

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
    const lines: ReceiptLine[] = [
      { text: 'Mbala&Itsaka', align: 'center', bold: true, doubleWidth: true },
      { type: 'spacer' },
      { text: `Receipt #${order.id}`, align: 'center', bold: true },
      { text: `Date: ${order.date}`, align: 'center' },
      { text: `Customer: ${order.customer}`, align: 'center' },
    ];
    if (order.phone)   lines.push({ text: `Phone: ${order.phone}`,     align: 'center' });
    if (order.address) lines.push({ text: `Addr:  ${order.address}`,   align: 'center' });
    lines.push({ type: 'divider' });
    order.items.forEach(item => {
      lines.push({ type: 'columns', left: `${item.productName} x${item.quantity}`, right: `Ar ${item.total.toFixed(2)}` });
    });
    lines.push({ type: 'divider' });
    lines.push({ type: 'columns', left: 'Subtotal', right: `Ar ${order.subtotal.toFixed(2)}` });
    if (order.deliveryCost > 0)
      lines.push({ type: 'columns', left: 'Delivery', right: `Ar ${order.deliveryCost.toFixed(2)}` });
    if (order.remise > 0)
      lines.push({ type: 'columns', left: 'Remise',   right: `-Ar ${order.remise.toFixed(2)}` });
    lines.push({ type: 'divider' });
    lines.push({ type: 'columns', left: 'TOTAL', right: `Ar ${order.total.toFixed(2)}`, bold: true });
    lines.push({ type: 'spacer' });
    lines.push({ text: 'misaotra nanjifa', align: 'center', feed: 1 });
    return lines;
  }

  async function printOrderReceipt(order: Order) {
    const bleAvailable = typeof navigator !== 'undefined' && !!(navigator as any).bluetooth;
    if (bleAvailable && hasSavedPrinter()) {
      try {
        await blePrint(buildReceiptLines(order), { paperWidth: 32, cutAfter: true });
        return;
      } catch (error) {
        console.error('BLE print failed, falling back to browser print:', error);
      }
    }
    openPopupReceipt(order);
  }

  function openPopupReceipt(order: Order) {
    try {
      const printWindow = window.open('', '', 'width=400,height=600');
      if (!printWindow) {
        alert('Please allow popups to print receipts');
        return;
      }

      const itemsHtml = order.items.map(item => `
        <tr>
          <td style="padding: 4px 0;">${item.productName}</td>
          <td style="padding: 4px 0; text-align: right;">${item.quantity}x</td>
          <td style="padding: 4px 0; text-align: right;">Ar ${item.total.toFixed(2)}</td>
        </tr>
      `).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt #${order.id}</title>
          <style>
            body { font-family: monospace; padding: 20px; margin: 0; color: #000; }
            h1 { text-align: center; margin: 0 0 20px 0; color: #000; }
            .logo { text-align: center; margin-bottom: 20px; }
            .logo img { max-width: 150px; height: auto; }
            .info { margin-bottom: 20px; color: #000; }
            table { width: 100%; border-collapse: collapse; color: #000; }
            th { border-bottom: 1px dashed #000; padding: 8px 0; text-align: left; color: #000; }
            td { padding: 4px 0; color: #000; }
            .total { border-top: 1px dashed #000; margin-top: 20px; padding-top: 10px; }
            .row { display: flex; justify-content: space-between; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #000; }
          </style>
        </head>
        <body>
          <div class="logo">
            <img src="/logo.png" alt="Logo" />
          </div>
          <h1>Mbala&amp;Itsaka</h1>
          <div class="info">
            <div><strong>Receipt #${order.id}</strong></div>
            <div>live date: ${order.date}</div>
            <div>Customer: ${order.customer}</div>
            ${order.phone ? `<div>Phone: ${order.phone}</div>` : ''}
            ${order.address ? `<div>Address: ${order.address}</div>` : ''}
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: right;">Qty</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="total">
            <div class="row"><span>Subtotal:</span><span>Ar ${order.subtotal.toFixed(2)}</span></div>
            <div class="row"><span>Delivery:</span><span>Ar ${(order.deliveryCost || 0).toFixed(2)}</span></div>
            <div class="row"><span>Remise:</span><span>- Ar ${(order.remise || 0).toFixed(2)}</span></div>
            <div class="row" style="font-size: 18px; font-weight: bold; margin-top: 10px;"><span>TOTAL:</span><span>Ar ${order.total.toFixed(2)}</span></div>
          </div>
          <div class="footer">
            misaotra nanjifa
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    } catch (error) {
      console.error('Print error:', error);
      alert('Error printing receipt. Please try again.');
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
        className="fixed top-3 right-3 z-50 p-2.5 rounded-xl bg-[#162126] border border-[#1f2a30] text-[#8fa3ad] hover:text-red-400 hover:border-red-400/20 transition-colors cursor-pointer"
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
            <div>
              <h1 className="text-xl sm:text-2xl font-bold gradient-text">New Order</h1>
              <p className="text-[#8fa3ad]/95 text-sm mt-1">Create a ticket sale</p>
            </div>
            <CreateOrderForm
              onSave={(order) => {
                const newOrder = { ...order, id: `ORD-${String(orders.length + 1).padStart(3, "0")}` };
                setOrders([...orders, newOrder]);
                setPage("report");
                setTimeout(() => printOrderReceipt(newOrder), 100);
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
