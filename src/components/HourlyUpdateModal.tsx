import React, { useState, useEffect } from "react";
import { X, Clock, Check, RefreshCw, AlertCircle, Sparkles, Plus, Trash2 } from "lucide-react";
import { ProductionLine, OvertimeLog } from "../types";
import { getHourlyLabels } from "../utils/timeUtils";

interface HourlyUpdateModalProps {
  lines: ProductionLine[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateLine: (updated: ProductionLine) => void;
  onAddActivityLog: (message: string, type: "success" | "warning" | "error" | "info") => void;
}

const DEFAULT_OT_SLOTS = [
  "6 PM",
  "7 PM",
  "8 PM",
  "9 PM",
  "10 PM"
];

export default function HourlyUpdateModal({
  lines,
  isOpen,
  onClose,
  onUpdateLine,
  onAddActivityLog
}: HourlyUpdateModalProps) {
  const HOURS = getHourlyLabels();
  const [selectedLineNo, setSelectedLineNo] = useState<string>(lines[0]?.lineNo || "");
  const [selectedHourIndex, setSelectedHourIndex] = useState<number>(0);
  const [piecesInput, setPiecesInput] = useState<string>("");
  
  // Overtime states
  const [isOvertime, setIsOvertime] = useState<boolean>(false);
  const [selectedOtTime, setSelectedOtTime] = useState<string>("6 PM");
  const [customOtTime, setCustomOtTime] = useState<string>("");

  const selectedLine = lines.find((l) => l.lineNo === selectedLineNo);

  // Auto-load values when selection changes
  useEffect(() => {
    if (selectedLine) {
      if (isOvertime) {
        const timeSlot = selectedOtTime === "Custom" ? customOtTime : selectedOtTime;
        const existing = selectedLine.otLog?.find(o => o.time.toUpperCase() === timeSlot.toUpperCase());
        setPiecesInput(existing ? existing.pieces.toString() : "0");
      } else {
        const currentValue = selectedLine.hourlyLog[selectedHourIndex] ?? 0;
        setPiecesInput(currentValue.toString());
      }
    }
  }, [selectedLineNo, selectedHourIndex, isOvertime, selectedOtTime, customOtTime, lines]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!selectedLine) return;

    const newPieces = parseInt(piecesInput, 10);
    if (isNaN(newPieces) || newPieces < 0) {
      alert("Please enter a valid non-negative number of pieces.");
      return;
    }

    let updatedHourlyLog = [...selectedLine.hourlyLog];
    let updatedOtLog = [...(selectedLine.otLog || [])];
    let logMessage = "";

    if (isOvertime) {
      const timeSlot = selectedOtTime === "Custom" ? customOtTime.trim() : selectedOtTime;
      if (!timeSlot) {
        alert("Please specify a valid Overtime hour slot.");
        return;
      }

      // Check if this OT slot is already logged. If yes, update it. If not, add it.
      const existingIdx = updatedOtLog.findIndex(o => o.time.toUpperCase() === timeSlot.toUpperCase());
      if (existingIdx >= 0) {
        updatedOtLog[existingIdx].pieces = newPieces;
      } else {
        updatedOtLog.push({ time: timeSlot, pieces: newPieces });
      }
      logMessage = `Supervisor ${selectedLine.supervisor} added/updated Line ${selectedLine.lineNo}'s OT slot (${timeSlot}) with ${newPieces} Pcs.`;
    } else {
      updatedHourlyLog[selectedHourIndex] = newPieces;
      logMessage = `Supervisor ${selectedLine.supervisor} updated Line ${selectedLine.lineNo}'s ${HOURS[selectedHourIndex]} output to ${newPieces} Pcs.`;
    }

    // Calculate total production (Standard + Overtime)
    const standardSum = updatedHourlyLog.reduce((sum, val) => sum + val, 0);
    const otSum = updatedOtLog.reduce((sum, val) => sum + val.pieces, 0);
    const newProductionPcs = standardSum + otSum;

    const updatedLine: ProductionLine = {
      ...selectedLine,
      hourlyLog: updatedHourlyLog,
      otLog: updatedOtLog,
      currentProductionPcs: newProductionPcs,
      currentHourPcs: newPieces, // Representative output for current selected log action
      balancePcs: Math.max(0, selectedLine.targetPcs - newProductionPcs),
      efficiency: selectedLine.targetPcs > 0 ? parseFloat(((newProductionPcs / selectedLine.targetPcs) * 100).toFixed(2)) : 0,
      lastUpdated: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };

    onUpdateLine(updatedLine);
    onAddActivityLog(logMessage + ` (Total Cumulative: ${newProductionPcs} Pcs).`, "success");
    onClose();
  };

