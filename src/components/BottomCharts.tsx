import React, { useState, useEffect } from "react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from "recharts";
import { Clock, BarChart3, ChevronDown, Check, TrendingUp } from "lucide-react";
import { ProductionLine, HourlyChartData } from "../types";
import { getHourlyLabels } from "../utils/timeUtils";

interface BottomChartsProps {
  lines: ProductionLine[];
}

export default function BottomCharts({ lines }: BottomChartsProps) {
  const [selectedLinesFilter, setSelectedLinesFilter] = useState<string>("All");
  const [showChartDropdown, setShowChartDropdown] = useState(false);
  const [timeConfigVersion, setTimeConfigVersion] = useState(0);

  useEffect(() => {
    const handleConfigChange = () => setTimeConfigVersion(v => v + 1);
    window.addEventListener("mes_time_config_changed", handleConfigChange);
    return () => window.removeEventListener("mes_time_config_changed", handleConfigChange);
  }, []);

  const hours = getHourlyLabels();

  // Gather any custom OT hour slots that have been logged across all lines
  const otHoursSet = new Set<string>();
  lines.forEach((line) => {
    if (line.otLog) {
      line.otLog.forEach((ot) => {
        if (ot.time) otHoursSet.add(ot.time);
      });
    }
  });
  const otHours = Array.from(otHoursSet).sort();
  const allChartHours = [...hours, ...otHours];

  // 1. Format Hourly Production by Line Chart Data
  const hourlyLineData: HourlyChartData[] = allChartHours.map((hour, index) => {
    const dataPoint: HourlyChartData = { time: hour };
    lines.forEach((line) => {
      if (index < 10) {
        dataPoint[line.lineNo] = line.hourlyLog[index] !== undefined ? line.hourlyLog[index] : 0;
      } else {
        const otSlot = line.otLog?.find((ot) => ot.time === hour);
        dataPoint[line.lineNo] = otSlot ? otSlot.pieces : 0;
      }
    });
    return dataPoint;
  });

  // 2. Format Combined Factory Production Chart Data
  // This is actual sum of all active lines vs cumulative target vs cumulative achievement
  let cumulativeActual = 0;
  let cumulativeTarget = 0;
  
  const hourlyFactoryData = allChartHours.map((hour, index) => {
    let hourActualSum = 0;
    let hourTargetSum = 0;

    lines.forEach((line) => {
      if (index < 10) {
        hourActualSum += line.hourlyLog[index] !== undefined ? line.hourlyLog[index] : 0;
        const customTarget = line.hourlyTargetLog?.[index];
        hourTargetSum += customTarget !== undefined ? customTarget : (line.targetPcs / 10);
      } else {
        const otSlot = line.otLog?.find((ot) => ot.time === hour);
        hourActualSum += otSlot ? otSlot.pieces : 0;
        hourTargetSum += 0; // Target during overtime is usually 0
      }
    });

    cumulativeActual += hourActualSum;
    cumulativeTarget += hourTargetSum;
    
    return {
      time: hour,
      "Combined Production": cumulativeActual,
      "Target Trend": cumulativeTarget,
    };
  });

  // Color mapping for first 5 lines
  const lineColors: { [key: string]: string } = {
    L01: "#2563EB", // Blue
    L02: "#10B981", // Green
    L03: "#F59E0B", // Amber
    L04: "#EC4899", // Pink
    L05: "#EF4444", // Red
    L06: "#8B5CF6", // Purple
    L07: "#06B6D4", // Cyan
    L08: "#14B8A6", // Teal
    L09: "#6366F1", // Indigo
    L10: "#F97316", // Orange
  };

  const chartLinesToRender = selectedLinesFilter === "All" 
    ? lines.slice(0, 5) 
    : lines.filter(l => l.lineNo === selectedLinesFilter);

  return (
    <div 
      id="prodexa-charts-section"
      className="grid grid-cols-1 lg:grid-cols-2 gap-4"
    >
      {/* 1. Hourly Production by Line */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex flex-col min-h-[350px]">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
          <div>
            <h3 className="font-bold text-sm text-[#0F172A] tracking-tight uppercase flex items-center gap-1.5">
              <Clock className="h-4.5 w-4.5 text-blue-600" />
              Hourly Production by Line
            </h3>
            <p className="text-[10px] text-slate-400 font-bold tracking-wide">Output pacing per supervisor interval</p>
          </div>

          {/* Filter lines */}
          <div className="relative">
            <button
              onClick={() => setShowChartDropdown(!showChartDropdown)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#F1F5F9] hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <span>{selectedLinesFilter === "All" ? "All Lines (Top 5)" : selectedLinesFilter}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            </button>

            {showChartDropdown && (
              <div className="absolute top-9 right-0 w-44 bg-white border border-[#E2E8F0] rounded-xl shadow-lg py-1.5 z-40 max-h-56 overflow-y-auto">
                <button
                  onClick={() => {
                    setSelectedLinesFilter("All");
                    setShowChartDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                    selectedLinesFilter === "All" ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>All Lines (Top 5)</span>
                  {selectedLinesFilter === "All" && <Check className="h-3 w-3" />}
                </button>
                {lines.map((l) => (
                  <button
                    key={l.lineNo}
                    onClick={() => {
                      setSelectedLinesFilter(l.lineNo);
                      setShowChartDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                      selectedLinesFilter === l.lineNo ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>Line {l.lineNo}</span>
                    {selectedLinesFilter === l.lineNo && <Check className="h-3 w-3" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chart container */}
        <div className="flex-1 w-full text-xs" style={{ minHeight: "240px" }}>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={hourlyLineData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", color: "#fff", border: "none" }} 
                itemStyle={{ color: "#94a3b8" }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
              {chartLinesToRender.map((line) => (
                <Line
                  key={line.lineNo}
                  type="monotone"
                  dataKey={line.lineNo}
                  stroke={lineColors[line.lineNo] || "#3b82f6"}
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 1.5 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Total Factory Production (Hourly) */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex flex-col min-h-[350px]">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
          <div>
            <h3 className="font-bold text-sm text-[#0F172A] tracking-tight uppercase flex items-center gap-1.5">
              <BarChart3 className="h-4.5 w-4.5 text-blue-600" />
              Total Factory Production (Hourly)
            </h3>
            <p className="text-[10px] text-slate-400 font-bold tracking-wide">Cumulative yield pace vs capacity ceiling</p>
          </div>
          <div className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md flex items-center gap-1">
            <TrendingUp className="h-3 w-3 animate-pulse" />
            LIVE Pace Optimum
          </div>
        </div>

        {/* Combined Area + Line Chart */}
        <div className="flex-1 w-full text-xs" style={{ minHeight: "240px" }}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={hourlyFactoryData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorProduction" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", color: "#fff", border: "none" }}
                itemStyle={{ color: "#94a3b8" }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
              <Area 
                type="monotone" 
                dataKey="Combined Production" 
                stroke="#2563EB" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorProduction)" 
              />
              <Line 
                type="monotone" 
                dataKey="Target Trend" 
                stroke="#94a3b8" 
                strokeWidth={1.5} 
                strokeDasharray="5 5"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
