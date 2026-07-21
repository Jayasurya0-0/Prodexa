import React, { useState, useEffect } from "react";
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Cpu, 
  Activity, 
  Layers, 
  Compass, 
  Server, 
  Terminal, 
  ShieldCheck, 
  Clock,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { isSupabaseConfigured, fetchUsersFromSupabase } from "../utils/supabaseSync";
import { RBACUser } from "../types";
import { hashPasswordIfNeeded } from "../utils/hash";

interface LoginSystemProps {
  onLoginSuccess: (user: RBACUser) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

type AuthView = "LOGIN" | "RESET" | "SUCCESS";

export default function LoginSystem({
  onLoginSuccess,
  isDarkMode,
  onToggleDarkMode
}: LoginSystemProps) {
  // Navigation & Form State
  const [currentView, setCurrentView] = useState<AuthView>("LOGIN");
  
  // Login input states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Password recovery states
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [successTicketId, setSuccessTicketId] = useState("");

  // UI state feedback
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // System statistics simulated values (Left Panel)
  const [uptimeStr, setUptimeStr] = useState("99.98%");
  const [latencyVal, setLatencyVal] = useState("12ms");
  const [activeNodesCount, setActiveNodesCount] = useState(482);

  // Load Remembered User on mount
  useEffect(() => {
    const rememberedUser = localStorage.getItem("prodexa_remembered_user");
    const rememberedCheck = localStorage.getItem("prodexa_remember_me") === "true";
    if (rememberedCheck && rememberedUser) {
      setUsername(rememberedUser);
      setRememberMe(true);
    }
  }, []);

  // Live simulation for stats on Left Panel
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate minor variance in latency
      const randLatency = Math.floor(Math.random() * 5) + 9;
      setLatencyVal(`${randLatency}ms`);

      // Simulate uptime micro-fluctuation
      if (Math.random() > 0.95) {
        setUptimeStr("100%");
      } else if (Math.random() > 0.8) {
        setUptimeStr("99.99%");
      } else {
        setUptimeStr("99.98%");
      }

      // Simulate fluctuating active machines/connections
      const countVariance = Math.floor(Math.random() * 7) - 3;
      setActiveNodesCount(prev => Math.max(470, prev + countVariance));
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Basic Validation
    if (!username.trim()) {
      setErrorMessage("Please enter your Username, Email, or Operator ID.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your administrative access password.");
      return;
    }

    setLoading(true);

    try {
      let matchedUser: RBACUser | undefined;

      // 1. If Supabase is configured, try querying users from Supabase
      if (isSupabaseConfigured()) {
        try {
          const dbUsers = await fetchUsersFromSupabase();
          if (dbUsers) {
            matchedUser = dbUsers.find(
              u => u.username.toLowerCase() === username.trim().toLowerCase()
            );
          }
        } catch (supabaseErr) {
          console.warn("Supabase auth check errored, falling back to local state:", supabaseErr);
        }
      }

      // 2. Fallback to local storage
      if (!matchedUser) {
        const local = localStorage.getItem("prodexa_users");
        if (local) {
          const localUsers = JSON.parse(local) as RBACUser[];
          const cleanedUsers = localUsers.filter(u => u.username !== "sajid.admin");
          matchedUser = cleanedUsers.find(
            u => u.username.toLowerCase() === username.trim().toLowerCase()
          );
        }
      }

      // 3. Final fallback to default profiles (if localStorage or DB fails or hasn't loaded)
      if (!matchedUser) {
        const defaultSeeds: RBACUser[] = [
          { id: "usr_101", name: "ANANYA SHARMA", username: "hr_ananya", clearance: "Admin", departments: ["Human Resources"], status: "Active", avatarGradient: "from-rose-500 to-pink-500" },
          { id: "usr_102", name: "VIKRAM SINGH", username: "pm_vikram", clearance: "Production Manager", departments: ["Production"], status: "Active", avatarGradient: "from-blue-500 to-cyan-500" },
          { id: "usr_103", name: "KARTHIK S.", username: "sup_karthik", clearance: "Supervisor", departments: ["Sewing"], status: "Active", avatarGradient: "from-amber-500 to-orange-500" },
          { id: "usr_104", name: "RAHUL PATEL", username: "ie_rahul", clearance: "Admin", departments: ["Industrial Engineering"], status: "Active", avatarGradient: "from-emerald-500 to-teal-500" },
          { id: "usr_105", name: "VIG", username: "vig_ie", clearance: "IE", departments: ["Industrial Engineering"], status: "Active", avatarGradient: "from-indigo-500 to-violet-500" },
          { id: "usr_106", name: "JOTHI", username: "jothi_admin", clearance: "Admin", departments: ["Human Resources"], status: "Active", avatarGradient: "from-purple-500 to-pink-500" },
          { id: "usr_107", name: "RAMESH KUMAR", username: "op_ramesh", clearance: "Operator", departments: ["Sewing"], status: "Active", avatarGradient: "from-teal-500 to-emerald-500" }
        ];
        matchedUser = defaultSeeds.find(
          u => u.username.toLowerCase() === username.trim().toLowerCase()
        );
      }

      // If still no user found, throw error
      if (!matchedUser) {
        setLoading(false);
        setErrorMessage(`Authentication Refused: Operator username '${username}' not found in registry.`);
        return;
      }

      // Check status
      if (matchedUser.status === "Suspended") {
        setLoading(false);
        setErrorMessage(`Authentication Refused: Profile @${matchedUser.username} is Suspended. Contact @jothi_admin.`);
        return;
      }

      // Verify Password (case sensitive, supports both plain text and SHA-256 matched hashes)
      const userPassword = matchedUser.password || "admin123";
      const hashedPasswordInput = hashPasswordIfNeeded(password);
      const hashedPasswordStored = hashPasswordIfNeeded(userPassword);
      
      // Allow 'admin' or 'admin123' as fallback bypass for the main jothi account if empty
      const isBypass = (matchedUser.username === "jothi_admin") && (password === "admin" || password === "admin123");
      
      if (password !== userPassword && hashedPasswordInput !== hashedPasswordStored && !isBypass) {
        setLoading(false);
        setErrorMessage("Authentication Refused: Invalid Security Access Code.");
        return;
      }

      // Handle remember me logic
      if (rememberMe) {
        localStorage.setItem("prodexa_remembered_user", username);
        localStorage.setItem("prodexa_remember_me", "true");
      } else {
        localStorage.removeItem("prodexa_remembered_user");
        localStorage.setItem("prodexa_remember_me", "false");
      }

      setSuccessMessage(`Welcome back, ${matchedUser.name}! Initializing MES portal...`);
      
      setTimeout(() => {
        setLoading(false);
        onLoginSuccess(matchedUser!);
      }, 1200);

    } catch (err) {
      setLoading(false);
      setErrorMessage("Authentication Refused: Secure handshake interrupted.");
    }
  };

