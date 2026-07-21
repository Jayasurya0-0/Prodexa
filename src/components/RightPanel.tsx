import React, { useState } from "react";
import { 
  Briefcase, 
  Target, 
  TrendingUp, 
  Zap, 
  Users, 
  Activity, 
  Wrench, 
  AlertTriangle, 
  ChevronDown, 
  Sparkles
} from "lucide-react";
import { FactoryMetrics } from "../types";

interface RightPanelProps {
  metrics: FactoryMetrics;
  shiftType: string;
  setShiftType: (shift: string) => void;
}

export default function RightPanel({
  metrics,
  shiftType,
  setShiftType,
}: RightPanelProps) {
  const [showShiftDropdown, setShowShiftDropdown] = useState(false);

  const shifts = [
    "Day Shift (08:00 AM - 08:00 PM)",
    "Night Shift (08:00 PM - 08:00 AM)",
    "Swing Shift (02:00 PM - 10:00 PM)"
  ];

  return (
    <div 
      id="prodexa-factory-overview"
      className="flex flex-col gap-4 h-auto"
    >
      {/* Factory Overview card */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-850 rounded-xl p-6 shadow-sm flex flex-col justify-between transition-colors duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-850 pb-3 mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight uppercase">
              Factory Overview
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-neutral-500 font-bold tracking-wide">Plant Capacity & Yield KPIs</p>
          </div>
          
          {/* Shift Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowShiftDropdown(!showShiftDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-neutral-850 hover:bg-slate-100 dark:hover:bg-neutral-850 text-slate-700 dark:text-neutral-300 text-xs font-bold rounded-lg border border-slate-100 dark:border-neutral-800 transition-colors cursor-pointer focus:outline-none"
            >
              <Briefcase className="h-3.5 w-3.5 text-slate-500 dark:text-neutral-400" />
              <span>{shiftType}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {showShiftDropdown && (
              <div className="absolute top-9 right-0 w-64 bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 rounded-lg shadow-lg py-1.5 z-40 animate-in fade-in slide-in-from-top-1 duration-100">
                {shifts.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setShiftType(s);
                      setShowShiftDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                      shiftType === s 
                        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold" 
                        : "text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Major KPI rows */}
        <div className="space-y-4 mb-5">
          {/* Shift Target */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-neutral-400 font-bold flex items-center gap-2 font-sans">
              <Target className="h-3.5 w-3.5 text-blue-600" /> Shift Target
            </span>
            <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
              {metrics.shiftTarget.toLocaleString()} Pcs
            </span>
          </div>

          {/* Shift Output */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-neutral-400 font-bold flex items-center gap-2 font-sans">
              <Briefcase className="h-3.5 w-3.5 text-sky-500" /> Shift Output
            </span>
            <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
              {metrics.shiftOutput.toLocaleString()} Pcs
            </span>
          </div>

          {/* Achievement Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-neutral-400 font-bold flex items-center gap-2 font-sans">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> Shift Achievement
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {metrics.shiftAchievement.toFixed(2)}%
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-neutral-850 rounded-full h-1.5 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(metrics.shiftAchievement, 100)}%` }}
              />
            </div>
          </div>

          {/* Efficiency Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-neutral-400 font-bold flex items-center gap-2 font-sans">
                <Zap className="h-3.5 w-3.5 text-blue-600" /> Current Efficiency
              </span>
              <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                {metrics.currentEfficiency.toFixed(2)}%
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-neutral-850 rounded-full h-1.5 overflow-hidden">
              <div 
                className="h-full bg-blue-600 dark:bg-blue-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(metrics.currentEfficiency, 100)}%` }}
              />
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}
