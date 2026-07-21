import React, { useState, useEffect } from "react";
import { 
  Target, 
  Package, 
  Percent, 
  Gauge, 
  Play, 
  Pause, 
  Users, 
  UserCheck,
  TrendingUp,
  TrendingDown,
  Edit2,
  Check,
  X
} from "lucide-react";
import { FactoryMetrics, ProductionLine } from "../types";

interface KpiGridProps {
  metrics: FactoryMetrics;
  lines?: ProductionLine[];
  onUpdateTarget?: (target: number) => void;
  onUpdateWorkers?: (workers: number) => void;
}

export default function KpiGrid({ metrics, lines = [], onUpdateTarget, onUpdateWorkers }: KpiGridProps) {
  const [editingTarget, setEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState(metrics.shiftTarget.toString());
  const [editingOperators, setEditingOperators] = useState(false);
  const [tempOperators, setTempOperators] = useState(metrics.totalWorkers.toString());

  useEffect(() => {
    setTempTarget(metrics.shiftTarget.toString());
  }, [metrics.shiftTarget]);

  useEffect(() => {
    setTempOperators(metrics.totalWorkers.toString());
  }, [metrics.totalWorkers]);

  // Calculate dynamic percentage comparisons vs Yesterday baseline values
  const targetYesterday = 1650;
  const targetDiff = metrics.shiftTarget - targetYesterday;
  const targetPercent = targetYesterday > 0 ? parseFloat(((targetDiff / targetYesterday) * 100).toFixed(1)) : 0;
  const targetSign = targetPercent >= 0 ? "+" : "";

  const productionYesterday = 720;
  const prodDiff = metrics.shiftOutput - productionYesterday;
  const prodPercent = productionYesterday > 0 ? parseFloat(((prodDiff / productionYesterday) * 100).toFixed(1)) : 0;
  const prodSign = prodPercent >= 0 ? "+" : "";

  const achievementYesterday = 43.7;
  const achDiff = metrics.shiftAchievement - achievementYesterday;
  const achPercent = achievementYesterday > 0 ? parseFloat(((achDiff / achievementYesterday) * 100).toFixed(1)) : 0;
  const achSign = achPercent >= 0 ? "+" : "";

  const efficiencyYesterday = 43.9;
  const effDiff = metrics.currentEfficiency - efficiencyYesterday;
  const effPercent = efficiencyYesterday > 0 ? parseFloat(((effDiff / efficiencyYesterday) * 100).toFixed(1)) : 0;
  const effSign = effPercent >= 0 ? "+" : "";

  const runningYesterday = 1;
  const runningDiff = metrics.runningLines - runningYesterday;
  const runningSign = runningDiff >= 0 ? "+" : "";

  const idleYesterday = 1;
  const idleDiff = metrics.idleLines - idleYesterday;
  const idleSign = idleDiff >= 0 ? "+" : "";

  const operatorsYesterday = 324;
  const optDiff = metrics.totalWorkers - operatorsYesterday;
  const optSign = optDiff >= 0 ? "+" : "";

  const supervisorsYesterday = 1;
  const supDiff = metrics.runningLines - supervisorsYesterday;
  const supSign = supDiff >= 0 ? "+" : "";

  const kpis = [
    {
      id: "kpi-target",
      title: "Today's Target",
      value: `${metrics.shiftTarget.toLocaleString()} Pcs`,
      icon: Target,
      iconColor: "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30",
      trend: "Vs Yesterday",
      change: `${targetSign}${targetPercent}%`,
      isPositive: targetPercent >= 0,
    },
    {
      id: "kpi-production",
      title: "Today's Production",
      value: `${metrics.shiftOutput.toLocaleString()} Pcs`,
      icon: Package,
      iconColor: "text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/30",
      trend: "Vs Yesterday",
      change: `${prodSign}${prodPercent}%`,
      isPositive: prodPercent >= 0,
    },
    {
      id: "kpi-achievement",
      title: "Achievement",
      value: `${metrics.shiftAchievement}%`,
      icon: Percent,
      iconColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30",
      trend: "Vs Yesterday",
      change: `${achSign}${achPercent}%`,
      isPositive: achPercent >= 0,
    },
    {
      id: "kpi-efficiency",
      title: "Current Efficiency",
      value: `${metrics.currentEfficiency}%`,
      icon: Gauge,
      iconColor: "text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/30",
      trend: "Vs Yesterday",
      change: `${effSign}${effPercent}%`,
      isPositive: effPercent >= 0,
    },
    {
      id: "kpi-running",
      title: "Running Lines",
      value: `${metrics.runningLines} / ${lines.length}`,
      icon: Play,
      iconColor: "text-emerald-500 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30",
      trend: "Vs Yesterday",
      change: `${runningSign}${runningDiff}`,
      isPositive: runningDiff >= 0,
    },
    {
      id: "kpi-idle",
      title: "Idle Lines",
      value: `${metrics.idleLines} / ${lines.length}`,
      icon: Pause,
      iconColor: "text-amber-500 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/30",
      trend: "Vs Yesterday",
      change: `${idleDiff <= 0 ? "-" : "+"}${Math.abs(idleDiff)}`,
      isPositive: idleDiff <= 0,
    },
    {
      id: "kpi-operators",
      title: "Total Operators",
      value: `${metrics.totalWorkers.toLocaleString()}`,
      icon: Users,
      iconColor: "text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30",
      trend: "Vs Yesterday",
      change: `${optSign}${optDiff}`,
      isPositive: optDiff >= 0,
    },
    {
      id: "kpi-supervisors",
      title: "Active Supervisors",
      value: `${metrics.runningLines}`,
      icon: UserCheck,
      iconColor: "text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-neutral-800 border border-slate-100 dark:border-neutral-700",
      trend: "Vs Yesterday",
      change: `${supSign}${supDiff}`,
      isPositive: supDiff >= 0,
    },
  ];

  return (
    <div 
      id="prodexa-kpi-grid"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
    >
      {kpis.map((kpi) => {
        const IconComponent = kpi.icon;
        return (
          <div
            id={kpi.id}
            key={kpi.id}
            className="bg-white dark:bg-neutral-900 p-6 rounded-xl border border-slate-100 dark:border-neutral-850 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs text-slate-500 dark:text-neutral-400 font-bold tracking-tight uppercase">
                {kpi.title}
              </span>
              <div className={`p-1.5 rounded-lg flex-shrink-0 ${kpi.iconColor}`}>
                <IconComponent className="h-4.5 w-4.5" />
              </div>
            </div>

            {/* Metric Value */}
            <div className="flex items-end justify-between gap-2 my-2 min-h-[38px]">
              {kpi.id === "kpi-target" && editingTarget ? (
                <div className="flex items-center gap-1.5 w-full">
                  <input
                    type="number"
                    value={tempTarget}
                    onChange={(e) => setTempTarget(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = parseInt(tempTarget, 10);
                        if (!isNaN(val) && val >= 0) {
                          onUpdateTarget?.(val);
                          setEditingTarget(false);
                        }
                      } else if (e.key === "Escape") {
                        setTempTarget(metrics.shiftTarget.toString());
                        setEditingTarget(false);
                      }
                    }}
                    className="w-full text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-neutral-850 focus:ring-2 focus:ring-blue-500/20 py-1.5 px-2 bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-white outline-none"
                    placeholder="Target"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      const val = parseInt(tempTarget, 10);
                      if (!isNaN(val) && val >= 0) {
                        onUpdateTarget?.(val);
                        setEditingTarget(false);
                      }
                    }}
                    className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md cursor-pointer transition-colors"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setTempTarget(metrics.shiftTarget.toString());
                      setEditingTarget(false);
                    }}
                    className="p-1.5 bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 rounded-md cursor-pointer hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : kpi.id === "kpi-operators" && editingOperators ? (
                <div className="flex items-center gap-1.5 w-full">
                  <input
                    type="number"
                    value={tempOperators}
                    onChange={(e) => setTempOperators(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = parseInt(tempOperators, 10);
                        if (!isNaN(val) && val >= 0) {
                          onUpdateWorkers?.(val);
                          setEditingOperators(false);
                        }
                      } else if (e.key === "Escape") {
                        setTempOperators(metrics.totalWorkers.toString());
                        setEditingOperators(false);
                      }
                    }}
                    className="w-full text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-neutral-850 focus:ring-2 focus:ring-blue-500/20 py-1.5 px-2 bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-white outline-none"
                    placeholder="Workers"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      const val = parseInt(tempOperators, 10);
                      if (!isNaN(val) && val >= 0) {
                        onUpdateWorkers?.(val);
                        setEditingOperators(false);
                      }
                    }}
                    className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md cursor-pointer transition-colors"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setTempOperators(metrics.totalWorkers.toString());
                      setEditingOperators(false);
                    }}
                    className="p-1.5 bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 rounded-md cursor-pointer hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight font-mono flex items-center gap-1.5 group">
                    {kpi.value}
                    {(kpi.id === "kpi-target" || kpi.id === "kpi-operators") && (
                      <button
                        onClick={() => {
                          if (kpi.id === "kpi-target") {
                            setTempTarget(metrics.shiftTarget.toString());
                            setEditingTarget(true);
                          } else {
                            setTempOperators(metrics.totalWorkers.toString());
                            setEditingOperators(true);
                          }
                        }}
                        className="opacity-40 hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-all cursor-pointer"
                        title={`Edit ${kpi.title}`}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </span>
                </>
              )}
            </div>


          </div>
        );
      })}
    </div>
  );
}
