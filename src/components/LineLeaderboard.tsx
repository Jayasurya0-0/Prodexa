import React, { useState, useEffect } from "react";
import { 
  Trophy, 
  Crown, 
  Sparkles, 
  AlertCircle, 
  RefreshCw,
  TrendingUp,
  User,
  BarChart3,
  Activity,
  ChevronRight
} from "lucide-react";
import { ProductionLine } from "../types";
import { fetchProductionLinesFromSupabase, isSupabaseConfigured } from "../utils/supabaseSync";
import { createClient } from "../utils/supabase/client";

const supabase = createClient();

interface LineLeaderboardProps {
  lines: ProductionLine[];
  onLineClick?: (line: ProductionLine) => void;
  onUpdateLine?: (updatedLine: ProductionLine) => void;
  selectedDate?: string;
}

// 10 custom colors mapped sequentially from top-performing Rank 1 (Dark Green) to bottom-performing (Dark Red)
const getRankColor = (index: number, total: number) => {
  const colors = [
    { text: "text-[#15803d]", bg: "bg-[#15803d]", border: "border-[#15803d]", hex: "#15803d" }, // 1. Dark Green
    { text: "text-[#22c55e]", bg: "bg-[#22c55e]", border: "border-[#22c55e]", hex: "#22c55e" }, // 2. Green
    { text: "text-[#4ade80]", bg: "bg-[#4ade80]", border: "border-[#4ade80]", hex: "#4ade80" }, // 3. Light Green
    { text: "text-[#a3e635]", bg: "bg-[#a3e635]", border: "border-[#a3e635]", hex: "#a3e635" }, // 4. Yellow Green
    { text: "text-[#facc15]", bg: "bg-[#facc15]", border: "border-[#facc15]", hex: "#facc15" }, // 5. Yellow
    { text: "text-[#f59e0b]", bg: "bg-[#f59e0b]", border: "border-[#f59e0b]", hex: "#f59e0b" }, // 6. Amber
    { text: "text-[#f97316]", bg: "bg-[#f97316]", border: "border-[#f97316]", hex: "#f97316" }, // 7. Orange
    { text: "text-[#ea580c]", bg: "bg-[#ea580c]", border: "border-[#ea580c]", hex: "#ea580c" }, // 8. Dark Orange
    { text: "text-[#f87171]", bg: "bg-[#f87171]", border: "border-[#f87171]", hex: "#f87171" }, // 9. Light Red
    { text: "text-[#dc2626]", bg: "bg-[#dc2626]", border: "border-[#dc2626]", hex: "#dc2626" }  // 10. Dark Red
  ];

  if (total <= 1) return colors[0];
  const fraction = index / (total - 1);
  const colorIndex = Math.min(colors.length - 1, Math.floor(fraction * (colors.length - 0.001)));
  return colors[colorIndex];
};

// Beautiful SVGs for Rank Medals/Ribbons that match the layout image exactly
const RankMedal = ({ rank }: { rank: number }) => {
  if (rank === 1) {
    return (
      <div className="flex flex-col items-center select-none">
        <svg className="w-9 h-9 drop-shadow-sm" viewBox="0 0 48 48">
          {/* Ribbon tails */}
          <path d="M 17 28 L 13 44 L 21 40 L 24 44 L 20 28" fill="#4d7c0f" />
          <path d="M 31 28 L 35 44 L 27 40 L 24 44 L 28 28" fill="#4d7c0f" />
          {/* Green circular seal */}
          <circle cx="24" cy="20" r="14" fill="#65a30d" stroke="#4d7c0f" strokeWidth="1.5" />
          {/* Inner ring */}
          <circle cx="24" cy="20" r="11" fill="none" stroke="white" strokeWidth="1" strokeDasharray="2,2" />
          {/* Number 1 */}
          <text x="24" y="25" textAnchor="middle" fill="white" fontSize="14" fontWeight="900" fontFamily="sans-serif">1</text>
        </svg>
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex flex-col items-center select-none">
        <svg className="w-9 h-9 drop-shadow-sm" viewBox="0 0 48 48">
          {/* Ribbon tails */}
          <path d="M 17 28 L 13 44 L 21 40 L 24 44 L 20 28" fill="#64748b" />
          <path d="M 31 28 L 35 44 L 27 40 L 24 44 L 28 28" fill="#64748b" />
          {/* Silver circular seal */}
          <circle cx="24" cy="20" r="14" fill="#94a3b8" stroke="#475569" strokeWidth="1.5" />
          {/* Inner ring */}
          <circle cx="24" cy="20" r="11" fill="none" stroke="white" strokeWidth="1" strokeDasharray="2,2" />
          {/* Number 2 */}
          <text x="24" y="25" textAnchor="middle" fill="white" fontSize="14" fontWeight="900" fontFamily="sans-serif">2</text>
        </svg>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex flex-col items-center select-none">
        <svg className="w-9 h-9 drop-shadow-sm" viewBox="0 0 48 48">
          {/* Ribbon tails */}
          <path d="M 17 28 L 13 44 L 21 40 L 24 44 L 20 28" fill="#92400e" />
          <path d="M 31 28 L 35 44 L 27 40 L 24 44 L 28 28" fill="#92400e" />
          {/* Bronze circular seal */}
          <circle cx="24" cy="20" r="14" fill="#b45309" stroke="#78350f" strokeWidth="1.5" />
          {/* Inner ring */}
          <circle cx="24" cy="20" r="11" fill="none" stroke="white" strokeWidth="1" strokeDasharray="2,2" />
          {/* Number 3 */}
          <text x="24" y="25" textAnchor="middle" fill="white" fontSize="14" fontWeight="900" fontFamily="sans-serif">3</text>
        </svg>
      </div>
    );
  }
  return (
    <div className="h-10 flex flex-col items-center justify-center select-none">
      <span className="text-2xl font-black text-slate-800 tracking-tight leading-none">{rank}</span>
    </div>
  );
};

