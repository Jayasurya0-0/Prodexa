import React, { useState } from "react";
import { 
  Filter, 
  Columns, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  MoreVertical, 
  Search, 
  Check, 
  AlertCircle, 
  Cpu, 
  Info, 
  Edit3, 
  Clock, 
  ArrowUpDown,
  Download,
  Flame,
  User
} from "lucide-react";
import { ProductionLine, LineStatus } from "../types";

interface ProductionTableProps {
  lines: ProductionLine[];
  onUpdateLine: (updated: ProductionLine) => void;
  searchQuery: string;
  onLineClick?: (line: ProductionLine) => void;
  onHourlyUpdateClick?: () => void;
}

export default function ProductionTable({ 
  lines, 
  onUpdateLine, 
  searchQuery, 
  onLineClick,
  onHourlyUpdateClick
}: ProductionTableProps) {
  // Filters & State
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [buyerFilter, setBuyerFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<keyof ProductionLine>("lineNo");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

  const buyers = ["All", ...Array.from(new Set(lines.map(l => l.buyer)))];

  // Search & Filter execution
  const filteredLines = lines
    .filter((line) => {
      const matchSearch = 
        line.lineNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        line.supervisor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        line.style.toLowerCase().includes(searchQuery.toLowerCase()) ||
        line.buyer.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchStatus = statusFilter === "All" || line.status === statusFilter;
      const matchBuyer = buyerFilter === "All" || line.buyer === buyerFilter;

      return matchSearch && matchStatus && matchBuyer;
    })
    .sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc" 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

  // Pagination bounds
  const totalItems = filteredLines.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedLines = filteredLines.slice(startIndex, startIndex + pageSize);

  const handleSort = (key: keyof ProductionLine) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };

  const exportToCSV = () => {
    const headers = ["Line No", "Supervisor", "Buyer", "Style", "Target (Pcs)", "Production (Pcs)", "Efficiency (%)", "Balance (Pcs)", "Status", "Last Updated"];
    const rows = filteredLines.map(l => [
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
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Prodexa_Live_Production_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      id="prodexa-production-overview"
      className="bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-850 rounded-xl shadow-sm overflow-hidden flex flex-col h-full transition-colors duration-200"
    >
      {/* Header and Controls Row */}
      <div className="p-5 border-b border-slate-100 dark:border-neutral-850 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/30 dark:bg-neutral-950">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
            <Flame className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
            Live Line Production Overview
          </h3>
          <p className="text-xs text-slate-500 dark:text-neutral-400">Real-Time Output Monitoring and Breakdown Isolation</p>
        </div>

        {/* Filtering Options */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 dark:text-neutral-400 font-bold flex items-center gap-1 font-sans">
              <Filter className="h-3.5 w-3.5" /> Status:
            </span>
            <select
              id="status-filter-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-200 dark:border-neutral-800 focus:ring-2 focus:ring-blue-500/20 text-xs py-2 px-3 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 font-bold focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Running">Running</option>
              <option value="Idle">Idle</option>
              <option value="Breakdown">Breakdown</option>
            </select>
          </div>

          {/* Buyer Filter */}
          <div className="flex items-center gap-1.5">
            <select
              id="buyer-filter-select"
              value={buyerFilter}
              onChange={(e) => {
                setBuyerFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-200 dark:border-neutral-800 focus:ring-2 focus:ring-blue-500/20 text-xs py-2 px-3 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 font-bold focus:outline-none"
            >
              <option value="All">All Buyers</option>
              {buyers.filter(b => b !== "All").map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Hourly Update Option */}
          {onHourlyUpdateClick && (
            <button
              id="hourly-update-btn"
              onClick={onHourlyUpdateClick}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-950/60 border border-blue-200/50 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
              title="Supervisor Hourly Production Update"
            >
              <Clock className="h-3.5 w-3.5" />
              Log Hourly Update
            </button>
          )}
        </div>
      </div>

      {/* Responsive Table Container (Desktop Only) */}
      <div className="hidden lg:block overflow-x-auto flex-1 min-h-[300px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/30 dark:bg-neutral-950 text-slate-500 dark:text-neutral-400 text-[10px] font-bold uppercase tracking-wider select-none border-b border-slate-100 dark:border-neutral-850">
              <th onClick={() => handleSort("lineNo")} className="py-4 px-6 cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors">
                <div className="flex items-center gap-1.5">
                  Line No <ArrowUpDown className="h-3 w-3 opacity-60" />
                </div>
              </th>
              <th onClick={() => handleSort("supervisor")} className="py-4 px-6 cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors">
                <div className="flex items-center gap-1.5">
                  Supervisor <ArrowUpDown className="h-3 w-3 opacity-60" />
                </div>
              </th>
              <th onClick={() => handleSort("buyer")} className="py-4 px-6 cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors">
                <div className="flex items-center gap-1.5">
                  Buyer <ArrowUpDown className="h-3 w-3 opacity-60" />
                </div>
              </th>
              <th onClick={() => handleSort("style")} className="py-4 px-6 cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors">
                <div className="flex items-center gap-1.5">
                  Style <ArrowUpDown className="h-3 w-3 opacity-60" />
                </div>
              </th>
              <th onClick={() => handleSort("targetPcs")} className="py-4 px-6 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors">
                <div className="flex items-center justify-end gap-1.5">
                  Target (Pcs) <ArrowUpDown className="h-3 w-3 opacity-60" />
                </div>
              </th>
              <th onClick={() => handleSort("currentProductionPcs")} className="py-4 px-6 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors">
                <div className="flex items-center justify-end gap-1.5">
                  Output (Pcs) <ArrowUpDown className="h-3 w-3 opacity-60" />
                </div>
              </th>
              <th onClick={() => handleSort("currentHourPcs")} className="py-4 px-6 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors">
                <div className="flex items-center justify-end gap-1.5">
                  Current Hr <ArrowUpDown className="h-3 w-3 opacity-60" />
                </div>
              </th>
              <th onClick={() => handleSort("efficiency")} className="py-4 px-6 cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors">
                <div className="flex items-center gap-1.5">
                  Efficiency (%) <ArrowUpDown className="h-3 w-3 opacity-60" />
                </div>
              </th>
              <th onClick={() => handleSort("balancePcs")} className="py-4 px-6 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors">
                <div className="flex items-center justify-end gap-1.5">
                  Balance <ArrowUpDown className="h-3 w-3 opacity-60" />
                </div>
              </th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6">Last Updated</th>
              {onLineClick && <th className="py-4 px-6 text-center">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-neutral-850">
            {paginatedLines.length === 0 ? (
              <tr>
                <td colSpan={onLineClick ? 12 : 11} className="py-12 text-center text-slate-400 dark:text-neutral-500 text-sm">
                  <AlertCircle className="h-8 w-8 text-slate-300 dark:text-neutral-700 mx-auto mb-2 animate-bounce" />
                  No production lines found matching filters or search queries.
                </td>
              </tr>
            ) : (
              paginatedLines.map((line) => {
                const isDown = line.status === "Breakdown";
                const isIdle = line.status === "Idle";
                
                return (
                  <tr 
                    key={line.lineNo}
                    onClick={() => onLineClick?.(line)}
                    className={`${onLineClick ? "hover:bg-slate-50/50 dark:hover:bg-neutral-800/40 cursor-pointer" : "cursor-default"} transition-colors duration-150 text-slate-600 dark:text-neutral-400 text-xs font-semibold`}
                  >
                    {/* Line Code */}
                    <td className="py-4 px-6 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {line.lineNo}
                    </td>
                    
                    {/* Supervisor avatar & name */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {line.supervisorAvatar ? (
                          <img
                            src={line.supervisorAvatar}
                            alt={line.supervisor}
                            className="w-7 h-7 rounded-full object-cover border border-slate-100 dark:border-neutral-800"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                              const next = (e.target as HTMLElement).nextElementSibling;
                              if (next) (next as HTMLElement).style.display = 'flex';
                            }}
                          />
                        ) : null}
                        {(!line.supervisorAvatar) ? (
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-500 dark:text-neutral-400 border border-slate-150 dark:border-neutral-750">
                            <User className="h-3.5 w-3.5" />
                          </div>
                        ) : (
                          <div style={{ display: 'none' }} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-500 dark:text-neutral-400 border border-slate-150 dark:border-neutral-750">
                            <User className="h-3.5 w-3.5" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{line.supervisor}</p>
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 leading-none mt-0.5 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                            Online
                          </p>
                        </div>
                      </div>
                    </td>
                    
                    {/* Buyer & Style */}
                    <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">{line.buyer}</td>
                    <td className="py-4 px-6 font-mono font-bold text-slate-500 dark:text-neutral-400">{line.style}</td>
                    
                    {/* Targets vs Output */}
                    <td className="py-4 px-6 text-right font-bold font-mono text-slate-700 dark:text-neutral-300">{line.targetPcs.toLocaleString()}</td>
                    <td className="py-4 px-6 text-right font-black font-mono text-slate-900 dark:text-white">{line.currentProductionPcs.toLocaleString()}</td>
                    <td className="py-4 px-6 text-right font-bold font-mono text-blue-600 dark:text-blue-400">{line.currentHourPcs}</td>
                    
                    {/* Efficiency Progress Bar column */}
                    <td className="py-4 px-6 min-w-[130px]">
                      <div className="flex items-center gap-2">
                        <span className={`font-extrabold font-mono text-xs w-11 ${
                          line.efficiency >= 85 ? "text-emerald-600 dark:text-emerald-400" :
                          line.efficiency >= 60 ? "text-slate-700 dark:text-neutral-300" : "text-amber-500"
                        }`}>
                          {line.efficiency.toFixed(2)}%
                        </span>
                        <div className="w-16 bg-slate-100 dark:bg-neutral-800 rounded-full h-2 overflow-hidden flex-1">
                          <div 
                            className={`h-full rounded-full ${
                              line.efficiency >= 85 ? "bg-emerald-500 dark:bg-emerald-400" :
                              line.efficiency >= 65 ? "bg-blue-500 dark:bg-blue-400" :
                              line.efficiency >= 45 ? "bg-amber-500" : "bg-red-500"
                            }`}
                            style={{ width: `${Math.min(line.efficiency, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    
                    {/* Balance Pcs */}
                    <td className="py-4 px-6 text-right font-bold font-mono text-slate-500 dark:text-neutral-400">{line.balancePcs.toLocaleString()}</td>
                    
                    {/* Status Badge */}
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase inline-block ${
                        line.status === "Running" ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30" :
                        line.status === "Idle" ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30" :
                        "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 animate-pulse"
                      }`}>
                        {line.status}
                      </span>
                    </td>
                    
                    {/* Last Updated */}
                    <td className="py-4 px-6 text-slate-400 dark:text-neutral-500 font-mono text-[10px]">{line.lastUpdated}</td>
                    
                    {/* Action buttons */}
                    {onLineClick && (
                      <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onLineClick(line)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-neutral-800 transition-all cursor-pointer inline-flex items-center gap-1 border border-transparent hover:border-slate-100 dark:hover:border-neutral-700"
                          title="Configure and Ask Gemini advisory"
                        >
                          <Edit3 className="h-4 w-4" />
                          <span className="text-[10px] font-bold">Manage</span>
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Highly Professional Mobile Cards View (Visible on touch & smaller displays < lg) */}
      <div className="block lg:hidden flex-1 bg-slate-50/40 dark:bg-neutral-950/20">
        {paginatedLines.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-neutral-500 text-sm">
            <AlertCircle className="h-8 w-8 text-slate-300 dark:text-neutral-700 mx-auto mb-2 animate-bounce" />
            No production lines found matching filters or search queries.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {paginatedLines.map((line) => {
              const isDown = line.status === "Breakdown";
              const isIdle = line.status === "Idle";
              
              return (
                <div
                  key={line.lineNo}
                  onClick={() => onLineClick?.(line)}
                  className={`bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800/80 rounded-2xl p-4 shadow-2xs space-y-3.5 hover:border-blue-300 dark:hover:border-blue-900 transition-all duration-200 cursor-pointer flex flex-col justify-between active:scale-[0.99]`}
                >
                  {/* Card Header row */}
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-850 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-mono font-black text-[11px] rounded-lg tracking-wider uppercase">
                        Line {line.lineNo}
                      </span>
                      <span className="text-slate-300 dark:text-neutral-700 font-bold">•</span>
                      <span className="text-slate-800 dark:text-neutral-200 font-bold text-xs">{line.buyer}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-extrabold uppercase border inline-block ${
                      line.status === "Running" ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30" :
                      line.status === "Idle" ? "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30" :
                      "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30 animate-pulse font-extrabold"
                    }`}>
                      {line.status}
                    </span>
                  </div>

                  {/* Supervisor Information and Online Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {line.supervisorAvatar ? (
                        <img
                          src={line.supervisorAvatar}
                          alt={line.supervisor}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-neutral-800 flex-shrink-0"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                            const next = (e.target as HTMLElement).nextElementSibling;
                            if (next) (next as HTMLElement).style.display = 'flex';
                          }}
                        />
                      ) : null}
                      {(!line.supervisorAvatar) ? (
                        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-neutral-850 flex items-center justify-center text-slate-500 dark:text-neutral-400 border border-slate-200/60 dark:border-neutral-750 flex-shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                      ) : (
                        <div style={{ display: 'none' }} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-neutral-850 flex items-center justify-center text-slate-500 dark:text-neutral-400 border border-slate-200/60 dark:border-neutral-750 flex-shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                      <div>
                        <p className="text-[9px] text-slate-400 dark:text-neutral-500 font-bold uppercase tracking-wider">Supervisor</p>
                        <p className="font-bold text-xs text-slate-900 dark:text-white mt-0.5">{line.supervisor}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[9px] text-slate-400 dark:text-neutral-500 font-bold uppercase tracking-wider">Style Code</p>
                      <p className="font-mono font-bold text-xs text-slate-700 dark:text-neutral-300 mt-0.5">{line.style}</p>
                    </div>
                  </div>

                  {/* Efficiency progression bar */}
                  <div className="space-y-1 bg-slate-50/50 dark:bg-neutral-950/20 p-2.5 rounded-xl border border-slate-150/50 dark:border-neutral-850">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-bold uppercase tracking-wider">Line Efficiency</span>
                      <span className={`font-black font-mono ${
                        line.efficiency >= 85 ? "text-emerald-600 dark:text-emerald-400" :
                        line.efficiency >= 60 ? "text-blue-600 dark:text-blue-400" : "text-amber-500"
                      }`}>
                        {line.efficiency.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200/60 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          line.efficiency >= 85 ? "bg-emerald-500 dark:bg-emerald-400" :
                          line.efficiency >= 65 ? "bg-blue-500 dark:bg-blue-400" :
                          line.efficiency >= 45 ? "bg-amber-500" : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(line.efficiency, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Numeric KPI metrics for mobile */}
                  <div className="grid grid-cols-4 gap-2 text-center font-mono py-1">
                    <div className="bg-slate-50 dark:bg-neutral-950/40 p-2 rounded-xl">
                      <p className="text-[8px] text-slate-400 dark:text-neutral-500 font-bold uppercase tracking-tight">Target</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-white mt-1">{line.targetPcs}</p>
                    </div>
                    <div className="bg-blue-50/30 dark:bg-blue-950/10 p-2 rounded-xl">
                      <p className="text-[8px] text-blue-500 font-bold uppercase tracking-tight">Output</p>
                      <p className="text-xs font-black text-blue-600 dark:text-blue-400 mt-1">{line.currentProductionPcs}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-neutral-950/40 p-2 rounded-xl">
                      <p className="text-[8px] text-slate-400 dark:text-neutral-500 font-bold uppercase tracking-tight">Cur Hr</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-white mt-1">{line.currentHourPcs}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-neutral-950/40 p-2 rounded-xl">
                      <p className="text-[8px] text-slate-400 dark:text-neutral-500 font-bold uppercase tracking-tight">Balance</p>
                      <p className={`text-xs font-extrabold mt-1 ${line.balancePcs > 0 ? "text-slate-700 dark:text-neutral-300" : "text-slate-400"}`}>
                        {line.balancePcs}
                      </p>
                    </div>
                  </div>

                  {/* Card Actions Row */}
                  <div className="flex items-center justify-between pt-2 text-[10px] font-mono text-slate-400 border-t border-slate-100 dark:border-neutral-850">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Break: {line.breakTime || "12:00 - 13:00"}</span>
                    </div>

                    {onLineClick && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLineClick(line);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-white font-bold text-[10px] rounded-lg tracking-wider uppercase transition-colors shadow-2xs cursor-pointer min-h-[32px]"
                      >
                        <Edit3 className="h-3 w-3" />
                        Manage
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-100 dark:border-neutral-850 flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50/30 dark:bg-neutral-950 text-xs text-slate-500 dark:text-neutral-400 font-semibold">
        <span>
          Showing <span className="font-bold text-slate-800 dark:text-white font-mono">{Math.min(startIndex + 1, totalItems)}</span> to{" "}
          <span className="font-bold text-slate-800 dark:text-white font-mono">{Math.min(startIndex + pageSize, totalItems)}</span> of{" "}
          <span className="font-bold text-slate-800 dark:text-white font-mono">{totalItems}</span> production lines
        </span>

        <div className="flex items-center gap-3">
          {/* Items per page selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 dark:text-neutral-500">Lines per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-200 dark:border-neutral-800 focus:ring-2 focus:ring-blue-500/20 text-xs py-1.5 px-2 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 font-bold focus:outline-none"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>

          {/* Navigation keys */}
          <div className="flex items-center gap-1.5 font-mono">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`p-2 rounded-xl border border-slate-200 dark:border-neutral-800 cursor-pointer transition-colors ${
                currentPage === 1 
                  ? "opacity-40 cursor-not-allowed bg-slate-50 dark:bg-neutral-950" 
                  : "hover:bg-slate-50 dark:hover:bg-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300"
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-bold text-slate-700 dark:text-neutral-300">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-xl border border-slate-200 dark:border-neutral-800 cursor-pointer transition-colors ${
                currentPage === totalPages 
                  ? "opacity-40 cursor-not-allowed bg-slate-50 dark:bg-neutral-950" 
                  : "hover:bg-slate-50 dark:hover:bg-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300"
              }`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
