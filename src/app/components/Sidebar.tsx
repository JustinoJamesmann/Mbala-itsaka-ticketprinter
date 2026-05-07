"use client";

import { Page, User } from "../types";

const navItems: { id: Page; label: string }[] = [
  { id: "newOrder", label: "New Order" },
  { id: "report", label: "Report" },
];

export default function Sidebar({ currentPage, onNavigate, currentUser, onLogout }: { currentPage: Page; onNavigate: (p: Page) => void; currentUser: User; onLogout: () => void }) {
  return (
    <aside className="fixed left-0 top-0 h-full w-64 flex flex-col z-50" style={{ background: '#162126', borderRight: '1px solid rgba(127,32,32,0.08)', borderRadius: '16px', margin: '16px 0 16px 16px', height: 'calc(100% - 32px)', boxShadow: '0 6px 24px rgba(127,32,32,0.18), 0 2px 8px rgba(127,32,32,0.10)' }}>
      <div className="px-6 border-b border-[#1f2a30] flex items-center justify-center">
        <img src="/logo.png" alt="Logo" className="h-48 w-auto object-contain" />
      </div>

      <nav className="flex-1 py-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-6 py-3 text-sm transition-all duration-200 cursor-pointer ${
              currentPage === item.id
                ? "sidebar-active text-[#e6f1f5] font-bold"
                : "text-[#e6f1f5] hover:bg-[#d14b4b]/10"
            }`}
          >
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-[#1f2a30] space-y-3">
        <div className="p-4 rounded-2xl bg-[#162126]" style={{ boxShadow: '0 2px 10px rgba(127,32,32,0.12)' }}>
          <div className="text-xs text-[#8fa3ad]/90 mb-1">Logged in as</div>
          <div className="text-sm text-[#e6f1f5] font-medium truncate normal-case" title={currentUser.username}>{currentUser.username}</div>
          <div className="text-xs text-[#8fa3ad] capitalize">{currentUser.role}</div>
        </div>
        <button
          onClick={onLogout}
          className="w-full py-2.5 rounded-xl bg-[#162126] border border-[#1f2a30] text-[#e6f1f5] text-sm hover:bg-[#d14b4b]/8 transition-colors cursor-pointer"
          style={{ boxShadow: '0 2px 8px rgba(127,32,32,0.10)' }}
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