  const handleRemoveOtLog = (indexToRemove: number) => {
    if (!selectedLine) return;
    const currentOtLogs = selectedLine.otLog || [];
    const targetOt = currentOtLogs[indexToRemove];
    const updatedOtLog = currentOtLogs.filter((_, idx) => idx !== indexToRemove);

    // Recalculate
    const standardSum = selectedLine.hourlyLog.reduce((sum, val) => sum + val, 0);
    const otSum = updatedOtLog.reduce((sum, val) => sum + val.pieces, 0);
    const newProductionPcs = standardSum + otSum;

    const updatedLine: ProductionLine = {
      ...selectedLine,
      otLog: updatedOtLog,
      currentProductionPcs: newProductionPcs,
      balancePcs: Math.max(0, selectedLine.targetPcs - newProductionPcs),
      efficiency: selectedLine.targetPcs > 0 ? parseFloat(((newProductionPcs / selectedLine.targetPcs) * 100).toFixed(2)) : 0,
      lastUpdated: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };

    onUpdateLine(updatedLine);
    onAddActivityLog(`Supervisor ${selectedLine.supervisor} removed Overtime log (${targetOt.time}) from Line ${selectedLine.lineNo}.`, "info");
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div 
        id="hourly-update-modal-panel"
        className="bg-white dark:bg-neutral-900 rounded-xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 dark:border-neutral-800 flex flex-col transition-colors duration-200"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-neutral-850 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
              <Clock className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-tight">
                Log Hourly & Overtime (OT)
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-neutral-500 font-bold uppercase">Supervisor Operations Console</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Form */}
        <div className="p-6 space-y-4">
          {/* Select Line */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase mb-1.5">Select Sewing Line</label>
            <select
              value={selectedLineNo}
              onChange={(e) => setSelectedLineNo(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-neutral-800 focus:ring-2 focus:ring-blue-500/20 py-2 px-3 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 font-bold focus:outline-none"
            >
              {lines.map((l) => (
                <option key={l.lineNo} value={l.lineNo}>
                  Line {l.lineNo} ({l.supervisor})
                </option>
              ))}
            </select>
          </div>

          {/* Line Info Display */}
          {selectedLine && (
            <div className="p-3 bg-slate-50 dark:bg-neutral-950/60 rounded-lg border border-slate-100 dark:border-neutral-850 space-y-2 text-xs">
              <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-400">
                <span>Active Target Style</span>
                <span className="font-mono">{selectedLine.style}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-neutral-400">
                <span>Buyer:</span>
                <span className="font-bold text-slate-800 dark:text-neutral-200">{selectedLine.buyer}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-neutral-400">
                <span>Shift Target:</span>
                <span className="font-bold text-slate-800 dark:text-neutral-200 font-mono">{selectedLine.targetPcs} Pcs</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-neutral-400">
                <span>Cumulative Production:</span>
                <span className="font-bold text-slate-800 dark:text-neutral-200 font-mono">{selectedLine.currentProductionPcs} Pcs</span>
              </div>
            </div>
          )}

          {/* Overtime (OT) Toggle Option Switch */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-neutral-950/60 rounded-lg border border-slate-100 dark:border-neutral-850">
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-neutral-300 block">Overtime (OT) Mode</span>
              <span className="text-[10px] text-slate-400">Enable this to log OT hours and add custom times</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOvertime(!isOvertime)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                isOvertime ? "bg-amber-500" : "bg-slate-200 dark:bg-neutral-800"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isOvertime ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Hour & Input Controls */}
          <div className="grid grid-cols-2 gap-4">
            {!isOvertime ? (
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase mb-1.5">Standard Hour Slot</label>
                <select
                  value={selectedHourIndex}
                  onChange={(e) => setSelectedHourIndex(parseInt(e.target.value, 10))}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-neutral-800 focus:ring-2 focus:ring-blue-500/20 py-2 px-3 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 font-bold focus:outline-none"
                >
                  {HOURS.map((hr, idx) => (
                    <option key={idx} value={idx}>
                      {hr}
                    </option>
                  ))}
                </select>
                {selectedLine && (
                  <div className="mt-2 space-y-1 text-[10px] bg-slate-50 dark:bg-neutral-950/40 p-2 rounded border border-slate-150 dark:border-neutral-800 font-semibold text-slate-600 dark:text-neutral-400">
                    <div className="flex justify-between items-center">
                      <span>Hourly Target:</span>
                      <span className="font-mono font-extrabold text-slate-800 dark:text-neutral-200">
                        {selectedLine.hourlyTargetLog?.[selectedHourIndex] ?? Math.round(selectedLine.targetPcs / 10)} Pcs
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Projected Hourly Eff:</span>
                      {(() => {
                        const target = selectedLine.hourlyTargetLog?.[selectedHourIndex] ?? Math.round(selectedLine.targetPcs / 10);
                        const actual = parseInt(piecesInput, 10) || 0;
                        const eff = target > 0 ? Math.round((actual / target) * 100) : 0;
                        let textClass = "text-slate-500";
                        if (eff >= 85) textClass = "text-emerald-500";
                        else if (eff >= 65) textClass = "text-amber-500";
                        else if (eff > 0) textClass = "text-red-500";
                        return <span className={`font-mono font-extrabold ${textClass}`}>{eff}%</span>;
                      })()}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase mb-1.5">Overtime Hour (OT)</label>
                <select
                  value={selectedOtTime}
                  onChange={(e) => setSelectedOtTime(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-neutral-800 focus:ring-2 focus:ring-blue-500/20 py-2 px-3 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 font-bold focus:outline-none"
                >
                  {DEFAULT_OT_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot} (OT)
                    </option>
                  ))}
                  <option value="Custom">Custom OT Hour...</option>
                </select>

                {selectedOtTime === "Custom" && (
                  <input
                    type="text"
                    value={customOtTime}
                    onChange={(e) => setCustomOtTime(e.target.value)}
                    placeholder="e.g., 11 PM"
                    className="w-full mt-2 text-xs rounded-lg border border-slate-200 dark:border-neutral-800 focus:ring-2 focus:ring-blue-500/20 py-1.5 px-3 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 font-bold focus:outline-none"
                  />
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase mb-1.5">
                {isOvertime ? "OT Pieces Produced" : "Pieces Produced"}
              </label>
              <input
                type="number"
                min="0"
                value={piecesInput}
                onChange={(e) => setPiecesInput(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 dark:border-neutral-800 focus:ring-2 focus:ring-blue-500/20 py-2 px-3 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 font-mono font-bold focus:outline-none"
                placeholder="0"
              />
            </div>
          </div>

          {/* Overtime list display within form for transparency and live edits */}
          {selectedLine && selectedLine.otLog && selectedLine.otLog.length > 0 && (
            <div className="p-3.5 bg-amber-50/20 dark:bg-amber-950/10 border border-amber-250/20 rounded-xl space-y-2">
              <span className="block text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Logged Overtime (OT) Sessions for Line {selectedLine.lineNo}
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedLine.otLog.map((ot, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-2 bg-white dark:bg-neutral-800 border border-amber-200/50 dark:border-neutral-750 px-3 py-1 rounded-full text-xs font-bold shadow-xs transition-all hover:border-amber-400"
                  >
                    <span className="text-slate-700 dark:text-neutral-300">{ot.time}:</span>
                    <span className="text-amber-600 dark:text-amber-400 font-mono font-extrabold">{ot.pieces} Pcs</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveOtLog(idx)}
                      className="text-red-500 hover:text-red-700 font-extrabold flex items-center justify-center p-0.5 hover:scale-110 transition-transform cursor-pointer"
                      title="Remove Overtime Log"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-2.5 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100/30 dark:border-blue-900/20 rounded-lg text-[11px] text-blue-800 dark:text-blue-300 font-semibold flex items-start gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <span>Overtime (OT) outputs are automatically compounded into the daily shift yield, efficiency, and balance metrics.</span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-slate-100 dark:border-neutral-850 flex gap-3 bg-slate-50/20 dark:bg-neutral-950/40">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-xs font-bold border border-slate-200 dark:border-neutral-850 text-slate-600 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1 shadow-sm shadow-blue-600/10"
          >
            <Check className="h-4 w-4" /> Save Hour Log
          </button>
        </div>
      </div>
    </div>
  );
}