interface KPIDefinition {
  kpi_key: string;
  kpi_name: string;
  target: number;
  weightage: number;
  score_10_limit: number;
  score_8_limit: number;
  score_5_limit: number;
  is_smaller_better: boolean;
  unit: string;
  active: boolean;
}

const DEFAULT_KPIS: KPIDefinition[] = [
  { kpi_key: "efficiency", kpi_name: "Efficiency", target: 85, weightage: 25, score_10_limit: 85, score_8_limit: 75, score_5_limit: 60, is_smaller_better: false, unit: "%", active: true },
  { kpi_key: "avg_production", kpi_name: "Avg Production", target: 600, weightage: 15, score_10_limit: 600, score_8_limit: 500, score_5_limit: 400, is_smaller_better: false, unit: " pcs", active: true },
  { kpi_key: "avg_lead_time", kpi_name: "Avg Lead Time", target: 2, weightage: 10, score_10_limit: 2, score_8_limit: 3, score_5_limit: 5, is_smaller_better: true, unit: " days", active: true },
  { kpi_key: "sku_percentage", kpi_name: "SKU %", target: 95, weightage: 10, score_10_limit: 95, score_8_limit: 85, score_5_limit: 70, is_smaller_better: false, unit: "%", active: true },
  { kpi_key: "audit_fail", kpi_name: "Audit Fail", target: 0, weightage: 10, score_10_limit: 0, score_8_limit: 1, score_5_limit: 2, is_smaller_better: true, unit: " failures", active: true },
  { kpi_key: "rejection", kpi_name: "Rejection %", target: 1.5, weightage: 10, score_10_limit: 1.5, score_8_limit: 3.0, score_5_limit: 5.0, is_smaller_better: true, unit: "%", active: true },
  { kpi_key: "fpy", kpi_name: "FPY %", target: 98, weightage: 5, score_10_limit: 98, score_8_limit: 95, score_5_limit: 90, is_smaller_better: false, unit: "%", active: true },
  { kpi_key: "fqc_defects", kpi_name: "FQC Defects", target: 2, weightage: 5, score_10_limit: 2, score_8_limit: 5, score_5_limit: 10, is_smaller_better: true, unit: "/100u", active: true },
  { kpi_key: "absenteeism", kpi_name: "Absenteeism", target: 4, weightage: 5, score_10_limit: 4, score_8_limit: 7, score_5_limit: 10, is_smaller_better: true, unit: "%", active: true },
  { kpi_key: "attrition", kpi_name: "Attrition", target: 1, weightage: 5, score_10_limit: 1, score_8_limit: 2.5, score_5_limit: 5, is_smaller_better: true, unit: "%", active: true }
];

const getSeededValue = (seedStr: string, min: number, max: number, decimals = 1): number => {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);
  const percent = (absHash % 1000) / 1000;
  const rawVal = min + percent * (max - min);
  return parseFloat(rawVal.toFixed(decimals));
};

