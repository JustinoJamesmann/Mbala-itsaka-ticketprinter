"use client";

import { useState } from "react";

export default function Calendar({ value, onChange }: { value: string; onChange: (date: string) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date(value));
  const [isOpen, setIsOpen] = useState(false);

  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startDay = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const days = [];
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  function prevMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  }

  function nextMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  }

  function selectDate(day: number) {
    const selected = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    onChange(selected.toISOString().split("T")[0]);
    setIsOpen(false);
  }

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const selectedDate = new Date(value);
  const isSelectedMonth = selectedDate.getMonth() === currentMonth.getMonth() && selectedDate.getFullYear() === currentMonth.getFullYear();

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 rounded-xl bg-[#d14b4b]/8 border border-[#1f2a30] text-[#e6f1f5] text-sm hover:bg-[#d14b4b]/12 transition-colors cursor-pointer flex items-center gap-2"
      >
        📅 {new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-[#162126] border border-[#1f2a30] rounded-xl p-4 shadow-xl min-w-[280px]">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="px-3 py-1 rounded-lg bg-[#d14b4b]/8 border border-[#1f2a30] text-[#e6f1f5] text-sm hover:bg-[#d14b4b]/12 transition-colors cursor-pointer">
              ←
            </button>
            <div className="text-lg font-semibold text-[#e6f1f5]/90">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>
            <button onClick={nextMonth} className="px-3 py-1 rounded-lg bg-[#d14b4b]/8 border border-[#1f2a30] text-[#e6f1f5] text-sm hover:bg-[#d14b4b]/12 transition-colors cursor-pointer">
              →
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-xs text-[#8fa3ad]/80 font-medium py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (day === null) {
                return <div key={index} className="p-2" />;
              }

              const isSelected = isSelectedMonth && day === selectedDate.getDate();
              const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonth.getMonth() && new Date().getFullYear() === currentMonth.getFullYear();

              return (
                <button
                  key={index}
                  onClick={() => selectDate(day)}
                  className={`p-2 rounded-lg text-sm cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-gradient-to-r from-neon-pink to-neon-purple text-[#e6f1f5] font-bold neon-glow-pink'
                      : isToday
                      ? 'bg-[#7F2020]/20 border border-[#d14b4b]/40 text-[#e6f1f5]/90'
                      : 'text-[#e6f1f5]/80 hover:bg-[#d14b4b]/8'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              const today = new Date().toISOString().split("T")[0];
              onChange(today);
              setCurrentMonth(new Date());
              setIsOpen(false);
            }}
            className="w-full mt-4 px-4 py-2 rounded-xl bg-[#d14b4b]/8 border border-[#1f2a30] text-[#e6f1f5] text-sm hover:bg-[#d14b4b]/12 transition-colors cursor-pointer"
          >
            Today
          </button>
        </div>
      )}
    </div>
  );
}
