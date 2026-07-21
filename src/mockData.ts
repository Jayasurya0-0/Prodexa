import { ProductionLine, FactoryMetrics, ActivityLog } from "./types";

export const buyersList = [
  "ZARA",
  "H&M",
  "NEXT",
  "M&S",
  "UNIQLO",
  "ADIDAS",
  "NIKE",
  "GAP",
  "LEVI'S",
  "PUMA",
];

export const stylesList = [
  "ZRD-2405",
  "HM-1234",
  "NXT-9876",
  "MS-5432",
  "UQ-7788",
  "AD-8812",
  "NK-9921",
  "GP-0043",
  "LV-5541",
  "PM-3311",
];

export const supervisorsList = [
  { name: "James Wilson", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" },
  { name: "Michael Brown", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" },
  { name: "David Lee", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80" },
  { name: "Robert Taylor", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80" },
  { name: "Daniel Harris", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80" },
  { name: "Sarah Jenkins", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80" },
  { name: "William Davis", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80" },
  { name: "Emily Garcia", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80" },
  { name: "Kevin Martinez", avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80" },
  { name: "Anna Kovacs", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80" },
];

// Mock line data has been removed to rely 100% on the live Supabase database.

export const initialMetrics: FactoryMetrics = {
  shiftTarget: 0,
  shiftOutput: 0,
  shiftAchievement: 0,
  currentEfficiency: 0,
  totalWorkers: 0,
  currentOperators: 0,
  needleDownLines: 0,
  runningLines: 0,
  idleLines: 0,
  runningMachines: 0,
  idleMachines: 0,
};

export const initialActivities: ActivityLog[] = [
  {
    id: "act-1",
    time: "10:30 AM",
    type: "success",
    message: "Line 03 crossed 90% efficiency target consistently",
  },
  {
    id: "act-2",
    time: "10:28 AM",
    type: "error",
    message: "Line 05 Breakdown reported - Mechanics dispatched for main motor issue",
  },
  {
    id: "act-3",
    time: "10:25 AM",
    type: "success",
    message: "Line 07 met hourly target with 920 pieces output",
  },
  {
    id: "act-4",
    time: "10:22 AM",
    type: "info",
    message: "Supervisor Anna Kovacs assigned to Line 10 (Puma PM-3311)",
  },
  {
    id: "act-5",
    time: "10:20 AM",
    type: "info",
    message: "New style HM-1234 load started successfully in Line 02",
  },
];
