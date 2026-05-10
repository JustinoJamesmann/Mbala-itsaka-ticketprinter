"use client";

import { Page, User } from "../types";
import { useState } from "react";

const navItems: { id: Page; label: string }[] = [
  { id: "newOrder", label: "New Order" },
  { id: "report", label: "Report" },
];

export default function Sidebar({ currentPage, onNavigate, currentUser, onLogout }: { currentPage: Page; onNavigate: (p: Page) => void; currentUser: User; onLogout: () => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 rounded-xl bg-[#162126] border border-[#1f2a30] text-[#e6f1f5] hover:bg-[#d14b4b]/8 transition-colors cursor-pointer"
        style={{ boxShadow: '0 2px 8px rgba(127,32,32,0.10)' }}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full z-50 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{
          background: '#162126',
          borderRight: '1px solid rgba(127,32,32,0.08)',
          borderRadius: '16px',
          margin: '16px 0 16px 16px',
          height: 'calc(100% - 32px)',
          boxShadow: '0 6px 24px rgba(127,32,32,0.18), 0 2px 8px rgba(127,32,32,0.10)',
          width: '16rem'
        }}
      >
        <div className="px-6 border-b border-[#1f2a30] flex items-center justify-center">
          <img src="/logo.png" alt="Logo" className="h-32 w-auto object-contain" />
        </div>

        <nav className="flex-1 py-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setIsOpen(false);
              }}
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
            onClick={() => {
              onLogout();
              setIsOpen(false);
            }}
            className="w-full py-2.5 rounded-xl bg-[#162126] border border-[#1f2a30] text-[#e6f1f5] text-sm hover:bg-[#d14b4b]/8 transition-colors cursor-pointer"
            style={{ boxShadow: '0 2px 8px rgba(127,32,32,0.10)' }}
          >
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