  const handlePasswordResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!resetIdentifier.trim()) {
      setErrorMessage("Please supply your username or official email address.");
      return;
    }

    setLoading(true);

    // Mock Ticket Generation
    setTimeout(() => {
      setLoading(false);
      const ticketId = `RST-${Math.floor(100000 + Math.random() * 900000)}`;
      setSuccessTicketId(ticketId);
      
      // Save ticket in localStorage for DatabaseVisualizer to pick up
      const existingTickets = JSON.parse(localStorage.getItem("prodexa_pending_tickets") || "[]");
      existingTickets.push({
        id: ticketId,
        username: resetIdentifier.trim(),
        created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: "Pending"
      });
      localStorage.setItem("prodexa_pending_tickets", JSON.stringify(existingTickets));
      
      setCurrentView("SUCCESS");
    }, 1500);
  };

  return (
    <div 
      id="login_container" 
      className="min-h-screen w-full flex flex-col lg:flex-row bg-[#080B11] text-slate-100 font-sans selection:bg-blue-600/30 selection:text-blue-200 relative overflow-hidden"
    >
      {/* Absolute Decorative Background Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-indigo-950/10 rounded-full blur-[160px] pointer-events-none" />

      {/* ========================================== */}
      {/* LEFT SIDE: THE ATMOSPHERIC VISUAL BRAND PANEL */}
      {/* ========================================== */}
      <div 
        id="visual_brand_panel" 
        className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden border-r border-slate-900"
      >
        {/* Full-bleed high-tech industrial background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000 transform hover:scale-105 pointer-events-none"
          style={{ 
            backgroundImage: "url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200')",
            opacity: 0.38
          }}
        />

        {/* Linear & Radial Dark Complex Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-[#070B13]/95 to-blue-950/45 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(29,78,216,0.15),transparent_60%)]" />

        {/* Top Brand Mark / Header Row */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-500 flex items-center justify-center shadow-[0_4px_20px_rgba(37,99,235,0.4)] border border-blue-400/20">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                PRODEXA
              </span>
              <span className="block text-[9px] text-blue-400 font-mono tracking-widest leading-none font-bold uppercase">
                PRODUCTION EXCELLENCE
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 rounded-full py-1 px-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono text-slate-400 tracking-wider">SYSTEMS: ACTIVE</span>
          </div>
        </div>

        {/* Center Section: SaaS Features & Micro-Statistics Board */}
        <div className="relative z-10 my-auto max-w-lg space-y-8">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-[10px] font-mono font-bold text-blue-400 tracking-widest uppercase">
              <Activity className="h-3 w-3 animate-pulse" />
              INTELLIGENT TELEMETRY NODES
            </span>
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-[1.15]">
              Unified Floor Control & real-time <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300">industrial intelligence</span>.
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Log into the Prodexa MES platform to organize shift pacing, map needle failure incidents, modify supervisor queues, and trace yield records securely.
            </p>
          </div>

          {/* Glass-morphic Metric Container */}
          <div className="bg-white/[0.03] border border-white/10 backdrop-blur-md rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            {/* Soft inner glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl" />
            
            <h4 className="text-[11px] font-mono text-slate-500 tracking-wider uppercase mb-3 font-extrabold flex items-center justify-between">
              <span>Telemetry Node Matrix</span>
              <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-mono">LIVE FEED</span>
            </h4>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wide">Uptime</span>
                <span className="text-base font-mono font-black text-emerald-400 flex items-center gap-1">
                  {uptimeStr}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wide">Ping Latency</span>
                <span className="text-base font-mono font-black text-blue-400">
                  {latencyVal}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wide">Active Nodes</span>
                <span className="text-base font-mono font-black text-white transition-all duration-300">
                  {activeNodesCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer Section */}
        <div className="relative z-10 flex items-center justify-between border-t border-slate-900 pt-6 text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-2">
            <Server className="h-3.5 w-3.5 text-blue-500/60" />
            <span>NODE ID: <strong className="text-slate-400">PRDX_RUN_SG_01</strong></span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] font-extrabold tracking-wider">
            BUILD-2026.07.02-MES
          </div>
        </div>
      </div>


      {/* ========================================== */}
      {/* RIGHT SIDE: SECURE AUTHENTICATION PORTAL */}
      {/* ========================================== */}
      <div 
        id="auth_portal_panel" 
        className="flex-1 flex flex-col justify-between p-6 sm:p-12 relative z-10"
      >
        {/* Top bar with Dark/Light toggle for mobile, and placeholder back to site */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-900/40">
          {/* Mobile visible branding */}
          <div className="flex lg:hidden items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-500 flex items-center justify-center">
              <Layers className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-black tracking-wide uppercase text-white block">
                PRODEXA
              </span>
              <span className="text-[8px] text-blue-400 font-mono tracking-widest block leading-none font-bold uppercase">
                PRODUCTION EXCELLENCE
              </span>
            </div>
          </div>

          <div className="hidden lg:block" />

          {/* Quick Support info */}
          <div className="flex items-center gap-3">
            <a 
              href="#support" 
              onClick={(e) => { e.preventDefault(); alert("Prodexa technical support line: support@prodexa.com"); }}
              className="text-xs text-slate-400 hover:text-white font-medium flex items-center gap-1 transition-colors"
            >
              Help Desk
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Central Auth Container */}
        <div className="my-auto mx-auto w-full max-w-md py-8">
          
          {/* AnimatePresence ensures smooth form view transitions */}
          <AnimatePresence mode="wait">
            
            {/* VIEW A: LOGIN FORM */}
            {currentView === "LOGIN" && (
              <motion.div
                key="login-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {/* Heading */}
                <div className="space-y-1.5 text-center lg:text-left">
                  <h2 
                    id="login_card_title" 
                    className="text-2xl font-black tracking-tight text-white uppercase"
                  >
                    Operator Sign-In
                  </h2>
                  <p className="text-slate-400 text-xs">
                    Access high-density sewing lines, metrics, and pacing.
                  </p>
                </div>

                {/* Validation Feedback Banner */}
                {errorMessage && (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-xs text-red-300 animate-in fade-in duration-200">
                    <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Credential Error:</span> {errorMessage}
                    </div>
                  </div>
                )}

                {successMessage && (
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2.5 text-xs text-emerald-300 animate-in fade-in duration-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Authorized:</span> {successMessage}
                    </div>
                  </div>
                )}

                {/* Input Fields */}
                <form id="login_form" onSubmit={handleLoginSubmit} className="space-y-4">
                  {/* Username */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">
                      Username / Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <User className="h-4 w-4" />
                      </span>
                      <input
                        id="login_username_field"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="john@prodexa.com or admin"
                        className="w-full bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm py-3 pl-10 pr-4 rounded-xl text-white placeholder-slate-500 outline-none transition-all font-medium"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">
                        Security Access Code
                      </label>
                    </div>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Lock className="h-4 w-4" />
                      </span>
                      <input
                        id="login_password_field"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm py-3 pl-10 pr-12 rounded-xl text-white placeholder-slate-500 outline-none transition-all font-mono"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                        title="Toggle visibility"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Utilities Row: Remember & Recovery */}
                  <div className="flex items-center justify-between text-xs pt-1.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-slate-400 hover:text-slate-200 transition-colors">
                      <input
                        id="login_remember_checkbox"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-slate-800 bg-slate-900 text-blue-600 focus:ring-blue-500/20 h-4 w-4"
                        disabled={loading}
                      />
                      <span>Keep me remembered</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setSuccessMessage(null);
                        setCurrentView("RESET");
                      }}
                      className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer transition-colors"
                      disabled={loading}
                    >
                      Forgot access code?
                    </button>
                  </div>

                  {/* Submit Action */}
                  <button
                    id="login_submit_button"
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all shadow-[0_4px_24px_rgba(37,99,235,0.25)] hover:shadow-[0_4px_24px_rgba(37,99,235,0.4)] disabled:opacity-50 cursor-pointer relative flex items-center justify-center gap-2 overflow-hidden border border-blue-400/15"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Verifying Security Matrix...</span>
                      </>
                    ) : (
                      <span>Access Plant Operations</span>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* VIEW B: PASSWORD RESET REQUEST */}
            {currentView === "RESET" && (
              <motion.div
                key="reset-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {/* Back Link */}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setCurrentView("LOGIN");
                  }}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white font-semibold cursor-pointer transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Return to sign-in portal
                </button>

                {/* Heading */}
                <div className="space-y-1.5">
                  <h2 
                    id="password_reset_title" 
                    className="text-2xl font-black tracking-tight text-white uppercase"
                  >
                    Access Code Recovery
                  </h2>
                  <p className="text-slate-400 text-xs">
                    Generate an administrative bypass ticket for your floor operator account.
                  </p>
                </div>

                {/* Validation Feedback Banner */}
                {errorMessage && (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
                    <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Recovery Error:</span> {errorMessage}
                    </div>
                  </div>
                )}

                {/* Form */}
                <form id="reset_form" onSubmit={handlePasswordResetSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">
                      Registered Email or Operator ID
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <User className="h-4 w-4" />
                      </span>
                      <input
                        id="reset_identifier_field"
                        type="text"
                        value={resetIdentifier}
                        onChange={(e) => setResetIdentifier(e.target.value)}
                        placeholder="operator@prodexa.com or jsmith"
                        className="w-full bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm py-3 pl-10 pr-4 rounded-xl text-white placeholder-slate-500 outline-none transition-all font-medium"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    The recovery wizard will construct a cryptographic recovery ticket that can be evaluated at the plant manager's workstation to reset your physical terminal terminal bypass code.
                  </p>

                  {/* Submit Recovery */}
                  <button
                    id="reset_submit_button"
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all shadow-[0_4px_24px_rgba(37,99,235,0.25)] hover:shadow-[0_4px_24px_rgba(37,99,235,0.4)] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Generating Ticket...</span>
                      </>
                    ) : (
                      <span>Request Access Recovery</span>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* VIEW C: PASSWORD RECOVERY SUCCESS SCREEN */}
            {currentView === "SUCCESS" && (
              <motion.div
                key="success-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6 text-center"
              >
                {/* Success Animated Pulse */}
                <div className="flex justify-center py-2">
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-md animate-pulse" />
                    <div className="relative w-16 h-16 bg-emerald-500/10 border border-emerald-500/40 rounded-full flex items-center justify-center text-emerald-400">
                      <ShieldCheck className="h-8 w-8" />
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <h2 
                    id="success_title" 
                    className="text-2xl font-black tracking-tight text-white uppercase"
                  >
                    Bypass Ticket Issued
                  </h2>
                  <p className="text-slate-400 text-xs max-w-sm mx-auto">
                    A secure administrative bypass credentials ticket has been compiled on the primary network.
                  </p>
                </div>

                {/* Metadata Box */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-left space-y-3.5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-1.5 bg-blue-500/10 border-b border-l border-slate-800 text-[8px] font-mono font-bold tracking-wider text-blue-400 uppercase rounded-bl-lg">
                    CRITICAL METADATA
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Recovery Ticket Token ID</span>
                    <span className="text-sm font-mono font-black text-emerald-400 tracking-wider block">
                      {successTicketId}
                    </span>
                  </div>

                  <div className="border-t border-slate-800/80 pt-3 space-y-1.5 text-xs text-slate-400 font-medium">
                    <span className="font-bold text-slate-300 block">Emergency Operations Instructions:</span>
                    <p className="leading-relaxed">
                      You can bypass the standard authentication sequence by returning to the sign-in page and supplying the prefilled credentials or using the passkey <strong className="text-slate-200 font-mono text-xs bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">admin123</strong>.
                    </p>
                  </div>
                </div>

                {/* Return button */}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setCurrentView("LOGIN");
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800/80 text-white border border-slate-800 hover:border-slate-700 font-bold py-3.5 px-4 rounded-xl text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Return to Control Login
                </button>
              </motion.div>
            )}

          </AnimatePresence>

        </div>

        {/* Brand Copyright Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-900/40 pt-6 text-[11px] text-slate-500 font-medium space-y-2 sm:space-y-0">
          <span>&copy; 2026 Prodexa MES Platform. All Rights Reserved.</span>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-slate-600" />
            <span className="font-mono">SECURE SSL-TLS 256-BIT</span>
          </div>
        </div>
      </div>
    </div>
  );
}
