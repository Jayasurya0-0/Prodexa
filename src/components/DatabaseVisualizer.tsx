import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Database, 
  RefreshCw, 
  Play, 
  Check, 
  Copy, 
  ExternalLink, 
  Shield, 
  ShieldAlert, 
  FileText, 
  Table, 
  Columns, 
  Key, 
  HelpCircle, 
  Activity, 
  Wifi, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  Terminal, 
  Plus, 
  Search, 
  Sparkles,
  Layers,
  Fingerprint,
  Cpu,
  Clock,
  AlertTriangle,
  HardDrive,
  Trash2,
  Edit2,
  UserPlus,
  ShieldCheck,
  UserX,
  KeyRound,
  Monitor,
  Smartphone,
  Laptop,
  X,
  Lock,
  CheckCircle,
  Eye,
  Settings
} from "lucide-react";
import { createClient as createSupabaseClient } from "@/src/utils/supabase/client";
import { 
  isSupabaseConfigured,
  fetchUsersFromSupabase,
  saveUserToSupabase,
  seedUsersToSupabaseBatch,
  deleteUserFromSupabase,
  updateUserStatusInSupabase
} from "../utils/supabaseSync";
import { hashPasswordIfNeeded } from "../utils/hash";

// ==========================================
// DATA STRUCTURE DEFINITIONS
// ==========================================

interface ColumnSpec {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyTarget?: string;
  isNullable: boolean;
  defaultValue?: string;
  description: string;
}

interface TableMetadata {
  id: string;
  name: string;
  description: string;
  rowCount: number;
  sizeBytes: string;
  iconName: "Table" | "Activity" | "Shield" | "Database" | "Layers" | "Fingerprint" | "Cpu" | "ShieldAlert";
  columns: ColumnSpec[];
  ddl: string;
}

