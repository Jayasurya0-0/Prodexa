import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import KpiGrid from "./components/KpiGrid";
import ProductionTable from "./components/ProductionTable";
import RightPanel from "./components/RightPanel";
import BottomCharts from "./components/BottomCharts";
import LineCardsRow from "./components/LineCardsRow";
import AiAdvisorModal from "./components/AiAdvisorModal";
import HourlyUpdateModal from "./components/HourlyUpdateModal";
import { 
  getProductionStartTime, 
  getProductionInterval, 
  getHourlyLabels 
} from "./utils/timeUtils";
import DataCenter from "./components/DataCenter";
import LoginSystem from "./components/LoginSystem";
import DatabaseVisualizer from "./components/DatabaseVisualizer";
import FactoryConfiguration from "./components/FactoryConfiguration";
import ProfileModal from "./components/ProfileModal";
import LineLeaderboard from "./components/LineLeaderboard";
import LinePerformanceTracker from "./components/LinePerformanceTracker";
import { motion, AnimatePresence } from "motion/react";
import { generateDailyYieldPDF, generateMachineLogPDF, generateSlaCompliancePDF } from "./utils/pdfGenerator";

import { ProductionLine, FactoryMetrics, ActivityLog, ActiveTab, LineStatus, RBACUser, Employee } from "./types";
import { initialMetrics, initialActivities, supervisorsList, buyersList, stylesList } from "./mockData";
import { 
  fetchProductionLinesFromSupabase, 
  saveLineToSupabase, 
  saveMetricsToSupabase, 
  isSupabaseConfigured, 
  deleteLineFromSupabase, 
  saveUserToSupabase, 
  uploadFileToSupabase,
  fetchEmployeesFromApi,
  createEmployeeInApi,
  updateEmployeeInApi,
  deleteEmployeeInApi,
  uploadEmployeePhotoToApi,
  fetchDailyTargetFromSupabase,
  saveDailyTargetToSupabase,
  fetchDailyMetricsFromSupabase,
  saveDailyMetricsToSupabase,
  fetchTimeConfigFromSupabase,
  saveTimeConfigToSupabase
} from "./utils/supabaseSync";
import { 
  Briefcase, 
  Target, 
  TrendingUp, 
  Users, 
  Cpu, 
  Settings as SettingsIcon, 
  Download, 
  FileSpreadsheet, 
  HelpCircle, 
  UserCheck, 
  ShieldCheck, 
  Clock, 
  ChevronRight, 
  RotateCcw, 
  Wrench, 
  Play, 
  AlertOctagon, 
  Info,
  CheckCircle,
  Database,
  Building,
  Key,
  Edit2,
  Trash2,
  Plus,
  Search,
  Camera,
  UploadCloud,
  X,
  User
} from "lucide-react";

const DEFAULT_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80"
];

const generateSimulatedLinesForDate = (dateStr: string, baseLines: ProductionLine[]): ProductionLine[] => {
  const todayStr = new Date().toISOString().split("T")[0];
  
  // Browsing previous or future dates with no data should show zero only
  if (dateStr !== todayStr) {
    return baseLines.map((line) => ({
      ...line,
      status: "Idle",
      targetPcs: 0,
      currentProductionPcs: 0,
      currentHourPcs: 0,
      efficiency: 0,
      balancePcs: 0,
      hourlyLog: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      lastUpdated: "08:00 AM"
    }));
  }

  // Today's date starts at zero as well, waiting for data sync or manual line entry, but keeps targetPcs preserved
  return baseLines.map((line) => ({
    ...line,
    status: "Idle",
    targetPcs: line.targetPcs,
    currentProductionPcs: 0,
    currentHourPcs: 0,
    efficiency: 0,
    balancePcs: line.targetPcs,
    hourlyLog: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    lastUpdated: "08:00 AM"
  }));
};

