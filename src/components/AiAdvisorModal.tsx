import React, { useState } from "react";
import { 
  X, 
  User, 
  FileText, 
  Target, 
  Activity, 
  AlertTriangle, 
  Check, 
  Clock,
  Wrench,
  TrendingUp,
  FileSpreadsheet
} from "lucide-react";
import { ProductionLine, LineStatus, FactoryMetrics } from "../types";
import { buyersList, stylesList, supervisorsList } from "../mockData";
import { getHourlyLabels } from "../utils/timeUtils";

interface AiAdvisorModalProps {
  line: ProductionLine;
  factoryOverview: FactoryMetrics;
  onClose: () => void;
  onSaveLine: (updated: ProductionLine) => void;
  onAddActivityLog: (message: string, type: "success" | "warning" | "error" | "info") => void;
  buyersList?: string[];
  stylesList?: string[];
  supervisorsList?: { name: string; avatar: string }[];
}

export default function AiAdvisorModal({
  line,
  factoryOverview,
  onClose,
  onSaveLine,
  onAddActivityLog,
  buyersList: propBuyersList,
  stylesList: propStylesList,
  supervisorsList: propSupervisorsList
}: AiAdvisorModalProps) {
  const HOURS = getHourlyLabels();
  const activeBuyersList = propBuyersList || buyersList;
  const activeStylesList = propStylesList || stylesList;
  const activeSupervisorsList = propSupervisorsList || supervisorsList;
  // Config form states
  const [supervisor, setSupervisor] = useState(line.supervisor);
  const [buyer, setBuyer] = useState(line.buyer);
  const [style, setStyle] = useState(line.style);
  const [targetPcs, setTargetPcs] = useState(line.targetPcs);
  const [status, setStatus] = useState<LineStatus>(line.status);
  const [breakdownReason, setBreakdownReason] = useState("");
  
  // Hourly logs states
  const [hourlyLog, setHourlyLog] = useState<number[]>(line.hourlyLog || Array(10).fill(0));
  const [hourlyTargetLog, setHourlyTargetLog] = useState<number[]>(() => {
    if (line.hourlyTargetLog && line.hourlyTargetLog.length === 10) {
      return [...line.hourlyTargetLog];
    }
    const defaultTarget = Math.round(line.targetPcs / 10) || 0;
    return Array(10).fill(defaultTarget);
  });

  // Calculated values on the fly
  const currentProduction = hourlyLog.reduce((sum, v) => sum + v, 0);
  const efficiency = targetPcs > 0 ? parseFloat(((currentProduction / targetPcs) * 100).toFixed(2)) : 0;
  const balancePcs = Math.max(0, targetPcs - currentProduction);

  const handleSave = () => {
    let finalHourlyTargetLog = [...hourlyTargetLog];
    // Auto-populate if targets are all empty and targetPcs is set
    const sumTargets = finalHourlyTargetLog.reduce((sum, v) => sum + v, 0);
    if (sumTargets === 0 && targetPcs > 0) {
      finalHourlyTargetLog = Array(10).fill(Math.round(targetPcs / 10));
    }

    const updatedLine: ProductionLine = {
      ...line,
      supervisor,
      supervisorAvatar: activeSupervisorsList.find(s => s.name === supervisor)?.avatar || line.supervisorAvatar,
      buyer,
      style,
      targetPcs,
      currentProductionPcs: currentProduction,
      currentHourPcs: hourlyLog[hourlyLog.length - 1] || 0,
      balancePcs,
      efficiency,
      status,
      lastUpdated: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      hourlyLog,
      hourlyTargetLog: finalHourlyTargetLog
    };

    onSaveLine(updatedLine);

    // Trigger activities log if status changed
    if (status !== line.status) {
      if (status === "Breakdown") {
        onAddActivityLog(
          `Line ${line.lineNo} Breakdown reported: ${breakdownReason || "Mechanical breakdown in needle feed"}`, 
          "error"
        );
      } else if (status === "Idle") {
        onAddActivityLog(`Line ${line.lineNo} shifted to IDLE status`, "warning");
      } else {
        onAddActivityLog(`Line ${line.lineNo} returned to ACTIVE execution status`, "success");
      }
    } else {
      onAddActivityLog(`Configuration updated for Line ${line.lineNo} (Style: ${style}, Target: ${targetPcs}, Output: ${currentProduction})`, "info");
    }

    onClose();
  };

  const handleHourChange = (index: number, valStr: string) => {
    const val = parseInt(valStr, 10);
    const updated = [...hourlyLog];
    updated[index] = isNaN(val) || val < 0 ? 0 : val;
    setHourlyLog(updated);
  };

  const handleHourTargetChange = (index: number, valStr: string) => {
    const val = parseInt(valStr, 10);
    const updated = [...hourlyTargetLog];
    updated[index] = isNaN(val) || val < 0 ? 0 : val;
    setHourlyTargetLog(updated);
  };

  const handleAutoDistributeTargets = () => {
    const defaultTarget = Math.round(targetPcs / 10) || 0;
    setHourlyTargetLog(Array(10).fill(defaultTarget));
    onAddActivityLog(`Auto-distributed shift target of ${targetPcs} pieces evenly (${defaultTarget}/hour) for Line ${line.lineNo}.`, "info");
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div 
        id="line-configuration-panel"
        className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-200 dark:border-neutral-800 flex flex-col md:flex-row h-full max-h-[90vh] transition-colors duration-200"
      >
        {/* Left Hand side: Line Configuration Form */}
        <div className="p-6 md:w-1/2 border-b md:border-b-0 md:border-r border-slate-200 dark:border-neutral-800 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 px-3 py-1 rounded-xl">
                  {line.lineNo}
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-tight">Line Configuration</h3>
                  <p className="text-[10px] text-slate-400 dark:text-neutral-500 font-bold uppercase">Floor Management Control</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="md:hidden text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Supervisor */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase mb-1.5">Supervisor</label>
                <select
                  value={supervisor}
                  onChange={(e) => setSupervisor(e.target.value)}
                  className="w-full text-xs border border-slate-200 dark:border-neutral-800 rounded-xl p-2 bg-white dark:bg-neutral-900 text-slate-800 dark:text-neutral-200 font-bold outline-none focus:border-blue-500"
                >
                  {activeSupervisorsList.map(s => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Buyer */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase mb-1.5">Buyer Client</label>
                  <select
                    value={buyer}
                    onChange={(e) => setBuyer(e.target.value)}
                    className="w-full text-xs border border-slate-200 dark:border-neutral-800 rounded-xl p-2 bg-white dark:bg-neutral-900 text-slate-800 dark:text-neutral-200 font-bold outline-none focus:border-blue-500"
                  >
                    {activeBuyersList.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                {/* Style */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase mb-1.5">Style Reference</label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full text-xs border border-slate-200 dark:border-neutral-800 rounded-xl p-2 bg-white dark:bg-neutral-900 text-slate-800 dark:text-neutral-200 font-bold outline-none focus:border-blue-500"
                  >
                    {activeStylesList.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Target */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase mb-1.5">Shift Target (Pcs)</label>
                  <input
                    type="number"
                    value={targetPcs}
                    onChange={(e) => setTargetPcs(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-xs border border-slate-200 dark:border-neutral-800 rounded-xl p-2 font-mono font-bold outline-none bg-white dark:bg-neutral-900 text-slate-800 dark:text-neutral-200 focus:border-blue-500"
                  />
                </div>

                {/* Current Production (Computed/Read Only) */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase mb-1.5">Actual Output (Pcs)</label>
                  <div className="w-full text-xs border border-slate-100 dark:border-neutral-850 bg-slate-50 dark:bg-neutral-950/40 rounded-xl p-2.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                    {currentProduction.toLocaleString()} Pcs
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase mb-1.5">Operational Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Running", "Idle", "Breakdown"] as LineStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(st)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        status === st 
                          ? st === "Running" ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/40" 
                            : st === "Idle" ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800/40"
                            : "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-300 dark:border-red-800/40"
                          : "bg-white dark:bg-neutral-900 text-slate-500 dark:text-neutral-400 border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-850"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Breakdown Reason */}
              {status === "Breakdown" && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                  <label className="block text-xs font-bold text-red-500 uppercase mb-1.5 flex items-center gap-1">
                    <Wrench className="h-3.5 w-3.5" /> Incident Report Reason
                  </label>
                  <textarea
                    placeholder="Enter mechanical issue, belt failure, material blockage or operator shortage details..."
                    value={breakdownReason}
                    onChange={(e) => setBreakdownReason(e.target.value)}
                    className="w-full text-xs border border-red-200 dark:border-red-900/30 rounded-xl p-2.5 h-20 outline-none focus:border-red-500 bg-red-50/10 dark:bg-red-950/10 placeholder-slate-400 dark:placeholder-neutral-600 font-bold"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Bottom save/cancel bar */}
          <div className="flex gap-2.5 border-t border-slate-200 dark:border-neutral-800 pt-4 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-850 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm flex items-center justify-center gap-1"
            >
              <Check className="h-4 w-4" /> Save Configuration
            </button>
          </div>
        </div>

        {/* Right Hand side: Hourly Production Log Editor */}
        <div className="p-6 md:w-1/2 bg-slate-950 text-slate-100 flex flex-col justify-between overflow-y-auto">
          <div className="flex-1 flex flex-col h-full">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-white tracking-wide uppercase">
                    Hourly Output Matrix
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold">Shift Yield Log (Pcs)</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoDistributeTargets}
                  className="text-[9px] font-bold text-blue-400 hover:text-blue-300 hover:bg-blue-950 bg-blue-950/40 border border-blue-900 px-2 py-1 rounded transition-colors cursor-pointer"
                  title="Evenly distribute Shift Target among all 10 hours"
                >
                  Auto-Distribute
                </button>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold bg-slate-900/60 border border-slate-800 px-2 py-1 rounded-lg">
                  <TrendingUp className="h-3 w-3 text-emerald-400" />
                  <span>Eff: <strong className="text-white font-mono">{efficiency}%</strong></span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 font-medium mb-4">
              Configure targets and actual production for each hour. The matrix calculates hourly line efficiency automatically.
            </p>

            {/* Grid of Hourly Inputs */}
            <div className="grid grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
              {HOURS.map((hour, idx) => {
                const hTarget = hourlyTargetLog[idx] ?? 0;
                const hActual = hourlyLog[idx] ?? 0;
                const hEff = hTarget > 0 ? parseFloat(((hActual / hTarget) * 100).toFixed(1)) : 0;
                
                let effBadgeClass = "text-slate-500 bg-slate-900/40 border-slate-800/60";
                if (hEff >= 85) {
                  effBadgeClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
                } else if (hEff >= 65) {
                  effBadgeClass = "text-amber-400 bg-amber-500/10 border-amber-500/20";
                } else if (hEff > 0) {
                  effBadgeClass = "text-red-400 bg-red-500/10 border-red-500/20";
                }

                return (
                  <div 
                    key={hour}
                    className="p-3 bg-slate-900 border border-slate-800/80 rounded-xl flex flex-col gap-2 hover:border-slate-800 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
                        {hour}
                      </span>
                      {hTarget > 0 ? (
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${effBadgeClass}`}>
                          {hEff}% Eff
                        </span>
                      ) : (
                        <span className="text-[8px] text-slate-600 font-medium font-mono">No target</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <span className="text-[8px] text-slate-500 uppercase font-bold block mb-0.5">Target</span>
                        <input
                          type="number"
                          min="0"
                          value={hourlyTargetLog[idx] === 0 ? "" : hourlyTargetLog[idx]}
                          onChange={(e) => handleHourTargetChange(idx, e.target.value)}
                          placeholder={Math.round(targetPcs / 10).toString()}
                          className="w-full text-xs font-mono font-bold bg-slate-950 border border-slate-800 rounded-lg py-1 px-1.5 text-center text-slate-300 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                        />
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-500 uppercase font-bold block mb-0.5">Actual</span>
                        <input
                          type="number"
                          min="0"
                          value={hourlyLog[idx] === 0 ? "" : hourlyLog[idx]}
                          onChange={(e) => handleHourChange(idx, e.target.value)}
                          placeholder="0"
                          className="w-full text-xs font-mono font-bold bg-slate-950 border border-slate-800 rounded-lg py-1 px-1.5 text-center text-emerald-400 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footnote */}
          <div className="border-t border-slate-800 pt-3 mt-4 text-[9px] text-slate-500 flex items-center justify-between font-semibold">
            <span>Prodexa Floor Control Console</span>
            <span className="flex items-center gap-1 uppercase tracking-wider">
              <FileSpreadsheet className="h-3 w-3 text-slate-600" /> MES Registry Ledger
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
