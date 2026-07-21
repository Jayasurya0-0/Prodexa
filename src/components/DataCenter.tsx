import React, { useState, useRef, useEffect } from "react";
import { 
  Database, 
  Upload, 
  Download, 
  FileJson, 
  FileSpreadsheet, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Trash2, 
  Copy, 
  RefreshCw,
  Clock
} from "lucide-react";
import { ProductionLine, FactoryMetrics } from "../types";
import { getHourlyLabels } from "../utils/timeUtils";

interface DataCenterProps {
  lines: ProductionLine[];
  metrics: FactoryMetrics;
  selectedDate: string;
  onImportLines: (importedLines: ProductionLine[]) => void;
  onUpdateTarget: (target: number) => void;
  onUpdateWorkers: (workers: number) => void;
  onAddActivityLog: (message: string, type: "success" | "warning" | "error" | "info") => void;
}

export default function DataCenter({
  lines,
  metrics,
  selectedDate,
  onImportLines,
  onUpdateTarget,
  onUpdateWorkers,
  onAddActivityLog
}: DataCenterProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: "success" | "error" | null; message: string }>({ type: null, message: "" });
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fromDate, setFromDate] = useState<string>(selectedDate);
  const [toDate, setToDate] = useState<string>(selectedDate);

  useEffect(() => {
    setFromDate(selectedDate);
    setToDate(selectedDate);
  }, [selectedDate]);

  // Helper to list all dates between fromDate and toDate (inclusive)
  const getDatesInRange = (startStr: string, endStr: string): string[] => {
    const dates: string[] = [];
    const start = new Date(startStr);
    const end = new Date(endStr);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return [];
    }
    
    // Timezone-safe daily iteration
    const current = new Date(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    const last = new Date(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
    
    while (current <= last) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, "0");
      const dd = String(current.getDate()).padStart(2, "0");
      dates.push(`${yyyy}-${mm}-${dd}`);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  // Helper to resolve lines data for a given date
  const getLinesForDate = (dateStr: string): ProductionLine[] => {
    if (dateStr === selectedDate) {
      return lines;
    }

    const savedLocalStr = localStorage.getItem("mes_production_lines_" + dateStr);
    if (savedLocalStr) {
      try {
        const parsed = JSON.parse(savedLocalStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error(`Failed to parse cached records for ${dateStr}:`, e);
      }
    }

    // Default simulated idle fallback if no saved records exist for the date
    return lines.map(line => ({
      ...line,
      status: "Idle",
      targetPcs: 0,
      currentProductionPcs: 0,
      currentHourPcs: 0,
      efficiency: 0,
      balancePcs: 0,
      hourlyLog: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      otLog: [],
      lastUpdated: "08:00 AM"
    }));
  };

  // CSV Generator helper
  const generateCSV = (headers: string[], rows: any[][]) => {
    return [headers.join(","), ...rows.map(row => 
      row.map(cell => {
        const text = String(cell ?? "").replace(/"/g, '""');
        return text.includes(",") || text.includes("\n") || text.includes('"') ? `"${text}"` : text;
      }).join(",")
    )].join("\n");
  };

  // Export functions
  const handleExportLinesCSV = () => {
    const headers = ["Line No", "Supervisor", "Buyer", "Style", "Target (Pcs)", "Production (Pcs)", "Efficiency (%)", "Balance (Pcs)", "Status", "Last Updated"];
    const rows = lines.map(l => [
      l.lineNo,
      l.supervisor,
      l.buyer,
      l.style,
      l.targetPcs,
      l.currentProductionPcs,
      l.efficiency,
      l.balancePcs,
      l.status,
      l.lastUpdated
    ]);
    const csvContent = generateCSV(headers, rows);
    downloadFile(csvContent, "prodexa_lines_export.csv", "text/csv;charset=utf-8;");
    onAddActivityLog("Sewing lines exported to CSV successfully via Data Center.", "success");
  };

  const handleExportHourlyCSV = () => {
    const dates = getDatesInRange(fromDate, toDate);
    if (dates.length === 0) {
      alert("Invalid date range selected.");
      return;
    }
    if (dates.length > 31) {
      const confirmRange = window.confirm("You have selected a date range of more than 31 days. Generating large CSV files might take a moment. Do you want to continue?");
      if (!confirmRange) return;
    }

    const hours = getHourlyLabels();
    const headers = ["Date", "Line No", "Supervisor", "Buyer", "Style", "Time Slot", "Type", "Output (Pcs)"];
    
    const rows: any[][] = [];

    dates.forEach(dateStr => {
      const linesForDate = getLinesForDate(dateStr);
      
      linesForDate.forEach(l => {
        // 1. Add standard hour logs
        hours.forEach((hr, index) => {
          const output = l.hourlyLog[index] !== undefined ? l.hourlyLog[index] : 0;
          rows.push([
            dateStr,
            l.lineNo,
            l.supervisor,
            l.buyer,
            l.style,
            hr,
            "Standard",
            output
          ]);
        });

        // 2. Add overtime logs if any exist
        if (l.otLog && l.otLog.length > 0) {
          l.otLog.forEach(ot => {
            rows.push([
              dateStr,
              l.lineNo,
              l.supervisor,
              l.buyer,
              l.style,
              ot.time,
              "Overtime",
              ot.pieces
            ]);
          });
        }
      });
    });

    const csvContent = generateCSV(headers, rows);
    const fileName = fromDate === toDate 
      ? `prodexa_hourly_production_${fromDate}.csv`
      : `prodexa_hourly_production_${fromDate}_to_${toDate}.csv`;

    downloadFile(csvContent, fileName, "text/csv;charset=utf-8;");
    onAddActivityLog(`Hour-wise production data from ${fromDate} to ${toDate} exported to CSV successfully via Data Center.`, "success");
  };

  const handleExportLinesJSON = () => {
    const content = JSON.stringify({
      exportedAt: new Date().toISOString(),
      factoryTarget: metrics.shiftTarget,
      totalOperators: metrics.totalWorkers,
      lines: lines
    }, null, 2);
    downloadFile(content, "prodexa_factory_backup.json", "application/json;charset=utf-8;");
    onAddActivityLog("Full factory database exported to JSON successfully via Data Center.", "success");
  };

  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy template reference
  const handleCopyJSONTemplate = () => {
    const template = {
      factoryTarget: 500000,
      totalOperators: 1200,
      lines: [
        {
          lineNo: "L01",
          supervisor: "James Wilson",
          buyer: "ZARA",
          style: "ZRD-2405",
          targetPcs: 10000,
          currentProductionPcs: 8450,
          currentHourPcs: 850,
          efficiency: 84.50,
          balancePcs: 1550,
          status: "Running",
          lastUpdated: "10:30 AM",
          hourlyLog: [780, 820, 850, 890, 810, 880, 840, 870, 850, 860]
        }
      ]
    };
    navigator.clipboard.writeText(JSON.stringify(template, null, 2));
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  // Handle Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  };

  // Process File Contents
  const processUploadedFile = (file: File) => {
    const reader = new FileReader();
    const isJson = file.name.endsWith(".json");
    const isCsv = file.name.endsWith(".csv");

    if (!isJson && !isCsv) {
      setUploadStatus({
        type: "error",
        message: "Unsupported file type. Please upload a .json or .csv backup file."
      });
      return;
    }

    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      try {
        if (isJson) {
          const parsed = JSON.parse(text);
          
          // Import custom target if specified
          if (typeof parsed.factoryTarget === "number") {
            onUpdateTarget(parsed.factoryTarget);
          }
          // Import operators count if specified
          if (typeof parsed.totalOperators === "number") {
            onUpdateWorkers(parsed.totalOperators);
          }

          // Import line updates
          if (Array.isArray(parsed.lines)) {
            const validLines: ProductionLine[] = parsed.lines.map((l: any, i: number) => {
              const lineNo = l.lineNo || `L${String(i + 1).padStart(2, "0")}`;
              const hourlyLog = Array.isArray(l.hourlyLog) 
                ? l.hourlyLog.map((val: any) => Number(val) || 0) 
                : Array(10).fill(0);
              const targetPcs = Number(l.targetPcs) || 10000;
              const currentProductionPcs = hourlyLog.reduce((sum, val) => sum + val, 0);

              return {
                lineNo,
                supervisor: l.supervisor || `Supervisor ${lineNo}`,
                supervisorAvatar: l.supervisorAvatar || "",
                buyer: l.buyer || "GENERIC",
                style: l.style || "STYLE-99",
                targetPcs,
                currentProductionPcs,
                currentHourPcs: Number(l.currentHourPcs) || hourlyLog[hourlyLog.length - 1] || 0,
                efficiency: targetPcs > 0 ? parseFloat(((currentProductionPcs / targetPcs) * 100).toFixed(2)) : 0,
                balancePcs: Math.max(0, targetPcs - currentProductionPcs),
                status: l.status || "Running",
                lastUpdated: l.lastUpdated || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
                hourlyLog
              };
            });

            onImportLines(validLines);
            setUploadStatus({
              type: "success",
              message: `Successfully imported ${validLines.length} sewing lines, updated today's target and total operators from JSON backup.`
            });
            onAddActivityLog(`Imported ${validLines.length} production lines from JSON backup via Data Center.`, "success");
          } else {
            throw new Error("Invalid structure: JSON must contain 'lines' array.");
          }
        } else if (isCsv) {
          // Parse CSV rows simple way
          const rows = text.split(/\r?\n/).map(row => row.split(","));
          if (rows.length < 2) throw new Error("CSV has no data rows.");
          
          const validLines: ProductionLine[] = [];
          
          for (let i = 1; i < rows.length; i++) {
            const cells = rows[i];
            if (cells.length < 5 || !cells[0]) continue;

            const lineNo = cells[0].trim();
            const supervisor = cells[1]?.trim() || `Supervisor ${lineNo}`;
            const buyer = cells[2]?.trim() || "GENERIC";
            const style = cells[3]?.trim() || "STYLE-99";
            const targetPcs = parseInt(cells[4]) || 10000;
            const currentProductionPcs = parseInt(cells[5]) || 0;
            const status = (cells[8]?.trim() || "Running") as any;

            // Generate an elegant hourlyLog split
            const hourlyLog = Array(10).fill(0);
            const hourlyChunk = Math.floor(currentProductionPcs / 10);
            for (let h = 0; h < 9; h++) hourlyLog[h] = hourlyChunk;
            hourlyLog[9] = currentProductionPcs - (hourlyChunk * 9);

            validLines.push({
              lineNo,
              supervisor,
              supervisorAvatar: "",
              buyer,
              style,
              targetPcs,
              currentProductionPcs,
              currentHourPcs: hourlyLog[9],
              efficiency: targetPcs > 0 ? parseFloat(((currentProductionPcs / targetPcs) * 100).toFixed(2)) : 0,
              balancePcs: Math.max(0, targetPcs - currentProductionPcs),
              status,
              lastUpdated: cells[9]?.trim() || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
              hourlyLog
            });
          }

          if (validLines.length === 0) throw new Error("No valid sewing lines parsed.");
          onImportLines(validLines);
          setUploadStatus({
            type: "success",
            message: `Successfully imported ${validLines.length} sewing lines from CSV.`
          });
          onAddActivityLog(`Imported ${validLines.length} lines from CSV backup via Data Center.`, "success");
        }
      } catch (err: any) {
        setUploadStatus({
          type: "error",
          message: `Parsing failure: ${err?.message || "Invalid file schema."}`
        });
      }
    };

    reader.readAsText(file);
  };

  const handleResetUploadStatus = () => {
    setUploadStatus({ type: null, message: "" });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Introduction Card */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-850 p-6 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors duration-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
              <Database className="h-5 w-5" />
            </div>
            <h2 className="font-extrabold text-base text-slate-900 dark:text-white uppercase tracking-tight">
              Central Data Center
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400 font-semibold max-w-xl">
            Import and export factory configurations, live shift targets, active line assignments, and supervisor parameters. Keeps your plant records fully portable.
          </p>
        </div>

        <button
          onClick={handleCopyJSONTemplate}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-neutral-850 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 text-xs font-bold rounded-lg border border-slate-200 dark:border-neutral-800 transition-colors cursor-pointer"
        >
          {copiedTemplate ? (
            <>
              <Check className="h-4 w-4 text-emerald-500" />
              <span>Copied Template!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span>Copy Backup Format</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import Panel */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-850 rounded-xl p-6 shadow-sm flex flex-col justify-between transition-colors duration-200">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight uppercase mb-1">
              Import Configuration / Backups
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-neutral-500 font-bold tracking-wide uppercase mb-4">
              Restore sewing lines, today's targets, or supervisor logs
            </p>

            {/* Drag & Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center cursor-pointer transition-all ${
                dragActive
                  ? "border-blue-500 bg-blue-50/20 dark:bg-blue-950/10"
                  : "border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 bg-slate-50/30 dark:bg-neutral-950/40"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv,.json"
                className="hidden"
              />
              <Upload className="h-10 w-10 text-slate-400 dark:text-neutral-600 mb-3" />
              <p className="text-xs font-bold text-slate-700 dark:text-neutral-300">
                Drag & drop your backup file here, or <span className="text-blue-600 dark:text-blue-400 hover:underline">browse files</span>
              </p>
              <p className="text-[10px] text-slate-400 dark:text-neutral-500 mt-1">
                Supports .CSV or .JSON formatted Prodexa backups
              </p>
            </div>

            {/* Display feedback status */}
            {uploadStatus.type && (
              <div className={`mt-4 p-3.5 rounded-lg text-xs flex gap-2.5 items-start ${
                uploadStatus.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/20"
                  : "bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-400 border border-red-100/50 dark:border-red-900/20"
              }`}>
                {uploadStatus.type === "success" ? (
                  <Check className="h-4.5 w-4.5 flex-shrink-0 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-4.5 w-4.5 flex-shrink-0 text-red-500" />
                )}
                <div className="flex-1">
                  <p className="font-bold uppercase tracking-wider text-[9px]">
                    {uploadStatus.type === "success" ? "Restore Complete" : "Import Failed"}
                  </p>
                  <p className="font-semibold mt-0.5">{uploadStatus.message}</p>
                </div>
                <button
                  onClick={handleResetUploadStatus}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 font-bold"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 p-3 bg-blue-50/20 dark:bg-blue-950/10 border border-blue-100/30 dark:border-blue-900/20 rounded-lg text-xs text-blue-800 dark:text-blue-300 font-semibold flex gap-2 items-start">
            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <span>Importing valid configurations will instantly override existing active sewing lines and recalculate production KPIs for the active shift.</span>
          </div>
        </div>

        {/* Export Panel */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-850 rounded-xl p-6 shadow-sm flex flex-col justify-between transition-colors duration-200">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight uppercase mb-1">
              Export Production Backups
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-neutral-500 font-bold tracking-wide uppercase mb-4">
              Download active MES data registries for audit reports
            </p>

            <div className="space-y-4">
              {/* CSV Export Card */}
              <div className="p-4 border border-slate-100 dark:border-neutral-850 hover:border-slate-200 dark:hover:border-neutral-800 rounded-xl bg-slate-50/50 dark:bg-neutral-950/30 flex items-center justify-between gap-4 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/20">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">Active Sewing Lines (CSV)</h4>
                    <p className="text-[10px] text-slate-400 dark:text-neutral-500">Perfect for spreadsheet reports (Excel, Google Sheets)</p>
                  </div>
                </div>
                <button
                  onClick={handleExportLinesCSV}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" /> CSV
                </button>
              </div>

              {/* Hour-wise CSV Export Card */}
              <div className="p-4 border border-slate-100 dark:border-neutral-850 hover:border-slate-200 dark:hover:border-neutral-800 rounded-xl bg-slate-50/50 dark:bg-neutral-950/30 flex flex-col gap-3 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/20">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">Hour-wise Production Data (CSV)</h4>
                      <p className="text-[10px] text-slate-400 dark:text-neutral-500">Hour-by-hour output, standard shifts & overtime logs</p>
                    </div>
                  </div>
                  <button
                    onClick={handleExportHourlyCSV}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-sm shrink-0"
                  >
                    <Download className="h-3.5 w-3.5" /> CSV
                  </button>
                </div>

                <div className="border-t border-slate-100 dark:border-neutral-850 pt-2.5">
                  <span className="block text-[9px] font-extrabold text-slate-400 dark:text-neutral-500 uppercase tracking-wider mb-2">Export Date Range Filter</span>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-[8px] font-extrabold text-slate-400 dark:text-neutral-500 uppercase mb-1">From Date</label>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-neutral-800 focus:ring-1 focus:ring-blue-500 py-1.5 px-2.5 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 font-medium focus:outline-none"
                      />
                    </div>
                    <div className="text-slate-300 dark:text-neutral-700 self-end pb-2 font-bold text-xs">to</div>
                    <div className="flex-1">
                      <label className="block text-[8px] font-extrabold text-slate-400 dark:text-neutral-500 uppercase mb-1">To Date</label>
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-neutral-800 focus:ring-1 focus:ring-blue-500 py-1.5 px-2.5 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 font-medium focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* JSON Backup Card */}
              <div className="p-4 border border-slate-100 dark:border-neutral-850 hover:border-slate-200 dark:hover:border-neutral-800 rounded-xl bg-slate-50/50 dark:bg-neutral-950/30 flex items-center justify-between gap-4 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/20">
                    <FileJson className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">Full Factory Telemetry (JSON)</h4>
                    <p className="text-[10px] text-slate-400 dark:text-neutral-500">Full JSON backup including live target and operators</p>
                  </div>
                </div>
                <button
                  onClick={handleExportLinesJSON}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" /> JSON
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-100 dark:border-neutral-850 pt-4 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Live synchronization: Active
            </span>
            <span className="font-mono text-[10px] uppercase font-bold">Prodexa MES v2.4</span>
          </div>
        </div>
      </div>
    </div>
  );
}
