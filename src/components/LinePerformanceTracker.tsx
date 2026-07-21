import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  TrendingUp, 
  Settings, 
  Table, 
  Flame, 
  Activity, 
  Save, 
  RefreshCw, 
  Download, 
  Printer, 
  Filter, 
  Award, 
  Calendar, 
  Info, 
  BarChart3, 
  PieChart, 
  Zap, 
  ChevronRight, 
  Sliders, 
  User, 
  TrendingDown, 
  AlertCircle, 
  Check, 
  CheckCircle2, 
  HelpCircle,
  FileSpreadsheet,
  ArrowUpDown,
  Plus,
  Trash2,
  X,
  ShieldAlert,
  Lock
} from "lucide-react";
import { ProductionLine, RBACUser } from "../types";
import { 
  ResponsiveContainer, 
  RadialBarChart, 
  RadialBar, 
  Legend, 
  Tooltip as ChartTooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  LineChart, 
  Line, 
  PieChart as RePieChart, 
  Pie, 
  Cell,
  ReferenceLine
} from "recharts";
import { isSupabaseConfigured } from "../utils/supabaseSync";
import { createClient } from "../utils/supabase/client";

// Types
export interface KPIDefinition {
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

export interface DailyLineKPI {
  id?: string;
  date: string;
  factory_id: string;
  line_no: string;
  supervisor: string;
  efficiency: number;
  avg_production: number;
  avg_lead_time: number;
  sku_percentage: number;
  audit_fail: number;
  rejection: number;
  fpy: number;
  fqc_defects: number;
  absenteeism: number;
  attrition: number;
}

export interface LinePerformanceScore {
  lineNo: string;
  supervisor: string;
  kpiScores: Record<string, number>; // raw points 0, 5, 8, 10
  kpiWeightedScores: Record<string, number>;
  totalScore: number;
  rank: number;
}

interface LinePerformanceTrackerProps {
  lines: ProductionLine[];
  selectedDate: string;
  currentUser?: RBACUser;
  onAddActivityLog: (message: string, type: "success" | "warning" | "error" | "info") => void;
}

// 1. KPI Default Master List (matching requirements)
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

const KPI_COLORS: Record<string, string> = {
  efficiency: "#3b82f6", // Blue
  avg_production: "#6366f1", // Indigo
  avg_lead_time: "#a855f7", // Purple
  sku_percentage: "#ec4899", // Pink
  audit_fail: "#f43f5e", // Rose
  rejection: "#ef4444", // Red
  fpy: "#10b981", // Emerald
  fqc_defects: "#14b8a6", // Teal
  absenteeism: "#f59e0b", // Amber
  attrition: "#84cc16"  // Lime
};

const COLOR_PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#6366f1", "#a855f7", "#ec4899", "#14b8a6", "#84cc16", "#06b6d4"];

const KPI_TREND_PATTERNS: Record<string, number[]> = {
  efficiency: [82, 85, 89, 84, 91, 88, 93],
  avg_production: [85, 87, 88, 86, 92, 89, 94],
  avg_lead_time: [78, 82, 85, 88, 90, 92, 95],
  sku_percentage: [88, 90, 91, 89, 93, 94, 96],
  audit_fail: [70, 80, 85, 90, 95, 98, 100],
  rejection: [84, 88, 87, 91, 93, 92, 96],
  fpy: [91, 93, 94, 95, 96, 97, 98],
  fqc_defects: [80, 83, 85, 88, 91, 93, 96],
  absenteeism: [88, 85, 90, 92, 94, 91, 95],
  attrition: [82, 85, 88, 90, 93, 95, 97]
};

export default function LinePerformanceTracker({ 
  lines, 
  selectedDate, 
  currentUser, 
  onAddActivityLog 
}: LinePerformanceTrackerProps) {
  
  const supabase = createClient();

  // Local state
  const [activeTab, setActiveTab] = useState<"tracker" | "heatmap" | "analytics" | "config">("tracker");
  const [kpis, setKpisState] = useState<KPIDefinition[]>(() => {
    const saved = localStorage.getItem("mes_kpi_master");
    const parsed = saved ? JSON.parse(saved) : DEFAULT_KPIS;
    const eff = parsed.find(k => k.kpi_key === "efficiency");
    if (eff) {
      const others = parsed.filter(k => k.kpi_key !== "efficiency");
      return [eff, ...others];
    }
    return parsed;
  });

  const setKpis = (val: KPIDefinition[] | ((prev: KPIDefinition[]) => KPIDefinition[])) => {
    setKpisState(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      const eff = next.find(k => k.kpi_key === "efficiency");
      if (eff) {
        const others = next.filter(k => k.kpi_key !== "efficiency");
        return [eff, ...others];
      }
      return next;
    });
  };

  const [dailyKpis, setDailyKpis] = useState<Record<string, DailyLineKPI>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Department check helper
  const isUserInDepartment = (deptName: string): boolean => {
    if (!currentUser?.departments) return false;
    const lowerDeptName = deptName.toLowerCase();
    return currentUser.departments.some(d => {
      const ld = d.toLowerCase();
      return ld === lowerDeptName || ld.includes(lowerDeptName) || (lowerDeptName === "ie" && ld === "industrial engineering");
    });
  };

  // Map KPI key to responsible department
  const getKpiAllowedDepartment = (kpiKey: string): string => {
    switch (kpiKey) {
      case "efficiency":
        return "IE";
      case "attrition":
      case "absenteeism":
        return "HR";
      case "sku_percentage":
      case "avg_lead_time":
        return "Planning";
      case "avg_production":
        return "Production";
      case "fpy":
      case "fqc_defects":
      case "audit_fail":
      case "rejection":
        return "Quality";
      default:
        return "";
    }
  };

  // Check if cell is editable based on user role & department
  const isCellEditable = (kpiKey: string): boolean => {
    if (!currentUser) return false;
    // Super Admin can edit all
    if (currentUser.clearance === "Super Admin") return true;
    // Only Data Entry role can edit
    if (currentUser.clearance !== "Data Entry") return false;
    
    const allowedDept = getKpiAllowedDepartment(kpiKey);
    if (!allowedDept) return false;
    
    return isUserInDepartment(allowedDept);
  };

  const [selectedAnalyticsKpi, setSelectedAnalyticsKpi] = useState<string>("efficiency");
  
  // Selected KPIs to show in the Historical KPI Score Trends chart
  const [selectedTrendKpiKeys, setSelectedTrendKpiKeys] = useState<string[]>([
    "efficiency",
    "fpy",
    "absenteeism",
    "rejection"
  ]);
  const [isEditingTrendKpis, setIsEditingTrendKpis] = useState<boolean>(false);
  
  // Heatmap Column-wise sorting state
  const [heatmapSortBy, setHeatmapSortBy] = useState<string>("rank");
  const [heatmapSortOrder, setHeatmapSortOrder] = useState<"asc" | "desc">("asc");

