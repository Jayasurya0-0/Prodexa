import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Layers, 
  User, 
  ShoppingBag, 
  Tag, 
  Activity, 
  Target, 
  Clock, 
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Settings,
  FileText
} from "lucide-react";
import { ProductionLine, LineStatus } from "../types";
import { supervisorsList as staticSupervisorsList } from "../mockData";
import { 
  getProductionStartTime, 
  getProductionInterval, 
  saveProductionTimeConfig, 
  getHourlyLabels 
} from "../utils/timeUtils";
import { isSupabaseConfigured, saveTimeConfigToSupabase } from "../utils/supabaseSync";


interface FactoryConfigurationProps {
  lines: ProductionLine[];
  onAddLine: (line: ProductionLine) => void;
  onUpdateLine: (line: ProductionLine) => void;
  onDeleteLine: (lineNo: string) => void;
  handleAddActivityLog: (message: string, type: "success" | "warning" | "error" | "info") => void;
  buyersList: string[];
  onUpdateBuyers: (newBuyers: string[]) => void;
  stylesList: string[];
  onUpdateStyles: (newStyles: string[]) => void;
  supervisorsList?: { name: string; avatar: string }[];
  onUpdateSupervisors?: (newSupervisors: { name: string; avatar: string }[]) => void;
}