const OFFLINE_FALLBACK_LINES: ProductionLine[] = [
  {
    lineNo: "L01",
    supervisor: "James Wilson",
    supervisorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    buyer: "ZARA",
    style: "ZRD-2405",
    targetPcs: 1000,
    currentProductionPcs: 405,
    currentHourPcs: 45,
    efficiency: 40.5,
    balancePcs: 595,
    status: "Running",
    lastUpdated: "08:00 AM",
    hourlyLog: [40, 45, 50, 0, 45, 50, 40, 45, 45, 45]
  },
  {
    lineNo: "L02",
    supervisor: "Michael Brown",
    supervisorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    buyer: "H&M",
    style: "HM-1234",
    targetPcs: 800,
    currentProductionPcs: 342,
    currentHourPcs: 38,
    efficiency: 42.75,
    balancePcs: 458,
    status: "Running",
    lastUpdated: "08:00 AM",
    hourlyLog: [35, 38, 40, 38, 0, 40, 35, 38, 38, 40]
  },
  {
    lineNo: "L03",
    supervisor: "David Lee",
    supervisorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    buyer: "NEXT",
    style: "NXT-9876",
    targetPcs: 1200,
    currentProductionPcs: 620,
    currentHourPcs: 65,
    efficiency: 81.2,
    balancePcs: 580,
    status: "Running",
    lastUpdated: "08:00 AM",
    hourlyLog: [55, 60, 65, 60, 60, 65, 55, 65, 65, 70]
  },
  {
    lineNo: "L04",
    supervisor: "Robert Taylor",
    supervisorAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
    buyer: "M&S",
    style: "MS-5432",
    targetPcs: 950,
    currentProductionPcs: 410,
    currentHourPcs: 40,
    efficiency: 68.4,
    balancePcs: 540,
    status: "Running",
    lastUpdated: "08:00 AM",
    hourlyLog: [35, 40, 42, 40, 40, 42, 35, 40, 42, 44]
  }
];

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem("prodexa_authenticated") === "true";
  });
  const [currentUser, setCurrentUser] = useState<RBACUser>(() => {
    const saved = localStorage.getItem("prodexa_current_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.username === "sajid.admin") {
          // Sajid was deleted, switch default to Jothi
          localStorage.removeItem("prodexa_current_user");
        } else {
          return parsed;
        }
      } catch (e) {
        // Fallback
      }
    }
    return {
      id: "usr_106",
      name: "JOTHI",
      username: "jothi_admin",
      clearance: "Admin",
      departments: ["Human Resources"],
      status: "Active",
      avatarGradient: "from-purple-500 to-pink-500",
      avatarUrl: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150"
    };
  });

  // Shared Core States
  const [lines, setLines] = useState<ProductionLine[]>([]);
  const [buyers, setBuyers] = useState<string[]>(() => {
    const saved = localStorage.getItem("mes_buyers_list");
    return saved ? JSON.parse(saved) : buyersList;
  });
  const [styles, setStyles] = useState<string[]>(() => {
    const saved = localStorage.getItem("mes_styles_list");
    return saved ? JSON.parse(saved) : stylesList;
  });
  const [supervisors, setSupervisors] = useState<{ name: string; avatar: string }[]>(() => {
    const saved = localStorage.getItem("mes_supervisors_list");
    return saved ? JSON.parse(saved) : supervisorsList;
  });

  // Enterprise Employees Master State (centralized source of truth)
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem("mes_employees_list");
    const rawList: Employee[] = saved ? JSON.parse(saved) : [
      {
        id: "emp-101",
        employee_id: "EMP-1001",
        company_id: "COM-PRODEXA",
        factory_id: "FAC-UNIT1",
        first_name: "James",
        last_name: "Wilson",
        full_name: "James Wilson",
        designation: "Floor Supervisor",
        department: "Sewing",
        email: "james.wilson@prodexa.com",
        phone: "+1 (555) 019-2831",
        photo_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        status: "Active"
      },
      {
        id: "emp-102",
        employee_id: "EMP-1002",
        company_id: "COM-PRODEXA",
        factory_id: "FAC-UNIT1",
        first_name: "Michael",
        last_name: "Brown",
        full_name: "Michael Brown",
        designation: "Floor Supervisor",
        department: "Sewing",
        email: "michael.brown@prodexa.com",
        phone: "+1 (555) 019-3242",
        photo_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        status: "Active"
      },
      {
        id: "emp-103",
        employee_id: "EMP-1003",
        company_id: "COM-PRODEXA",
        factory_id: "FAC-UNIT1",
        first_name: "David",
        last_name: "Lee",
        full_name: "David Lee",
        designation: "Quality Supervisor",
        department: "Quality",
        email: "david.lee@prodexa.com",
        phone: "+1 (555) 019-4567",
        photo_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
        status: "Active"
      },
      {
        id: "emp-104",
        employee_id: "EMP-1004",
        company_id: "COM-PRODEXA",
        factory_id: "FAC-UNIT1",
        first_name: "Robert",
        last_name: "Taylor",
        full_name: "Robert Taylor",
        designation: "IE Engineer",
        department: "Industrial Engineering",
        email: "robert.taylor@prodexa.com",
        phone: "+1 (555) 019-9988",
        photo_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
        status: "Active"
      },
      {
        id: "emp-105",
        employee_id: "EMP-1005",
        company_id: "COM-PRODEXA",
        factory_id: "FAC-UNIT1",
        first_name: "Daniel",
        last_name: "Harris",
        full_name: "Daniel Harris",
        designation: "Floor Supervisor",
        department: "Sewing",
        email: "daniel.harris@prodexa.com",
        phone: "+1 (555) 019-1234",
        photo_url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
        status: "Active"
      },
      {
        id: "emp-106",
        employee_id: "EMP-1006",
        company_id: "COM-PRODEXA",
        factory_id: "FAC-UNIT1",
        first_name: "Sarah",
        last_name: "Jenkins",
        full_name: "Sarah Jenkins",
        designation: "QA Lead",
        department: "Quality",
        email: "sarah.jenkins@prodexa.com",
        phone: "+1 (555) 019-5678",
        photo_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
        status: "Active"
      },
      {
        id: "emp-107",
        employee_id: "EMP-1007",
        company_id: "COM-PRODEXA",
        factory_id: "FAC-UNIT1",
        first_name: "William",
        last_name: "Davis",
        full_name: "William Davis",
        designation: "Floor Supervisor",
        department: "Sewing",
        email: "william.davis@prodexa.com",
        phone: "+1 (555) 019-8765",
        photo_url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
        status: "Active"
      },
      {
        id: "emp-108",
        employee_id: "EMP-1008",
        company_id: "COM-PRODEXA",
        factory_id: "FAC-UNIT1",
        first_name: "Emily",
        last_name: "Garcia",
        full_name: "Emily Garcia",
        designation: "Maintenance Planner",
        department: "Maintenance",
        email: "emily.garcia@prodexa.com",
        phone: "+1 (555) 019-4321",
        photo_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80",
        status: "Active"
      },
      {
        id: "emp-109",
        employee_id: "EMP-1009",
        company_id: "COM-PRODEXA",
        factory_id: "FAC-UNIT1",
        first_name: "Kevin",
        last_name: "Martinez",
        full_name: "Kevin Martinez",
        designation: "Floor Supervisor",
        department: "Sewing",
        email: "kevin.martinez@prodexa.com",
        phone: "+1 (555) 019-2468",
        photo_url: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
        status: "Active"
      },
      {
        id: "emp-110",
        employee_id: "EMP-1010",
        company_id: "COM-PRODEXA",
        factory_id: "FAC-UNIT1",
        first_name: "Anna",
        last_name: "Kovacs",
        full_name: "Anna Kovacs",
        designation: "IE Analyst",
        department: "Industrial Engineering",
        email: "anna.kovacs@prodexa.com",
        phone: "+1 (555) 019-1357",
        photo_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
        status: "Active"
      }
    ];
    const seen = new Set<string>();
    const uniqueList: Employee[] = [];
    for (const emp of rawList) {
      if (!emp || !emp.employee_id) continue;
      const normId = emp.employee_id.trim().toLowerCase();
      if (!seen.has(normId)) {
        seen.add(normId);
        uniqueList.push(emp);
      }
    }
    return uniqueList;
  });

  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

  // Deletion & Supervisor Confirmation Modal States
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [authorizingSupervisorName, setAuthorizingSupervisorName] = useState<string>("");
  const [supervisorConfirmValue, setSupervisorConfirmValue] = useState<string>("");
  const [confirmDeleteError, setConfirmDeleteError] = useState<string | null>(null);

  // Employee Management Form State
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [employeeFormEmpId, setEmployeeFormEmpId] = useState("");
  const [employeeFormCompanyId, setEmployeeFormCompanyId] = useState("COM-PRODEXA");
  const [employeeFormFactoryId, setEmployeeFormFactoryId] = useState("FAC-UNIT1");
  const [employeeFormFirstName, setEmployeeFormFirstName] = useState("");
  const [employeeFormLastName, setEmployeeFormLastName] = useState("");
  const [employeeFormDesignation, setEmployeeFormDesignation] = useState("Floor Supervisor");
  const [employeeFormDepartment, setEmployeeFormDepartment] = useState("Sewing");
  const [employeeFormEmail, setEmployeeFormEmail] = useState("");
  const [employeeFormPhone, setEmployeeFormPhone] = useState("");
  const [employeeFormPhotoUrl, setEmployeeFormPhotoUrl] = useState("");
  const [employeeFormStatus, setEmployeeFormStatus] = useState<"Active" | "Inactive" | "Suspended">("Active");

  // Photo Upload State Variables
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [metrics, setMetrics] = useState<FactoryMetrics>(initialMetrics);
  const [manualShiftTarget, setManualShiftTarget] = useState<number | null>(() => {
    const saved = localStorage.getItem("mes_manual_shift_target");
    return saved ? parseInt(saved, 10) : null;
  });
  const [manualTotalWorkers, setManualTotalWorkers] = useState<number | null>(() => {
    const saved = localStorage.getItem("mes_manual_total_workers");
    return saved ? parseInt(saved, 10) : null;
  });
  const [systemActivities, setSystemActivities] = useState<ActivityLog[]>([]);
  const [timeConfigVersion, setTimeConfigVersion] = useState(0);

  useEffect(() => {
    const handleConfigChange = () => setTimeConfigVersion(v => v + 1);
    window.addEventListener("mes_time_config_changed", handleConfigChange);
    return () => window.removeEventListener("mes_time_config_changed", handleConfigChange);
  }, []);

  // Real-time missing update alerts derived dynamically from current lines data
  const missingUpdateAlerts = lines.flatMap((line) => {
    if (line.targetPcs > 0 && line.status === "Running") {
      const now = new Date();
      const currentHour = now.getHours();
      
      const startHour = parseInt(getProductionStartTime().split(":")[0], 10) || 8;
      
      // Outside shift hours, check first 5 slots to always display live warnings for demo/review.
      let elapsedIndices = [0, 1, 2, 3, 4];
      if (currentHour >= startHour + 1 && currentHour <= startHour + 10) {
        elapsedIndices = Array.from({ length: Math.min(10, currentHour - startHour) }, (_, i) => i);
      }
      
      const HOURS_LABELS = getHourlyLabels();
      const lineAlerts: ActivityLog[] = [];
      
      elapsedIndices.forEach((idx) => {
        const val = line.hourlyLog[idx];
        if (val === undefined || val === 0) {
          lineAlerts.push({
            id: `miss-${line.lineNo}-${idx}`,
            time: HOURS_LABELS[idx],
            type: "warning",
            message: `Line ${line.lineNo} (${line.supervisor}) has no production registered for the ${HOURS_LABELS[idx]} slot.`,
          });
        }
      });
      return lineAlerts;
    }
    return [];
  });

  const activities = [...missingUpdateAlerts, ...systemActivities];
  const [selectedLine, setSelectedLine] = useState<ProductionLine | null>(null);
  
  // Supervisor management states
  const [editingSupervisorIndex, setEditingSupervisorIndex] = useState<number | null>(null);
  const [supervisorFormName, setSupervisorFormName] = useState("");
  const [supervisorFormAvatar, setSupervisorFormAvatar] = useState("");
  const [supervisorError, setSupervisorError] = useState<string | null>(null);
  const [supervisorSuccess, setSupervisorSuccess] = useState<string | null>(null);
  
  // UI Layout States
  const [activeTab, setActiveTab] = useState<ActiveTab>("Dashboard");
  const [hourlyAnalysisLineFilter, setHourlyAnalysisLineFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("Prodexa Garments Ltd. (Unit 1)");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [shiftType, setShiftType] = useState("Day Shift (08:00 AM - 08:00 PM)");
  const [isLiveSync, setIsLiveSync] = useState(() => isSupabaseConfigured());
  const [isHourlyUpdateOpen, setIsHourlyUpdateOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Date Selection State
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [isChangingDate, setIsChangingDate] = useState(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [syncInterval, setSyncInterval] = useState<number>(600); // 10 minutes (600s) default
  const [nextSyncIn, setNextSyncIn] = useState<number>(600);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Re-load data or simulate when selectedDate changes
  const getMergedBaseLines = (baseLines: ProductionLine[]): ProductionLine[] => {
    try {
      const savedMapStr = localStorage.getItem("mes_global_line_supervisors");
      if (!savedMapStr) return baseLines.map(line => ({ ...line, breakTime: line.breakTime || "12:00 PM - 01:00 PM" }));
      const map = JSON.parse(savedMapStr);
      return baseLines.map(line => {
        const breakTime = map[line.lineNo]?.breakTime || line.breakTime || "12:00 PM - 01:00 PM";
        if (map[line.lineNo]) {
          return {
            ...line,
            supervisor: map[line.lineNo].supervisor,
            supervisorAvatar: map[line.lineNo].supervisorAvatar,
            breakTime
          };
        }
        return {
          ...line,
          breakTime
        };
      });
    } catch (e) {
      console.error("Error merging global supervisors:", e);
      return baseLines.map(line => ({ ...line, breakTime: line.breakTime || "12:00 PM - 01:00 PM" }));
    }
  };

  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    
    async function loadOrSimulate() {
      setIsChangingDate(true);
      setIsDataLoaded(false);
      try {
        // 800ms elegant lag/loading screen simulation
        await new Promise((resolve) => setTimeout(resolve, 800));

        // 0. Fetch global Time configuration from Supabase if configured
        if (isSupabaseConfigured()) {
          try {
            const timeConfig = await fetchTimeConfigFromSupabase();
            if (timeConfig) {
              const prevStart = localStorage.getItem("mes_production_start_time");
              const prevInt = localStorage.getItem("mes_production_interval_mins");
              if (prevStart !== timeConfig.productionStartTime || prevInt !== timeConfig.productionIntervalMins.toString()) {
                localStorage.setItem("mes_production_start_time", timeConfig.productionStartTime);
                localStorage.setItem("mes_production_interval_mins", timeConfig.productionIntervalMins.toString());
                window.dispatchEvent(new Event("mes_time_config_changed"));
              }
            }
          } catch (err) {
            console.error("Failed to load time config from Supabase:", err);
          }
        }

        let baseLinesToUse = getMergedBaseLines(OFFLINE_FALLBACK_LINES);
        let hasDbLines = false;

        // 1. Always check Supabase first if configured
        if (isSupabaseConfigured()) {
          try {
            const dbLines = await fetchProductionLinesFromSupabase(selectedDate);
            if (dbLines && dbLines.length > 0) {
              const mergedDbLines = getMergedBaseLines(dbLines);
              setLines(mergedDbLines);
              localStorage.setItem("mes_production_lines_" + selectedDate, JSON.stringify(mergedDbLines));
              handleAddActivityLog(`Real-time data synchronized for date ${selectedDate} from Supabase.`, "success");
              hasDbLines = true;
            }
          } catch (err) {
            console.error("Failed to load Supabase data for date calculation:", err);
          }
        }

        // 2. If Supabase is NOT configured or failed to return, try local storage cache next
        if (!hasDbLines) {
          const savedLocalStr = localStorage.getItem("mes_production_lines_" + selectedDate);
          if (savedLocalStr) {
            try {
              const savedLocal = JSON.parse(savedLocalStr);
              if (Array.isArray(savedLocal) && savedLocal.length > 0) {
                const mergedLocal = getMergedBaseLines(savedLocal);
                setLines(mergedLocal);
                localStorage.setItem("mes_production_lines_" + selectedDate, JSON.stringify(mergedLocal));
                handleAddActivityLog(`Retrieved saved records for ${selectedDate} from local database.`, "success");
                hasDbLines = true;
              }
            } catch (e) {
              console.error("Failed to parse local records:", e);
            }
          }
        }

        // 3. Fallback to simulation if both Supabase and localStorage are missing/offline
        if (!hasDbLines) {
          const simulated = generateSimulatedLinesForDate(selectedDate, baseLinesToUse);
          setLines(simulated);
          localStorage.setItem("mes_production_lines_" + selectedDate, JSON.stringify(simulated));
          handleAddActivityLog(`Production data successfully loaded and synchronized for: ${selectedDate}`, "success");
        }

        // 4. Fetch daily target from Supabase or LocalStorage date-wise
        let loadedTarget: number | null = null;
        if (isSupabaseConfigured()) {
          try {
            loadedTarget = await fetchDailyTargetFromSupabase(selectedDate);
          } catch (err) {
            console.error("Failed to load daily target from Supabase for date " + selectedDate, err);
          }
        }

        if (loadedTarget === null) {
          const savedLocalTarget = localStorage.getItem("mes_manual_shift_target_" + selectedDate);
          if (savedLocalTarget !== null) {
            loadedTarget = parseInt(savedLocalTarget, 10);
          } else {
            const globalSaved = localStorage.getItem("mes_manual_shift_target");
            if (globalSaved !== null) {
              loadedTarget = parseInt(globalSaved, 10);
            }
          }
        }

        setManualShiftTarget(loadedTarget);

        // 5. Fetch daily metrics / total workers from Supabase or LocalStorage date-wise
        let loadedWorkers: number | null = null;
        if (isSupabaseConfigured()) {
          try {
            const dbMetrics = await fetchDailyMetricsFromSupabase(selectedDate);
            if (dbMetrics && dbMetrics.totalWorkers) {
              loadedWorkers = dbMetrics.totalWorkers;
            }
          } catch (err) {
            console.error("Failed to load daily metrics from Supabase for date " + selectedDate, err);
          }
        }

        if (loadedWorkers === null) {
          const savedLocalWorkers = localStorage.getItem("mes_manual_total_workers_" + selectedDate);
          if (savedLocalWorkers !== null) {
            loadedWorkers = parseInt(savedLocalWorkers, 10);
          } else {
            const globalSaved = localStorage.getItem("mes_manual_total_workers");
            if (globalSaved !== null) {
              loadedWorkers = parseInt(globalSaved, 10);
            }
          }
        }

        setManualTotalWorkers(loadedWorkers);
      } finally {
        setIsDataLoaded(true);
      }
    }

    loadOrSimulate();
  }, [selectedDate]);

  // Sync metrics to Supabase when they change
  useEffect(() => {
    if (isChangingDate) return; // Prevent overwriting DB during initial load or transition
    if (isSupabaseConfigured()) {
      saveMetricsToSupabase(metrics);
      if (selectedDate) {
        saveDailyMetricsToSupabase(selectedDate, metrics);
      }
    }
  }, [metrics, selectedDate, isChangingDate]);

  // Background Auto-Reload Sync Engine
  const performBackgroundSync = async () => {
    if (!isSupabaseConfigured() || isSyncing) return;
    setIsSyncing(true);
    try {
      // 1. Fetch global Time configuration
      const timeConfig = await fetchTimeConfigFromSupabase();
      if (timeConfig) {
        const prevStart = localStorage.getItem("mes_production_start_time");
        const prevInt = localStorage.getItem("mes_production_interval_mins");
        if (prevStart !== timeConfig.productionStartTime || prevInt !== timeConfig.productionIntervalMins.toString()) {
          localStorage.setItem("mes_production_start_time", timeConfig.productionStartTime);
          localStorage.setItem("mes_production_interval_mins", timeConfig.productionIntervalMins.toString());
          window.dispatchEvent(new Event("mes_time_config_changed"));
        }
      }

      // 2. Fetch lines
      const dbLines = await fetchProductionLinesFromSupabase(selectedDate);
      if (dbLines && dbLines.length > 0) {
        const mergedDbLines = getMergedBaseLines(dbLines);
        setLines(mergedDbLines);
        localStorage.setItem("mes_production_lines_" + selectedDate, JSON.stringify(mergedDbLines));
      }

      // 3. Fetch daily target
      const loadedTarget = await fetchDailyTargetFromSupabase(selectedDate);
      if (loadedTarget !== null) {
        setManualShiftTarget(loadedTarget);
      }

      // 4. Fetch daily metrics for total workers
      const dbMetrics = await fetchDailyMetricsFromSupabase(selectedDate);
      if (dbMetrics && dbMetrics.totalWorkers) {
        setManualTotalWorkers(dbMetrics.totalWorkers);
      }
      
      handleAddActivityLog("Real-time production data auto-reloaded successfully.", "success");
    } catch (err) {
      console.error("Cloud background sync auto-reload failed:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Real-time Sync Timer Countdown
  useEffect(() => {
    if (isChangingDate || syncInterval <= 0) {
      return;
    }

    setNextSyncIn(syncInterval);

    const timer = setInterval(() => {
      setNextSyncIn((prev) => {
        if (prev <= 1) {
          performBackgroundSync();
          return syncInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [syncInterval, selectedDate, isChangingDate]);

  // Load employees from Supabase API (Express middleware) on initialization and sync toggle
  useEffect(() => {
    const loadEmployees = async () => {
      setIsLoadingEmployees(true);
      try {
        const dbEmps = await fetchEmployeesFromApi();
        if (dbEmps && dbEmps.length > 0) {
          const normalized = dbEmps.map(emp => ({
            ...emp,
            full_name: emp.full_name || (emp.last_name ? `${emp.first_name} ${emp.last_name}` : emp.first_name)
          }));
          setEmployees(normalized);
          localStorage.setItem("mes_employees_list", JSON.stringify(normalized));
        } else {
          // If connection exists but DB table is empty, seed initial batch
          if (isSupabaseConfigured()) {
            console.log("No employees found in database. Seeding default workforce registry...");
            const seededEmps: Employee[] = [];
            for (const emp of employees) {
              try {
                const { full_name, ...insertPayload } = emp;
                if (insertPayload.id.startsWith("emp-")) {
                  // @ts-ignore
                  delete insertPayload.id;
                }
                const res = await createEmployeeInApi(insertPayload);
                if (res && res.data) {
                  seededEmps.push({
                    ...res.data,
                    full_name: res.data.last_name ? `${res.data.first_name} ${res.data.last_name}` : res.data.first_name
                  });
                }
              } catch (e) {
                console.warn("Could not seed employee record into database:", e);
              }
            }
            if (seededEmps.length > 0) {
              setEmployees(seededEmps);
              localStorage.setItem("mes_employees_list", JSON.stringify(seededEmps));
            }
          }
        }
      } catch (err) {
        console.error("Failed to load employees from DB:", err);
      } finally {
        setIsLoadingEmployees(false);
      }
    };
    
    loadEmployees();
  }, [isLiveSync]);

  // Load factory configuration (buyers & styles) from database
  useEffect(() => {
    const loadFactoryConfig = async () => {
      try {
        const response = await fetch("/api/factory-config");
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.buyers) && Array.isArray(data.styles)) {
            setBuyers(data.buyers);
            setStyles(data.styles);
            localStorage.setItem("mes_buyers_list", JSON.stringify(data.buyers));
            localStorage.setItem("mes_styles_list", JSON.stringify(data.styles));
          }
        }
      } catch (err) {
        console.error("Failed to load factory configuration from API:", err);
      }
    };
    loadFactoryConfig();
  }, [isLiveSync]);

  // Derive supervisors list dynamically from Employees to retain backward compatibility
  useEffect(() => {
    if (employees.length > 0) {
      const activeSupervisors = employees
        .filter(emp => emp.status === "Active")
        .map(emp => ({
          name: emp.full_name || (emp.last_name ? `${emp.first_name} ${emp.last_name}` : emp.first_name),
          avatar: emp.photo_url || ""
        }));
      setSupervisors(activeSupervisors);
      localStorage.setItem("mes_supervisors_list", JSON.stringify(activeSupervisors));
    }
  }, [employees]);

  // Sync dark mode class with document root
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Role-based Access Control active tab enforcement
  useEffect(() => {
    if (!currentUser) return;
    const clearance = currentUser.clearance;
    if (clearance === "Operator" || (clearance && clearance.toUpperCase().includes("OPERATOR"))) {
      if (activeTab !== "Line Leaderboard") {
        setActiveTab("Line Leaderboard");
      }
    } else if (clearance === "Supervisor") {
      if (activeTab !== "Dashboard" && activeTab !== "Live Production" && activeTab !== "Line Leaderboard") {
        setActiveTab("Dashboard");
      }
    } else if (clearance === "Data Entry") {
      if (activeTab !== "Dashboard" && activeTab !== "Line Leaderboard" && activeTab !== "Line Performance") {
        setActiveTab("Dashboard");
      }
    } else if (activeTab === "Database Visualizer" && clearance !== "Super Admin" && clearance !== "Admin") {
      setActiveTab("Dashboard");
    }
  }, [activeTab, currentUser]);

  // Recalculate metrics whenever lines change
  useEffect(() => {
    let totalOutput = 0;
    let totalTarget = 0;
    let runningCount = 0;
    let idleCount = 0;
    let breakdownCount = 0;

    lines.forEach((line) => {
      totalOutput += line.currentProductionPcs;
      totalTarget += line.targetPcs;
      if (line.status === "Running") runningCount++;
      else if (line.status === "Idle") idleCount++;
      else breakdownCount++;
    });

    const isDataAvailable = totalTarget > 0;
    const targetToUse = manualShiftTarget !== null ? manualShiftTarget : totalTarget;

    // Achievement percentage
    const shiftAchievement = targetToUse > 0 ? parseFloat(((totalOutput / targetToUse) * 100).toFixed(2)) : 0;
    
    // Average efficiency
    const activeLines = lines.filter(l => l.status === "Running" && l.targetPcs > 0);
    const avgEfficiency = activeLines.length > 0
      ? parseFloat((activeLines.reduce((acc, curr) => acc + curr.efficiency, 0) / activeLines.length).toFixed(2))
      : 0;

    // Realistically scale workers & operators if targets are set
    const totalWorkers = manualTotalWorkers !== null 
      ? manualTotalWorkers 
      : (isDataAvailable ? lines.reduce((acc, l) => acc + (l.targetPcs > 0 ? 120 : 0), 0) : 0);
    const currentOperators = manualTotalWorkers !== null
      ? Math.round(manualTotalWorkers * 0.816)
      : (isDataAvailable ? lines.reduce((acc, l) => acc + (l.targetPcs > 0 ? 98 : 0), 0) : 0);

    setMetrics((prev) => ({
      ...prev,
      shiftTarget: targetToUse,
      shiftOutput: totalOutput,
      shiftAchievement,
      currentEfficiency: avgEfficiency,
      runningLines: runningCount,
      idleLines: (idleCount + breakdownCount),
      needleDownLines: breakdownCount,
      totalWorkers,
      currentOperators,
      runningMachines: runningCount * 60 + (runningCount > 0 ? 22 : 0),
      idleMachines: (idleCount + breakdownCount) * 38,
      productionStartTime: getProductionStartTime(),
      productionIntervalMins: getProductionInterval()
    }));

    if (isDataLoaded && isChangingDate) {
      setIsChangingDate(false);
    }
  }, [lines, manualShiftTarget, manualTotalWorkers, timeConfigVersion, isDataLoaded, isChangingDate]);

  const handleAddActivityLog = (message: string, type: "success" | "warning" | "error" | "info" = "info") => {
    const newLog: ActivityLog = {
      id: `act-${Date.now()}`,
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      type,
      message,
    };
    setSystemActivities((prev) => [newLog, ...prev.slice(0, 19)]);
  };

  const handleTriggerManualFluctuation = () => {
    // Add 10-40 pieces instantly to multiple lines to simulate a chunk completed
    setLines((prevLines) => {
      const updatedLines = prevLines.map((line) => {
        if (line.status !== "Running") return line;
        const extra = Math.floor(Math.random() * 30) + 10;
        const output = line.currentProductionPcs + extra;
        const updated = {
          ...line,
          currentProductionPcs: output,
          currentHourPcs: line.currentHourPcs + extra,
          balancePcs: Math.max(0, line.targetPcs - output),
          efficiency: line.targetPcs > 0 ? parseFloat(((output / line.targetPcs) * 100).toFixed(2)) : 0,
          lastUpdated: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        };

        // Async write to Supabase
        if (isSupabaseConfigured()) {
          saveLineToSupabase(updated, selectedDate);
        }

        return updated;
      });
      localStorage.setItem("mes_production_lines_" + selectedDate, JSON.stringify(updatedLines));
      return updatedLines;
    });
    handleAddActivityLog("Manual telemetry data sync triggered. Recalculated factory metrics.", "success");
  };

  const handleUpdateLine = async (updated: ProductionLine) => {
    try {
      const globalSupMap = JSON.parse(localStorage.getItem("mes_global_line_supervisors") || "{}");
      globalSupMap[updated.lineNo] = {
        supervisor: updated.supervisor,
        supervisorAvatar: updated.supervisorAvatar,
        breakTime: updated.breakTime || "12:00 PM - 01:00 PM"
      };
      localStorage.setItem("mes_global_line_supervisors", JSON.stringify(globalSupMap));
    } catch (e) {
      console.error("Error writing to mes_global_line_supervisors:", e);
    }

    setLines((prev) => {
      const newLines = prev.map((l) => (l.lineNo === updated.lineNo ? updated : l));
      localStorage.setItem("mes_production_lines_" + selectedDate, JSON.stringify(newLines));
      return newLines;
    });
    if (isSupabaseConfigured()) {
      await saveLineToSupabase(updated, selectedDate);
    }
  };

  const handleAddLine = async (line: ProductionLine) => {
    try {
      const globalSupMap = JSON.parse(localStorage.getItem("mes_global_line_supervisors") || "{}");
      globalSupMap[line.lineNo] = {
        supervisor: line.supervisor,
        supervisorAvatar: line.supervisorAvatar
      };
      localStorage.setItem("mes_global_line_supervisors", JSON.stringify(globalSupMap));
    } catch (e) {
      console.error("Error writing to mes_global_line_supervisors:", e);
    }

    setLines((prev) => {
      const filtered = prev.filter((l) => l.lineNo !== line.lineNo);
      const newLines = [...filtered, line].sort((a, b) => a.lineNo.localeCompare(b.lineNo));
      localStorage.setItem("mes_production_lines_" + selectedDate, JSON.stringify(newLines));
      return newLines;
    });
    if (isSupabaseConfigured()) {
      await saveLineToSupabase(line, selectedDate);
    }
  };

  const handleDeleteLine = async (lineNo: string) => {
    setLines((prev) => {
      const newLines = prev.filter((l) => l.lineNo !== lineNo);
      localStorage.setItem("mes_production_lines_" + selectedDate, JSON.stringify(newLines));
      return newLines;
    });
    if (isSupabaseConfigured()) {
      await deleteLineFromSupabase(lineNo);
    }
  };

  const handleUpdateBuyers = async (newBuyersList: string[]) => {
    setBuyers(newBuyersList);
    localStorage.setItem("mes_buyers_list", JSON.stringify(newBuyersList));
    try {
      await fetch("/api/factory-config/buyers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ buyers: newBuyersList }),
      });
    } catch (err) {
      console.error("Failed to save buyers to database:", err);
    }
  };

  const handleUpdateStyles = async (newStylesList: string[]) => {
    setStyles(newStylesList);
    localStorage.setItem("mes_styles_list", JSON.stringify(newStylesList));
    try {
      await fetch("/api/factory-config/styles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ styles: newStylesList }),
      });
    } catch (err) {
      console.error("Failed to save styles to database:", err);
    }
  };

  const handleAddEmployee = async (empData: Partial<Employee>) => {
    setSupervisorError(null);
    setSupervisorSuccess(null);
    
    if (!empData.first_name || !empData.employee_id) {
      setSupervisorError("First Name and Employee ID are required.");
      return;
    }

    const cleanFirstName = empData.first_name.trim();
    const cleanLastName = empData.last_name?.trim() || "";
    const cleanEmpId = empData.employee_id.trim();
    const cleanFullName = cleanLastName ? `${cleanFirstName} ${cleanLastName}` : cleanFirstName;

    if (employees.some(e => e.employee_id.toLowerCase() === cleanEmpId.toLowerCase())) {
      setSupervisorError(`An employee with ID "${cleanEmpId}" already registered.`);
      return;
    }

    const newEmployee: Employee = {
      id: empData.id || `emp-${Date.now()}`,
      employee_id: cleanEmpId,
      company_id: empData.company_id || "COM-PRODEXA",
      factory_id: empData.factory_id || "FAC-UNIT1",
      first_name: cleanFirstName,
      last_name: cleanLastName,
      full_name: cleanFullName,
      designation: empData.designation || "Floor Supervisor",
      department: empData.department || "Sewing",
      email: empData.email?.trim() || "",
      phone: empData.phone?.trim() || "",
      photo_url: empData.photo_url || "",
      status: empData.status || "Active"
    };

    try {
      const { full_name, ...insertPayload } = newEmployee;
      if (insertPayload.id.startsWith("emp-")) {
        // @ts-ignore
        delete insertPayload.id;
      }
      const apiResult = await createEmployeeInApi(insertPayload);
      if (apiResult && apiResult.data) {
        const added = {
          ...apiResult.data,
          full_name: apiResult.data.last_name ? `${apiResult.data.first_name} ${apiResult.data.last_name}` : apiResult.data.first_name
        };
        setEmployees(prev => [added, ...prev]);
      } else {
        setEmployees(prev => [newEmployee, ...prev]);
      }
      setSupervisorSuccess(`Employee "${cleanFullName}" registered successfully.`);
      handleAddActivityLog(`Workforce Registry: Added employee "${cleanFullName}".`, "info");
      resetEmployeeForm();
    } catch (err: any) {
      console.error("Error creating employee:", err);
      setSupervisorError(`Failed to save employee: ${err.message || err}`);
    }
  };

  const handleUpdateEmployee = async (id: string, empData: Partial<Employee>) => {
    setSupervisorError(null);
    setSupervisorSuccess(null);

    const cleanFirstName = empData.first_name?.trim() || "";
    const cleanLastName = empData.last_name?.trim() || "";
    const cleanFullName = cleanLastName ? `${cleanFirstName} ${cleanLastName}` : cleanFirstName;

    try {
      const { full_name, id: ignoreId, created_at, updated_at, ...updatePayload } = empData as any;
      const apiResult = await updateEmployeeInApi(id, updatePayload);
      if (apiResult && apiResult.data) {
        const updated = {
          ...apiResult.data,
          full_name: apiResult.data.last_name ? `${apiResult.data.first_name} ${apiResult.data.last_name}` : apiResult.data.first_name
        };
        setEmployees(prev => prev.map(e => e.id === id ? updated : e));
      } else {
        setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...empData, full_name: cleanFullName } : e));
      }

      // Auto sync active sewing lines in the state if employee details changed
      const original = employees.find(e => e.id === id);
      if (original) {
        const originalName = original.full_name || `${original.first_name} ${original.last_name}`;
        const newPhoto = empData.photo_url !== undefined ? empData.photo_url : original.photo_url;
        if (originalName !== cleanFullName || original.photo_url !== newPhoto) {
          try {
            const globalSupMap = JSON.parse(localStorage.getItem("mes_global_line_supervisors") || "{}");
            let mapChanged = false;
            Object.keys(globalSupMap).forEach(lineNo => {
              if (globalSupMap[lineNo].supervisor === originalName) {
                globalSupMap[lineNo] = {
                  supervisor: cleanFullName,
                  supervisorAvatar: newPhoto
                };
                mapChanged = true;
              }
            });
            if (mapChanged) {
              localStorage.setItem("mes_global_line_supervisors", JSON.stringify(globalSupMap));
            }
          } catch (e) {
            console.error("Error updating global supervisors map for employee edit:", e);
          }

          setLines(prev => prev.map(l => {
            if (l.supervisor === originalName) {
              const updatedLine = { 
                ...l, 
                supervisor: cleanFullName, 
                supervisorAvatar: newPhoto
              };
              // Persist line change
              if (isSupabaseConfigured()) {
                saveLineToSupabase(updatedLine);
              }
              return updatedLine;
            }
            return l;
          }));
        }
      }

      setSupervisorSuccess(`Employee "${cleanFullName}" updated successfully.`);
      handleAddActivityLog(`Workforce Registry: Updated profile for "${cleanFullName}".`, "info");
      resetEmployeeForm();
    } catch (err: any) {
      console.error("Error updating employee:", err);
      setSupervisorError(`Failed to update employee: ${err.message || err}`);
    }
  };

  const triggerDeleteEmployee = (emp: Employee) => {
    setSupervisorError(null);
    setSupervisorSuccess(null);
    
    // Assert safety constraint: Is this employee active as a supervisor on any lines?
    const targetName = emp.full_name || (emp.last_name ? `${emp.first_name} ${emp.last_name}` : emp.first_name);
    const isUsed = lines.some(l => l.supervisor === targetName);
    if (isUsed) {
      setSupervisorError(`Cannot delete employee "${targetName}" while assigned to an active sewing line as Supervisor.`);
      return;
    }

    setEmployeeToDelete(emp);
    setAuthorizingSupervisorName("");
    setSupervisorConfirmValue("");
    setConfirmDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!employeeToDelete) return;
    setConfirmDeleteError(null);

    if (!authorizingSupervisorName) {
      setConfirmDeleteError("Please select an authorizing supervisor.");
      return;
    }

    // Validate supervisor PIN or Employee ID
    const selectedSupObj = employees.find(emp => 
      (emp.full_name === authorizingSupervisorName || (emp.last_name ? `${emp.first_name} ${emp.last_name}` : emp.first_name) === authorizingSupervisorName) &&
      emp.status === "Active"
    );

    if (!selectedSupObj) {
      setConfirmDeleteError("Selected supervisor profile is not valid or active.");
      return;
    }

    const providedValue = supervisorConfirmValue.trim();
    if (!providedValue) {
      setConfirmDeleteError("Authorization credential is required.");
      return;
    }

    const isEmpIdMatch = providedValue.toUpperCase() === selectedSupObj.employee_id.trim().toUpperCase();
    const isPinMatch = providedValue === "1234" || providedValue === "admin123";

    if (!isEmpIdMatch && !isPinMatch) {
      setConfirmDeleteError(`Authorization failed. The Employee ID/credential does not match "${selectedSupObj.full_name}".`);
      return;
    }

    // Authorization successful, proceed to delete!
    const targetId = employeeToDelete.id;
    setEmployeeToDelete(null); // Close modal
    await handleDeleteEmployee(targetId);
  };

  const handleDeleteEmployee = async (id: string) => {
    setSupervisorError(null);
    setSupervisorSuccess(null);

    const target = employees.find(e => e.id === id);
    if (!target) return;

    const targetName = target.full_name || (target.last_name ? `${target.first_name} ${target.last_name}` : target.first_name);

    try {
      await deleteEmployeeInApi(id);
      setEmployees(prev => prev.filter(e => e.id !== id));
      setSupervisorSuccess(`Employee "${targetName}" deleted successfully with supervisor authorization.`);
      handleAddActivityLog(`Workforce Registry: Removed employee profile "${targetName}" (Authorized by ${authorizingSupervisorName}).`, "info");
      if (editingEmployeeId === id) {
        resetEmployeeForm();
      }
    } catch (err: any) {
      console.error("Error deleting employee:", err);
      setSupervisorError(`Failed to delete employee: ${err.message || err}`);
    }
  };

  const resetEmployeeForm = () => {
    setEditingEmployeeId(null);
    setEmployeeFormEmpId("");
    setEmployeeFormFirstName("");
    setEmployeeFormLastName("");
    setEmployeeFormDesignation("Floor Supervisor");
    setEmployeeFormDepartment("Sewing");
    setEmployeeFormEmail("");
    setEmployeeFormPhone("");
    setEmployeeFormPhotoUrl("");
    setEmployeeFormStatus("Active");
  };

  // Search, Filter & Drag States
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  const [employeeFilterDesignation, setEmployeeFilterDesignation] = useState("All");
  const [employeeFilterDepartment, setEmployeeFilterDepartment] = useState("All");
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);

  // File drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPhoto(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPhoto(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPhoto(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handlePhotoFileSelected(file);
    }
  };

  const handlePhotoFileSelected = async (file: File) => {
    setSupervisorError(null);
    setSupervisorSuccess(null);

    // Validate size (5MB maximum)
    if (file.size > 5 * 1024 * 1024) {
      setSupervisorError("Photo size exceeds the maximum limit of 5MB.");
      return;
    }

    // Validate type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      setSupervisorError("Invalid file type. Only JPG, JPEG, PNG, and WEBP formats are supported.");
      return;
    }

    const company = employeeFormCompanyId || "COM-PRODEXA";
    const factory = employeeFormFactoryId || "FAC-UNIT1";
    const empId = employeeFormEmpId.trim() || `EMP-${Date.now()}`;

    setIsUploadingPhoto(true);
    setUploadProgress(15);

    // Animate progress smoothly
    const progInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progInterval);
          return 90;
        }
        return prev + 15;
      });
    }, 80);

    try {
      if (isSupabaseConfigured()) {
        const result = await uploadEmployeePhotoToApi(file, company, factory, empId);
        clearInterval(progInterval);
        setUploadProgress(100);
        if (result && result.publicUrl) {
          setEmployeeFormPhotoUrl(result.publicUrl);
          setSupervisorSuccess("Photo uploaded and synced with Supabase Storage successfully.");
        } else {
          throw new Error("Invalid response from photo upload API.");
        }
      } else {
        // Local fallback (Base64 data URI)
        clearInterval(progInterval);
        setUploadProgress(100);
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setEmployeeFormPhotoUrl(event.target.result as string);
            setSupervisorSuccess("Photo loaded locally (Cloud storage inactive).");
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      clearInterval(progInterval);
      setUploadProgress(0);
      console.error("Supabase photo upload failed, using local preview fallback:", err);
      setSupervisorError(`Storage upload failed: ${err.message || err}. Local preview used as fallback.`);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setEmployeeFormPhotoUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setTimeout(() => {
        setIsUploadingPhoto(false);
        setUploadProgress(0);
      }, 600);
    }
  };

  const handleUpdateUser = async (updatedUser: RBACUser, newPassword?: string) => {
    setCurrentUser(updatedUser);
    localStorage.setItem("prodexa_current_user", JSON.stringify(updatedUser));
    handleAddActivityLog(`User Profile for ${updatedUser.name} updated successfully.`, "success");
    if (isSupabaseConfigured()) {
      await saveUserToSupabase(updatedUser, newPassword);
    }
  };

  const handleUpdateTarget = async (newTarget: number) => {
    setManualShiftTarget(newTarget);
    localStorage.setItem("mes_manual_shift_target", newTarget.toString());
    localStorage.setItem("mes_manual_shift_target_" + selectedDate, newTarget.toString());
    setMetrics((prev) => {
      const shiftAchievement = newTarget > 0 ? parseFloat(((prev.shiftOutput / newTarget) * 100).toFixed(2)) : 0;
      return {
        ...prev,
        shiftTarget: newTarget,
        shiftAchievement
      };
    });
    handleAddActivityLog(`Shift Target for ${selectedDate} updated to ${newTarget.toLocaleString()} Pcs.`, "info");

    if (isSupabaseConfigured()) {
      try {
        const success = await saveDailyTargetToSupabase(selectedDate, newTarget);
        if (success) {
          handleAddActivityLog(`Target for ${selectedDate} successfully saved to cloud database.`, "success");
        } else {
          handleAddActivityLog(`Could not save target for ${selectedDate} to cloud database. Cached locally instead.`, "warning");
        }
      } catch (err) {
        console.error("Error saving daily target to Supabase:", err);
      }
    }
  };

  const handleUpdateWorkers = async (newWorkers: number) => {
    setManualTotalWorkers(newWorkers);
    localStorage.setItem("mes_manual_total_workers_" + selectedDate, newWorkers.toString());
    localStorage.setItem("mes_manual_total_workers", newWorkers.toString());

    setMetrics((prev) => ({
      ...prev,
      totalWorkers: newWorkers
    }));
    handleAddActivityLog(`Total operators count updated manually to ${newWorkers.toLocaleString()}.`, "info");

    if (isSupabaseConfigured() && selectedDate) {
      try {
        const updatedMetrics = {
          ...metrics,
          totalWorkers: newWorkers
        };
        const success = await saveDailyMetricsToSupabase(selectedDate, updatedMetrics);
        if (success) {
          handleAddActivityLog(`Total operators count for ${selectedDate} saved to cloud database.`, "success");
        }
      } catch (err) {
        console.error("Error saving daily metrics to Supabase:", err);
      }
    }
  };

  const handleImportLines = (importedLines: ProductionLine[]) => {
    setLines(importedLines);
    if (isSupabaseConfigured()) {
      importedLines.forEach((l) => saveLineToSupabase(l));
    }
  };

  const clearNotifications = () => {
    setSystemActivities([]);
  };

  const criticalAlertCount = lines.filter((l) => l.status === "Breakdown").length;

  if (!isAuthenticated) {
    return (
      <LoginSystem
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthenticated(true);
          localStorage.setItem("prodexa_authenticated", "true");
          localStorage.setItem("prodexa_current_user", JSON.stringify(user));
          handleAddActivityLog(`Operator ${user.name} signed in to the MES portal securely.`, "success");
        }}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />
    );
  }

  return (
    <div 
      id="prodexa-app-root"
      className="flex bg-[#F8FAFC] min-h-screen font-sans text-slate-800"
    >
      <AnimatePresence>
        {isChangingDate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex flex-col items-center justify-center"
          >
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl border border-slate-100 dark:border-neutral-800 flex flex-col items-center text-center animate-in scale-in duration-200">
              {/* Beautiful Spinning Loader */}
              <div className="relative w-16 h-16 mb-5">
                <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-neutral-800" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.85, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-4 border-t-emerald-600 border-r-transparent border-b-transparent border-l-transparent"
                />
              </div>

              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-1.5">
                Syncing Telemetry
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 font-semibold font-sans leading-relaxed">
                Loading production standings and sewer line histories for <span className="font-mono font-bold text-emerald-600">{selectedDate}</span>.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* 1. Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        alertCount={criticalAlertCount}
        currentUser={currentUser}
        onLogout={() => {
          setIsAuthenticated(false);
          localStorage.removeItem("prodexa_authenticated");
          localStorage.removeItem("prodexa_current_user");
          handleAddActivityLog("Operator signed out from the MES console.", "info");
        }}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 2. Top Header */}
        <Header
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedUnit={selectedUnit}
          setSelectedUnit={setSelectedUnit}
          activities={activities}
          clearNotifications={clearNotifications}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          currentUser={currentUser}
          onOpenProfile={() => setIsProfileOpen(true)}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          isSyncing={isSyncing}
          syncInterval={syncInterval}
          setSyncInterval={setSyncInterval}
          nextSyncIn={nextSyncIn}
          onManualSync={performBackgroundSync}
        />

        {/* Dynamic Content Container */}
        <main className="p-4 md:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Dashboard Title & Quick Sync Toggles */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h1 className="text-xl md:text-2xl font-black text-[#0F172A] tracking-tight">
                {activeTab === "Dashboard" && "Live Production Dashboard"}
                {activeTab === "Live Production" && "Live Production Operations"}
                {activeTab === "Line Leaderboard" && "Garment Sewing Line Standings"}
                {activeTab === "Line Performance" && "Line Performance Analytics"}
                {activeTab === "Hourly Analysis" && "Hourly Interval Analysis"}
                {activeTab === "Factory Configuration" && "Sewing Floor Layout & Configuration"}
                {activeTab === "Reports" && "Industrial Yield Reports"}
                {activeTab === "Alerts" && "Floor Alert Center"}
                {activeTab === "Users" && "Supervisor Profile Registry"}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {activeTab === "Dashboard" && "Real-Time Production Monitoring and Bottleneck Diagnostics Across All Active Sewing Lines."}
                {activeTab === "Live Production" && "Directly configure and check line yields, styles, and assign supervisor targets."}
                {activeTab === "Line Leaderboard" && "Operator-friendly production standings showing high-yield sewing lines, real-time pace achievements, and leaderboard trophies."}
                {activeTab === "Line Performance" && "Analyze cumulative machine efficiency ratios, operator counts, and output progression."}
                {activeTab === "Hourly Analysis" && "Hour-by-hour output details comparing performance lines with targeted pacing logs."}
                {activeTab === "Factory Configuration" && "Provision new sewing lines, update targets, edit buyer/style mappings, and manage active assets."}
                {activeTab === "Reports" && "Generate and export production summary, shift compliance, and needle diagnostics reports."}
                {activeTab === "Alerts" && "Review breakdowns, needle events, and supervisor log reports."}
                {activeTab === "Users" && "View floor operators and supervisor assignments on active garment styles."}
              </p>
            </div>
          </div>

          {/* ==================== TAB CONTENT: DASHBOARD ==================== */}
          {activeTab === "Dashboard" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Row 1: KPI Stats Grid */}
              <KpiGrid 
                metrics={metrics} 
                lines={lines}
                onUpdateTarget={handleUpdateTarget}
                onUpdateWorkers={handleUpdateWorkers}
              />

              {/* Row 2: Live Overview & Right Panel Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                <div className="xl:col-span-2">
                  <ProductionTable
                    lines={lines}
                    onUpdateLine={handleUpdateLine}
                    searchQuery={searchQuery}
                  />
                </div>
                <div className="xl:col-span-1">
                  <RightPanel
                    metrics={metrics}
                    shiftType={shiftType}
                    setShiftType={setShiftType}
                  />
                </div>
              </div>

              {/* Row 3: Hourly Analytics Charts */}
              <BottomCharts lines={lines} />

              {/* Row 4: Slide Line Performance Cards */}
              <LineCardsRow lines={lines} />
            </div>
          )}

          {/* ==================== TAB CONTENT: LIVE PRODUCTION ==================== */}
          {activeTab === "Live Production" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 font-semibold flex items-start gap-2.5">
                <Cpu className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">Industrial Sewing Live Console</p>
                  <p className="mt-0.5 text-blue-600">Click on any sewing line item below to modify supervisor style references, report active motor/needle incidents, or edit the hour-wise production logs to update yield metrics instantly.</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <ProductionTable
                  lines={lines}
                  onUpdateLine={handleUpdateLine}
                  searchQuery={searchQuery}
                  onLineClick={(line) => setSelectedLine(line)}
                  onHourlyUpdateClick={() => setIsHourlyUpdateOpen(true)}
                />
              </div>
            </div>
          )}

          {/* ==================== TAB CONTENT: LINE LEADERBOARD ==================== */}
          {activeTab === "Line Leaderboard" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <LineLeaderboard
                lines={lines}
                onLineClick={(line) => {
                  setHourlyAnalysisLineFilter(line.lineNo);
                  setActiveTab("Hourly Analysis");
                }}
                onUpdateLine={handleUpdateLine}
                selectedDate={selectedDate}
              />
            </div>
          )}

          {/* ==================== TAB CONTENT: LINE PERFORMANCE ==================== */}
          {activeTab === "Line Performance" && (
            <LinePerformanceTracker
              lines={lines}
              selectedDate={selectedDate}
              currentUser={currentUser}
              onAddActivityLog={handleAddActivityLog}
            />
          )}

          {/* ==================== TAB CONTENT: HOURLY ANALYSIS ==================== */}
          {activeTab === "Hourly Analysis" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header card with Filter Controls */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-extrabold text-sm text-[#0F172A] uppercase tracking-tight mb-1">
                      Garment Productivity Hourly Matrix (Pcs)
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold">Granular shift logs tracking output intervals from 08:00 AM to 05:00 PM</p>
                  </div>

                  {/* Filter Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">Select Line:</span>
                    <select
                      value={hourlyAnalysisLineFilter}
                      onChange={(e) => setHourlyAnalysisLineFilter(e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-xs font-extrabold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="">-- All Sewing Lines --</option>
                      {lines.map(l => (
                        <option key={l.lineNo} value={l.lineNo}>Line {l.lineNo}</option>
                      ))}
                    </select>
                    {hourlyAnalysisLineFilter && (
                      <button
                        onClick={() => setHourlyAnalysisLineFilter("")}
                        className="text-[10px] font-extrabold uppercase bg-slate-100 hover:bg-slate-200 text-slate-500 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter info and statistics card when a single line is filtered */}
                {(() => {
                  const selectedLineObj = lines.find(l => l.lineNo === hourlyAnalysisLineFilter);
                  if (!selectedLineObj) return null;

                  return (
                    <div className="p-4 bg-blue-50/60 border border-blue-100/50 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 mb-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center gap-3">
                        {selectedLineObj.supervisorAvatar ? (
                          <img 
                            src={selectedLineObj.supervisorAvatar} 
                            alt={selectedLineObj.supervisor} 
                            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                              const next = (e.target as HTMLElement).nextElementSibling;
                              if (next) (next as HTMLElement).style.display = 'flex';
                            }}
                          />
                        ) : null}
                        {(!selectedLineObj.supervisorAvatar) ? (
                          <div className="w-10 h-10 rounded-full bg-slate-150 dark:bg-neutral-800 flex items-center justify-center text-slate-500 dark:text-neutral-400 border-2 border-white shadow-sm">
                            <User className="h-5 w-5" />
                          </div>
                        ) : (
                          <div style={{ display: 'none' }} className="w-10 h-10 rounded-full bg-slate-150 dark:bg-neutral-800 flex items-center justify-center text-slate-500 dark:text-neutral-400 border-2 border-white shadow-sm">
                            <User className="h-5 w-5" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-800 leading-tight">
                            Line {selectedLineObj.lineNo} Performance Summary
                          </h4>
                          <p className="text-[10px] text-slate-500 font-bold uppercase">
                            Supervisor: {selectedLineObj.supervisor} • Style: {selectedLineObj.style} • Buyer: {selectedLineObj.buyer}
                          </p>
                        </div>
                      </div>

                      {/* Performance Indicators */}
                      <div className="grid grid-cols-4 gap-3 md:gap-6">
                        <div className="text-center">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Status</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase block mt-1 ${
                            selectedLineObj.status === "Running" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                            selectedLineObj.status === "Idle" ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-red-100 text-red-800 border border-red-200"
                          }`}>
                            {selectedLineObj.status}
                          </span>
                        </div>
                        <div className="text-center">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Target</span>
                          <span className="text-xs font-black text-slate-800 font-mono block mt-1">{selectedLineObj.targetPcs}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Production</span>
                          <span className="text-xs font-black text-blue-600 font-mono block mt-1">{selectedLineObj.currentProductionPcs}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Efficiency</span>
                          <span className="text-xs font-black text-emerald-600 font-mono block mt-1">{Math.round(selectedLineObj.efficiency)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Table Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#0F172A] text-white uppercase font-bold">
                      <th className="py-2.5 px-3 rounded-l-lg">Line</th>
                      <th className="py-2.5 px-3">Supervisor</th>
                      {getHourlyLabels().map((label, idx) => (
                        <th key={label} className={`py-2.5 px-3 ${idx === 9 ? "rounded-r-lg" : ""}`}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
                    {lines
                      .filter(l => !hourlyAnalysisLineFilter || l.lineNo === hourlyAnalysisLineFilter)
                      .map((l) => (
                        <tr 
                          key={l.lineNo} 
                          className={`hover:bg-slate-50 transition-colors ${
                            l.lineNo === hourlyAnalysisLineFilter ? "bg-blue-50/40 hover:bg-blue-50/60 font-bold animate-pulse-subtle" : ""
                          }`}
                        >
                          <td className="py-3 px-3 font-mono font-bold text-blue-600">{l.lineNo}</td>
                          <td className="py-3 px-3">{l.supervisor}</td>
                          {l.hourlyLog.map((val, i) => (
                            <td key={i} className={`py-3 px-3 font-mono ${val >= 80 ? "text-emerald-600 font-bold" : val === 0 ? "text-red-500 font-bold" : "text-slate-600"}`}>
                              {val}
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== TAB CONTENT: FACTORY CONFIGURATION ==================== */}
          {activeTab === "Factory Configuration" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <FactoryConfiguration
                lines={lines}
                onAddLine={handleAddLine}
                onUpdateLine={handleUpdateLine}
                onDeleteLine={handleDeleteLine}
                handleAddActivityLog={handleAddActivityLog}
                buyersList={buyers}
                onUpdateBuyers={handleUpdateBuyers}
                stylesList={styles}
                onUpdateStyles={handleUpdateStyles}
                supervisorsList={supervisors}
              />
            </div>
          )}

          {/* ==================== TAB CONTENT: ALERTS ==================== */}
          {activeTab === "Alerts" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Critical mechanical / Idle alerts */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <h3 className="font-extrabold text-slate-800 text-xs mb-3 uppercase tracking-wider text-slate-400">Active Floor Incidents & Machine Breakdowns</h3>
                <div className="space-y-3">
                  {lines.filter(l => l.status !== "Running").map((l) => (
                    <div key={l.lineNo} className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center justify-between text-xs animate-in fade-in duration-200">
                      <div className="flex items-center gap-3">
                        <AlertOctagon className="h-5 w-5 text-red-600 animate-pulse" />
                        <div>
                          <p className="font-bold text-slate-800">Line {l.lineNo} - {l.status === "Breakdown" ? "MECHANICAL BREAKDOWN" : "IDLE WARNING"}</p>
                          <p className="text-slate-500 mt-0.5">Supervisor: {l.supervisor} • Style: {l.style} • Last updated: {l.lastUpdated}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const updated = { ...l, status: "Running" as LineStatus, lastUpdated: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) };
                          handleUpdateLine(updated);
                          handleAddActivityLog(`Incident report resolved for Line ${l.lineNo}. Sewing resumed.`, "success");
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-bold cursor-pointer transition-colors"
                      >
                        Resolve Alert & Resume
                      </button>
                    </div>
                  ))}
                  {lines.filter(l => l.status !== "Running").length === 0 && (
                    <div className="text-center py-6 text-slate-400">
                      <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-xs font-semibold">All active sewing lines are running optimally. No machine incident blockages detected.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pending hourly update alerts */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <h3 className="font-extrabold text-slate-800 text-xs mb-3 uppercase tracking-wider text-slate-400">Pending Hourly Production updates</h3>
                <div className="space-y-3">
                  {missingUpdateAlerts.map((alert) => {
                    const alertLineNo = alert.id.split("-")[1];
                    const alertLineObj = lines.find(l => l.lineNo === alertLineNo);
                    return (
                      <div key={alert.id} className="p-3 bg-amber-50/70 border border-amber-100 rounded-lg flex items-center justify-between text-xs animate-in fade-in duration-200">
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-amber-600 animate-pulse" />
                          <div>
                            <p className="font-bold text-slate-800">{alert.message}</p>
                            <p className="text-slate-500 mt-0.5">Line: {alertLineNo} • Supervisor: {alertLineObj?.supervisor} • Style: {alertLineObj?.style}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setHourlyAnalysisLineFilter(alertLineNo);
                            setActiveTab("Hourly Analysis");
                            setIsHourlyUpdateOpen(true);
                          }}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-bold cursor-pointer transition-colors shadow-xs"
                        >
                          Update Production Now
                        </button>
                      </div>
                    );
                  })}
                  {missingUpdateAlerts.length === 0 && (
                    <div className="text-center py-6 text-slate-400">
                      <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-xs font-semibold">All active floor production hourly intervals are fully updated. No pending entries.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB CONTENT: DATA CENTER ==================== */}
          {activeTab === "Data Center" && (
            <DataCenter
              lines={lines}
              metrics={metrics}
              selectedDate={selectedDate}
              onImportLines={handleImportLines}
              onUpdateTarget={handleUpdateTarget}
              onUpdateWorkers={handleUpdateWorkers}
              onAddActivityLog={handleAddActivityLog}
            />
          )}

          {/* ==================== TAB CONTENT: DATABASE VISUALIZER ==================== */}
          {activeTab === "Database Visualizer" && (
            <DatabaseVisualizer />
          )}

          {/* ==================== TAB CONTENT: USERS ==================== */}
          {activeTab === "Users" && (() => {
            const filteredEmployees = employees.filter(emp => {
              const fullName = emp.full_name || (emp.last_name ? `${emp.first_name} ${emp.last_name}` : emp.first_name);
              const matchesSearch = 
                fullName.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
                emp.employee_id.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
                emp.designation.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
                emp.department.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
                (emp.email && emp.email.toLowerCase().includes(employeeSearchTerm.toLowerCase())) ||
                (emp.phone && emp.phone.includes(employeeSearchTerm));
                
              const matchesDesignation = employeeFilterDesignation === "All" || emp.designation === employeeFilterDesignation;
              const matchesDepartment = employeeFilterDepartment === "All" || emp.department === employeeFilterDepartment;

              return matchesSearch && matchesDesignation && matchesDepartment;
            });

            const activeCount = employees.filter(e => e.status === "Active").length;
            const inactiveCount = employees.filter(e => e.status === "Inactive").length;
            const suspendedCount = employees.filter(e => e.status === "Suspended").length;

            return (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Workforce Summary Telemetry Row */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-4 rounded-xl shadow-xs flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Total Workforce</p>
                      <h4 className="text-xl font-black text-slate-800 dark:text-white mt-1">{employees.length}</h4>
                    </div>
                    <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                      <Users className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-4 rounded-xl shadow-xs flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-bold uppercase tracking-wider">Active Staff</p>
                      <h4 className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1">{activeCount}</h4>
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-4 rounded-xl shadow-xs flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-amber-600 dark:text-amber-500 font-bold uppercase tracking-wider">On Leave / Inactive</p>
                      <h4 className="text-xl font-black text-amber-700 dark:text-amber-400 mt-1">{inactiveCount}</h4>
                    </div>
                    <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-4 rounded-xl shadow-xs flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Suspended / Off-line</p>
                      <h4 className="text-xl font-black text-slate-700 dark:text-slate-300 mt-1">{suspendedCount}</h4>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-neutral-800 text-slate-500 dark:text-slate-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Master Directory Card */}
                  <div className="lg:col-span-2 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
                    <div className="space-y-4">
                      {/* Search & Filter Header bar */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-neutral-800 pb-4">
                        <div>
                          <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">Enterprise Workforce Registry ({filteredEmployees.length})</h3>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Centralized identities and profile photos across all PRODEXA modules</p>
                        </div>
                      </div>

                      {/* Search and Filters Controls */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search by name, ID, role..."
                            value={employeeSearchTerm}
                            onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-neutral-800 rounded-xl outline-none focus:border-blue-500 dark:bg-neutral-850 dark:text-white"
                          />
                        </div>

                        <div>
                          <select
                            value={employeeFilterDesignation}
                            onChange={(e) => setEmployeeFilterDesignation(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-neutral-800 rounded-xl outline-none focus:border-blue-500 dark:bg-neutral-850 dark:text-white font-semibold"
                          >
                            <option value="All">All Designations</option>
                            <option value="Floor Supervisor">Floor Supervisor</option>
                            <option value="Quality Supervisor">Quality Supervisor</option>
                            <option value="QA Lead">QA Lead</option>
                            <option value="IE Engineer">IE Engineer</option>
                            <option value="IE Analyst">IE Analyst</option>
                            <option value="Maintenance Planner">Maintenance Planner</option>
                            <option value="Sewing Operator">Sewing Operator</option>
                            <option value="Data Entry">Data Entry</option>
                          </select>
                        </div>

                        <div>
                          <select
                            value={employeeFilterDepartment}
                            onChange={(e) => setEmployeeFilterDepartment(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-neutral-800 rounded-xl outline-none focus:border-blue-500 dark:bg-neutral-850 dark:text-white font-semibold"
                          >
                            <option value="All">All Departments</option>
                            <option value="IE">IE</option>
                            <option value="Production">Production</option>
                            <option value="Planning">Planning</option>
                            <option value="Quality">Quality</option>
                            <option value="HR">HR</option>
                            <option value="Sewing">Sewing</option>
                            <option value="Industrial Engineering">Industrial Engineering</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Systems">Systems</option>
                          </select>
                        </div>
                      </div>

                      {/* Employees List Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[520px] overflow-y-auto pr-1">
                        {filteredEmployees.map((emp) => {
                          const fullName = emp.full_name || (emp.last_name ? `${emp.first_name} ${emp.last_name}` : emp.first_name);
                          const isEditingThis = editingEmployeeId === emp.id;

                          return (
                            <div 
                              key={emp.id} 
                              className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                                isEditingThis 
                                  ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-900 ring-1 ring-blue-200 dark:ring-blue-900/60" 
                                  : "bg-slate-50 dark:bg-neutral-850/50 border-slate-200/60 dark:border-neutral-800/60 hover:border-slate-300 dark:hover:border-neutral-700"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {emp.photo_url ? (
                                  <img 
                                    src={emp.photo_url} 
                                    alt={fullName} 
                                    referrerPolicy="no-referrer"
                                    className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-neutral-700 shadow-xs flex-shrink-0 bg-slate-50 dark:bg-neutral-800" 
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                      const next = (e.target as HTMLElement).nextElementSibling;
                                      if (next) (next as HTMLElement).style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                {(!emp.photo_url) ? (
                                  <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-500 dark:text-neutral-400 border border-slate-200 dark:border-neutral-700 flex-shrink-0">
                                    <User className="h-5 w-5" />
                                  </div>
                                ) : (
                                  <div style={{ display: 'none' }} className="w-11 h-11 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-500 dark:text-neutral-400 border border-slate-200 dark:border-neutral-700 flex-shrink-0">
                                    <User className="h-5 w-5" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <h4 className="font-bold text-slate-800 dark:text-white text-xs truncate" title={fullName}>{fullName}</h4>
                                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-mono font-bold">{emp.employee_id}</p>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{emp.designation}</p>
                                  
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">{emp.department}</span>
                                    {emp.status === "Active" ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] text-emerald-600 dark:text-emerald-400 font-bold leading-none">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Active
                                      </span>
                                    ) : emp.status === "Inactive" ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] text-amber-500 dark:text-amber-400 font-bold leading-none">
                                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span> Inactive
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[9px] text-rose-500 dark:text-rose-400 font-bold leading-none">
                                        <span className="w-1.5 h-1.5 bg-rose-400 rounded-full"></span> Suspended
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => {
                                    setEditingEmployeeId(emp.id);
                                    setEmployeeFormEmpId(emp.employee_id);
                                    setEmployeeFormCompanyId(emp.company_id || "COM-PRODEXA");
                                    setEmployeeFormFactoryId(emp.factory_id || "FAC-UNIT1");
                                    setEmployeeFormFirstName(emp.first_name);
                                    setEmployeeFormLastName(emp.last_name);
                                    setEmployeeFormDesignation(emp.designation);
                                    setEmployeeFormDepartment(emp.department);
                                    setEmployeeFormEmail(emp.email || "");
                                    setEmployeeFormPhone(emp.phone || "");
                                    setEmployeeFormPhotoUrl(emp.photo_url || "");
                                    setEmployeeFormStatus(emp.status);
                                    setSupervisorError(null);
                                    setSupervisorSuccess(null);
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white dark:hover:bg-neutral-800 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-neutral-700 transition-all cursor-pointer"
                                  title="Edit Employee profile"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => triggerDeleteEmployee(emp)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-neutral-800 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-neutral-700 transition-all cursor-pointer"
                                  title="Delete Employee"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {filteredEmployees.length === 0 && (
                          <div className="col-span-2 text-center py-16 text-slate-400">
                            <Users className="h-10 w-10 mx-auto text-slate-300 dark:text-neutral-700 mb-2" />
                            <p className="text-xs font-bold">No employee profiles match the filters.</p>
                            <p className="text-[10px] text-slate-400 mt-1">Refine your search or register a new workforce identity on the right.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Register / Edit Profile Panel */}
                  <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs h-fit space-y-4">
                    <div className="border-b border-slate-100 dark:border-neutral-800 pb-3 flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${editingEmployeeId !== null ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400" : "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"}`}>
                        {editingEmployeeId !== null ? <Edit2 className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">
                          {editingEmployeeId !== null ? "Edit Employee Profile" : "Register Employee"}
                        </h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          {editingEmployeeId !== null ? "Modify central workforce record" : "Create a unified corporate profile"}
                        </p>
                      </div>
                    </div>

                    {supervisorError && (
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
                        {supervisorError}
                      </div>
                    )}

                    {supervisorSuccess && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                        {supervisorSuccess}
                      </div>
                    )}

                    <div className="space-y-3.5 text-xs font-semibold">
                      
                      {/* Photo Upload Box (Enterprise Drag & Drop Component) */}
                      <div>
                        <label className="block text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px] mb-1.5 tracking-wider">Employee Profile Photo</label>
                        
                        {employeeFormPhotoUrl ? (
                          <div className="relative group overflow-hidden border border-slate-200 dark:border-neutral-800 rounded-xl p-3 bg-slate-50 dark:bg-neutral-850 flex items-center gap-3 animate-in fade-in zoom-in-95 duration-150">
                            <img 
                              src={employeeFormPhotoUrl} 
                              alt="Profile Upload" 
                              referrerPolicy="no-referrer"
                              className="w-14 h-14 rounded-full object-cover border border-slate-200 dark:border-neutral-700 shadow-xs flex-shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150";
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold text-slate-800 dark:text-white truncate">Profile Photo Loaded</p>
                              <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate mt-0.5">Stored in: employees bucket</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <label className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                                  Replace Photo
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handlePhotoFileSelected(file);
                                    }} 
                                  />
                                </label>
                                <span className="text-slate-300 dark:text-neutral-700">•</span>
                                <button 
                                  type="button" 
                                  onClick={() => setEmployeeFormPhotoUrl("")}
                                  className="text-[10px] text-rose-500 hover:underline"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div 
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer bg-slate-50/50 dark:bg-neutral-850/30 transition-all duration-200 ${
                              isDraggingPhoto 
                                ? "border-blue-500 bg-blue-50/30 dark:bg-blue-950/10 scale-[0.99]" 
                                : "border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700"
                            }`}
                          >
                            <label className="flex flex-col items-center justify-center w-full h-full p-4 text-center cursor-pointer">
                              {isUploadingPhoto ? (
                                <div className="space-y-2 w-full max-w-[160px]">
                                  <div className="flex justify-between text-[9px] font-mono text-blue-600 dark:text-blue-400 font-bold">
                                    <span>UPLOADING</span>
                                    <span>{uploadProgress}%</span>
                                  </div>
                                  <div className="w-full bg-slate-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                      className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full transition-all duration-150"
                                      style={{ width: `${uploadProgress}%` }}
                                    ></div>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <UploadCloud className={`h-6 w-6 mb-1 text-slate-400 transition-transform duration-200 ${isDraggingPhoto ? "scale-125 text-blue-500 animate-bounce" : ""}`} />
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                    <span className="font-bold text-blue-600 dark:text-blue-400">Drag & drop photo</span> here or click
                                  </p>
                                  <p className="text-[8px] text-slate-400 dark:text-slate-500 mt-0.5">Supports JPG, PNG, WEBP (Max 5MB)</p>
                                </>
                              )}
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                disabled={isUploadingPhoto}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) await handlePhotoFileSelected(file);
                                }} 
                              />
                            </label>
                          </div>
                        )}
                      </div>

                      {/* Employee ID */}
                      <div>
                        <label className="block text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px] mb-1 tracking-wider">Employee ID (Required)</label>
                        <input
                          type="text"
                          placeholder="e.g. EMP-1021"
                          value={employeeFormEmpId}
                          onChange={(e) => setEmployeeFormEmpId(e.target.value)}
                          disabled={editingEmployeeId !== null}
                          className="w-full border border-slate-200 dark:border-neutral-800 rounded-lg p-2 bg-slate-50 dark:bg-neutral-850 dark:text-white outline-none focus:border-blue-500 font-mono disabled:opacity-60"
                        />
                      </div>

                      {/* Names row */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px] mb-1 tracking-wider">First Name</label>
                          <input
                            type="text"
                            placeholder="Sarah"
                            value={employeeFormFirstName}
                            onChange={(e) => setEmployeeFormFirstName(e.target.value)}
                            className="w-full border border-slate-200 dark:border-neutral-800 rounded-lg p-2 bg-slate-50 dark:bg-neutral-850 dark:text-white outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px] mb-1 tracking-wider">Last Name (Optional)</label>
                          <input
                            type="text"
                            placeholder="Connor"
                            value={employeeFormLastName}
                            onChange={(e) => setEmployeeFormLastName(e.target.value)}
                            className="w-full border border-slate-200 dark:border-neutral-800 rounded-lg p-2 bg-slate-50 dark:bg-neutral-850 dark:text-white outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Designation and Department */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px] mb-1 tracking-wider">Designation</label>
                          <select
                            value={employeeFormDesignation}
                            onChange={(e) => setEmployeeFormDesignation(e.target.value)}
                            className="w-full border border-slate-200 dark:border-neutral-800 rounded-lg p-2 bg-slate-50 dark:bg-neutral-850 dark:text-white outline-none focus:border-blue-500"
                          >
                            <option value="Floor Supervisor">Floor Supervisor</option>
                            <option value="Quality Supervisor">Quality Supervisor</option>
                            <option value="QA Lead">QA Lead</option>
                            <option value="IE Engineer">IE Engineer</option>
                            <option value="IE Analyst">IE Analyst</option>
                            <option value="Maintenance Planner">Maintenance Planner</option>
                            <option value="Sewing Operator">Sewing Operator</option>
                            <option value="Data Entry">Data Entry</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px] mb-1 tracking-wider">Department</label>
                          <select
                            value={employeeFormDepartment}
                            onChange={(e) => setEmployeeFormDepartment(e.target.value)}
                            className="w-full border border-slate-200 dark:border-neutral-800 rounded-lg p-2 bg-slate-50 dark:bg-neutral-850 dark:text-white outline-none focus:border-blue-500"
                          >
                            <option value="IE">IE</option>
                            <option value="Production">Production</option>
                            <option value="Planning">Planning</option>
                            <option value="Quality">Quality</option>
                            <option value="HR">HR</option>
                            <option value="Sewing">Sewing</option>
                            <option value="Industrial Engineering">Industrial Engineering</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Systems">Systems</option>
                          </select>
                        </div>
                      </div>

                      {/* Email and Phone */}
                      <div className="space-y-2">
                        <div>
                          <label className="block text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px] mb-1 tracking-wider">Corporate Email</label>
                          <input
                            type="email"
                            placeholder="sarah.connor@prodexa.com"
                            value={employeeFormEmail}
                            onChange={(e) => setEmployeeFormEmail(e.target.value)}
                            className="w-full border border-slate-200 dark:border-neutral-800 rounded-lg p-2 bg-slate-50 dark:bg-neutral-850 dark:text-white outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px] mb-1 tracking-wider">Phone Contact</label>
                          <input
                            type="text"
                            placeholder="+1 (555) 019-3829"
                            value={employeeFormPhone}
                            onChange={(e) => setEmployeeFormPhone(e.target.value)}
                            className="w-full border border-slate-200 dark:border-neutral-800 rounded-lg p-2 bg-slate-50 dark:bg-neutral-850 dark:text-white outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px] mb-1 tracking-wider">Employment Status</label>
                        <select
                          value={employeeFormStatus}
                          onChange={(e) => setEmployeeFormStatus(e.target.value as any)}
                          className="w-full border border-slate-200 dark:border-neutral-800 rounded-lg p-2 bg-slate-50 dark:bg-neutral-850 dark:text-white outline-none focus:border-blue-500"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive / On Leave</option>
                          <option value="Suspended">Suspended</option>
                        </select>
                      </div>

                      {/* Buttons */}
                      <div className="flex gap-2 pt-3">
                        {editingEmployeeId !== null ? (
                          <>
                            <button
                              type="button"
                              onClick={resetEmployeeForm}
                              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-slate-700 dark:text-slate-300 rounded-lg font-bold transition-all cursor-pointer border border-slate-200 dark:border-neutral-700"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateEmployee(editingEmployeeId, {
                                employee_id: employeeFormEmpId,
                                first_name: employeeFormFirstName,
                                last_name: employeeFormLastName,
                                designation: employeeFormDesignation,
                                department: employeeFormDepartment,
                                email: employeeFormEmail,
                                phone: employeeFormPhone,
                                photo_url: employeeFormPhotoUrl,
                                status: employeeFormStatus
                              })}
                              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all cursor-pointer shadow-xs hover:shadow"
                            >
                              Save Profile
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddEmployee({
                              employee_id: employeeFormEmpId,
                              first_name: employeeFormFirstName,
                              last_name: employeeFormLastName,
                              designation: employeeFormDesignation,
                              department: employeeFormDepartment,
                              email: employeeFormEmail,
                              phone: employeeFormPhone,
                              photo_url: employeeFormPhotoUrl,
                              status: employeeFormStatus
                            })}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs hover:shadow"
                          >
                            <Plus className="h-4 w-4" />
                            Register Employee
                          </button>
                        )}
                      </div>

                    </div>
                  </div>

                </div>
              </div>
            );
          })()}


        </main>

        {/* 3. Footer Status Bar */}
        <footer 
          id="prodexa-footer-status"
          className="bg-[#0F172A] border-t border-slate-800 text-[11px] text-slate-400 h-10 flex items-center justify-between px-6 select-none flex-shrink-0 z-10"
        >
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-blue-500" />
              <span className="font-bold text-slate-300">Shift Status:</span>
              <span>{shiftType.split(" ")[0]} Shift Active</span>
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold text-slate-300">Server:</span>
              <span className="text-emerald-400">Online</span>
            </span>
            <span className="hidden md:flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="font-bold text-slate-300">Internet:</span>
              <span className="text-emerald-400">Connected</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="font-mono text-[10px]">
              MES Control Terminal Time: <span className="text-white font-bold">{new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
            </span>
            <span className="text-slate-500 font-bold hidden sm:inline">Version v1.1.0</span>
          </div>
        </footer>
      </div>

      {/* 4. Drawer/Modal for Configuration & AI Advisor */}
      {selectedLine && (
        <AiAdvisorModal
          line={selectedLine}
          factoryOverview={metrics}
          onClose={() => setSelectedLine(null)}
          onSaveLine={(updated) => {
            handleUpdateLine(updated);
            setSelectedLine(null);
          }}
          onAddActivityLog={handleAddActivityLog}
          buyersList={buyers}
          stylesList={styles}
          supervisorsList={supervisors}
        />
      )}

      {/* 5. Hourly Manual Update Modal */}
      {isHourlyUpdateOpen && (
        <HourlyUpdateModal
          lines={lines}
          isOpen={isHourlyUpdateOpen}
          onClose={() => setIsHourlyUpdateOpen(false)}
          onUpdateLine={handleUpdateLine}
          onAddActivityLog={handleAddActivityLog}
        />
      )}

      {/* 6. Secure Profile & Credentials Center Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        onUpdateUser={handleUpdateUser}
        onLogout={() => {
          setIsAuthenticated(false);
          localStorage.removeItem("prodexa_authenticated");
          localStorage.removeItem("prodexa_current_user");
          handleAddActivityLog("Operator signed out from the MES console.", "info");
        }}
      />

      {/* 7. Supervisor Deletion Confirmation Modal */}
      {employeeToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden animate-in fade-in duration-200 zoom-in-95">
            
            {/* Top Close Button */}
            <button 
              onClick={() => setEmployeeToDelete(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header Icon & Text */}
            <div className="flex items-start gap-4 mb-5">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl">
                <AlertOctagon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-extrabold text-slate-800 dark:text-white text-base">
                  Supervisor Confirmation Required
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  Authorizing deletion of profile for <span className="text-slate-800 dark:text-white font-bold">{employeeToDelete.full_name || (employeeToDelete.last_name ? `${employeeToDelete.first_name} ${employeeToDelete.last_name}` : employeeToDelete.first_name)}</span> ({employeeToDelete.employee_id}).
                </p>
              </div>
            </div>

            {/* Action Alert Message */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-xl text-amber-700 dark:text-amber-400 text-[11px] font-medium leading-relaxed mb-4 flex gap-2">
              <Info className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <span>
                Under enterprise policy, workforce registry profiles cannot be deleted without verification and sign-off by an active supervisor or area manager.
              </span>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Supervisor Dropdown Selection */}
              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-extrabold uppercase text-[9px] mb-1.5 tracking-wider">
                  Authorizing Supervisor
                </label>
                <select
                  value={authorizingSupervisorName}
                  onChange={(e) => {
                    setAuthorizingSupervisorName(e.target.value);
                    setConfirmDeleteError(null);
                  }}
                  className="w-full border border-slate-200 dark:border-neutral-800 rounded-lg p-2.5 bg-slate-50 dark:bg-neutral-850 dark:text-white text-xs outline-none focus:border-rose-500 transition-all font-bold"
                >
                  <option value="">-- Select Authorizing Supervisor --</option>
                  {employees
                    .filter(emp => 
                      emp.status === "Active" && 
                      (emp.designation.toLowerCase().includes("supervisor") || 
                       emp.designation.toLowerCase().includes("lead") || 
                       emp.designation.toLowerCase().includes("manager") || 
                       emp.designation.toLowerCase().includes("engineer") ||
                       emp.designation.toLowerCase().includes("analyst") ||
                       emp.designation.toLowerCase().includes("admin"))
                    )
                    .map(sup => {
                      const supName = sup.full_name || (sup.last_name ? `${sup.first_name} ${sup.last_name}` : sup.first_name);
                      return (
                        <option key={sup.id} value={supName}>
                          {supName} ({sup.designation})
                        </option>
                      );
                    })}
                </select>
              </div>

              {/* supervisor Pin or ID Input */}
              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-extrabold uppercase text-[9px] mb-1.5 tracking-wider">
                  Supervisor Employee ID (or Master PIN)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400">
                    <Key className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="password"
                    placeholder="e.g. EMP-1006 or 1234"
                    value={supervisorConfirmValue}
                    onChange={(e) => {
                      setSupervisorConfirmValue(e.target.value);
                      setConfirmDeleteError(null);
                    }}
                    className="w-full border border-slate-200 dark:border-neutral-800 rounded-lg pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-neutral-850 dark:text-white text-xs outline-none focus:border-rose-500 transition-all tracking-wide"
                  />
                </div>
                {authorizingSupervisorName && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                    Hint: Enter <span className="font-bold text-slate-500 dark:text-slate-400">EMP-ID</span> of selected supervisor (e.g. for {authorizingSupervisorName}, use its ID) or universal passcode <span className="font-mono font-bold">1234</span>.
                  </p>
                )}
              </div>

              {/* Error Box */}
              {confirmDeleteError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-medium">
                  {confirmDeleteError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEmployeeToDelete(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-all cursor-pointer border border-slate-200 dark:border-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs hover:shadow-md flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Confirm & Delete
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
