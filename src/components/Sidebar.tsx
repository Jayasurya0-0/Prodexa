import React from "react";
import { 
  LayoutDashboard, 
  Activity, 
  Gauge, 
  Clock, 
  Users, 
  AlertTriangle, 
  FileText, 
  TrendingUp, 
  ChevronLeft, 
  ChevronRight,
  LogOut,
  Database,
  ShieldCheck,
  Table,
  Sliders,
  Trophy
} from "lucide-react";
import { ActiveTab, RBACUser } from "../types";

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  alertCount: number;
  currentUser?: RBACUser;
  onLogout?: () => void;
  onOpenProfile?: () => void;
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  isCollapsed, 
  setIsCollapsed,
  alertCount,
  currentUser,
  onLogout,
  onOpenProfile
}: SidebarProps) {
  
  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard },
    { name: "Line Leaderboard", icon: Trophy, badge: "BOARD", badgeColor: "bg-amber-500 text-white font-mono" },
    { name: "Line Performance", icon: TrendingUp },
    { name: "Live Production", icon: Activity, badge: "LIVE", badgeColor: "bg-emerald-500 text-white" },
    { name: "Hourly Analysis", icon: Clock },
    { name: "Users", icon: Users },
    { name: "Alerts", icon: AlertTriangle, badge: alertCount > 0 ? alertCount.toString() : undefined, badgeColor: "bg-red-500 text-white" },
    { name: "Data Center", icon: Database },
    { name: "Factory Configuration", icon: Sliders },
    { name: "Database Visualizer", icon: Table },
  ];

  // Filter menu items dynamically based on current user's clearance level
  const filteredMenuItems = menuItems.filter((item) => {
    const clearance = currentUser?.clearance;
    if (clearance === "Operator" || (clearance && clearance.toUpperCase().includes("OPERATOR"))) {
      return item.name === "Line Leaderboard";
    }
    if (clearance === "Supervisor") {
      return item.name === "Dashboard" || item.name === "Live Production" || item.name === "Line Leaderboard";
    }
    if (clearance === "Data Entry") {
      return item.name === "Dashboard" || item.name === "Line Leaderboard" || item.name === "Line Performance";
    }
    if (item.name === "Database Visualizer") {
      return clearance === "Super Admin" || clearance === "Admin";
    }
    return true; // Other roles can see everything else
  });

  return (
    <div 
      id="prodexa-sidebar"
      className={`bg-white dark:bg-neutral-900 text-[#0F172A] dark:text-white flex flex-col transition-all duration-300 h-screen sticky top-0 left-0 border-r border-slate-100 dark:border-neutral-850 z-30 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Brand Logo Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-neutral-850 h-16">
        {!isCollapsed ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0F172A] dark:bg-neutral-950 flex items-center justify-center font-bold text-lg text-white border border-slate-700/30 dark:border-neutral-800 shadow-md font-sans">
              P
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-[#0F172A] dark:text-white block font-sans">
                PRODEXA
              </span>
              <span className="text-[9px] text-slate-500 dark:text-neutral-400 font-mono tracking-wider block -mt-1 uppercase">
                PRODUCTION EXCELLENCE
              </span>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-[#0F172A] dark:bg-neutral-950 flex items-center justify-center font-bold text-lg text-white mx-auto shadow-md font-sans">
            P
          </div>
        )}
      </div>

      {/* Navigation Menus */}
      <nav className="flex-1 py-4 overflow-y-auto px-2 space-y-1">
        {filteredMenuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.name;
          return (
            <button
              id={`sidebar-tab-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
              key={item.name}
              onClick={() => setActiveTab(item.name as ActiveTab)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-slate-100 dark:bg-neutral-800 text-[#2563EB] dark:text-blue-400"
                  : "text-[#64748B] dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-800/40 hover:text-[#0F172A] dark:hover:text-white"
              }`}
              title={isCollapsed ? item.name : undefined}
            >
              <IconComponent className={`h-5 w-5 flex-shrink-0 ${isActive ? "text-[#2563EB] dark:text-blue-400" : "text-[#64748B] dark:text-neutral-400"}`} />
              {!isCollapsed && (
                <span className="truncate flex-1 text-left">{item.name}</span>
              )}
              {!isCollapsed && item.badge && (
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
              {isCollapsed && item.name === "Alerts" && alertCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User Information Profile block & Collapse button */}
      <div className="p-4 border-t border-slate-100 dark:border-neutral-850 bg-white dark:bg-neutral-900">
        <div className="flex gap-1.5">
          <button
            id="sidebar-toggle-collapse"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex-1 flex items-center justify-center p-2 rounded-xl text-[#64748B] dark:text-neutral-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-50 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer text-xs font-bold border border-transparent hover:border-slate-200 dark:hover:border-neutral-800"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <div className="flex items-center gap-2">
                <ChevronLeft className="h-4 w-4" />
                <span>Collapse Panel</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