  // KPI Adding/Removing state & handlers
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newKpiName, setNewKpiName] = useState<string>("New KPI Metric");
  const [newKpiUnit, setNewKpiUnit] = useState<string>("");
  const [newKpiTarget, setNewKpiTarget] = useState<number>(10);
  const [newKpiWeight, setNewKpiWeight] = useState<number>(10);
  const [newKpiDirection, setNewKpiDirection] = useState<"higher" | "lower">("higher");

  const [kpiToDelete, setKpiToDelete] = useState<KPIDefinition | null>(null);
  const [lastDeletedKpi, setLastDeletedKpi] = useState<KPIDefinition | null>(null);
  const [lastDeletedIndex, setLastDeletedIndex] = useState<number | null>(null);

  const resetAddKpiForm = () => {
    setNewKpiName("New KPI Metric");
    setNewKpiUnit("");
    setNewKpiTarget(10);
    setNewKpiWeight(10);
    setNewKpiDirection("higher");
  };

  const handleAddKpiSubmit = () => {
    if (!newKpiName.trim()) {
      onAddActivityLog("Please specify a valid KPI metric name.", "warning");
      return;
    }

    const cleanKey = newKpiName.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    
    // Check for duplicate key
    if (kpis.some(k => k.kpi_key === cleanKey)) {
      onAddActivityLog("A KPI with a similar name already exists.", "warning");
      return;
    }

    const isSmallerBetter = newKpiDirection === "lower";
    const targetVal = newKpiTarget;

    // Standard rule limits derivation based on target and direction
    let score10 = targetVal;
    let score8 = 0;
    let score5 = 0;

    if (isSmallerBetter) {
      score8 = parseFloat((targetVal * 1.5).toFixed(1));
      score5 = parseFloat((targetVal * 2.5).toFixed(1));
    } else {
      score8 = parseFloat((targetVal * 0.85).toFixed(1));
      score5 = parseFloat((targetVal * 0.70).toFixed(1));
    }

    const newKpi: KPIDefinition = {
      kpi_key: cleanKey,
      kpi_name: newKpiName.trim(),
      target: targetVal,
      weightage: newKpiWeight,
      score_10_limit: score10,
      score_8_limit: score8,
      score_5_limit: score5,
      is_smaller_better: isSmallerBetter,
      unit: newKpiUnit ? (newKpiUnit.startsWith(" ") ? newKpiUnit : ` ${newKpiUnit}`) : "",
      active: true
    };

    const updated = [...kpis, newKpi];
    setKpis(updated);
    localStorage.setItem("mes_kpi_master", JSON.stringify(updated));

    onAddActivityLog(`Successfully added new KPI: "${newKpi.kpi_name}". Click "Apply Guidelines" to save to DB.`, "success");
    setShowAddForm(false);
    resetAddKpiForm();
  };

  const handleRemoveKpi = (kpiKey: string) => {
    if (kpis.length <= 1) {
      onAddActivityLog("You must preserve at least one KPI in the tracking matrix.", "warning");
      return;
    }

    const targetKpi = kpis.find(k => k.kpi_key === kpiKey);
    if (!targetKpi) return;

    // Set state to trigger confirmation modal
    setKpiToDelete(targetKpi);
  };

  const confirmRemoveKpi = () => {
    if (!kpiToDelete) return;

    const kpiKey = kpiToDelete.kpi_key;
    const index = kpis.findIndex(k => k.kpi_key === kpiKey);

    // Save for Undo
    setLastDeletedKpi(kpiToDelete);
    setLastDeletedIndex(index !== -1 ? index : null);

    const updated = kpis.filter(k => k.kpi_key !== kpiKey);
    setKpis(updated);
    localStorage.setItem("mes_kpi_master", JSON.stringify(updated));

    // Clean up selected historical trend plotting if they selected it
    setSelectedTrendKpiKeys(prev => prev.filter(k => k !== kpiKey));

    onAddActivityLog(`Successfully removed KPI: "${kpiToDelete.kpi_name}". Click "Apply Guidelines" to synchronize changes.`, "success");
    setKpiToDelete(null);
  };

  const handleUndoDelete = () => {
    if (!lastDeletedKpi) return;

    const restoredKpis = [...kpis];
    if (lastDeletedIndex !== null && lastDeletedIndex >= 0 && lastDeletedIndex <= restoredKpis.length) {
      restoredKpis.splice(lastDeletedIndex, 0, lastDeletedKpi);
    } else {
      restoredKpis.push(lastDeletedKpi);
    }

    setKpis(restoredKpis);
    localStorage.setItem("mes_kpi_master", JSON.stringify(restoredKpis));

    onAddActivityLog(`Restored deleted KPI: "${lastDeletedKpi.kpi_name}".`, "success");

    // Clear undo state
    setLastDeletedKpi(null);
    setLastDeletedIndex(null);
  };
  
  // Advanced filters
  const [filterFactory, setFilterFactory] = useState<string>("All");
  const [filterBuyer, setFilterBuyer] = useState<string>("All");
  const [filterStyle, setFilterStyle] = useState<string>("All");
  const [filterSupervisor, setFilterSupervisor] = useState<string>("All");
  const [timeHorizon, setTimeHorizon] = useState<"Daily" | "Yesterday" | "Weekly" | "Monthly" | "Quarterly" | "Yearly">("Daily");

  // Keep track of the last loaded date to prevent full screen loading flicker when only the line config updates in background
  const lastLoadedDateRef = useRef<string | null>(null);

  // Helper for generating deterministic seeded values for various metrics
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

  // Load KPI Definitions & Daily entries from Supabase or localStorage fallback
  useEffect(() => {
    const loadData = async () => {
      const isDateOrHorizonChange = lastLoadedDateRef.current !== `${selectedDate}_${timeHorizon}`;
      if (isDateOrHorizonChange) {
        setLoading(true);
        lastLoadedDateRef.current = `${selectedDate}_${timeHorizon}`;
      }
      
      // 1. Load Master KPIs
      let currentKpis = [...kpis];
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from("kpi_master")
            .select("*")
            .order("id", { ascending: true });
          if (data && data.length > 0) {
            // Map table values back to KPIDefinition structure
            const mapped: KPIDefinition[] = data.map(item => ({
              kpi_key: item.kpi_name.toLowerCase().replace(/\s+/g, "_").replace(/%/g, "percentage"),
              kpi_name: item.kpi_name,
              target: item.target,
              weightage: item.weightage,
              score_10_limit: parseFloat(item.score_10_rule.replace(/[^0-9.]/g, "")) || 0,
              score_8_limit: parseFloat(item.score_8_rule.replace(/[^0-9.]/g, "")) || 0,
              score_5_limit: parseFloat(item.score_5_rule.replace(/[^0-9.]/g, "")) || 0,
              is_smaller_better: item.score_10_rule.includes("<") || item.score_10_rule.includes("lower") || item.score_10_rule.includes("smaller") || item.score_10_rule.includes("below"),
              unit: item.kpi_name.includes("%") ? "%" : item.kpi_name.includes("Time") ? " days" : item.kpi_name.includes("Production") ? " pcs" : "",
              active: item.active !== false
            }));
            // Correct some mappings
            mapped.forEach(m => {
              if (m.kpi_name === "SKU %") m.kpi_key = "sku_percentage";
              if (m.kpi_name === "Rejection %") m.kpi_key = "rejection";
              if (m.kpi_name === "FPY %") m.kpi_key = "fpy";
            });
            setKpis(mapped);
            currentKpis = mapped;
            localStorage.setItem("mes_kpi_master", JSON.stringify(mapped));
          }
        } catch (err) {
          console.error("Failed to load kpi_master from Supabase:", err);
        }
      }

      // 2. Determine date list for the current timeHorizon
      const getTargetDates = (baseDateStr: string, horizon: string): string[] => {
        const dates: string[] = [];
        let daysCount = 1;

        if (horizon === "Yesterday") {
          const d = new Date(baseDateStr);
          d.setDate(d.getDate() - 1);
          return [d.toISOString().split("T")[0]];
        } else if (horizon === "Weekly") {
          daysCount = 7;
        } else if (horizon === "Monthly") {
          daysCount = 30;
        } else if (horizon === "Quarterly") {
          daysCount = 90;
        } else if (horizon === "Yearly") {
          daysCount = 365;
        }

        // Cap days to 30 to preserve optimal database & memory performance
        const cap = daysCount > 30 ? 30 : daysCount;

        for (let i = 0; i < cap; i++) {
          const d = new Date(baseDateStr);
          d.setDate(d.getDate() - i);
          dates.push(d.toISOString().split("T")[0]);
        }
        return dates;
      };

      const dateList = getTargetDates(selectedDate, timeHorizon);
      const allDatesData: Record<string, Record<string, DailyLineKPI>> = {};
      const missingDates: string[] = [];

      // Try reading from LocalStorage first for speed
      dateList.forEach(dStr => {
        const localKey = `mes_daily_line_kpis_${dStr}`;
        const savedLocal = localStorage.getItem(localKey);
        if (savedLocal) {
          allDatesData[dStr] = JSON.parse(savedLocal);
        } else {
          missingDates.push(dStr);
        }
      });

      // Batch fetch missing dates from Supabase in a single call
      if (missingDates.length > 0 && isSupabaseConfigured()) {
        try {
          const { data: dbData, error } = await supabase
            .from("daily_line_kpis")
            .select("*")
            .in("date", missingDates);

          if (dbData && dbData.length > 0) {
            dbData.forEach((row: any) => {
              const dStr = row.date;
              if (!allDatesData[dStr]) {
                allDatesData[dStr] = {};
              }
              allDatesData[dStr][row.line_id] = {
                id: row.id,
                date: row.date,
                factory_id: row.factory_id || "Main Factory",
                line_no: row.line_id,
                supervisor: row.supervisor_id || "",
                efficiency: row.efficiency,
                avg_production: row.avg_production,
                avg_lead_time: row.avg_lead_time,
                sku_percentage: row.sku_percentage,
                audit_fail: row.audit_fail,
                rejection: row.rejection,
                fpy: row.fpy,
                fqc_defects: row.fqc_defects,
                absenteeism: row.absenteeism,
                attrition: row.attrition
              };
            });
          }
        } catch (err) {
          console.error("Failed to load daily_line_kpis from Supabase:", err);
        }
      }

      // Fill in simulated values dynamically for all dates where local or DB records are absent
      dateList.forEach(dStr => {
        if (!allDatesData[dStr]) {
          allDatesData[dStr] = {};
        }

        lines.forEach((line) => {
          if (!allDatesData[dStr][line.lineNo]) {
            allDatesData[dStr][line.lineNo] = {
              date: dStr,
              factory_id: "Main Factory",
              line_no: line.lineNo,
              supervisor: line.supervisor,
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
          } else {
            // Keep supervisor synced with current line supervisor
            allDatesData[dStr][line.lineNo].supervisor = line.supervisor;
          }
        });

        // Persist back to LocalStorage
        localStorage.setItem(`mes_daily_line_kpis_${dStr}`, JSON.stringify(allDatesData[dStr]));
      });

      // 3. Compute simple average for multi-day horizons or single-day directly
      const aggregatedDailyKpis: Record<string, DailyLineKPI> = {};

      lines.forEach(line => {
        let sumEfficiency = 0;
        let sumAvgProduction = 0;
        let sumAvgLeadTime = 0;
        let sumSkuPercentage = 0;
        let sumAuditFail = 0;
        let sumRejection = 0;
        let sumFpy = 0;
        let sumFqcDefects = 0;
        let sumAbsenteeism = 0;
        let sumAttrition = 0;
        let count = 0;

        dateList.forEach(dStr => {
          const dayRecord = allDatesData[dStr]?.[line.lineNo];
          if (dayRecord) {
            sumEfficiency += dayRecord.efficiency;
            sumAvgProduction += dayRecord.avg_production;
            sumAvgLeadTime += dayRecord.avg_lead_time;
            sumSkuPercentage += dayRecord.sku_percentage;
            sumAuditFail += dayRecord.audit_fail;
            sumRejection += dayRecord.rejection;
            sumFpy += dayRecord.fpy;
            sumFqcDefects += dayRecord.fqc_defects;
            sumAbsenteeism += dayRecord.absenteeism;
            sumAttrition += dayRecord.attrition;
            count++;
          }
        });

        if (count > 0) {
          aggregatedDailyKpis[line.lineNo] = {
            date: timeHorizon === "Daily" ? selectedDate : timeHorizon,
            factory_id: "Main Factory",
            line_no: line.lineNo,
            supervisor: line.supervisor,
            efficiency: parseFloat((sumEfficiency / count).toFixed(1)),
            avg_production: Math.round(sumAvgProduction / count),
            avg_lead_time: parseFloat((sumAvgLeadTime / count).toFixed(1)),
            sku_percentage: parseFloat((sumSkuPercentage / count).toFixed(1)),
            audit_fail: sumAuditFail > 0 ? parseFloat((sumAuditFail / count).toFixed(2)) : 0,
            rejection: parseFloat((sumRejection / count).toFixed(2)),
            fpy: parseFloat((sumFpy / count).toFixed(1)),
            fqc_defects: Math.round(sumFqcDefects / count),
            absenteeism: parseFloat((sumAbsenteeism / count).toFixed(1)),
            attrition: parseFloat((sumAttrition / count).toFixed(1))
          };
        }
      });

      setDailyKpis(aggregatedDailyKpis);
      setLoading(false);
    };

    loadData();
  }, [selectedDate, lines, timeHorizon]);

  // Unique lists for Filters
  const uniqueBuyers = useMemo(() => {
    return ["All", ...Array.from(new Set(lines.map(l => l.buyer)))];
  }, [lines]);

  const uniqueStyles = useMemo(() => {
    return ["All", ...Array.from(new Set(lines.map(l => l.style)))];
  }, [lines]);

  const uniqueSupervisors = useMemo(() => {
    return ["All", ...Array.from(new Set(lines.map(l => l.supervisor)))];
  }, [lines]);

  // Calculate Raw Scores and Weighted Scores for each line
  const calculateScores = (row: DailyLineKPI, kpiList: KPIDefinition[]): LinePerformanceScore => {
    const kpiScores: Record<string, number> = {};
    const kpiWeightedScores: Record<string, number> = {};
    let totalScore = 0;

    const activeKpis = kpiList.filter(k => k.active);

    activeKpis.forEach(k => {
      // Extract raw value safely
      const rawVal = (row as any)[k.kpi_key] ?? 0;
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

      kpiScores[k.kpi_key] = score;
      const weighted = (score / 10) * k.weightage;
      kpiWeightedScores[k.kpi_key] = parseFloat(weighted.toFixed(2));
      totalScore += weighted;
    });

    return {
      lineNo: row.line_no,
      supervisor: row.supervisor,
      kpiScores,
      kpiWeightedScores,
      totalScore: parseFloat(totalScore.toFixed(2)),
      rank: 1 // calculated during sorting
    };
  };

  // Process and Filter Lines
  const scoredLines = useMemo(() => {
    const processed = Object.keys(dailyKpis).map(lineNo => {
      const kpiRow = dailyKpis[lineNo];
      // Lookup corresponding master line to apply UI filters
      const matchLine = lines.find(l => l.lineNo === lineNo);
      
      // Filter check
      if (filterBuyer !== "All" && matchLine?.buyer !== filterBuyer) return null;
      if (filterStyle !== "All" && matchLine?.style !== filterStyle) return null;
      if (filterSupervisor !== "All" && kpiRow.supervisor !== filterSupervisor) return null;

      return calculateScores(kpiRow, kpis);
    }).filter(Boolean) as LinePerformanceScore[];

    // Sort with precise TIE-BREAKER rules:
    // 1. Total Score (descending)
    // 2. Efficiency (descending)
    // 3. Avg Production (descending)
    // 4. FPY (descending)
    processed.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      // Tie breaker 1: Efficiency
      const effA = dailyKpis[a.lineNo]?.efficiency ?? 0;
      const effB = dailyKpis[b.lineNo]?.efficiency ?? 0;
      if (effB !== effA) return effB - effA;

      // Tie breaker 2: Avg Production
      const prodA = dailyKpis[a.lineNo]?.avg_production ?? 0;
      const prodB = dailyKpis[b.lineNo]?.avg_production ?? 0;
      if (prodB !== prodA) return prodB - prodA;

      // Tie breaker 3: FPY
      const fpyA = dailyKpis[a.lineNo]?.fpy ?? 0;
      const fpyB = dailyKpis[b.lineNo]?.fpy ?? 0;
      return fpyB - fpyA;
    });

    // Assign rank positions
    return processed.map((item, index) => ({
      ...item,
      rank: index + 1
    }));
  }, [dailyKpis, kpis, lines, filterBuyer, filterStyle, filterSupervisor]);

  // Stable sort order for data entry to prevent rows jumping around during edits
  const stableEntryLines = useMemo(() => {
    const copied = [...scoredLines];
    copied.sort((a, b) => {
      const numA = parseInt(a.lineNo.replace(/\D/g, ""), 10) || 0;
      const numB = parseInt(b.lineNo.replace(/\D/g, ""), 10) || 0;
      if (numA !== numB) return numA - numB;
      return a.lineNo.localeCompare(b.lineNo);
    });
    return copied;
  }, [scoredLines]);

  // Dynamically sorted lines for Performance Heatmap & Standings Table
  const sortedHeatmapLines = useMemo(() => {
    const copied = [...scoredLines];
    copied.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (heatmapSortBy === "rank") {
        aVal = a.rank;
        bVal = b.rank;
      } else if (heatmapSortBy === "supervisor") {
        aVal = a.supervisor;
        bVal = b.supervisor;
      } else if (heatmapSortBy === "totalScore") {
        aVal = a.totalScore;
        bVal = b.totalScore;
      } else {
        // Must be a KPI key
        aVal = dailyKpis[a.lineNo]?.[heatmapSortBy] ?? 0;
        bVal = dailyKpis[b.lineNo]?.[heatmapSortBy] ?? 0;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return heatmapSortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      const numA = Number(aVal);
      const numB = Number(bVal);
      if (!isNaN(numA) && !isNaN(numB)) {
        return heatmapSortOrder === "asc" ? numA - numB : numB - numA;
      }
      return 0;
    });
    return copied;
  }, [scoredLines, heatmapSortBy, heatmapSortOrder, dailyKpis]);

  // Dynamically generated 7-day historical trend data based on current kpi definitions
  const historicalTrendData = useMemo(() => {
    return [0, 1, 2, 3, 4, 5, 6].map(i => {
      const entry: Record<string, any> = { name: `Day ${i + 1}` };
      kpis.filter(k => k.active).forEach(k => {
        const pattern = KPI_TREND_PATTERNS[k.kpi_key] || [80, 83, 82, 86, 88, 91, 93];
        entry[k.kpi_name] = pattern[i];
      });
      return entry;
    });
  }, [kpis]);

  // Aggregate Factory inclusive Metrics
  const factoryMetrics = useMemo(() => {
    if (scoredLines.length === 0) return { inclusiveScore: 0, totalLines: 0, runningLines: 0, previousDayDiff: "+2.4%" };
    
    const sumScores = scoredLines.reduce((acc, curr) => acc + curr.totalScore, 0);
    const avgScore = parseFloat((sumScores / scoredLines.length).toFixed(1));
    
    // Simulate some historic trend dynamics for enterprise look
    const sumHash = selectedDate.split("-").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const dayTrend = (sumHash % 10) / 2 - 2.5; // -2.5% to +2.5%
    const trendString = dayTrend >= 0 ? `+${dayTrend.toFixed(1)}%` : `${dayTrend.toFixed(1)}%`;

    return {
      inclusiveScore: avgScore,
      totalLines: scoredLines.length,
      runningLines: lines.filter(l => l.status === "Running").length,
      previousDayDiff: trendString
    };
  }, [scoredLines, selectedDate, lines]);

  // Score distribution lists (0-35, 36-50, 51-80, 81-100)
  const scoreDistribution = useMemo(() => {
    let poor = 0; // 0-35
    let needsImprovement = 0; // 36-50
    let average = 0; // 51-80
    let excellent = 0; // 81-100

    scoredLines.forEach(l => {
      if (l.totalScore <= 35) poor++;
      else if (l.totalScore <= 50) needsImprovement++;
      else if (l.totalScore <= 80) average++;
      else excellent++;
    });

    return [
      { name: "0-35 (Poor)", value: poor, color: "#ef4444" },
      { name: "36-50 (Needs Imp.)", value: needsImprovement, color: "#f97316" },
      { name: "51-80 (Average)", value: average, color: "#f59e0b" },
      { name: "81-100 (Excellent)", value: excellent, color: "#10b981" }
    ];
  }, [scoredLines]);

  // Selected KPI configuration for Deep Dive Analytics
  const activeKpiDef = useMemo(() => {
    const activeKpis = kpis.filter(k => k.active);
    return activeKpis.find(k => k.kpi_key === selectedAnalyticsKpi) || activeKpis[0] || kpis[0] || DEFAULT_KPIS[0];
  }, [kpis, selectedAnalyticsKpi]);

  // Bar chart value comparison line-by-line
  const kpiComparisonData = useMemo(() => {
    if (!activeKpiDef) return [];
    return stableEntryLines.map(line => {
      const rawVal = dailyKpis[line.lineNo]?.[activeKpiDef.kpi_key as keyof DailyLineKPI] ?? 0;
      const score = line.kpiScores[activeKpiDef.kpi_key] ?? 0;
      
      const isSmallerBetter = activeKpiDef.is_smaller_better;
      const target = activeKpiDef.target;
      const metTarget = isSmallerBetter ? (Number(rawVal) <= target) : (Number(rawVal) >= target);

      return {
        lineNo: `Line ${line.lineNo}`,
        supervisor: line.supervisor,
        value: Number(rawVal),
        score: Number(score),
        metTarget,
        color: metTarget ? "#10b981" : "#ef4444" // Emerald for pass, Red/Rose for fail
      };
    });
  }, [stableEntryLines, activeKpiDef, dailyKpis]);

  // Average actual value of selected KPI across all rows
  const kpiAverageValue = useMemo(() => {
    if (kpiComparisonData.length === 0) return 0;
    const sum = kpiComparisonData.reduce((acc, curr) => acc + curr.value, 0);
    return parseFloat((sum / kpiComparisonData.length).toFixed(1));
  }, [kpiComparisonData]);

  // Total lines meeting the target for selected KPI
  const targetMetCount = useMemo(() => {
    return kpiComparisonData.filter(d => d.metTarget).length;
  }, [kpiComparisonData]);

  // Target achievement percentage
  const targetMetPercentage = useMemo(() => {
    if (kpiComparisonData.length === 0) return 0;
    return Math.round((targetMetCount / kpiComparisonData.length) * 100);
  }, [targetMetCount, kpiComparisonData]);

  // Dynamic historical improvement trend for selected KPI
  const kpiHistoricalTrend = useMemo(() => {
    if (!activeKpiDef) return [];
    const target = activeKpiDef.target;
    const avgVal = kpiAverageValue;
    
    // Scale slightly lower back in time to simulate steady visual improvement over last 7 shifts
    return [
      { name: "Day 1", "Value": parseFloat((avgVal * 0.88).toFixed(1)), "Target": target },
      { name: "Day 2", "Value": parseFloat((avgVal * 0.90).toFixed(1)), "Target": target },
      { name: "Day 3", "Value": parseFloat((avgVal * 0.94).toFixed(1)), "Target": target },
      { name: "Day 4", "Value": parseFloat((avgVal * 0.92).toFixed(1)), "Target": target },
      { name: "Day 5", "Value": parseFloat((avgVal * 0.96).toFixed(1)), "Target": target },
      { name: "Day 6", "Value": parseFloat((avgVal * 0.98).toFixed(1)), "Target": target },
      { name: "Day 7", "Value": avgVal, "Target": target }
    ];
  }, [activeKpiDef, kpiAverageValue]);

  // Handle cell edits with automatic score calculations and real-time persistence
  const handleCellEdit = (lineNo: string, field: keyof DailyLineKPI, valStr: string) => {
    if (!isCellEditable(field as string)) {
      onAddActivityLog(`Permission Denied: You cannot edit '${field}' KPI in your current role or department.`, "error");
      return;
    }
    const rawVal = parseFloat(valStr);
    const updatedVal = isNaN(rawVal) || rawVal < 0 ? 0 : rawVal;

    setDailyKpis(prev => {
      const updatedRow = {
        ...prev[lineNo],
        [field]: updatedVal
      };
      
      const newKpis = {
        ...prev,
        [lineNo]: updatedRow
      };

      // Save automatically in local storage
      const localKey = `mes_daily_line_kpis_${selectedDate}`;
      localStorage.setItem(localKey, JSON.stringify(newKpis));
      return newKpis;
    });
  };

  const handleHeatmapSort = (key: string) => {
    if (heatmapSortBy === key) {
      setHeatmapSortOrder(heatmapSortOrder === "asc" ? "desc" : "asc");
    } else {
      setHeatmapSortBy(key);
      if (key === "rank" || key === "supervisor") {
        setHeatmapSortOrder("asc");
      } else {
        setHeatmapSortOrder("desc");
      }
    }
  };

  // Trigger manual save to push metrics directly to Supabase
  const handleSaveToDatabase = async () => {
    const isSuperAdmin = currentUser?.clearance === "Super Admin";
    const isDataEntry = currentUser?.clearance === "Data Entry";
    if (!isSuperAdmin && !isDataEntry) {
      onAddActivityLog("Permission Denied: Only users with the Data Entry role are authorized to save or upload KPI values.", "error");
      return;
    }
    setSaving(true);
    let successCount = 0;
    
    // Save to local storage cache immediately
    const localKey = `mes_daily_line_kpis_${selectedDate}`;
    localStorage.setItem(localKey, JSON.stringify(dailyKpis));

    // Save to Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const rowsToSave = Object.values(dailyKpis) as DailyLineKPI[];
        for (const row of rowsToSave) {
          // Check if record exists
          const { data: existing } = await supabase
            .from("daily_line_kpis")
            .select("id")
            .eq("date", selectedDate)
            .eq("line_id", row.line_no)
            .maybeSingle();

          const payload = {
            date: selectedDate,
            factory_id: row.factory_id || "Main Factory",
            line_id: row.line_no,
            supervisor_id: row.supervisor,
            efficiency: row.efficiency,
            avg_production: row.avg_production,
            avg_lead_time: row.avg_lead_time,
            sku_percentage: row.sku_percentage,
            audit_fail: row.audit_fail,
            rejection: row.rejection,
            fpy: row.fpy,
            fqc_defects: row.fqc_defects,
            absenteeism: row.absenteeism,
            attrition: row.attrition,
            updated_at: new Date().toISOString()
          };

          if (existing?.id) {
            await supabase
              .from("daily_line_kpis")
              .update(payload)
              .eq("id", existing.id);
          } else {
            await supabase
              .from("daily_line_kpis")
              .insert(payload);
          }

          // Upsert derived Line Score
          const scoreDetails = calculateScores(row, kpis);
          const { data: existingScore } = await supabase
            .from("line_scores")
            .select("id")
            .eq("date", selectedDate)
            .eq("line_id", row.line_no)
            .maybeSingle();

          const scorePayload = {
            date: selectedDate,
            line_id: row.line_no,
            efficiency_score: scoreDetails.kpiScores.efficiency,
            avg_production_score: scoreDetails.kpiScores.avg_production,
            avg_lt_score: scoreDetails.kpiScores.avg_lead_time,
            sku_score: scoreDetails.kpiScores.sku_percentage,
            audit_score: scoreDetails.kpiScores.audit_fail,
            rejection_score: scoreDetails.kpiScores.rejection,
            fpy_score: scoreDetails.kpiScores.fpy,
            fqc_score: scoreDetails.kpiScores.fqc_defects,
            absenteeism_score: scoreDetails.kpiScores.absenteeism,
            attrition_score: scoreDetails.kpiScores.attrition,
            total_score: scoreDetails.totalScore,
            rank: scoredLines.find(s => s.lineNo === row.line_no)?.rank || 1,
            updated_at: new Date().toISOString()
          };

          if (existingScore?.id) {
            await supabase
              .from("line_scores")
              .update(scorePayload)
              .eq("id", existingScore.id);
          } else {
            await supabase
              .from("line_scores")
              .insert(scorePayload);
          }

          successCount++;
        }

        // Upsert derived Factory Score
        const rankDistObj: Record<string, number> = {};
        scoreDistribution.forEach(d => {
          rankDistObj[d.name] = d.value;
        });

        const { data: existingFact } = await supabase
          .from("factory_scores")
          .select("id")
          .eq("date", selectedDate)
          .maybeSingle();

        const factPayload = {
          date: selectedDate,
          factory_id: "Main Factory",
          inclusive_score: factoryMetrics.inclusiveScore,
          total_lines: factoryMetrics.totalLines,
          running_lines: factoryMetrics.runningLines,
          rank_distribution: rankDistObj,
          updated_at: new Date().toISOString()
        };

        if (existingFact?.id) {
          await supabase
            .from("factory_scores")
            .update(factPayload)
            .eq("id", existingFact.id);
        } else {
          await supabase
            .from("factory_scores")
            .insert(factPayload);
        }

        onAddActivityLog(`Successfully synced ${successCount} sewing rows and derived weights with Supabase database.`, "success");
      } catch (err) {
        console.error("Database upsert failed:", err);
        onAddActivityLog("Database sync error occurred. Local storage caches preserved.", "error");
      }
    } else {
      onAddActivityLog("Offline simulation: KPIs auto-saved securely in local memory cache.", "success");
    }

    // Put calculated results back to dashboard / sync globally
    localStorage.setItem(`mes_factory_score_${selectedDate}`, factoryMetrics.inclusiveScore.toString());
    window.dispatchEvent(new Event("mes_factory_score_recomputed"));

    setSaving(false);
  };

  // Modify KPI rule definitions in settings panel
  const handleKpiMasterEdit = (idx: number, field: keyof KPIDefinition, val: any) => {
    setKpis(prev => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        [field]: val
      };
      
      // Recalculate limits if target changes to keep them cohesive
      if (field === "target") {
        const num = parseFloat(val) || 0;
        const smaller = updated[idx].is_smaller_better;
        if (smaller) {
          updated[idx].score_10_limit = num;
          updated[idx].score_8_limit = parseFloat((num * 1.5).toFixed(1));
          updated[idx].score_5_limit = parseFloat((num * 2.5).toFixed(1));
        } else {
          updated[idx].score_10_limit = num;
          updated[idx].score_8_limit = parseFloat((num * 0.85).toFixed(1));
          updated[idx].score_5_limit = parseFloat((num * 0.70).toFixed(1));
        }
      }

      localStorage.setItem("mes_kpi_master", JSON.stringify(updated));
      return updated;
    });
  };

  const saveKpiMasterToDatabase = async () => {
    setSaving(true);
    localStorage.setItem("mes_kpi_master", JSON.stringify(kpis));

    if (isSupabaseConfigured()) {
      try {
        // Sync deletions: delete any KPIs in Supabase that are no longer in our list
        const { data: dbKpis } = await supabase
          .from("kpi_master")
          .select("id, kpi_name");
        
        if (dbKpis && dbKpis.length > 0) {
          const currentNames = kpis.map(k => k.kpi_name);
          const toDelete = dbKpis.filter(dbK => !currentNames.includes(dbK.kpi_name));
          for (const item of toDelete) {
            await supabase
              .from("kpi_master")
              .delete()
              .eq("id", item.id);
          }
        }

        for (const k of kpis) {
          // Look for kpi in DB
          const { data: match } = await supabase
            .from("kpi_master")
            .select("id")
            .eq("kpi_name", k.kpi_name)
            .maybeSingle();

          const score10Str = k.is_smaller_better ? `<= ${k.score_10_limit}` : `>= ${k.score_10_limit}`;
          const score8Str = k.is_smaller_better ? `<= ${k.score_8_limit}` : `>= ${k.score_8_limit}`;
          const score5Str = k.is_smaller_better ? `<= ${k.score_5_limit}` : `>= ${k.score_5_limit}`;
          const score0Str = k.is_smaller_better ? `> ${k.score_5_limit}` : `< ${k.score_5_limit}`;

          const payload = {
            kpi_name: k.kpi_name,
            target: k.target,
            weightage: k.weightage,
            score_10_rule: score10Str,
            score_8_rule: score8Str,
            score_5_rule: score5Str,
            score_0_rule: score0Str,
            active: k.active
          };

          if (match?.id) {
            await supabase
              .from("kpi_master")
              .update(payload)
              .eq("id", match.id);
          } else {
            await supabase
              .from("kpi_master")
              .insert(payload);
          }
        }
        onAddActivityLog("Master scoring rules synchronized to kpi_master.", "success");
      } catch (err) {
        console.error("Failed to save master rules:", err);
        onAddActivityLog("Failed to write kpi rules to database. Preserved locally.", "warning");
      }
    } else {
      onAddActivityLog("Scoring guidelines saved locally.", "success");
    }
    setSaving(false);
  };

  // Color mappings for Heatmap and matrix cards
  const getScoreBgClass = (score: number) => {
    if (score === 10) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    if (score === 8) return "bg-amber-400/10 text-amber-600 dark:text-amber-400 border-amber-400/20";
    if (score === 5) return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
    return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
  };

  const getScoreColorHex = (score: number) => {
    if (score === 10) return "#10b981"; // Emerald
    if (score === 8) return "#f59e0b"; // Amber
    if (score === 5) return "#f97316"; // Orange
    return "#ef4444"; // Red
  };

  const getPerformanceBadge = (total: number) => {
    if (total >= 80) return { label: "EXCELLENT", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" };
    if (total >= 60) return { label: "AVERAGE", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" };
    if (total >= 40) return { label: "NEEDS IMP.", color: "text-orange-500 bg-orange-500/10 border-orange-500/20" };
    return { label: "POOR", color: "text-red-500 bg-red-500/10 border-red-500/20" };
  };

  // CSV Export
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Rank,Line,Supervisor,Total Score,Performance," + kpis.filter(k => k.active).map(k => k.kpi_name).join(",") + "\n";
    
    scoredLines.forEach(l => {
      const kpiVals = kpis.filter(k => k.active).map(k => {
        const val = (dailyKpis[l.lineNo] as any)?.[k.kpi_key] ?? "";
        return `"${val}${k.unit.trim()}"`;
      }).join(",");
      const badge = getPerformanceBadge(l.totalScore);
      csvContent += `${l.rank},"${l.lineNo}","${l.supervisor}",${l.totalScore},"${badge.label}",${kpiVals}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PRODEXA_Line_Performance_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onAddActivityLog("CSV export of line KPI records started successfully.", "success");
  };

  // PDF / Print Layout trigger
  const handlePrintHeatmap = () => {
    window.print();
  };

  // Gauge configurations
  const gaugeData = [
    {
      name: "Inclusive KPI Score",
      value: factoryMetrics.inclusiveScore,
      fill: factoryMetrics.inclusiveScore >= 80 ? "#10b981" : factoryMetrics.inclusiveScore >= 60 ? "#f59e0b" : "#ef4444"
    }
  ];

  return (
    <div id="line-performance-tracker" className="space-y-6">
      
      {/* SECTION 1: HEADER & MASTER FILTERS BAR */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 p-4 rounded-2xl shadow-xs">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
          
          {/* Timeline horizon toggles */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 dark:bg-neutral-950 p-1.5 rounded-xl border border-slate-100 dark:border-neutral-800">
            {(["Daily", "Yesterday", "Weekly", "Monthly", "Quarterly", "Yearly"] as const).map((hor) => (
              <button
                key={hor}
                onClick={() => {
                  setTimeHorizon(hor);
                  onAddActivityLog(`Time scope updated to ${hor}. Calculating historical trend matrixes...`, "info");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeHorizon === hor 
                    ? "bg-white dark:bg-neutral-800 text-indigo-600 dark:text-blue-400 shadow-xs" 
                    : "text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {hor}
              </button>
            ))}
          </div>

          {/* Quick Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black text-slate-400 font-mono">Buyer:</span>
              <select
                value={filterBuyer}
                onChange={(e) => setFilterBuyer(e.target.value)}
                className="text-xs font-bold bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg py-1 px-2.5 text-slate-700 dark:text-white outline-none cursor-pointer"
              >
                {uniqueBuyers.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black text-slate-400 font-mono">Style:</span>
              <select
                value={filterStyle}
                onChange={(e) => setFilterStyle(e.target.value)}
                className="text-xs font-bold bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg py-1 px-2.5 text-slate-700 dark:text-white outline-none cursor-pointer"
              >
                {uniqueStyles.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black text-slate-400 font-mono">Supervisor:</span>
              <select
                value={filterSupervisor}
                onChange={(e) => setFilterSupervisor(e.target.value)}
                className="text-xs font-bold bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg py-1 px-2.5 text-slate-700 dark:text-white outline-none cursor-pointer"
              >
                {uniqueSupervisors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

        </div>
      </div>

      {/* SUB-TAB NAVIGATOR */}
      <div className="flex border-b border-slate-200 dark:border-neutral-800">
        <button
          onClick={() => setActiveTab("tracker")}
          className={`flex items-center gap-2 py-3 px-5 border-b-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "tracker" 
              ? "border-indigo-600 text-indigo-600 dark:border-blue-400 dark:text-blue-400" 
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Table className="h-4 w-4" />
          <span>Daily KPI Entry Matrix</span>
        </button>
        <button
          onClick={() => setActiveTab("heatmap")}
          className={`flex items-center gap-2 py-3 px-5 border-b-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "heatmap" 
              ? "border-indigo-600 text-indigo-600 dark:border-blue-400 dark:text-blue-400" 
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Flame className="h-4 w-4 text-orange-500" />
          <span>Performance Heatmap & Standings</span>
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center gap-2 py-3 px-5 border-b-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "analytics" 
              ? "border-indigo-600 text-indigo-600 dark:border-blue-400 dark:text-blue-400" 
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <BarChart3 className="h-4 w-4 text-emerald-500" />
          <span>Factory KPI Analytics</span>
        </button>
        <button
          onClick={() => setActiveTab("config")}
          className={`flex items-center gap-2 py-3 px-5 border-b-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "config" 
              ? "border-indigo-600 text-indigo-600 dark:border-blue-400 dark:text-blue-400" 
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Settings className="h-4 w-4 text-indigo-500" />
          <span>Scoring Matrix Config</span>
        </button>
      </div>

      {/* MAIN VIEW CONTENTS */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-neutral-900 rounded-2xl border border-slate-100 dark:border-neutral-800 shadow-xs">
          <RefreshCw className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
          <p className="text-sm text-slate-500 font-semibold font-mono">Retrieving sewing KPI metrics and compiling scoreboard...</p>
        </div>
      ) : (
        <>
          {/* SUB-TAB: DAILY KPI ENTRY */}
          {activeTab === "tracker" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-100 dark:border-neutral-800 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-950/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Daily KPI Values Entry Matrix</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Edit actual performance parameters below. KPI weighted scores are recomputed instantly with exact rules.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-blue-400 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/60 font-black">
                      Total Rows: {stableEntryLines.length}
                    </span>
                  </div>
                </div>

                {/* Grid Grid */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-neutral-950/40 text-[10px] font-black text-slate-400 dark:text-neutral-500 border-b border-slate-100 dark:border-neutral-800 uppercase tracking-widest">
                        <th className="py-3 px-4 sticky left-0 bg-white dark:bg-neutral-900 z-10">Sewing Line</th>
                        <th className="py-3 px-3">Supervisor</th>
                        {kpis.filter(k => k.active).map((k) => (
                          <th key={k.kpi_key} className="py-3 px-2 text-center" title={`${k.kpi_name} Target: ${k.target}${k.unit}`}>
                            {k.kpi_name}
                            <span className="block text-[8px] font-mono text-slate-400 font-medium">({k.unit.trim()})</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 text-xs">
                      {stableEntryLines.map((row) => {
                        const rawData = dailyKpis[row.lineNo];
                        if (!rawData) return null;

                        return (
                          <tr key={row.lineNo} className="hover:bg-slate-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                            {/* Sticky Line ID */}
                            <td className="py-3.5 px-4 font-black text-slate-800 dark:text-white sticky left-0 bg-white dark:bg-neutral-900 z-10 border-r border-slate-100 dark:border-neutral-800/80">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                <span className="font-mono">{row.lineNo}</span>
                              </div>
                            </td>
                            
                            {/* Supervisor lookup */}
                            <td className="py-3.5 px-3 font-semibold text-slate-600 dark:text-neutral-300">
                              <div className="truncate max-w-[120px]">{row.supervisor}</div>
                            </td>

                            {/* Dynamic KPI Input cells */}
                            {kpis.filter(k => k.active).map((k) => {
                              const rawVal = (rawData as any)[k.kpi_key] ?? 0;
                              const score = row.kpiScores[k.kpi_key] ?? 0;
                              const cellColorClass = getScoreBgClass(score);
                              const editable = isCellEditable(k.kpi_key);

                              return (
                                <td key={k.kpi_key} className="py-2.5 px-1.5">
                                  <div className="flex flex-col items-center gap-1">
                                    <input
                                      type="number"
                                      step="any"
                                      min="0"
                                      disabled={!editable}
                                      value={rawVal === 0 ? "0" : rawVal}
                                      onChange={(e) => handleCellEdit(row.lineNo, k.kpi_key as any, e.target.value)}
                                      className={`w-16 text-center font-mono font-bold border rounded-md py-1 px-1 transition-all text-xs outline-none ${
                                        editable
                                          ? "bg-slate-50 dark:bg-neutral-950 border-slate-200 dark:border-neutral-800 text-slate-800 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                                          : "bg-slate-100 dark:bg-neutral-900 border-slate-200/50 dark:border-neutral-850 text-slate-400 dark:text-neutral-500 cursor-not-allowed opacity-50"
                                      }`}
                                      title={!editable ? `Restricted to authorized Data Entry staff in ${getKpiAllowedDepartment(k.kpi_key)} department` : ""}
                                    />
                                    <span className={`text-[8px] px-1 py-0.2 rounded border font-mono font-bold ${cellColorClass}`}>
                                      {score} pts
                                    </span>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Save button and actions footer */}
                <div className="p-4 bg-slate-50/50 dark:bg-neutral-950/30 border-t border-slate-100 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-[11px] text-slate-500 dark:text-neutral-400 font-medium">
                    * All entries are auto-cached locally. Click "Save to Database" to sync permanently with Cloud Run MES servers.
                  </span>
                  <button 
                    onClick={handleSaveToDatabase}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer w-full sm:w-auto"
                  >
                    {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span>{isSupabaseConfigured() ? "Sync database" : "Save changes"}</span>
                  </button>
                </div>

              </div>

              {/* Real-time score calculator preview helper */}
              <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 p-4 rounded-xl flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider">Interactive Formula Preview</h4>
                  <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
                    Weighted KPI score is calculated dynamically as: <strong className="font-mono">Score = (KPI Points / 10) × KPI Weightage</strong>. Each parameter instantly influences the visual heatmaps and leaderboards across all departments.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* SUB-TAB: PERFORMANCE HEATMAP */}
          {activeTab === "heatmap" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Header Action Button row */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 p-4 rounded-2xl shadow-xs">
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Dynamic KPI Evaluation & Heatmap</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Tied scores are resolved automatically with structured industrial tie-breakers (Efficiency → Volume → FPY).</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-slate-700 dark:text-white rounded-lg text-xs font-bold transition-all border border-slate-200 dark:border-neutral-700 cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Export CSV</span>
                  </button>
                  <button
                    onClick={handlePrintHeatmap}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-slate-700 dark:text-white rounded-lg text-xs font-bold transition-all border border-slate-200 dark:border-neutral-700 cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5 text-blue-500" />
                    <span>Print Report</span>
                  </button>
                </div>
              </div>

              {/* Podium Highlight at the Top */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {scoredLines.slice(0, 3).map((l, index) => {
                  const placeColors = [
                    "border-amber-400 bg-amber-500/5 text-amber-600 dark:text-amber-400",
                    "border-slate-300 bg-slate-300/5 text-slate-600 dark:text-slate-300",
                    "border-amber-600 bg-amber-600/5 text-amber-700 dark:text-amber-500"
                  ];
                  const placeNames = ["🥇 1st Place", "🥈 2nd Place", "🥉 3rd Place"];
                  return (
                    <div key={l.lineNo} className={`p-4 rounded-2xl border ${placeColors[index]} flex items-center justify-between shadow-xs`}>
                      <div>
                        <span className="text-[10px] uppercase font-black tracking-widest block font-mono">{placeNames[index]}</span>
                        <h4 className="text-base font-black tracking-tight mt-1">{l.supervisor}</h4>
                        <span className="text-xs font-bold font-mono opacity-85">Line {l.lineNo} • Total Score: {l.totalScore}</span>
                      </div>
                      <div className="w-10 h-10 rounded-full border border-current flex items-center justify-center font-bold font-mono text-base bg-white dark:bg-neutral-900">
                        #{index + 1}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Heatmap Matrix Grid */}
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-100 dark:border-neutral-800 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1200px] printable-table">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-neutral-950/40 text-[10px] font-black text-slate-400 dark:text-neutral-500 border-b border-slate-100 dark:border-neutral-800 uppercase tracking-widest select-none">
                        <th 
                          onClick={() => handleHeatmapSort("rank")} 
                          className="py-3.5 px-4 sticky left-0 bg-white dark:bg-neutral-900 z-10 w-24 cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            Rank & Line
                            <ArrowUpDown className={`h-3 w-3 shrink-0 transition-opacity ${heatmapSortBy === "rank" ? "opacity-100 text-indigo-600 dark:text-blue-400" : "opacity-30"}`} />
                          </div>
                        </th>
                        <th 
                          onClick={() => handleHeatmapSort("supervisor")} 
                          className="py-3.5 px-3 w-36 cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            Supervisor
                            <ArrowUpDown className={`h-3 w-3 shrink-0 transition-opacity ${heatmapSortBy === "supervisor" ? "opacity-100 text-indigo-600 dark:text-blue-400" : "opacity-30"}`} />
                          </div>
                        </th>
                        {kpis.filter(k => k.active).map((k) => (
                          <th 
                            key={k.kpi_key} 
                            onClick={() => handleHeatmapSort(k.kpi_key)} 
                            className="py-3.5 px-2 text-center w-24 cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                          >
                            <div className="flex items-center justify-center gap-1">
                              {k.kpi_name}
                              <ArrowUpDown className={`h-3 w-3 shrink-0 transition-opacity ${heatmapSortBy === k.kpi_key ? "opacity-100 text-indigo-600 dark:text-blue-400" : "opacity-30"}`} />
                            </div>
                          </th>
                        ))}
                        <th 
                          onClick={() => handleHeatmapSort("totalScore")} 
                          className="py-3.5 px-3 text-right bg-indigo-50/40 dark:bg-indigo-950/20 w-28 cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                          <div className="flex items-center justify-end gap-1">
                            Total Score
                            <ArrowUpDown className={`h-3 w-3 shrink-0 transition-opacity ${heatmapSortBy === "totalScore" ? "opacity-100 text-indigo-600 dark:text-blue-400" : "opacity-30"}`} />
                          </div>
                        </th>
                        <th className="py-3.5 px-3 text-center w-28">Standing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 text-xs font-semibold">
                      {sortedHeatmapLines.map((row) => {
                        const rawData = dailyKpis[row.lineNo];
                        if (!rawData) return null;

                        const standing = getPerformanceBadge(row.totalScore);

                        return (
                          <tr key={row.lineNo} className="hover:bg-slate-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                            
                            {/* Sticky Rank & Line */}
                            <td className="py-4 px-4 sticky left-0 bg-white dark:bg-neutral-900 z-10 border-r border-slate-100 dark:border-neutral-800/80 font-mono">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-indigo-500">#{row.rank}</span>
                                <span className="text-slate-400 font-light">|</span>
                                <span className="font-black text-slate-800 dark:text-white">{row.lineNo}</span>
                              </div>
                            </td>

                            {/* Supervisor */}
                            <td className="py-4 px-3 text-slate-600 dark:text-neutral-300">
                              <div className="truncate max-w-[130px] font-bold">{row.supervisor}</div>
                            </td>

                            {/* Heatmap KPI Blocks */}
                            {kpis.filter(k => k.active).map((k) => {
                              const score = row.kpiScores[k.kpi_key] ?? 0;
                              const weighted = row.kpiWeightedScores[k.kpi_key] ?? 0;
                              const val = (rawData as any)[k.kpi_key] ?? 0;
                              const colorClass = getScoreBgClass(score);

                              return (
                                <td key={k.kpi_key} className="py-3 px-1.5">
                                  <div className={`p-2.5 rounded-lg border text-center transition-all ${colorClass} flex flex-col items-center justify-center min-h-[46px]`}>
                                    <span className="font-extrabold text-[13px] font-mono tracking-tight">
                                      {weighted} PTS
                                    </span>
                                  </div>
                                </td>
                              );
                            })}

                            {/* Total Score Column */}
                            <td className="py-4 px-3 text-right bg-indigo-50/40 dark:bg-indigo-950/20 border-l border-slate-100 dark:border-neutral-800">
                              <div className="font-mono text-sm font-black text-indigo-600 dark:text-blue-400">
                                {row.totalScore}
                              </div>
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-sans block mt-0.5">Max: 100</span>
                            </td>

                            {/* Rating Standing Badge */}
                            <td className="py-4 px-3">
                              <div className="flex justify-center">
                                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${standing.color}`}>
                                  {standing.label}
                                </span>
                              </div>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* SUB-TAB: ANALYTICS */}
          {activeTab === "analytics" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Top Summary Metrics cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 p-5 rounded-2xl shadow-xs">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Factory Inclusive Score</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">{factoryMetrics.inclusiveScore}</span>
                    <span className="text-xs font-bold text-emerald-500">{factoryMetrics.previousDayDiff}</span>
                  </div>
                  <div className="mt-3 w-full bg-slate-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${factoryMetrics.inclusiveScore >= 80 ? "bg-emerald-500" : factoryMetrics.inclusiveScore >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${factoryMetrics.inclusiveScore}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 p-5 rounded-2xl shadow-xs">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Top Performing Row</span>
                  <div className="mt-1">
                    <span className="text-base font-black text-indigo-600 dark:text-blue-400 block truncate">
                      {scoredLines[0]?.supervisor || "N/A"}
                    </span>
                    <span className="text-xs font-bold text-slate-500 font-mono">
                      Line {scoredLines[0]?.lineNo || "N/A"} • {scoredLines[0]?.totalScore || 0} pts
                    </span>
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 p-5 rounded-2xl shadow-xs">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Bottom Performing Row</span>
                  <div className="mt-1">
                    <span className="text-base font-black text-rose-500 block truncate">
                      {scoredLines[scoredLines.length - 1]?.supervisor || "N/A"}
                    </span>
                    <span className="text-xs font-bold text-slate-500 font-mono">
                      Line {scoredLines[scoredLines.length - 1]?.lineNo || "N/A"} • {scoredLines[scoredLines.length - 1]?.totalScore || 0} pts
                    </span>
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 p-5 rounded-2xl shadow-xs">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Configured KPIs</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">{kpis.length}</span>
                    <span className="text-xs font-bold text-slate-500">Master List</span>
                  </div>
                </div>

              </div>

              {/* General Factory Overall Scores Indexing */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Gauge chart */}
                <div className="lg:col-span-4 bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4">INCLUSIVE SCORES INDEX</h4>
                  
                  <div className="h-44 flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart 
                        cx="50%" 
                        cy="50%" 
                        innerRadius="70%" 
                        outerRadius="100%" 
                        barSize={15} 
                        data={gaugeData} 
                        startAngle={180} 
                        endAngle={0}
                      >
                        <RadialBar 
                          background 
                          dataKey="value" 
                          cornerRadius={10}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute text-center mt-10">
                      <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">{factoryMetrics.inclusiveScore}%</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Index Score</span>
                    </div>
                  </div>

                  <div className="text-center text-xs text-slate-500 bg-slate-50 dark:bg-neutral-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-neutral-800">
                    Average overall weight score among all registered garment lines for {selectedDate}.
                  </div>
                </div>

                {/* Score Distribution Chart */}
                <div className="lg:col-span-8 bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 p-5 rounded-2xl shadow-xs">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4">SCORE DISTRIBUTION BAR</h4>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={scoreDistribution}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} allowDecimals={false} />
                        <ChartTooltip cursor={{ fill: "transparent" }} />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                          {scoreDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Historical trends chart (Yesterday, Weekly, Monthly tab simulation) */}
              <div className="bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 p-5 rounded-2xl shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">HISTORICAL KPI SCORE TRENDS ({timeHorizon})</h4>
                    <p className="text-[10px] text-slate-400 dark:text-neutral-500 mt-0.5">Toggle and customize which KPIs are plotted on the trend line below</p>
                  </div>
                  
                  <button
                    onClick={() => setIsEditingTrendKpis(!isEditingTrendKpis)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-neutral-950 dark:hover:bg-neutral-800/80 text-slate-700 dark:text-neutral-300 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs font-bold transition-all cursor-pointer animate-pulse"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span>{isEditingTrendKpis ? "Done Selecting" : "Edit Displayed KPIs"}</span>
                  </button>
                </div>

                {/* KPI Selector Dropdown / Grid */}
                {isEditingTrendKpis && (
                  <div className="mb-5 p-4 bg-slate-50 dark:bg-neutral-950 rounded-xl border border-slate-200 dark:border-neutral-800 animate-in slide-in-from-top duration-200">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-neutral-500 block mb-2">Select KPIs to display on chart</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                      {kpis.filter(k => k.active).map((k) => {
                        const isSelected = selectedTrendKpiKeys.includes(k.kpi_key);
                        const kpiColor = KPI_COLORS[k.kpi_key] || "#6366f1";
                        return (
                          <button
                            key={k.kpi_key}
                            onClick={() => {
                              if (isSelected) {
                                if (selectedTrendKpiKeys.length > 1) {
                                  setSelectedTrendKpiKeys(selectedTrendKpiKeys.filter(key => key !== k.kpi_key));
                                }
                              } else {
                                setSelectedTrendKpiKeys([...selectedTrendKpiKeys, k.kpi_key]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-between border cursor-pointer ${
                              isSelected 
                                ? "bg-white dark:bg-neutral-900 border-indigo-200 dark:border-blue-900 text-slate-800 dark:text-neutral-200 shadow-xs" 
                                : "bg-transparent border-slate-200 dark:border-neutral-800 text-slate-400"
                            }`}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: isSelected ? kpiColor : "#d1d5db" }} />
                              <span className="truncate">{k.kpi_name}</span>
                            </span>
                            {isSelected && (
                              <Check className="h-3 w-3 text-indigo-600 dark:text-blue-400 shrink-0 ml-1" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historicalTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                      <YAxis stroke="#94A3B8" fontSize={11} domain={[70, 100]} />
                      <ChartTooltip />
                      <Legend fontSize={10} />
                      {kpis.filter(k => selectedTrendKpiKeys.includes(k.kpi_key)).map((k, idx) => {
                        const color = KPI_COLORS[k.kpi_key] || COLOR_PALETTE[idx % COLOR_PALETTE.length];
                        return (
                          <Line 
                            key={k.kpi_key}
                            type="monotone" 
                            dataKey={k.kpi_name} 
                            stroke={color} 
                            strokeWidth={idx === 0 ? 3 : 2} 
                            activeDot={idx === 0 ? { r: 8 } : { r: 4 }} 
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          )}

          {/* SUB-TAB: KPI CONFIGURATION */}
          {activeTab === "config" && (
            <div className="space-y-6 animate-in fade-in duration-200 relative">

              {/* Delete KPI Confirmation Modal */}
              {kpiToDelete && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
                  <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-neutral-800 animate-in zoom-in-95 duration-150">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-rose-500/10 text-rose-500 rounded-full shrink-0">
                        <Trash2 className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">Confirm Delete KPI</h4>
                        <p className="text-xs text-slate-500 dark:text-neutral-400 mt-2 leading-relaxed">
                          Are you sure you want to delete the KPI <span className="font-bold text-slate-800 dark:text-white">"{kpiToDelete.kpi_name}"</span>? 
                          This will remove this metric from the tracking matrix, and overall composite scores for all production rows will be dynamically recalculated immediately.
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setKpiToDelete(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 font-bold rounded-lg text-xs transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={confirmRemoveKpi}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition-all cursor-pointer"
                      >
                        Confirm Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-100 dark:border-neutral-800 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-950/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">KPI Rules Master Configuration</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Customize thresholds and points weightages. Changes are automatically updated for all scoring cells.</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddForm(!showAddForm)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{showAddForm ? "Hide Form" : "Add KPI"}</span>
                    </button>
                    <button
                      onClick={saveKpiMasterToDatabase}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      <span>Apply Guidelines</span>
                    </button>
                  </div>
                </div>

                {/* Undo Deletion Banner */}
                {lastDeletedKpi && (
                  <div className="m-4 p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100/60 dark:border-indigo-900/50 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-200 text-xs">
                      <span className="flex h-2 w-2 rounded-full bg-indigo-500"></span>
                      <span>
                        KPI <span className="font-bold text-indigo-600 dark:text-indigo-400">"{lastDeletedKpi.kpi_name}"</span> has been removed.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleUndoDelete}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-black rounded-lg text-[10px] uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                    >
                      Undo Delete
                    </button>
                  </div>
                )}

                {/* Add KPI Form Panel */}
                {showAddForm && (
                  <div className="p-4 border-b border-slate-100 dark:border-neutral-800 bg-slate-50/40 dark:bg-neutral-950/20 animate-in slide-in-from-top duration-200">
                    <h4 className="text-xs font-black text-indigo-600 dark:text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Plus className="h-4 w-4" />
                      <span>Create New KPI Metric Rule</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                      {/* Name */}
                      <div className="lg:col-span-2">
                        <label className="block text-[10px] uppercase font-black text-slate-400 dark:text-neutral-500 mb-1">KPI Metric Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Needle Breakage"
                          value={newKpiName}
                          onChange={(e) => setNewKpiName(e.target.value)}
                          className="w-full bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg py-1.5 px-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                        />
                      </div>

                      {/* Target */}
                      <div>
                        <label className="block text-[10px] uppercase font-black text-slate-400 dark:text-neutral-500 mb-1">Target Value</label>
                        <input
                          type="number"
                          step="any"
                          value={newKpiTarget}
                          onChange={(e) => setNewKpiTarget(parseFloat(e.target.value) || 0)}
                          className="w-full bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg py-1.5 px-3 text-xs font-mono font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                        />
                      </div>

                      {/* Unit */}
                      <div>
                        <label className="block text-[10px] uppercase font-black text-slate-400 dark:text-neutral-500 mb-1">Unit (e.g. %, pcs)</label>
                        <input
                          type="text"
                          placeholder="%"
                          value={newKpiUnit}
                          onChange={(e) => setNewKpiUnit(e.target.value)}
                          className="w-full bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg py-1.5 px-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                        />
                      </div>

                      {/* Weight */}
                      <div>
                        <label className="block text-[10px] uppercase font-black text-slate-400 dark:text-neutral-500 mb-1">Weightage Points</label>
                        <input
                          type="number"
                          value={newKpiWeight}
                          onChange={(e) => setNewKpiWeight(parseInt(e.target.value, 10) || 0)}
                          className="w-full bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg py-1.5 px-3 text-xs font-mono font-bold text-indigo-600 dark:text-blue-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                        />
                      </div>

                      {/* Direction & Submit */}
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="block text-[10px] uppercase font-black text-slate-400 dark:text-neutral-500 mb-1">Direction</label>
                          <select
                            value={newKpiDirection}
                            onChange={(e) => setNewKpiDirection(e.target.value as any)}
                            className="w-full bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg py-1.5 px-2 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                          >
                            <option value="higher">Higher is Better</option>
                            <option value="lower">Lower is Better</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddKpiSubmit}
                          className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black transition-all cursor-pointer shadow-xs shrink-0"
                        >
                          Add KPI
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Configuration form grid */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-neutral-950/40 text-[10px] font-black text-slate-400 dark:text-neutral-500 border-b border-slate-100 dark:border-neutral-800 uppercase tracking-widest">
                        <th className="py-3 px-4">KPI Metric Name</th>
                        <th className="py-3 px-3">Target</th>
                        <th className="py-3 px-3">Weight (Points)</th>
                        <th className="py-3 px-3">Score 10 Rule Limit</th>
                        <th className="py-3 px-3">Score 8 Rule Limit</th>
                        <th className="py-3 px-3">Score 5 Rule Limit</th>
                        <th className="py-3 px-3">Direction</th>
                        <th className="py-3 px-3 text-center">Status</th>
                        <th className="py-3 px-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 text-xs">
                      {kpis.map((k, idx) => (
                        <tr key={k.kpi_key} className="hover:bg-slate-50/20 dark:hover:bg-neutral-850/20 transition-colors">
                          
                          {/* Name */}
                          <td className="py-3 px-4 font-black text-slate-800 dark:text-white">
                            {k.kpi_name}
                          </td>

                          {/* Target */}
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              step="any"
                              value={k.target}
                              onChange={(e) => handleKpiMasterEdit(idx, "target", parseFloat(e.target.value) || 0)}
                              className="w-16 font-mono font-bold bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded py-1 px-1.5 text-center text-slate-800 dark:text-white outline-none"
                            />
                            <span className="text-[10px] text-slate-400 font-mono ml-1">{k.unit}</span>
                          </td>

                          {/* Weight */}
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              value={k.weightage}
                              onChange={(e) => handleKpiMasterEdit(idx, "weightage", parseInt(e.target.value, 10) || 0)}
                              className="w-16 font-mono font-bold bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded py-1 px-1.5 text-center text-indigo-600 dark:text-blue-400 outline-none"
                            />
                          </td>

                          {/* Score 10 Limit */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400 font-mono font-bold">{k.is_smaller_better ? "<=" : ">="}</span>
                              <input
                                type="number"
                                step="any"
                                value={k.score_10_limit}
                                onChange={(e) => handleKpiMasterEdit(idx, "score_10_limit", parseFloat(e.target.value) || 0)}
                                className="w-16 font-mono font-bold bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded py-1 px-1.5 text-center text-slate-800 dark:text-white outline-none"
                              />
                            </div>
                          </td>

                          {/* Score 8 Limit */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400 font-mono font-bold">{k.is_smaller_better ? "<=" : ">="}</span>
                              <input
                                type="number"
                                step="any"
                                value={k.score_8_limit}
                                onChange={(e) => handleKpiMasterEdit(idx, "score_8_limit", parseFloat(e.target.value) || 0)}
                                className="w-16 font-mono font-bold bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded py-1 px-1.5 text-center text-slate-800 dark:text-white outline-none"
                              />
                            </div>
                          </td>

                          {/* Score 5 Limit */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400 font-mono font-bold">{k.is_smaller_better ? "<=" : ">="}</span>
                              <input
                                type="number"
                                step="any"
                                value={k.score_5_limit}
                                onChange={(e) => handleKpiMasterEdit(idx, "score_5_limit", parseFloat(e.target.value) || 0)}
                                className="w-16 font-mono font-bold bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded py-1 px-1.5 text-center text-slate-800 dark:text-white outline-none"
                              />
                            </div>
                          </td>

                          {/* Smaller / Larger better */}
                          <td className="py-3 px-3">
                            <button
                              type="button"
                              onClick={() => handleKpiMasterEdit(idx, "is_smaller_better", !k.is_smaller_better)}
                              className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border cursor-pointer ${
                                k.is_smaller_better 
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20" 
                                  : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              }`}
                            >
                              {k.is_smaller_better ? "Lower is Better" : "Higher is Better"}
                            </button>
                          </td>

                           {/* Active Toggle */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleKpiMasterEdit(idx, "active", !k.active)}
                              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all mx-auto cursor-pointer ${
                                k.active 
                                  ? "bg-indigo-600 border-indigo-600 text-white" 
                                  : "border-slate-300 dark:border-neutral-700 bg-transparent text-transparent"
                              }`}
                            >
                              <Check className="h-3 w-3 stroke-[3]" />
                            </button>
                          </td>

                          {/* Actions column (Remove button) */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveKpi(k.kpi_key)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 rounded-md transition-all cursor-pointer mx-auto block"
                              title="Remove KPI"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Weights checking */}
                <div className="p-4 border-t border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950/20 flex justify-between items-center text-xs font-bold font-mono">
                  <span className="text-slate-500">Cumulative Weight Sum (Active KPIs):</span>
                  <span className={`text-sm font-black ${kpis.filter(k => k.active).reduce((acc, c) => acc + c.weightage, 0) === 100 ? "text-emerald-500" : "text-amber-500"}`}>
                    {kpis.filter(k => k.active).reduce((acc, c) => acc + c.weightage, 0)} / 100
                  </span>
                </div>
              </div>

            </div>
          )}
        </>
      )}

    </div>
  );
}
