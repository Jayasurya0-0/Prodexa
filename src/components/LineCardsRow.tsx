import React, { useRef } from "react";
import { ChevronLeft, ChevronRight, Play, Pause, AlertOctagon, TrendingUp, User } from "lucide-react";
import { ProductionLine } from "../types";

interface LineCardsRowProps {
  lines: ProductionLine[];
  onLineClick?: (line: ProductionLine) => void;
}

export default function LineCardsRow({ lines, onLineClick }: LineCardsRowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Mini Sparkline generator
  const drawMiniSparkline = (data: number[], status: string) => {
    const width = 110;
    const height = 18;
    const max = Math.max(...data) || 1;
    const min = Math.min(...data) || 0;
    const range = max - min || 1;
    
    const points = data
      .map((val, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
      })
      .join(" ");

    const strokeColor = 
      status === "Running" ? "#10B981" : 
      status === "Idle" ? "#F59E0B" : "#EF4444";

    return (
      <svg className="overflow-visible" width={width} height={height}>
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          points={points}
        />
      </svg>
    );
  };

  return (
    <div 
      id="prodexa-line-performance"
      className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm"
    >
      {/* Title & Scroll Controls Header */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
        <div>
          <h3 className="font-bold text-sm text-[#0F172A] uppercase tracking-tight flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            Line Performance Overview
          </h3>
          <p className="text-[10px] text-slate-400 font-bold tracking-wide">Detailed floor layout and operational velocity</p>
        </div>

        {/* Navigation arrows */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => scroll("left")}
            className="p-1.5 hover:bg-slate-100 border border-[#E2E8F0] rounded-xl text-slate-600 transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="p-1.5 hover:bg-slate-100 border border-[#E2E8F0] rounded-xl text-slate-600 transition-colors cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Horizontal scrolling bento cards row */}
      <div 
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto no-scrollbar pb-2 scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        {lines.map((line) => {
          const isDown = line.status === "Breakdown";
          const isIdle = line.status === "Idle";
          const progressColor = 
            line.efficiency >= 85 ? "stroke-emerald-500 text-emerald-600" :
            line.efficiency >= 60 ? "stroke-blue-500 text-blue-600" : "stroke-amber-500 text-amber-500";
            
          const strokeDashoffset = 113 - (113 * Math.min(line.efficiency, 100)) / 100;

          return (
            <div
              key={line.lineNo}
              onClick={() => onLineClick?.(line)}
              className={`flex-shrink-0 w-72 bg-[#F8FAFC] border border-[#E2E8F0] ${onLineClick ? "hover:border-[#2563EB] hover:shadow-md cursor-pointer" : "cursor-default"} rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between`}
            >
              {/* Card top row */}
              <div className="flex items-start justify-between gap-2 border-b border-[#E2E8F0] pb-2 mb-2">
                <div className="flex items-center gap-2">
                  {line.supervisorAvatar ? (
                    <img
                      src={line.supervisorAvatar}
                      alt={line.supervisor}
                      className="w-8 h-8 rounded-full object-cover border border-[#E2E8F0]"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                        const next = (e.target as HTMLElement).nextElementSibling;
                        if (next) (next as HTMLElement).style.display = 'flex';
                      }}
                    />
                  ) : null}
                  {(!line.supervisorAvatar) ? (
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-500 dark:text-neutral-400 border border-slate-200">
                      <User className="h-4 w-4" />
                    </div>
                  ) : (
                    <div style={{ display: 'none' }} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-500 dark:text-neutral-400 border border-slate-200">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                      {line.supervisor}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 leading-none">
                      Line {line.lineNo.substring(1)} • {line.buyer}
                    </p>
                  </div>
                </div>

                {/* Efficiency Gauge (SVG circle) */}
                <div className="relative w-11 h-11 flex-shrink-0 flex items-center justify-center">
                  <svg className="w-10 h-10 transform -rotate-90">
                    <circle
                      cx="20"
                      cy="20"
                      r="18"
                      className="stroke-slate-200"
                      strokeWidth="2.5"
                      fill="transparent"
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r="18"
                      className={`${progressColor} transition-all duration-500`}
                      strokeWidth="3"
                      fill="transparent"
                      strokeDasharray="113"
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-[9px] font-black font-mono">
                    {Math.round(line.efficiency)}%
                  </span>
                </div>
              </div>

              {/* Card details row */}
              <div className="space-y-1.5 text-[11px] font-semibold text-slate-600 mb-3">
                <div className="flex justify-between items-center">
                  <span>Style Code:</span>
                  <span className="font-mono font-bold text-slate-800">{line.style}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Hourly Output:</span>
                  <span className="font-bold text-slate-800 font-mono">{line.currentHourPcs} Pcs</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Output Progression:</span>
                  <span className="font-mono font-bold text-slate-700">
                    {line.currentProductionPcs.toLocaleString()} / {line.targetPcs.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Card Sparkline & status footer */}
              <div className="flex items-center justify-between border-t border-[#E2E8F0] pt-2.5">
                <div className="h-4.5 flex items-center">
                  {drawMiniSparkline(line.hourlyLog, line.status)}
                </div>
                
                <span className={`px-2 py-0.5 rounded-xl text-[9px] font-bold uppercase flex items-center gap-1 leading-none ${
                  line.status === "Running" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                  line.status === "Idle" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                  "bg-red-100 text-red-800 border border-red-200 animate-pulse"
                }`}>
                  {line.status === "Running" && <Play className="h-2 w-2 fill-current" />}
                  {line.status === "Idle" && <Pause className="h-2 w-2 fill-current" />}
                  {line.status === "Breakdown" && <AlertOctagon className="h-2.5 w-2.5" />}
                  {line.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
