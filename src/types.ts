export type LineStatus = "Running" | "Idle" | "Breakdown";

export interface OvertimeLog {
  time: string; // e.g., "6 PM", "7 PM"
  pieces: number;
}

export interface ProductionLine {
  lineNo: string; // e.g., "L01"
  supervisor: string;
  supervisorAvatar: string;
  buyer: string;
  style: string;
  targetPcs: number;
  currentProductionPcs: number;
  currentHourPcs: number;
  efficiency: number;
  balancePcs: number;
  status: LineStatus;
  lastUpdated: string;
  hourlyLog: number[]; // 10 hourly data points, representing 8 AM to 5 PM
  hourlyTargetLog?: number[]; // 10 hourly target points for hour-wise efficiency
  otLog?: OvertimeLog[]; // Overtime logs
  breakTime?: string; // Customizable break time per line
}

export interface FactoryMetrics {
  shiftTarget: number;
  shiftOutput: number;
  shiftAchievement: number;
  currentEfficiency: number;
  totalWorkers: number;
  currentOperators: number;
  needleDownLines: number;
  runningLines: number;
  idleLines: number;
  runningMachines: number;
  idleMachines: number;
  productionStartTime?: string;
  productionIntervalMins?: number;
}

export interface ActivityLog {
  id: string;
  time: string;
  type: "success" | "warning" | "error" | "info";
  message: string;
}

export interface HourlyChartData {
  time: string; // e.g., "8 AM"
  [key: string]: number | string; // e.g., L01: 850, L02: 650, etc.
}

export type ActiveTab = 
  | "Dashboard" 
  | "Live Production" 
  | "Line Performance" 
  | "Hourly Analysis" 
  | "Factory Configuration" 
  | "Alerts" 
  | "Data Center"
  | "Database Visualizer"
  | "Line Leaderboard"
  | "Users";

export interface Employee {
  id: string;
  employee_id: string;
  company_id: string;
  factory_id: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  designation: string;
  department: string;
  email?: string;
  phone?: string;
  photo_url?: string;
  status: "Active" | "Inactive" | "Suspended";
  created_at?: string;
  updated_at?: string;
}

export interface RBACUser {
  id: string;
  name: string;
  username: string;
  clearance: string;
  departments: string[];
  status: "Active" | "Suspended";
  avatarGradient: string;
  avatarUrl?: string;
  password?: string;
}