export default function LineLeaderboard({ lines, onLineClick, onUpdateLine, selectedDate }: LineLeaderboardProps) {
  const [internalLines, setInternalLines] = useState<ProductionLine[]>(lines);
  const [employeePhotos, setEmployeePhotos] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"split" | "barchart">("split");
  const [sortBy, setSortBy] = useState<"pcs" | "achievement">("pcs");

  const getKpiScoreForLine = (lineNo: string): number => {
    const dStr = selectedDate || new Date().toISOString().split("T")[0];
    
    // 1. Get KPI master
    const savedKpiMaster = localStorage.getItem("mes_kpi_master");
    const kpiList: KPIDefinition[] = savedKpiMaster ? JSON.parse(savedKpiMaster) : DEFAULT_KPIS;
    const activeKpis = kpiList.filter(k => k.active);

    // 2. Get daily entries
    const localKey = `mes_daily_line_kpis_${dStr}`;
    const savedLocal = localStorage.getItem(localKey);
    let dailyData: any = {};
    if (savedLocal) {
      try {
        dailyData = JSON.parse(savedLocal);
      } catch (e) {
        console.error("Failed to parse local daily kpis:", e);
      }
    }

    let lineData = dailyData[lineNo];
    if (!lineData) {
      // Default each KPI value for a new day to 0 as requested
      lineData = {
        efficiency: 0,
        avg_production: 0,
        avg_lead_time: 0,
        sku_percentage: 0,
        audit_fail: 0,
        rejection: 0,
        fpy: 0,
        fqc_defects: 0,
        absenteeism: 0,
        attrition: 0
      };
    }

    // 3. Compute score
    let totalScore = 0;
    activeKpis.forEach(k => {
      const rawVal = lineData[k.kpi_key] ?? 0;
      let score = 0;

      if (k.is_smaller_better) {
        if (rawVal <= k.score_10_limit) score = 10;
        else if (rawVal <= k.score_8_limit) score = 8;
        else if (rawVal <= k.score_5_limit) score = 5;
        else score = 0;
      } else {
        if (rawVal >= k.score_10_limit) score = 10;
        else if (rawVal >= k.score_8_limit) score = 8;
        else if (rawVal >= k.score_5_limit) score = 5;
        else score = 0;
      }

      const weighted = (score / 10) * k.weightage;
      totalScore += weighted;
    });

    return parseFloat(totalScore.toFixed(1));
  };

  // Sync with prop updates
  useEffect(() => {
    setInternalLines(lines);
  }, [lines]);

  // Retrieve employee photos mapping from database dynamically for lazy loaded profiles
  const loadEmployeePhotos = async () => {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("first_name, last_name, photo_url");
        if (!error && data) {
          const photoMap: Record<string, string> = {};
          data.forEach((emp) => {
            const fullName = `${emp.first_name} ${emp.last_name}`.trim();
            if (emp.photo_url) {
              photoMap[fullName] = emp.photo_url;
            }
          });
          setEmployeePhotos(photoMap);
        }
      } catch (e) {
        console.error("Failed to load employee profile photos mapping:", e);
      }
    }
  };

  useEffect(() => {
    loadEmployeePhotos();
    const interval = setInterval(loadEmployeePhotos, 60000);
    return () => clearInterval(interval);
  }, []);

  // Poll database for real-time changes every 30 seconds
  const handleAutoRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    if (isSupabaseConfigured()) {
      try {
        const todayStr = new Date().toISOString().split("T")[0];
        const dateToFetch = selectedDate || todayStr;
        const dbLines = await fetchProductionLinesFromSupabase(dateToFetch);
        if (dbLines && dbLines.length > 0) {
          setInternalLines(dbLines);
        }
      } catch (err) {
        console.error("Auto-refresh leaderboard telemetry failed:", err);
      }
    }
    setIsRefreshing(false);
  };

  useEffect(() => {
    const autoRefreshTimer = setInterval(handleAutoRefresh, 30000);
    return () => clearInterval(autoRefreshTimer);
  }, [selectedDate]);

  // Sort based on criteria: either by absolute Pieces Produced, or by composite KPI Score
  const sortedLines = [...internalLines].sort((a, b) => {
    if (sortBy === "achievement") {
      const scoreA = getKpiScoreForLine(a.lineNo);
      const scoreB = getKpiScoreForLine(b.lineNo);
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      return b.currentProductionPcs - a.currentProductionPcs;
    } else {
      return b.currentProductionPcs - a.currentProductionPcs;
    }
  });

  // Convert Date string e.g., 2026-07-06 to DD-MM-YYYY format
  const formatProductionDate = (dateStr?: string) => {
    if (!dateStr) {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    }
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  // Extract Top 3 podium finishers
  const top1 = sortedLines[0];
  const top2 = sortedLines[1];
  const top3 = sortedLines[2];

  const maxPcs = Math.max(...sortedLines.map(l => l.currentProductionPcs), 1);

  // Map to get photo safely and instantly using a fast avatar API fallback
  const getPhoto = (line?: ProductionLine) => {
    if (!line) return "";
    const photo = employeePhotos[line.supervisor] || line.supervisorAvatar;
    if (!photo || photo.includes("unsplash.com")) {
      // Generate a consistent, beautiful, instant-loading avatar color based on supervisor name hash
      let hash = 0;
      for (let i = 0; i < line.supervisor.length; i++) {
        hash = line.supervisor.charCodeAt(i) + ((hash << 5) - hash);
      }
      const colors = ["4f46e5", "db2777", "059669", "d97706", "2563eb", "7c3aed", "dc2626"];
      const color = colors[Math.abs(hash) % colors.length];
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(line.supervisor)}&background=${color}&color=fff&size=128&bold=true`;
    }
    return photo;
  };

  return (
    <div className="w-full bg-slate-50 dark:bg-neutral-950 min-h-screen p-4 md:p-8 flex flex-col justify-between space-y-6 select-none font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-slate-100 dark:border-neutral-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            <h1 className="text-2xl md:text-3.5xl font-black text-[#0f172a] dark:text-white tracking-tight leading-none uppercase">
              LINE WISE PRODUCTION RANKING
            </h1>
          </div>
          <p className="text-xs md:text-sm font-bold text-[#475569] dark:text-neutral-400 uppercase tracking-wider mt-1.5 pl-8">
            Real-Time Achievement Leaderboard • Sorted by {sortBy === "achievement" ? "KPI Score" : "Pieces Produced"}
          </p>
        </div>

        {/* Date capsule matching the reference image's dark rounded capsule on top-right */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Ranking Sort Criteria Option */}
          <div className="flex items-center bg-slate-100 dark:bg-neutral-800 p-1 rounded-xl border border-slate-200/60 dark:border-neutral-700 shrink-0">
            <button
              onClick={() => setSortBy("pcs")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                sortBy === "pcs"
                  ? "bg-[#0f172a] text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              }`}
            >
              Pieces
            </button>
            <button
              onClick={() => setSortBy("achievement")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                sortBy === "achievement"
                  ? "bg-[#0f172a] text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              }`}
            >
              KPI Score
            </button>
          </div>

          {/* Layout View Mode Select Switch */}
          <div className="flex items-center bg-slate-100 dark:bg-neutral-800 p-1 rounded-xl border border-slate-200/60 dark:border-neutral-700 shrink-0">
            <button
              onClick={() => setViewMode("split")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === "split"
                  ? "bg-white dark:bg-neutral-700 text-[#0f172a] dark:text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              }`}
            >
              <Trophy className="h-3.5 w-3.5" />
              Podium
            </button>
            <button
              onClick={() => setViewMode("barchart")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === "barchart"
                  ? "bg-white dark:bg-neutral-700 text-[#0f172a] dark:text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Bar Chart
            </button>
          </div>

          <div className="bg-[#0f172a] dark:bg-neutral-800 text-white px-5 py-2.5 rounded-lg font-extrabold tracking-widest text-xs uppercase flex items-center gap-1.5 shadow-xs">
            <span className="text-slate-400">DATE :</span>
            <span className="font-mono tracking-wider">{formatProductionDate(selectedDate)}</span>
          </div>

          <button 
            onClick={handleAutoRefresh}
            className={`p-2.5 bg-white dark:bg-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-700 border border-slate-200 dark:border-neutral-700 rounded-lg text-slate-500 dark:text-neutral-400 transition-all ${isRefreshing ? "animate-spin" : ""}`}
            title="Force Sync Now"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* NO LINES FALLBACK */}
      {sortedLines.length === 0 && (
        <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-neutral-900 rounded-2xl border border-dashed border-slate-200 dark:border-neutral-800">
          <AlertCircle className="h-12 w-12 text-amber-500 mb-3" />
          <h3 className="text-lg font-black text-slate-800 dark:text-white">No Production Lines Active</h3>
          <p className="text-sm text-slate-500 dark:text-neutral-400 max-w-sm text-center mt-1">
            There are no garment production rows configured for this date. Check your database or seed initial metrics first.
          </p>
        </div>
      )}      {/* MAIN CONTENT AREA */}
      {sortedLines.length > 0 && (
        viewMode === "split" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* LEFT COLUMN: THE PODIUM (WIDTH: 5 COLS) */}
            <div className="lg:col-span-5 bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-slate-100 dark:border-neutral-800 shadow-xs flex flex-col justify-between relative min-h-[500px]">
              <div>
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-neutral-800 pb-3">
                  <Crown className="h-5 w-5 text-amber-500" />
                  <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    TODAY'S CHAMPION PODIUM
                  </h2>
                </div>
                <p className="text-xs text-slate-400 dark:text-neutral-500 mb-6">
                  The top 3 performers of the current active production shift.
                </p>
              </div>

              {/* Podium Visual Component */}
              <div className="relative flex items-end justify-center w-full pt-16 pb-2 min-h-[320px]">
                
                {/* Rank 2 (Silver) */}
                {top2 && (
                  <div className="flex flex-col items-center w-1/3 px-1 relative z-10">
                    <div className="relative mb-2 flex flex-col items-center">
                      <div className="rounded-full overflow-hidden w-13 h-13 border-2 border-slate-300 shadow-sm flex items-center justify-center bg-slate-50">
                        {getPhoto(top2) ? (
                          <img src={getPhoto(top2)} alt={top2.supervisor} className="w-full h-full object-cover" />
                        ) : (
                          <User className="h-6 w-6 text-slate-400" />
                        )}
                      </div>
                      <div className="absolute -top-6">
                        <RankMedal rank={2} />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-neutral-200 truncate w-full text-center">{top2.supervisor}</span>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{top2.lineNo}</span>
                    <span className="text-xs font-black text-slate-600 dark:text-neutral-300 mt-1">
                      {sortBy === "achievement" ? `${getKpiScoreForLine(top2.lineNo)} PTS` : `${top2.currentProductionPcs} PCS`}
                    </span>
                    
                    {/* Physical Podium Block */}
                    <div className="w-full bg-linear-to-b from-slate-200 to-slate-300 dark:from-neutral-800 dark:to-neutral-700 h-24 rounded-t-xl mt-3 flex flex-col items-center justify-center border-t border-slate-100 dark:border-neutral-600 shadow-inner">
                      <span className="text-2xl font-black text-slate-600 dark:text-neutral-400">2</span>
                      <span className="text-[9px] font-black text-slate-500 dark:text-neutral-500 tracking-widest">SILVER</span>
                    </div>
                  </div>
                )}

                {/* Rank 1 (Gold - Center, elevated) */}
                {top1 && (
                  <div className="flex flex-col items-center w-1/3 px-1 relative z-20 -mt-8">
                    <div className="relative mb-2 flex flex-col items-center">
                      <div className="rounded-full overflow-hidden w-16 h-16 border-3 border-amber-400 shadow-md flex items-center justify-center bg-slate-50 scale-105 relative">
                        {getPhoto(top1) ? (
                          <img src={getPhoto(top1)} alt={top1.supervisor} className="w-full h-full object-cover" />
                        ) : (
                          <User className="h-8 w-8 text-slate-400" />
                        )}
                      </div>
                      
                      {/* Glowing yellow background behind winner */}
                      <div className="absolute -top-8 bg-amber-400/10 rounded-full blur-xl animate-pulse w-24 h-24 -z-10" />

                      <div className="absolute -top-7">
                        <RankMedal rank={1} />
                      </div>
                    </div>

                    <span className="text-xs font-black text-amber-500 truncate w-full text-center uppercase tracking-tight">{top1.supervisor}</span>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{top1.lineNo}</span>
                    <span className="text-xs font-black text-amber-600 dark:text-amber-400 mt-1">
                      {sortBy === "achievement" ? `${getKpiScoreForLine(top1.lineNo)} PTS` : `${top1.currentProductionPcs} PCS`}
                    </span>
                    
                    {/* Physical Podium Block */}
                    <div className="w-full bg-linear-to-b from-amber-300 via-amber-400 to-amber-500 h-32 rounded-t-xl mt-3 flex flex-col items-center justify-center border-t border-yellow-200 shadow-md">
                      <span className="text-3xl font-black text-amber-950">1</span>
                      <span className="text-[9px] font-black text-amber-900 tracking-widest leading-none">CHAMPION</span>
                    </div>
                  </div>
                )}

                {/* Rank 3 (Bronze) */}
                {top3 && (
                  <div className="flex flex-col items-center w-1/3 px-1 relative z-10">
                    <div className="relative mb-2 flex flex-col items-center">
                      <div className="rounded-full overflow-hidden w-12 h-12 border-2 border-amber-700 shadow-sm flex items-center justify-center bg-slate-50">
                        {getPhoto(top3) ? (
                          <img src={getPhoto(top3)} alt={top3.supervisor} className="w-full h-full object-cover" />
                        ) : (
                          <User className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                      <div className="absolute -top-6">
                        <RankMedal rank={3} />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-neutral-200 truncate w-full text-center">{top3.supervisor}</span>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{top3.lineNo}</span>
                    <span className="text-xs font-black text-slate-600 dark:text-neutral-300 mt-1">
                      {sortBy === "achievement" ? `${getKpiScoreForLine(top3.lineNo)} PTS` : `${top3.currentProductionPcs} PCS`}
                    </span>
                    
                    {/* Physical Podium Block */}
                    <div className="w-full bg-linear-to-b from-amber-600 to-amber-700 dark:from-amber-800 dark:to-neutral-800 h-20 rounded-t-xl mt-3 flex flex-col items-center justify-center border-t border-amber-500 shadow-inner">
                      <span className="text-xl font-black text-amber-100">3</span>
                      <span className="text-[9px] font-black text-amber-200 dark:text-amber-400 tracking-widest">BRONZE</span>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* RIGHT COLUMN: ALL SEWING LINES PERFORMANCE & DYNAMIC HORIZONTAL BARS (WIDTH: 7 COLS) */}
            <div className="lg:col-span-7 bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-slate-100 dark:border-neutral-800 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-neutral-800 pb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-indigo-500" />
                    <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      SEWING LINE RANKINGS ({sortedLines.length} LINES)
                    </h2>
                  </div>
                  <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded-sm">
                    LIVE TELEMETRY
                  </span>
                </div>
              </div>

              {/* Scrollable Container with Custom Thin Scrollbar */}
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar my-4">
                {sortedLines.map((line, idx) => {
                  const rank = idx + 1;
                  const colorInfo = getRankColor(idx, sortedLines.length);
                  
                  // Compute target achievement dynamically - this is the bar width!
                  const targetPcs = Math.max(line.targetPcs, 1);
                  const achievementPct = Math.min(100, Math.round((line.currentProductionPcs / targetPcs) * 100));
                  
                  // Safe picture loading
                  const pic = getPhoto(line);

                  return (
                    <div
                      key={line.lineNo}
                      className="p-3 bg-slate-50 dark:bg-neutral-800/50 rounded-xl border border-slate-100 dark:border-neutral-800/80 hover:border-slate-200 dark:hover:border-neutral-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                    >
                      {/* Left: Rank, Avatar, Supervisor Name, and Line Code */}
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <span className="text-sm font-black text-slate-400 dark:text-neutral-500 w-6 text-center font-mono">
                          #{rank}
                        </span>
                        
                        {/* Compact Avatar */}
                        <div className="relative rounded-full overflow-hidden w-8 h-8 border border-slate-200 dark:border-neutral-700 flex items-center justify-center bg-slate-100 dark:bg-neutral-800 shrink-0">
                          {pic ? (
                            <img src={pic} alt={line.supervisor} className="w-full h-full object-cover" />
                          ) : (
                            <User className="h-4.5 w-4.5 text-slate-400" />
                          )}
                        </div>

                        {/* Supervisor and Line ID */}
                        <div className="flex flex-col truncate">
                          <span className="text-xs font-bold text-slate-800 dark:text-neutral-200 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {line.supervisor}
                          </span>
                          <span className="text-[9px] font-black text-slate-400 dark:text-neutral-500 uppercase tracking-widest mt-0.5">
                            {line.lineNo} • {line.buyer}
                          </span>
                        </div>
                      </div>
                      
                      {/* Center: Beautiful Dynamic Horizontal Progress Bar */}
                      <div className="flex-1 min-w-[120px] md:px-2">
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="font-extrabold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                            Style: {line.style}
                          </span>
                          {sortBy === "achievement" ? (
                            <span className="font-mono font-black text-indigo-500">
                              {getKpiScoreForLine(line.lineNo)} KPI Score
                            </span>
                          ) : (
                            <span className={`font-mono font-black ${achievementPct >= 100 ? "text-emerald-500" : "text-indigo-500"}`}>
                              {achievementPct}% of Target
                            </span>
                          )}
                        </div>
                        {/* Horizontal Bar - Adjusts perfectly according to numbers! */}
                        <div className="w-full h-2.5 bg-slate-200 dark:bg-neutral-700 rounded-full overflow-hidden relative">
                          <div
                            className={`h-full rounded-full ${colorInfo.bg}`}
                            style={{ width: `${sortBy === "achievement" ? getKpiScoreForLine(line.lineNo) : achievementPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Right: Numbers and Status indicator */}
                      <div className="flex items-center justify-between md:justify-end gap-4 font-mono shrink-0">
                        {/* Pieces Counter or KPI Score */}
                        {sortBy === "achievement" ? (
                          <div className="text-right">
                            <div className="flex items-baseline gap-1 justify-end">
                              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                                {getKpiScoreForLine(line.lineNo)}
                              </span>
                              <span className="text-[9px] text-slate-400 font-bold">
                                / 100 PTS
                              </span>
                            </div>
                            <span className="text-[9px] text-slate-500 dark:text-neutral-400 font-bold uppercase tracking-wide">
                              {line.currentProductionPcs} Pcs ({line.efficiency}% Eff)
                            </span>
                          </div>
                        ) : (
                          <div className="text-right">
                            <div className="flex items-baseline gap-1 justify-end">
                              <span className="text-sm font-black text-slate-800 dark:text-white">
                                {line.currentProductionPcs}
                              </span>
                              <span className="text-[9px] text-slate-400">
                                / {line.targetPcs} pcs
                              </span>
                            </div>
                            <span className="text-[9px] text-emerald-500 font-extrabold uppercase tracking-wide">
                              {line.efficiency}% Eff
                            </span>
                          </div>
                        )}

                        {/* Simple neat status badge */}
                        <div className={`w-2 h-2 rounded-full ${
                          line.status === "Running" 
                            ? "bg-emerald-500 shadow-sm" 
                            : line.status === "Breakdown"
                            ? "bg-rose-500"
                            : "bg-amber-500"
                        }`} title={line.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        ) : (
          /* BAR CHART VIEW: SCREEN-FITTING DYNAMIC COLUMN CHART */
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-slate-100 dark:border-neutral-800 shadow-xs flex flex-col justify-between min-h-[500px]">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-500" />
                  <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    PRODUCTION YIELD DYNAMIC BAR CHART
                  </h2>
                </div>
                <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded-sm">
                  FIT-TO-SCREEN GRID
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-neutral-500 mb-6">
                {sortBy === "achievement" 
                  ? "All lines dynamically scaled side-by-side relative to their composite KPI Score out of 100 PTS."
                  : `All lines dynamically scaled side-by-side relative to the maximum logged production yield of ${maxPcs} PCS.`}
              </p>
            </div>

            {/* Dynamic Column Bar Chart Grid */}
            <div className="flex-1 min-h-[350px] flex items-end gap-2 md:gap-4 border-b border-slate-200 dark:border-neutral-800 pb-4 pt-10 px-4 relative mt-4">
              
              {/* Chart Grid Lines in Background */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-12 pt-10">
                {[100, 75, 50, 25, 0].map((percent) => (
                  <div key={percent} className="w-full flex items-center gap-3">
                    <span className="text-[9px] font-bold text-slate-400 dark:text-neutral-600 font-mono w-10 text-right">
                      {sortBy === "achievement" ? `${percent} PTS` : Math.round((percent / 100) * maxPcs)}
                    </span>
                    <div className="flex-1 border-t border-dashed border-slate-100 dark:border-neutral-800/60" />
                  </div>
                ))}
              </div>

              {/* Render Columns */}
              {sortedLines.map((line, idx) => {
                const rank = idx + 1;
                const colorInfo = getRankColor(idx, sortedLines.length);
                const barHeightPercent = sortBy === "achievement"
                  ? Math.max(5, Math.round(getKpiScoreForLine(line.lineNo)))
                  : Math.max(5, Math.round((line.currentProductionPcs / maxPcs) * 100));
                const targetPct = line.targetPcs > 0 ? Math.min(100, Math.round((line.currentProductionPcs / line.targetPcs) * 100)) : 0;
                const pic = getPhoto(line);

                return (
                  <div 
                    key={line.lineNo}
                    className="flex-1 min-w-[32px] max-w-[80px] h-full flex flex-col justify-end items-center relative group z-10 animate-none"
                  >
                    {/* Pieces or KPI Points floating badge */}
                    <div className="absolute -top-6 text-[10px] font-black text-slate-700 dark:text-neutral-300 font-mono bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 px-1.5 py-0.5 rounded shadow-xs opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-30 whitespace-nowrap">
                      {sortBy === "achievement" ? `${getKpiScoreForLine(line.lineNo)} PTS` : `${line.currentProductionPcs} PCS`}
                    </div>

                    {/* Bar Column Container */}
                    <div className="w-full bg-slate-50 dark:bg-neutral-800/20 rounded-t-lg flex flex-col justify-end h-[240px] overflow-hidden relative border border-slate-100 dark:border-neutral-800 shadow-2xs group-hover:shadow-xs transition-all duration-200">
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                      {/* Bar fill */}
                      <div
                        className={`w-full rounded-t-md ${colorInfo.bg} bg-linear-to-t from-black/20 to-white/15`}
                        style={{ height: `${barHeightPercent}%` }}
                      />
                    </div>

                    {/* Compact Supervisor / Line Metadata */}
                    <div className="mt-3 flex flex-col items-center gap-0.5 w-full text-center">
                      <div className="relative rounded-full overflow-hidden w-6 h-6 border border-slate-200 dark:border-neutral-700 bg-slate-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                        {pic ? (
                          <img src={pic} alt={line.supervisor} className="w-full h-full object-cover" />
                        ) : (
                          <User className="h-3 w-3 text-slate-400" />
                        )}
                      </div>
                      <span className="text-[10px] font-black text-slate-800 dark:text-white truncate w-full px-0.5 leading-tight">
                        {line.lineNo}
                      </span>
                      <span className="text-[8px] font-extrabold text-slate-400 dark:text-neutral-500 uppercase tracking-tight truncate w-full px-0.5" title={line.supervisor}>
                        {line.supervisor.split(" ")[0]}
                      </span>
                    </div>

                    {/* Detailed Hover Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col bg-slate-950 dark:bg-black text-white text-xs rounded-xl p-3 shadow-xl w-48 pointer-events-none z-50 border border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-150">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-1.5 mb-1.5">
                        <span className="font-black text-amber-400 font-mono">Rank #{rank}</span>
                        <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-neutral-800">
                          {line.status}
                        </span>
                      </div>
                      <div className="space-y-1 text-[10px]">
                        <p><span className="text-slate-400">Supervisor:</span> <span className="font-bold">{line.supervisor}</span></p>
                        <p><span className="text-slate-400">Line Code:</span> <span className="font-bold">{line.lineNo}</span></p>
                        <p><span className="text-slate-400">Buyer:</span> <span className="font-bold">{line.buyer}</span></p>
                        <p><span className="text-slate-400">Style:</span> <span className="font-bold">{line.style}</span></p>
                        <p><span className="text-slate-400">Efficiency:</span> <span className="font-bold text-emerald-400">{line.efficiency}%</span></p>
                        {sortBy === "achievement" ? (
                          <>
                            <div className="border-t border-slate-800 pt-1.5 mt-1.5 flex justify-between items-center font-mono">
                              <span>KPI Score</span>
                              <span className="font-bold text-indigo-400">{getKpiScoreForLine(line.lineNo)} / 100</span>
                            </div>
                            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
                              <div className="bg-indigo-400 h-full" style={{ width: `${getKpiScoreForLine(line.lineNo)}%` }} />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="border-t border-slate-800 pt-1.5 mt-1.5 flex justify-between items-center font-mono">
                              <span>Yield / Target</span>
                              <span className="font-bold text-indigo-400">{line.currentProductionPcs} / {line.targetPcs}</span>
                            </div>
                            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
                              <div className="bg-indigo-400 h-full" style={{ width: `${targetPct}%` }} />
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}

            </div>
          </div>
        )
      )}

      {/* BOTTOM MESSAGE & LOGO */}
      <div className="w-full bg-[#f8fafc] dark:bg-neutral-900 rounded-2xl border border-[#e2e8f0]/80 dark:border-neutral-800 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-left">
          <div className="p-2.5 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 rounded-lg flex-shrink-0">
            <TrendingUp className="h-5 w-5 stroke-[3]" />
          </div>
          <div>
            <p className="text-xs font-black text-[#0f172a] dark:text-white uppercase tracking-wider leading-tight">
              PROGRESS BARS REPRESENT HOURLY PRODUCTION YIELD RELATIVE TO DAILY SEWING SHIFT TARGETS.
            </p>
            <p className="text-[10px] font-bold text-[#475569] dark:text-neutral-400 uppercase tracking-widest mt-0.5">
              TELEMETRY LOGS UPDATE DYNAMICALLY EVERY 30 SECONDS.
            </p>
          </div>
        </div>

        <p className="text-[10px] font-black text-[#94a3b8] dark:text-neutral-500 uppercase tracking-widest font-mono shrink-0">
          PRODEXA GARMENTS LTD. • MES SYSTEMS
        </p>
      </div>

    </div>
  );
}

