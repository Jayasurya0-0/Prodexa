import React, { useState, useEffect } from "react";
import { 
  Search, 
  Clock as ClockIcon, 
  Bell, 
  ChevronDown, 
  Maximize2, 
  Minimize2, 
  CheckCircle, 
  HelpCircle,
  Cpu,
  Info,
  Sun,
  Moon,
  Calendar,
  User,
  Cloud,
  CloudOff,
  RefreshCw
} from "lucide-react";
import { ActivityLog, RBACUser } from "../types";
import { isSupabaseConfigured } from "../utils/supabaseSync";

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedUnit: string;
  setSelectedUnit: (unit: string) => void;
  activities: ActivityLog[];
  clearNotifications: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  currentUser?: RBACUser;
  onOpenProfile?: () => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  isSyncing?: boolean;
  syncInterval?: number;
  setSyncInterval?: (interval: number) => void;
  nextSyncIn?: number;
  onManualSync?: () => Promise<void>;
}

export default function Header({
  searchQuery,
  setSearchQuery,
  selectedUnit,
  setSelectedUnit,
  activities,
  clearNotifications,
  isDarkMode,
  onToggleDarkMode,
  currentUser,
  onOpenProfile,
  selectedDate,
  onDateChange,
  isSyncing = false,
  syncInterval = 600,
  setSyncInterval,
  nextSyncIn = 600,
  onManualSync
}: HeaderProps) {
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSyncDropdown, setShowSyncDropdown] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const units = [
    "Prodexa Garments Ltd. (Unit 1)",
    "Prodexa Textiles Ltd. (Unit 2)",
    "Prodexa Knits Ltd. (Unit 3)",
    "Prodexa Apparel (Unit 4)"
  ];

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setDateStr(now.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync fullscreen state with native browser changes
  useEffect(() => {
    const onFullscreenChange = () => {
      const isNativeFull = !!document.fullscreenElement;
      if (isNativeFull) {
        document.documentElement.classList.remove("simulated-fullscreen");
      }
      setIsFullscreen(isNativeFull || document.documentElement.classList.contains("simulated-fullscreen"));
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    document.addEventListener("mozfullscreenchange", onFullscreenChange);
    document.addEventListener("MSFullscreenChange", onFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
      document.removeEventListener("mozfullscreenchange", onFullscreenChange);
      document.removeEventListener("MSFullscreenChange", onFullscreenChange);
    };
  }, []);

  // Listen for Escape key to exit simulated fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (document.documentElement.classList.contains("simulated-fullscreen")) {
          toggleSimulatedFullscreen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleSimulatedFullscreen = (enable: boolean) => {
    if (enable) {
      document.documentElement.classList.add("simulated-fullscreen");
      setIsFullscreen(true);
    } else {
      document.documentElement.classList.remove("simulated-fullscreen");
      setIsFullscreen(false);
    }
  };

  const handleFullscreenToggle = () => {
    try {
      const isSimulated = document.documentElement.classList.contains("simulated-fullscreen");
      
      if (isSimulated) {
        toggleSimulatedFullscreen(false);
        return;
      }

      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen()
            .then(() => {
              setIsFullscreen(true);
            })
            .catch((err) => {
              console.warn("Native fullscreen request denied, falling back to simulated:", err);
              toggleSimulatedFullscreen(true);
            });
        } else {
          toggleSimulatedFullscreen(true);
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen()
            .then(() => {
              setIsFullscreen(false);
            })
            .catch((err) => {
              console.warn("Exit native fullscreen failed:", err);
              setIsFullscreen(false);
            });
        } else {
          setIsFullscreen(false);
        }
      }
    } catch (err) {
      console.warn("Error toggling fullscreen mode:", err);
      // Fallback toggling
      const nextSimulated = !document.documentElement.classList.contains("simulated-fullscreen");
      toggleSimulatedFullscreen(nextSimulated);
    }
  };

  return (
    <header 
      id="prodexa-header"
      className="bg-white dark:bg-neutral-900 border-b border-slate-100 dark:border-neutral-850 h-20 flex items-center justify-between px-8 sticky top-0 z-20 shadow-sm transition-colors duration-200"
    >
      {/* Unit Selector */}
      <div className="relative">
        <div className="flex flex-col text-left">
          <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-bold tracking-wide uppercase">Factory Plant</span>
          <span className="text-sm md:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
            LEA
          </span>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-[#64748B] dark:text-neutral-400" />
          </span>
          <input
            id="global-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search line, supervisor, style, buyer..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50/50 dark:bg-neutral-950 hover:bg-slate-50 dark:hover:bg-neutral-900 text-sm text-slate-800 dark:text-neutral-200 placeholder-slate-400 dark:placeholder-neutral-500 border border-slate-100 dark:border-neutral-850 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 rounded-xl transition-all outline-none"
          />
        </div>
      </div>

      {/* Utility Toolbar */}
      <div className="flex items-center gap-4">
        {/* Date Selector */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-50/50 dark:bg-neutral-950 rounded-lg border border-slate-100 dark:border-neutral-850">
          <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <div className="text-left">
            <span className="text-[9px] text-slate-400 dark:text-neutral-500 font-bold tracking-wide uppercase block leading-none mb-0.5">Production Date</span>
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-neutral-200 focus:outline-none border-none p-0 cursor-pointer w-28 font-mono"
            />
          </div>
        </div>

        {/* Real-time Cloud Auto-Reload Sync Engine */}
        <div className="relative" id="cloud-sync-engine">
          <div className="flex items-center gap-1 bg-slate-50/50 dark:bg-neutral-950 rounded-lg border border-slate-100 dark:border-neutral-850 p-1">
            <button
              onClick={() => isSupabaseConfigured() && onManualSync?.()}
              disabled={isSyncing || !isSupabaseConfigured()}
              title={isSupabaseConfigured() ? "Sync cloud data now" : "Cloud database not configured"}
              className={`p-1.5 rounded-md transition-colors flex items-center justify-center ${
                isSyncing 
                  ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400" 
                  : isSupabaseConfigured()
                    ? "hover:bg-slate-100 dark:hover:bg-neutral-850 text-emerald-600 dark:text-emerald-400 cursor-pointer"
                    : "text-slate-300 dark:text-neutral-700 cursor-not-allowed"
              }`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={() => isSupabaseConfigured() && setShowSyncDropdown(!showSyncDropdown)}
              disabled={!isSupabaseConfigured()}
              className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1.5 text-left ${
                isSupabaseConfigured() 
                  ? "hover:bg-slate-100 dark:hover:bg-neutral-850 cursor-pointer text-slate-700 dark:text-neutral-300"
                  : "text-slate-300 dark:text-neutral-700 cursor-not-allowed"
              }`}
            >
              <div className="relative flex items-center">
                <Cloud className={`h-4 w-4 ${isSupabaseConfigured() ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`} />
                {isSupabaseConfigured() && (
                  <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white dark:border-neutral-950 ${isSyncing ? "bg-blue-500 animate-ping" : "bg-emerald-500"}`} />
                )}
              </div>
              <div className="hidden sm:block text-[10px] leading-tight">
                <div className="font-extrabold tracking-tight flex items-center gap-1 text-slate-800 dark:text-neutral-200">
                  {isSupabaseConfigured() ? "Cloud Sync" : "No Cloud"}
                  {isSupabaseConfigured() && <ChevronDown className="h-2.5 w-2.5 text-slate-400" />}
                </div>
                <div className="text-[9px] text-slate-400 dark:text-neutral-500 font-mono font-medium">
                  {isSyncing 
                    ? "Syncing..." 
                    : syncInterval && syncInterval > 0 
                      ? `Auto-reload: ${nextSyncIn >= 60 ? `${Math.floor(nextSyncIn / 60)}m ${nextSyncIn % 60}s` : `${nextSyncIn}s`}` 
                      : "Auto-reload: Off"}
                </div>
              </div>
            </button>
          </div>

          {showSyncDropdown && isSupabaseConfigured() && (
            <>
              <div 
                className="fixed inset-0 z-30" 
                onClick={() => setShowSyncDropdown(false)} 
              />
              <div className="absolute right-0 mt-1.5 w-56 bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-850 rounded-xl shadow-xl z-40 p-2 text-left animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-neutral-850 mb-1">
                  <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-bold tracking-wide uppercase">Sync Configuration</span>
                </div>
                <div className="space-y-0.5">
                  {[
                    { label: "Standard Sync (10m)", value: 600 },
                    { label: "Shift Sync (5m)", value: 300 },
                    { label: "Periodic Sync (1m)", value: 60 },
                    { label: "Standard Auto (30s)", value: 30 },
                    { label: "High Frequency (10s)", value: 10 },
                    { label: "Manual Sync Only", value: 0 }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setSyncInterval?.(opt.value);
                        setShowSyncDropdown(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                        syncInterval === opt.value
                          ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold"
                          : "text-slate-600 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-850"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {syncInterval === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Real-time Ticking Clock */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50/50 dark:bg-neutral-950 rounded-lg border border-slate-100 dark:border-neutral-850">
          <ClockIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <div className="text-right font-mono">
            <span className="text-xs font-bold text-slate-800 dark:text-neutral-200 block">
              {timeStr || "00:00:00"}
            </span>
            <span className="text-[9px] text-slate-500 dark:text-neutral-500 font-medium block leading-none">
              {dateStr || "Loading..."}
            </span>
          </div>
        </div>

        {/* Live Alerts Notification */}
        <div className="relative">
          <button
            id="header-notification-bell"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-xl text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors relative cursor-pointer"
          >
            <Bell className="h-5 w-5" />
            {activities.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse font-mono">
                {activities.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute top-12 right-0 w-80 bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-850 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-3 bg-slate-900 dark:bg-neutral-950 text-white flex items-center justify-between border-b border-slate-100 dark:border-neutral-850">
                <span className="font-semibold text-sm">Real-time Activity (Live)</span>
                {activities.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer font-bold"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-neutral-850">
                {activities.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs">No active critical alerts</p>
                  </div>
                ) : (
                  activities.map((act) => (
                    <div key={act.id} className="p-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors text-xs">
                      <div className="flex justify-between text-slate-400 dark:text-neutral-500 mb-1 font-mono">
                        <span>{act.time}</span>
                        <span className={`w-2 h-2 rounded-full ${
                          act.type === "error" ? "bg-red-500" :
                          act.type === "warning" ? "bg-amber-500" :
                          act.type === "success" ? "bg-emerald-500" : "bg-blue-400"
                        }`} />
                      </div>
                      <p className="text-slate-700 dark:text-neutral-300 font-medium">{act.message}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="p-2 bg-slate-50 dark:bg-neutral-950 border-t border-slate-100 dark:border-neutral-850 text-center">
                <span className="text-[10px] text-slate-500 dark:text-neutral-500 flex items-center justify-center gap-1 font-mono">
                  <Cpu className="h-3 w-3 text-blue-500 animate-pulse" />
                  Live MES System Online
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Fullscreen Toggle */}
        <button
          onClick={handleFullscreenToggle}
          className="p-2.5 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-xl text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors hidden sm:block cursor-pointer"
          title="Toggle Fullscreen for Factory Display"
        >
          {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
        </button>

        {/* User Badge Profile info */}
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2 pl-2 border-l border-slate-100 dark:border-neutral-850 hover:opacity-80 active:scale-95 transition-all text-left cursor-pointer focus:outline-none"
          title="Open Profile Center"
        >
          {currentUser?.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full border border-slate-200 dark:border-neutral-700 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${currentUser?.avatarGradient || "from-blue-600 to-indigo-600"} flex items-center justify-center border border-slate-200 text-white shrink-0 shadow-sm`}>
              <User className="h-4 w-4" />
            </div>
          )}
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800 dark:text-neutral-200 leading-none">{currentUser?.name || "JOTHI"}</span>
            <span className="text-[10px] text-slate-400 dark:text-neutral-500 mt-0.5 font-bold uppercase tracking-wide">{currentUser?.clearance || "Admin"}</span>
          </div>
        </button>
      </div>
    </header>
  );
}