export default function FactoryConfiguration({
  lines,
  onAddLine,
  onUpdateLine,
  onDeleteLine,
  handleAddActivityLog,
  buyersList,
  onUpdateBuyers,
  stylesList,
  onUpdateStyles,
  supervisorsList = staticSupervisorsList,
  onUpdateSupervisors
}: FactoryConfigurationProps) {
  // Mode selection: "add" or "edit"
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Global Shift Hours states
  const [globalStartTime, setGlobalStartTime] = useState(getProductionStartTime());
  const [globalInterval, setGlobalInterval] = useState(getProductionInterval());
  const [timeConfigVersion, setTimeConfigVersion] = useState(0);

  useEffect(() => {
    const handleConfigChange = () => {
      setGlobalStartTime(getProductionStartTime());
      setGlobalInterval(getProductionInterval());
      setTimeConfigVersion(v => v + 1);
    };
    window.addEventListener("mes_time_config_changed", handleConfigChange);
    return () => window.removeEventListener("mes_time_config_changed", handleConfigChange);
  }, []);

  // Form Field States
  const [lineNo, setLineNo] = useState("");
  const [supervisor, setSupervisor] = useState(supervisorsList[0]?.name || "");
  const [buyer, setBuyer] = useState(buyersList[0] || "");
  const [style, setStyle] = useState(stylesList[0] || "");
  const [targetPcs, setTargetPcs] = useState<number>(10000);
  const [currentProductionPcs, setCurrentProductionPcs] = useState<number>(0);
  const [currentHourPcs, setCurrentHourPcs] = useState<number>(0);
  const [efficiency, setEfficiency] = useState<number>(0);
  const [status, setStatus] = useState<LineStatus>("Running");
  const [hourlyLogsStr, setHourlyLogsStr] = useState<string>("0,0,0,0,0,0,0,0,0,0");
  const [breakTime, setBreakTime] = useState<string>("12:00 PM - 01:00 PM");

  // Errors & Success States
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Setup form for editing
  const handleEditSelect = (line: ProductionLine) => {
    setFormMode("edit");
    setLineNo(line.lineNo);
    setSupervisor(line.supervisor);
    setBuyer(line.buyer);
    setStyle(line.style);
    setTargetPcs(line.targetPcs);
    setCurrentProductionPcs(line.currentProductionPcs);
    setCurrentHourPcs(line.currentHourPcs);
    setEfficiency(line.efficiency);
    setStatus(line.status);
    setHourlyLogsStr(line.hourlyLog.join(","));
    setBreakTime(line.breakTime || "12:00 PM - 01:00 PM");
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // Reset Form
  const resetForm = () => {
    setFormMode("add");
    setLineNo("");
    setSupervisor(supervisorsList[0]?.name || "");
    setBuyer(buyersList[0] || "");
    setStyle(stylesList[0] || "");
    setTargetPcs(10000);
    setCurrentProductionPcs(0);
    setCurrentHourPcs(0);
    setEfficiency(0);
    setStatus("Running");
    setHourlyLogsStr("0,0,0,0,0,0,0,0,0,0");
    setBreakTime("12:00 PM - 01:00 PM");
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // Master Mappings States
  const [newBuyerName, setNewBuyerName] = useState("");
  const [newStyleCode, setNewStyleCode] = useState("");
  
  const [editingBuyerIndex, setEditingBuyerIndex] = useState<number | null>(null);
  const [editingBuyerValue, setEditingBuyerValue] = useState("");
  
  const [editingStyleIndex, setEditingStyleIndex] = useState<number | null>(null);
  const [editingStyleValue, setEditingStyleValue] = useState("");

  const [mappingError, setMappingError] = useState<string | null>(null);
  const [mappingSuccess, setMappingSuccess] = useState<string | null>(null);

  const clearMappingAlerts = () => {
    setMappingError(null);
    setMappingSuccess(null);
  };

  const handleAddBuyer = (e: React.FormEvent) => {
    e.preventDefault();
    clearMappingAlerts();
    const clean = newBuyerName.trim();
    if (!clean) {
      setMappingError("Buyer name cannot be empty.");
      return;
    }
    if (buyersList.some(b => b.toLowerCase() === clean.toLowerCase())) {
      setMappingError(`Buyer "${clean}" already exists.`);
      return;
    }
    const newList = [...buyersList, clean];
    onUpdateBuyers(newList);
    setNewBuyerName("");
    setMappingSuccess(`Buyer "${clean}" added successfully.`);
    handleAddActivityLog(`Master Data Updated: Added Buyer "${clean}".`, "info");
  };

  const handleDeleteBuyer = (index: number) => {
    clearMappingAlerts();
    const removed = buyersList[index];
    const isUsed = lines.some(l => l.buyer === removed);
    if (isUsed) {
      setMappingError(`Cannot delete Buyer "${removed}" because it is currently assigned to one or more active Sewing Lines.`);
      return;
    }
    const newList = buyersList.filter((_, i) => i !== index);
    onUpdateBuyers(newList);
    setMappingSuccess(`Buyer "${removed}" removed successfully.`);
    handleAddActivityLog(`Master Data Updated: Removed Buyer "${removed}".`, "info");
    if (editingBuyerIndex === index) {
      setEditingBuyerIndex(null);
    }
  };

  const handleStartEditBuyer = (index: number, val: string) => {
    clearMappingAlerts();
    setEditingBuyerIndex(index);
    setEditingBuyerValue(val);
  };

  const handleSaveEditBuyer = (index: number) => {
    clearMappingAlerts();
    const clean = editingBuyerValue.trim();
    if (!clean) {
      setMappingError("Buyer name cannot be empty.");
      return;
    }
    const original = buyersList[index];
    if (clean !== original && buyersList.some(b => b.toLowerCase() === clean.toLowerCase())) {
      setMappingError(`Buyer "${clean}" already exists.`);
      return;
    }
    
    const updatedBuyers = [...buyersList];
    updatedBuyers[index] = clean;
    onUpdateBuyers(updatedBuyers);
    
    // Auto sync lines in parent state if they were using the old buyer
    lines.forEach(l => {
      if (l.buyer === original) {
        onUpdateLine({ ...l, buyer: clean });
      }
    });

    setEditingBuyerIndex(null);
    setMappingSuccess(`Buyer updated from "${original}" to "${clean}".`);
    handleAddActivityLog(`Master Data Updated: Renamed Buyer "${original}" to "${clean}".`, "info");
  };

  const handleAddStyle = (e: React.FormEvent) => {
    e.preventDefault();
    clearMappingAlerts();
    const clean = newStyleCode.trim().toUpperCase();
    if (!clean) {
      setMappingError("Style code cannot be empty.");
      return;
    }
    if (stylesList.some(s => s.toLowerCase() === clean.toLowerCase())) {
      setMappingError(`Style "${clean}" already exists.`);
      return;
    }
    const newList = [...stylesList, clean];
    onUpdateStyles(newList);
    setNewStyleCode("");
    setMappingSuccess(`Style code "${clean}" added successfully.`);
    handleAddActivityLog(`Master Data Updated: Added Style Reference "${clean}".`, "info");
  };

  const handleDeleteStyle = (index: number) => {
    clearMappingAlerts();
    const removed = stylesList[index];
    const isUsed = lines.some(l => l.style === removed);
    if (isUsed) {
      setMappingError(`Cannot delete Style Code "${removed}" because it is currently assigned to one or more active Sewing Lines.`);
      return;
    }
    const newList = stylesList.filter((_, i) => i !== index);
    onUpdateStyles(newList);
    setMappingSuccess(`Style "${removed}" removed successfully.`);
    handleAddActivityLog(`Master Data Updated: Removed Style Reference "${removed}".`, "info");
    if (editingStyleIndex === index) {
      setEditingStyleIndex(null);
    }
  };

  const handleStartEditStyle = (index: number, val: string) => {
    clearMappingAlerts();
    setEditingStyleIndex(index);
    setEditingStyleValue(val);
  };

  const handleSaveEditStyle = (index: number) => {
    clearMappingAlerts();
    const clean = editingStyleValue.trim().toUpperCase();
    if (!clean) {
      setMappingError("Style code cannot be empty.");
      return;
    }
    const original = stylesList[index];
    if (clean !== original && stylesList.some(s => s.toLowerCase() === clean.toLowerCase())) {
      setMappingError(`Style "${clean}" already exists.`);
      return;
    }
    
    const updatedStyles = [...stylesList];
    updatedStyles[index] = clean;
    onUpdateStyles(updatedStyles);

    // Auto sync lines in parent state if they were using the old style code
    lines.forEach(l => {
      if (l.style === original) {
        onUpdateLine({ ...l, style: clean });
      }
    });

    setEditingStyleIndex(null);
    setMappingSuccess(`Style updated from "${original}" to "${clean}".`);
    handleAddActivityLog(`Master Data Updated: Renamed Style Code "${original}" to "${clean}".`, "info");
  };

  // Auto-calculate efficiency based on output & target if user changes them
  const handleCalculateDefaultEfficiency = () => {
    if (targetPcs > 0) {
      const calcEff = parseFloat(((currentProductionPcs / targetPcs) * 100).toFixed(1));
      setEfficiency(Math.min(100, Math.max(0, calcEff)));
      setSuccessMsg("Efficiency calculated based on current production & target.");
    } else {
      setErrorMsg("Target must be greater than 0 to calculate efficiency.");
    }
  };

  // Form Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Form Validation
    const cleanLineNo = lineNo.trim().toUpperCase();
    if (!cleanLineNo) {
      setErrorMsg("Line Number is required (e.g. L01).");
      return;
    }

    if (!cleanLineNo.match(/^L\d+$/)) {
      setErrorMsg("Line Number must match the pattern 'Lxx' (e.g., L09, L10).");
      return;
    }

    if (formMode === "add") {
      // Check for duplicates
      const exists = lines.some(l => l.lineNo.toUpperCase() === cleanLineNo);
      if (exists) {
        setErrorMsg(`Line ID '${cleanLineNo}' already exists in production database.`);
        return;
      }
    }

    if (targetPcs <= 0) {
      setErrorMsg("Shift Target must be a positive number.");
      return;
    }

    if (currentProductionPcs < 0) {
      setErrorMsg("Current Production pieces cannot be negative.");
      return;
    }

    // Parse Hourly Logs array
    const parts = hourlyLogsStr.split(",").map(p => parseInt(p.trim()) || 0);
    if (parts.length !== 10) {
      const currentLabels = getHourlyLabels();
      setErrorMsg(`Hourly Log must contain exactly 10 comma-separated numbers representing output for intervals starting from ${currentLabels[0]} to ${currentLabels[9]}.`);
      return;
    }

    // Locate Supervisor Avatar
    const matchedSupervisorObj = supervisorsList.find(s => s.name === supervisor);
    const avatarUrl = matchedSupervisorObj?.avatar || "";

    const lineData: ProductionLine = {
      lineNo: cleanLineNo,
      supervisor,
      supervisorAvatar: avatarUrl,
      buyer,
      style,
      targetPcs,
      currentProductionPcs,
      currentHourPcs,
      efficiency,
      balancePcs: Math.max(0, targetPcs - currentProductionPcs),
      status,
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hourlyLog: parts,
      breakTime: breakTime.trim() || "12:00 PM - 01:00 PM"
    };

    if (formMode === "add") {
      onAddLine(lineData);
      handleAddActivityLog(`New line '${cleanLineNo}' has been provisioned successfully under Supervisor ${supervisor}.`, "success");
      setSuccessMsg(`Line ${cleanLineNo} added successfully!`);
      resetForm();
    } else {
      onUpdateLine(lineData);
      handleAddActivityLog(`Line '${cleanLineNo}' configuration updated. Supervisor: ${supervisor}, Buyer: ${buyer}.`, "info");
      setSuccessMsg(`Line ${cleanLineNo} updated successfully!`);
      // Keep edit mode populated but show success
    }
  };

  // Delete Line Handler
  const handleDeleteClick = (line: ProductionLine) => {
    if (window.confirm(`Are you absolutely sure you want to decommission and delete ${line.lineNo}? This action is irreversible.`)) {
      onDeleteLine(line.lineNo);
      handleAddActivityLog(`Line '${line.lineNo}' decommissioned and removed from active database.`, "warning");
      setSuccessMsg(`Line ${line.lineNo} successfully deleted.`);
      if (formMode === "edit" && lineNo === line.lineNo) {
        resetForm();
      }
    }
  };

  // Filter Lines
  const filteredLines = lines.filter(l => {
    const matchesSearch = l.lineNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          l.supervisor.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          l.buyer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          l.style.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6" id="factory-config-module">
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-[#1E293B] dark:from-neutral-950 dark:to-neutral-900 rounded-2xl p-6 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-blue-500 text-white text-[10px] font-mono font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
              MES Admin Console
            </span>
            <span className="text-slate-400 text-xs font-mono">• Live Synchronized</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black font-sans tracking-tight">Factory Configuration & Line Management</h2>
          <p className="text-slate-300 text-xs md:text-sm max-w-2xl mt-1">
            Provision new sewing floor lines, modify buyer/style associations, update target allocations, or decommission lines in real-time. Changes instantly synchronize across all active supervisor consoles.
          </p>
        </div>
        <button
          onClick={resetForm}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-white border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="h-4 w-4 text-blue-400" />
          <span>Provision New Line</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Production Line List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-100 dark:border-neutral-850 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">Active Sewing Lines ({filteredLines.length})</h3>
                <p className="text-[11px] text-slate-500 font-mono">Select a line to edit its parameters</p>
              </div>
              
              {/* Quick Filters */}
              <div className="flex gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Search lines..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 sm:w-44 px-3 py-1.5 text-xs bg-slate-50 dark:bg-neutral-850 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-blue-500 text-[#0F172A] dark:text-white"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2 py-1.5 text-xs bg-slate-50 dark:bg-neutral-850 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none text-[#0F172A] dark:text-white"
                >
                  <option value="all">All Status</option>
                  <option value="Running">Running</option>
                  <option value="Idle">Idle</option>
                  <option value="Breakdown">Breakdown</option>
                </select>
              </div>
            </div>

            {/* List of Lines */}
            {filteredLines.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-100 dark:border-neutral-800 rounded-2xl">
                <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-mono">No sewing lines match the filter criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-neutral-850 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Line</th>
                      <th className="py-2.5 px-3">Supervisor</th>
                      <th className="py-2.5 px-3">Buyer & Style</th>
                      <th className="py-2.5 px-3 text-right">Target</th>
                      <th className="py-2.5 px-3 text-right">Output</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-neutral-850">
                    {filteredLines.map((line) => {
                      const efficiencyColor = line.efficiency >= 85 
                        ? "text-emerald-500" 
                        : line.efficiency >= 70 
                        ? "text-amber-500" 
                        : "text-red-500";

                      return (
                        <tr 
                          key={line.lineNo}
                          className={`group hover:bg-slate-50/70 dark:hover:bg-neutral-850/40 transition-colors text-xs ${
                            formMode === "edit" && lineNo === line.lineNo ? "bg-blue-50/30 dark:bg-blue-950/10" : ""
                          }`}
                        >
                          {/* Line No */}
                          <td className="py-3 px-3 font-extrabold text-[#0F172A] dark:text-white font-mono text-sm">
                            {line.lineNo}
                          </td>

                          {/* Supervisor */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              {line.supervisorAvatar ? (
                                <img
                                  src={line.supervisorAvatar}
                                  alt={line.supervisor}
                                  className="w-6 h-6 rounded-full border border-slate-100 object-cover bg-slate-50"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                    const next = (e.target as HTMLElement).nextElementSibling;
                                    if (next) (next as HTMLElement).style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              {!line.supervisorAvatar ? (
                                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-500 dark:text-neutral-400 border border-slate-200">
                                  <User className="h-3.5 w-3.5" />
                                </div>
                              ) : (
                                <div style={{ display: 'none' }} className="w-6 h-6 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-500 dark:text-neutral-400 border border-slate-200">
                                  <User className="h-3.5 w-3.5" />
                                </div>
                              )}
                              <span className="font-semibold text-slate-700 dark:text-neutral-300 truncate max-w-[100px]">
                                {line.supervisor}
                              </span>
                            </div>
                          </td>

                          {/* Buyer & Style */}
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-800 dark:text-neutral-200">{line.buyer}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex flex-wrap items-center gap-1.5">
                              <span>{line.style}</span>
                              <span className="text-slate-300 dark:text-neutral-700 font-bold">•</span>
                              <span className="text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center gap-0.5">
                                <Clock className="h-3 w-3" /> {line.breakTime || "12:00 PM - 01:00 PM"}
                              </span>
                            </div>
                          </td>

                          {/* Target */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-700 dark:text-neutral-300">
                            {line.targetPcs.toLocaleString()}
                          </td>

                          {/* Output */}
                          <td className="py-3 px-3 text-right font-mono font-bold">
                            <span className="text-[#0F172A] dark:text-white">{line.currentProductionPcs.toLocaleString()}</span>
                            <div className={`text-[10px] font-semibold ${efficiencyColor} mt-0.5`}>
                              {line.efficiency}% Eff
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono font-black uppercase ${
                              line.status === "Running" 
                                ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                                : line.status === "Idle"
                                ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
                                : "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400"
                            }`}>
                              {line.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEditSelect(line)}
                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-all cursor-pointer"
                                title="Edit Line Configuration"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(line)}
                                className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all cursor-pointer"
                                title="Decommission Line"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Global Factory Master Data Registry */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-100 dark:border-neutral-850 p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Settings className="h-4.5 w-4.5 text-blue-600" />
                Global Factory Master Registry
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 font-mono mt-1">
                Configure master options for Buyers and Style Codes. Adding, modifying, or deleting items here automatically updates dropdown choices across the system.
              </p>
            </div>

            {/* Success and Error Alerts for Mapping */}
            {mappingError && (
              <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs p-3 rounded-xl border border-red-100 dark:border-red-900/30 flex items-center justify-between">
                <span className="font-semibold">{mappingError}</span>
                <button onClick={() => setMappingError(null)} className="text-red-500 hover:text-red-700">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {mappingSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-xs p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
                <span className="font-semibold">{mappingSuccess}</span>
                <button onClick={() => setMappingSuccess(null)} className="text-emerald-500 hover:text-emerald-700">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Buyer Clients Registry */}
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-neutral-850">
                  <h4 className="text-xs font-bold text-[#0F172A] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-indigo-500" />
                    Buyer Clients ({buyersList.length})
                  </h4>
                </div>

                {/* Buyers List Container */}
                <div className="max-h-48 overflow-y-auto border border-slate-100 dark:border-neutral-800 rounded-xl divide-y divide-slate-100 dark:divide-neutral-800 bg-slate-50/50 dark:bg-neutral-950/30">
                  {buyersList.map((b, idx) => (
                    <div key={b + "-" + idx} className="p-2 flex items-center justify-between text-xs font-semibold group hover:bg-white dark:hover:bg-neutral-900 transition-all">
                      {editingBuyerIndex === idx ? (
                        <div className="flex items-center gap-1.5 w-full">
                          <input
                            type="text"
                            value={editingBuyerValue}
                            onChange={(e) => setEditingBuyerValue(e.target.value)}
                            className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded px-1.5 py-0.5 text-xs text-slate-800 dark:text-neutral-200 w-full outline-none focus:border-blue-500"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEditBuyer(idx)}
                            className="text-emerald-600 hover:text-emerald-700 p-1"
                            title="Save"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingBuyerIndex(null)}
                            className="text-slate-400 hover:text-slate-600 p-1"
                            title="Cancel"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-slate-700 dark:text-neutral-300 font-bold">{b}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleStartEditBuyer(idx, b)}
                              className="text-blue-600 hover:text-blue-700 p-1"
                              title="Edit Buyer"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteBuyer(idx)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Delete Buyer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {buyersList.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400">No Buyers defined</div>
                  )}
                </div>

                {/* Add Buyer Form */}
                <form onSubmit={handleAddBuyer} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter brand (e.g. NIKE)"
                    value={newBuyerName}
                    onChange={(e) => setNewBuyerName(e.target.value)}
                    className="flex-1 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-neutral-200 font-semibold outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl text-xs transition-all flex items-center justify-center cursor-pointer"
                    title="Add Buyer"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </form>
              </div>

              {/* Style References Registry */}
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-neutral-850">
                  <h4 className="text-xs font-bold text-[#0F172A] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-sky-500" />
                    Style References ({stylesList.length})
                  </h4>
                </div>

                {/* Styles List Container */}
                <div className="max-h-48 overflow-y-auto border border-slate-100 dark:border-neutral-800 rounded-xl divide-y divide-slate-100 dark:divide-neutral-800 bg-slate-50/50 dark:bg-neutral-950/30">
                  {stylesList.map((s, idx) => (
                    <div key={s + "-" + idx} className="p-2 flex items-center justify-between text-xs font-semibold group hover:bg-white dark:hover:bg-neutral-900 transition-all">
                      {editingStyleIndex === idx ? (
                        <div className="flex items-center gap-1.5 w-full">
                          <input
                            type="text"
                            value={editingStyleValue}
                            onChange={(e) => setEditingStyleValue(e.target.value)}
                            className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded px-1.5 py-0.5 text-xs text-slate-800 dark:text-neutral-200 font-mono w-full outline-none focus:border-blue-500"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEditStyle(idx)}
                            className="text-emerald-600 hover:text-emerald-700 p-1"
                            title="Save"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingStyleIndex(null)}
                            className="text-slate-400 hover:text-slate-600 p-1"
                            title="Cancel"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-slate-700 dark:text-neutral-300 font-mono font-bold">{s}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleStartEditStyle(idx, s)}
                              className="text-blue-600 hover:text-blue-700 p-1"
                              title="Edit Style Reference"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteStyle(idx)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Delete Style Reference"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {stylesList.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400">No Styles defined</div>
                  )}
                </div>

                {/* Add Style Form */}
                <form onSubmit={handleAddStyle} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter style code (e.g. ZRD-2405)"
                    value={newStyleCode}
                    onChange={(e) => setNewStyleCode(e.target.value)}
                    className="flex-1 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-neutral-200 font-semibold outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl text-xs transition-all flex items-center justify-center cursor-pointer"
                    title="Add Style Reference"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Setup Form & Time Config */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-100 dark:border-neutral-850 p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-neutral-850 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">
                  {formMode === "add" ? "Provision New Line" : `Edit Line ${lineNo}`}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  {formMode === "add" ? "Allocate machine block to the sewing floor" : "Modify configuration parameters"}
                </p>
              </div>
              
              {formMode === "edit" && (
                <button
                  onClick={resetForm}
                  className="px-2.5 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-600 dark:text-neutral-300 font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {/* Message Banners */}
            {errorMsg && (
              <div className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-3 rounded-xl border border-red-100 dark:border-red-900/30 text-xs flex items-center gap-2 font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-xs flex items-center gap-2 font-semibold">
                <Check className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Configuration Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Line ID */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Line ID</label>
                  <div className="relative">
                    <Layers className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      disabled={formMode === "edit"}
                      placeholder="e.g. L09"
                      value={lineNo}
                      onChange={(e) => setLineNo(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 disabled:bg-slate-100 disabled:opacity-75 dark:bg-neutral-850 dark:disabled:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-blue-500 font-extrabold text-[#0F172A] dark:text-white"
                    />
                  </div>
                </div>

                {/* Status Selection */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                  <div className="relative">
                    <Activity className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as LineStatus)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-neutral-850 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-[#0F172A] dark:text-white"
                    >
                      <option value="Running">Running</option>
                      <option value="Idle">Idle</option>
                      <option value="Breakdown">Breakdown</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Supervisor Assignment */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Supervisor</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <select
                    value={supervisor}
                    onChange={(e) => setSupervisor(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-neutral-850 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-[#0F172A] dark:text-white"
                  >
                    {supervisorsList.map(s => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Buyer */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Buyer</label>
                  <div className="relative">
                    <ShoppingBag className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <select
                      value={buyer}
                      onChange={(e) => setBuyer(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-neutral-850 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-[#0F172A] dark:text-white"
                    >
                      {buyersList.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Style */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Style Code</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <select
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-neutral-850 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-[#0F172A] dark:text-white"
                    >
                      {stylesList.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Shift Target */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Shift Target (Pcs)</label>
                  <div className="relative">
                    <Target className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="number"
                      placeholder="e.g. 10000"
                      value={targetPcs === 0 ? "" : targetPcs}
                      onChange={(e) => setTargetPcs(parseInt(e.target.value) || 0)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-neutral-850 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-[#0F172A] dark:text-white font-mono"
                    />
                  </div>
                </div>

                {/* Current Production Output */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Production output</label>
                  <div className="relative">
                    <Layers className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="number"
                      placeholder="e.g. 3400"
                      value={currentProductionPcs}
                      onChange={(e) => setCurrentProductionPcs(parseInt(e.target.value) || 0)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-neutral-850 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-[#0F172A] dark:text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Efficiency Slider/Calculations */}
              <div className="bg-slate-50 dark:bg-neutral-850/50 p-3 rounded-xl border border-slate-100 dark:border-neutral-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Efficiency rate: {efficiency}%</span>
                  <button
                    type="button"
                    onClick={handleCalculateDefaultEfficiency}
                    className="text-[9px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                    title="Derive from output/target"
                  >
                    <RefreshCw className="h-3 w-3 animate-spin-hover" />
                    <span>Auto-Derive</span>
                  </button>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.5"
                  value={efficiency}
                  onChange={(e) => setEfficiency(parseFloat(e.target.value))}
                  className="w-full accent-blue-500 h-1.5 bg-slate-200 dark:bg-neutral-800 rounded-lg cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Current Hour Production Output */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Current hour (Pcs)</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="number"
                      placeholder="e.g. 450"
                      value={currentHourPcs}
                      onChange={(e) => setCurrentHourPcs(parseInt(e.target.value) || 0)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-neutral-850 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-[#0F172A] dark:text-white font-mono"
                    />
                  </div>
                </div>

                {/* Submit Action */}
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 bg-[#2563EB] hover:bg-blue-600 text-white font-extrabold rounded-xl text-xs tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer h-[38px]"
                  >
                    <Check className="h-4 w-4" />
                    <span>{formMode === "add" ? "Provision" : "Save Changes"}</span>
                  </button>
                </div>
              </div>

              {/* Customizable Break Time */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Custom Break Time
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. 12:00 PM - 01:00 PM or 01:00 PM - 01:45 PM"
                    value={breakTime}
                    onChange={(e) => setBreakTime(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-neutral-850 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-[#0F172A] dark:text-white"
                  />
                </div>
              </div>

              {/* Hourly Logs Setup */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex justify-between items-center">
                  <span>Hourly Logs ({getHourlyLabels()[0]} - {getHourlyLabels()[9]})</span>
                  <span className="text-[9px] text-slate-400 capitalize font-mono font-medium">10 comma-separated values</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0,0,150,220,180,210,0,300,120,40"
                  value={hourlyLogsStr}
                  onChange={(e) => setHourlyLogsStr(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-neutral-850 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-blue-500 text-slate-700 dark:text-neutral-300 font-mono tracking-wide"
                />
              </div>
            </form>
          </div>

          {/* Shift Hours & Intervals Customization (Relocated below the Provision card on the Right Side) */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-100 dark:border-neutral-850 p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-bold text-[#0F172A] dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-blue-600 animate-pulse" />
                Shift Hours & Intervals Setup
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 font-mono mt-1">
                Customize production start times and reporting steps. This instantly updates all tracking logs, dashboards, tables, and AI advisors across the system.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-extrabold text-slate-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                  Start Time
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="time"
                    value={globalStartTime}
                    onChange={(e) => setGlobalStartTime(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-neutral-850 border border-slate-200 dark:border-neutral-850 rounded-xl focus:outline-none focus:border-blue-500 font-bold text-[#0F172A] dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-extrabold text-slate-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                  Interval Duration
                </label>
                <select
                  value={globalInterval}
                  onChange={(e) => setGlobalInterval(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-neutral-850 border border-slate-200 dark:border-neutral-850 rounded-xl focus:outline-none focus:border-blue-500 font-bold text-[#0F172A] dark:text-white cursor-pointer"
                >
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Min (1 Hr)</option>
                  <option value={90}>90 Minutes</option>
                  <option value={120}>120 Min (2 Hr)</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-neutral-950/40 p-3.5 rounded-xl border border-slate-100 dark:border-neutral-850 space-y-2.5 text-[11px]">
              <div className="space-y-1">
                <span className="font-extrabold text-slate-600 dark:text-neutral-400 uppercase tracking-wider text-[9px]">Generated Active Slots (First 4 & Last):</span>
                <div className="flex flex-wrap gap-1 mt-1 font-mono text-[9px] font-bold font-semibold">
                  {getHourlyLabels(globalStartTime, globalInterval).slice(0, 4).map((label, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-slate-200/60 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 rounded-md">
                      {label}
                    </span>
                  ))}
                  <span className="px-1 py-0.5 text-slate-400">...</span>
                  {getHourlyLabels(globalStartTime, globalInterval).slice(-1).map((label, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-slate-200/60 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 rounded-md font-bold">
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  saveProductionTimeConfig(globalStartTime, globalInterval);
                  handleAddActivityLog(`Production starting time updated to ${globalStartTime} with ${globalInterval}-minute intervals.`, "success");
                  
                  if (isSupabaseConfigured()) {
                    try {
                      const success = await saveTimeConfigToSupabase(globalStartTime, globalInterval);
                      if (success) {
                        handleAddActivityLog(`Production time configuration successfully synchronized with cloud database.`, "success");
                      } else {
                        handleAddActivityLog(`Failed to synchronize time configuration with cloud database. Saved locally instead.`, "warning");
                      }
                    } catch (err) {
                      console.error("Error saving time config to Supabase:", err);
                    }
                  }
                }}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                Apply Shift Time Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
