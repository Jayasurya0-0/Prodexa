-- ==========================================
-- PRODEXA MES PLATFORM - SUPABASE DATABASE INITIALIZATION SCHEMA
-- ==========================================
-- This script sets up user accounts, supervisor profiles, production lines,
-- hourly logs, floor alerts, style specifications, and factory metrics tables.
-- Run this script in your Supabase Dashboard -> SQL Editor.

-- Enable UUID generation extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop the factory_metrics table to ensure its columns are updated correctly (safe as it contains 1 row of real-time metrics)
DROP TABLE IF EXISTS public.factory_metrics CASCADE;

-- ==========================================
-- 1. USER ACCOUNTS TABLE (Role-Based Access Control)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.user_accounts (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    username VARCHAR(64) NOT NULL UNIQUE,
    password VARCHAR(256) DEFAULT 'admin123',
    clearance VARCHAR(32) NOT NULL DEFAULT 'Operator',
    departments VARCHAR(64)[] NOT NULL DEFAULT '{}',
    status VARCHAR(16) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Pending')),
    avatar_gradient VARCHAR(128),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 1.5. CENTRALIZED EMPLOYEES TABLE (Multi-tenant Profile Directory)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(64) NOT NULL UNIQUE,
    company_id VARCHAR(64) NOT NULL DEFAULT 'COM-PRODEXA',
    factory_id VARCHAR(64) NOT NULL DEFAULT 'FAC-UNIT1',
    first_name VARCHAR(128) NOT NULL,
    last_name VARCHAR(128) NOT NULL,
    full_name VARCHAR(256) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    designation VARCHAR(128) NOT NULL,
    department VARCHAR(128) NOT NULL,
    email VARCHAR(128),
    phone VARCHAR(32),
    photo_url TEXT,
    status VARCHAR(16) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 2. SUPERVISOR PROFILES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.supervisor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    badge_id VARCHAR(24) NOT NULL UNIQUE,
    factory_unit VARCHAR(64) NOT NULL,
    active_lines VARCHAR(12)[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 3. PRODUCTION LINES TABLE
-- ==========================================
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

-- ==========================================
-- 4. HOURLY LOGS TABLE (Time-series production)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.hourly_logs (
    id BIGSERIAL PRIMARY KEY,
    line_id UUID NOT NULL REFERENCES public.production_lines(id) ON DELETE CASCADE,
    recorded_hour VARCHAR(10) NOT NULL,
    production_pcs INTEGER NOT NULL CHECK (production_pcs >= 0),
    target_pcs INTEGER DEFAULT 0 CHECK (target_pcs >= 0),
    efficiency_pct DECIMAL(4,1) NOT NULL,
    unplanned_down_mins INTEGER NOT NULL DEFAULT 0,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 5. FLOOR ALERTS TABLE (Incidents)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.floor_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_no VARCHAR(12) NOT NULL,
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
    message TEXT NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- ==========================================
-- 6. FACTORY METRICS TABLE (Real-time KPI Dashboard Cards)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.factory_metrics (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    shift_target INTEGER NOT NULL DEFAULT 0,            -- Today's Target Pcs
    shift_output INTEGER NOT NULL DEFAULT 0,            -- Today's Cumulative Output
    shift_achievement DECIMAL(5,2) NOT NULL DEFAULT 0,  -- Output Achievement %
    current_efficiency DECIMAL(5,2) NOT NULL DEFAULT 0, -- Average Plant Efficiency %
    total_workers INTEGER NOT NULL DEFAULT 0,           -- Total Active Workers
    current_operators INTEGER NOT NULL DEFAULT 0,       -- Active Sewing Machine Operators
    needle_down_lines INTEGER NOT NULL DEFAULT 0,       -- Lines in Breakdown
    running_lines INTEGER NOT NULL DEFAULT 0,           -- Lines Running Smoothly
    idle_lines INTEGER NOT NULL DEFAULT 0,              -- Lines Currently Idle
    running_machines INTEGER NOT NULL DEFAULT 0,        -- Active Machines Online
    idle_machines INTEGER NOT NULL DEFAULT 0,           -- Downtime Machines
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 7. STYLE SPECIFICATIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.style_specifications (
    style_code VARCHAR(32) PRIMARY KEY,
    sam_value DECIMAL(4,2) NOT NULL,
    target_eff_pct DECIMAL(4,1) NOT NULL,
    needle_type VARCHAR(32) NOT NULL,
    last_engineered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- CREATE PERFORMANCE INDEXES
-- ==========================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_supervisor_badge ON public.supervisor_profiles(badge_id);
CREATE INDEX IF NOT EXISTS idx_production_lines_style ON public.production_lines(style_code);
CREATE INDEX IF NOT EXISTS idx_hourly_logs_line_time ON public.hourly_logs(line_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_unresolved_alerts ON public.floor_alerts(is_resolved) WHERE is_resolved = FALSE;

-- ==========================================
-- SEED INITIAL DEFAULT USER RECORDS
-- ==========================================
INSERT INTO public.user_accounts (id, name, username, password, clearance, departments, status, avatar_gradient, avatar_url)
VALUES 
('usr_101', 'ANANYA SHARMA', 'hr_ananya', 'admin123', 'Admin', ARRAY['Human Resources'], 'Active', 'from-rose-500 to-pink-500', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'),
('usr_102', 'VIKRAM SINGH', 'pm_vikram', 'admin123', 'Production Manager', ARRAY['Production'], 'Active', 'from-blue-500 to-cyan-500', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150'),
('usr_103', 'KARTHIK S.', 'sup_karthik', 'admin123', 'Supervisor', ARRAY['Sewing'], 'Active', 'from-amber-500 to-orange-500', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150'),
('usr_104', 'RAHUL PATEL', 'ie_rahul', 'admin123', 'Admin', ARRAY['Industrial Engineering'], 'Active', 'from-emerald-500 to-teal-500', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150'),
('usr_105', 'VIG', 'vig_ie', 'admin123', 'IE', ARRAY['Industrial Engineering'], 'Active', 'from-indigo-500 to-violet-500', 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150'),
('usr_106', 'JOTHI', 'jothi_admin', 'admin123', 'Admin', ARRAY['Human Resources'], 'Active', 'from-purple-500 to-pink-500', 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150'),
('usr_1091', 'Sajid Al-Mahmud', 'sajid.admin', 'admin123', 'Super Admin', ARRAY['Operations', 'System Admin'], 'Active', 'from-blue-600 to-indigo-600', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    password = EXCLUDED.password,
    clearance = EXCLUDED.clearance,
    departments = EXCLUDED.departments,
    status = EXCLUDED.status;

-- ==========================================
-- SEED FACTORY METRICS ROW
-- ==========================================
INSERT INTO public.factory_metrics (id, shift_target, shift_output, shift_achievement, current_efficiency, total_workers, current_operators, needle_down_lines, running_lines, idle_lines, running_machines, idle_machines)
VALUES (1, 8000, 3600, 45.00, 78.50, 240, 180, 1, 8, 1, 185, 38)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable Row-Level Security on all tables
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervisor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hourly_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floor_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factory_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.style_specifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to prevent duplication errors
DROP POLICY IF EXISTS "Allow open access to user_accounts" ON public.user_accounts;
DROP POLICY IF EXISTS "Allow open access to employees" ON public.employees;
DROP POLICY IF EXISTS "Allow open access to supervisor_profiles" ON public.supervisor_profiles;
DROP POLICY IF EXISTS "Allow open access to production_lines" ON public.production_lines;
DROP POLICY IF EXISTS "Allow open access to hourly_logs" ON public.hourly_logs;
DROP POLICY IF EXISTS "Allow open access to floor_alerts" ON public.floor_alerts;
DROP POLICY IF EXISTS "Allow open access to factory_metrics" ON public.factory_metrics;
DROP POLICY IF EXISTS "Allow open access to style_specifications" ON public.style_specifications;

-- Create ALL-access policies for public/anon/authenticated roles to make client interaction seamless
CREATE POLICY "Allow open access to user_accounts" ON public.user_accounts 
    FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow open access to employees" ON public.employees 
    FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow open access to supervisor_profiles" ON public.supervisor_profiles 
    FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow open access to production_lines" ON public.production_lines 
    FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow open access to hourly_logs" ON public.hourly_logs 
    FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow open access to floor_alerts" ON public.floor_alerts 
    FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow open access to factory_metrics" ON public.factory_metrics 
    FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow open access to style_specifications" ON public.style_specifications 
    FOR ALL TO public USING (true) WITH CHECK (true);

-- ==========================================
-- 8. MASTER BUYERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.master_buyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 9. MASTER STYLES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.master_styles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SEED INITIAL DEFAULT BUYERS
INSERT INTO public.master_buyers (name)
VALUES ('ZARA'), ('H&M'), ('NEXT'), ('M&S'), ('UNIQLO'), ('ADIDAS'), ('NIKE'), ('GAP'), ('LEVI''S'), ('PUMA')
ON CONFLICT (name) DO NOTHING;

-- SEED INITIAL DEFAULT STYLES
INSERT INTO public.master_styles (code)
VALUES ('ZRD-2405'), ('HM-1234'), ('NXT-9876'), ('MS-5432'), ('UQ-7788'), ('AD-8812'), ('NK-9921'), ('GP-0043'), ('LV-5541'), ('PM-3311')
ON CONFLICT (code) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE public.master_buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_styles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow open access to master_buyers" ON public.master_buyers;
DROP POLICY IF EXISTS "Allow open access to master_styles" ON public.master_styles;

CREATE POLICY "Allow open access to master_buyers" ON public.master_buyers 
    FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow open access to master_styles" ON public.master_styles 
    FOR ALL TO public USING (true) WITH CHECK (true);


-- ==========================================
-- 11. DAILY TARGETS TABLE (Date-wise Targets)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.daily_targets (
    target_date VARCHAR(32) PRIMARY KEY,
    shift_target INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.daily_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow open access to daily_targets" ON public.daily_targets;

CREATE POLICY "Allow open access to daily_targets" ON public.daily_targets 
    FOR ALL TO public USING (true) WITH CHECK (true);


-- ==========================================
-- 12. DAILY FACTORY METRICS TABLE (Date-wise Dashboard Metrics)
-- ==========================================
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
    FOR ALL TO public USING (true) WITH CHECK (true);


-- ==========================================
-- 13. DAILY PRODUCTION LINES TABLE (Date-wise Line Configurations)
-- ==========================================
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
    FOR ALL TO public USING (true) WITH CHECK (true);


-- ==========================================
-- 14. KPI MASTER SCORING GUIDELINES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.kpi_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_name VARCHAR(100) UNIQUE NOT NULL,
    target DECIMAL(10,2) NOT NULL,
    weightage INTEGER NOT NULL CHECK (weightage >= 0),
    score_10_rule VARCHAR(256) NOT NULL,
    score_8_rule VARCHAR(256) NOT NULL,
    score_5_rule VARCHAR(256) NOT NULL,
    score_0_rule VARCHAR(256) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.kpi_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow open access to kpi_master" ON public.kpi_master;

CREATE POLICY "Allow open access to kpi_master" ON public.kpi_master 
    FOR ALL TO public USING (true) WITH CHECK (true);

-- Seed initial master values
INSERT INTO public.kpi_master (kpi_name, target, weightage, score_10_rule, score_8_rule, score_5_rule, score_0_rule)
VALUES 
  ('Efficiency', 85, 25, '>= 85', '>= 75', '>= 60', '< 60'),
  ('Avg Production', 600, 15, '>= 600', '>= 500', '>= 400', '< 400'),
  ('Avg Lead Time', 2, 10, '<= 2', '<= 3', '<= 5', '> 5'),
  ('SKU %', 95, 10, '>= 95', '>= 85', '>= 70', '< 70'),
  ('Audit Fail', 0, 10, '<= 0', '<= 1', '<= 2', '> 2'),
  ('Rejection %', 1.5, 10, '<= 1.5', '<= 3.0', '<= 5.0', '> 5.0'),
  ('FPY %', 98, 5, '>= 98', '>= 95', '>= 90', '< 90'),
  ('FQC Defects', 2, 5, '<= 2', '<= 5', '<= 10', '> 10'),
  ('Absenteeism', 4, 5, '<= 4', '<= 7', '<= 10', '> 10'),
  ('Attrition', 1, 5, '<= 1', '<= 2.5', '<= 5', '> 5')
ON CONFLICT (kpi_name) DO UPDATE 
SET target = EXCLUDED.target, weightage = EXCLUDED.weightage;


-- ==========================================
-- 15. DAILY LINE KPIS INPUT RECORDS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.daily_line_kpis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date VARCHAR(32) NOT NULL,
    factory_id VARCHAR(64) DEFAULT 'Main Factory',
    line_id VARCHAR(12) NOT NULL,
    supervisor_id VARCHAR(128),
    efficiency DECIMAL(6,2) DEFAULT 0,
    avg_production DECIMAL(10,2) DEFAULT 0,
    avg_lead_time DECIMAL(6,2) DEFAULT 0,
    sku_percentage DECIMAL(6,2) DEFAULT 0,
    audit_fail INTEGER DEFAULT 0,
    rejection DECIMAL(6,2) DEFAULT 0,
    fpy DECIMAL(6,2) DEFAULT 0,
    fqc_defects INTEGER DEFAULT 0,
    absenteeism DECIMAL(6,2) DEFAULT 0,
    attrition DECIMAL(6,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_date_line_kpi UNIQUE (date, line_id)
);

-- Enable RLS
ALTER TABLE public.daily_line_kpis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow open access to daily_line_kpis" ON public.daily_line_kpis;

CREATE POLICY "Allow open access to daily_line_kpis" ON public.daily_line_kpis 
    FOR ALL TO public USING (true) WITH CHECK (true);


-- ==========================================
-- 16. CALCULATED LINE SCORES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.line_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date VARCHAR(32) NOT NULL,
    line_id VARCHAR(12) NOT NULL,
    efficiency_score DECIMAL(4,1) DEFAULT 0,
    avg_production_score DECIMAL(4,1) DEFAULT 0,
    avg_lt_score DECIMAL(4,1) DEFAULT 0,
    sku_score DECIMAL(4,1) DEFAULT 0,
    audit_score DECIMAL(4,1) DEFAULT 0,
    rejection_score DECIMAL(4,1) DEFAULT 0,
    fpy_score DECIMAL(4,1) DEFAULT 0,
    fqc_score DECIMAL(4,1) DEFAULT 0,
    absenteeism_score DECIMAL(4,1) DEFAULT 0,
    attrition_score DECIMAL(4,1) DEFAULT 0,
    total_score DECIMAL(5,2) DEFAULT 0,
    rank INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_date_line_score UNIQUE (date, line_id)
);

-- Enable RLS
ALTER TABLE public.line_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow open access to line_scores" ON public.line_scores;

CREATE POLICY "Allow open access to line_scores" ON public.line_scores 
    FOR ALL TO public USING (true) WITH CHECK (true);


-- ==========================================
-- 17. INCLUSIVE FACTORY SCORE METADATA TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.factory_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date VARCHAR(32) NOT NULL UNIQUE,
    factory_id VARCHAR(64) DEFAULT 'Main Factory',
    inclusive_score DECIMAL(5,2) DEFAULT 0,
    total_lines INTEGER DEFAULT 0,
    running_lines INTEGER DEFAULT 0,
    rank_distribution JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.factory_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow open access to factory_scores" ON public.factory_scores;

CREATE POLICY "Allow open access to factory_scores" ON public.factory_scores 
    FOR ALL TO public USING (true) WITH CHECK (true);