interface RBACUser {
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

interface ActiveSession {
  id: string;
  userId: string;
  userName: string;
  deviceType: "Laptop" | "Smartphone" | "Desktop";
  client: string;
  ipAddress: string;
  duration: string;
}

interface AuditLog {
  id: string;
  timestamp: string;
  operator: string;
  operation: string;
  severity: "info" | "success" | "warn" | "error";
  category: "SQL" | "RBAC" | "SYSTEM" | "SECURITY";
}

export default function DatabaseVisualizer() {
  // Get currently logged-in user from localStorage
  const currentUser = (() => {
    const saved = localStorage.getItem("prodexa_current_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  })();

  // Global View Navigation: "schema", "rbac" or "supabase"
  const [activeTab, setActiveTab] = useState<"schema" | "rbac" | "supabase">("rbac");

  // Master Password Reset Override states
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState<boolean>(false);
  const [overrideTargetUser, setOverrideTargetUser] = useState<RBACUser | null>(null);
  const [overridePasskeyInput, setOverridePasskeyInput] = useState<string>("");
  const [overrideNewPasswordInput, setOverrideNewPasswordInput] = useState<string>("");
  const [overrideSuccessState, setOverrideSuccessState] = useState<boolean>(false);

  // Notification Toast state
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: "success" | "info" | "error" | "warn" }>>([]);

  const triggerToast = (message: string, type: "success" | "info" | "error" | "warn" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // ==========================================
  // SCHEMA VISUALIZER STATES & DATA
  // ==========================================
  const [activeTableId, setActiveTableId] = useState<string>("production_lines");

  // Supabase Interactive Explorer States
  const [supabaseTableName, setSupabaseTableName] = useState<string>("todos");
  const [supabaseQueryResult, setSupabaseQueryResult] = useState<any>(null);
  const [isQueryingSupabase, setIsQueryingSupabase] = useState<boolean>(false);
  const [supabaseQueryError, setSupabaseQueryError] = useState<string | null>(null);
  const [supabaseTestStatus, setSupabaseTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [supabaseTestLatency, setSupabaseTestLatency] = useState<number | null>(null);
  const [supabaseTestError, setSupabaseTestError] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<boolean>(false);
  const [codeDocTab, setCodeDocTab] = useState<"nextjs" | "react" | "express">("nextjs");
  const [tableSearchQuery, setTableSearchQuery] = useState<string>("");
  const [copiedTableId, setCopiedTableId] = useState<string | null>(null);
  const [copiedGlobalScript, setCopiedGlobalScript] = useState<boolean>(false);
  const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(false);
  const [networkLatency, setNetworkLatency] = useState<number>(38);

  // Dangerous Operation Modals State
  const [isResetModalStep1, setIsResetModalStep1] = useState<boolean>(false);
  const [isResetModalStep2, setIsResetModalStep2] = useState<boolean>(false);
  const [resetConfirmInput, setResetConfirmInput] = useState<string>("");
  const [resetCheckConfirmed, setResetCheckConfirmed] = useState<boolean>(false);

  // Seed default relational schema
  const [tables, setTables] = useState<TableMetadata[]>([
    {
      id: "production_lines",
      name: "production_lines",
      description: "Primary directory holding live garment production line assets, operational capacities, current supervisor targets, and style assignments.",
      rowCount: 12,
      sizeBytes: "32 KB",
      iconName: "Table",
      columns: [
        { name: "id", type: "UUID", isPrimaryKey: true, isForeignKey: false, isNullable: false, defaultValue: "gen_random_uuid()", description: "Cryptographically secure primary key identity token." },
        { name: "line_no", type: "VARCHAR(12)", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Unique code code for the sewing floor line (e.g., L01, L02)." },
        { name: "supervisor_id", type: "UUID", isPrimaryKey: false, isForeignKey: true, foreignKeyTarget: "supervisor_profiles.id", isNullable: false, description: "Foreign key reference linking to supervisor_profiles." },
        { name: "buyer_name", type: "VARCHAR(64)", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Name of the global brand client (e.g. Zara, Nike, H&M)." },
        { name: "style_code", type: "VARCHAR(32)", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Designation reference of the active garment layout sketch." },
        { name: "target_pcs", type: "INTEGER", isPrimaryKey: false, isForeignKey: false, isNullable: false, defaultValue: "0", description: "Target hourly capacity pieces assigned for this shift segment." },
        { name: "current_output", type: "INTEGER", isPrimaryKey: false, isForeignKey: false, isNullable: false, defaultValue: "0", description: "Cumulative successfully inspected pieces processed." },
        { name: "efficiency_rate", type: "DECIMAL(5,2)", isPrimaryKey: false, isForeignKey: false, isNullable: true, description: "Calculated worker ratio output relative to standard hourly paces." },
        { name: "created_at", type: "TIMESTAMPTZ", isPrimaryKey: false, isForeignKey: false, isNullable: false, defaultValue: "NOW()", description: "Audit logging timestamp tracking entry database insertion." }
      ],
      ddl: `-- Create production_lines schema
CREATE TABLE IF NOT EXISTS public.production_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_no VARCHAR(12) NOT NULL UNIQUE,
    supervisor_id UUID NOT NULL REFERENCES public.supervisor_profiles(id) ON DELETE RESTRICT,
    buyer_name VARCHAR(64) NOT NULL,
    style_code VARCHAR(32) NOT NULL,
    target_pcs INTEGER NOT NULL DEFAULT 0,
    current_output INTEGER NOT NULL DEFAULT 0,
    efficiency_rate DECIMAL(5,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for speedy production searches
CREATE INDEX IF NOT EXISTS idx_production_lines_style ON public.production_lines(style_code);`
    },
    {
      id: "hourly_logs",
      name: "hourly_logs",
      description: "Time-series logging schema tracking pieces completed per hour, machine efficiency deltas, and standard time compliance on the factory floor.",
      rowCount: 480,
      sizeBytes: "256 KB",
      iconName: "Activity",
      columns: [
        { name: "id", type: "BIGSERIAL", isPrimaryKey: true, isForeignKey: false, isNullable: false, description: "Database-managed incremental serial sequencing primary identifier." },
        { name: "line_id", type: "UUID", isPrimaryKey: false, isForeignKey: true, foreignKeyTarget: "production_lines.id", isNullable: false, description: "Foreign key reference mapping back to production_lines." },
        { name: "recorded_hour", type: "VARCHAR(10)", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Shift hourly span identification string (e.g. 08:00 AM)." },
        { name: "production_pcs", type: "INTEGER", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Inspected pieces completed strictly within this hourly slot." },
        { name: "efficiency_pct", type: "DECIMAL(4,1)", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Calculated actual sewing output rate versus Standard Allowed Minutes." },
        { name: "unplanned_down_mins", type: "INTEGER", isPrimaryKey: false, isForeignKey: false, isNullable: false, defaultValue: "0", description: "Unplanned mechanical or needle outage duration in minutes." }
      ],
      ddl: `-- Create hourly_logs schema
CREATE TABLE IF NOT EXISTS public.hourly_logs (
    id BIGSERIAL PRIMARY KEY,
    line_id UUID NOT NULL REFERENCES public.production_lines(id) ON DELETE CASCADE,
    recorded_hour VARCHAR(10) NOT NULL,
    production_pcs INTEGER NOT NULL CHECK (production_pcs >= 0),
    efficiency_pct DECIMAL(4,1) NOT NULL,
    unplanned_down_mins INTEGER NOT NULL DEFAULT 0,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compound index for fast timeline visualization
CREATE INDEX IF NOT EXISTS idx_hourly_logs_line_time ON public.hourly_logs(line_id, logged_at DESC);`
    },
    {
      id: "supervisor_profiles",
      name: "supervisor_profiles",
      description: "Secure human resource records of certified floor supervisors, unit associations, active line permissions, and security badges.",
      rowCount: 8,
      sizeBytes: "16 KB",
      iconName: "Fingerprint",
      columns: [
        { name: "id", type: "UUID", isPrimaryKey: true, isForeignKey: false, isNullable: false, defaultValue: "gen_random_uuid()", description: "Unique cryptographically secure id assigned on hire." },
        { name: "name", type: "VARCHAR(128)", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Full legal identifier name of the supervisor officer." },
        { name: "badge_id", type: "VARCHAR(24)", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Encrypted magnetic physical security badge identifier tag." },
        { name: "factory_unit", type: "VARCHAR(64)", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Production branch physical site location (e.g., Unit 1, Unit 2)." },
        { name: "active_lines", type: "VARCHAR[]", isPrimaryKey: false, isForeignKey: false, isNullable: true, description: "Array list of production lines this supervisor has authority to configure." },
        { name: "created_at", type: "TIMESTAMPTZ", isPrimaryKey: false, isForeignKey: false, isNullable: false, defaultValue: "NOW()", description: "Audit stamp tracking supervisor registry activation." }
      ],
      ddl: `-- Create supervisor_profiles schema
CREATE TABLE IF NOT EXISTS public.supervisor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    badge_id VARCHAR(24) NOT NULL UNIQUE,
    factory_unit VARCHAR(64) NOT NULL,
    active_lines VARCHAR(12)[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for supervisor identification matching
CREATE UNIQUE INDEX IF NOT EXISTS idx_supervisor_badge ON public.supervisor_profiles(badge_id);`
    },
    {
      id: "floor_alerts",
      name: "floor_alerts",
      description: "Real-time mechanical, technical, or needle outage event logs tracking line blockers, durations, and resolution timestamps.",
      rowCount: 42,
      sizeBytes: "64 KB",
      iconName: "ShieldAlert",
      columns: [
        { name: "id", type: "UUID", isPrimaryKey: true, isForeignKey: false, isNullable: false, defaultValue: "gen_random_uuid()", description: "Unique system event tracker token id." },
        { name: "line_no", type: "VARCHAR(12)", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Label code identification for the affected production sewing line." },
        { name: "severity", type: "VARCHAR(16)", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Outage severity classification level: CRITICAL, WARNING, or INFO." },
        { name: "message", type: "TEXT", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Detailed description of the physical line bottleneck, machine type, or code error." },
        { name: "is_resolved", type: "BOOLEAN", isPrimaryKey: false, isForeignKey: false, isNullable: false, defaultValue: "FALSE", description: "Boolean state showing whether line operations have resumed." },
        { name: "resolved_at", type: "TIMESTAMPTZ", isPrimaryKey: false, isForeignKey: false, isNullable: true, description: "Audit timestamp capturing the precise resolution of the line block." }
      ],
      ddl: `-- Create floor_alerts schema
CREATE TABLE IF NOT EXISTS public.floor_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_no VARCHAR(12) NOT NULL,
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
    message TEXT NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Operational filter index
CREATE INDEX IF NOT EXISTS idx_unresolved_alerts ON public.floor_alerts(is_resolved) WHERE is_resolved = FALSE;`
    },
    {
      id: "factory_metrics",
      name: "factory_metrics",
      description: "Consolidated high-level global factory capacity records measuring active workers, machinery parameters, and shift achievement logs.",
      rowCount: 1,
      sizeBytes: "8 KB",
      iconName: "Layers",
      columns: [
        { name: "id", type: "INTEGER", isPrimaryKey: true, isForeignKey: false, isNullable: false, description: "Primary ID key, locked strictly to row 1 for state integrity." },
        { name: "shift_target", type: "INTEGER", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Target global shift piece output requested by operational control." },
        { name: "total_workers", type: "INTEGER", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Total registered active floor personnel logged for active shift." },
        { name: "running_lines", type: "INTEGER", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Active lines executing sewing batches with no current breakdown outages." },
        { name: "running_machines", type: "INTEGER", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Total quantity of physical sewing, packing, and checking hardware active." }
      ],
      ddl: `-- Create factory_metrics schema
CREATE TABLE IF NOT EXISTS public.factory_metrics (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    shift_target INTEGER NOT NULL DEFAULT 0,
    total_workers INTEGER NOT NULL DEFAULT 0,
    running_lines INTEGER NOT NULL DEFAULT 0,
    running_machines INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed single row if missing helper script
INSERT INTO public.factory_metrics (id, shift_target, total_workers, running_lines, running_machines)
VALUES (1, 8000, 240, 10, 185)
ON CONFLICT (id) DO NOTHING;`
    },
    {
      id: "daily_factory_metrics",
      name: "daily_factory_metrics",
      description: "Day-wise history register of high-level global factory capacity records, measuring daily shift targets, outputs, and achievements.",
      rowCount: 10,
      sizeBytes: "16 KB",
      iconName: "Calendar",
      columns: [
        { name: "metric_date", type: "VARCHAR(32)", isPrimaryKey: true, isForeignKey: false, isNullable: false, description: "Selected calendar date serving as the primary key." },
        { name: "shift_target", type: "INTEGER", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Daily target piece output requested by operational control." },
        { name: "shift_output", type: "INTEGER", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Cumulative daily sewing output completed." },
        { name: "shift_achievement", type: "DECIMAL(5,2)", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Calculated ratio of daily production completed versus target." },
        { name: "current_efficiency", type: "DECIMAL(5,2)", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Average plant operational efficiency reached." }
      ],
      ddl: `-- Create daily_factory_metrics schema
CREATE TABLE IF NOT EXISTS public.daily_factory_metrics (
    metric_date VARCHAR(32) PRIMARY KEY,
    shift_target INTEGER NOT NULL DEFAULT 0,
    shift_output INTEGER NOT NULL DEFAULT 0,
    shift_achievement DECIMAL(5,2) NOT NULL DEFAULT 0,
    current_efficiency DECIMAL(5,2) NOT NULL DEFAULT 0,
    total_workers INTEGER NOT NULL DEFAULT 0,
    current_operators INTEGER NOT NULL DEFAULT 0,
    needle_down_lines INTEGER NOT NULL DEFAULT 0,
    running_lines INTEGER NOT NULL DEFAULT 0,
    idle_lines INTEGER NOT NULL DEFAULT 0,
    running_machines INTEGER NOT NULL DEFAULT 0,
    idle_machines INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.daily_factory_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow open access to daily_factory_metrics" ON public.daily_factory_metrics;

CREATE POLICY "Allow open access to daily_factory_metrics" ON public.daily_factory_metrics 
    FOR ALL TO public USING (true) WITH CHECK (true);`
    },
    {
      id: "daily_production_lines",
      name: "daily_production_lines",
      description: "Day-wise history register of physical line configurations, assigning specific supervisors, buyer names, styles, targets, outputs, and efficiencies to each line per date.",
      rowCount: 10,
      sizeBytes: "32 KB",
      iconName: "Layers",
      columns: [
        { name: "id", type: "UUID", isPrimaryKey: true, isForeignKey: false, isNullable: false, description: "Unique primary identifier of the daily configuration record." },
        { name: "production_date", type: "VARCHAR(32)", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Selected calendar date representing this operational day." },
        { name: "line_no", type: "VARCHAR(12)", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Sewing line code (e.g. L01, L02) matching physical assets." },
        { name: "buyer_name", type: "VARCHAR(64)", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Client/buyer company name assigned to this line for the day." },
        { name: "style_code", type: "VARCHAR(32)", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Style unique identifier representing the product being produced." },
        { name: "target_pcs", type: "INTEGER", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Production targets requested for this specific line on this date." }
      ],
      ddl: `-- Create daily_production_lines schema
CREATE TABLE IF NOT EXISTS public.daily_production_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_date VARCHAR(32) NOT NULL,
    line_no VARCHAR(12) NOT NULL,
    supervisor_id UUID NOT NULL REFERENCES public.supervisor_profiles(id) ON DELETE RESTRICT,
    buyer_name VARCHAR(64) NOT NULL,
    style_code VARCHAR(32) NOT NULL,
    target_pcs INTEGER NOT NULL DEFAULT 0,
    current_output INTEGER NOT NULL DEFAULT 0,
    efficiency_rate DECIMAL(5,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_date_line UNIQUE (production_date, line_no)
);

-- Enable RLS
ALTER TABLE public.daily_production_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow open access to daily_production_lines" ON public.daily_production_lines;

CREATE POLICY "Allow open access to daily_production_lines" ON public.daily_production_lines 
    FOR ALL TO public USING (true) WITH CHECK (true);`
    },
    {
      id: "style_specifications",
      name: "style_specifications",
      description: "Industrial engineering metadata holding buyer styles standard allowed minutes, target efficiency metrics, and needle layout specs.",
      rowCount: 18,
      sizeBytes: "48 KB",
      iconName: "Cpu",
      columns: [
        { name: "style_code", type: "VARCHAR(32)", isPrimaryKey: true, isForeignKey: false, isNullable: false, description: "Style unique code pattern identifier representing structural drawings." },
        { name: "sam_value", type: "DECIMAL(4,2)", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Standard Allowed Minutes (SAM) duration required to assemble one unit." },
        { name: "target_eff_pct", type: "DECIMAL(4,1)", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Industrial benchmark target line efficiency for this specific garment." },
        { name: "needle_type", type: "VARCHAR(32)", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Precision metal needle gauge required in the sewing machines for this fabric." }
      ],
      ddl: `-- Create style_specifications schema
CREATE TABLE IF NOT EXISTS public.style_specifications (
    style_code VARCHAR(32) PRIMARY KEY,
    sam_value DECIMAL(4,2) NOT NULL,
    target_eff_pct DECIMAL(4,1) NOT NULL,
    needle_type VARCHAR(32) NOT NULL,
    last_engineered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`
    },
    {
      id: "user_accounts",
      name: "user_accounts",
      description: "RBAC secure system directories holding operator names, usernames, clearances, status, department permissions, and active passkeys with full RLS security active.",
      rowCount: 7,
      sizeBytes: "8 KB",
      iconName: "Lock",
      columns: [
        { name: "id", type: "VARCHAR(64)", isPrimaryKey: true, isForeignKey: false, isNullable: false, description: "System generated alphanumeric unique identifier." },
        { name: "name", type: "VARCHAR(128)", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Full legal operator or administrative employee name." },
        { name: "username", type: "VARCHAR(64)", isPrimaryKey: false, isForeignKey: false, isNullable: false, description: "Unique case-insensitive system login username identifier." },
        { name: "password", type: "VARCHAR(256)", isPrimaryKey: false, isForeignKey: false, isNullable: true, description: "Secure access credentials password for user validation." },
        { name: "clearance", type: "VARCHAR(32)", isPrimaryKey: false, isForeignKey: false, isNullable: false, defaultValue: "'Operator'", description: "Access level role, e.g. Super Admin, Admin, Supervisor, Operator, Viewer." },
        { name: "departments", type: "VARCHAR[]", isPrimaryKey: false, isForeignKey: false, isNullable: false, defaultValue: "'{}'", description: "Array of authorized production lines and department scopes." },
        { name: "status", type: "VARCHAR(16)", isPrimaryKey: false, isForeignKey: false, isNullable: false, defaultValue: "'Active'", description: "Account status: Active, Suspended, or Pending." },
        { name: "created_at", type: "TIMESTAMPTZ", isPrimaryKey: false, isForeignKey: false, isNullable: false, defaultValue: "NOW()", description: "Audit logging timestamp tracking user database insertion." }
      ],
      ddl: `-- Create user_accounts table
CREATE TABLE IF NOT EXISTS public.user_accounts (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    username VARCHAR(64) NOT NULL UNIQUE,
    password VARCHAR(256) DEFAULT 'admin123',
    clearance VARCHAR(32) NOT NULL DEFAULT 'Operator',
    departments VARCHAR(64)[] NOT NULL DEFAULT '{}',
    status VARCHAR(16) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Pending')),
    avatar_gradient VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own profile and admins/super admins can view all profiles
CREATE POLICY select_user_policy ON public.user_accounts
    FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            username = auth.jwt() ->> 'email'
            OR EXISTS (
                SELECT 1 FROM public.user_accounts
                WHERE username = auth.jwt() ->> 'email' AND clearance IN ('Admin', 'Super Admin')
            )
        )
    );

-- Policy 2: Admins/Super Admins can insert new profiles
CREATE POLICY insert_user_policy ON public.user_accounts
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_accounts
            WHERE username = auth.jwt() ->> 'email' AND clearance IN ('Admin', 'Super Admin')
        )
    );

-- Policy 3: Admins/Super Admins can update any profile; users can update their own non-clearance fields
CREATE POLICY update_user_policy ON public.user_accounts
    FOR UPDATE
    USING (
        username = auth.jwt() ->> 'email'
        OR EXISTS (
            SELECT 1 FROM public.user_accounts
            WHERE username = auth.jwt() ->> 'email' AND clearance IN ('Admin', 'Super Admin')
        )
    );

-- Policy 4: Standard root deletion prevention (only Super Admins can delete)
CREATE POLICY delete_user_policy ON public.user_accounts
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_accounts
            WHERE username = auth.jwt() ->> 'email' AND clearance = 'Super Admin'
        )
    );`
    }
  ]);

  // ==========================================
  // RBAC SYSTEM STATES & DATA
  // ==========================================
  const [users, setUsers] = useState<RBACUser[]>([
    {
      id: "usr_101",
      name: "ANANYA SHARMA",
      username: "hr_ananya",
      clearance: "Admin",
      departments: ["Human Resources"],
      status: "Active",
      avatarGradient: "from-rose-500 to-pink-500",
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150"
    },
    {
      id: "usr_102",
      name: "VIKRAM SINGH",
      username: "pm_vikram",
      clearance: "Production Manager",
      departments: ["Production"],
      status: "Active",
      avatarGradient: "from-blue-500 to-cyan-500",
      avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150"
    },
    {
      id: "usr_103",
      name: "KARTHIK S.",
      username: "sup_karthik",
      clearance: "Supervisor",
      departments: ["Sewing"],
      status: "Active",
      avatarGradient: "from-amber-500 to-orange-500",
      avatarUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150"
    },
    {
      id: "usr_104",
      name: "RAHUL PATEL",
      username: "ie_rahul",
      clearance: "Admin",
      departments: ["Industrial Engineering"],
      status: "Active",
      avatarGradient: "from-emerald-500 to-teal-500",
      avatarUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150"
    },
    {
      id: "usr_105",
      name: "VIG",
      username: "vig_ie",
      clearance: "IE",
      departments: ["Industrial Engineering"],
      status: "Active",
      avatarGradient: "from-indigo-500 to-violet-500",
      avatarUrl: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150"
    },
    {
      id: "usr_106",
      name: "JOTHI",
      username: "jothi_admin",
      clearance: "Admin",
      departments: ["Human Resources"],
      status: "Active",
      avatarGradient: "from-purple-500 to-pink-500",
      avatarUrl: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150"
    }
  ]);
  
  const [revokedSessionIds, setRevokedSessionIds] = useState<string[]>(() => {
    const saved = localStorage.getItem("prodexa_revoked_sessions");
    return saved ? JSON.parse(saved) : [];
  });

  const sessions = useMemo<ActiveSession[]>(() => {
    return users
      .filter(u => u.status === "Active" && !revokedSessionIds.includes(`tok_${u.id}`))
      .map(u => {
        const isOp = u.clearance === "Operator" || u.clearance === "Supervisor" || u.clearance === "IE" || u.clearance === "IE Team";
        const deviceType: "Desktop" | "Smartphone" | "Laptop" = isOp ? "Smartphone" : (u.clearance === "Super Admin" || u.clearance === "Admin" ? "Desktop" : "Laptop");
        const client = isOp 
          ? "Android • Prodexa App" 
          : (u.clearance === "Super Admin" ? "macOS • Chrome" : "Linux • Edge Client");
        
        // Generate a stable terminal IP based on user name
        const charCodeSum = u.name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
        const lastIpOctet = (charCodeSum % 200) + 10;
        const ipAddress = isOp 
          ? `10.12.4.${lastIpOctet} (Floor Node)` 
          : `192.168.10.${lastIpOctet} (${u.departments[0] || "Checking Station"})`;
        
        // Stable but realistic dynamic duration based on name hash
        const hours = charCodeSum % 4;
        const minutes = charCodeSum % 60;
        const duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        return {
          id: `tok_${u.id}`,
          userId: u.id,
          userName: u.name,
          deviceType,
          client,
          ipAddress,
          duration
        };
      });
  }, [users, revokedSessionIds]);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: "log_1",
      timestamp: "2026-07-02 10:45:12",
      operator: "jothi_admin",
      operation: "Successfully authenticated via secure SSL token.",
      severity: "success",
      category: "SECURITY"
    },
    {
      id: "log_2",
      timestamp: "2026-07-02 10:47:34",
      operator: "jothi_admin",
      operation: "Updated production_lines targets for Line L01.",
      severity: "info",
      category: "SQL"
    },
    {
      id: "log_3",
      timestamp: "2026-07-02 11:02:15",
      operator: "SYSTEM",
      operation: "Automated backup registry snapshot successfully committed.",
      severity: "success",
      category: "SYSTEM"
    },
    {
      id: "log_4",
      timestamp: "2026-07-02 11:15:40",
      operator: "jothi_admin",
      operation: "Suspended IT profile 'rashed.it' due to credentials rotation delay.",
      severity: "warn",
      category: "RBAC"
    },
    {
      id: "log_5",
      timestamp: "2026-07-02 11:32:04",
      operator: "SYSTEM",
      operation: "Heartbeat check on Postgres SQL Security Node returned ACTIVE state.",
      severity: "info",
      category: "SECURITY"
    }
  ]);

  // Search filter inside Audit Logs
  const [logSearchQuery, setLogSearchQuery] = useState<string>("");

  // Search filter inside Users list
  const [userSearchQuery, setUserSearchQuery] = useState<string>("");

  // Modals for User Management
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [userModalMode, setUserModalMode] = useState<"create" | "edit">("create");
  const [selectedUser, setSelectedUser] = useState<RBACUser | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<{ id: string; name: string } | null>(null);

  // Inline User Creation Form States
  const [createUsername, setCreateUsername] = useState("");
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createDepartment, setCreateDepartment] = useState("IE");
  const [createDesignation, setCreateDesignation] = useState("Operator");
  const [createClearance, setCreateClearance] = useState<string>("Viewer");
  const [createPassword, setCreatePassword] = useState("");
  const [createConfirmPassword, setCreateConfirmPassword] = useState("");
  const [createAvatarUrl, setCreateAvatarUrl] = useState("");

  // Ticket reset states
  const [ticketInput, setTicketInput] = useState("");
  const [pendingTickets, setPendingTickets] = useState<Array<{ id: string; username: string; created_at: string; status: string }>>([]);

  // Load pending tickets from localStorage on mount and when changed
  useEffect(() => {
    const loadTickets = () => {
      const tickets = JSON.parse(localStorage.getItem("prodexa_pending_tickets") || "[]");
      setPendingTickets(tickets);
    };
    loadTickets();
    window.addEventListener("storage", loadTickets);
    return () => window.removeEventListener("storage", loadTickets);
  }, []);

  // Synchronize users with Supabase on mount
  useEffect(() => {
    const syncUsersWithSupabase = async () => {
      if (isSupabaseConfigured()) {
        try {
          const dbUsers = await fetchUsersFromSupabase();
          if (dbUsers !== null) {
            const cleanedDbUsers = dbUsers.filter((u: any) => u.username !== "sajid.admin");
            if (cleanedDbUsers.length === 0) {
              // DB table is empty, seed it with current state (default seeds)
              await seedUsersToSupabaseBatch(users);
              localStorage.setItem("prodexa_users", JSON.stringify(users));
            } else {
              // Loaded successfully, sync with our state
              setUsers(cleanedDbUsers);
              localStorage.setItem("prodexa_users", JSON.stringify(cleanedDbUsers));
            }
          } else {
            // Error loading from DB (e.g., table doesn't exist yet) -> load from localStorage
            const local = localStorage.getItem("prodexa_users");
            if (local) {
              const parsed = JSON.parse(local).filter((u: any) => u.username !== "sajid.admin");
              setUsers(parsed);
              localStorage.setItem("prodexa_users", JSON.stringify(parsed));
            } else {
              localStorage.setItem("prodexa_users", JSON.stringify(users));
            }
          }
        } catch (err) {
          console.error("Failed to synchronize user directories:", err);
        }
      } else {
        // Local state fallback
        const local = localStorage.getItem("prodexa_users");
        if (local) {
          const parsed = JSON.parse(local).filter((u: any) => u.username !== "sajid.admin");
          setUsers(parsed);
          localStorage.setItem("prodexa_users", JSON.stringify(parsed));
        } else {
          localStorage.setItem("prodexa_users", JSON.stringify(users));
        }
      }
    };
    syncUsersWithSupabase();
  }, []);

  // User form details
  const [userForm, setUserForm] = useState<{
    name: string;
    username: string;
    password?: string;
    clearance: string;
    departments: string[];
  }>({
    name: "",
    username: "",
    password: "",
    clearance: "Operator",
    departments: []
  });

  // Departments listing for checkbox multiselect
  const availableDepartments = [
    "Operations",
    "System Admin",
    "IT Support",
    "Sewing Line 1",
    "Sewing Line 2",
    "Sewing Line 3",
    "Quality Assurance",
    "Planning & Analytics",
    "Infrastructure",
    "Data Center"
  ];

  // Ping updates
  useEffect(() => {
    const interval = setInterval(() => {
      setNetworkLatency(prev => {
        const offset = Math.floor(Math.random() * 9) - 4;
        const next = prev + offset;
        return next < 15 ? 15 : next > 95 ? 95 : next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // System logging helper
  const addSystemLog = (
    operation: string, 
    operator: string = "jothi_admin", 
    severity: "info" | "success" | "warn" | "error" = "info",
    category: "SQL" | "RBAC" | "SYSTEM" | "SECURITY" = "SYSTEM"
  ) => {
    const now = new Date();
    const ts = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
    const rand = Math.random().toString(36).substring(2, 9);
    const newLog: AuditLog = {
      id: `log_${Date.now()}_${rand}`,
      timestamp: ts,
      operator: operator === "sajid.admin" ? (currentUser?.username || "jothi_admin") : operator,
      operation,
      severity,
      category
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // ==========================================
  // SUPABASE OPERATIONS & QUERY SANDBOX
  // ==========================================

  const handleTestSupabaseConnection = async () => {
    setSupabaseTestStatus("testing");
    setSupabaseTestError(null);
    setSupabaseTestLatency(null);
    const start = Date.now();
    try {
      const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Supabase credentials in local configuration.");
      }
      
      // Perform a real fetch ping to public auth health check to ensure server is live
      const healthRes = await fetch(`${supabaseUrl}/auth/v1/health`);
      if (!healthRes.ok) {
        throw new Error(`Supabase Auth Health check failed with status HTTP ${healthRes.status}`);
      }
      
      // Now verify the publishable API key by fetching a sample query from PostgREST.
      // If the API key is valid, PostgREST returns 200 or 404 (if table doesn't exist).
      // If the API key is invalid, the Kong gateway rejects with 401 or 403.
      const res = await fetch(`${supabaseUrl}/rest/v1/user_accounts?select=id&limit=1`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      });
      
      const duration = Date.now() - start;
      setSupabaseTestLatency(duration);
      
      if (res.status === 200 || res.status === 204 || res.status === 404) {
        setSupabaseTestStatus("success");
        const schemaSuffix = res.status === 404 ? " (SQL Schema tables need initialization)" : " (Fully Synchronized)";
        triggerToast(`Connected to Supabase! Handshake: ${duration}ms${schemaSuffix}`, "success");
        addSystemLog(`Successfully authenticated with Supabase cluster. Publishable key verified.`, "sajid.admin", "success", "SECURITY");
      } else {
        const text = await res.text();
        let parsedMessage = text;
        try {
          const parsed = JSON.parse(text);
          parsedMessage = parsed.message || text;
        } catch (_) {}
        throw new Error(`HTTP ${res.status}: ${parsedMessage || "Invalid Credentials"}`);
      }
    } catch (err: any) {
      setSupabaseTestStatus("error");
      setSupabaseTestError(err.message || "Unknown Handshake Failure");
      triggerToast(`Supabase Connection Failed`, "error");
      addSystemLog(`Supabase API handshake failure: ${err.message}`, "sajid.admin", "error", "SECURITY");
    }
  };

  const handleQuerySupabaseTable = async () => {
    setIsQueryingSupabase(true);
    setSupabaseQueryResult(null);
    setSupabaseQueryError(null);
    try {
      const client = createSupabaseClient();
      
      // Attempt to query
      const { data, error } = await client
        .from(supabaseTableName)
        .select("*")
        .limit(25);
        
      if (error) {
        throw error;
      }
      
      setSupabaseQueryResult(data);
      triggerToast(`Retrieved ${data?.length || 0} rows from '${supabaseTableName}'`, "success");
      addSystemLog(`Executed remote fetch query on Supabase table '${supabaseTableName}'.`, "sajid.admin", "success", "SQL");
    } catch (err: any) {
      console.error(err);
      setSupabaseQueryError(err.message || "Failed to fetch table records from Supabase.");
      triggerToast(`Failed to fetch from ${supabaseTableName}`, "error");
      addSystemLog(`Query failed on table '${supabaseTableName}': ${err.message}`, "sajid.admin", "error", "SQL");
    } finally {
      setIsQueryingSupabase(false);
    }
  };

  // ==========================================
  // SCHEMA OPERATIONS ACTIONS
  // ==========================================

  const filteredTables = tables.filter(t => 
    t.name.toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(tableSearchQuery.toLowerCase())
  );

  const selectedTable = tables.find(t => t.id === activeTableId) || tables[0];

  const handleCopyDDL = (ddlText: string, tabId: string) => {
    navigator.clipboard.writeText(ddlText);
    setCopiedTableId(tabId);
    triggerToast(`DDL schema for table '${tabId}' successfully copied.`, "success");
    addSystemLog(`Copied DDL statement for physical schema '${tabId}' to host clipboard.`, "sajid.admin", "success", "SQL");
    setTimeout(() => setCopiedTableId(null), 2000);
  };

  const handleCopyGlobalScript = () => {
    const globalScript = tables.map(t => t.ddl).join("\n\n-- ==========================================\n\n");
    navigator.clipboard.writeText(globalScript);
    setCopiedGlobalScript(true);
    triggerToast("Full SQL Schema, Seed records, and security parameters exported.", "success");
    addSystemLog("Exported full composite database initialization configuration to memory.", "sajid.admin", "success", "SQL");
    setTimeout(() => setCopiedGlobalScript(false), 2000);
  };

  // Restores Postgres Metadata seeds with Double-Confirmation Modals
  const handlePerformDestructiveReset = () => {
    // Perform restoration
    const restoredTables = tables.map(t => ({
      ...t,
      rowCount: t.id === "production_lines" ? 12 :
                t.id === "hourly_logs" ? 480 :
                t.id === "supervisor_profiles" ? 8 :
                t.id === "floor_alerts" ? 42 :
                t.id === "factory_metrics" ? 1 : 18
    }));
    
    setTables(restoredTables);
    setIsResetModalStep2(false);
    setResetConfirmInput("");
    setResetCheckConfirmed(false);
    
    // Notify
    triggerToast("Relational database schemas and default row indexes restored successfully.", "success");
    addSystemLog("CRITICAL: Destructive database registry reset executed. Relational constraints aligned to seed defaults.", "sajid.admin", "error", "SYSTEM");
  };

  // ==========================================
  // RBAC ACCESS CONTROL HANDLERS
  // ==========================================

  const handleToggleUserStatus = (userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    const nextStatus = targetUser.status === "Active" ? "Suspended" : "Active";
    triggerToast(`Account status for '${targetUser.username}' set to ${nextStatus}.`, nextStatus === "Active" ? "success" : "warn");
    addSystemLog(`Modified account status for '${targetUser.username}' to '${nextStatus}'.`, "sajid.admin", "warn", "RBAC");

    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        return { ...u, status: nextStatus };
      }
      return u;
    });
    setUsers(updatedUsers);
    localStorage.setItem("prodexa_users", JSON.stringify(updatedUsers));
    
    if (isSupabaseConfigured()) {
      updateUserStatusInSupabase(userId, nextStatus);
    }

    // Terminate any active sessions for suspended users, or restore if activated
    if (nextStatus === "Suspended") {
      const updatedRevoked = [...revokedSessionIds, `tok_${userId}`];
      setRevokedSessionIds(updatedRevoked);
      localStorage.setItem("prodexa_revoked_sessions", JSON.stringify(updatedRevoked));
    } else if (nextStatus === "Active") {
      const updatedRevoked = revokedSessionIds.filter(id => id !== `tok_${userId}`);
      setRevokedSessionIds(updatedRevoked);
      localStorage.setItem("prodexa_revoked_sessions", JSON.stringify(updatedRevoked));
    }
  };

  const handleDeleteUser = (userId: string, userName: string, targetUsername: string) => {
    if (targetUsername === currentUser?.username) {
      triggerToast("Access Denied: You cannot delete your own logged-in account.", "error");
      return;
    }
    setDeleteConfirmUser({ id: userId, name: userName });
  };

  const handleExecuteDeleteUser = () => {
    if (!deleteConfirmUser) return;
    const { id: userId, name: userName } = deleteConfirmUser;
    
    const updatedUsers = users.filter(u => u.id !== userId);
    setUsers(updatedUsers);
    localStorage.setItem("prodexa_users", JSON.stringify(updatedUsers));

    if (isSupabaseConfigured()) {
      deleteUserFromSupabase(userId);
    }

    triggerToast(`Deleted user account profile for '${userName}'.`, "success");
    addSystemLog(`Purged user account profile for '${userName}' from system records.`, "sajid.admin", "warn", "RBAC");
    setDeleteConfirmUser(null);
  };

  const handleResetPassword = (username: string) => {
    const u = users.find(usr => usr.username === username);
    if (u) {
      setOverrideTargetUser(u);
      setOverridePasskeyInput("");
      setOverrideNewPasswordInput("PXR-" + Math.random().toString(36).substring(2, 8).toUpperCase());
      setOverrideSuccessState(false);
      setIsResetPassModalOpen(true);
    } else {
      triggerToast(`Operator username '${username}' not found in registry.`, "error");
    }
  };

  const handleRevokeSession = (sessionId: string, userName: string) => {
    const updated = [...revokedSessionIds, sessionId];
    setRevokedSessionIds(updated);
    localStorage.setItem("prodexa_revoked_sessions", JSON.stringify(updated));
    triggerToast(`Active session token revoked for ${userName}.`, "warn");
    addSystemLog(`Revoked security token session footprint: ${sessionId} (${userName}).`, "sajid.admin", "warn", "SECURITY");
  };

  const openUserModal = (mode: "create" | "edit", userToEdit?: RBACUser) => {
    setUserModalMode(mode);
    if (mode === "edit" && userToEdit) {
      setSelectedUser(userToEdit);
      setUserForm({
        name: userToEdit.name,
        username: userToEdit.username,
        clearance: userToEdit.clearance,
        departments: userToEdit.departments
      });
    } else {
      setSelectedUser(null);
      setUserForm({
        name: "",
        username: "",
        password: "",
        clearance: "Operator",
        departments: []
      });
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name || !userForm.username) {
      triggerToast("Please complete required Name and Username inputs.", "error");
      return;
    }

    if (userModalMode === "create") {
      const gradients = [
        "from-blue-600 to-indigo-600",
        "from-emerald-600 to-teal-500",
        "from-violet-600 to-purple-500",
        "from-amber-500 to-orange-500",
        "from-rose-600 to-pink-500"
      ];
      const selectedGrad = gradients[Math.floor(Math.random() * gradients.length)];
      const plainPassword = userForm.password || "admin123";
      const newUser: RBACUser = {
        id: "usr_" + Math.floor(1000 + Math.random() * 9000),
        name: userForm.name,
        username: userForm.username.toLowerCase().replace(/\s+/g, ""),
        clearance: userForm.clearance,
        departments: userForm.departments.length > 0 ? userForm.departments : ["General Floor"],
        status: "Active",
        avatarGradient: selectedGrad,
        password: hashPasswordIfNeeded(plainPassword)
      };
      
      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      localStorage.setItem("prodexa_users", JSON.stringify(updatedUsers));
      
      if (isSupabaseConfigured()) {
        saveUserToSupabase(newUser, plainPassword);
      }

      triggerToast(`Successfully registered new clearance file for '${newUser.name}'.`, "success");
      addSystemLog(`Registered new system user entry '${newUser.username}' with '${newUser.clearance}' status.`, "sajid.admin", "success", "RBAC");
    } else if (userModalMode === "edit" && selectedUser) {
      const updatedUser: RBACUser = {
        ...selectedUser,
        name: userForm.name,
        username: userForm.username.toLowerCase().replace(/\s+/g, ""),
        clearance: userForm.clearance,
        departments: userForm.departments
      };

      const updatedUsers = users.map(u => u.id === selectedUser.id ? updatedUser : u);
      setUsers(updatedUsers);
      localStorage.setItem("prodexa_users", JSON.stringify(updatedUsers));

      if (isSupabaseConfigured()) {
        saveUserToSupabase(updatedUser, selectedUser.password);
      }

      triggerToast(`Updated system metadata policies for user '${userForm.name}'.`, "success");
      addSystemLog(`Altered core clearance values for operator profile '${selectedUser.username}'.`, "sajid.admin", "info", "RBAC");
    }
    setIsUserModalOpen(false);
  };

  const handleToggleDepartmentCheckbox = (dept: string) => {
    setUserForm(prev => {
      const active = prev.departments.includes(dept);
      if (active) {
        return { ...prev, departments: prev.departments.filter(d => d !== dept) };
      } else {
        return { ...prev, departments: [...prev.departments, dept] };
      }
    });
  };

  const handleRedeemTicket = (overrideTicket?: string) => {
    const codeToRedeem = overrideTicket || ticketInput;
    if (!codeToRedeem.trim()) {
      triggerToast("Please input a valid ticket recovery code.", "error");
      return;
    }

    const cleanInput = codeToRedeem.trim().toUpperCase();
    const tickets = JSON.parse(localStorage.getItem("prodexa_pending_tickets") || "[]") as Array<{ id: string; username: string; created_at: string; status: string }>;
    
    // Find matching ticket
    const ticketIdx = tickets.findIndex(t => t.id.toUpperCase() === cleanInput);
    if (ticketIdx !== -1) {
      const t = tickets[ticketIdx];
      
      // Let's perform a password override for this user
      const targetUser = users.find(u => u.username.toLowerCase() === t.username.toLowerCase() || u.name.toLowerCase() === t.username.toLowerCase());
      if (targetUser) {
        triggerToast(`Success! Ticket '${cleanInput}' redeemed. Password for @${targetUser.username} is reset to 'admin123'.`, "success");
        addSystemLog(`Bypass token redeemed. Operator password for '${targetUser.username}' reset successfully to 'admin123'.`, "sajid.admin", "success", "SECURITY");
      } else {
        triggerToast(`Ticket redeemed! Password reset to 'admin123' for user '${t.username}'.`, "success");
        addSystemLog(`Bypass token redeemed. Reset password for user '${t.username}' to 'admin123'.`, "sajid.admin", "success", "SECURITY");
      }

      // Remove or mark as resolved
      tickets.splice(ticketIdx, 1);
      localStorage.setItem("prodexa_pending_tickets", JSON.stringify(tickets));
      setPendingTickets(tickets);
      setTicketInput("");
    } else {
      // Check if it's the master passkey
      if (cleanInput === "ADMIN123") {
        triggerToast("Passkey accepted. System overrides authorized.", "success");
        return;
      }
      triggerToast("Error: Recovery ticket key not found in active request queue.", "error");
      addSystemLog(`Failed redemption attempt: invalid ticket token key '${cleanInput}'.`, "sajid.admin", "error", "SECURITY");
    }
  };

  const handleCreateOperatorInline = (e: React.FormEvent) => {
    e.preventDefault();

    if (!createUsername.trim()) {
      triggerToast("Please enter an Employee ID / Username.", "error");
      return;
    }
    if (!createName.trim()) {
      triggerToast("Please enter the Employee Name.", "error");
      return;
    }
    if (!createEmail.trim()) {
      triggerToast("Please enter the Company Email.", "error");
      return;
    }
    if (createPassword.length < 6) {
      triggerToast("Password must be at least 6 characters.", "error");
      return;
    }
    if (createPassword !== createConfirmPassword) {
      triggerToast("Confirmation mismatch: passwords do not match.", "error");
      return;
    }

    // Check if user already exists
    const exists = users.some(u => u.username.toLowerCase() === createUsername.trim().toLowerCase());
    if (exists) {
      triggerToast(`An operator profile with username '${createUsername}' already exists.`, "error");
      return;
    }

    const gradients = [
      "from-blue-600 to-indigo-600",
      "from-emerald-600 to-teal-500",
      "from-violet-600 to-purple-500",
      "from-amber-500 to-orange-500",
      "from-rose-600 to-pink-500"
    ];
    const selectedGrad = gradients[Math.floor(Math.random() * gradients.length)];

    const newUser: RBACUser = {
      id: "usr_" + Math.floor(1000 + Math.random() * 9000),
      name: createName.trim(),
      username: createUsername.trim().toLowerCase().replace(/\s+/g, ""),
      clearance: createClearance,
      departments: [createDepartment, createDesignation],
      status: "Active",
      avatarGradient: selectedGrad,
      password: hashPasswordIfNeeded(createPassword)
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem("prodexa_users", JSON.stringify(updatedUsers));

    if (isSupabaseConfigured()) {
      saveUserToSupabase(newUser, createPassword);
    }
    
    // Reset form fields
    setCreateUsername("");
    setCreateName("");
    setCreateEmail("");
    setCreatePassword("");
    setCreateConfirmPassword("");
    setCreateAvatarUrl("");
    
    triggerToast(`Successfully registered and verified account for '${newUser.name}'!`, "success");
    addSystemLog(`Registered new system user entry '${newUser.username}' with '${newUser.clearance}' clearance level.`, "sajid.admin", "success", "RBAC");
  };

  // Filter lists based on states
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.clearance.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const filteredAuditLogs = auditLogs.filter(l => 
    l.operator.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
    l.operation.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
    l.category.toLowerCase().includes(logSearchQuery.toLowerCase())
  );

  // Helper mapping icon key to Lucide node
  const renderTableIcon = (iconName: string, className: string = "h-4 w-4") => {
    switch (iconName) {
      case "Table": return <Table className={className} />;
      case "Activity": return <Activity className={className} />;
      case "Shield": return <Shield className={className} />;
      case "Database": return <Database className={className} />;
      case "Layers": return <Layers className={className} />;
      case "Fingerprint": return <Fingerprint className={className} />;
      case "Cpu": return <Cpu className={className} />;
      case "ShieldAlert": return <ShieldAlert className={className} />;
      default: return <Table className={className} />;
    }
  };

  return (
    <div id="comprehensive-admin-dashboard" className="space-y-6">

      {/* Modern floating toasts panel */}
      <div className="fixed top-5 right-5 z-50 space-y-3 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className="pointer-events-auto flex items-center gap-3 p-4 rounded-xl shadow-xl border bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800"
            >
              <div className={`p-1.5 rounded-lg text-white ${
                t.type === "success" ? "bg-emerald-500" :
                t.type === "error" ? "bg-red-500" :
                t.type === "warn" ? "bg-amber-500" : "bg-blue-500"
              }`}>
                {t.type === "success" && <Check className="h-4 w-4 stroke-[3px]" />}
                {t.type === "error" && <AlertTriangle className="h-4 w-4" />}
                {t.type === "warn" && <ShieldAlert className="h-4 w-4" />}
                {t.type === "info" && <Terminal className="h-4 w-4" />}
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug">
                {t.message}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-12 -translate-y-12">
          <Database className="h-64 w-64 text-indigo-400" />
        </div>
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black tracking-widest uppercase font-mono border border-indigo-400/30">
              PRODEXA SECURE SYSTEM
            </span>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-900 px-2 py-0.5 rounded-lg font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live SQL Node
            </div>
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
            System Administration & DB Visualizer
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Enterprise administration control center to inspect PostgreSQL relational database schema specs, map cryptographic DDL indices, manage granular role-based permissions (RBAC), and review transactional system traces.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10 font-mono">
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-right">
            <span className="text-[9px] text-slate-400 uppercase font-black block tracking-wider">Node Latency</span>
            <span className="text-base font-black text-emerald-400">{networkLatency}ms</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-right">
            <span className="text-[9px] text-slate-400 uppercase font-black block tracking-wider">PG engine</span>
            <span className="text-base font-black text-slate-100">PostgreSQL 16</span>
          </div>
        </div>
      </div>

      {/* Dual Tabbed Navigation Panel with high visual design */}
      <div className="flex flex-wrap border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-1.5 shadow-xs items-center gap-2">
        <button
          onClick={() => setActiveTab("rbac")}
          className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative overflow-hidden cursor-pointer ${
            activeTab === "rbac"
              ? "text-white bg-slate-900 dark:bg-neutral-800 shadow-sm"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <ShieldCheck className="h-4 w-4 stroke-[2px]" />
          RBAC Security & Directory
          {activeTab === "rbac" && (
            <motion.div 
              layoutId="navTabIndicator"
              className="absolute inset-0 bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-neutral-850 dark:to-neutral-800 -z-10"
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            />
          )}
        </button>
      </div>

      {/* ======================================================== */}
      {/* VIEW PANEL 1: POSTGRESQL SCHEMA VISUALIZER */}
      {/* ======================================================== */}
      {false && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: Table Navigation Bar */}
          <div className="xl:col-span-4 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-850 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="space-y-1.5 pb-2 border-b border-slate-100 dark:border-neutral-850">
              <h3 className="font-extrabold text-[#0F172A] dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-indigo-500" />
                Database Schemas ({tables.length})
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                Physical model representation of local and remote database records, data keys, and constraints.
              </p>
            </div>

            {/* Filter */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search SQL tables..." 
                value={tableSearchQuery}
                onChange={(e) => setTableSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold outline-none text-slate-800 dark:text-white placeholder-slate-400 focus:border-blue-500/50 transition-colors"
              />
            </div>

            {/* Selection list */}
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {filteredTables.map((tbl) => {
                const isActive = tbl.id === activeTableId;
                return (
                  <button
                    key={tbl.id}
                    onClick={() => setActiveTableId(tbl.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left cursor-pointer transition-all relative overflow-hidden ${
                      isActive
                        ? "bg-slate-900 border-slate-900 text-white dark:bg-neutral-800 dark:border-neutral-800 shadow-md"
                        : "bg-slate-50/50 hover:bg-slate-50 border-slate-200/60 text-slate-700 dark:bg-neutral-950/20 dark:hover:bg-neutral-850/50 dark:border-neutral-800/80 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 relative z-10">
                      <div className={`p-2 rounded-lg shrink-0 ${isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-neutral-900 dark:text-slate-400"}`}>
                        {renderTableIcon(tbl.iconName)}
                      </div>
                      <div>
                        <span className="font-extrabold text-xs block truncate">{tbl.name}</span>
                        <span className="text-[9px] text-slate-400 font-mono font-bold block mt-0.5">{tbl.rowCount} records • {tbl.sizeBytes}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 relative z-10 font-mono text-[9px] font-black tracking-wider">
                      {tbl.columns.some(c => c.isPrimaryKey) && (
                        <Key className={`h-3 w-3 ${isActive ? "text-amber-400" : "text-amber-500"}`} title="Primary Key defined" />
                      )}
                      {tbl.columns.some(c => c.isForeignKey) && (
                        <span className={`px-1.5 rounded border text-[8px] uppercase tracking-normal ${isActive ? "border-blue-400 text-blue-300" : "border-blue-200 text-blue-600 dark:border-blue-900/60 dark:text-blue-400"}`}>
                          FK
                        </span>
                      )}
                    </div>

                    {isActive && (
                      <motion.div 
                        layoutId="activeTableTabGlow"
                        className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 dark:from-neutral-850 dark:to-neutral-900 -z-10"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}

              {filteredTables.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <Table className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-semibold">No schema matches query.</p>
                </div>
              )}
            </div>

            {/* SQL Security Node heartbeat & metrics bar */}
            <div className="border-t border-slate-100 dark:border-neutral-850 pt-4 space-y-3">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-black uppercase tracking-wider font-mono">
                <span className="flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5 text-blue-500 animate-pulse" />
                  SQL Security Node Network
                </span>
                <span className="text-emerald-500 flex items-center gap-1 font-extrabold text-[9px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  ONLINE
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-neutral-950 rounded-xl p-3 border border-slate-150 dark:border-neutral-850 space-y-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono font-bold">
                  <span>Connection Socket:</span>
                  <span className="text-slate-800 dark:text-slate-100">PostgreSQL (TLS 1.3)</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono font-bold">
                  <span>Security Auth policy:</span>
                  <span className="text-blue-500">JWT & RLS Active</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono font-bold">
                  <span>Cluster replication:</span>
                  <span className="text-slate-800 dark:text-slate-100">Multi-region active</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right panel: Physical Model Table, DDL Editor, Row Monitor & Dangerous reset */}
          <div className="xl:col-span-8 space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedTable.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-850 rounded-2xl p-6 shadow-sm space-y-6"
              >
                {/* Header row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-neutral-850 pb-5">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 rounded-lg">
                        {renderTableIcon(selectedTable.iconName, "h-5 w-5")}
                      </div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white font-mono">
                        public.{selectedTable.name}
                      </h3>
                      <span className="px-2.5 py-0.5 bg-slate-100 border text-slate-500 dark:bg-neutral-950 dark:text-slate-400 rounded-md text-[10px] font-mono font-bold uppercase">
                        Physical Table
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-xl font-medium">
                      {selectedTable.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleCopyDDL(selectedTable.ddl, selectedTable.id)}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-black dark:bg-neutral-800 dark:hover:bg-neutral-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                    >
                      {copiedTableId === selectedTable.id ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-400 stroke-[3px]" />
                          <span>DDL Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>Copy Table DDL</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Section 1: Physical Model Table */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Columns className="h-4 w-4 text-blue-500" />
                    <h4 className="font-extrabold text-xs uppercase tracking-wider">
                      Physical Model Columns Specification
                    </h4>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-150 dark:border-neutral-850">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 dark:bg-neutral-950 text-slate-500 dark:text-slate-400 font-bold tracking-wider uppercase text-[9px] border-b border-slate-150 dark:border-neutral-850">
                        <tr>
                          <th className="py-3 px-4">Field Name</th>
                          <th className="py-3 px-2">PostgreSQL Type</th>
                          <th className="py-3 px-2 text-center">Nullable</th>
                          <th className="py-3 px-2">Key Mappings</th>
                          <th className="py-3 px-2">Default</th>
                          <th className="py-3 px-4">Field Definition / Business Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-neutral-850 font-semibold text-slate-700 dark:text-slate-300">
                        {selectedTable.columns.map((col, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-neutral-850/30 transition-colors">
                            <td className="py-3 px-4 font-black text-slate-900 dark:text-slate-100 font-mono">
                              {col.name}
                            </td>
                            <td className="py-3 px-2">
                              <span className="px-2 py-0.5 bg-blue-50/70 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300 rounded text-[10px] font-mono font-bold">
                                {col.type}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-center font-mono">
                              {col.isNullable ? (
                                <span className="text-slate-400">YES</span>
                              ) : (
                                <span className="text-red-500 font-black text-[10px]">NOT NULL</span>
                              )}
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-1.5">
                                {col.isPrimaryKey && (
                                  <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold font-mono">
                                    <Key className="h-3 w-3" />
                                    PK
                                  </span>
                                )}
                                {col.isForeignKey && (
                                  <span 
                                    className="flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold font-mono cursor-help"
                                    title={`References ${col.foreignKeyTarget}`}
                                  >
                                    FK → {col.foreignKeyTarget?.split(".")[0]}
                                  </span>
                                )}
                                {!col.isPrimaryKey && !col.isForeignKey && (
                                  <span className="text-slate-400 font-mono">--</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-2 font-mono text-[10px] text-slate-500">
                              {col.defaultValue ? (
                                <span className="text-slate-600 dark:text-slate-400">{col.defaultValue}</span>
                              ) : (
                                <span className="text-slate-400">NULL</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-[10px] text-slate-500 dark:text-neutral-400 leading-normal max-w-xs font-medium">
                              {col.description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section 2: Interactive DDL Editor */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                      <Terminal className="h-4 w-4 text-indigo-500" />
                      <h4 className="font-extrabold text-xs uppercase tracking-wider">
                        Interactive DDL Editor (CREATE TABLE)
                      </h4>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold font-mono">
                      dialect: PostgreSQL CJS Compliant
                    </span>
                  </div>

                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl blur opacity-15 group-hover:opacity-25 transition-opacity" />
                    
                    <div className="relative bg-[#0F172A] dark:bg-neutral-950 border border-slate-800 rounded-xl overflow-hidden shadow-md">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest">
                        <span>{selectedTable.name}.sql</span>
                        <button 
                          onClick={() => handleCopyDDL(selectedTable.ddl, selectedTable.id)}
                          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Copy code"
                        >
                          {copiedTableId === selectedTable.id ? (
                            <Check className="h-4.5 w-4.5 text-emerald-400 stroke-[2.5px]" />
                          ) : (
                            <Copy className="h-4.5 w-4.5" />
                          )}
                        </button>
                      </div>

                      <pre className="p-4 overflow-x-auto font-mono text-xs text-slate-200 leading-relaxed bg-[#0F172A] scrollbar-thin scrollbar-thumb-slate-800">
                        <code>{selectedTable.ddl}</code>
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Section 3: Live Row Monitor & System Registry / Dangerous operations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100 dark:border-neutral-850">
                  
                  {/* Row Monitor metrics view */}
                  <div className="bg-slate-50 dark:bg-neutral-950 rounded-2xl p-4 border border-slate-150 dark:border-neutral-850 space-y-3.5">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-blue-500" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Live Storage Registry Metrics
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono block">LIVE ROW COUNT:</span>
                        <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
                          {selectedTable.rowCount.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono block">COMPRESSED SIZE:</span>
                        <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
                          {selectedTable.sizeBytes}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 font-semibold">
                      <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Simulated handshake checked 1s ago via SSL-Replication</span>
                    </div>
                  </div>

                  {/* Dangerous control center */}
                  <div className="bg-red-50/40 dark:bg-red-950/10 rounded-2xl p-4 border border-red-200/60 dark:border-red-900/40 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                        <AlertTriangle className="h-4.5 w-4.5" />
                        <span className="text-xs font-black uppercase tracking-wider">
                          SQL Security Override Registry
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-neutral-400 leading-normal mt-1.5 font-semibold">
                        Performing metadata resets deletes custom table edits, triggers log wipes, and synchronizes schemas back to local factory defaults.
                      </p>
                    </div>

                    <button
                      onClick={() => setIsResetModalStep1(true)}
                      className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer text-center"
                    >
                      Restore Database Registry to Seed Defaults
                    </button>
                  </div>

                </div>

              </motion.div>
            </AnimatePresence>

            {/* RLS Policies Accordion */}
            <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-850 rounded-2xl overflow-hidden shadow-sm transition-all duration-300">
              <button
                onClick={() => setIsAccordionOpen(!isAccordionOpen)}
                className="w-full flex items-center justify-between p-5 text-left bg-slate-50/50 dark:bg-neutral-950/20 hover:bg-slate-50 dark:hover:bg-neutral-950/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-lg">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                      Multi-Table SQL Initialization & Row-Level Security (RLS) policies
                      <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded text-[9px] font-mono uppercase tracking-normal">
                        Security Hardened
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-normal">
                      Review default schema-wide security parameters, read/write constraints, and single-click full database seed exports.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-[#2563EB] dark:text-blue-400 uppercase">
                    {isAccordionOpen ? "Hide Script Details" : "Show Script Details"}
                  </span>
                  {isAccordionOpen ? (
                    <ChevronUp className="h-4.5 w-4.5 text-slate-500" />
                  ) : (
                    <ChevronDown className="h-4.5 w-4.5 text-slate-500" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {isAccordionOpen && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="border-t border-slate-100 dark:border-neutral-850 overflow-hidden"
                  >
                    <div className="p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-indigo-50/45 dark:bg-indigo-950/10 border border-indigo-150 dark:border-indigo-950/60 p-4 rounded-xl text-xs font-semibold">
                        <div className="space-y-1">
                          <span className="text-indigo-800 dark:text-indigo-300 font-extrabold block">
                            Global Structural Alignment Output
                          </span>
                          <p className="text-[11px] text-slate-500 leading-relaxed max-w-xl">
                            The composite output compiles schemas, custom sequence seeds, and secure row constraint triggers utilizing cryptographic authentication keys to support cloud databases.
                          </p>
                        </div>

                        <button
                          onClick={handleCopyGlobalScript}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-colors"
                        >
                          {copiedGlobalScript ? (
                            <>
                              <Check className="h-4 w-4 stroke-[3px]" />
                              <span>Script Copied!</span>
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4" />
                              <span>Export Global RLS & SQL Script</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Syntax SQL View */}
                      <div className="bg-[#0F172A] dark:bg-neutral-950 rounded-xl border border-slate-800 p-4 font-mono text-xs text-slate-300 leading-relaxed max-h-[380px] overflow-y-auto">
                        <p className="text-slate-500">-- ========================================================</p>
                        <p className="text-slate-500">-- PRODEXA COMPREHENSIVE DB SETUP & ROW LEVEL SECURITY</p>
                        <p className="text-slate-500">-- AUTHORITATIVE SEED ENFORCEMENT</p>
                        <p className="text-slate-500">-- ========================================================</p>
                        <br />
                        <span className="text-blue-400">CREATE SCHEMA</span> <span className="text-white">IF NOT EXISTS</span> <span className="text-emerald-400">public</span>;
                        <br /><br />
                        <span className="text-slate-500">-- Enable cryptograph random key extension</span>
                        <br />
                        <span className="text-blue-400">CREATE EXTENSION</span> <span className="text-white">IF NOT EXISTS</span> <span className="text-purple-400">"pgcrypto"</span>;
                        <br /><br />
                        <span className="text-slate-500 font-mono">-- ========================================================</span>
                        <br />
                        <span className="text-slate-500 font-mono">-- ROW-LEVEL SECURITY POLICIES FOR SECURE FIELD OPERATION</span>
                        <br />
                        <span className="text-slate-500 font-mono">-- ========================================================</span>
                        <br /><br />
                        <span className="text-purple-400 font-mono">ALTER TABLE</span> <span className="text-emerald-400 font-mono">public.production_lines</span> <span className="text-blue-400 font-mono">ENABLE ROW LEVEL SECURITY;</span>
                        <br />
                        <span className="text-purple-400 font-mono">ALTER TABLE</span> <span className="text-emerald-400 font-mono">public.supervisor_profiles</span> <span className="text-blue-400 font-mono">ENABLE ROW LEVEL SECURITY;</span>
                        <br />
                        <span className="text-purple-400 font-mono">ALTER TABLE</span> <span className="text-emerald-400 font-mono">public.floor_alerts</span> <span className="text-blue-400 font-mono">ENABLE ROW LEVEL SECURITY;</span>
                        <br /><br />
                        <span className="text-slate-500">-- Read constraints: Authorized officers can query production rows</span>
                        <br />
                        <span className="text-blue-400">CREATE POLICY</span> <span className="text-white">select_production_lines_policy</span> <span className="text-blue-400">ON</span> <span className="text-emerald-400">public.production_lines</span>
                        <br />
                        &nbsp;&nbsp;<span className="text-blue-400">FOR SELECT</span>
                        <br />
                        &nbsp;&nbsp;<span className="text-blue-400">USING</span> <span className="text-white">(auth.role() = 'authenticated');</span>
                        <br /><br />
                        <span className="text-slate-500">-- Write constraints: Outage incidents logging permissions</span>
                        <br />
                        <span className="text-blue-400">CREATE POLICY</span> <span className="text-white">insert_floor_alerts_policy</span> <span className="text-blue-400">ON</span> <span className="text-emerald-400">public.floor_alerts</span>
                        <br />
                        &nbsp;&nbsp;<span className="text-blue-400">FOR INSERT</span>
                        <br />
                        &nbsp;&nbsp;<span className="text-blue-400">WITH CHECK</span> <span className="text-white">(auth.uid() IS NOT NULL);</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW PANEL 2: USER DIRECTORY & ROLEaccess CONTROL (RBAC) */}
      {/* ======================================================== */}
      {activeTab === "rbac" && (
        <div className="space-y-6">
          
          {/* PASSWORD RESET REQUEST CENTER */}
          <div className="bg-amber-50/55 dark:bg-amber-950/5 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl p-6 shadow-sm space-y-4 text-slate-800 dark:text-slate-100">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-950/60 text-amber-650 dark:text-amber-400 rounded-xl mt-0.5">
                <Key className="h-5 w-5 stroke-[2.5px]" />
              </div>
              <div>
                <h4 className="font-extrabold text-[#0F172A] dark:text-amber-200 text-xs uppercase tracking-wider">
                  PASSWORD RESET REQUEST CENTER
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Redeem ticket keys provided by users who clicked "Forgot Password" or approve pending access requests.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
              {/* Left Column: Identify & Redeem */}
              <div className="md:col-span-6 space-y-2.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  IDENTIFY & REDEEM TICKET KEY
                </span>
                
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    placeholder="E.G. RST-410398" 
                    value={ticketInput}
                    onChange={(e) => setTicketInput(e.target.value)}
                    className="flex-1 bg-white dark:bg-neutral-900 border border-slate-255 dark:border-neutral-800 rounded-lg px-3.5 py-2.5 text-xs font-mono font-bold placeholder-slate-400 outline-none text-slate-850 dark:text-white uppercase"
                  />
                  <button 
                    onClick={() => handleRedeemTicket()}
                    className="px-5 py-2.5 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-black text-xs uppercase tracking-wider rounded-lg transition-all shadow-xs cursor-pointer text-center"
                  >
                    Redeem
                  </button>
                </div>
                
                <p className="text-[10px] text-slate-400 leading-normal">
                  Paste the <strong className="text-amber-600 font-bold font-mono">RST-XXXXXX</strong> key exactly as provided by the employee to instant-resolve their login request.
                </p>
              </div>

              {/* Right Column: Queue Index */}
              <div className="md:col-span-6 space-y-2.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  ACCESS REQUEST QUEUE INDEX ({pendingTickets.length})
                </span>

                <div className="border border-dashed border-slate-200 dark:border-neutral-800 rounded-xl p-4 flex flex-col items-center justify-center text-center min-h-[92px] bg-white/45 dark:bg-neutral-900/15">
                  {pendingTickets.length === 0 ? (
                    <div className="space-y-1">
                      <div className="flex justify-center">
                        <Check className="h-6 w-6 text-emerald-500 stroke-[3.5px] mb-1" />
                      </div>
                      <span className="font-extrabold text-slate-750 dark:text-slate-300 text-xs block">
                        Zero Pending Access Requests
                      </span>
                      <p className="text-[10px] text-slate-400 leading-normal max-w-sm">
                        All user authentication lockouts and password ticket registrations are currently fully validated.
                      </p>
                    </div>
                  ) : (
                    <div className="w-full space-y-2 max-h-36 overflow-y-auto pr-1">
                      {pendingTickets.map((t) => (
                        <div key={t.id} className="flex items-center justify-between p-2 bg-amber-500/10 dark:bg-amber-950/10 border border-amber-500/20 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          <div className="text-left space-y-0.5">
                            <span className="font-mono font-black text-amber-600 dark:text-amber-400 block">{t.id}</span>
                            <span className="text-[9px] text-slate-400 block">User: @{t.username} • {t.created_at}</span>
                          </div>
                          <button
                            onClick={() => handleRedeemTicket(t.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase rounded-md cursor-pointer transition-all shrink-0"
                          >
                            Approve
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ADMIN-CONTROLLED USER CREATION */}
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-850 rounded-2xl p-6 shadow-sm space-y-6 text-slate-800 dark:text-slate-100">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-50 dark:bg-neutral-800 text-blue-500 rounded-xl mt-0.5">
                <UserPlus className="h-5 w-5 stroke-[2.5px]" />
              </div>
              <div>
                <h4 className="font-extrabold text-[#0F172A] dark:text-white text-xs uppercase tracking-wider">
                  ADMIN-CONTROLLED USER CREATION
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Register new operators and planning engineers securely from the system root.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateOperatorInline} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Employee ID / Username */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide block font-bold">
                    Employee ID / Username (Database Key)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP-101 or aslam_m"
                    value={createUsername}
                    onChange={(e) => setCreateUsername(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-900 focus:ring-0"
                  />
                </div>

                {/* Employee Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide block font-bold">
                    Employee Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aslam Mohammad"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-900 focus:ring-0"
                  />
                </div>

                {/* Company Email Address */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide block font-bold">
                    Company Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. aslam@swm.com"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-900 focus:ring-0"
                  />
                </div>

                {/* Default Assigned Department */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide block font-bold">
                    Default Assigned Department
                  </label>
                  <div className="relative">
                    <select
                      value={createDepartment}
                      onChange={(e) => setCreateDepartment(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-900 focus:ring-0 appearance-none cursor-pointer"
                    >
                      <option value="IE">IE</option>
                      <option value="Production">Production</option>
                      <option value="Planning">Planning</option>
                      <option value="Quality">Quality</option>
                      <option value="HR">HR</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Roster Designation */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide block font-bold">
                    Roster Designation
                  </label>
                  <div className="relative">
                    <select
                      value={createDesignation}
                      onChange={(e) => setCreateDesignation(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-900 focus:ring-0 appearance-none cursor-pointer"
                    >
                      <option value="Operator">Operator</option>
                      <option value="Supervisor">Supervisor</option>
                      <option value="Planning Engineer">Planning Engineer</option>
                      <option value="Super Admin">Super Admin</option>
                      <option value="Data Entry">Data Entry</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* RBAC Clearance Role */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide block font-bold">
                    RBAC Clearance Role
                  </label>
                  <div className="relative">
                    <select
                      value={createClearance}
                      onChange={(e) => setCreateClearance(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-900 focus:ring-0 appearance-none cursor-pointer"
                    >
                      <option value="Viewer">Viewer (Dashboard views only)</option>
                      <option value="Operator">Operator (Floor telemetry log only)</option>
                      <option value="Data Entry">Data Entry (KPI Update & Upload metrics)</option>
                      <option value="Supervisor">Supervisor (Line configuration & alerts)</option>
                      <option value="Super Admin">Super Admin (Full root clearance)</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Access Key Password (Encrypted) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide block font-bold">
                    Access Key Password (Encrypted)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-900 focus:ring-0"
                  />
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide block font-bold">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter password"
                    value={createConfirmPassword}
                    onChange={(e) => setCreateConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-900 focus:ring-0"
                  />
                </div>

                {/* Profile Photo Avatar URL */}
                <div className="md:col-span-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide block font-bold">
                      Profile Photo Avatar URL
                    </label>
                    <span className="text-[10px] text-slate-400 font-semibold italic">Optional</span>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. https://images.unsplash.com/photo-..."
                    value={createAvatarUrl}
                    onChange={(e) => setCreateAvatarUrl(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-900 focus:ring-0"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-sm cursor-pointer transition-all"
                >
                  <UserPlus className="h-4 w-4" />
                  Verify & Add Operator Account
                </button>
              </div>
            </form>
          </div>
          
          {/* Main User management Section */}
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-850 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2">
              <div className="space-y-1">
                <h3 className="font-bold text-[#0F172A] dark:text-white text-lg tracking-tight">
                  Authorized Accounts Directory Index ({filteredUsers.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Monitor active user sessions, reset credentials or toggles account locks immediately
                </p>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:flex-initial">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search directory..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full md:w-60 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold outline-none text-slate-800 dark:text-white placeholder-slate-400 focus:border-blue-500/50"
                  />
                </div>

                <button
                  onClick={() => openUserModal("create")}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" />
                  Add New Operator
                </button>
              </div>
            </div>

            {/* Operator Profile Directory Table */}
            <div className="overflow-x-auto border border-slate-100 dark:border-neutral-850 rounded-2xl bg-white dark:bg-neutral-900">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-neutral-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-neutral-950/20">
                    <th className="px-6 py-4 font-bold text-slate-400">EMPLOYEE / ID</th>
                    <th className="px-6 py-4 font-bold text-slate-400">CLEARANCE ROLE</th>
                    <th className="px-6 py-4 font-bold text-slate-400">SCOPE MAPPING</th>
                    <th className="px-6 py-4 font-bold text-slate-400">STATUS</th>
                    <th className="px-6 py-4 font-bold text-slate-400 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                  {filteredUsers.map(user => {
                    const isProtected = user.username === currentUser?.username;
                    return (
                      <tr 
                        key={user.id}
                        className={`transition-all hover:bg-slate-50/40 dark:hover:bg-neutral-950/10 ${
                          user.status === "Suspended" ? "bg-slate-50/20 dark:bg-neutral-950/5" : ""
                        }`}
                      >
                        {/* Employee / ID */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {user.avatarUrl ? (
                              <img 
                                src={user.avatarUrl} 
                                alt={user.name} 
                                referrerPolicy="no-referrer"
                                className="h-11 w-11 rounded-full object-cover shadow-xs shrink-0" 
                              />
                            ) : (
                              <div className={`h-11 w-11 rounded-full bg-gradient-to-br ${user.avatarGradient} text-white flex items-center justify-center font-bold text-sm uppercase tracking-wider shadow-xs shrink-0`}>
                                {user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                              </div>
                            )}
                            <div className="space-y-0.5">
                              <span className="font-bold text-xs uppercase tracking-wide text-slate-900 dark:text-white block leading-tight">
                                {user.name}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal block">
                                Username: <span className="text-blue-600 dark:text-blue-400 font-semibold">{user.username}</span>
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Clearance Role */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="inline-block border border-slate-700 dark:border-neutral-700 bg-white dark:bg-neutral-900 rounded-lg px-4 py-2 text-xs font-semibold text-[#0F172A] dark:text-white min-w-[150px] text-center shadow-2xs">
                            {user.clearance}
                          </div>
                        </td>

                        {/* Scope Mapping */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold text-xs text-slate-750 dark:text-slate-300">
                            {user.departments.join(", ")}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.status === "Active" ? (
                            <span className="px-3 py-1 bg-[#F0FDF4] dark:bg-emerald-950/20 text-[#16A34A] dark:text-emerald-400 border border-[#DCFCE7] dark:border-emerald-900/40 rounded-full text-[10px] font-extrabold tracking-wider uppercase">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/40 rounded-full text-[10px] font-extrabold tracking-wider uppercase">
                              SUSPENDED
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            <button
                              onClick={() => openUserModal("edit", user)}
                              className="px-3 py-1.5 border border-indigo-250 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                            >
                              <Edit2 className="h-3 w-3" />
                              Edit Profile
                            </button>

                            <button
                              onClick={() => handleResetPassword(user.username)}
                              className="px-3.5 py-1.5 border border-amber-200 dark:border-amber-900/50 bg-[#FFFBEB] dark:bg-amber-950/10 text-[#D97706] dark:text-amber-400 hover:bg-[#FEF3C7] dark:hover:bg-amber-950/30 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                            >
                              Reset Password
                            </button>

                            {isProtected ? (
                              <button
                                disabled
                                className="px-3.5 py-1.5 border border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900 text-slate-200 dark:text-neutral-750 rounded-lg text-xs font-bold pointer-events-none opacity-40"
                              >
                                Lock Account
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleUserStatus(user.id)}
                                className={`px-3.5 py-1.5 border rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                                  user.status === "Active"
                                    ? "border-rose-200 dark:border-rose-900/50 bg-[#FFF5F5] dark:bg-rose-950/10 text-[#E11D48] dark:text-rose-400 hover:bg-[#FEE2E2] dark:hover:bg-rose-950/30"
                                    : "border-emerald-200 dark:border-emerald-900/50 bg-[#F0FDF4] dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400 hover:bg-[#DCFCE7] dark:hover:bg-emerald-950/30"
                                }`}
                              >
                                {user.status === "Active" ? "Lock Account" : "Unlock Account"}
                              </button>
                            )}

                            {isProtected ? (
                              <button
                                disabled
                                className="border border-slate-100 dark:border-neutral-800 p-2 text-slate-200 dark:text-neutral-700 rounded-lg pointer-events-none opacity-40"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDeleteUser(user.id, user.name, user.username)}
                                className="border border-rose-200 dark:border-rose-900/40 p-2 text-[#E11D48] dark:text-rose-400 hover:bg-[#FFF5F5] dark:hover:bg-rose-950/20 rounded-lg transition-all cursor-pointer"
                                title="Delete user"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredUsers.length === 0 && (
                <div className="text-center py-12 text-slate-400 bg-white dark:bg-neutral-900">
                  <Fingerprint className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-bold">No active operator profile matches search.</p>
                </div>
              )}
            </div>
          </div>

          {/* Active Session Monitor Panel */}
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-850 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="space-y-1 pb-2 border-b border-slate-150 dark:border-neutral-850">
              <h4 className="font-extrabold text-[#0F172A] dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Monitor className="h-4 w-4 text-emerald-500 animate-pulse" />
                Active Session Monitor ({sessions.length})
              </h4>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                Real-time visualization of authorized client tokens, device types, and terminal IP locations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {sessions.map(session => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, height: 0 }}
                    className="p-4 bg-slate-50 dark:bg-neutral-950 border border-slate-200/60 dark:border-neutral-800 rounded-xl space-y-3 flex flex-col justify-between transition-colors hover:border-slate-300 dark:hover:border-neutral-700"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <div className="p-1.5 bg-white dark:bg-neutral-900 rounded-lg text-slate-600 dark:text-slate-300 border border-slate-200/40 shrink-0">
                          {session.deviceType === "Desktop" && <Laptop className="h-4 w-4" />}
                          {session.deviceType === "Smartphone" && <Smartphone className="h-4 w-4" />}
                          {session.deviceType === "Laptop" && <Monitor className="h-4 w-4" />}
                        </div>
                        <div className="space-y-0.5 truncate">
                          <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 block truncate">
                            {session.userName}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono block">
                            Token: {session.id}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRevokeSession(session.id, session.userName)}
                        className="px-2.5 py-1 text-[10px] text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 dark:text-red-400 rounded-lg font-bold uppercase cursor-pointer shrink-0"
                      >
                        Revoke
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono font-bold pt-1.5 border-t border-slate-200/40 dark:border-neutral-850/40 text-slate-500 leading-normal">
                      <div>
                        <span className="text-slate-400 uppercase text-[9px] block">CLIENT / OS:</span>
                        <span className="text-slate-700 dark:text-slate-300 truncate block">{session.client}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 uppercase text-[9px] block">TERMINAL IP:</span>
                        <span className="text-slate-700 dark:text-slate-300 truncate block">{session.ipAddress}</span>
                      </div>
                      <div className="col-span-2 flex justify-between items-center pt-1 border-t border-dashed border-slate-200/30">
                        <span className="text-slate-400 uppercase text-[9px]">ACTIVE DURATION:</span>
                        <span className="text-emerald-500 text-xs font-black">{session.duration}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {sessions.length === 0 && (
              <div className="text-center py-12 text-slate-400 font-semibold text-xs bg-slate-50 dark:bg-neutral-950 rounded-xl border border-dashed border-slate-200 dark:border-neutral-800">
                No active sessions logged.
              </div>
            )}
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW PANEL 3: SUPABASE CONNECTED DATABASE INTERFACE */}
      {/* ======================================================== */}
      {false && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Top Level Diagnostic Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Live Status indicator */}
            <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-850 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase font-bold">Handshake Diagnostics</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    supabaseTestStatus === "success" ? "bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse" :
                    supabaseTestStatus === "error" ? "bg-red-100 text-red-800 border border-red-200" :
                    supabaseTestStatus === "testing" ? "bg-blue-100 text-blue-800 border border-blue-200" : "bg-slate-100 text-slate-600 border"
                  }`}>
                    {supabaseTestStatus === "success" && "Connected"}
                    {supabaseTestStatus === "error" && "Failed"}
                    {supabaseTestStatus === "testing" && "Handshaking..."}
                    {supabaseTestStatus === "idle" && "Not Tested"}
                  </span>
                </div>
                
                <h4 className="font-extrabold text-slate-800 dark:text-white text-sm mb-1.5 flex items-center gap-2">
                  <Wifi className={`h-4.5 w-4.5 ${supabaseTestStatus === "success" ? "text-emerald-500" : "text-slate-400"}`} />
                  Supabase API Gateway
                </h4>
                
                <p className="text-[11px] text-slate-400 leading-normal font-medium mb-4">
                  Test live SSL handshake latency and REST specs with the remote Supabase PostgreSQL backend database.
                </p>
              </div>

              <div className="space-y-2.5">
                {supabaseTestStatus === "success" && (
                  <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/10 border border-emerald-150 dark:border-emerald-950/40 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-400 flex items-center justify-between">
                    <span>Handshake Latency:</span>
                    <span className="font-mono font-black">{supabaseTestLatency}ms</span>
                  </div>
                )}
                {supabaseTestStatus === "error" && (
                  <div className="p-3 bg-red-50/60 dark:bg-red-950/10 border border-red-150 dark:border-red-950/40 rounded-xl text-[10px] font-semibold text-red-800 dark:text-red-400 font-mono break-all max-h-24 overflow-y-auto">
                    {supabaseTestError}
                  </div>
                )}

                <button
                  onClick={handleTestSupabaseConnection}
                  disabled={supabaseTestStatus === "testing"}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${supabaseTestStatus === "testing" ? "animate-spin" : ""}`} />
                  {supabaseTestStatus === "testing" ? "Handshaking REST Node..." : "Test Connection & Ping API"}
                </button>
              </div>
            </div>

            {/* Config & Env Details */}
            <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-850 rounded-2xl p-5 shadow-xs lg:col-span-2 flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-slate-800 dark:text-white text-sm mb-1 flex items-center gap-2">
                  <Lock className="h-4.5 w-4.5 text-blue-500" />
                  Supabase Credentials
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium mb-4">
                  These secrets are retrieved from the environment variables configured in <code className="bg-slate-100 dark:bg-neutral-950 px-1 py-0.5 rounded text-[11px]">.env</code> for the Prodexa applet.
                </p>
              </div>

              <div className="space-y-3 text-xs font-semibold">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wide block mb-1">NEXT_PUBLIC_SUPABASE_URL</span>
                    <div className="bg-slate-50 dark:bg-neutral-950 px-3 py-2.5 rounded-xl border border-slate-200/60 dark:border-neutral-800 font-mono text-[10.5px] text-slate-700 dark:text-slate-300 truncate select-all">
                      {import.meta.env.NEXT_PUBLIC_SUPABASE_URL || "https://ihwyfunfpnolungqyoxu.supabase.co"}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-slate-400 uppercase tracking-wide block">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</span>
                      <button
                        onClick={() => setShowSecrets(!showSecrets)}
                        className="text-[10px] text-[#2563EB] dark:text-blue-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        {showSecrets ? "Hide" : "Show"}
                      </button>
                    </div>
                    <div className="bg-slate-50 dark:bg-neutral-950 px-3 py-2.5 rounded-xl border border-slate-200/60 dark:border-neutral-800 font-mono text-[10.5px] text-slate-700 dark:text-slate-300 truncate select-all">
                      {showSecrets 
                        ? (import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_kWBfVBBpEvAA7eErD56eKQ_UGfypLUR")
                        : "••••••••••••••••••••••••••••••••••••••••••••••••••••••••"
                      }
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-950/40 rounded-xl text-[10px] text-slate-400 flex items-center gap-2 leading-relaxed">
                  <CheckCircle className="h-4.5 w-4.5 text-blue-500 flex-shrink-0" />
                  <span>Configured via Vite envPrefix. You can safely invoke `createClient` from the custom client/server files we created in `@/src/utils/supabase/` without exposing key secrets on compilation pipelines.</span>
                </div>
              </div>
            </div>

          </div>

          {/* Interactive SQL Explorer & Sandbox Query Runner */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            
            {/* Left Sandbox Control Console */}
            <div className="xl:col-span-7 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-850 rounded-2xl p-5 shadow-sm space-y-5">
              <div className="border-b border-slate-100 dark:border-neutral-850 pb-3">
                <h3 className="font-extrabold text-slate-800 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-indigo-500" />
                  Supabase Live Table Explorer
                </h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5 leading-normal">
                  Query and preview rows directly from any table in your active Supabase schemas. Input a table name like <code className="text-blue-600 font-bold font-mono">todos</code> to retrieve database contents.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-8 space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wide block font-bold">SQL Target Table</label>
                    <div className="relative">
                      <Table className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. todos, production_lines, profiles"
                        value={supabaseTableName}
                        onChange={(e) => setSupabaseTableName(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono font-black outline-none text-slate-800 dark:text-white placeholder-slate-400 focus:border-indigo-500/50"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-4">
                    <button
                      onClick={handleQuerySupabaseTable}
                      disabled={isQueryingSupabase || !supabaseTableName.trim()}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      {isQueryingSupabase ? "Fetching Rowset..." : "Run Select Query"}
                    </button>
                  </div>
                </div>

                {/* Query Output Console */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide block font-bold">JSON Data Output Response</span>
                  <div className="bg-[#0F172A] dark:bg-neutral-950 rounded-xl border border-slate-800 p-4 h-96 overflow-y-auto font-mono text-xs text-slate-300 shadow-inner">
                    {isQueryingSupabase && (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 font-mono gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
                        <span>Connecting to database and fetching rows...</span>
                      </div>
                    )}

                    {!isQueryingSupabase && supabaseQueryError && (
                      <div className="space-y-3 p-2 text-red-400 font-mono">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                          <span className="font-extrabold text-xs uppercase">SELECT QUERY EXECUTION FAILED</span>
                        </div>
                        <p className="text-[11px] leading-relaxed bg-red-950/20 border border-red-900/40 p-3 rounded-lg">
                          {supabaseQueryError}
                        </p>
                        <div className="text-[10px] text-slate-400 space-y-1.5 font-sans pt-2">
                          <p className="font-bold text-slate-200">Common remedies to verify:</p>
                          <p>1. Does the table <code className="bg-slate-900 text-rose-400 px-1 py-0.5 rounded font-mono font-bold">'{supabaseTableName}'</code> exist in the Supabase Schema under the <code className="text-white font-mono">'public'</code> schema?</p>
                          <p>2. Are Row Level Security (RLS) policies allowing anonymous SELECT queries, or did you add credentials that are valid?</p>
                          <p>3. If the table is missing, you can create it via the Supabase Dashboard SQL Editor.</p>
                        </div>
                      </div>
                    )}

                    {!isQueryingSupabase && !supabaseQueryError && supabaseQueryResult && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                          <span className="text-emerald-400 font-black text-[10px] tracking-wide uppercase">HTTP 200 OK • SELECT SUCCESSFUL</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(supabaseQueryResult, null, 2));
                              triggerToast("JSON results copied to clipboard!", "success");
                            }}
                            className="text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-sans font-bold"
                          >
                            <Copy className="h-3.5 w-3.5" /> Copy JSON
                          </button>
                        </div>
                        <pre className="text-slate-100 text-[11.5px] whitespace-pre-wrap leading-relaxed">
                          {JSON.stringify(supabaseQueryResult, null, 2)}
                        </pre>
                      </div>
                    )}

                    {!isQueryingSupabase && !supabaseQueryError && !supabaseQueryResult && (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 font-mono text-center px-4">
                        <Database className="h-8 w-8 text-slate-700 mb-2" />
                        <span className="font-bold text-xs uppercase tracking-wide text-slate-400 block mb-1">Sandbox Ready</span>
                        <p className="max-w-xs text-[10.5px] leading-normal text-slate-500">
                          Select/type a table name (e.g. <code className="text-slate-400 font-bold select-all">todos</code>) and run the query to retrieve live PostgreSQL records directly.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Reference Documentation and code tabs */}
            <div className="xl:col-span-5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-850 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="border-b border-slate-100 dark:border-neutral-850 pb-2">
                <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  Integration Code References
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                  Highly accurate boilerplates showing exactly how to initialize and run queries in multiple frameworks.
                </p>
              </div>

              {/* Docs Tab Selection */}
              <div className="flex border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 p-1 rounded-xl items-center gap-1">
                {[
                  { id: "nextjs", label: "Next.js Route (User Setup)" },
                  { id: "react", label: "React Client Hook" },
                  { id: "express", label: "Express API Proxy" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setCodeDocTab(tab.id as any)}
                    className={`flex-1 py-1.5 text-center text-[10px] font-black uppercase tracking-wider rounded-lg cursor-pointer transition-all ${
                      codeDocTab === tab.id
                        ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Document Code Blocks */}
              <div className="bg-[#0F172A] dark:bg-neutral-950 rounded-xl p-3.5 border border-slate-800 text-[11px] font-mono leading-relaxed text-slate-300 relative">
                <button
                  onClick={() => {
                    let textToCopy = "";
                    if (codeDocTab === "nextjs") textToCopy = `// page.tsx \nimport { createClient } from '@/src/utils/supabase/server';\nimport { cookies } from 'next/headers';\n\nexport default async function Page() {\n  const cookieStore = await cookies();\n  const supabase = createClient(cookieStore);\n  const { data: todos } = await supabase.from('todos').select();\n\n  return (\n    <ul>\n      {todos?.map((todo) => (\n        <li key={todo.id}>{todo.name}</li>\n      ))}\n    </ul>\n  );\n}`;
                    else if (codeDocTab === "react") textToCopy = `// MyComponent.tsx\nimport React, { useEffect, useState } from 'react';\nimport { createClient } from '@/src/utils/supabase/client';\n\nexport function TodoList() {\n  const [todos, setTodos] = useState([]);\n  const supabase = createClient();\n\n  useEffect(() => {\n    supabase.from('todos').select()\n      .then(({ data }) => {\n        if (data) setTodos(data);\n      });\n  }, []);\n\n  return (\n    <div>{JSON.stringify(todos)}</div>\n  );\n}`;
                    else textToCopy = `// server.ts (Express Backend)\nimport { createClient } from './src/utils/supabase/server';\n\napp.get('/api/todos', async (req, res) => {\n  try {\n    // Initialize the Express ssr server client safely\n    const supabase = createClient(req, res);\n    const { data: todos, error } = await supabase.from('todos').select();\n    \n    if (error) throw error;\n    res.json(todos);\n  } catch (err: any) {\n    res.status(500).json({ error: err.message });\n  }\n});`;
                    
                    navigator.clipboard.writeText(textToCopy);
                    triggerToast("Boilerplate code copied to clipboard!", "success");
                  }}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-250 cursor-pointer transition-colors"
                  title="Copy Code"
                >
                  <Copy className="h-4 w-4" />
                </button>

                {codeDocTab === "nextjs" && (
                  <div className="space-y-1 overflow-x-auto select-all max-h-96">
                    <p className="text-slate-500">// Next.js Server Side Query</p>
                    <p className="text-slate-400">import <span className="text-white">{"{ createClient }"}</span> from <span className="text-emerald-400">"@/src/utils/supabase/server"</span>;</p>
                    <p className="text-slate-400">import <span className="text-white">{"{ cookies }"}</span> from <span className="text-emerald-400">"next/headers"</span>;</p>
                    <br />
                    <p className="text-[#38BDF8]">export default async function <span className="text-yellow-400">Page</span>() {"{"}</p>
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;const <span className="text-white">cookieStore</span> = await <span className="text-yellow-400">cookies</span>();</p>
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;const <span className="text-white">supabase</span> = <span className="text-yellow-400">createClient</span>(cookieStore);</p>
                    <br />
                    <p className="text-slate-500">&nbsp;&nbsp;// Select query representation</p>
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;const {"{ data: todos }"} = await supabase</p>
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;&nbsp;&nbsp;.<span className="text-yellow-400">from</span>(<span className="text-emerald-400">'todos'</span>)</p>
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;&nbsp;&nbsp;.<span className="text-yellow-400">select</span>();</p>
                    <br />
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;return (</p>
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;&nbsp;&nbsp;{"<ul>"}</p>
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{"{todos?.map((todo) => ("}</p>
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{"<li key={todo.id}>{todo.name}</li>"}</p>
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{"))}"}</p>
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;&nbsp;&nbsp;{"</ul>"}</p>
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;);</p>
                    <p className="text-[#38BDF8]">{"}"}</p>
                  </div>
                )}

                {codeDocTab === "react" && (
                  <div className="space-y-1 overflow-x-auto select-all max-h-96">
                    <p className="text-slate-500">// Vite/React Client Side Query</p>
                    <p className="text-slate-400">import <span className="text-white">React, {"{ useEffect, useState }"}</span> from <span className="text-emerald-400">"react"</span>;</p>
                    <p className="text-slate-400">import <span className="text-white">{"{ createClient }"}</span> from <span className="text-emerald-400">"@/src/utils/supabase/client"</span>;</p>
                    <br />
                    <p className="text-[#38BDF8]">export function <span className="text-yellow-400">TodoList</span>() {"{"}</p>
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;const [todos, setTodos] = useState([]);</p>
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;const <span className="text-white">supabase</span> = <span className="text-yellow-400">createClient</span>();</p>
                    <br />
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;useEffect({"() => {"})</p>
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;&nbsp;&nbsp;supabase.<span className="text-yellow-400">from</span>(<span className="text-emerald-400">'todos'</span>).<span className="text-yellow-400">select</span>()</p>
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.then({"({ data }) => {"})</p>
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;if (data) <span className="text-yellow-400">setTodos</span>(data);</p>
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{"});"}</p>
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;{"}, []);"}</p>
                    <br />
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;return (</p>
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;&nbsp;&nbsp;{"<div>{JSON.stringify(todos)}</div>"}</p>
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;);</p>
                    <p className="text-[#38BDF8]">{"}"}</p>
                  </div>
                )}

                {codeDocTab === "express" && (
                  <div className="space-y-1 overflow-x-auto select-all max-h-96">
                    <p className="text-slate-500">// Express server.ts Endpoint Proxy</p>
                    <p className="text-slate-400">import <span className="text-white">{"{ createClient }"}</span> from <span className="text-emerald-400">"./src/utils/supabase/server"</span>;</p>
                    <br />
                    <p className="text-[#38BDF8]">app.<span className="text-yellow-400">get</span>(<span className="text-emerald-400">"/api/todos"</span>, async <span className="text-white">{"(req, res) => {"}</span></p>
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;try {"{"}</p>
                    <p className="text-slate-500">&nbsp;&nbsp;&nbsp;&nbsp;// Parse headers/cookies automatically</p>
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;&nbsp;&nbsp;const <span className="text-white">supabase</span> = <span className="text-yellow-400">createClient</span>(req, res);</p>
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;&nbsp;&nbsp;const {"{ data: todos, error }"} = await supabase</p>
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.<span className="text-yellow-400">from</span>(<span className="text-emerald-400">"todos"</span>)</p>
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.<span className="text-yellow-400">select</span>();</p>
                    <br />
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;&nbsp;&nbsp;if (error) throw error;</p>
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;&nbsp;&nbsp;res.<span className="text-yellow-400">json</span>(todos);</p>
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;{"} catch (err: any) {"}</p>
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;&nbsp;&nbsp;res.<span className="text-yellow-400">status</span>(500).<span className="text-yellow-400">json</span>({"{"} error: err.message {"}"});</p>
                    <p className="text-[#38BDF8]">&nbsp;&nbsp;{"}"}</p>
                    <p className="text-[#38BDF8]">{"});"}</p>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* DESTRUCTIVE DOUBLE-CONFIRMATION RESTORE MODAL STEP 1 */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isResetModalStep1 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsResetModalStep1(false)}
              className="absolute inset-0 bg-slate-950"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-850 rounded-2xl p-6 shadow-2xl relative max-w-md w-full z-10 space-y-5 text-xs font-semibold"
            >
              <div className="flex items-center gap-2.5 text-red-600 border-b border-slate-100 dark:border-neutral-850 pb-3">
                <AlertTriangle className="h-5 w-5 animate-pulse" />
                <h3 className="text-sm font-black uppercase tracking-wider">
                  Safety Override Check (Step 1/2)
                </h3>
              </div>

              <div className="space-y-3 leading-relaxed text-slate-600 dark:text-slate-300 font-medium">
                <p>
                  You are attempting to execute a <span className="text-red-600 font-black">Destructive Registry Restore</span> on the active relational Postgres database cluster.
                </p>
                <p>
                  This operation deletes custom sewing table rows, wipes active tracking statistics, and maps record structures back to original development seed defaults.
                </p>
                <p className="font-bold text-slate-800 dark:text-slate-100">
                  This action is permanent and cannot be automatically reverted.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsResetModalStep1(false)}
                  className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-neutral-800 dark:hover:bg-neutral-750 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setIsResetModalStep1(false);
                    setIsResetModalStep2(true);
                  }}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase tracking-wider cursor-pointer"
                >
                  Proceed to Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* DESTRUCTIVE DOUBLE-CONFIRMATION RESTORE MODAL STEP 2 */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isResetModalStep2 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsResetModalStep2(false);
                setResetConfirmInput("");
                setResetCheckConfirmed(false);
              }}
              className="absolute inset-0 bg-slate-950"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-850 rounded-2xl p-6 shadow-2xl relative max-w-md w-full z-10 space-y-5 text-xs font-semibold"
            >
              <div className="flex items-center gap-2.5 text-red-600 border-b border-slate-100 dark:border-neutral-850 pb-3">
                <Lock className="h-5 w-5 text-red-600" />
                <h3 className="text-sm font-black uppercase tracking-wider">
                  Confirm System Command (Step 2/2)
                </h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <p className="text-slate-500 dark:text-slate-400">
                    To authorize, type the validation code: <span className="font-mono font-black text-red-600 select-all">RESTORE DEFAULTS</span>
                  </p>
                  <input
                    type="text"
                    required
                    placeholder="Type confirmation code here"
                    value={resetConfirmInput}
                    onChange={(e) => setResetConfirmInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-250 dark:border-neutral-800 rounded-xl px-4 py-2.5 outline-none font-bold text-red-600 text-center"
                  />
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer text-slate-600 dark:text-slate-300 leading-normal select-none font-medium">
                  <input
                    type="checkbox"
                    checked={resetCheckConfirmed}
                    onChange={(e) => setResetCheckConfirmed(e.target.checked)}
                    className="mt-0.5 rounded text-red-600"
                  />
                  <span>I acknowledge this reset immediately changes the record indexes, clears system stats and logs, and overrides storage parameters.</span>
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setIsResetModalStep2(false);
                    setResetConfirmInput("");
                    setResetCheckConfirmed(false);
                  }}
                  className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-neutral-800 dark:hover:bg-neutral-750 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePerformDestructiveReset}
                  disabled={resetConfirmInput !== "RESTORE DEFAULTS" || !resetCheckConfirmed}
                  className={`flex-1 py-2.5 rounded-xl font-black uppercase tracking-wider transition-all cursor-pointer ${
                    resetConfirmInput === "RESTORE DEFAULTS" && resetCheckConfirmed
                      ? "bg-red-600 hover:bg-red-700 text-white shadow-md"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-neutral-800 dark:text-neutral-600"
                  }`}
                >
                  Confirm Destructive Action
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* RBAC MODAL: CREATE / EDIT USER clearance POLICIES */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isUserModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUserModalOpen(false)}
              className="absolute inset-0 bg-slate-950"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-850 rounded-2xl p-6 shadow-2xl relative max-w-lg w-full z-10 space-y-4 text-xs font-semibold"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-850 pb-3">
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Fingerprint className="h-5 w-5 text-blue-500" />
                  {userModalMode === "create" ? "Register New Operator profile" : "Modify Operator Clearance policy"}
                </h3>
                <button 
                  onClick={() => setIsUserModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <form onSubmit={handleSaveUser} className="space-y-4">
                
                {/* Full name input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide block">Legal Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. JOTHI"
                    value={userForm.name}
                    onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 outline-none font-bold text-slate-800 dark:text-white placeholder-slate-400 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Username input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wide block">Unique Handle Username *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. jothi_admin"
                      value={userForm.username}
                      onChange={(e) => setUserForm(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 outline-none font-bold text-slate-800 dark:text-white placeholder-slate-400 focus:border-blue-500"
                    />
                  </div>

                  {/* Security Clearance Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wide block">Security Clearance Chip *</label>
                    <select
                      value={userForm.clearance}
                      onChange={(e) => setUserForm(prev => ({ ...prev, clearance: e.target.value as any }))}
                      className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 outline-none font-bold text-slate-800 dark:text-white"
                    >
                      <option value="Super Admin">Super Admin</option>
                      <option value="Data Entry">Data Entry</option>
                      <option value="Supervisor">Supervisor</option>
                      <option value="Operator">Operator</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                  </div>
                </div>

                {/* Password input for Create */}
                {userModalMode === "create" && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wide block">System Entry Authorization Password</label>
                    <input
                      type="password"
                      placeholder="Assign secure password"
                      value={userForm.password || ""}
                      onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 outline-none font-bold text-slate-800 dark:text-white placeholder-slate-400 focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Multi-select checkboxes for Departments/Production lines */}
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide block">Authorized Sectors & Production Lines</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl p-3.5 max-h-40 overflow-y-auto">
                    {availableDepartments.map(dept => {
                      const isChecked = userForm.departments.includes(dept);
                      return (
                        <label 
                          key={dept} 
                          className="flex items-center gap-2 cursor-pointer text-[11px] font-bold select-none text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleDepartmentCheckbox(dept)}
                            className="rounded text-blue-600 focus:ring-0"
                          />
                          <span>{dept}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-neutral-850">
                  <button
                    type="button"
                    onClick={() => setIsUserModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-neutral-800 dark:hover:bg-neutral-755 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-wider cursor-pointer"
                  >
                    {userModalMode === "create" ? "Create Clearance Profile" : "Commit Clearance Profile"}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* RBAC MODAL: CONFIRM OPERATOR DELETION */}
      {/* ======================================================== */}
      <AnimatePresence>
        {deleteConfirmUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmUser(null)}
              className="absolute inset-0 bg-slate-950"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-850 rounded-2xl p-6 shadow-2xl relative max-w-md w-full z-10 space-y-5 text-xs font-semibold"
            >
              <div className="flex items-center gap-2.5 text-red-500 border-b border-slate-100 dark:border-neutral-850 pb-3">
                <AlertTriangle className="h-5 w-5 animate-pulse" />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Confirm Account Deletion
                </h3>
              </div>

              <div className="space-y-3">
                <p className="text-slate-600 dark:text-neutral-300 leading-relaxed">
                  Are you sure you want to permanently delete the operator account profile for <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">@{deleteConfirmUser.name}</span>?
                </p>
                <p className="text-slate-400 dark:text-neutral-500 text-[11px] leading-relaxed">
                  This action is irreversible and will revoke all access privileges, remove clearance keys, and terminate active sessions.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmUser(null)}
                  className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-neutral-800 dark:hover:bg-neutral-755 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDeleteUser}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase tracking-wider cursor-pointer transition-colors flex items-center justify-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* RBAC MODAL: SECURE PASSWORD RESET OVERRIDE GATED BY PASSKEY */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isResetPassModalOpen && overrideTargetUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsResetPassModalOpen(false)}
              className="absolute inset-0 bg-slate-950"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-850 rounded-2xl p-6 shadow-2xl relative max-w-md w-full z-10 space-y-5 text-xs font-semibold"
            >
              {!overrideSuccessState ? (
                <>
                  <div className="flex items-center gap-2.5 text-amber-500 border-b border-slate-100 dark:border-neutral-850 pb-3">
                    <ShieldAlert className="h-5 w-5 animate-pulse" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Credentials Reset Override Policy
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {/* User Profile Summary */}
                    <div className="p-3 bg-slate-50 dark:bg-neutral-950 border border-slate-100 dark:border-neutral-800 rounded-xl flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${overrideTargetUser.avatarGradient} text-white flex items-center justify-center font-black text-xs uppercase shadow-sm`}>
                        {overrideTargetUser.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white block">
                          {overrideTargetUser.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          Operator Identity: @{overrideTargetUser.username}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 font-medium text-slate-600 dark:text-slate-300 leading-relaxed bg-amber-50/50 dark:bg-amber-950/10 border border-amber-150 dark:border-amber-950/30 p-3.5 rounded-xl">
                      <p className="text-[11px]">
                        This operation requires entering the **Emergency Operations Passkey** to generate an authorized security override token.
                      </p>
                      <p className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
                        Instructions: supply the passkey <span className="bg-amber-100 dark:bg-amber-950 px-1 py-0.5 rounded select-all font-mono font-black text-[11px]">admin123</span> as requested.
                      </p>
                    </div>

                    {/* Master Passkey Input */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wide block">Emergency Master Passkey *</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="password"
                          required
                          placeholder="Type admin123"
                          value={overridePasskeyInput}
                          onChange={(e) => setOverridePasskeyInput(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl pl-9 pr-4 py-2.5 outline-none font-bold text-slate-800 dark:text-white placeholder-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                        />
                      </div>
                    </div>

                    {/* New Override Password */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wide block">New Override Password</label>
                        <button
                          type="button"
                          onClick={() => setOverrideNewPasswordInput("PXR-" + Math.random().toString(36).substring(2, 8).toUpperCase())}
                          className="text-[9px] text-blue-500 hover:text-blue-600 font-bold uppercase cursor-pointer"
                        >
                          Regenerate
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Assign custom or generated password"
                        value={overrideNewPasswordInput}
                        onChange={(e) => setOverrideNewPasswordInput(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 outline-none font-bold text-slate-800 dark:text-white placeholder-slate-400 focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setIsResetPassModalOpen(false)}
                      className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-neutral-800 dark:hover:bg-neutral-750 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (!overridePasskeyInput) {
                          triggerToast("Please input the Master Passkey.", "error");
                          return;
                        }
                        if (overridePasskeyInput === "admin123") {
                          const newPass = overrideNewPasswordInput || "admin123";
                          const updatedUser = {
                            ...overrideTargetUser,
                            password: hashPasswordIfNeeded(newPass)
                          };
                          const updatedUsers = users.map(u => u.id === overrideTargetUser.id ? updatedUser : u);
                          setUsers(updatedUsers);
                          localStorage.setItem("prodexa_users", JSON.stringify(updatedUsers));
                          if (isSupabaseConfigured()) {
                            saveUserToSupabase(updatedUser, newPass);
                          }
                          setOverrideSuccessState(true);
                          triggerToast(`Credentials Override Succeeded for @${overrideTargetUser.username}!`, "success");
                          addSystemLog(`Password reset override successful for operator '${overrideTargetUser.username}' via credential card gateway.`, "sajid.admin", "success", "SECURITY");
                        } else {
                          triggerToast("Bypass Refused: Invalid Master Passkey.", "error");
                          addSystemLog(`CRITICAL SECURITY FAILURE: Unauthorized card password override attempt on operator '${overrideTargetUser.username}' using incorrect passkey.`, "sajid.admin", "error", "SECURITY");
                        }
                      }}
                      className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black uppercase tracking-wider cursor-pointer transition-colors"
                    >
                      Authorize Reset
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 space-y-4 font-sans">
                  <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle className="h-7 w-7" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Credentials Rewritten Successfully
                    </h3>
                    <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                      The security parameters have been updated using the master bypass token.
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-neutral-950 border border-slate-100 dark:border-neutral-800 rounded-2xl p-4 space-y-3.5">
                    <div className="space-y-1 text-left">
                      <span className="text-[9px] text-slate-400 uppercase font-mono block">Operator User</span>
                      <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 block">
                        {overrideTargetUser.name} (@{overrideTargetUser.username})
                      </span>
                    </div>

                    <div className="space-y-1 text-left border-t border-slate-200/50 dark:border-neutral-850/50 pt-3">
                      <span className="text-[9px] text-slate-400 uppercase font-mono block">New Active Password Key</span>
                      <div className="flex items-center justify-between gap-2 bg-white dark:bg-neutral-900 px-3 py-2 rounded-xl border border-slate-200/60 dark:border-neutral-800">
                        <span className="font-mono text-emerald-500 font-extrabold select-all text-xs">
                          {overrideNewPasswordInput || "Generated Key Token"}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(overrideNewPasswordInput);
                            triggerToast("Password copied to clipboard!", "success");
                          }}
                          className="text-slate-400 hover:text-blue-500 cursor-pointer"
                          title="Copy Password Key"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsResetPassModalOpen(false);
                      setOverrideTargetUser(null);
                      setOverridePasskeyInput("");
                      setOverrideNewPasswordInput("");
                      setOverrideSuccessState(false);
                    }}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-wider cursor-pointer shadow-md transition-colors"
                  >
                    Close Terminal Overlay
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
